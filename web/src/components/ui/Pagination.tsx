'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PageItem = number | 'gap-start' | 'gap-end';

/** Always 7 slots once there are more than 7 pages, so the bar doesn't jump around. */
function getPageItems(page: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap-end', total];
  if (page >= total - 3) return [1, 'gap-start', total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'gap-start', page - 1, page, page + 1, 'gap-end', total];
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Prev / Next with "Page X of Y" on phones; numbered pages from tablet up. */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const navButton =
    'h-10 sm:h-9 px-3.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-6">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={navButton}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Prev</span>
      </button>

      <span className="sm:hidden px-2 text-xs font-bold text-slate-600" aria-live="polite">
        Page {page} of {totalPages}
      </span>

      <div className="hidden sm:flex items-center gap-1">
        {getPageItems(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={`h-9 min-w-9 px-2 rounded-full text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                item === page
                  ? 'bg-[#FA2E72] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:shadow-xs hover:text-slate-900'
              }`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="w-6 text-center text-slate-400 text-xs font-bold" aria-hidden="true">
              …
            </span>
          )
        )}
      </div>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={navButton}
        aria-label="Next page"
      >
        <span>Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
