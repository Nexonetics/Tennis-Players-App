'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Radio } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <div className="relative w-full h-[220px] rounded-3xl overflow-hidden shadow-sm select-none">
      {/* Background Image */}
      <Image
        src="/images/hero-tennis.jpg"
        alt="Game On Tennis Court"
        fill
        className="object-cover object-center"
        priority
      />

      {/* Dark overlay gradient from left to right */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128] via-[#0a1128]/85 via-45% to-transparent z-1" />

      {/* Content overlay */}
      <div className="relative z-2 h-full flex flex-col justify-between p-7 text-white">
        <div>
          {/* Top Badges */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e293b]/90 border border-indigo-400/30 text-indigo-200 text-xs font-medium backdrop-blur-xs">
              <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
              <span>Live Matches</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-[#FA2E72] text-white text-xs font-semibold shadow-xs">
              Live Now
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-white">
            Game <span className="text-[#FA2E72]">On!</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs text-slate-300 max-w-sm font-normal leading-relaxed">
            Live scores, player rankings, tournaments and more — all in one place.
          </p>
        </div>

        {/* CTA Button & Pagination Dots Row */}
        <div className="flex items-end justify-between">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FA2E72] hover:bg-[#E02263] text-white text-xs font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer">
            <span>Explore Live Matches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Slider Pagination Indicators */}
          <div className="flex items-center gap-1.5 pb-1">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`transition-all duration-200 rounded-full cursor-pointer ${
                  activeSlide === index
                    ? 'w-4 h-1.5 bg-[#FA2E72]'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
