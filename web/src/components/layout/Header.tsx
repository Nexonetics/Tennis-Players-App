'use client';

import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { currentUser } from '@/data/dummyData';

export const Header: React.FC = () => {
  return (
    <header className="w-full flex items-center justify-between gap-6 py-4 px-8 bg-transparent">
      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" strokeWidth={2} />
        </div>
        <input
          type="text"
          placeholder="Search players, tournaments, teams..."
          className="w-full pl-11 pr-4 py-2.5 bg-[#F1F5F9]/60 hover:bg-[#F1F5F9] focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-full border border-slate-200/70 focus:outline-hidden focus:border-[#FA2E72]/50 focus:ring-2 focus:ring-[#FA2E72]/10 transition-all shadow-2xs"
        />
      </div>

      {/* Right side controls (Notifications & User Profile) */}
      <div className="flex items-center gap-5">
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
        <div className="flex items-center gap-2.5 pl-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#C2185B] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
            {currentUser.avatarLetter}
          </div>
          <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-950">
            {currentUser.name}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
        </div>
      </div>
    </header>
  );
};
