'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface AthleteImageProps {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackLetter: string;
  /** Font size classes for the initial shown when there is no usable image. */
  fallbackClassName?: string;
  /** Preload when this image is the page's largest above-the-fold element. */
  preload?: boolean;
}

/**
 * Athlete/team photo with a gradient initial as fallback. The failure is tracked
 * per `src`, so a component that is re-used for a different athlete retries the
 * new image instead of staying stuck on the fallback.
 */
export function AthleteImage({
  src,
  alt,
  width,
  height,
  className,
  fallbackLetter,
  fallbackClassName = 'text-lg sm:text-xl',
  preload = false,
}: AthleteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full bg-gradient-to-br from-pink-400 to-rose-600 text-white font-bold flex items-center justify-center ${fallbackClassName}`}
      >
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
      preload={preload}
      onError={() => setFailedSrc(src)}
    />
  );
}
