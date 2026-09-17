'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Search, ArrowLeftRight, Menu } from 'lucide-react';

interface MobileNavProps {
  onOpenDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenDrawer }) => {
  const pathname = usePathname() || '/';

  const navItems = [
    { id: 'home', label: 'Home', href: '/', icon: Home },
    { id: 'rankings', label: 'Rankings', href: '/rankings', icon: Trophy },
    { id: 'search', label: 'Search', href: '/search', icon: Search },
    { id: 'compare', label: 'Compare', href: '/compare', icon: ArrowLeftRight },
  ];

  return (
    <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl min-w-[60px] transition-all cursor-pointer active:scale-95 ${
              isActive ? 'text-[#FA2E72] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div
              className={`p-1.5 rounded-full transition-all ${
                isActive ? 'bg-[#FDF2F4] text-[#FA2E72]' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu Drawer Button */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl min-w-[60px] text-slate-500 hover:text-slate-800 font-medium transition-all cursor-pointer active:scale-95"
      >
        <div className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
          <Menu className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
      </button>
    </nav>
  );
};
