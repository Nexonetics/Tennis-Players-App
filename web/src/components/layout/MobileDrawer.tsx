'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { X, Trophy, Search, ArrowLeftRight, Home, BadgeDollarSign } from 'lucide-react';
import { SportsSearchLogo } from '../ui/SportsSearchLogo';
import { currentUser, sportCategories } from '@/data/dummyData';
import { getAssetUrl } from '@/lib/getAssetUrl';
import { useSports } from '@/context/SportsContext';
import { useOverlay } from '@/hooks/useOverlay';
import { isActivePath } from '@/lib/nav';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { getNavHref } = useSports();

  // Lock background scrolling and close on Escape while open
  useOverlay(isOpen, onClose);

  if (!isOpen) return null;

  const navItems = [
    { id: 'home', label: 'Home Dashboard', href: '/', icon: Home },
    { id: 'rankings', label: 'World Rankings', href: '/rankings', icon: Trophy },
    { id: 'search', label: 'Search Athletes', href: '/search', icon: Search },
    { id: 'compare', label: 'Compare Players', href: '/compare', icon: ArrowLeftRight },
    { id: 'college-basketball', label: 'College Basketball Odds', href: '/college-basketball', icon: BadgeDollarSign },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="relative w-[85%] max-w-xs bg-white h-full flex flex-col justify-between shadow-2xl z-10 overflow-y-auto overscroll-contain animate-slide-in-left pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <Link href="/" onClick={onClose}>
            <SportsSearchLogo />
          </Link>
          <button
            onClick={onClose}
            className="p-2.5 -mr-1 rounded-full hover:bg-slate-100 active:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Close Navigation Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="p-5 flex flex-col gap-6 flex-1">
          {/* Main Links */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
              Navigation
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(pathname, item.href);
              const targetHref = getNavHref(item.href);

              return (
                <Link
                  key={item.id}
                  href={targetHref}
                  onClick={onClose}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#FDF2F4] text-[#FA2E72]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-[#FA2E72]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick Sports Categories */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
              Featured Sports
            </span>
            <div className="grid grid-cols-2 gap-2">
              {sportCategories.map((sport) => (
                <Link
                  key={sport.id}
                  href={`/rankings?sport=${encodeURIComponent(sport.title)}`}
                  onClick={onClose}
                  className="p-3 bg-slate-50 hover:bg-pink-50/70 active:bg-pink-50/70 border border-slate-100 rounded-2xl flex flex-col gap-1 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800">
                    {sport.title}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium truncate">
                    {sport.subtitle}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* User Profile Footer Card */}
          <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C2185B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {currentUser.avatarLetter}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  Active User
                </span>
              </div>
            </div>
            <div className="px-2 py-1 bg-[#FA2E72]/10 text-[#FA2E72] rounded-full text-[10px] font-bold">
              PRO
            </div>
          </div>
        </div>

        {/* Silhouette decoration */}
        <div className="relative w-full h-36 pointer-events-none mt-auto opacity-30">
          <Image
            src={getAssetUrl('/images/tennis-player-silhouette.svg')}
            alt="Tennis Player Illustration"
            fill
            className="object-contain object-bottom-left"
          />
        </div>
      </div>
    </div>
  );
};
