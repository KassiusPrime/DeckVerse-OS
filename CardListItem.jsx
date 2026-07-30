import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RarityBadge, RoleBadge } from "./RarityBadge";

export default function CardListItem({ card, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link
        to={`/card/${card.id}`}
        className="group block rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300 overflow-hidden"
      >
        <div className="aspect-[3/4] bg-muted/20 overflow-hidden relative">
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-heading text-3xl font-bold text-muted-foreground/20">?</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="p-3 space-y-2">
          <div>
            <h3 className="font-body text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {card.name}
            </h3>
            <p className="text-[10px] font-heading text-muted-foreground tracking-wider">{card.card_id}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <RarityBadge rarity={card.rarity} />
            <RoleBadge role={card.role} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}