import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const app = express();
let activeMixes = 0;
const lastMixByUser = new Map();
const port = Number(process.env.PORT || 8080);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.get("/health", (_req, res) => res.json({ ok: true, service: "zeechat-media-mixer" }));

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 105 * 1024 * 1024, files: 2, fields: 5, fieldSize: 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = file.fieldname === "video"
      ? ["video/mp4", "video/webm", "video/quicktime", "application/octet-stream"]
      : ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/flac", "audio/x-m4a", "audio/aacp", "application/octet-stream"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Unsupported media type."), allowed.includes(file.mimetype));
  },
});

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-6000); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout) : reject(new Error(stderr || command + " failed with code " + code)));
  });
}

app.post("/v1/mix", upload.fields([{ name: "video", maxCount: 1 }, { name: "audio", maxCount: 1 }]), async (req, res) => {
  let workDir;
  let ownsMixSlot = false;
  try {
    const bearer = req.headers.authorization || "";
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
    if (!token) return res.status(401).send("Sign in is required.");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).send("Your session is invalid or expired.");
    const userId = authData.user.id;
    const lastMixAt = lastMixByUser.get(userId) || 0;
    if (Date.now() - lastMixAt < 8000) return res.status(429).send("Please wait a few seconds before mixing another Reel.");
    if (activeMixes >= 2) return res.status(503).send("The audio mixer is busy. Please retry shortly.");
    activeMixes += 1;
    ownsMixSlot = true;
    lastMixByUser.set(userId, Date.now());
    const video = req.files?.video?.[0];
    const audio = req.files?.audio?.[0];
    if (!video || !audio) return res.status(400).send("Both video and audio files are required.");
    const audioStart = Number(req.body.audioStartSeconds ?? 0);
    const musicVolume = Number(req.body.musicVolume ?? 0.7);
    const originalVolume = Number(req.body.originalVolume ?? 0.8);
    if (!Number.isFinite(audioStart) || audioStart < 0 || audioStart > 600) return res.status(400).send("Audio start must be between 0 and 600 seconds.");
    if (![musicVolume, originalVolume].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) return res.status(400).send("Volume values must be between 0 and 1.");
    workDir = await mkdtemp(path.join(os.tmpdir(), "zeechat-mix-"));
    const inputVideo = path.join(workDir, "source-video");
    const inputAudio = path.join(workDir, "source-audio");
    const outputVideo = path.join(workDir, "mixed-" + randomUUID() + ".mp4");
    // Move the uploaded temporary files into a private per-request workspace.
    const { rename } = await import("node:fs/promises");
    await rename(video.path, inputVideo);
    await rename(audio.path, inputAudio);
    const probe = JSON.parse(await run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", inputVideo]));
    const duration = Number(probe.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 600) return res.status(400).send("Reels must be 10 minutes or shorter.");
    const hasOriginalAudio = (probe.streams || []).some(stream => stream.codec_type === "audio");
    const musicFilter = "[1:a:0]atrim=start=" + audioStart + ",asetpts=PTS-STARTPTS,volume=" + musicVolume + "[music]";
    const audioFilter = hasOriginalAudio
      ? "[0:a:0]volume=" + originalVolume + "[original];" + musicFilter + ";[original][music]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.95[aout]"
      : musicFilter + ";[music]anull[aout]";
    const ffmpegArgs = ["-hide_banner", "-loglevel", "error", "-y", "-i", inputVideo, "-stream_loop", "-1", "-i", inputAudio,
      "-filter_complex", audioFilter, "-map", "0:v:0", "-map", "[aout]", "-c:v", "libx264", "-preset", "veryfast",
      "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", String(duration), outputVideo];
    await run("ffmpeg", ffmpegArgs);
    const outputStat = await stat(outputVideo);
    if (!outputStat.size || outputStat.size > 100 * 1024 * 1024) return res.status(413).send("The mixed Reel exceeds ZeeChat's 100 MB media limit.");
    res.status(200);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", String(outputStat.size));
    res.setHeader("Content-Disposition", 'attachment; filename="zeechat-reel.mp4"');
    res.setHeader("Cache-Control", "no-store");
    const stream = createReadStream(outputVideo);
    const completedWorkDir = workDir;
    stream.on("error", error => { console.error("Mixed video stream failed", error.message); if (!res.headersSent) res.status(500).end("Could not return mixed video."); else res.destroy(error); });
    stream.on("close", () => { if (completedWorkDir) void rm(completedWorkDir, { recursive: true, force: true }); });
    stream.pipe(res);
    workDir = null; // The stream owns cleanup below.
  } catch (error) {
    console.error("Reel mix failed", error instanceof Error ? error.message : "unknown error");
    if (!res.headersSent) res.status(500).send("Audio mixing failed. Please try again.");
  } finally {
    if (ownsMixSlot) activeMixes = Math.max(0, activeMixes - 1);
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
    for (const file of [req.files?.video?.[0], req.files?.audio?.[0]]) {
      if (file?.path) await rm(file.path, { force: true }).catch(() => {});
    }
  }
});

app.use((error, _req, res, _next) => {
  const status = error instanceof multer.MulterError ? 413 : 400;
  res.status(status).send(status === 413 ? "Media upload is too large." : "Could not process the supplied media.");
});
app.listen(port, "0.0.0.0", () => console.log("ZeeChat media mixer listening on " + port));
