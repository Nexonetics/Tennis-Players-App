'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { UnifiedAthlete } from '@/types';
import { searchAthletes } from '@/lib/localDataService';
import { useSports, GenderType } from '@/context/SportsContext';
import { getSportEmoji, formatRank, isRanked } from '@/lib/sports';
import { AthleteImage } from '@/components/ui/AthleteImage';
import { SportPills } from '@/components/ui/SportPills';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 20;

interface RankingsResult {
  key: string;
  items: UnifiedAthlete[];
  totalPages: number;
}

function RankingRowSkeleton() {
  return (
    <div className="bg-white/90 border border-slate-100 rounded-3xl p-3 sm:p-4 flex items-center gap-3 sm:gap-6 shadow-xs animate-pulse">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 shrink-0" />
      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3.5 w-40 max-w-full rounded-full bg-slate-100" />
        <div className="h-3 w-24 rounded-full bg-slate-100" />
      </div>
      <div className="h-6 w-14 rounded-full bg-slate-100" />
    </div>
  );
}

function RankingsContent() {
  const { sport: activeSport, gender: activeCategory, setSport, setGender } = useSports();
  const isTeamSport = activeSport === 'Football' || activeSport === 'Basketball';

  // Page resets whenever sport/gender change (derived, so there's no extra fetch for the stale page).
  const filterKey = `${activeSport}|${activeCategory}`;
  const [pageChoice, setPageChoice] = useState({ filterKey, page: 1 });
  const page = pageChoice.filterKey === filterKey ? pageChoice.page : 1;

  const [result, setResult] = useState<RankingsResult | null>(null);
  const requestKey = `${filterKey}|${page}`;
  const isFetching = result?.key !== requestKey;
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    searchAthletes({ sport: activeSport, gender: activeCategory, page, pageSize: PAGE_SIZE, sortBy: 'rank' })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, items: data.items || [], totalPages: data.totalPages || 1 });
      })
      .catch((err) => {
        console.error('Failed to fetch rankings', err);
        if (!cancelled) setResult({ key: requestKey, items: [], totalPages: 1 });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, activeSport, activeCategory, page]);

  const goToPage = (next: number) => {
    const totalPages = result?.totalPages ?? 1;
    setPageChoice({ filterKey, page: Math.min(totalPages, Math.max(1, next)) });
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categoryOptions: { label: string; value: GenderType }[] =
    activeSport === 'Tennis'
      ? [
          { label: 'ATP (Men)', value: 'Men' },
          { label: 'WTA (Women)', value: 'Women' },
        ]
      : [
          { label: 'Men', value: 'Men' },
          { label: 'Women', value: 'Women' },
        ];

  const players = result?.items ?? [];

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="w-full min-h-[120px] sm:h-40 rounded-3xl overflow-hidden relative shadow-sm border border-pink-100 bg-gradient-to-r from-pink-50 via-pink-100 to-rose-50 flex items-center px-5 sm:px-10 py-5">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=2000&auto=format&fit=crop"
            alt=""
            fill
            sizes="100vw"
            preload
            className="object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 flex items-center gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FA2E72] rounded-full flex items-center justify-center shadow-md text-2xl sm:text-3xl text-white shrink-0">
            {getSportEmoji(activeSport)}
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-0.5 sm:mb-1">{activeSport} World Rankings</h1>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              Explore live cached rankings and detailed player statistics.
            </p>
          </div>
        </div>
      </div>

      {/* Sport Toggles */}
      <SportPills value={activeSport} onChange={setSport} />

      {/* Title & Category Toggles */}
      <div
        ref={listTopRef}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-1 scroll-mt-20 md:scroll-mt-4"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="text-xl sm:text-2xl" aria-hidden="true">
            👑
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              {activeSport} Leaderboard
              {isFetching && result && (
                <Loader2 className="w-4 h-4 text-[#FA2E72] animate-spin" aria-label="Updating rankings" />
              )}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">
              Top {activeSport} Rankings
            </p>
          </div>
        </div>

        <div
          className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs w-full sm:w-auto justify-center"
          role="group"
          aria-label="Category"
        >
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              type="button"
              aria-pressed={activeCategory === cat.value}
              onClick={() => setGender(cat.value)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
                activeCategory === cat.value ? 'bg-[#E02263] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column headings (desktop) */}
      {players.length > 0 && (
        // Mirrors a row's box (border + p-4 + inner pr-4 + chevron slot) so the headings line up.
        <div className="hidden lg:flex items-center justify-between px-4 border border-transparent -mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="pl-2">Rank · {isTeamSport ? 'Team' : 'Player'}</span>
          <div className="flex items-center gap-8 pr-4">
            <span className="w-20 text-right">Career High</span>
            {!isTeamSport && <span className="w-12 text-right">Age</span>}
            <span className="w-16 text-right">{players[0]?.winRate !== undefined ? 'Win %' : 'Points'}</span>
            <span className="w-10" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Player List */}
      {!result ? (
        <div className="flex flex-col gap-2.5 sm:gap-3 mt-1" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <RankingRowSkeleton key={i} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-medium">No athletes found for this category.</p>
        </div>
      ) : (
        <div
          aria-busy={isFetching}
          className={`flex flex-col gap-2.5 sm:gap-3 mt-1 transition-opacity duration-200 ${isFetching ? 'opacity-60' : ''}`}
        >
          {players.map((player) => (
            <Link
              key={`${player.sport}-${player.gender}-${player.id}-${player.ranking}`}
              href={`/player?id=${player.id}&sport=${encodeURIComponent(activeSport)}`}
              className="bg-white/90 hover:bg-white backdrop-blur-md border border-slate-100 hover:border-pink-100 rounded-3xl p-3 sm:p-4 flex items-center justify-between gap-2 shadow-xs hover:shadow-md transition-all group active:scale-[0.99] active:bg-slate-50"
            >
              <div className="flex items-center gap-2.5 sm:gap-6 pl-1 sm:pl-2 min-w-0">
                {/* Rank */}
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold shadow-inner text-xs sm:text-sm shrink-0 tabular-nums ${
                    player.ranking === 1
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : player.ranking === 2
                        ? 'bg-slate-200 text-slate-800 border border-slate-300'
                        : player.ranking === 3
                          ? 'bg-amber-700/10 text-amber-900 border border-amber-600/30'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {formatRank(player.ranking, 'UR')}
                </div>

                {/* Avatar / Photo */}
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-slate-100 flex items-center justify-center">
                  <AthleteImage
                    src={player.imageUrl}
                    alt={player.name}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                    fallbackLetter={player.name.charAt(0)}
                  />
                </div>

                {/* Details */}
                <div className="flex flex-col min-w-0 pr-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-lg group-hover:text-[#FA2E72] transition-colors truncate">
                    {player.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                      {player.country} ({player.countryCode})
                    </span>
                    {isRanked(player.careerHighRank) && (
                      <span className="hidden sm:inline lg:hidden text-[11px] text-slate-400 font-medium truncate">
                        • High: #{player.careerHighRank}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-8 shrink-0 sm:pr-4">
                {/* Extra columns on wide screens */}
                <span className="hidden lg:block w-20 text-right text-sm font-bold text-slate-600 tabular-nums">
                  {formatRank(player.careerHighRank, '—')}
                </span>
                {!isTeamSport && (
                  <span className="hidden lg:block w-12 text-right text-sm font-bold text-slate-600 tabular-nums">
                    {player.age ?? '—'}
                  </span>
                )}

                {/* Points / Rating */}
                <div className="flex flex-col items-end lg:w-16">
                  <span className="text-[10px] uppercase font-bold text-slate-400 lg:hidden">
                    {player.winRate !== undefined ? 'Win %' : 'Points'}
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base tabular-nums">
                    {player.winRate !== undefined ? `${player.winRate}%` : player.points}
                  </span>
                </div>

                {/* Action affordance — the whole row is the link */}
                <span className="hidden sm:flex w-10 h-10 rounded-full bg-pink-50 text-[#FA2E72] items-center justify-center group-hover:bg-[#FA2E72] group-hover:text-white transition-all shadow-sm">
                  <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                </span>
                <ChevronRight className="sm:hidden w-4 h-4 text-slate-300" strokeWidth={2.5} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {result && <Pagination page={page} totalPages={result.totalPages} onPageChange={goToPage} />}
    </div>
  );
}

export default function RankingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-[#FA2E72] animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Loading rankings...</span>
        </div>
      }
    >
      <RankingsContent />
    </Suspense>
  );
}
