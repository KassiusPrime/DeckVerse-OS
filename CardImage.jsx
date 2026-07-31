import React from "react";
import { motion } from "framer-motion";

const RARITY_GLOW = {
  C: "shadow-muted/20",
  UC: "shadow-green-500/20",
  R: "shadow-blue-500/30",
  SR: "shadow-purple-500/30",
  SSR: "shadow-amber-400/40",
  UR: "shadow-red-500/40",
  LR: "shadow-cyan-400/50",
  MR: "shadow-fuchsia-500/50",
  Common: "shadow-muted/20",
  Uncommon: "shadow-green-500/20",
  Rare: "shadow-blue-500/30",
  Epic: "shadow-purple-500/30",
  Legendary: "shadow-amber-400/40",
  Mythic: "shadow-red-500/40",
};

const RARITY_BORDER = {
  C: "border-muted-foreground/30",
  UC: "border-green-500/40",
  R: "border-blue-500/50",
  SR: "border-purple-500/50",
  SSR: "border-amber-400/60",
  UR: "border-red-500/60",
  LR: "border-cyan-400/70",
  MR: "border-fuchsia-500/70",
  Common: "border-muted-foreground/30",
  Uncommon: "border-green-500/40",
  Rare: "border-blue-500/50",
  Epic: "border-purple-500/50",
  Legendary: "border-amber-400/60",
  Mythic: "border-red-500/60",
};

export default function CardImage({ imageUrl, name, rarity = "Common" }) {
  const glow = RARITY_GLOW[rarity] || RARITY_GLOW.Common;
  const border = RARITY_BORDER[rarity] || RARITY_BORDER.Common;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative group"
    >
      {/* Dynamic ambient glow */}
      <div className={`absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className={`relative rounded-xl overflow-hidden border-2 ${border} shadow-2xl ${glow} aspect-[3/4] bg-card/80 backdrop-blur-sm`}>
        
        {/* Cyber Vector Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10 pointer-events-none opacity-40" />

        {/* HUD Vector Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-primary z-20 pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-primary z-20 pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-primary z-20 pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-primary z-20 pointer-events-none" />

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name || "Card Image"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Fallback to vector model placeholder if link is broken
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Vector HUD Fallback Frame when no image or image error */}
        <div
          className={`w-full h-full ${imageUrl ? 'hidden' : 'flex'} flex-col items-center justify-center p-4 bg-gradient-to-b from-card via-background to-card text-center relative`}
        >
          {/* Cyber Vector Grid SVG background */}
          <svg className="absolute inset-0 w-full h-full opacity-15 stroke-primary" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="vector-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#vector-grid)" />
          </svg>

          <div className="relative z-10 space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full border border-primary/40 flex items-center justify-center bg-primary/10 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
              <span className="font-heading text-xs font-black tracking-wider text-primary">VECTOR</span>
            </div>
            <p className="text-[11px] font-heading font-bold text-foreground truncate max-w-[140px]">{name || "NO NAME"}</p>
            <span className="inline-block text-[9px] font-mono text-muted-foreground border border-border/40 px-2 py-0.5 rounded bg-black/40">
              HUD MODEL :: {rarity}
            </span>
          </div>
        </div>

        {/* Gradient overlays for cinematic depth */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />
      </div>
    </motion.div>
  );
}