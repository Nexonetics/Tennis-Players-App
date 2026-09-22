import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PlayerClientPage from './[id]/PlayerClientPage';

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-[#FA2E72] animate-spin" />
          <span className="text-xs text-[#FA2E72]">Loading player details...</span>
        </div>
      }
    >
      <PlayerClientPage />
    </Suspense>
  );
}
