import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeeChat — Find your people",
  description: "Discover creators, conversations and little adventures picked for your vibe.",
  applicationName: "ZeeChat",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ZeeChat" },
  formatDetection: { telephone: false },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{__html: `if (\"serviceWorker\" in navigator) { window.addEventListener(\"load\", () => navigator.serviceWorker.register(\"/sw.js\").catch(() => {})); }`}} /></body></html>;
}