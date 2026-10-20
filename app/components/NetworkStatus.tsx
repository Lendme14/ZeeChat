"use client";

import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const updateStatus = () => setOffline(!navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "env(safe-area-inset-top, 0px)",
        left: 0,
        right: 0,
        zIndex: 10000,
        padding: "10px 16px",
        background: "#4a2a12",
        color: "#fff4e8",
        borderBottom: "1px solid rgba(255,244,232,.2)",
        textAlign: "center",
        fontSize: 13,
        lineHeight: 1.45,
        fontWeight: 600,
        boxShadow: "0 4px 18px rgba(0,0,0,.2)",
      }}
    >
      You’re offline. Cached app screens may still open, but new posts and messages need internet.
    </div>
  );
}
