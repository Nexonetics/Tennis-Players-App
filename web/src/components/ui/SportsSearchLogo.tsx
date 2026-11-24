import React from 'react';

export const SportsSearchLogo: React.FC<{
  className?: string;
  size?: 'sm' | 'md';
  /** Show only the emblem below the lg breakpoint (collapsed desktop rail). */
  collapsible?: boolean;
}> = ({ className = '', size = 'md', collapsible = false }) => {
  const isSmall = size === 'sm';
  return (
    <div className={`flex items-center ${isSmall ? 'gap-2' : 'gap-2.5'} font-bold tracking-tight select-none ${className}`}>
      {/* Pink Tennis Ball Emblem */}
      <div
        className={`relative ${isSmall ? 'w-7 h-7' : 'w-8 h-8'} rounded-full border-2 border-[#FA2E72] flex items-center justify-center bg-transparent shrink-0`}
      >
        <svg viewBox="0 0 24 24" className={isSmall ? 'w-4 h-4' : 'w-5 h-5'} fill="none">
          {/* Curved tennis ball seams */}
          <path
            d="M 6.5 4 C 11 7, 11 17, 6.5 20"
            stroke="#FA2E72"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 17.5 4 C 13 7, 13 17, 17.5 20"
            stroke="#FA2E72"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <span
        className={`${isSmall ? 'text-[1.15rem]' : 'text-[1.35rem]'} ${
          collapsible ? 'hidden lg:inline' : ''
        } leading-none tracking-tight font-extrabold text-[#111827]`}
      >
        Sports<span className="text-[#FA2E72]">Search</span>
      </span>
    </div>
  );
};
