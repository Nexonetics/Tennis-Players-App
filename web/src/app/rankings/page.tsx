'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Player {
  id: string;
  rank: number;
  name: string;
  countryCode: string;
  points: string;
  image: string;
}

const dummyPlayers: Player[] = [
  { id: '1', rank: 1, name: 'Jannik Sinner', countryCode: 'ITA', points: '11,830', image: 'https://i.pravatar.cc/150?img=11' },
  { id: '2', rank: 2, name: 'Alexander Zverev', countryCode: 'GER', points: '8,135', image: 'https://i.pravatar.cc/150?img=12' },
  { id: '3', rank: 3, name: 'Carlos Alcaraz', countryCode: 'ESP', points: '7,410', image: 'https://i.pravatar.cc/150?img=13' },
  { id: '4', rank: 4, name: 'Felix Auger Aliassime', countryCode: 'CAN', points: '6,580', image: 'https://i.pravatar.cc/150?img=14' },
  { id: '5', rank: 5, name: 'Novak Djokovic', countryCode: 'SRB', points: '5,690', image: 'https://i.pravatar.cc/150?img=15' },
  { id: '6', rank: 6, name: 'Flavio Cobolli', countryCode: 'ITA', points: '4,823', image: 'https://i.pravatar.cc/150?img=16' },
  { id: '7', rank: 7, name: 'Alex De Minaur', countryCode: 'AUS', points: '4,650', image: 'https://i.pravatar.cc/150?img=17' },
];

export default function RankingsPage() {
  const [activeSport, setActiveSport] = useState('Tennis');
  const [activeCategory, setActiveCategory] = useState('ATP (Men)');

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Hero Banner */}
      <div className="w-full h-40 rounded-3xl overflow-hidden relative shadow-sm border border-pink-100 bg-gradient-to-r from-pink-50 to-pink-100 flex items-center px-10">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=2000&auto=format&fit=crop"
            alt="Tennis Court Banner"
            fill
            className="object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-[#FA2E72] rounded-full flex items-center justify-center shadow-md">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
              <path d="M12 2C12 2 15 7 15 12C15 17 12 22 12 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 2C12 2 9 7 9 12C9 17 12 22 12 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 12H22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Tennis</h1>
            <p className="text-slate-600 text-sm font-medium">Follow the latest rankings and explore your favorite players.</p>
          </div>
        </div>
      </div>

      {/* Sport Toggles */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {['Tennis', 'Table Tennis', 'Football', 'Basketball'].map(sport => (
          <button
            key={sport}
            onClick={() => setActiveSport(sport)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-xs flex items-center gap-2 whitespace-nowrap border
              ${activeSport === sport 
                ? 'bg-[#FA2E72] text-white border-transparent' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            {sport === 'Tennis' && <span className="text-lg">🎾</span>}
            {sport === 'Table Tennis' && <span className="text-lg">🏓</span>}
            {sport === 'Football' && <span className="text-lg">⚽</span>}
            {sport === 'Basketball' && <span className="text-lg">🏀</span>}
            {sport}
          </button>
        ))}
      </div>

      {/* Title & Category Toggles */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👑</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">World Rankings</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Top Tennis Pros</p>
          </div>
        </div>
        
        <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-xs">
          {['ATP (Men)', 'WTA (Women)'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all
                ${activeCategory === cat 
                  ? 'bg-[#E02263] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="flex flex-col gap-3 mt-2 pb-10">
        {dummyPlayers.map((player) => (
          <div key={player.id} className="bg-white/80 hover:bg-white backdrop-blur-md border border-slate-100 rounded-3xl p-4 flex items-center justify-between shadow-xs hover:shadow-md transition-all group">
            
            <div className="flex items-center gap-6 pl-2">
              {/* Rank */}
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-inner">
                {player.rank}
              </div>
              
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                <Image src={player.image} alt={player.name} width={56} height={56} className="object-cover" />
              </div>
              
              {/* Details */}
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 text-lg group-hover:text-[#FA2E72] transition-colors">{player.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base" title="Flag">🏳️</span>
                  <span className="text-xs font-semibold text-slate-500">{player.countryCode}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 pr-4">
              {/* Points */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Points</span>
                <span className="font-extrabold text-slate-900">{player.points}</span>
              </div>
              
              {/* Action Button */}
              <Link href={`/player/${player.id}`}>
                <button className="w-10 h-10 rounded-full bg-pink-50 text-[#FA2E72] flex items-center justify-center hover:bg-[#FA2E72] hover:text-white transition-all shadow-sm">
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </Link>
            </div>
            
          </div>
        ))}
      </div>

    </div>
  );
}
