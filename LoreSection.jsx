import React from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

export default function LoreSection({ lore }) {
  if (!lore) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="space-y-3"
    >
      <h3 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5" />
        Lore
      </h3>
      <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
        <p className="text-sm font-body text-muted-foreground leading-relaxed italic">
          "{lore}"
        </p>
      </div>
    </motion.div>
  );
}