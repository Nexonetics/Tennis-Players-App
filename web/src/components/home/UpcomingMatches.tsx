'use client';

import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { upcomingMatches } from '@/data/dummyData';
import { TeamBadge } from '../ui/TeamBadge';

export const UpcomingMatches: React.FC = () => {
  return (
    <section className="w-full mt-6 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#FA2E72]" strokeWidth={2.2} />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Upcoming Matches</h2>
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold text-[#FA2E72] hover:text-[#E02263] transition-colors cursor-pointer">
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {upcomingMatches.map((match) => (
          <div
            key={match.id}
            className="relative bg-white rounded-3xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between overflow-hidden group hover:shadow-sm transition-all duration-200"
          >
            {/* Subtle top right decorative pink glow */}
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#FDF2F4] rounded-full blur-xl pointer-events-none opacity-80" />

            <div>
              {/* Sport Tag */}
              <div className="mb-2">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FDF2F4] text-[#FA2E72] text-[10px] font-semibold">
                  {match.sport}
                </span>
              </div>

              {/* Tournament Title & Stage */}
              <h3 className="text-xs font-bold text-slate-900 truncate">
                {match.tournament}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mb-3">
                {match.stage}
              </p>

              {/* Competitors */}
              <div className="flex flex-col gap-1.5 my-2">
                {/* Team 1 */}
                <div className="flex items-center gap-2">
                  <TeamBadge id={match.team1.logoOrFlag} name={match.team1.name} size={16} />
                  <span className="text-[11px] font-medium text-slate-700 truncate">
                    {match.team1.name}
                  </span>
                </div>

                {/* VS Indicator */}
                <div className="flex items-center pl-1 -my-1">
                  <span className="text-[9px] font-bold text-slate-400">vs</span>
                </div>

                {/* Team 2 */}
                <div className="flex items-center gap-2">
                  <TeamBadge id={match.team2.logoOrFlag} name={match.team2.name} size={16} />
                  <span className="text-[11px] font-medium text-slate-700 truncate">
                    {match.team2.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Row: Schedule & Action */}
            <div className="pt-3 mt-2 border-t border-slate-100/70 flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-400">
                {match.schedule}
              </span>
              <button
                className="w-6 h-6 rounded-full bg-[#FDF2F4] group-hover:bg-[#FA2E72] text-[#FA2E72] group-hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                aria-label={`View match details for ${match.tournament}`}
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
