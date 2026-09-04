import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Renders entity artwork without destructive cropping.
 * A blurred cover layer fills the frame while the canonical artwork is
 * always fitted with object-contain, so portraits and unusual aspect ratios
 * remain fully visible on mobile and desktop.
 */
export default function AdaptiveArtwork({
  src,
  alt = '',
  loading = 'lazy',
  className = '',
  imageClassName = '',
  fallbackClassName = '',
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.16),transparent_64%)] ${fallbackClassName}`}>
        <ImageOff className="h-8 w-8 text-muted-foreground/25" />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 overflow-hidden bg-black/70 ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading={loading}
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-35 saturate-75"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        className={`absolute inset-0 z-[1] h-full w-full object-contain ${imageClassName}`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
