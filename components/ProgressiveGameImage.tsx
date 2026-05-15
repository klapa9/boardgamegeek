'use client';

import { useEffect, useState } from 'react';

type ProgressiveGameImageProps = {
  alt: string;
  className: string;
  thumbnailSrc?: string | null;
  fullSrc?: string | null;
};

export default function ProgressiveGameImage({
  alt,
  className,
  thumbnailSrc,
  fullSrc
}: ProgressiveGameImageProps) {
  const thumbnail = thumbnailSrc ?? null;
  const full = fullSrc ?? thumbnail ?? null;
  const shouldLayer = Boolean(thumbnail && full && thumbnail !== full);
  const [fullLoaded, setFullLoaded] = useState(!shouldLayer);

  useEffect(() => {
    setFullLoaded(!shouldLayer);
  }, [full, shouldLayer]);

  if (!full) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {shouldLayer && (
        <img
          src={thumbnail!}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${fullLoaded ? 'opacity-0' : 'opacity-100'}`}
        />
      )}
      <img
        key={full}
        src={full}
        alt={alt}
        onLoad={() => setFullLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${shouldLayer && !fullLoaded ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}
