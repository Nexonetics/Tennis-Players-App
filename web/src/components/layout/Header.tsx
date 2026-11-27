'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Trophy,
  ArrowLeftRight,
  SlidersHorizontal,
  BadgeDollarSign,
} from 'lucide-react';
import { SportsSearchLogo } from '../ui/SportsSearchLogo';
import { UnifiedAthlete } from '@/types';
import { searchAllAthletes } from '@/lib/localDataService';
import { useOverlay } from '@/hooks/useOverlay';
import { getSportEmoji } from '@/lib/sports';

// Fallback athlete avatar component
const AthleteSearchResultAvatar = ({
  src,
  alt,
  fallbackLetter,
  size = 32,
}: {
  src?: string;
  alt: string;
  fallbackLetter: string;
  size?: number;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0"
      >
        {fallbackLetter}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center"
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

const SearchResultRow = ({
  player,
  isSelected,
  onSelect,
  onHover,
  touch = false,
}: {
  player: UnifiedAthlete;
  isSelected: boolean;
  onSelect: () => void;
  onHover?: () => void;
  touch?: boolean;
}) => (
  <button
    type="button"
    onClick={onSelect}
    onMouseEnter={onHover}
    className={`w-full text-left flex items-center justify-between cursor-pointer transition-colors ${
      touch ? 'px-4 py-3 active:bg-pink-50' : 'p-2.5 sm:px-3.5'
    } ${isSelected ? 'bg-pink-50/90' : 'hover:bg-slate-50'}`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <AthleteSearchResultAvatar
        src={player.imageUrl}
        alt={player.name}
        fallbackLetter={player.name.charAt(0)}
        size={touch ? 40 : 32}
      />

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-slate-900 text-sm truncate">{player.name}</span>
          <span className="text-[10px] px-1.5 rounded-full bg-slate-100 font-semibold text-slate-600 border border-slate-200/60 shrink-0">
            {getSportEmoji(player.sport)}
            <span className={touch ? 'sr-only' : ''}> {player.sport}</span>
          </span>
        </div>
        <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
          {player.country} ({player.countryCode}) •{' '}
          {player.ranking && player.ranking < 9999 ? `Rank #${player.ranking}` : 'Unranked'}
        </span>
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0 pl-2">
      <span className="text-[11px] font-extrabold text-[#FA2E72]">
        {player.winRate !== undefined ? `${player.winRate}%` : player.points}
      </span>
      <ArrowRight
        className={`w-3.5 h-3.5 transition-transform ${
          isSelected ? 'text-[#FA2E72] translate-x-0.5' : 'text-slate-300'
        }`}
      />
    </div>
  </button>
);

const quickLinks = [
  { label: 'World Rankings', href: '/rankings', icon: Trophy },
  { label: 'Advanced Search', href: '/search', icon: SlidersHorizontal },
  { label: 'Compare Players', href: '/compare', icon: ArrowLeftRight },
  { label: 'College Basketball Odds', href: '/college-basketball', icon: BadgeDollarSign },
];

interface MobileSearchOverlayProps {
  query: string;
  results: UnifiedAthlete[];
  loading: boolean;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onSelect: (athlete: UnifiedAthlete) => void;
  onSubmit: (e?: React.FormEvent) => void;
}

// Full-screen search experience for phones, rendered into <body> so the
// header's backdrop-filter doesn't trap its fixed positioning.
const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
  query,
  results,
  loading,
  onQueryChange,
  onClose,
  onSelect,
  onSubmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useOverlay(true, onClose);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasQuery = query.trim() !== '';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search athletes and teams"
      className="fixed inset-0 z-[60] md:hidden bg-white flex flex-col animate-fade-in"
    >
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 px-3 pt-[calc(0.625rem+env(safe-area-inset-top))] pb-2.5 border-b border-slate-100"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="p-2.5 rounded-full text-slate-600 active:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {loading ? (
              <Loader2 className="h-4 w-4 text-[#FA2E72] animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-slate-400" strokeWidth={2} />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search players & teams"
            className="w-full pl-10 pr-10 py-2.5 bg-slate-100 focus:bg-white text-base text-slate-800 placeholder-slate-400 rounded-full border border-transparent focus:border-[#FA2E72]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FA2E72]/15 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                onQueryChange('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3.5 pl-2 flex items-center text-slate-400 active:text-slate-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
        {!hasQuery ? (
          <div className="p-4 flex flex-col gap-5">
            <p className="text-sm text-slate-500 font-medium px-1">
              Search across Tennis, Table Tennis, Football and Basketball.
            </p>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Browse</span>
              {quickLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl active:bg-slate-50 text-sm font-semibold text-slate-700"
                >
                  <span className="w-9 h-9 rounded-full bg-[#FDF2F4] text-[#FA2E72] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  {label}
                  <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        ) : loading && results.length === 0 ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-[#FA2E72] animate-spin" />
            Searching all sports data...
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-semibold text-slate-600">No matching athletes or teams found.</p>
            <button
              onClick={() => onSubmit()}
              className="mt-3 text-sm font-bold text-[#FA2E72] cursor-pointer"
            >
              Try the full Search page →
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 pt-3 pb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Quick Results
            </div>
            <div className="divide-y divide-slate-100">
              {results.map((player) => (
                <SearchResultRow
                  key={`${player.sport}-${player.id}`}
                  player={player}
                  isSelected={false}
                  onSelect={() => onSelect(player)}
                  touch
                />
              ))}
            </div>
            <div className="p-4">
              <button
                onClick={() => onSubmit()}
                className="w-full py-3 px-4 rounded-full bg-[#FDF2F4] active:bg-pink-100 text-sm font-bold text-[#FA2E72] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="truncate">View all results for &quot;{query.trim()}&quot;</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export const Header: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedAthlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" or Cmd/Ctrl+K focuses search from anywhere
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!isCmdK && (e.key !== '/' || isTyping)) return;

      e.preventDefault();
      if (window.matchMedia('(min-width: 768px)').matches) {
        desktopInputRef.current?.focus();
        desktopInputRef.current?.select();
      } else {
        setIsMobileSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

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

  const closeMobileSearch = useCallback(() => setIsMobileSearchOpen(false), []);

  const handleSelectAthlete = (athlete: UnifiedAthlete) => {
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    router.push(`/player?id=${athlete.id}&sport=${encodeURIComponent(athlete.sport)}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isMobileSearchOpen && selectedIndex >= 0 && selectedIndex < results.length) {
      handleSelectAthlete(results[selectedIndex]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed) {
      setIsOpen(false);
      setIsMobileSearchOpen(false);
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
      e.currentTarget.blur();
    } else if (e.key === 'Enter') {
      handleSearchSubmit(e);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#F8FAFC]/85 backdrop-blur-lg border-b border-slate-200/60 pt-[env(safe-area-inset-top)] md:relative md:bg-transparent md:backdrop-blur-none md:border-0 md:pt-0 px-4 sm:px-6 md:px-8">
      <div className="flex items-center justify-between gap-3 sm:gap-6 py-2 md:py-3 w-full max-w-6xl mx-auto">
        {/* Mobile logo */}
        <Link href="/" className="md:hidden shrink-0" aria-label="SportsSearch home">
          <SportsSearchLogo size="sm" />
        </Link>

        {/* Global Interactive Search Bar (tablet / desktop) */}
        <div ref={containerRef} className="relative flex-1 max-w-xl hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              {loading ? (
                <Loader2 className="h-4 w-4 text-[#FA2E72] animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-slate-400" strokeWidth={2} />
              )}
            </div>

            <input
              ref={desktopInputRef}
              type="text"
              aria-label="Search players and teams"
              aria-keyshortcuts="/ Control+K Meta+K"
              autoComplete="off"
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
              placeholder="Search players, teams, sports..."
              className="peer w-full pl-11 pr-10 py-2.5 bg-[#F1F5F9]/80 hover:bg-[#F1F5F9] focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-full border border-slate-200/70 focus:outline-hidden focus:border-[#FA2E72]/50 focus:ring-2 focus:ring-[#FA2E72]/15 transition-all shadow-2xs font-medium"
            />

            {/* Shortcut hint */}
            {!query && (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-6 min-w-6 px-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-400 flex items-center justify-center shadow-2xs peer-focus:opacity-0 transition-opacity">
                /
              </kbd>
            )}

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
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 animate-pop-in">
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
                    <span className="text-[10px] font-medium text-slate-400">Use ↑↓ keys, Enter to navigate</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {results.map((player, index) => (
                      <SearchResultRow
                        key={`${player.sport}-${player.id}`}
                        player={player}
                        isSelected={index === selectedIndex}
                        onSelect={() => handleSelectAthlete(player)}
                        onHover={() => setSelectedIndex(index)}
                      />
                    ))}
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

        {/* Right side control (Search button on mobile) */}
        <button
          type="button"
          onClick={() => setIsMobileSearchOpen(true)}
          className="md:hidden p-2.5 text-slate-600 rounded-full active:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
          aria-label="Search"
        >
          <Search className="w-5 h-5" strokeWidth={1.9} />
        </button>
      </div>

      {isMobileSearchOpen && (
        <MobileSearchOverlay
          query={query}
          results={results}
          loading={loading}
          onQueryChange={setQuery}
          onClose={closeMobileSearch}
          onSelect={handleSelectAthlete}
          onSubmit={handleSearchSubmit}
        />
      )}
    </header>
  );
};
