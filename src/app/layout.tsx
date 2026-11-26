import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketPilot AI — CRM",
  description: "Marketing intelligence platform: CRM, analytics, RAG knowledge and lead scoring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
