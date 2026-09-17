import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout/LayoutShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SportsSearch - Live Scores, Rankings & Tournaments",
  description: "Live scores, player rankings, tournaments and more — all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased md:overflow-hidden">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
