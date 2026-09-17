'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { UnifiedAthlete } from '@/types';
import { searchAthletes } from '@/lib/localDataService';

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
      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-lg sm:text-xl flex items-center justify-center">
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sportParam = params.get('sport');
      if (sportParam && ['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(sportParam)) {
        setActiveSport(sportParam as 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball');
      }
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeSport, activeCategory]);

  useEffect(() => {
    let isCancelled = false;

    const loadRankings = async () => {
      setLoading(true);
      try {
        const genderParam = activeCategory === 'Women' ? 'Women' : 'Men';
        const data = await searchAthletes({
          sport: activeSport,
          gender: genderParam,
          page,
          pageSize: 20,
          sortBy: 'rank',
        });
        if (!isCancelled) {
          setPlayers(data.items || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch rankings', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadRankings();

    return () => {
      isCancelled = true;
    };
  }, [activeSport, activeCategory, page]);

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
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="w-full min-h-[120px] sm:h-40 rounded-3xl overflow-hidden relative shadow-sm border border-pink-100 bg-gradient-to-r from-pink-50 via-pink-100 to-rose-50 flex items-center px-5 sm:px-10 py-5">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=2000&auto=format&fit=crop"
            alt="Sports Ranking Banner"
            fill
            sizes="100vw"
            className="object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 flex items-center gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FA2E72] rounded-full flex items-center justify-center shadow-md text-2xl sm:text-3xl text-white shrink-0">
            {getSportEmoji(activeSport)}
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-0.5 sm:mb-1">{activeSport} World Rankings</h1>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">Explore live cached rankings and detailed player statistics.</p>
          </div>
        </div>
      </div>

      {/* Sport Toggles */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {(['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const).map(sport => (
          <button
            key={sport}
            onClick={() => {
              setActiveSport(sport);
              setPage(1);
            }}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 whitespace-nowrap border cursor-pointer active:scale-95
              ${activeSport === sport 
                ? 'bg-[#FA2E72] text-white border-transparent shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <span className="text-base sm:text-lg">{getSportEmoji(sport)}</span>
            {sport}
          </button>
        ))}
      </div>

      {/* Title & Category Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-1">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="text-xl sm:text-2xl">👑</span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">{activeSport} Leaderboard</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">Top {activeSport} Rankings</p>
          </div>
        </div>
        
        <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs w-full sm:w-auto justify-center">
          {getCategoryOptions().map(cat => (
            <button
              key={cat.value}
              onClick={() => {
                setActiveCategory(cat.value as 'Men' | 'Women');
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center
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
        <div className="flex flex-col gap-2.5 sm:gap-3 mt-1">
          {players.map((player) => (
            <div key={`${player.sport}-${player.id}`} className="bg-white/90 hover:bg-white backdrop-blur-md border border-slate-100 rounded-3xl p-3 sm:p-4 flex items-center justify-between shadow-xs hover:shadow-md transition-all group active:scale-[0.99]">
              
              <div className="flex items-center gap-2.5 sm:gap-6 pl-1 sm:pl-2 min-w-0">
                {/* Rank */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold shadow-inner text-xs sm:text-sm shrink-0
                  ${player.ranking === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    player.ranking === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                    player.ranking === 3 ? 'bg-amber-700/10 text-amber-900 border border-amber-600/30' :
                    'bg-slate-100 text-slate-700'}`}
                >
                  #{player.ranking}
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
                  <h3 className="font-bold text-slate-900 text-sm sm:text-lg group-hover:text-[#FA2E72] transition-colors truncate">{player.name}</h3>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">{player.country} ({player.countryCode})</span>
                    {player.careerHighRank && (
                      <span className="hidden sm:inline text-[11px] text-slate-400 font-medium truncate">
                        • High: #{player.careerHighRank}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-8 shrink-0 pr-1 sm:pr-4">
                {/* Points / Rating */}
                <div className="flex flex-col items-end">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">
                    {player.winRate !== undefined ? 'Win %' : 'Points'}
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-base">
                    {player.winRate !== undefined ? `${player.winRate}%` : player.points}
                  </span>
                </div>
                
                {/* Action Button */}
                <Link href={`/player/${player.id}?sport=${encodeURIComponent(activeSport)}`}>
                  <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-pink-50 text-[#FA2E72] flex items-center justify-center hover:bg-[#FA2E72] hover:text-white transition-all shadow-sm cursor-pointer active:scale-90">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                  </button>
                </Link>
              </div>
              
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer active:scale-95"
          >
            ← Prev
          </button>
          <span className="text-xs font-bold text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer active:scale-95"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
