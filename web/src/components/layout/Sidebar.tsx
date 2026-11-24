'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Home, Trophy, Search, ArrowLeftRight, BadgeDollarSign } from 'lucide-react';
import { SportsSearchLogo } from '../ui/SportsSearchLogo';
import { getAssetUrl } from '@/lib/getAssetUrl';
import { isActivePath } from '@/lib/nav';
import { useSports } from '@/context/SportsContext';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: Home },
  { id: 'rankings', label: 'Rankings', href: '/rankings', icon: Trophy },
  { id: 'search', label: 'Search', href: '/search', icon: Search },
  { id: 'compare', label: 'Compare', href: '/compare', icon: ArrowLeftRight },
  { id: 'college-basketball', label: 'College Odds', href: '/college-basketball', icon: BadgeDollarSign },
];

/**
 * Desktop navigation. Icon-only rail on tablets / small laptops (md), full
 * sidebar with labels from lg up.
 */
export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { getNavHref } = useSports();

  return (
    <aside className="hidden md:flex relative w-20 lg:w-60 min-h-screen bg-white border-r border-slate-100 flex-col justify-between shrink-0 select-none overflow-hidden">
      {/* Top section with logo and navigation */}
      <div className="z-10 pt-6 px-3 lg:px-6">
        <Link href="/" aria-label="SportsSearch home" className="flex justify-center lg:justify-start mb-8 rounded-xl">
          <SportsSearchLogo collapsible />
        </Link>

        <nav aria-label="Main navigation" className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.id}
                href={getNavHref(item.href)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex items-center justify-center lg:justify-start gap-3.5 px-0 lg:px-4 h-12 rounded-2xl text-[0.95rem] font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#FDF2F4] text-[#FA2E72] font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {/* Active marker */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#FA2E72] transition-opacity lg:hidden ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-[#FA2E72]' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom silhouette watermark decoration */}
      <div className="relative w-full h-80 pointer-events-none mt-auto hidden lg:block">
        <div className="absolute -bottom-6 -left-6 w-72 h-88 opacity-80">
          <Image
            src={getAssetUrl('/images/tennis-player-silhouette.svg')}
            alt=""
            fill
            className="object-contain object-bottom-left"
            loading="eager"
          />
        </div>
      </div>
    </aside>
  );
};
