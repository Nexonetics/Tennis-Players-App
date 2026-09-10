'use client';

import React from 'react';
import { ArrowRight, Radio } from 'lucide-react';
import { liveMatches } from '@/data/dummyData';
import { TeamBadge } from '../ui/TeamBadge';

export const LiveMatchesCard: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
        <div className="flex items-center gap-2">
          <div className="text-[#FA2E72]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Live Matches</h2>
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold text-[#FA2E72] hover:text-[#E02263] transition-colors cursor-pointer">
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Match Items List */}
      <div className="divide-y divide-slate-100/70">
        {liveMatches.map((match) => (
          <div key={match.id} className="py-3 first:pt-3 last:pb-0">
            {/* Sport Pill Tag */}
            <div className="mb-2">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FDF2F4] text-[#FA2E72] text-[10px] font-semibold tracking-wide">
                {match.sport}
              </span>
            </div>

            {/* Scoreboard and Live Badge Row */}
            <div className="flex items-center justify-between gap-3">
              {/* Left Indicator & Player Scores */}
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                {/* Red Live Dot */}
                <div className="pt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FA2E72] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FA2E72]" />
                  </span>
                </div>

                {/* Players & Scores Column */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {/* Player 1 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamBadge id={match.player1.flagCode} name={match.player1.name} size={15} />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {match.player1.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      {match.player1.scores.map((score, sIdx) => (
                        <span key={sIdx} className="w-3 text-center">
                          {score}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamBadge id={match.player2.flagCode} name={match.player2.name} size={15} />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {match.player2.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      {match.player2.scores.map((score, sIdx) => (
                        <span key={sIdx} className="w-3 text-center">
                          {score}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE Pill on Right */}
              <div className="shrink-0 pl-1">
                <span className="px-2.5 py-1 rounded-full border border-[#FA2E72]/30 bg-[#FDF2F4] text-[#FA2E72] text-[10px] font-bold tracking-wider uppercase">
                  LIVE
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
