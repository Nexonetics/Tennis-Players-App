'use client';

import React, { createContext, useContext, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Sport, parseSport } from '@/lib/sports';
import { normalizePath } from '@/lib/nav';

export type SportType = Sport;
export type GenderType = 'Men' | 'Women';

interface SportsContextType {
  sport: SportType;
  gender: GenderType;
  setSport: (sport: SportType) => void;
  setGender: (gender: GenderType) => void;
  setSportAndGender: (sport: SportType, gender: GenderType) => void;
  getNavHref: (baseHref: string) => string;
}

const SportsContext = createContext<SportsContextType | undefined>(undefined);

const LOCAL_STORAGE_SPORT = 'sports_app_active_sport';
const LOCAL_STORAGE_GENDER = 'sports_app_active_gender';
const STORAGE_CHANGE_EVENT = 'sports-app-storage-change';

/** Pages whose URL always mirrors the active sport/gender (so links and refreshes keep them). */
const URL_SYNCED_PATHS = ['/rankings', '/search', '/compare'];

function parseGender(val: string | null): GenderType | null {
  if (!val) return null;
  const lower = val.toLowerCase();
  if (lower === 'women' || lower === 'wta' || lower === 'f' || lower === 'female') return 'Women';
  if (lower === 'men' || lower === 'atp' || lower === 'm' || lower === 'male') return 'Men';
  return null;
}

// --- localStorage as an external store (safe for static pre-rendering + hydration) ---

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    if (window.localStorage.getItem(key) === value) return;
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) — preferences just won't persist.
  }
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(STORAGE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(STORAGE_CHANGE_EVENT, onChange);
  };
}

const getStoredSport = () => parseSport(readStorage(LOCAL_STORAGE_SPORT));
const getStoredGender = () => parseGender(readStorage(LOCAL_STORAGE_GENDER));
const getServerSnapshot = () => null;

export const SportsProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlSport = parseSport(searchParams.get('sport'));
  const urlGender = parseGender(searchParams.get('gender') || searchParams.get('category'));
  const storedSport = useSyncExternalStore(subscribeToStorage, getStoredSport, getServerSnapshot);
  const storedGender = useSyncExternalStore(subscribeToStorage, getStoredGender, getServerSnapshot);

  // The URL wins (shared links), then the remembered preference, then defaults.
  const sport: SportType = urlSport ?? storedSport ?? 'Tennis';
  const gender: GenderType = urlGender ?? storedGender ?? 'Men';

  // Remember sport/gender that arrive via the URL.
  useEffect(() => {
    if (urlSport) writeStorage(LOCAL_STORAGE_SPORT, urlSport);
    if (urlGender) writeStorage(LOCAL_STORAGE_GENDER, urlGender);
  }, [urlSport, urlGender]);

  const updateSportAndGender = useCallback(
    (newSport: SportType, newGender: GenderType) => {
      writeStorage(LOCAL_STORAGE_SPORT, newSport);
      writeStorage(LOCAL_STORAGE_GENDER, newGender);

      // Keep the URL in step wherever it carries (or should carry) the selection;
      // otherwise a stale ?sport= in the URL would override the new choice.
      const url = new URL(window.location.href);
      const currentPath = normalizePath(pathname || url.pathname);
      const urlHasSelection =
        url.searchParams.has('sport') || url.searchParams.has('gender') || url.searchParams.has('category');

      if (URL_SYNCED_PATHS.includes(currentPath) || urlHasSelection) {
        url.searchParams.set('sport', newSport);
        url.searchParams.set('gender', newGender);
        url.searchParams.delete('category');
        window.history.replaceState(null, '', url.toString());
      }
    },
    [pathname]
  );

  const setSport = useCallback(
    (newSport: SportType) => updateSportAndGender(newSport, gender),
    [gender, updateSportAndGender]
  );

  const setGender = useCallback(
    (newGender: GenderType) => updateSportAndGender(sport, newGender),
    [sport, updateSportAndGender]
  );

  const getNavHref = useCallback(
    (baseHref: string) => {
      if (baseHref === '/') return '/';
      const params = new URLSearchParams();
      params.set('sport', sport);
      params.set('gender', gender);
      return `${baseHref}?${params.toString()}`;
    },
    [sport, gender]
  );

  return (
    <SportsContext.Provider
      value={{
        sport,
        gender,
        setSport,
        setGender,
        setSportAndGender: updateSportAndGender,
        getNavHref,
      }}
    >
      {children}
    </SportsContext.Provider>
  );
};

export const SportsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <React.Suspense fallback={<>{children}</>}>
      <SportsProviderInner>{children}</SportsProviderInner>
    </React.Suspense>
  );
};

export const useSports = () => {
  const context = useContext(SportsContext);
  if (!context) {
    return {
      sport: 'Tennis' as SportType,
      gender: 'Men' as GenderType,
      setSport: () => {},
      setGender: () => {},
      setSportAndGender: () => {},
      getNavHref: (baseHref: string) => {
        if (baseHref === '/') return '/';
        return `${baseHref}?sport=Tennis&gender=Men`;
      },
    };
  }
  return context;
};
