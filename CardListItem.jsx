import React, { useState } from "react";
import { motion } from "framer-motion";
import { RarityBadge } from "./RarityBadge";
import CardModalDrawer from "./components/CardModalDrawer";
import { Globe, Layers } from "lucide-react";

export default function CardListItem({ card, index = 0 }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!card) return null;

  const displayImage = card.img_custom || card.img_oficial || card.image_url || "";
  const collectionCode = card.collection_id || card.series || "MULTIVERSE";
  const universeName = card.universe || (collectionCode === "NAR" ? "Anime & Mangá" : collectionCode === "MVC" ? "Quadrinhos & HQs" : "Multiverso");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
        onClick={() => setIsModalOpen(true)}
        className="group relative block rounded-xl border border-primary/20 bg-card/60 hover:bg-card/90 hover:border-primary/80 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(234,88,12,0.15)] overflow-hidden cursor-pointer"
      >
        {/* Clean Front Visual: Image */}
        <div className="aspect-[3/4] bg-muted/20 overflow-hidden relative">
          {displayImage ? (
            <img
              src={displayImage}
              alt={card.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/40">
              <span className="font-heading text-3xl font-bold text-muted-foreground/30">?</span>
            </div>
          )}

          {/* Top Overlays: Collection Code & Universe */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
            <span className="font-mono text-[10px] font-bold text-primary px-2 py-0.5 bg-background/90 border border-primary/40 rounded-sm shadow-sm flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> {collectionCode}
            </span>

            <span className="font-mono text-[9px] text-muted-foreground px-2 py-0.5 bg-background/80 backdrop-blur-sm border border-border/40 rounded-sm flex items-center gap-1">
              <Globe className="w-2.5 h-2.5 text-primary" /> {universeName}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Clean Front Info: Name & Rarity */}
        <div className="p-3 relative flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {card.name}
            </h3>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider truncate">
              {card.card_id}
            </p>
          </div>
          <RarityBadge rarity={card.rarity} />
        </div>
      </motion.div>

      {/* Modal / Drawer on Click */}
      <CardModalDrawer
        card={card}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
