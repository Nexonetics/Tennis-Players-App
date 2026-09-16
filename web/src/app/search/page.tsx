'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search as SearchIcon, MapPin, BarChart3, Loader2 } from 'lucide-react';
import { UnifiedAthlete } from '@/types';
import { getUniqueCountries, searchAthletes } from '@/lib/localDataService';

// Safe Athlete Image component with onError fallback
const AthleteImage = ({ src, alt, width, height, className, fallbackLetter }: {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackLetter: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-2xl flex items-center justify-center">
        {fallbackLetter}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export default function SearchPage() {
  const [sport, setSport] = useState<'Tennis' | 'Table Tennis' | 'Football' | 'Basketball'>('Tennis');
  const [gender, setGender] = useState<'Men' | 'Women'>('Men');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [rankRange, setRankRange] = useState('All');
  const [sortBy, setSortBy] = useState<'rank' | 'points' | 'name'>('rank');

  const [countries, setCountries] = useState<string[]>([]);
  const [players, setPlayers] = useState<UnifiedAthlete[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch unique countries for dropdown
  useEffect(() => {
    async function fetchCountries() {
      try {
        const countryList = await getUniqueCountries(sport);
        setCountries(countryList || []);
      } catch (err) {
        console.error('Failed to load countries', err);
      }
    }
    fetchCountries();
  }, [sport]);

  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      let minRank: number | undefined;
      let maxRank: number | undefined;

      if (rankRange === 'Top 10') {
        minRank = 1;
        maxRank = 10;
      } else if (rankRange === '11 - 50') {
        minRank = 11;
        maxRank = 50;
      } else if (rankRange === '51 - 100') {
        minRank = 51;
        maxRank = 100;
      } else if (rankRange === '100+') {
        minRank = 101;
      }

      const country = selectedCountry === 'All' || selectedCountry === 'Country' ? '' : selectedCountry;

      const data = await searchAthletes({
        sport,
        gender,
        query: searchQuery,
        country,
        minRank,
        maxRank,
        sortBy: sortBy as 'rank' | 'points' | 'name',
        page,
        pageSize: 20,
      });

      setPlayers(data.items || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to search players', err);
    } finally {
      setLoading(false);
    }
  }, [sport, gender, searchQuery, selectedCountry, rankRange, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [sport, gender, selectedCountry, rankRange, sortBy]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const getSportEmoji = (s: string) => {
    switch (s) {
      case 'Tennis': return '🎾';
      case 'Table Tennis': return '🏓';
      case 'Football': return '⚽';
      case 'Basketball': return '🏀';
      default: return '🏆';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="w-full h-44 rounded-3xl overflow-hidden relative shadow-sm border border-blue-900 bg-[#0A2342] flex items-center px-10">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=2000&auto=format&fit=crop"
            alt="Search Banner"
            fill
            sizes="100vw"
            className="object-cover opacity-40 mix-blend-overlay"
          />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-md text-white text-3xl">
            {getSportEmoji(sport)}
          </div>
          <div>
            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-[10px] font-bold uppercase tracking-widest mb-2 border border-white/10">
              Local Data Explorer
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              Find Your Favorite <span className="text-[#FA2E72]">Athletes</span>
            </h1>
            <p className="text-blue-100 text-sm font-medium">Search and filter across {totalCount > 0 ? totalCount.toLocaleString() : 'thousands of'} real cached sports profiles.</p>
          </div>
        </div>
      </div>

      {/* Sport Selector Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {(['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer whitespace-nowrap
              ${sport === s ? 'bg-[#FA2E72] text-white border-transparent shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <span>{getSportEmoji(s)}</span>
            {s}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white/80 p-3 rounded-3xl border border-slate-200 shadow-xs backdrop-blur-sm">
        {/* Gender Toggle */}
        <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200 shrink-0">
          <button
            onClick={() => setGender('Men')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              gender === 'Men' ? 'bg-[#FA2E72] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            ♂ Men
          </button>
          <button
            onClick={() => setGender('Women')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              gender === 'Women' ? 'bg-[#FA2E72] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            ♀ Women
          </button>
        </div>

        {/* Text Search Input */}
        <div className="flex-1 relative min-w-[200px]">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by athlete name, country, or rank..."
            className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:border-[#FA2E72] focus:ring-1 focus:ring-[#FA2E72] shadow-xs"
          />
        </div>

        {/* Country Dropdown */}
        <div className="relative w-36 sm:w-44 shrink-0">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-8 text-xs sm:text-sm text-slate-700 focus:outline-none appearance-none shadow-xs font-medium cursor-pointer"
          >
            <option value="All">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
        </div>

        {/* Rank Range Dropdown */}
        <div className="relative w-36 sm:w-40 shrink-0">
          <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={rankRange}
            onChange={(e) => setRankRange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-8 text-xs sm:text-sm text-slate-700 focus:outline-none appearance-none shadow-xs font-medium cursor-pointer"
          >
            <option value="All">All Ranks</option>
            <option value="Top 10">Top 10</option>
            <option value="11 - 50">11 - 50</option>
            <option value="51 - 100">51 - 100</option>
            <option value="100+">100+</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mt-2 border-b border-slate-200 pb-2">
        <h2 className="text-xl font-bold text-slate-800">
          Found <span className="text-[#FA2E72]">{totalCount.toLocaleString()}</span> Athletes
        </h2>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="rank">Rank</option>
            <option value="points">Win Rate / Rating</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Grid of Players */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-[#FA2E72] animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Searching data files...</span>
        </div>
      ) : players.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-medium">No players match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all relative flex flex-col items-center text-center group"
            >
              {/* Rank Badge */}
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-amber-100 text-amber-800 font-bold text-xs rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                #{player.ranking}
              </div>

              {/* Avatar */}
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 shadow-sm border-4 border-slate-50 shrink-0 bg-slate-100 flex items-center justify-center">
                <AthleteImage
                  src={player.imageUrl}
                  alt={player.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  fallbackLetter={player.name.charAt(0)}
                />
              </div>

              {/* Details */}
              <h3 className="font-bold text-slate-900 text-base mb-1 truncate w-full group-hover:text-[#FA2E72] transition-colors">
                {player.name}
              </h3>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs font-semibold text-slate-500">
                  {player.country} ({player.countryCode})
                </span>
              </div>

              {/* Stats */}
              <div className="mb-4 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  {player.winRate !== undefined ? 'Win Percentage' : 'Rank Points'}
                </span>
                <span className="font-extrabold text-[#FA2E72] text-sm">
                  {player.winRate !== undefined ? `${player.winRate}%` : player.points}
                </span>
              </div>

              {/* Action */}
              <Link href={`/player/${player.id}?sport=${encodeURIComponent(sport)}`} className="w-full mt-auto">
                <button className="w-full py-2 bg-pink-50 hover:bg-[#FA2E72] text-[#FA2E72] hover:text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs">
                  View Profile →
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            ← Previous
          </button>
          <span className="text-xs font-bold text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
