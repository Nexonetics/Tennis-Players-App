'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, Menu, X, Loader2, ArrowRight } from 'lucide-react';
import { currentUser } from '@/data/dummyData';
import { SportsSearchLogo } from '../ui/SportsSearchLogo';
import { UnifiedAthlete } from '@/types';
import { searchAllAthletes } from '@/lib/localDataService';

interface HeaderProps {
  onOpenDrawer?: () => void;
}

// Fallback athlete avatar component
const AthleteSearchResultAvatar = ({
  src,
  alt,
  fallbackLetter,
}: {
  src?: string;
  alt: string;
  fallbackLetter: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
        {fallbackLetter}
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
      <Image
        src={src}
        alt={alt}
        width={32}
        height={32}
        className="object-cover w-full h-full"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedAthlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Perform search with debounce
  const fetchSearchResults = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchAllAthletes(trimmed, 7);
      setResults(data);
    } catch (err) {
      console.error('Header search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchSearchResults(query);
      } else {
        setResults([]);
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, fetchSearchResults]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAthlete = (athlete: UnifiedAthlete) => {
    setIsOpen(false);
    router.push(`/player?id=${athlete.id}&sport=${encodeURIComponent(athlete.sport)}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < results.length) {
      handleSelectAthlete(results[selectedIndex]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      handleSearchSubmit(e);
    }
  };

  const getSportEmoji = (sport: string) => {
    switch (sport) {
      case 'Tennis':
        return '🎾';
      case 'Table Tennis':
        return '🏓';
      case 'Football':
        return '⚽';
      case 'Basketball':
        return '🏀';
      default:
        return '🏆';
    }
  };

  return (
    <header className="w-full flex items-center justify-between gap-3 sm:gap-6 py-3 px-4 sm:px-6 md:px-8 bg-transparent relative z-30">
      {/* Mobile Menu & Logo Header (Visible on Mobile) */}
      <div className="flex items-center gap-2 md:hidden shrink-0">
        {onOpenDrawer && (
          <button
            onClick={onOpenDrawer}
            className="p-2 text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Open Drawer"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
          </button>
        )}
        <Link href="/" className="shrink-0">
          <SportsSearchLogo className="scale-90 origin-left" />
        </Link>
      </div>

      {/* Global Interactive Search Bar */}
      <div ref={containerRef} className="relative flex-1 max-w-xl">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {loading ? (
              <Loader2 className="h-4 w-4 text-[#FA2E72] animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-slate-400" strokeWidth={2} />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search players, tournaments, sports..."
            className="w-full pl-9.5 sm:pl-11 pr-8 sm:pr-10 py-2 sm:py-2.5 bg-[#F1F5F9]/80 hover:bg-[#F1F5F9] focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-full border border-slate-200/70 focus:outline-hidden focus:border-[#FA2E72]/50 focus:ring-2 focus:ring-[#FA2E72]/15 transition-all shadow-2xs font-medium"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Real-time Search Results Popover */}
        {isOpen && query.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {loading && results.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-[#FA2E72] animate-spin" />
                Searching all sports data...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs font-semibold text-slate-600">No matching athletes or teams found.</p>
                <button
                  onClick={() => handleSearchSubmit()}
                  className="mt-2 text-xs font-bold text-[#FA2E72] hover:underline cursor-pointer"
                >
                  Search on full Search page →
                </button>
              </div>
            ) : (
              <div>
                <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Quick Results
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    Use ↑↓ keys, Enter to navigate
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {results.map((player, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={`${player.sport}-${player.id}`}
                        onClick={() => handleSelectAthlete(player)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`p-2.5 sm:px-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-pink-50/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AthleteSearchResultAvatar
                            src={player.imageUrl}
                            alt={player.name}
                            fallbackLetter={player.name.charAt(0)}
                          />

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {player.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-semibold text-slate-600 border border-slate-200/60 shrink-0">
                                {getSportEmoji(player.sport)} {player.sport}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 truncate">
                              {player.country} ({player.countryCode}) • Rank #{player.ranking}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          <span className="text-[11px] font-extrabold text-[#FA2E72]">
                            {player.winRate !== undefined ? `${player.winRate}%` : player.points}
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-[#FA2E72] translate-x-0.5' : 'text-slate-300'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleSearchSubmit()}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-pink-50 border-t border-slate-100 text-xs font-bold text-[#FA2E72] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  View all results for &quot;{query}&quot;
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side controls (Notifications & User Profile) */}
      <div className="flex items-center gap-2 sm:gap-5 shrink-0">
        {/* Notification Bell with Badge */}
        <button
          className="relative p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" strokeWidth={1.9} />
          {currentUser.notificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-[#FA2E72] rounded-full border-2 border-white shadow-xs">
              {currentUser.notificationsCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#C2185B] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
            {currentUser.avatarLetter}
          </div>
          <span className="hidden sm:inline text-sm font-semibold text-slate-800 group-hover:text-slate-950">
            {currentUser.name}
          </span>
          <ChevronDown className="hidden sm:inline w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
        </div>
      </div>
    </header>
  );
};

