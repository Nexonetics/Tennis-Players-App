'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search as SearchIcon, MapPin, BarChart3 } from 'lucide-react';

interface Player {
  id: string;
  rank: number;
  name: string;
  countryCode: string;
  points: string;
  image: string;
}

const dummyPlayers: Player[] = [
  { id: 'tt1', rank: 1, name: 'Wang Chuqin', countryCode: 'CHN', points: '11,830', image: 'https://i.pravatar.cc/150?img=33' },
  { id: 'tt2', rank: 2, name: 'Alexander Zverev', countryCode: 'GER', points: '8,135', image: 'https://i.pravatar.cc/150?img=12' },
  { id: 'tt3', rank: 3, name: 'Carlos Alcaraz', countryCode: 'ESP', points: '7,410', image: 'https://i.pravatar.cc/150?img=13' },
  { id: 'tt4', rank: 4, name: 'Felix Auger Aliassime', countryCode: 'CAN', points: '6,580', image: 'https://i.pravatar.cc/150?img=14' },
  { id: 'tt5', rank: 5, name: 'Novak Djokovic', countryCode: 'SRB', points: '5,690', image: 'https://i.pravatar.cc/150?img=15' },
  { id: 'tt6', rank: 6, name: 'Lin Yun-Ju', countryCode: 'TPE', points: '4,823', image: 'https://i.pravatar.cc/150?img=21' },
  { id: 'tt7', rank: 7, name: 'Hugo Calderano', countryCode: 'BRA', points: '4,650', image: 'https://i.pravatar.cc/150?img=22' },
  { id: 'tt8', rank: 8, name: 'Tomokazu Harimoto', countryCode: 'JPN', points: '4,510', image: 'https://i.pravatar.cc/150?img=23' },
  { id: 'tt9', rank: 9, name: 'Timo Boll', countryCode: 'GER', points: '4,125', image: 'https://i.pravatar.cc/150?img=24' },
  { id: 'tt10', rank: 10, name: 'Darko Jorgic', countryCode: 'SLO', points: '3,980', image: 'https://i.pravatar.cc/150?img=25' },
];

export default function SearchPage() {
  const [gender, setGender] = useState('Men');

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      
      {/* Hero Banner */}
      <div className="w-full h-44 rounded-3xl overflow-hidden relative shadow-sm border border-blue-900 bg-[#0A2342] flex items-center px-10">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=2000&auto=format&fit=crop"
            alt="Table Tennis Banner"
            fill
            className="object-cover opacity-40 mix-blend-overlay"
          />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-md text-white">
            <span className="text-3xl">🏓</span>
          </div>
          <div>
            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-[10px] font-bold uppercase tracking-widest mb-2 border border-white/10">
              Table Tennis
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              Find Your Favorite <span className="text-[#FA2E72]">Players</span>
            </h1>
            <p className="text-blue-100 text-sm font-medium">Search and explore detailed profiles, rankings, tournaments and more for Table Tennis players.</p>
          </div>
        </div>
        <div className="absolute right-10 bottom-6 rotate-[-10deg] opacity-80 pointer-events-none">
          <span className="text-4xl font-extrabold text-white/50" style={{ fontFamily: 'cursive' }}>Small Ball<br/>Big Dreams</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white/60 p-2 rounded-full border border-slate-200 shadow-xs backdrop-blur-sm">
        
        {/* Gender Toggle */}
        <div className="flex bg-white rounded-full p-1 shadow-xs border border-slate-100 shrink-0">
          <button 
            onClick={() => setGender('Men')}
            className={`px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${gender === 'Men' ? 'bg-[#FA2E72] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            ♂ Men
          </button>
          <button 
            onClick={() => setGender('Women')}
            className={`px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${gender === 'Women' ? 'bg-[#FA2E72] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            ♀ Women
          </button>
        </div>

        {/* Text Search */}
        <div className="flex-1 relative min-w-[200px]">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, country, or rank..." 
            className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#FA2E72] focus:ring-1 focus:ring-[#FA2E72] shadow-xs"
          />
        </div>

        {/* Country Dropdown */}
        <div className="relative w-40 shrink-0">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-8 text-sm text-slate-700 focus:outline-none appearance-none shadow-xs font-medium cursor-pointer">
            <option>Country</option>
            <option>China</option>
            <option>Japan</option>
            <option>Germany</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
        </div>

        {/* Rank Range Dropdown */}
        <div className="relative w-40 shrink-0">
          <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-8 text-sm text-slate-700 focus:outline-none appearance-none shadow-xs font-medium cursor-pointer">
            <option>Rank Range</option>
            <option>Top 10</option>
            <option>11 - 50</option>
            <option>51 - 100</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
        </div>

        {/* Submit Button */}
        <button className="bg-[#FA2E72] hover:bg-[#E02263] text-white px-8 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors shadow-sm shrink-0">
          <SearchIcon className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mt-4 border-b border-slate-200 pb-2">
        <h2 className="text-xl font-bold text-slate-800">Top Players</h2>
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          Sort by
          <select className="bg-white border border-slate-200 rounded-lg px-3 py-1 font-semibold focus:outline-none">
            <option>Rank</option>
            <option>Points</option>
            <option>Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Grid of Players */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5 pb-10">
        {dummyPlayers.map((player) => (
          <div key={player.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow relative flex flex-col items-center text-center">
            
            {/* Rank Badge */}
            <div className="absolute -top-2 -left-2 w-7 h-7 bg-amber-100 text-amber-700 font-bold text-xs rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {player.rank}
            </div>

            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 shadow-sm border-4 border-slate-50">
              <Image src={player.image} alt={player.name} width={80} height={80} className="object-cover" />
            </div>

            {/* Details */}
            <h3 className="font-bold text-slate-900 text-base mb-1 truncate w-full">{player.name}</h3>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-sm">🏳️</span>
              <span className="text-xs font-semibold text-slate-500">{player.countryCode}</span>
            </div>

            {/* Points */}
            <div className="mb-4">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Rank Points</span>
              <span className="font-extrabold text-[#FA2E72]">{player.points}</span>
            </div>

            {/* Action */}
            <Link href={`/player/${player.id}`} className="w-full mt-auto">
              <button className="w-full py-2 bg-[#FA2E72] hover:bg-[#E02263] text-white rounded-full text-xs font-bold transition-colors">
                View Profile →
              </button>
            </Link>

          </div>
        ))}
      </div>

    </div>
  );
}
