'use client';

import React from 'react';
import { AlertTriangle, Check, Hourglass, Scale, Sparkles, Trophy } from 'lucide-react';
import type { CbbGame } from '@/types';
import { type GamePrediction, type Side, formatPct } from '@/lib/cbbModel';
import { LEAN_KIND_LABEL, describeLeans, formatOdds, teamName } from './shared';

interface PanelProps {
  game: CbbGame;
  prediction: GamePrediction;
  /** Tip-off has passed: the cached lines are pre-game, so no leans are offered. */
  started: boolean;
}

/** Predicted winner, win-probability bar, reasons and betting leans for one game. */
export function PredictionPanel({ game, prediction: p, started }: PanelProps) {
  const away = teamName(game, 'away');
  const home = teamName(game, 'home');
  const leans = started ? [] : describeLeans(game, p);
  const recordsPick: Side | null =
    p.recordsHomeProb === null ? null : p.recordsHomeProb >= 0.5 ? 'home' : 'away';

  return (
    <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-3.5 sm:p-4 flex flex-col gap-3">
      {/* Pick */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prediction</div>
          <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-sm sm:text-base mt-0.5">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{teamName(game, p.pick)} to win</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl sm:text-2xl leading-none font-extrabold text-[#FA2E72] tabular-nums">
            {formatPct(p.pickProb)}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            {p.confidence === 'Slight' ? 'Toss-up' : `${p.confidence} pick`}
          </div>
        </div>
      </div>

      {/* Win-probability bar */}
      <div>
        <div
          className="flex h-2.5 rounded-full overflow-hidden bg-slate-200 gap-0.5"
          role="img"
          aria-label={`Win chance: ${away} ${formatPct(p.winProb.away)}, ${home} ${formatPct(p.winProb.home)}`}
        >
          <div
            style={{ width: `${p.winProb.away * 100}%` }}
            className={`rounded-l-full ${p.pick === 'away' ? 'bg-[#FA2E72]' : 'bg-slate-300'}`}
          />
          <div
            style={{ width: `${p.winProb.home * 100}%` }}
            className={`rounded-r-full ${p.pick === 'home' ? 'bg-[#FA2E72]' : 'bg-slate-300'}`}
          />
        </div>
        <div className="flex justify-between gap-2 mt-1 text-[11px] font-semibold text-slate-500">
          <span className="truncate">
            {away} <span className="tabular-nums">{formatPct(p.winProb.away)}</span>
          </span>
          <span className="truncate text-right">
            {home} <span className="tabular-nums">{formatPct(p.winProb.home)}</span>
          </span>
        </div>
      </div>

      {/* Flags */}
      {(p.recordsDisagree || p.smallSample) && (
        <div className="flex flex-wrap gap-1.5">
          {p.recordsDisagree && recordsPick && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              Upset watch: records favor {teamName(game, recordsPick)}
            </span>
          )}
          {p.smallSample && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
              <Hourglass className="w-3.5 h-3.5" aria-hidden="true" />
              Early season: small sample
            </span>
          )}
        </div>
      )}

      {/* Reasons */}
      {p.reasons.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-slate-600">
          {p.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 mt-px shrink-0" aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Betting leans */}
      {started ? (
        <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
          Game has started, so these pre-game lines can no longer be bet. Leans hidden.
        </p>
      ) : leans.length > 0 ? (
        <div className="flex flex-col gap-2">
          {leans.map((lean) => (
            <div key={lean.kind} className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {LEAN_KIND_LABEL[lean.kind]}
              </div>
              <div className="font-extrabold text-emerald-950 text-sm mt-0.5">{lean.label}</div>
              <div className="text-[11px] text-emerald-900/75 mt-0.5">{lean.detail}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          No betting edge: the posted prices look fair.
        </p>
      )}
    </div>
  );
}

/** Side-by-side win–loss breakdown plus each team's price range across sportsbooks. */
export function AnalysisTable({ game, prediction: p }: { game: CbbGame; prediction: GamePrediction }) {
  const away = teamName(game, 'away');
  const home = teamName(game, 'home');

  const priceCell = (side: Side, align: 'left' | 'right') => {
    const { best, worst } = p.priceRange[side];
    if (!best) return <span className="text-slate-400">—</span>;
    return (
      <div className={`flex flex-col gap-0.5 ${align === 'right' ? 'items-end' : 'items-start'}`}>
        <span>
          <span className="font-extrabold text-emerald-700 tabular-nums">{formatOdds(best.price)}</span>{' '}
          <span className="text-[11px] font-medium text-slate-400">{best.book}</span>
        </span>
        {worst && worst.price !== best.price && (
          <span>
            <span className="font-bold text-rose-600 tabular-nums">{formatOdds(worst.price)}</span>{' '}
            <span className="text-[11px] font-medium text-slate-400">{worst.book}</span>
          </span>
        )}
      </div>
    );
  };

  const rowClass =
    'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2.5 border-b border-slate-100 last:border-b-0';

  return (
    <div className="flex flex-col gap-3">
      <div className={`${rowClass} pt-0 text-[11px] font-extrabold uppercase tracking-wider text-slate-500`}>
        <span className="truncate">{away}</span>
        <span className="text-center text-slate-300">vs</span>
        <span className="truncate text-right">{home}</span>
      </div>

      <div className="text-xs sm:text-sm">
        {p.factors.map((f) => (
          <div key={f.label} className={rowClass}>
            <span className={`truncate font-bold tabular-nums ${f.favors === 'away' ? 'text-emerald-700' : 'text-slate-700'}`}>
              {f.away}
              {f.favors === 'away' && (
                <span className="ml-1 text-[10px]" aria-label="favours this team">
                  ▲
                </span>
              )}
            </span>
            <span className="text-center text-[11px] font-semibold text-[#14b8a6] px-1">{f.label}</span>
            <span
              className={`truncate text-right font-bold tabular-nums ${f.favors === 'home' ? 'text-emerald-700' : 'text-slate-700'}`}
            >
              {f.favors === 'home' && (
                <span className="mr-1 text-[10px]" aria-label="favours this team">
                  ▲
                </span>
              )}
              {f.home}
            </span>
          </div>
        ))}
        <div className={rowClass}>
          {priceCell('away', 'left')}
          <span className="text-center text-[11px] font-semibold text-[#14b8a6] px-1">
            Moneyline
            <br />
            best / worst
          </span>
          {priceCell('home', 'right')}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        How this pick is made: the sportsbooks&apos; win chance
        {p.marketHomeProb !== null && (
          <>
            {' '}
            ({home} {formatPct(p.marketHomeProb)})
          </>
        )}{' '}
        adjusted by a season-records model
        {p.recordsHomeProb !== null && (
          <>
            {' '}
            ({home} {formatPct(p.recordsHomeProb)})
          </>
        )}
        . Records count for {Math.round(p.recordsWeight * 100)}% at this point in the season and gain weight as teams play
        more games.
      </p>
    </div>
  );
}
