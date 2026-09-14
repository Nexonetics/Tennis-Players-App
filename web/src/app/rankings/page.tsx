'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { UnifiedAthlete } from '@/types';

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
      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-xl flex items-center justify-center">
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

export default function RankingsPage() {
  const [activeSport, setActiveSport] = useState<'Tennis' | 'Table Tennis' | 'Football' | 'Basketball'>('Tennis');
  const [activeCategory, setActiveCategory] = useState<'Men' | 'Women'>('Men');
  const [players, setPlayers] = useState<UnifiedAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const genderParam = activeCategory === 'Women' ? 'Women' : 'Men';
      const res = await fetch(
        `/api/players?sport=${encodeURIComponent(activeSport)}&gender=${genderParam}&page=${page}&pageSize=20&sortBy=rank`
      );
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.items || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch rankings', err);
    } finally {
      setLoading(false);
    }
  }, [activeSport, activeCategory, page]);

  useEffect(() => {
    setPage(1);
  }, [activeSport, activeCategory]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const getSportEmoji = (sport: string) => {
    switch (sport) {
      case 'Tennis': return '🎾';
      case 'Table Tennis': return '🏓';
      case 'Football': return '⚽';
      case 'Basketball': return '🏀';
      default: return '🏆';
    }
  };

  const getCategoryOptions = () => {
    if (activeSport === 'Tennis') {
      return [
        { label: 'ATP (Men)', value: 'Men' },
        { label: 'WTA (Women)', value: 'Women' }
      ];
    }
    return [
      { label: 'Men', value: 'Men' },
      { label: 'Women', value: 'Women' }
    ];
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="w-full h-40 rounded-3xl overflow-hidden relative shadow-sm border border-pink-100 bg-gradient-to-r from-pink-50 via-pink-100 to-rose-50 flex items-center px-10">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=2000&auto=format&fit=crop"
            alt="Sports Ranking Banner"
            fill
            sizes="100vw"
            className="object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-[#FA2E72] rounded-full flex items-center justify-center shadow-md text-3xl text-white">
            {getSportEmoji(activeSport)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">{activeSport} World Rankings</h1>
            <p className="text-slate-600 text-sm font-medium">Explore live cached rankings and detailed player statistics.</p>
          </div>
        </div>
      </div>

      {/* Sport Toggles */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {(['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const).map(sport => (
          <button
            key={sport}
            onClick={() => setActiveSport(sport)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-xs flex items-center gap-2 whitespace-nowrap border cursor-pointer
              ${activeSport === sport 
                ? 'bg-[#FA2E72] text-white border-transparent shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <span className="text-lg">{getSportEmoji(sport)}</span>
            {sport}
          </button>
        ))}
      </div>

      {/* Title & Category Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👑</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{activeSport} Leaderboard</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Top {activeSport} Rankings</p>
          </div>
        </div>
        
        <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs">
          {getCategoryOptions().map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value as 'Men' | 'Women')}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer
                ${activeCategory === cat.value 
                  ? 'bg-[#E02263] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-[#FA2E72] animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Loading rankings data...</span>
        </div>
      ) : players.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-medium">No athletes found for this category.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-2">
          {players.map((player) => (
            <div key={player.id} className="bg-white/80 hover:bg-white backdrop-blur-md border border-slate-100 rounded-3xl p-4 flex items-center justify-between shadow-xs hover:shadow-md transition-all group">
              
              <div className="flex items-center gap-4 sm:gap-6 pl-2">
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner text-sm shrink-0
                  ${player.ranking === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    player.ranking === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                    player.ranking === 3 ? 'bg-amber-700/10 text-amber-900 border border-amber-600/30' :
                    'bg-slate-100 text-slate-700'}`}
                >
                  #{player.ranking}
                </div>
                
                {/* Avatar / Photo */}
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-slate-100 flex items-center justify-center">
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
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-[#FA2E72] transition-colors">{player.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-slate-500">{player.country} ({player.countryCode})</span>
                    {player.careerHighRank && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        • Career High: #{player.careerHighRank}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 pr-2 sm:pr-4">
                {/* Points / Rating */}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {player.winRate !== undefined ? 'Win %' : 'Points'}
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {player.winRate !== undefined ? `${player.winRate}%` : player.points}
                  </span>
                </div>
                
                {/* Action Button */}
                <Link href={`/player/${player.id}?sport=${encodeURIComponent(activeSport)}`}>
                  <button className="w-10 h-10 rounded-full bg-pink-50 text-[#FA2E72] flex items-center justify-center hover:bg-[#FA2E72] hover:text-white transition-all shadow-sm cursor-pointer">
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </button>
                </Link>
              </div>
              
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
