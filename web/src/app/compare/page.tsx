'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftRight, X, Search, Loader2, TrendingUp } from 'lucide-react';
import { UnifiedAthlete, HistoryPoint } from '@/types';
import { searchAthletes, getAthleteById, getAthleteHistory } from '@/lib/localDataService';
import { useSports } from '@/context/SportsContext';
import { Sport, parseSport, formatRank, isRanked } from '@/lib/sports';
import { formatMonthYear } from '@/lib/format';
import { useElementWidth } from '@/hooks/useElementWidth';
import { useOverlay } from '@/hooks/useOverlay';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { AthleteImage } from '@/components/ui/AthleteImage';
import { SportPills } from '@/components/ui/SportPills';

type Slot = 'A' | 'B';

// Full class names (not built dynamically) so Tailwind can see them.
const SLOT_STYLES: Record<Slot, { text: string; groupHoverText: string; border: string }> = {
  A: {
    text: 'text-[#FA2E72]',
    groupHoverText: 'group-hover:text-[#FA2E72]',
    border: 'hover:border-[#FA2E72] active:border-[#FA2E72]',
  },
  B: {
    text: 'text-indigo-600',
    groupHoverText: 'group-hover:text-indigo-600',
    border: 'hover:border-indigo-600 active:border-indigo-600',
  },
};

function parseTime(date: string): number | null {
  const t = Date.parse(date);
  return Number.isNaN(t) ? null : t;
}

/**
 * Samples a career history down to `maxPoints` points spread evenly over *time*
 * (histories are often much denser in recent years), falling back to even index
 * spacing when dates can't be parsed.
 */
function sampleTimeline(history: HistoryPoint[], maxPoints: number): HistoryPoint[] {
  if (!history || history.length === 0) return [];
  if (history.length <= maxPoints) return history;

  const times = history.map((p) => parseTime(p.date));
  const first = times[0];
  const last = times[times.length - 1];
  if (times.every((t) => t !== null) && first !== null && last !== null && last > first) {
    const picked = new Set<number>();
    let cursor = 0;
    for (let i = 0; i < maxPoints; i++) {
      const target = first + ((last - first) * i) / (maxPoints - 1);
      // Histories are chronological: advance to the entry closest to the target time.
      while (cursor < history.length - 1 && Math.abs(times[cursor + 1]! - target) <= Math.abs(times[cursor]! - target)) {
        cursor++;
      }
      picked.add(cursor);
    }
    return [...picked].sort((a, b) => a - b).map((i) => history[i]);
  }

  const sampled: HistoryPoint[] = [];
  const step = (history.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(history[Math.min(history.length - 1, Math.round(i * step))]);
  }
  return sampled;
}

/** Indices whose labels fit without overlapping (keeps the most recent point's label). */
function visibleLabelIndices(xs: number[], chartPx: number, minGapPx = 30): Set<number> {
  const shown = new Set<number>();
  if (xs.length === 0) return shown;
  if (chartPx <= 0) return new Set(xs.map((_, i) => i));
  let lastPx = Infinity;
  for (let i = xs.length - 1; i >= 0; i--) {
    const px = xs[i] * chartPx;
    if (lastPx - px >= minGapPx) {
      shown.add(i);
      lastPx = px;
    }
  }
  return shown;
}

function numericPoints(points?: string): number | null {
  const n = Number(String(points ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Which side wins a stat, or null when it can't be compared / is tied. */
function better(a: number | null | undefined, b: number | null | undefined, lowerIsBetter = false): Slot | null {
  if (a === null || a === undefined || b === null || b === undefined || a === b) return null;
  return (lowerIsBetter ? a < b : a > b) ? 'A' : 'B';
}

/** Loads an athlete's ranking history; ignores responses for athletes no longer shown. */
function useAthleteHistory(athlete: UnifiedAthlete | null): HistoryPoint[] {
  const key = athlete ? `${athlete.sport}|${athlete.id}` : '';
  const [state, setState] = useState<{ key: string; points: HistoryPoint[] }>({ key: '', points: [] });

  useEffect(() => {
    if (!athlete) return;
    let cancelled = false;
    getAthleteHistory(athlete.id, athlete.sport)
      .then((points) => {
        if (!cancelled) setState({ key, points: points || [] });
      })
      .catch((err) => console.error('Failed to load ranking history', err));
    return () => {
      cancelled = true;
    };
  }, [athlete, key]);

  return state.key === key ? state.points : [];
}

interface SelectorProps {
  slot: Slot;
  player: UnifiedAthlete | null;
  onOpen: () => void;
}

function PlayerSelector({ slot, player, onOpen }: SelectorProps) {
  const styles = SLOT_STYLES[slot];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full lg:flex-1 lg:min-w-0 text-left border border-slate-200 ${styles.border} rounded-2xl lg:rounded-full p-2.5 pl-3.5 pr-4 flex items-center gap-3 transition-all shadow-xs bg-slate-50/50 hover:bg-white cursor-pointer group active:scale-[0.99]`}
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-slate-200 flex items-center justify-center">
        {player ? (
          <AthleteImage
            src={player.imageUrl}
            alt={player.name}
            width={48}
            height={48}
            className="object-cover w-full h-full"
            fallbackLetter={player.name.charAt(0)}
          />
        ) : (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-slate-900 text-xs sm:text-sm truncate ${styles.groupHoverText} transition-colors`}>
          {player?.name || `Select Player ${slot}`}
        </div>
        <div className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
          {player ? `${player.country} • ${isRanked(player.ranking) ? `Rank #${player.ranking}` : 'Unranked'}` : 'Loading…'}
        </div>
      </div>
      <span className={`text-xs ${styles.text} font-bold shrink-0`}>Change</span>
    </button>
  );
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const { sport, gender, setSport } = useSports();

  // A ?player1= link (from a profile page) only applies to the sport it was opened with:
  // IDs are not unique across sports, so it must not be re-used after switching sport.
  const [linkedPlayer] = useState(() => ({
    id: searchParams.get('player1') || '',
    sport: parseSport(searchParams.get('sport')) ?? sport,
  }));
  const player1Id = linkedPlayer.sport === sport ? linkedPlayer.id : '';

  const [selection, setSelection] = useState<{ sport: Sport; a: UnifiedAthlete | null; b: UnifiedAthlete | null }>({
    sport,
    a: null,
    b: null,
  });
  // Never show players from a previously selected sport while the new defaults load.
  const playerA = selection.sport === sport ? selection.a : null;
  const playerB = selection.sport === sport ? selection.b : null;

  const historyA = useAthleteHistory(playerA);
  const historyB = useAthleteHistory(playerB);

  const [searchSlot, setSearchSlot] = useState<Slot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const trimmedSearch = searchQuery.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 200);
  const [searchState, setSearchState] = useState<{ key: string; items: UnifiedAthlete[] }>({ key: '', items: [] });

  // Narrow charts get fewer sampled points so the rank labels don't collide.
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>();
  const maxTimelinePoints = chartWidth > 0 && chartWidth < 520 ? 6 : 12;

  const closeSearchModal = useCallback(() => {
    setSearchSlot(null);
    setSearchQuery('');
  }, []);
  useOverlay(searchSlot !== null, closeSearchModal);

  // Default match-up: the linked player (if any) vs. the best-ranked player of the same gender.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let a = player1Id ? await getAthleteById(player1Id, sport) : null;
        if (a && a.sport !== sport) a = null;
        const pool = await searchAthletes({ sport, gender: a?.gender ?? gender, pageSize: 3 });
        const items = pool.items || [];
        a = a ?? items[0] ?? null;
        const b = items.find((p) => p.id !== a?.id) ?? null;
        if (!cancelled) setSelection({ sport, a, b });
      } catch (err) {
        console.error('Failed loading default players for compare', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sport, player1Id, gender]);

  // Athlete picker search (debounced, stale responses ignored)
  const searchKey = `${sport}|${debouncedSearch}`;
  useEffect(() => {
    if (!debouncedSearch) return;
    let cancelled = false;
    searchAthletes({ sport, query: debouncedSearch, pageSize: 12 })
      .then((data) => {
        if (!cancelled) setSearchState({ key: searchKey, items: data.items || [] });
      })
      .catch((err) => console.error('Athlete search failed', err));
    return () => {
      cancelled = true;
    };
  }, [sport, debouncedSearch, searchKey]);

  const isSearching = trimmedSearch !== '' && searchState.key !== `${sport}|${trimmedSearch}`;
  const searchResults = trimmedSearch && searchState.key.startsWith(`${sport}|`) ? searchState.items : [];
  const otherSelected = searchSlot === 'A' ? playerB : playerA;

  const selectAthlete = (athlete: UnifiedAthlete) => {
    setSelection((s) => ({ ...s, sport, [searchSlot === 'A' ? 'a' : 'b']: athlete }));
    closeSearchModal();
  };

  const swapPlayers = () => setSelection((s) => ({ ...s, a: s.b, b: s.a }));

  // --- Chart geometry -------------------------------------------------------
  const timelineA = sampleTimeline(historyA, maxTimelinePoints);
  const timelineB = sampleTimeline(historyB, maxTimelinePoints);
  const hasHistory = timelineA.length > 0 || timelineB.length > 0;

  const allRanks = [...timelineA, ...timelineB].map((h) => h.ranking).filter(isRanked);
  if (playerA && isRanked(playerA.ranking)) allRanks.push(playerA.ranking);
  if (playerB && isRanked(playerB.ranking)) allRanks.push(playerB.ranking);
  const minRank = allRanks.length > 0 ? Math.min(...allRanks) : 1;
  const maxRank = allRanks.length > 0 ? Math.max(...allRanks) : 10;
  const spanRank = Math.max(1, maxRank - minRank);

  // Place points by date so both careers share one timeline (falls back to index spacing).
  const timesA = timelineA.map((p) => parseTime(p.date));
  const timesB = timelineB.map((p) => parseTime(p.date));
  const validTimes = [...timesA, ...timesB].filter((t): t is number => t !== null);
  const minT = validTimes.length ? Math.min(...validTimes) : 0;
  const maxT = validTimes.length ? Math.max(...validTimes) : 0;
  const useTimeAxis = validTimes.length === timesA.length + timesB.length && maxT > minT;

  const svgW = 800;
  const svgH = 160;
  const padX = 40;
  const padY = 25;
  const usableW = svgW - 2 * padX;
  const usableH = svgH - 2 * padY;

  const toPoints = (timeline: HistoryPoint[], times: (number | null)[]) =>
    timeline.map((pt, i) => {
      const t = times[i];
      const x =
        useTimeAxis && t !== null
          ? padX + ((t - minT) / (maxT - minT)) * usableW
          : timeline.length === 1
            ? svgW / 2
            : padX + (i / (timeline.length - 1)) * usableW;
      const rank = isRanked(pt.ranking) ? pt.ranking : maxRank;
      const y = padY + ((rank - minRank) / spanRank) * usableH;
      return { x, y, pt };
    });

  const pointsA = toPoints(timelineA, timesA);
  const pointsB = toPoints(timelineB, timesB);
  const labelsA = visibleLabelIndices(pointsA.map((p) => p.x / svgW), chartWidth);
  const labelsB = visibleLabelIndices(pointsB.map((p) => p.x / svgW), chartWidth);
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const pathA = toPath(pointsA);
  const pathB = toPath(pointsB);

  const axisLabels = useTimeAxis
    ? [minT, (minT + maxT) / 2, maxT].map((t) => formatMonthYear(new Date(t).toISOString().slice(0, 10)))
    : [];

  // --- Stats rows -----------------------------------------------------------
  const isTeamSport = sport === 'Football' || sport === 'Basketball';
  const statRows: { label: string; a: React.ReactNode; b: React.ReactNode; winner: Slot | null; emphasise?: boolean }[] =
    playerA && playerB
      ? [
          ...(!isTeamSport
            ? [
                {
                  label: 'Age',
                  a: playerA.age ? `${playerA.age} Yrs` : 'N/A',
                  b: playerB.age ? `${playerB.age} Yrs` : 'N/A',
                  winner: null,
                },
              ]
            : []),
          { label: 'Country', a: playerA.country, b: playerB.country, winner: null },
          ...(playerA.winRate !== undefined || playerB.winRate !== undefined
            ? [
                {
                  label: 'Win %',
                  a: playerA.winRate !== undefined ? `${playerA.winRate}%` : 'N/A',
                  b: playerB.winRate !== undefined ? `${playerB.winRate}%` : 'N/A',
                  winner: better(playerA.winRate, playerB.winRate),
                },
              ]
            : []),
          {
            label: 'Current Rank',
            a: formatRank(playerA.ranking),
            b: formatRank(playerB.ranking),
            winner: better(
              isRanked(playerA.ranking) ? playerA.ranking : null,
              isRanked(playerB.ranking) ? playerB.ranking : null,
              true
            ),
            emphasise: true,
          },
          {
            label: 'Career High',
            a: (
              <>
                {formatRank(playerA.careerHighRank ?? playerA.ranking)}
                {playerA.careerHighDate && (
                  <span className="text-[10px] sm:text-xs font-normal text-slate-500 ml-1 whitespace-nowrap">
                    ({formatMonthYear(playerA.careerHighDate)})
                  </span>
                )}
              </>
            ),
            b: (
              <>
                {formatRank(playerB.careerHighRank ?? playerB.ranking)}
                {playerB.careerHighDate && (
                  <span className="text-[10px] sm:text-xs font-normal text-slate-500 ml-1 whitespace-nowrap">
                    ({formatMonthYear(playerB.careerHighDate)})
                  </span>
                )}
              </>
            ),
            winner: better(playerA.careerHighRank ?? null, playerB.careerHighRank ?? null, true),
          },
          {
            label: 'Points',
            a: playerA.points ?? 'N/A',
            b: playerB.points ?? 'N/A',
            winner: better(numericPoints(playerA.points), numericPoints(playerB.points)),
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-6xl mx-auto pb-12">
      <h1 className="sr-only">Compare Athletes</h1>

      {/* Sport Selector */}
      <SportPills value={sport} onChange={setSport} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Info Panel (desktop only — on phones the selectors explain themselves) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs flex flex-col gap-4 sm:gap-5 lg:sticky lg:top-4">
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800 mb-0.5">
              <span aria-hidden="true">👤</span> Athlete Comparison
            </h3>

            <div className="flex flex-col gap-3 sm:gap-4 text-xs font-medium text-slate-600">
              <p>Select any two athletes from the cached dataset to compare their profile stats and ranking history timelines.</p>
              <div className="p-3 bg-pink-50 rounded-2xl border border-pink-100 text-[#FA2E72] font-semibold text-xs">
                💡 Tip: Click either player card to change it, or use the swap button to flip sides.
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="lg:col-span-9 flex flex-col gap-5 sm:gap-6">
          {/* Player Selectors */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4">
              <PlayerSelector slot="A" player={playerA} onOpen={() => setSearchSlot('A')} />

              <button
                type="button"
                onClick={swapPlayers}
                disabled={!playerA || !playerB}
                aria-label="Swap players"
                title="Swap players"
                className="group/swap relative flex items-center justify-center w-14 h-9 lg:w-12 lg:h-12 rounded-full text-slate-400 hover:text-[#FA2E72] hover:bg-pink-50 active:bg-pink-50 transition-colors cursor-pointer shrink-0 my-[-4px] lg:my-0 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-slate-300"
              >
                <span className="flex items-center gap-1 font-extrabold text-xs lg:text-xl lg:group-hover/swap:opacity-0 transition-opacity">
                  <span>VS</span>
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#FA2E72] lg:hidden" aria-hidden="true" />
                </span>
                <ArrowLeftRight className="hidden lg:block absolute w-5 h-5 opacity-0 group-hover/swap:opacity-100 group-focus-visible/swap:opacity-100 transition-opacity" />
              </button>

              <PlayerSelector slot="B" player={playerB} onOpen={() => setSearchSlot('B')} />
            </div>
          </div>

          {/* Comparison Stats Section */}
          {playerA && playerB && (
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-xs flex flex-col gap-5 sm:gap-6">
              <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800">
                <span aria-hidden="true">📈</span> Player Head-to-Head Comparison
              </h3>

              {/* Headers */}
              <div className="flex items-center justify-between gap-2 px-1 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-slate-200 flex items-center justify-center">
                    <AthleteImage
                      src={playerA.imageUrl}
                      alt={playerA.name}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      fallbackLetter={playerA.name.charAt(0)}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{playerA.name}</div>
                    <div className="text-[10px] font-semibold text-slate-500 truncate">{playerA.country}</div>
                  </div>
                </div>

                <div className="text-slate-300 font-bold text-xs shrink-0 px-1">VS</div>

                <div className="flex items-center gap-2 sm:gap-3 justify-end flex-1 text-right min-w-0">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{playerB.name}</div>
                    <div className="text-[10px] font-semibold text-slate-500 truncate">{playerB.country}</div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-slate-200 flex items-center justify-center">
                    <AthleteImage
                      src={playerB.imageUrl}
                      alt={playerB.name}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      fallbackLetter={playerB.name.charAt(0)}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Table — the better value in each row is highlighted */}
              <div className="flex flex-col text-xs sm:text-sm">
                <div className="bg-slate-50 rounded-xl px-3 sm:px-4 py-2 mb-2 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Summary Statistics
                </div>

                {statRows.map((row) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center py-2.5 sm:py-3 border-b border-slate-100 px-2 sm:px-4 ${
                      row.emphasise ? 'bg-pink-50/50 rounded-lg my-1' : ''
                    }`}
                  >
                    <div
                      className={`text-left font-bold truncate pr-1 tabular-nums ${
                        row.winner === 'A' ? 'text-[#FA2E72]' : 'text-slate-800'
                      }`}
                    >
                      {row.winner === 'A' && <span className="sr-only">Better: </span>}
                      {row.a}
                      {row.winner === 'A' && (
                        <span className="ml-1 text-[10px]" aria-hidden="true">
                          ▲
                        </span>
                      )}
                    </div>
                    <div className="text-center text-[11px] sm:text-xs font-semibold text-[#14b8a6] px-2">{row.label}</div>
                    <div
                      className={`text-right font-bold truncate pl-1 tabular-nums ${
                        row.winner === 'B' ? 'text-indigo-600' : 'text-slate-800'
                      }`}
                    >
                      {row.winner === 'B' && (
                        <span className="mr-1 text-[10px]" aria-hidden="true">
                          ▲
                        </span>
                      )}
                      {row.winner === 'B' && <span className="sr-only">Better: </span>}
                      {row.b}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ranking Timeline Comparison Chart */}
              <div className="mt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 px-1">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Historical Ranking Comparison
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FA2E72] shrink-0"></span> {playerA.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span> {playerB.name}
                    </span>
                  </div>
                </div>

                <div
                  ref={chartRef}
                  className="w-full bg-slate-50 rounded-2xl border border-slate-100 relative p-3 sm:p-4 flex flex-col"
                >
                  {!hasHistory ? (
                    <div className="h-40 sm:h-44 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
                      <TrendingUp className="w-8 h-8 opacity-40" />
                      Ranking history isn&apos;t available for these athletes.
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 mb-5">
                        <span>Rank #{minRank} (Top)</span>
                        <span>Higher Line = Better Rank</span>
                      </div>

                      <div className="relative w-full h-40 sm:h-44">
                        <svg
                          viewBox={`0 0 ${svgW} ${svgH}`}
                          className="w-full h-full overflow-visible pointer-events-none"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          {pathA && (
                            <path
                              d={pathA}
                              fill="none"
                              stroke="#FA2E72"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          )}
                          {pathB && (
                            <path
                              d={pathB}
                              fill="none"
                              stroke="#4F46E5"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          )}
                        </svg>

                        <div className="absolute inset-0 pointer-events-none">
                          {pointsA.map((cp, i) => (
                            // Zero-size anchor on the data point: the dot is centred on it and the label sits above,
                            // so the label's height never pushes the dot off the line.
                            <div
                              key={`a-${i}`}
                              className="absolute"
                              style={{ left: `${(cp.x / svgW) * 100}%`, top: `${(cp.y / svgH) * 100}%` }}
                            >
                              <div className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FA2E72] border-2 border-white shadow-xs"></div>
                              {labelsA.has(i) && (
                              <span className="absolute bottom-2 sm:bottom-2.5 -translate-x-1/2 text-[10px] sm:text-[9px] font-extrabold text-[#FA2E72] bg-white/90 backdrop-blur-xs px-1 rounded shadow-2xs border border-pink-100 whitespace-nowrap">
                                #{cp.pt.ranking}
                              </span>
                              )}
                            </div>
                          ))}

                          {pointsB.map((cp, i) => (
                            <div
                              key={`b-${i}`}
                              className="absolute"
                              style={{ left: `${(cp.x / svgW) * 100}%`, top: `${(cp.y / svgH) * 100}%` }}
                            >
                              <div className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4F46E5] border-2 border-white shadow-xs"></div>
                              {labelsB.has(i) && (
                              <span className="absolute top-2 sm:top-2.5 -translate-x-1/2 text-[10px] sm:text-[9px] font-extrabold text-[#4F46E5] bg-white/90 backdrop-blur-xs px-1 rounded shadow-2xs border border-indigo-100 whitespace-nowrap">
                                #{cp.pt.ranking}
                              </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shared time axis */}
                      {axisLabels.length > 0 && (
                        <div className="flex justify-between mt-6 px-[5%] text-[10px] sm:text-[11px] font-bold text-slate-400">
                          {axisLabels.map((label, i) => (
                            <span key={i} className={i === 0 ? '-translate-x-1/2' : i === 2 ? 'translate-x-1/2' : ''}>
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Athlete Search Modal — bottom sheet on phones, centered dialog from tablet up */}
      {searchSlot && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
          onClick={closeSearchModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-search-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 w-full sm:max-w-lg shadow-xl border border-slate-100 flex flex-col gap-4 h-[85dvh] sm:h-auto sm:max-h-[85vh] animate-slide-up"
          >
            {/* Grab handle */}
            <div className="sm:hidden mx-auto -mt-2 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="compare-search-title" className="font-bold text-slate-900 text-base">
                Select Athlete for Player {searchSlot}
              </h3>
              <button
                onClick={closeSearchModal}
                className="p-2 -mr-1 hover:bg-slate-100 active:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              {isSearching ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FA2E72] animate-spin" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              )}
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label={`Search ${sport} athletes`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search athlete by name..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-9.5 pr-4 text-base sm:text-sm focus:outline-none focus:border-[#FA2E72] focus:bg-white"
                autoFocus
              />
            </div>

            <div
              className={`flex-1 min-h-0 sm:flex-none sm:max-h-72 overflow-y-auto overscroll-contain flex flex-col gap-1 -mx-2 px-2 transition-opacity ${
                isSearching && searchResults.length > 0 ? 'opacity-60' : ''
              }`}
            >
              {!trimmedSearch ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Type a name to search {sport.toLowerCase()} athletes...
                </div>
              ) : searchResults.length === 0 ? (
                isSearching ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-[#FA2E72] animate-spin" />
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-slate-400">No athletes match &quot;{trimmedSearch}&quot;.</div>
                )
              ) : (
                searchResults.map((athlete) => {
                  const isOther = otherSelected?.id === athlete.id;
                  return (
                    <button
                      type="button"
                      key={athlete.id}
                      disabled={isOther}
                      onClick={() => selectAthlete(athlete)}
                      className="w-full text-left p-3 rounded-2xl hover:bg-pink-50 active:bg-pink-50 flex items-center justify-between cursor-pointer transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                          <AthleteImage
                            src={athlete.imageUrl}
                            alt={athlete.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            fallbackLetter={athlete.name.charAt(0)}
                            fallbackClassName="text-sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate">{athlete.name}</div>
                          <div className="text-xs text-slate-400 truncate">
                            {athlete.country}
                            {!isTeamSport && athlete.gender ? ` • ${athlete.gender}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#FA2E72] shrink-0 pl-2">
                        {isOther ? 'Already selected' : isRanked(athlete.ranking) ? `Rank #${athlete.ranking}` : 'Unranked'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-[#FA2E72] animate-spin" />
          <span className="text-xs text-slate-400">Loading compare tool...</span>
        </div>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}
