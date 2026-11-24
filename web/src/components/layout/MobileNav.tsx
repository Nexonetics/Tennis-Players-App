'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Search, ArrowLeftRight, Menu } from 'lucide-react';
import { useSports } from '@/context/SportsContext';
import { isActivePath } from '@/lib/nav';

interface MobileNavProps {
  onOpenDrawer: () => void;
}

const navItems = [
  { id: 'home', label: 'Home', href: '/', icon: Home },
  { id: 'rankings', label: 'Rankings', href: '/rankings', icon: Trophy },
  { id: 'search', label: 'Search', href: '/search', icon: Search },
  { id: 'compare', label: 'Compare', href: '/compare', icon: ArrowLeftRight },
];

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenDrawer }) => {
  const pathname = usePathname();
  const { getNavHref } = useSports();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href);
          const targetHref = getNavHref(item.href);

          return (
            <Link
              key={item.id}
              href={targetHref}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-14 transition-colors cursor-pointer active:scale-95 ${
                isActive ? 'text-[#FA2E72]' : 'text-slate-500 active:text-slate-800'
              }`}
            >
              {/* Active indicator bar */}
              <span
                className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-[#FA2E72] transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <span
                className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                  isActive ? 'bg-[#FDF2F4]' : ''
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
              </span>
              <span className={`text-[11px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Menu Drawer Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open menu"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-14 text-slate-500 active:text-slate-800 transition-colors cursor-pointer active:scale-95"
        >
          <span className="flex items-center justify-center w-12 h-7 rounded-full">
            <Menu className="w-5 h-5" strokeWidth={1.8} />
          </span>
          <span className="text-[11px] font-medium tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};
