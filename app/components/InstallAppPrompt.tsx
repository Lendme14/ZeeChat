"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!installEvent || hidden) return null;

  const install = async () => {
    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setHidden(true);
      setInstallEvent(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <aside
      aria-label="Install ZeeChat"
      style={{
        position: "fixed",
        left: "max(16px, env(safe-area-inset-left))",
        right: "max(16px, env(safe-area-inset-right))",
        bottom: "calc(82px + env(safe-area-inset-bottom, 0px))",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 480,
        marginInline: "auto",
        padding: "14px 14px 14px 16px",
        border: "1px solid #49364f",
        borderRadius: 18,
        background: "rgba(21, 19, 27, .97)",
        color: "#f7f2fa",
        boxShadow: "0 16px 50px rgba(0,0,0,.4)",
        backdropFilter: "blur(18px)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          flex: "0 0 42px",
          width: 42,
          height: 42,
          borderRadius: 13,
          background: "linear-gradient(140deg,#ff6ba6,#a66aff)",
          color: "white",
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        Z
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: 13 }}>Install ZeeChat</strong>
        <span style={{ display: "block", marginTop: 3, color: "#c6bbce", fontSize: 11, lineHeight: 1.4 }}>
          Add it to your home screen for a quicker app-like launch.
        </span>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        disabled={installing}
        style={{
          flexShrink: 0,
          border: 0,
          borderRadius: 10,
          padding: "10px 12px",
          background: "linear-gradient(115deg,#ff5d9d,#a16bff)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 750,
        }}
      >
        {installing ? "Opening…" : "Install"}
      </button>
      <button
        type="button"
        aria-label="Dismiss install suggestion"
        onClick={() => setHidden(true)}
        style={{
          alignSelf: "flex-start",
          border: 0,
          padding: "0 2px",
          background: "transparent",
          color: "#bcb0c5",
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </aside>
  );
}
