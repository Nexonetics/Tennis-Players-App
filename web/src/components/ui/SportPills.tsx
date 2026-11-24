'use client';

import React from 'react';
import { SPORTS, Sport, getSportEmoji } from '@/lib/sports';

interface SportPillsProps {
  value: Sport;
  onChange: (sport: Sport) => void;
}

/** Sport switcher. Bleeds to the screen edge on phones so it swipes naturally. */
export function SportPills({ value, onChange }: SportPillsProps) {
  return (
    <div
      role="group"
      aria-label="Choose sport"
      className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
    >
      {SPORTS.map((s) => {
        const isActive = value === s;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(s)}
            className={`px-4 sm:px-5 py-2.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all border flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
              isActive
                ? 'bg-[#FA2E72] text-white border-transparent shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span aria-hidden="true">{getSportEmoji(s)}</span>
            {s}
          </button>
        );
      })}
    </div>
  );
}
