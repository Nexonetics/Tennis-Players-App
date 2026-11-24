'use client';

import React from 'react';
import { ArrowRight, Scale, Sparkles } from 'lucide-react';
import type { CbbGame } from '@/types';
import { LEAN_KIND_LABEL, type LeanItem, TeamLogo, teamName } from './shared';

export interface LeanEntry {
  game: CbbGame;
  lean: LeanItem;
}

const KIND_ORDER: Record<LeanItem['kind'], number> = { moneyline: 0, spread: 1, total: 2 };

const formatShortTipoff = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

/** The strongest leans across all upcoming games; each links to its game card. */
export function TopLeans({
  entries,
  upcomingCount,
  maxShown = 6,
}: {
  entries: LeanEntry[];
  /** Games that haven't tipped off yet (only those can carry leans). */
  upcomingCount: number;
  maxShown?: number;
}) {
  const sorted = [...entries].sort(
    (a, b) => KIND_ORDER[a.lean.kind] - KIND_ORDER[b.lean.kind] || b.lean.strength - a.lean.strength
  );
  const shown = sorted.slice(0, maxShown);

  return (
    <section
      aria-labelledby="top-leans-title"
      className="bg-white rounded-3xl border border-slate-100 shadow-xs p-4 sm:p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="top-leans-title" className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
          <Sparkles className="w-4 h-4 text-[#FA2E72]" aria-hidden="true" />
          Today&apos;s betting leans
        </h2>
        {entries.length > 0 && (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
            {entries.length} across all games
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Scale className="w-4 h-4 shrink-0" aria-hidden="true" />
          {upcomingCount === 0
            ? 'Every game in this odds snapshot has tipped off. New leans arrive with the next daily odds pull (around 9–10am ET).'
            : 'No strong leans in the current lines: the sportsbooks’ prices look fair for every upcoming game.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {shown.map(({ game, lean }) => (
              <a
                key={`${game.id}-${lean.kind}`}
                href={`#game-${game.id}`}
                className="group rounded-2xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-200 px-3.5 py-3 flex flex-col gap-1 transition-colors"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {LEAN_KIND_LABEL[lean.kind]}
                </span>
                <span className="font-extrabold text-emerald-950 text-sm">{lean.label}</span>
                <span className="text-[11px] text-emerald-900/75 line-clamp-2">{lean.detail}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <TeamLogo src={game.away.logo} name={teamName(game, 'away')} size={16} />
                  <span className="truncate">
                    {teamName(game, 'away')} @ {teamName(game, 'home')} · {formatShortTipoff(game.commence_time)}
                  </span>
                  <ArrowRight
                    className="w-3.5 h-3.5 ml-auto shrink-0 text-emerald-700 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </span>
              </a>
          ))}
        </div>
      )}

      {sorted.length > shown.length && (
        <p className="text-[11px] text-slate-400">
          Showing the {shown.length} strongest. Every lean is also shown on its game below.
        </p>
      )}
    </section>
  );
}
