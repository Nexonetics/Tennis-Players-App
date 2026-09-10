'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowLeftRight, X } from 'lucide-react';

export default function ComparePage() {
  const dummyPlayerA = {
    name: 'Sun Yingsha',
    country: 'China',
    age: 26,
    winRate: 50.0,
    currentRank: 1,
    careerHigh: 1,
    careerHighDate: 'Feb 2022',
    image: 'https://i.pravatar.cc/150?img=47'
  };

  const dummyPlayerB = {
    name: 'Sato Hitomi',
    country: 'Japan',
    age: 28,
    winRate: 50.0,
    currentRank: 15,
    careerHigh: 9,
    careerHighDate: 'Apr 2017',
    image: 'https://i.pravatar.cc/150?img=48'
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
      
      {/* Hero Banner */}
      <div className="w-full h-44 rounded-3xl overflow-hidden relative shadow-sm border border-blue-900 bg-[#0A2342] flex items-center px-10">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1511414445137-58fdbba9e557?q=80&w=2000&auto=format&fit=crop"
            alt="Table Tennis Banner"
            fill
            className="object-cover opacity-30 mix-blend-overlay"
          />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-md text-white">
            <ArrowLeftRight className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-[10px] font-bold uppercase tracking-widest mb-2 border border-white/10">
              <ArrowLeftRight className="w-3 h-3" /> Table Tennis
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              Compare <span className="text-[#FA2E72]">Players</span>
            </h1>
            <p className="text-blue-100 text-sm font-medium max-w-lg">Analyze and compare player profiles, rankings, and performance side by side.</p>
          </div>
        </div>
        <div className="absolute right-10 bottom-6 rotate-[-10deg] opacity-80 pointer-events-none">
          <span className="text-4xl font-extrabold text-white/50" style={{ fontFamily: 'cursive' }}>Better<br/>Together</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar (Optional space, as per design there's a Quick Info block on left, but it's grayed out or maybe global info. In Screenshot 2, the left bar is actually "Quick Info" for Player A, but wait, the main content takes up most space). */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-2">
              <span className="text-lg">👤</span> Quick Info
            </h3>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-lg">🏳️</div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Country</div>
                <div className="font-bold text-[#FA2E72]">China</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 text-lg">📅</div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Age</div>
                <div className="font-bold text-[#FA2E72]">26 years</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 text-lg">🏓</div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Playing Style</div>
                <div className="font-bold text-[#FA2E72]">Right Handed</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 text-lg">🏆</div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Current Rank</div>
                <div className="font-bold text-[#FA2E72]">#1</div>
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-slate-100">
              <span className="text-4xl text-pink-200 font-serif leading-none block mb-2">"</span>
              <p className="text-[#FA2E72] italic text-sm font-medium pr-4">
                Discipline turns talent into greatness.
              </p>
              <div className="w-6 h-1 bg-[#FA2E72] rounded-full mt-4"></div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Player Selectors */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between gap-6">
              
              {/* Selector A */}
              <div className="flex-1 border border-slate-200 rounded-full p-2 pl-4 pr-6 flex items-center gap-4 hover:border-slate-300 transition-colors shadow-xs">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
                  <Image src={dummyPlayerA.image} alt={dummyPlayerA.name} width={48} height={48} className="object-cover" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900">{dummyPlayerA.name}</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="text-[#FA2E72]">●</span> {dummyPlayerA.country} • {dummyPlayerA.age} yrs
                  </div>
                </div>
                <button className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="text-slate-300 font-bold text-xl px-2">VS</div>

              {/* Selector B */}
              <div className="flex-1 border border-slate-200 rounded-full p-2 pl-4 pr-6 flex items-center gap-4 hover:border-slate-300 transition-colors shadow-xs bg-slate-50/50">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-slate-200">
                  <Image src={dummyPlayerB.image} alt={dummyPlayerB.name} width={48} height={48} className="object-cover" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900">{dummyPlayerB.name}</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="text-indigo-600">●</span> {dummyPlayerB.country} • {dummyPlayerB.age} yrs
                  </div>
                </div>
                <button className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
              </div>

            </div>
            <button className="w-full bg-[#FA2E72] hover:bg-[#E02263] text-white py-3.5 rounded-full font-bold shadow-sm transition-colors mt-2 flex items-center justify-center gap-2">
              <ArrowLeftRight className="w-5 h-5" /> COMPARE ATHLETES
            </button>
          </div>

          {/* Comparison Stats Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="text-[#FA2E72]">📈</span>
                Player Comparison
              </h3>
              <button className="text-sm font-bold text-[#FA2E72] hover:text-[#E02263] bg-pink-50 hover:bg-pink-100 px-4 py-1.5 rounded-full transition-colors">
                View Full Stats →
              </button>
            </div>
            
            {/* Headers */}
            <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-4 w-1/3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                  <Image src={dummyPlayerA.image} alt="A" width={48} height={48} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{dummyPlayerA.name}</div>
                  <div className="text-[10px] font-semibold text-slate-500"><span className="text-[#FA2E72]">●</span> {dummyPlayerA.country} • {dummyPlayerA.age} yrs</div>
                </div>
              </div>
              <div className="text-slate-300 font-bold text-sm">VS</div>
              <div className="flex items-center gap-4 justify-end w-1/3 text-right">
                <div>
                  <div className="font-bold text-slate-900">{dummyPlayerB.name}</div>
                  <div className="text-[10px] font-semibold text-slate-500"><span className="text-indigo-600">●</span> {dummyPlayerB.country} • {dummyPlayerB.age} yrs</div>
                </div>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                  <Image src={dummyPlayerB.image} alt="B" width={48} height={48} />
                </div>
              </div>
            </div>

            {/* Stats Table */}
            <div className="flex flex-col">
              <div className="bg-slate-50 rounded-xl px-4 py-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Stats Summary</div>
              
              <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                <div className="w-1/3 text-left font-bold text-slate-800">{dummyPlayerA.age} Yrs</div>
                <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Age</div>
                <div className="w-1/3 text-right font-bold text-slate-800">{dummyPlayerB.age} Yrs</div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                <div className="w-1/3 text-left font-bold text-slate-800">{dummyPlayerA.country}</div>
                <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Country</div>
                <div className="w-1/3 text-right font-bold text-slate-800">{dummyPlayerB.country}</div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                <div className="w-1/3 text-left font-bold text-slate-800">{dummyPlayerA.winRate.toFixed(1)}%</div>
                <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Win %</div>
                <div className="w-1/3 text-right font-bold text-slate-800">{dummyPlayerB.winRate.toFixed(1)}%</div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4 bg-[#FA2E72]/5 rounded-lg my-1">
                <div className="w-1/3 text-left font-bold text-[#FA2E72]">#{dummyPlayerA.currentRank}</div>
                <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Current Rank</div>
                <div className="w-1/3 text-right font-bold text-slate-800">#{dummyPlayerB.currentRank}</div>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                <div className="w-1/3 text-left font-bold text-[#FA2E72]">#{dummyPlayerA.careerHigh} <span className="text-xs font-normal text-slate-500">({dummyPlayerA.careerHighDate})</span></div>
                <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Career High Rank</div>
                <div className="w-1/3 text-right font-bold text-slate-800">#{dummyPlayerB.careerHigh} <span className="text-xs font-normal text-slate-500">({dummyPlayerB.careerHighDate})</span></div>
              </div>
            </div>

            {/* Ranking Timeline Comparison Chart Placeholder */}
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">Ranking Timeline Comparison</div>
              <div className="w-full h-48 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden flex flex-col items-center justify-center">
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-[#FA2E72]"></span> {dummyPlayerA.name}</div>
                  <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-indigo-600"></span> {dummyPlayerB.name}</div>
                </div>
                {/* SVG Graph placeholder mimicking design */}
                <svg width="80%" height="80%" viewBox="0 0 400 100" preserveAspectRatio="none" className="opacity-80">
                  <path d="M0,80 Q50,70 100,50 T200,40 T300,40 T400,30" fill="none" stroke="#FA2E72" strokeWidth="2" />
                  <path d="M0,95 Q50,90 100,60 T200,65 T300,85 T400,40" fill="none" stroke="#4f46e5" strokeWidth="2" />
                  {/* Dots */}
                  <circle cx="100" cy="50" r="3" fill="#FA2E72" />
                  <circle cx="200" cy="40" r="3" fill="#FA2E72" />
                  <circle cx="300" cy="40" r="3" fill="#FA2E72" />
                  <circle cx="100" cy="60" r="3" fill="#4f46e5" />
                  <circle cx="200" cy="65" r="3" fill="#4f46e5" />
                  <circle cx="300" cy="85" r="3" fill="#4f46e5" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
