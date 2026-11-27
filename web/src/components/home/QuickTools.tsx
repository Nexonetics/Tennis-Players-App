'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeftRight, ArrowRight, BadgeDollarSign, Search } from 'lucide-react';
import { useSports } from '@/context/SportsContext';

const TOOLS = [
  {
    id: 'search',
    title: 'Search Athletes',
    description: 'Filter 14,000+ players and national teams by country, rank, or name.',
    href: '/search',
    icon: Search,
    accentClass: 'bg-[#FDF2F4] text-[#FA2E72]',
  },
  {
    id: 'compare',
    title: 'Compare Head-to-Head',
    description: 'Analyze stats, win rates, and career ranking trajectories side-by-side.',
    href: '/compare',
    icon: ArrowLeftRight,
    accentClass: 'bg-indigo-50 text-indigo-600',
  },
  {
    id: 'college-basketball',
    title: 'College Basketball Odds',
    description: 'Browse NCAA sportsbook lines, team records, and daily model leans.',
    href: '/college-basketball',
    icon: BadgeDollarSign,
    accentClass: 'bg-amber-50 text-amber-600',
  },
];

export const QuickTools: React.FC = () => {
  const { getNavHref } = useSports();

  return (
    <section aria-label="Explore tools" className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
      {TOOLS.map(({ id, title, description, href, icon: Icon, accentClass }) => (
        <Link
          key={id}
          href={getNavHref(href)}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-pink-100 transition-all duration-200 flex items-center justify-between gap-3.5 md:flex-col md:items-start md:gap-4 group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 md:flex-col md:items-start md:gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 ${accentClass}`}>
              <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#FA2E72] transition-colors truncate">
                {title}
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#FA2E72] text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0 md:self-end">
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      ))}
    </section>
  );
};
