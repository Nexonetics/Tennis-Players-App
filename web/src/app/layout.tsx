import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SportsSearch - Live Scores, Rankings & Tournaments",
  description: "Live scores, player rankings, tournaments and more — all in one place.",
};

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-hidden">
        <div className="flex h-screen bg-[#F8FAFC]">
          {/* Left Navigation Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {/* Top Header */}
            <Header />

            {/* Dashboard Body */}
            <main className="flex-1 px-8 pb-8 flex flex-col gap-5 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
