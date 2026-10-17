"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: displayName || username } } });
        if (error) throw error;
        setMessage("Account request received. Check your email if confirmation is enabled, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not complete sign-in."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><Link href="/" className="brand"><span className="brand-mark">z</span><span>Zee<b>Chat</b></span></Link><section className="auth-card"><span className="eyebrow">A LITTLE LESS BOREDOM</span><h1>{mode === "signup" ? "Your people are" : "Welcome"} <em>{mode === "signup" ? "out there." : "back."}</em></h1><p>Find your vibe. Make your moment. Keep it going.</p><div className="auth-switch"><button className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>Create account</button><button className={mode === "signin" ? "selected" : ""} onClick={() => setMode("signin")}>Sign in</button></div><form onSubmit={submit}>{mode === "signup" && <><label>Username<input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} minLength={3} maxLength={24} pattern="[a-zA-Z0-9_.]{3,24}" placeholder="your.vibe" required /></label><label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60} placeholder="What should we call you?" /></label></>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} placeholder="At least 8 characters" required /></label><button className="create-button auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create my account →" : "Sign in →"}</button></form>{message && <p className="auth-message" role="status">{message}</p>}<p className="auth-legal">Use ZeeChat respectfully and follow community safety rules.</p></section><p className="auth-footer">A little less scrolling. A lot more living. ✨</p></main>;
}