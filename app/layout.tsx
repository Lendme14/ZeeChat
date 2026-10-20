import type { Metadata, Viewport } from "next";
import "./globals.css";
import NetworkStatus from "./components/NetworkStatus";

export const metadata: Metadata = {
  title: "ZeeChat — Find your people",
  description: "Discover creators, conversations and little adventures picked for your vibe.",
  applicationName: "ZeeChat",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ZeeChat" },
  formatDetection: { telephone: false },
  manifest: "/manifest.json",
  icons: { icon: "/icons/zeechat.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0b10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><NetworkStatus />{children}<script dangerouslySetInnerHTML={{__html: `if ("serviceWorker" in navigator) { window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {})); }`}} /></body></html>;
}
