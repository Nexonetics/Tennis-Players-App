'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';

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

export const SportsProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Helper to determine initial sport synchronously
  const getInitialSport = (): SportType => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSport = urlParams.get('sport');
      if (urlSport && ['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(urlSport)) {
        return urlSport as SportType;
      }
      const savedSport = localStorage.getItem(LOCAL_STORAGE_SPORT);
      if (savedSport && ['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(savedSport)) {
        return savedSport as SportType;
      }
    }
    return 'Tennis';
  };

  // Helper to determine initial gender synchronously
  const getInitialGender = (): GenderType => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlGender = urlParams.get('gender') || urlParams.get('category');
      if (urlGender && ['men', 'women', 'm', 'f', 'wta', 'atp'].includes(urlGender.toLowerCase())) {
        const gLower = urlGender.toLowerCase();
        return (gLower === 'women' || gLower === 'f' || gLower === 'wta') ? 'Women' : 'Men';
      }
      const savedGender = localStorage.getItem(LOCAL_STORAGE_GENDER);
      if (savedGender === 'Women' || savedGender === 'Men') {
        return savedGender as GenderType;
      }
    }
    return 'Men';
  };

  const [sport, setSportState] = useState<SportType>(getInitialSport);
  const [gender, setGenderState] = useState<GenderType>(getInitialGender);

  // Sync state when URL searchParams change via external navigation (e.g. back/forward browser buttons)
  useEffect(() => {
    const urlSport = searchParams.get('sport');
    const urlGender = searchParams.get('gender') || searchParams.get('category');

    if (urlSport && ['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(urlSport)) {
      if (urlSport !== sport) {
        setSportState(urlSport as SportType);
        localStorage.setItem(LOCAL_STORAGE_SPORT, urlSport);
      }
    }

    if (urlGender) {
      const gLower = urlGender.toLowerCase();
      const targetGender: GenderType = (gLower === 'women' || gLower === 'f' || gLower === 'wta') ? 'Women' : 'Men';
      if (targetGender !== gender) {
        setGenderState(targetGender);
        localStorage.setItem(LOCAL_STORAGE_GENDER, targetGender);
      }
    }
  }, [searchParams]);

  // Synchronous state, localStorage, and browser address bar URL updater
  const updateStateAndUrl = useCallback((newSport: SportType, newGender: GenderType) => {
    setSportState(newSport);
    setGenderState(newGender);

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_SPORT, newSport);
      localStorage.setItem(LOCAL_STORAGE_GENDER, newGender);

      const currentPath = window.location.pathname;
      if (['/rankings', '/search', '/compare'].includes(currentPath)) {
        const url = new URL(window.location.href);
        url.searchParams.set('sport', newSport);
        url.searchParams.set('gender', newGender);
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, []);

  const setSport = (newSport: SportType) => {
    updateStateAndUrl(newSport, gender);
  };

  const setGender = (newGender: GenderType) => {
    updateStateAndUrl(sport, newGender);
  };

  const setSportAndGender = (newSport: SportType, newGender: GenderType) => {
    updateStateAndUrl(newSport, newGender);
  };

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
      getNavHref: (baseHref: string) => baseHref,
    };
  }
  return context;
};
