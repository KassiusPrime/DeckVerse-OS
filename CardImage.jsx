import React from "react";
import { motion } from "framer-motion";

const RARITY_GLOW = {
  Common: "shadow-muted/20",
  Uncommon: "shadow-green-500/20",
  Rare: "shadow-blue-500/30",
  Epic: "shadow-purple-500/30",
  Legendary: "shadow-amber-400/40",
  Mythic: "shadow-red-500/40",
};

const RARITY_BORDER = {
  Common: "border-muted-foreground/20",
  Uncommon: "border-green-500/30",
  Rare: "border-blue-500/40",
  Epic: "border-purple-500/40",
  Legendary: "border-amber-400/50",
  Mythic: "border-red-500/50",
};

export default function CardImage({ imageUrl, name, rarity = "Common" }) {
  const glow = RARITY_GLOW[rarity] || RARITY_GLOW.Common;
  const border = RARITY_BORDER[rarity] || RARITY_BORDER.Common;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      {/* Glow effect */}
      <div className={`absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent blur-2xl opacity-60`} />

      <div
        className={`relative rounded-2xl overflow-hidden border-2 ${border} shadow-2xl ${glow} aspect-[3/4] bg-muted/30`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center">
                <span className="font-heading text-2xl font-bold text-muted-foreground/40">?</span>
              </div>
              <p className="text-xs font-body text-muted-foreground/40 tracking-wide uppercase">No Image</p>
            </div>
          </div>
        )}

        {/* Top gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
    </motion.div>
  );
}