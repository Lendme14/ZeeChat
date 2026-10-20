"use client";

import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const handleOffline = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setReconnected(false);
      setOffline(true);
    };

    const handleOnline = () => {
      setOffline(false);
      setReconnected(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => setReconnected(false), 3500);
    };

    setOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  if (!offline && !reconnected) return null;

  const isOnlineAgain = reconnected && !offline;

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
        background: isOnlineAgain ? "#123d2a" : "#4a2a12",
        color: isOnlineAgain ? "#e8fff1" : "#fff4e8",
        borderBottom: "1px solid rgba(255,244,232,.2)",
        textAlign: "center",
        fontSize: 13,
        lineHeight: 1.45,
        fontWeight: 600,
        boxShadow: "0 4px 18px rgba(0,0,0,.2)",
      }}
    >
      {isOnlineAgain
        ? "You’re back online. You can send messages and publish again."
        : "You’re offline. Cached app screens may still open, but new posts and messages need internet."}
    </div>
  );
}
