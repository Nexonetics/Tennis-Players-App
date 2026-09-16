import React, { use, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getAthletesBySport } from '@/lib/localDataService';
import PlayerClientPage from './PlayerClientPage';

export async function generateStaticParams() {
  try {
    const sports = ['Tennis', 'Table Tennis', 'Football', 'Basketball'] as const;
    const ids = new Set<string>();
    for (const s of sports) {
      const list = await getAthletesBySport(s);
      list.forEach((a) => {
        if (a.id) ids.add(String(a.id));
      });
    }
    return Array.from(ids).map((id) => ({ id }));
  } catch (e) {
    console.error('Error generating static params for player page:', e);
    return [{ id: '1' }];
  }
}

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-[#FA2E72] animate-spin" />
          <span className="text-xs text-[#FA2E72]">Loading player details...</span>
        </div>
      }
    >
      <PlayerClientPage playerId={resolvedParams.id} />
    </Suspense>
  );
}
