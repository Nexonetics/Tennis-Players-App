'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftRight, X, Search, Loader2 } from 'lucide-react';
import { UnifiedAthlete, HistoryPoint } from '@/types';
import { searchAthletes, getAthleteById, getAthleteHistory } from '@/lib/localDataService';

// Safe Athlete Image component with onError fallback
const AthleteImage = ({ src, alt, width, height, className, fallbackLetter }: {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackLetter: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold text-xl flex items-center justify-center">
        {fallbackLetter}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

function ComparePageContent() {
  const searchParams = useSearchParams();
  const initialPlayer1 = searchParams.get('player1') || '';
  const initialSport = (searchParams.get('sport') as any) || 'Tennis';

  const [sport, setSport] = useState<'Tennis' | 'Table Tennis' | 'Football' | 'Basketball'>(initialSport);

  const [playerA, setPlayerA] = useState<UnifiedAthlete | null>(null);
  const [playerB, setPlayerB] = useState<UnifiedAthlete | null>(null);

  const [historyA, setHistoryA] = useState<HistoryPoint[]>([]);
  const [historyB, setHistoryB] = useState<HistoryPoint[]>([]);

  const [searchModalOpen, setSearchModalOpen] = useState<'A' | 'B' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedAthlete[]>([]);
  const [searching, setSearching] = useState(false);

  // Initial load for default players
  useEffect(() => {
    async function loadDefaults() {
      try {
        const data = await searchAthletes({ sport, pageSize: 5 });
        const items: UnifiedAthlete[] = data.items || [];
        if (items.length >= 2) {
          let pA = items[0];
          let pB = items[1];

          if (initialPlayer1) {
            const foundA = await getAthleteById(initialPlayer1, sport);
            if (foundA) pA = foundA;
          }

          setPlayerA(pA);
          setPlayerB(pB);
        }
      } catch (err) {
        console.error('Failed loading default players for compare', err);
      }
    }
    loadDefaults();
  }, [sport, initialPlayer1]);

  // Fetch histories when playerA or playerB changes
  useEffect(() => {
    async function fetchHistories() {
      if (playerA) {
        try {
          const hA = await getAthleteHistory(playerA.id, playerA.sport);
          setHistoryA(hA || []);
        } catch (e) {
          console.error(e);
        }
      }
      if (playerB) {
        try {
          const hB = await getAthleteHistory(playerB.id, playerB.sport);
          setHistoryB(hB || []);
        } catch (e) {
          console.error(e);
        }
      }
    }
    fetchHistories();
  }, [playerA, playerB, sport]);

  // Search players inside modal
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await searchAthletes({ sport, query: searchQuery, pageSize: 10 });
      setSearchResults(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, [sport, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    }
  }, [searchQuery, handleSearch]);

  const selectAthlete = (athlete: UnifiedAthlete) => {
    if (searchModalOpen === 'A') setPlayerA(athlete);
    if (searchModalOpen === 'B') setPlayerB(athlete);
    setSearchModalOpen(null);
    setSearchQuery('');
  };

  const getSportEmoji = (s: string) => {
    switch (s) {
      case 'Tennis': return '🎾';
      case 'Table Tennis': return '🏓';
      case 'Football': return '⚽';
      case 'Basketball': return '🏀';
      default: return '🏆';
    }
  };

  // Connected SVG timeline calculation for comparison
  const recentA = historyA.slice(-10);
  const recentB = historyB.slice(-10);

  const allRanks = [...recentA.map(h => h.ranking), ...recentB.map(h => h.ranking)];
  if (playerA) allRanks.push(playerA.ranking);
  if (playerB) allRanks.push(playerB.ranking);

  const minRank = allRanks.length > 0 ? Math.min(...allRanks) : 1;
  const maxRank = allRanks.length > 0 ? Math.max(...allRanks) : 10;
  const spanRank = Math.max(1, maxRank - minRank);

  const svgW = 800;
  const svgH = 160;
  const padX = 40;
  const padY = 25;
  const usableW = svgW - 2 * padX;
  const usableH = svgH - 2 * padY;

  const pointsA = recentA.map((pt, i) => {
    const x = recentA.length === 1 ? svgW / 2 : padX + (i / (recentA.length - 1)) * usableW;
    const y = padY + ((pt.ranking - minRank) / spanRank) * usableH;
    return { x, y, pt };
  });

  const pointsB = recentB.map((pt, i) => {
    const x = recentB.length === 1 ? svgW / 2 : padX + (i / (recentB.length - 1)) * usableW;
    const y = padY + ((pt.ranking - minRank) / spanRank) * usableH;
    return { x, y, pt };
  });

  const pathA = pointsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const pathB = pointsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="w-full h-44 rounded-3xl overflow-hidden relative shadow-sm border border-blue-900 bg-[#0A2342] flex items-center px-10">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=2000&auto=format&fit=crop"
            alt="Compare Banner"
            fill
            sizes="100vw"
            className="object-cover opacity-30 mix-blend-overlay"
          />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-md text-white">
            <ArrowLeftRight className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-[10px] font-bold uppercase tracking-widest mb-2 border border-white/10">
              {getSportEmoji(sport)} {sport} Comparison
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              Compare <span className="text-[#FA2E72]">Athletes</span>
            </h1>
            <p className="text-blue-100 text-sm font-medium max-w-lg">Analyze and compare rankings, points, win rates, and historical timelines side-by-side.</p>
          </div>
        </div>
      </div>

      {/* Sport Selector */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {(['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer whitespace-nowrap
              ${sport === s ? 'bg-[#FA2E72] text-white border-transparent shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <span>{getSportEmoji(s)}</span>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Info Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-1">
              <span className="text-lg">👤</span> Athlete Comparison
            </h3>

            <div className="flex flex-col gap-4 text-xs font-medium text-slate-600">
              <p>Select any two athletes from the cached dataset to compare their profile stats and ranking history timelines.</p>
              <div className="p-3 bg-pink-50 rounded-2xl border border-pink-100 text-[#FA2E72] font-semibold text-xs">
                💡 Tip: Click on any athlete card above to change the selected player.
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* Player Selectors */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Selector A */}
              <div
                onClick={() => setSearchModalOpen('A')}
                className="w-full sm:w-1/2 border border-slate-200 hover:border-[#FA2E72] rounded-full p-2 pl-4 pr-6 flex items-center gap-4 transition-all shadow-xs bg-slate-50/50 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-slate-200 flex items-center justify-center">
                  <AthleteImage
                    src={playerA?.imageUrl}
                    alt={playerA?.name || 'A'}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                    fallbackLetter={playerA?.name.charAt(0) || 'A'}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold text-slate-900 truncate group-hover:text-[#FA2E72] transition-colors">
                    {playerA?.name || 'Select Player A'}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 truncate">
                    {playerA ? `${playerA.country} • Rank #${playerA.ranking}` : 'Click to search'}
                  </div>
                </div>
                <button className="text-xs text-[#FA2E72] font-bold">Change</button>
              </div>

              <div className="text-slate-300 font-extrabold text-xl px-2">VS</div>

              {/* Selector B */}
              <div
                onClick={() => setSearchModalOpen('B')}
                className="w-full sm:w-1/2 border border-slate-200 hover:border-indigo-600 rounded-full p-2 pl-4 pr-6 flex items-center gap-4 transition-all shadow-xs bg-slate-50/50 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-slate-200 flex items-center justify-center">
                  <AthleteImage
                    src={playerB?.imageUrl}
                    alt={playerB?.name || 'B'}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                    fallbackLetter={playerB?.name.charAt(0) || 'B'}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {playerB?.name || 'Select Player B'}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 truncate">
                    {playerB ? `${playerB.country} • Rank #${playerB.ranking}` : 'Click to search'}
                  </div>
                </div>
                <button className="text-xs text-indigo-600 font-bold">Change</button>
              </div>
            </div>
          </div>

          {/* Comparison Stats Section */}
          {playerA && playerB && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span>📈</span> Player Head-to-Head Comparison
              </h3>

              {/* Headers */}
              <div className="flex items-center justify-between px-2 sm:px-6">
                <div className="flex items-center gap-3 w-5/12">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-slate-200 flex items-center justify-center">
                    <AthleteImage
                      src={playerA.imageUrl}
                      alt="A"
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      fallbackLetter={playerA.name.charAt(0)}
                    />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-900 text-sm truncate">{playerA.name}</div>
                    <div className="text-[10px] font-semibold text-slate-500 truncate">{playerA.country}</div>
                  </div>
                </div>

                <div className="text-slate-300 font-bold text-xs">VS</div>

                <div className="flex items-center gap-3 justify-end w-5/12 text-right">
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-900 text-sm truncate">{playerB.name}</div>
                    <div className="text-[10px] font-semibold text-slate-500 truncate">{playerB.country}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-slate-200 flex items-center justify-center">
                    <AthleteImage
                      src={playerB.imageUrl}
                      alt="B"
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      fallbackLetter={playerB.name.charAt(0)}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Table */}
              <div className="flex flex-col text-sm">
                <div className="bg-slate-50 rounded-xl px-4 py-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Summary Statistics
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                  <div className="w-1/3 text-left font-bold text-slate-800">{playerA.age ? `${playerA.age} Yrs` : 'N/A'}</div>
                  <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Age</div>
                  <div className="w-1/3 text-right font-bold text-slate-800">{playerB.age ? `${playerB.age} Yrs` : 'N/A'}</div>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                  <div className="w-1/3 text-left font-bold text-slate-800">{playerA.country}</div>
                  <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Country</div>
                  <div className="w-1/3 text-right font-bold text-slate-800">{playerB.country}</div>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                  <div className="w-1/3 text-left font-bold text-slate-800">
                    {playerA.winRate !== undefined ? `${playerA.winRate}%` : 'N/A'}
                  </div>
                  <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Win %</div>
                  <div className="w-1/3 text-right font-bold text-slate-800">
                    {playerB.winRate !== undefined ? `${playerB.winRate}%` : 'N/A'}
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4 bg-pink-50/50 rounded-lg my-1">
                  <div className="w-1/3 text-left font-bold text-[#FA2E72]">#{playerA.ranking}</div>
                  <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Current Rank</div>
                  <div className="w-1/3 text-right font-bold text-indigo-600">#{playerB.ranking}</div>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100 px-4">
                  <div className="w-1/3 text-left font-bold text-[#FA2E72]">
                    #{playerA.careerHighRank || playerA.ranking}
                  </div>
                  <div className="w-1/3 text-center text-xs font-semibold text-[#14b8a6]">Career High Rank</div>
                  <div className="w-1/3 text-right font-bold text-indigo-600">
                    #{playerB.careerHighRank || playerB.ranking}
                  </div>
                </div>
              </div>

              {/* Ranking Timeline Comparison Chart */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Historical Ranking Comparison
                  </span>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#FA2E72]"></span> {playerA.name}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-600"></span> {playerB.name}</span>
                  </div>
                </div>

                <div className="w-full h-64 bg-slate-50 rounded-2xl border border-slate-100 relative p-4 flex flex-col justify-end">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>Rank #{minRank} (Top)</span>
                    <span>Higher Line = Better World Rank</span>
                  </div>

                  <div className="relative w-full h-44">
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-full overflow-visible pointer-events-none"
                      preserveAspectRatio="none"
                    >
                      {/* Player A Connected Line */}
                      {pathA && (
                        <path
                          d={pathA}
                          fill="none"
                          stroke="#FA2E72"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {/* Player B Connected Line */}
                      {pathB && (
                        <path
                          d={pathB}
                          fill="none"
                          stroke="#4F46E5"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>

                    {/* Dots Overlaid for Player A */}
                    <div className="absolute inset-0 pointer-events-none">
                      {pointsA.map((cp, i) => {
                        const leftPercent = (cp.x / svgW) * 100;
                        const topPercent = (cp.y / svgH) * 100;
                        return (
                          <div
                            key={`a-${i}`}
                            className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                          >
                            <span className="text-[9px] font-extrabold text-[#FA2E72] bg-white/90 backdrop-blur-xs px-1 rounded shadow-2xs border border-pink-100 -translate-y-4 whitespace-nowrap">
                              #{cp.pt.ranking}
                            </span>
                            <div className="w-3 h-3 rounded-full bg-[#FA2E72] border-2 border-white shadow-xs"></div>
                          </div>
                        );
                      })}

                      {/* Dots Overlaid for Player B */}
                      {pointsB.map((cp, i) => {
                        const leftPercent = (cp.x / svgW) * 100;
                        const topPercent = (cp.y / svgH) * 100;
                        return (
                          <div
                            key={`b-${i}`}
                            className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                          >
                            <div className="w-3 h-3 rounded-full bg-[#4F46E5] border-2 border-white shadow-xs"></div>
                            <span className="text-[9px] font-extrabold text-[#4F46E5] bg-white/90 backdrop-blur-xs px-1 rounded shadow-2xs border border-indigo-100 translate-y-4 whitespace-nowrap">
                              #{cp.pt.ranking}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Athlete Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Select Athlete for Player {searchModalOpen}
              </h3>
              <button
                onClick={() => setSearchModalOpen(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search athlete by name..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#FA2E72]"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
              {searching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 text-[#FA2E72] animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Type a name to search athletes...
                </div>
              ) : (
                searchResults.map((athlete) => (
                  <div
                    key={athlete.id}
                    onClick={() => selectAthlete(athlete)}
                    className="p-3 rounded-2xl hover:bg-pink-50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                        <AthleteImage
                          src={athlete.imageUrl}
                          alt={athlete.name}
                          width={32}
                          height={32}
                          className="object-cover"
                          fallbackLetter={athlete.name.charAt(0)}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{athlete.name}</div>
                        <div className="text-[11px] text-slate-400">{athlete.country}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-[#FA2E72]">Rank #{athlete.ranking}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-[#FA2E72] animate-spin" />
        <span className="text-xs text-slate-400">Loading compare tool...</span>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  );
}
