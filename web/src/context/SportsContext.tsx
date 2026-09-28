'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export type SportType = 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';
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

const VALID_SPORTS: SportType[] = ['Tennis', 'Table Tennis', 'Football', 'Basketball'];

function parseSport(val: string | null): SportType | null {
  if (!val) return null;
  const match = VALID_SPORTS.find((s) => s.toLowerCase() === val.toLowerCase());
  return match || null;
}

function parseGender(val: string | null): GenderType | null {
  if (!val) return null;
  const lower = val.toLowerCase();
  if (lower === 'women' || lower === 'wta' || lower === 'f' || lower === 'female') return 'Women';
  if (lower === 'men' || lower === 'atp' || lower === 'm' || lower === 'male') return 'Men';
  return null;
}

export const SportsProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Initialize state from URL searchParams (SSR & Client safe)
  const initialUrlSport = parseSport(searchParams.get('sport'));
  const initialUrlGender = parseGender(searchParams.get('gender') || searchParams.get('category'));

  const [sport, setSportState] = useState<SportType>(initialUrlSport || 'Tennis');
  const [gender, setGenderState] = useState<GenderType>(initialUrlGender || 'Men');

  // On client mount, if URL has no sport/gender parameters, fall back to localStorage
  useEffect(() => {
    const urlSport = parseSport(searchParams.get('sport'));
    const urlGender = parseGender(searchParams.get('gender') || searchParams.get('category'));

    if (urlSport) {
      setSportState(urlSport);
      localStorage.setItem(LOCAL_STORAGE_SPORT, urlSport);
    } else {
      const savedSport = parseSport(localStorage.getItem(LOCAL_STORAGE_SPORT));
      if (savedSport) setSportState(savedSport);
    }

    if (urlGender) {
      setGenderState(urlGender);
      localStorage.setItem(LOCAL_STORAGE_GENDER, urlGender);
    } else {
      const savedGender = parseGender(localStorage.getItem(LOCAL_STORAGE_GENDER));
      if (savedGender) setGenderState(savedGender);
    }
  }, [searchParams]);

  // Synchronize state, localStorage, and browser URL search parameters
  const updateSportAndGender = useCallback(
    (newSport: SportType, newGender: GenderType) => {
      setSportState(newSport);
      setGenderState(newGender);

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_SPORT, newSport);
        localStorage.setItem(LOCAL_STORAGE_GENDER, newGender);

        const currentPath = pathname || window.location.pathname;
        if (['/rankings', '/search', '/compare'].includes(currentPath)) {
          const url = new URL(window.location.href);
          url.searchParams.set('sport', newSport);
          url.searchParams.set('gender', newGender);
          window.history.replaceState(null, '', url.toString());
          try {
            router.replace(url.toString(), { scroll: false });
          } catch (e) {
            // Ignore router navigation interruption
          }
        }
      }
    },
    [pathname, router]
  );

  const setSport = useCallback(
    (newSport: SportType) => {
      updateSportAndGender(newSport, gender);
    },
    [gender, updateSportAndGender]
  );

  const setGender = useCallback(
    (newGender: GenderType) => {
      updateSportAndGender(sport, newGender);
    },
    [sport, updateSportAndGender]
  );

  const setSportAndGender = useCallback(
    (newSport: SportType, newGender: GenderType) => {
      updateSportAndGender(newSport, newGender);
    },
    [updateSportAndGender]
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
        setSportAndGender,
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
