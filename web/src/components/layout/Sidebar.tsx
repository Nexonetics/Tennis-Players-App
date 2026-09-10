'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Trophy, Search, ArrowLeftRight } from 'lucide-react';
import { SportsSearchLogo } from '../ui/SportsSearchLogo';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'rankings', label: 'Rankings', href: '/rankings', icon: Trophy },
  { id: 'search', label: 'Search', href: '/search', icon: Search },
  { id: 'compare', label: 'Compare', href: '/compare', icon: ArrowLeftRight },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname() || '/rankings';

  return (
    <aside className="relative w-60 min-h-screen bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 select-none overflow-hidden">
      {/* Top section with logo and navigation */}
      <div className="z-10 pt-6 px-6">
        <Link href="/rankings">
          <SportsSearchLogo className="mb-8" />
        </Link>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Handle root path or exact match
            const isActive = pathname === item.href || (pathname === '/' && item.id === 'rankings');

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[0.95rem] font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#FDF2F4] text-[#FA2E72] font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-[#FA2E72]' : 'text-slate-400'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom silhouette watermark decoration */}
      <div className="relative w-full h-80 pointer-events-none mt-auto">
        <div className="absolute -bottom-6 -left-6 w-72 h-88 opacity-80">
          <Image
            src="/images/tennis-player-silhouette.svg"
            alt="Tennis Player Illustration"
            fill
            className="object-contain object-bottom-left"
            priority
          />
        </div>
      </div>
    </aside>
  );
};
