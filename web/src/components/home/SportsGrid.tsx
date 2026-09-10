'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { sportCategories } from '@/data/dummyData';

const SportIcon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
  switch (name) {
    case 'tennis':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M 5.6 5.6 C 9 9, 9 15, 5.6 18.4" />
          <path d="M 18.4 5.6 C 15 9, 15 15, 18.4 18.4" />
        </svg>
      );
    case 'table-tennis':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          {/* Ping Pong Paddle */}
          <circle cx="11" cy="9" r="6.5" />
          <path d="M15.5 13.5 L20 18" strokeWidth="2.5" />
          {/* Ping pong ball */}
          <circle cx="4" cy="17" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'football':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="12 8, 15 10.5, 14 14, 10 14, 9 10.5" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="3" x2="12" y2="8" />
          <line x1="20.5" y1="9" x2="15" y2="10.5" />
          <line x1="17.5" y1="18" x2="14" y2="14" />
          <line x1="6.5" y1="18" x2="10" y2="14" />
          <line x1="3.5" y1="9" x2="9" y2="10.5" />
        </svg>
      );
    case 'basketball':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <path d="M 5.6 5.6 C 9 9, 9 15, 5.6 18.4" />
          <path d="M 18.4 5.6 C 15 9, 15 15, 18.4 18.4" />
        </svg>
      );
    default:
      return null;
  }
};

export const SportsGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {sportCategories.map((sport) => (
        <div
          key={sport.id}
          className="relative h-[138px] rounded-3xl overflow-hidden shadow-xs group cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5"
        >
          {/* Background image */}
          <Image
            src={sport.image}
            alt={sport.title}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />

          {/* Tinted Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r ${sport.gradientOverlay} z-1`} />

          {/* Card Content */}
          <div className="relative z-2 h-full p-4 flex flex-col justify-between text-white">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full text-white/95 shrink-0">
                <SportIcon name={sport.iconName} className="w-7 h-7" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-base font-bold leading-tight tracking-tight text-white drop-shadow-xs">
                  {sport.title}
                </h3>
                <p className="text-[11px] text-white/80 font-normal tracking-wide mt-0.5">
                  {sport.subtitle}
                </p>
              </div>
            </div>

            {/* Circular action button */}
            <div>
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white transition-all group-hover:bg-white group-hover:text-slate-900 group-hover:scale-105">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
