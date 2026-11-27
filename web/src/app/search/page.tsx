'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, MapPin, BarChart3, Loader2, ArrowUpDown, X, SearchX, ChevronDown } from 'lucide-react';
import { UnifiedAthlete } from '@/types';
import { getUniqueCountries, searchAthletes } from '@/lib/localDataService';
import { useSports } from '@/context/SportsContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { isRanked } from '@/lib/sports';
import { AthleteImage } from '@/components/ui/AthleteImage';
import { SportPills } from '@/components/ui/SportPills';
import { Pagination } from '@/components/ui/Pagination';

type SortOption = 'rank' | 'points' | 'name';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rank', label: 'Rank' },
  { value: 'points', label: 'Win Rate / Rating' },
  { value: 'name', label: 'Name A-Z' },
];

const RANK_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: 'All Ranks' },
  { label: 'Top 10', min: 1, max: 10 },
  { label: '11 - 50', min: 11, max: 50 },
  { label: '51 - 100', min: 51, max: 100 },
  { label: '100+', min: 101 },
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

interface SearchResult {
  /** Which request these results belong to — lets us keep showing old results while new ones load. */
  key: string;
  items: UnifiedAthlete[];
  total: number;
  totalPages: number;
}

const selectClassName =
  'w-full bg-white border border-slate-200 hover:border-slate-300 rounded-full py-2.5 pl-8.5 pr-7 sm:pl-9.5 sm:pr-8 text-base sm:text-sm text-slate-700 focus:outline-none focus:border-[#FA2E72] focus:ring-1 focus:ring-[#FA2E72] appearance-none shadow-xs font-medium cursor-pointer truncate transition-colors';

function ResultCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-100 shadow-xs flex flex-col items-center gap-2.5 animate-pulse">
      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-slate-100" />
      <div className="h-3.5 w-3/4 rounded-full bg-slate-100" />
      <div className="h-3 w-1/2 rounded-full bg-slate-100" />
      <div className="h-5 w-1/3 rounded-full bg-slate-100 mt-1" />
      <div className="h-8 w-full rounded-full bg-slate-50 mt-2" />
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const { sport, gender, setSport, setGender } = useSports();

  // The text box follows ?q= whenever it changes (e.g. the header search is used while already here).
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery);
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery);
    setSearchQuery(urlQuery);
  }

  // Each sport has its own country list, so the country choice resets with the sport.
  const [countryChoice, setCountryChoice] = useState({ sport, value: 'All' });
  const selectedCountry = countryChoice.sport === sport ? countryChoice.value : 'All';

  const [rankRange, setRankRange] = useState(RANK_RANGES[0].label);
  const [sortBy, setSortBy] = useState<SortOption>('rank');

  // Only search once typing pauses — avoids a reload (and flicker) on every keystroke.
  const trimmedQuery = searchQuery.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  // Any filter change sends you back to page 1.
  const filterKey = JSON.stringify([sport, gender, debouncedQuery, selectedCountry, rankRange, sortBy]);
  const [pageChoice, setPageChoice] = useState({ filterKey, page: 1 });
  const page = pageChoice.filterKey === filterKey ? pageChoice.page : 1;

  const [countries, setCountries] = useState<string[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);

  const requestKey = `${filterKey}|${page}`;
  const isFetching = result?.key !== requestKey;
  const isPending = isFetching || trimmedQuery !== debouncedQuery;

  useEffect(() => {
    let cancelled = false;
    getUniqueCountries(sport)
      .then((list) => {
        if (!cancelled) setCountries(list || []);
      })
      .catch((err) => console.error('Failed to load countries', err));
    return () => {
      cancelled = true;
    };
  }, [sport]);

  useEffect(() => {
    let cancelled = false;
    const range = RANK_RANGES.find((r) => r.label === rankRange) ?? RANK_RANGES[0];

    searchAthletes({
      sport,
      gender,
      query: debouncedQuery,
      country: selectedCountry === 'All' ? '' : selectedCountry,
      minRank: range.min,
      maxRank: range.max,
      sortBy,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        // Ignore responses for filters the user has already moved on from.
        if (!cancelled) {
          setResult({ key: requestKey, items: data.items || [], total: data.total || 0, totalPages: data.totalPages || 1 });
        }
      })
      .catch((err) => {
        console.error('Failed to search players', err);
        if (!cancelled) setResult({ key: requestKey, items: [], total: 0, totalPages: 1 });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sport, gender, debouncedQuery, selectedCountry, rankRange, sortBy, page]);

  const goToPage = (next: number) => {
    const totalPages = result?.totalPages ?? 1;
    setPageChoice({ filterKey, page: Math.min(totalPages, Math.max(1, next)) });
    resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasActiveFilters = trimmedQuery !== '' || selectedCountry !== 'All' || rankRange !== RANK_RANGES[0].label;

  const clearFilters = () => {
    setSearchQuery('');
    setCountryChoice({ sport, value: 'All' });
    setRankRange(RANK_RANGES[0].label);
    if (urlQuery) {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const players = result?.items ?? [];
  const totalCount = result?.total ?? 0;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-6xl mx-auto pb-12">
      <h1 className="sr-only">Search Athletes</h1>

      {/* Sport Selector */}
      <SportPills value={sport} onChange={setSport} />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 bg-white/80 p-3 sm:p-3.5 rounded-3xl border border-slate-200 shadow-xs backdrop-blur-sm">
        {/* Gender Toggle */}
        <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200 shrink-0 justify-center" role="group" aria-label="Gender">
          {(['Men', 'Women'] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gender === g}
              onClick={() => setGender(g)}
              className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                gender === g ? 'bg-[#FA2E72] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {g === 'Men' ? '♂ Men' : '♀ Women'}
            </button>
          ))}
        </div>

        {/* Text Search Input */}
        <div className="flex-1 relative min-w-0 sm:min-w-56">
          {isPending && trimmedQuery !== debouncedQuery ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FA2E72] animate-spin" />
          ) : (
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, country, or rank..."
            aria-label="Search athletes"
            enterKeyHint="search"
            autoComplete="off"
            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-full py-2.5 pl-9.5 pr-10 text-base sm:text-sm focus:outline-none focus:border-[#FA2E72] focus:ring-1 focus:ring-[#FA2E72] shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search text"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Country & Rank Range Dropdowns (2-up grid on phones) */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          <div className="relative w-full sm:w-44 shrink-0">
            <MapPin className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedCountry}
              onChange={(e) => setCountryChoice({ sport, value: e.target.value })}
              aria-label="Filter by country"
              className={selectClassName}
            >
              <option value="All">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative w-full sm:w-40 shrink-0">
            <BarChart3 className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={rankRange}
              onChange={(e) => setRankRange(e.target.value)}
              aria-label="Filter by rank range"
              className={selectClassName}
            >
              {RANK_RANGES.map((r) => (
                <option key={r.label} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div
        ref={resultsTopRef}
        className="flex items-center justify-between gap-3 mt-1 border-b border-slate-200 pb-2 scroll-mt-20 md:scroll-mt-4"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-800 min-w-0 truncate" aria-live="polite">
            {result ? (
              <>
                Found <span className="text-[#FA2E72] tabular-nums">{totalCount.toLocaleString()}</span>{' '}
                {totalCount === 1 ? 'Athlete' : 'Athletes'}
              </>
            ) : (
              'Searching…'
            )}
          </h2>
          {isPending && result && <Loader2 className="w-4 h-4 text-[#FA2E72] animate-spin shrink-0" aria-label="Updating results" />}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-slate-500 hover:text-[#FA2E72] hover:bg-pink-50 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 font-medium shrink-0">
          <ArrowUpDown className="sm:hidden w-4 h-4 text-slate-400" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="max-w-[8.5rem] sm:max-w-none bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 sm:py-1 font-semibold focus:outline-none focus:border-[#FA2E72] cursor-pointer text-base sm:text-sm truncate transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Grid of Players */}
      {!result ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5" aria-busy="true">
          {Array.from({ length: 10 }, (_, i) => (
            <ResultCardSkeleton key={i} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div
          className={`bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200 shadow-xs flex flex-col items-center gap-3 transition-opacity ${
            isPending ? 'opacity-60' : ''
          }`}
        >
          <SearchX className="w-10 h-10 text-slate-300" />
          <p className="text-slate-600 font-semibold">No players match your search.</p>
          <p className="text-slate-400 text-sm">
            Try a different spelling, another country, or a wider rank range.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-1 px-5 py-2.5 rounded-full bg-[#FA2E72] hover:bg-[#E02263] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer active:scale-95"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div
          aria-busy={isPending}
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 transition-opacity duration-200 ${
            isPending ? 'opacity-60' : ''
          }`}
        >
          {players.map((player) => (
            <Link
              key={`${player.sport}-${player.id}`}
              href={`/player?id=${player.id}&sport=${encodeURIComponent(sport)}`}
              className="bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-pink-100 transition-all relative flex flex-col items-center text-center group active:scale-[0.98] active:bg-slate-50"
            >
              {/* Rank Badge */}
              {isRanked(player.ranking) ? (
                <div className="absolute -top-2 -left-2 min-w-7 h-7 sm:min-w-8 sm:h-8 px-1.5 bg-amber-100 text-amber-800 font-bold text-[11px] sm:text-xs rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  #{player.ranking}
                </div>
              ) : (
                <div className="absolute -top-2 -left-2 px-2 h-6 sm:h-7 bg-slate-100 text-slate-500 font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  Unranked
                </div>
              )}

              {/* Avatar */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-2.5 sm:mb-3 shadow-sm border-2 sm:border-4 border-slate-50 shrink-0 bg-slate-100 flex items-center justify-center">
                <AthleteImage
                  src={player.imageUrl}
                  alt={player.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  fallbackLetter={player.name.charAt(0)}
                  fallbackClassName="text-xl sm:text-2xl"
                />
              </div>

              {/* Details */}
              <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-0.5 truncate w-full group-hover:text-[#FA2E72] transition-colors">
                {player.name}
              </h3>
              <div className="flex items-center gap-1 mb-2 max-w-full">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                  {player.country} ({player.countryCode})
                </span>
              </div>

              {/* Stats */}
              <div className="mb-3 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  {player.winRate !== undefined ? 'Win Rate' : 'Rank Points'}
                </span>
                <span className="font-extrabold text-[#FA2E72] text-sm tabular-nums">
                  {player.winRate !== undefined ? `${player.winRate}%` : player.points}
                </span>
              </div>

              {/* Action affordance — the whole card is the link */}
              <span className="w-full mt-auto py-2 bg-pink-50 group-hover:bg-[#FA2E72] text-[#FA2E72] group-hover:text-white rounded-full text-xs font-bold transition-all shadow-xs">
                View Profile →
              </span>
            </Link>
          ))}
        </div>
      )}

      {result && <Pagination page={page} totalPages={result.totalPages} onPageChange={goToPage} />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-[#FA2E72] animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Loading search engine...</span>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
