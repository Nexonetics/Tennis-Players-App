'use client';

import { useCallback, useState } from 'react';

/**
 * Tracks an element's rendered width. Returns a callback ref (works for
 * conditionally-rendered elements) and the latest width in px (0 until measured).
 */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);

  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
