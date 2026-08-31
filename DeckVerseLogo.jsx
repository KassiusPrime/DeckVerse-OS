import React from "react";

const SIZE = {
  sm: { mark: "h-9 w-9", title: "text-sm", tagline: "text-[8px]" },
  md: { mark: "h-11 w-11", title: "text-base", tagline: "text-[9px]" },
  lg: { mark: "h-16 w-16", title: "text-2xl sm:text-3xl", tagline: "text-[10px]" },
};

export default function DeckVerseLogo({ size = "md", showTagline = true, className = "", compact = false }) {
  const styles = SIZE[size] || SIZE.md;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} aria-label="DeckVerse">
      <div className={`${styles.mark} shrink-0`}>
        <svg viewBox="0 0 64 64" role="img" aria-hidden="true" className="h-full w-full">
          <defs>
            <linearGradient id="deckverse-mark-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C5CFF" />
              <stop offset="1" stopColor="#20D7C7" />
            </linearGradient>
          </defs>
          <path
            d="M18 5h28a9 9 0 0 1 9 9v36a9 9 0 0 1-9 9H18a9 9 0 0 1-9-9V14a9 9 0 0 1 9-9Z"
            fill="#0B111A"
            stroke="url(#deckverse-mark-gradient)"
            strokeWidth="3"
          />
          <path d="M18 20 32 45 46 20" fill="none" stroke="url(#deckverse-mark-gradient)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 32h8M44 32h8" stroke="#F5F7FA" strokeOpacity=".62" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3.5" fill="#FFB74A" />
        </svg>
      </div>

      {!compact && (
        <div className="min-w-0 leading-none">
          <div className={`${styles.title} font-black tracking-[-0.04em] text-foreground`}>
            DECK<span className="text-primary">VERSE</span>
          </div>
          {showTagline && (
            <div className={`${styles.tagline} mt-1 font-mono font-semibold uppercase tracking-[0.2em] text-foreground/80`}>
              Multiverse Archive
            </div>
          )}
        </div>
      )}
    </div>
  );
}
