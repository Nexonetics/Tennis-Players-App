'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

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
  const [sport, setSportState] = useState<SportType>('Tennis');
  const [gender, setGenderState] = useState<GenderType>('Men');

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Initialize from URL query parameters or localStorage fallback
  useEffect(() => {
    const urlSport = searchParams.get('sport');
    const urlGender = searchParams.get('gender') || searchParams.get('category');

    let targetSport: SportType = sport;
    let targetGender: GenderType = gender;

    if (urlSport && ['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(urlSport)) {
      targetSport = urlSport as SportType;
    } else {
      const savedSport = localStorage.getItem(LOCAL_STORAGE_SPORT);
      if (savedSport && ['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(savedSport)) {
        targetSport = savedSport as SportType;
      }
    }

    if (urlGender && ['men', 'women', 'm', 'f', 'wta', 'atp'].includes(urlGender.toLowerCase())) {
      const gLower = urlGender.toLowerCase();
      if (gLower === 'women' || gLower === 'f' || gLower === 'wta') {
        targetGender = 'Women';
      } else {
        targetGender = 'Men';
      }
    } else {
      const savedGender = localStorage.getItem(LOCAL_STORAGE_GENDER);
      if (savedGender === 'Women' || savedGender === 'Men') {
        targetGender = savedGender as GenderType;
      }
    }

    setSportState(targetSport);
    setGenderState(targetGender);

    localStorage.setItem(LOCAL_STORAGE_SPORT, targetSport);
    localStorage.setItem(LOCAL_STORAGE_GENDER, targetGender);
  }, [searchParams]);

  const updateUrlAndStorage = useCallback(
    (newSport: SportType, newGender: GenderType) => {
      localStorage.setItem(LOCAL_STORAGE_SPORT, newSport);
      localStorage.setItem(LOCAL_STORAGE_GENDER, newGender);

      if (['/rankings', '/search', '/compare'].includes(pathname)) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sport', newSport);
        params.set('gender', newGender);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [pathname, searchParams, router]
  );

  const setSport = (newSport: SportType) => {
    setSportState(newSport);
    updateUrlAndStorage(newSport, gender);
  };

  const setGender = (newGender: GenderType) => {
    setGenderState(newGender);
    updateUrlAndStorage(sport, newGender);
  };

  const setSportAndGender = (newSport: SportType, newGender: GenderType) => {
    setSportState(newSport);
    setGenderState(newGender);
    updateUrlAndStorage(newSport, newGender);
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
