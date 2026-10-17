import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeeChat — Find your people",
  description: "Discover creators, conversations and little adventures picked for your vibe.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}