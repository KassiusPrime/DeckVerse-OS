import React from 'react';

const SIZE = {
  sm: { mark: 'h-9 w-9', title: 'text-[15px] sm:text-base', tagline: 'text-[7px]' },
  md: { mark: 'h-11 w-11', title: 'text-lg', tagline: 'text-[8px]' },
  lg: { mark: 'h-16 w-16', title: 'text-2xl sm:text-3xl', tagline: 'text-[9px]' },
};

export default function DeckVerseLogo({ size = 'md', showTagline = true, className = '', compact = false }) {
  const styles = SIZE[size] || SIZE.md;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} aria-label="DeckVerse OS">
      <img
        src="/assets/brand/deckverse-mark.svg"
        alt=""
        aria-hidden="true"
        className={`${styles.mark} shrink-0 rounded-[22%] object-contain drop-shadow-[0_0_12px_rgba(20,233,242,.25)]`}
      />

      {!compact && (
        <div className="min-w-0 leading-none">
          <div className={`${styles.title} whitespace-nowrap font-orbitron font-extrabold uppercase tracking-[.16em] text-[#16eef4] [text-shadow:0_0_16px_rgba(22,238,244,.18)]`}>
            DECKVERSE <span className="text-foreground">OS</span>
          </div>
          {showTagline && (
            <div className={`${styles.tagline} mt-1.5 whitespace-nowrap font-mono font-semibold uppercase tracking-[.28em] text-foreground/65`}>
              Multiverse Archive
            </div>
          )}
        </div>
      )}
    </div>
  );
}
