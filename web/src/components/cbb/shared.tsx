'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { CbbGame } from '@/types';
import { type GamePrediction, type Side, formatPct, impliedProb } from '@/lib/cbbModel';

export const formatOdds = (price?: number | null) =>
  price === undefined || price === null ? '—' : price > 0 ? `+${price}` : `${price}`;

export const formatSpread = (point?: number | null) =>
  point === undefined || point === null ? '—' : point === 0 ? 'PK' : point > 0 ? `+${point}` : `${point}`;

export const teamName = (game: CbbGame, side: Side) => game[side].short_name || game[side].name;

export const TeamLogo = ({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-sm flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="object-contain shrink-0"
      onError={() => setFailedSrc(src)}
    />
  );
};

export interface LeanItem {
  kind: 'moneyline' | 'spread' | 'total';
  /** The bet, e.g. "San Francisco ML +265" or "Over 135.5". */
  label: string;
  /** Why, in plain words. */
  detail: string;
  /** Higher = stronger (EV % for moneylines, points of gap for lines). */
  strength: number;
}

/** Turns a prediction's leans into readable bet descriptions, strongest first. */
export function describeLeans(game: CbbGame, p: GamePrediction): LeanItem[] {
  const items: LeanItem[] = [];

  if (p.moneylineValue) {
    const v = p.moneylineValue;
    items.push({
      kind: 'moneyline',
      label: `${teamName(game, v.side)} ML ${formatOdds(v.price)}`,
      detail: `at ${v.book} · we give them ${formatPct(p.winProb[v.side])} vs ${formatPct(
        impliedProb(v.price)
      )} implied by the price (EV +${(v.ev * 100).toFixed(1)}%)`,
      strength: v.ev * 100,
    });
  }

  if (p.spreadLean && (p.spreadLean.pick === 'home' || p.spreadLean.pick === 'away')) {
    const side = p.spreadLean.pick;
    const margin = side === 'home' ? p.spreadLean.projected : -p.spreadLean.projected;
    items.push({
      kind: 'spread',
      label: `${teamName(game, side)} ${formatSpread(p.spreadLean.line)}`,
      detail:
        margin >= 0
          ? `we project them to win by ${margin.toFixed(1)}`
          : `we project them to lose by only ${(-margin).toFixed(1)}`,
      strength: Math.abs(margin + p.spreadLean.line),
    });
  }

  if (p.totalLean) {
    items.push({
      kind: 'total',
      label: `${p.totalLean.pick === 'over' ? 'Over' : 'Under'} ${p.totalLean.line}`,
      detail: `we project ${p.totalLean.projected.toFixed(1)} total points`,
      strength: Math.abs(p.totalLean.projected - p.totalLean.line),
    });
  }

  return items;
}

export const LEAN_KIND_LABEL: Record<LeanItem['kind'], string> = {
  moneyline: 'Moneyline value',
  spread: 'Spread lean',
  total: 'Total lean',
};
