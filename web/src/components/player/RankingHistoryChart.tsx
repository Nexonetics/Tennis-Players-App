'use client';

import React, { useState } from 'react';
import { HistoryPoint } from '@/types';
import { useElementWidth } from '@/hooks/useElementWidth';
import { formatMonthYear } from '@/lib/format';

const formatAxisDate = formatMonthYear;

function toRank(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? fallback : parsed;
}

interface RankingHistoryChartProps {
  points: HistoryPoint[];
  fallbackRank: number;
}

/**
 * Line chart of ranking over time. Drawn in real pixels (viewBox = measured width)
 * so axis labels stay legible on phones instead of being scaled down with the SVG.
 * Points respond to hover (mouse) and tap (touch).
 */
export function RankingHistoryChart({ points, fallbackRank }: RankingHistoryChartProps) {
  const [containerRef, measuredWidth] = useElementWidth<HTMLDivElement>();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const W = Math.max(measuredWidth || 700, 260);
  const H = W < 480 ? 190 : 200;
  const padL = 44;
  const padR = 18;
  const padT = 30;
  const padB = 34;
  const drawW = W - padL - padR;
  const drawH = H - padT - padB;
  const baseline = padT + drawH;

  const ranks = points.map((p) => toRank(p.ranking, fallbackRank));
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  const span = Math.max(1, maxRank - minRank);

  const pts = points.map((p, idx) => ({
    x: padL + (points.length === 1 ? drawW / 2 : (idx / (points.length - 1)) * drawW),
    y: padT + ((ranks[idx] - minRank) / span) * drawH,
    ranking: ranks[idx],
    date: p.date || '',
    idx,
  }));

  if (pts.length === 0) return null;

  const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const polygonStr = `${pts[0].x.toFixed(1)},${baseline} ${polylineStr} ${pts[pts.length - 1].x.toFixed(1)},${baseline}`;
  const midPoint = pts.length > 2 ? pts[Math.floor(pts.length / 2)] : null;

  const active = activeIdx !== null ? pts[activeIdx] : null;
  const tipLabel = active ? `#${active.ranking} · ${formatAxisDate(active.date)}` : '';
  const tipW = tipLabel.length * 6.4 + 20;
  const tipH = 24;
  const tipX = active ? Math.min(W - tipW - 2, Math.max(2, active.x - tipW / 2)) : 0;
  const tipY = active ? (active.y - tipH - 10 >= 0 ? active.y - tipH - 10 : active.y + 12) : 0;

  return (
    <div ref={containerRef} className="w-full relative pt-2">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block overflow-visible select-none"
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setActiveIdx(null);
        }}
        role="img"
        aria-label={`Ranking history from #${pts[0].ranking} (${formatAxisDate(pts[0].date)}) to #${
          pts[pts.length - 1].ranking
        } (${formatAxisDate(pts[pts.length - 1].date)})`}
      >
        <defs>
          <linearGradient id="rankingChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FA2E72" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FA2E72" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Tap empty space to dismiss the tooltip */}
        <rect x="0" y="0" width={W} height={H} fill="transparent" onPointerDown={() => setActiveIdx(null)} />

        {/* Horizontal Grid Lines */}
        {[padT, padT + drawH / 2, baseline].map((y) => (
          <line key={y} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />
        ))}

        {/* Y-Axis Rank Labels */}
        <text x={padL - 8} y={padT + 4} textAnchor="end" className="text-[10px] font-extrabold fill-slate-400">
          #{minRank}
        </text>
        <text x={padL - 8} y={padT + drawH / 2 + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-300">
          #{Math.round((minRank + maxRank) / 2)}
        </text>
        <text x={padL - 8} y={baseline + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400">
          #{maxRank}
        </text>

        {/* Gradient Area Fill */}
        <polygon points={polygonStr} fill="url(#rankingChartGrad)" className="pointer-events-none" />

        {/* Main Line */}
        <polyline
          fill="none"
          stroke="#FA2E72"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylineStr}
          className="pointer-events-none"
        />

        {/* Data Points */}
        {pts.map((p) => {
          const isActive = p.idx === activeIdx;
          return (
            <g key={p.idx} className="cursor-pointer">
              {isActive && <circle cx={p.x} cy={p.y} r="10" className="fill-[#FA2E72]/20 pointer-events-none" />}
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? 6 : 4.5}
                className="fill-white stroke-[#FA2E72] stroke-2 pointer-events-none transition-all"
              />
              {/* Generous invisible hit area for fingers */}
              <circle
                cx={p.x}
                cy={p.y}
                r="16"
                fill="transparent"
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setActiveIdx(p.idx);
                }}
                onPointerDown={() => setActiveIdx(p.idx)}
              />
            </g>
          );
        })}

        {/* X-Axis Date Labels */}
        <text x={pts[0].x} y={H - 8} textAnchor="start" className="text-[10px] font-bold fill-slate-400">
          {formatAxisDate(pts[0].date)}
        </text>
        {midPoint && (
          <text x={midPoint.x} y={H - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">
            {formatAxisDate(midPoint.date)}
          </text>
        )}
        {pts.length > 1 && (
          <text x={pts[pts.length - 1].x} y={H - 8} textAnchor="end" className="text-[10px] font-bold fill-slate-400">
            {formatAxisDate(pts[pts.length - 1].date)}
          </text>
        )}

        {/* Tooltip */}
        {active && (
          <g className="pointer-events-none">
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" className="fill-slate-900/90" />
            <text
              x={tipX + tipW / 2}
              y={tipY + tipH / 2 + 4}
              textAnchor="middle"
              className="text-[11px] font-bold fill-white"
            >
              {tipLabel}
            </text>
          </g>
        )}
      </svg>
      <p className="hidden [@media(hover:none)]:block text-center text-[11px] font-medium text-slate-400 mt-1">
        Tap a point to see its rank and date
      </p>
    </div>
  );
}
