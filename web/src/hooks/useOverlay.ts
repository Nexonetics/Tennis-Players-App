'use client';

import { useEffect, useRef } from 'react';

/**
 * Shared behaviour for modal overlays (drawers, sheets, full-screen search):
 * locks background scrolling while open and closes on Escape.
 */
export function useOverlay(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);
}
