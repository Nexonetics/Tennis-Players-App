import React from 'react';

interface TeamBadgeProps {
  id: string;
  name: string;
  size?: number;
  className?: string;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({ id, name, size = 24, className = '' }) => {
  switch (id) {
    case 'es': // Spain Flag
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`rounded-full overflow-hidden shadow-xs shrink-0 ${className}`}>
          <rect width="24" height="6" fill="#C60B1E" />
          <rect y="6" width="24" height="12" fill="#FFC400" />
          <rect y="18" width="24" height="6" fill="#C60B1E" />
          <circle cx="8" cy="12" r="2.5" fill="#C60B1E" opacity="0.8" />
        </svg>
      );

    case 'neutral': // Blue/Red/White (Medvedev)
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`rounded-full overflow-hidden shadow-xs shrink-0 ${className}`}>
          <rect width="24" height="8" fill="#FFFFFF" />
          <rect y="8" width="24" height="8" fill="#0039A6" />
          <rect y="16" width="24" height="8" fill="#D52B1E" />
        </svg>
      );

    case 'pl': // Poland Flag
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`rounded-full overflow-hidden shadow-xs shrink-0 ${className}`}>
          <rect width="24" height="12" fill="#FFFFFF" />
          <rect y="12" width="24" height="12" fill="#DC143C" />
        </svg>
      );

    case 'us': // USA Flag
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`rounded-full overflow-hidden shadow-xs shrink-0 ${className}`}>
          <rect width="24" height="24" fill="#B22234" />
          <rect y="3" width="24" height="3" fill="#FFFFFF" />
          <rect y="9" width="24" height="3" fill="#FFFFFF" />
          <rect y="15" width="24" height="3" fill="#FFFFFF" />
          <rect y="21" width="24" height="3" fill="#FFFFFF" />
          <rect width="12" height="12" fill="#3C3B6E" />
          <circle cx="4" cy="4" r="0.8" fill="#FFFFFF" />
          <circle cx="8" cy="4" r="0.8" fill="#FFFFFF" />
          <circle cx="6" cy="7" r="0.8" fill="#FFFFFF" />
          <circle cx="4" cy="10" r="0.8" fill="#FFFFFF" />
          <circle cx="8" cy="10" r="0.8" fill="#FFFFFF" />
        </svg>
      );

    case 'rs': // Serbia Flag
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`rounded-full overflow-hidden shadow-xs shrink-0 ${className}`}>
          <rect width="24" height="8" fill="#C6363C" />
          <rect y="8" width="24" height="8" fill="#0C4076" />
          <rect y="16" width="24" height="8" fill="#FFFFFF" />
          <circle cx="8" cy="12" r="2" fill="#E8A724" />
        </svg>
      );

    case 'it': // Italy Flag
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`rounded-full overflow-hidden shadow-xs shrink-0 ${className}`}>
          <rect width="8" height="24" fill="#009246" />
          <rect x="8" width="8" height="24" fill="#FFFFFF" />
          <rect x="16" width="8" height="24" fill="#CE2B37" />
        </svg>
      );

    case 'cn': // China Flag
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={`rounded-full overflow-hidden shadow-xs shrink-0 ${className}`}>
          <rect width="24" height="24" fill="#DE2910" />
          <polygon points="6,3 7,6 10,6 7.5,8 8.5,11 6,9 3.5,11 4.5,8 2,6 5,6" fill="#FFDE00" transform="scale(0.5) translate(2, 2)" />
        </svg>
      );

    case 'real-madrid': // Real Madrid Crest
      return (
        <div
          style={{ width: size, height: size }}
          className={`relative rounded-full flex items-center justify-center bg-white border border-amber-300 shadow-xs shrink-0 ${className}`}
          title={name}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-0.5">
            <circle cx="16" cy="17" r="12" fill="#FEFEFE" stroke="#E5A93C" strokeWidth="2" />
            <line x1="8" y1="9" x2="24" y2="25" stroke="#7E57C2" strokeWidth="3" />
            <text x="16" y="20" fontSize="8" fontWeight="bold" fill="#203a74" textAnchor="middle">MCF</text>
            <path d="M12 7 L16 3 L20 7 L23 4 L23 7 L9 7 L9 4 Z" fill="#E5A93C" />
          </svg>
        </div>
      );

    case 'bayern': // Bayern Munich Crest
      return (
        <div
          style={{ width: size, height: size }}
          className={`relative rounded-full flex items-center justify-center bg-[#DC052D] border-2 border-white shadow-xs shrink-0 ${className}`}
          title={name}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-0.5">
            <circle cx="16" cy="16" r="14" fill="#DC052D" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="16" cy="16" r="9" fill="#0066B2" stroke="#FFFFFF" strokeWidth="1" />
            <path d="M11 13 L15 17 L19 13 L21 15 L17 19 L13 15 Z" fill="#FFFFFF" />
          </svg>
        </div>
      );

    case 'celtics': // Boston Celtics
      return (
        <div
          style={{ width: size, height: size }}
          className={`relative rounded-full flex items-center justify-center bg-[#008348] border border-white shadow-xs shrink-0 ${className}`}
          title={name}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1 text-white">
            <circle cx="16" cy="16" r="14" fill="#008348" />
            {/* Shamrock 3-leaf clover */}
            <circle cx="16" cy="12" r="3.5" fill="#FFFFFF" />
            <circle cx="12" cy="18" r="3.5" fill="#FFFFFF" />
            <circle cx="20" cy="18" r="3.5" fill="#FFFFFF" />
            <path d="M16 16 L16 23" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'heat': // Miami Heat
      return (
        <div
          style={{ width: size, height: size }}
          className={`relative rounded-full flex items-center justify-center bg-[#98002E] border border-amber-400 shadow-xs shrink-0 ${className}`}
          title={name}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full p-1">
            <circle cx="16" cy="16" r="14" fill="#98002E" />
            {/* Flaming ball */}
            <circle cx="16" cy="18" r="7" fill="#F9A01B" />
            <path d="M16 8 Q19 12 16 18 Q13 12 16 8 Z" fill="#F9A01B" />
            <ellipse cx="16" cy="18" rx="8" ry="3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </div>
      );

    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 ${className}`}
        >
          {name.charAt(0)}
        </div>
      );
  }
};
