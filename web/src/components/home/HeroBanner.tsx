'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';
import { getAssetUrl } from '@/lib/getAssetUrl';
import { Sport } from '@/lib/sports';
import { useSports } from '@/context/SportsContext';

interface Slide {
  sport: Sport;
  image: string;
  title: string;
  highlight: string;
  text: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    sport: 'Tennis',
    image: '/images/hero-tennis.jpg',
    title: 'Game',
    highlight: 'On!',
    text: 'Live rankings, 14,000+ cached player profiles, statistics & history graphs.',
    cta: 'Explore World Rankings',
  },
  {
    sport: 'Table Tennis',
    image: '/images/table-tennis-card.jpg',
    title: 'Table Tennis',
    highlight: 'Rankings',
    text: 'World rankings, player profiles and career ranking history.',
    cta: 'View Table Tennis',
  },
  {
    sport: 'Football',
    image: '/images/football-card.jpg',
    title: 'Football',
    highlight: 'Rankings',
    text: 'National team rankings, honours and ranking history.',
    cta: 'View Football',
  },
  {
    sport: 'Basketball',
    image: '/images/basketball-card.jpg',
    title: 'Basketball',
    highlight: 'Rankings',
    text: 'National team rankings, records and ranking history.',
    cta: 'View Basketball',
  },
];

const AUTO_ADVANCE_MS = 7000;
const SWIPE_THRESHOLD_PX = 40;

export const HeroBanner: React.FC = () => {
  const { gender, setSport } = useSports();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Auto-advance, unless the user is interacting or prefers reduced motion.
  useEffect(() => {
    if (isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setActiveSlide((i) => (i + 1) % SLIDES.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [isPaused, activeSlide]);

  const goTo = (index: number) => setActiveSlide((index + SLIDES.length) % SLIDES.length);
  const slide = SLIDES[activeSlide];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured sports"
      className="relative w-full min-h-[190px] sm:h-[220px] rounded-3xl overflow-hidden shadow-sm select-none bg-[#0a1128]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX) goTo(activeSlide + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
    >
      {/* Background images (cross-fade) */}
      {SLIDES.map((s, i) => (
        <Image
          key={s.sport}
          src={getAssetUrl(s.image)}
          alt=""
          fill
          sizes="(max-width: 1280px) 100vw, 66vw"
          className={`object-cover object-center transition-opacity duration-700 ${
            i === activeSlide ? 'opacity-100' : 'opacity-0'
          }`}
          preload={i === 0}
        />
      ))}

      {/* Dark overlay gradient from left to right */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128] via-[#0a1128]/85 via-45% to-transparent z-1" />

      {/* Content overlay */}
      <div
        className="relative z-2 h-full flex flex-col justify-between p-5 sm:p-7 text-white gap-4"
        aria-live={isPaused ? 'polite' : 'off'}
      >
        <div key={slide.sport} className="animate-fade-in">
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#1e293b]/90 border border-indigo-400/30 text-indigo-200 text-[10px] sm:text-xs font-medium backdrop-blur-xs">
              <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
              <span>Cached Local Database</span>
            </div>
            <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#FA2E72] text-white text-[10px] sm:text-xs font-semibold shadow-xs">
              {slide.sport}
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-white">
            {slide.title} <span className="text-[#FA2E72]">{slide.highlight}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs text-slate-300 max-w-[16rem] sm:max-w-sm font-normal leading-relaxed">{slide.text}</p>
        </div>

        {/* CTA Button & Pagination Dots Row */}
        <div className="flex items-end justify-between gap-2">
          <Link
            href={`/rankings?sport=${encodeURIComponent(slide.sport)}&gender=${gender}`}
            onClick={() => setSport(slide.sport)}
            className="flex items-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-5 rounded-full bg-[#FA2E72] hover:bg-[#E02263] text-white text-xs font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer active:scale-95"
          >
            <span>{slide.cta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Slide selectors */}
          <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Choose slide">
            {SLIDES.map((s, index) => (
              <button
                key={s.sport}
                type="button"
                onClick={() => goTo(index)}
                className="p-1.5 cursor-pointer group/dot"
                aria-label={`Show ${s.sport}`}
                aria-current={activeSlide === index ? 'true' : undefined}
              >
                <span
                  className={`block transition-all duration-300 rounded-full ${
                    activeSlide === index ? 'w-4 h-1.5 bg-[#FA2E72]' : 'w-1.5 h-1.5 bg-white/50 group-hover/dot:bg-white/80'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
