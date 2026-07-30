import React from "react";
import { motion } from "framer-motion";
import { Swords, Shield, Zap, Heart } from "lucide-react";

const STAT_CONFIG = [
  { key: "attack", label: "ATK", icon: Swords, color: "text-red-400", barColor: "bg-red-500" },
  { key: "defense", label: "DEF", icon: Shield, color: "text-blue-400", barColor: "bg-blue-500" },
  { key: "speed", label: "SPD", icon: Zap, color: "text-yellow-400", barColor: "bg-yellow-500" },
  { key: "hp", label: "HP", icon: Heart, color: "text-green-400", barColor: "bg-green-500" },
];

export default function StatsPanel({ attack, defense, speed, hp }) {
  const stats = { attack, defense, speed, hp };
  const maxStat = 300;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 backdrop-blur-sm p-5 space-y-4">
      <h3 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
        Base Stats
      </h3>
      <div className="space-y-3">
        {STAT_CONFIG.map((stat, i) => {
          const value = stats[stat.key] || 0;
          const percentage = Math.min((value / maxStat) * 100, 100);
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="w-8 text-xs font-heading font-bold tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${stat.barColor}/70`}
                />
              </div>
              <span className="w-10 text-right text-sm font-body font-bold text-foreground tabular-nums">
                {value}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}