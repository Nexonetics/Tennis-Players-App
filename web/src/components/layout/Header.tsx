'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, ChevronDown, Menu } from 'lucide-react';
import { currentUser } from '@/data/dummyData';
import { SportsSearchLogo } from '../ui/SportsSearchLogo';

interface HeaderProps {
  onOpenDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer }) => {
  return (
    <header className="w-full flex items-center justify-between gap-3 sm:gap-6 py-3 px-4 sm:px-6 md:px-8 bg-transparent">
      {/* Mobile Menu & Logo Header (Visible on Mobile) */}
      <div className="flex items-center gap-2 md:hidden shrink-0">
        {onOpenDrawer && (
          <button
            onClick={onOpenDrawer}
            className="p-2 text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Open Drawer"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
          </button>
        )}
        <Link href="/" className="shrink-0">
          <SportsSearchLogo className="scale-90 origin-left" />
        </Link>
      </div>

      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" strokeWidth={2} />
        </div>
        <input
          type="text"
          placeholder="Search players, tournaments..."
          className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-full border border-slate-200/70 focus:outline-hidden focus:border-[#FA2E72]/50 focus:ring-2 focus:ring-[#FA2E72]/10 transition-all shadow-2xs"
        />
      </div>

      {/* Right side controls (Notifications & User Profile) */}
      <div className="flex items-center gap-2 sm:gap-5 shrink-0">
        {/* Notification Bell with Badge */}
        <button
          className="relative p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" strokeWidth={1.9} />
          {currentUser.notificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-[#FA2E72] rounded-full border-2 border-white shadow-xs">
              {currentUser.notificationsCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#C2185B] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
            {currentUser.avatarLetter}
          </div>
          <span className="hidden sm:inline text-sm font-semibold text-slate-800 group-hover:text-slate-950">
            {currentUser.name}
          </span>
          <ChevronDown className="hidden sm:inline w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
        </div>
      </div>
    </header>
  );
};
