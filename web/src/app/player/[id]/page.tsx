'use client';

import React from 'react';
import Image from 'next/image';
import { Calendar, User, Trophy, Medal, Star, TrendingUp } from 'lucide-react';

export default function PlayerPage() {
  const dummyPlayer = {
    name: 'Wang Chuqin',
    sport: 'Table Tennis',
    country: 'China',
    countryCode: 'CHN',
    gender: 'Men',
    age: 26,
    style: 'Right Handed',
    currentRank: 1,
    careerHigh: 1,
    careerHighDate: 'Jul 2023',
    winRate: 78.4,
    quote: 'Discipline turns talent into greatness.',
    image: 'https://i.pravatar.cc/300?img=33',
    banner: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=2000&auto=format&fit=crop'
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
      
      {/* Hero Banner */}
      <div className="w-full h-48 rounded-3xl overflow-hidden relative shadow-sm border border-slate-200">
        <div className="absolute inset-0 z-0">
          <Image
            src={dummyPlayer.banner}
            alt="Player Banner"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A2342] via-[#0A2342]/80 to-transparent"></div>
        </div>
        <div className="relative z-10 flex items-center gap-6 px-10 h-full">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg shrink-0">
            <Image src={dummyPlayer.image} alt={dummyPlayer.name} width={128} height={128} className="object-cover" />
          </div>
          <div className="flex flex-col text-white">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-widest mb-2 border border-white/10 w-max">
              <span className="text-[10px]">🔍</span> {dummyPlayer.sport}
            </div>
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">{dummyPlayer.name}</h1>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
              <span className="flex items-center gap-1.5"><span className="text-base">🏳️</span> {dummyPlayer.country}</span>
              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
              <span>{dummyPlayer.gender}</span>
              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
              <span>{dummyPlayer.age} years</span>
            </div>
            <p className="mt-2 text-blue-100 text-sm max-w-md italic">
              Power, precision and a relentless drive to be the best.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Quick Info */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
              <User className="w-5 h-5 text-[#FA2E72]" />
              Quick Info
            </h3>

            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-lg">🏳️</div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Country</div>
                  <div className="font-bold text-slate-800">{dummyPlayer.country}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><Calendar className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Age</div>
                  <div className="font-bold text-slate-800">{dummyPlayer.age} years</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <span className="text-lg">🏓</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Playing Style</div>
                  <div className="font-bold text-slate-800">{dummyPlayer.style}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500"><Trophy className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Current Rank</div>
                  <div className="font-bold text-slate-800">#{dummyPlayer.currentRank}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <span className="text-4xl text-pink-200 font-serif leading-none block mb-2">"</span>
              <p className="text-slate-600 italic text-sm font-medium pr-4">
                {dummyPlayer.quote}
              </p>
              <div className="w-6 h-1 bg-[#FA2E72] rounded-full mt-4"></div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Ranking Progress Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <TrendingUp className="w-5 h-5 text-[#FA2E72]" />
                Ranking Progress
              </h3>
              <button className="text-sm font-bold text-[#FA2E72] hover:text-[#E02263] bg-pink-50 hover:bg-pink-100 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1">
                View Full Stats →
              </button>
            </div>
            
            <div className="w-full h-[240px] bg-gradient-to-b from-pink-50/50 to-white rounded-xl border border-pink-100/50 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%" preserveAspectRatio="none">
                  <path d="M0 180 Q 200 120, 400 150 T 800 50 L 800 240 L 0 240 Z" fill="#FA2E72" />
                </svg>
              </div>
              
              <div className="flex-1 flex items-end justify-between px-6 pb-8 pt-4 relative z-10">
                {/* Dummy points for the graph */}
                {[
                  { month: 'Oct \'24', rank: 18 },
                  { month: 'Nov \'24', rank: 12 },
                  { month: 'Dec \'24', rank: 10 },
                  { month: 'Jan \'25', rank: 14 },
                  { month: 'Feb \'25', rank: 17 },
                  { month: 'Mar \'25', rank: 12 },
                  { month: 'Apr \'25', rank: 7 },
                  { month: 'May \'25', rank: 5 },
                  { month: 'Jun \'25', rank: 2 },
                  { month: 'Jul \'25', rank: 3 },
                  { month: 'Aug \'25', rank: 1 },
                  { month: 'Sep \'25', rank: 1 },
                ].map((pt, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 relative h-full justify-end">
                    <span className="text-[10px] font-bold text-[#FA2E72] mb-1 absolute" style={{ bottom: `${100 - (pt.rank * 4)}%` }}>#{pt.rank}</span>
                    <div className="w-2 h-2 rounded-full bg-[#FA2E72] shadow-sm z-10 absolute" style={{ bottom: `calc(${100 - (pt.rank * 4)}% - 10px)` }}></div>
                    <span className="text-[10px] font-semibold text-slate-400 absolute bottom-0 translate-y-6">{pt.month}</span>
                  </div>
                ))}
                
                {/* SVG Line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                  <path d="M 30 180 Q 100 130, 180 150 T 330 110 T 480 80 T 630 30 T 780 30" fill="none" stroke="#FA2E72" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Player Statistics */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="text-[#FA2E72]">🌸</span>
                Player Statistics
              </h3>
              <div className="flex items-center gap-2 text-sm text-[#FA2E72] font-semibold bg-pink-50 px-3 py-1.5 rounded-lg border border-pink-100">
                <Calendar className="w-4 h-4" />
                Latest ▾
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-sm"><Trophy className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Current Rank</div>
                  <div className="font-bold text-slate-800 text-lg">#{dummyPlayer.currentRank}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-sm"><TrendingUp className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Career High Rank</div>
                  <div className="font-bold text-slate-800 text-lg">#{dummyPlayer.careerHigh} ({dummyPlayer.careerHighDate})</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-sm"><User className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs font-semibold text-slate-400">Playing Style</div>
                  <div className="font-bold text-slate-800 text-lg">{dummyPlayer.style}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FA2E72] shadow-sm"><Star className="w-5 h-5" /></div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Win Rate</div>
                    <div className="font-bold text-slate-800 text-lg">{dummyPlayer.winRate}%</div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-[#FA2E72] border-r-pink-100 flex items-center justify-center"></div>
              </div>
            </div>

            {/* Bottom button */}
            <div className="mt-2 bg-pink-50 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#FA2E72] hover:text-white transition-colors group text-[#FA2E72] border border-pink-100">
              <div className="flex items-center gap-3">
                <Medal className="w-5 h-5 group-hover:text-white" />
                <span className="font-bold">Career Performance</span>
              </div>
              <ChevronRight size={20} strokeWidth={2.5} />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

// Temporary ChevronRight since it was missing
function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
