"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Radio, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PartyRoomInfo = { id: string; title: string; format: "video" | "audio" | "watch"; host_id: string };
type Signal = { kind: "hello" | "offer" | "answer" | "ice" | "leave"; from: string; to?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

export default function PartyRoom({ party, userId, onClose }: { party: PartyRoomInfo; userId: string; onClose: () => void }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const streamRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(party.format !== "video");
  const [participants, setParticipants] = useState<string[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [connecting, setConnecting] = useState(true);

  const send = useCallback((signal: Signal) => {
    const channel = channelRef.current;
    if (channel) void channel.send({ type: "broadcast", event: "signal", payload: signal });
  }, []);

  const connectPeer = useCallback(async (remoteId: string, initiator: boolean) => {
    if (remoteId === userId || peers.current.has(remoteId)) return;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] });
    peers.current.set(remoteId, pc);
    const stream = streamRef.current;
    stream?.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = event => { if (event.candidate) send({ kind: "ice", from: userId, to: remoteId, candidate: event.candidate.toJSON() }); };
    pc.ontrack = event => {
      const incoming = event.streams[0];
      if (incoming) setRemoteStreams(current => ({ ...current, [remoteId]: incoming }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed" || pc.connectionState === "disconnected") {
        if (pc.connectionState !== "disconnected") {
          pc.close(); peers.current.delete(remoteId);
          setRemoteStreams(current => { const next = { ...current }; delete next[remoteId]; return next; });
          setParticipants(current => current.filter(id => id !== remoteId));
        }
      }
    };
    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ kind: "offer", from: userId, to: remoteId, sdp: pc.localDescription ?? undefined });
    }
  }, [send, userId]);

  useEffect(() => {
    let cancelled = false;
    const peerConnections = peers.current;
    const pendingCandidates = pendingIce.current;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support camera or microphone access. Open ZeeChat over HTTPS in a modern browser.");
        const wantsVideo = party.format === "video";
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: wantsVideo });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        const supabase = createClient();
        channel = supabase.channel("zeechat-party-room-" + party.id, { config: { private: true, broadcast: { self: false } } });
        channelRef.current = channel;
        channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
          const signal = payload as Signal;
          if (!signal || signal.from === userId || (signal.to && signal.to !== userId)) return;
          try {
            if (signal.kind === "hello") {
              setParticipants(current => current.includes(signal.from) ? current : [...current, signal.from]);
              if (userId.localeCompare(signal.from) < 0) await connectPeer(signal.from, true);
            } else if (signal.kind === "offer" && signal.sdp) {
              let pc = peers.current.get(signal.from);
              if (!pc) { await connectPeer(signal.from, false); pc = peers.current.get(signal.from); }
              if (!pc) return;
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
              const queuedCandidates = pendingCandidates.get(signal.from) ?? [];
              pendingCandidates.delete(signal.from);
              for (const candidate of queuedCandidates) await pc.addIceCandidate(new RTCIceCandidate(candidate));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              send({ kind: "answer", from: userId, to: signal.from, sdp: pc.localDescription ?? undefined });
            } else if (signal.kind === "answer" && signal.sdp) {
              const pc = peers.current.get(signal.from);
              if (pc && !pc.currentRemoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const queuedCandidates = pendingCandidates.get(signal.from) ?? [];
                pendingCandidates.delete(signal.from);
                for (const candidate of queuedCandidates) await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            } else if (signal.kind === "ice" && signal.candidate) {
              const pc = peers.current.get(signal.from);
              if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
              else {
                const queued = pendingCandidates.get(signal.from) ?? [];
                queued.push(signal.candidate);
                pendingCandidates.set(signal.from, queued);
              }
            } else if (signal.kind === "leave") {
              peers.current.get(signal.from)?.close(); peers.current.delete(signal.from); pendingCandidates.delete(signal.from);
              setRemoteStreams(current => { const next = { ...current }; delete next[signal.from]; return next; });
              setParticipants(current => current.filter(id => id !== signal.from));
            }
          } catch (err) { console.warn("Party signaling event failed", err); }
        });
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("Could not connect to party signaling. Check your connection and try again.")), 12000);
          channel!.subscribe(status => {
            if (status === "SUBSCRIBED") { window.clearTimeout(timeout); resolve(); }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { window.clearTimeout(timeout); reject(new Error("Party connection failed. Please try again.")); }
          });
        });
        if (cancelled) return;
        setConnecting(false);
        send({ kind: "hello", from: userId });
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : "Could not join this party."); setConnecting(false); }
      }
    }
    void start();
    return () => {
      cancelled = true;
      send({ kind: "leave", from: userId });
      peerConnections.forEach(pc => pc.close()); peerConnections.clear(); pendingCandidates.clear();
      streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null;
      if (channel) void createClient().removeChannel(channel);
      channelRef.current = null;
    };
  }, [connectPeer, party.id, party.format, send, userId]);

  function toggleMute() {
    const next = !muted; setMuted(next);
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
  }
  function toggleCamera() {
    const next = !cameraOff; setCameraOff(next);
    streamRef.current?.getVideoTracks().forEach(track => { track.enabled = !next; });
  }
  function leave() { onClose(); }

  return <section className="party-room-overlay" role="dialog" aria-modal="true" aria-label={party.title}>
    <header className="party-room-header"><div><span className="party-room-live"><Radio size={13}/> LIVE ROOM</span><h2>{party.title}</h2><p><Users size={14}/> {participants.length + 1} connected · {party.format === "audio" ? "Audio party" : party.format === "watch" ? "Watch party room" : "Video party"}</p></div><button type="button" className="party-room-leave" onClick={leave}><PhoneOff size={17}/> Leave</button></header>
    {error ? <div className="party-room-error"><b>Couldn’t join the room</b><p>{error}</p><button type="button" onClick={leave}>Back to parties</button></div> : <><div className={"party-room-stage " + (party.format === "audio" ? "audio-stage" : "")}>
      <article className="party-room-tile local-tile"><video ref={localVideo} autoPlay muted playsInline className={cameraOff ? "camera-disabled" : ""}/>{cameraOff && <div className="party-room-avatar">You</div>}<span>You {party.host_id === userId ? "· Host" : ""}</span></article>
      {Object.entries(remoteStreams).map(([id, stream]) => <RemoteTile key={id} userId={id} stream={stream} audioOnly={party.format === "audio"}/>)}
      {!Object.keys(remoteStreams).length && <div className="party-room-waiting">{connecting ? <><LoaderCircle size={26} className="party-spin"/><b>Connecting to your party…</b></> : <><Users size={28}/><b>You’re first in the room</b><p>Share the party with guests so they can join.</p></>}</div>}
    </div><footer className="party-room-controls"><button type="button" className={muted ? "is-off" : ""} onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"}>{muted ? <MicOff size={20}/> : <Mic size={20}/>}<span>{muted ? "Unmute" : "Mute"}</span></button>{party.format === "video" && <button type="button" className={cameraOff ? "is-off" : ""} onClick={toggleCamera} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}>{cameraOff ? <VideoOff size={20}/> : <Video size={20}/>}<span>{cameraOff ? "Camera on" : "Camera off"}</span></button>}<button type="button" className="party-room-end" onClick={leave}><PhoneOff size={20}/><span>Leave room</span></button></footer></>}
    <p className="party-room-footnote">Live peer-to-peer media · Camera and microphone access required · Best for small groups</p>
  </section>;
}

function RemoteTile({ userId, stream, audioOnly }: { userId: string; stream: MediaStream; audioOnly: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, [stream]);
  return <article className="party-room-tile"><video ref={videoRef} autoPlay playsInline className={audioOnly ? "camera-disabled" : ""}/>{audioOnly && <div className="party-room-avatar">{userId.slice(0, 2).toUpperCase()}</div>}<span>Guest {userId.slice(0, 5)}</span></article>;
}
