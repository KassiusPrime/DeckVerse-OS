import React from "react";
import { motion } from "framer-motion";
import { Flame, Shield, Sparkles } from "lucide-react";

const SKILL_TYPE_CONFIG = {
  Active: { icon: Flame, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/20" },
  Passive: { icon: Shield, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/20" },
  Ultimate: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/20" },
};

export default function SkillsList({ skills }) {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
        Abilities
      </h3>
      <div className="space-y-2">
        {skills.map((skill, i) => {
          const config = SKILL_TYPE_CONFIG[skill.type] || SKILL_TYPE_CONFIG.Active;
          const Icon = config.icon;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              className={`flex items-start gap-3 p-3 rounded-xl border ${config.border} ${config.bg} backdrop-blur-sm`}
            >
              <div className={`w-9 h-9 shrink-0 rounded-lg bg-muted/30 flex items-center justify-center ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm font-bold text-foreground">{skill.name}</span>
                  <span className={`text-[10px] font-heading font-bold tracking-wider uppercase ${config.color}`}>
                    {skill.type}
                  </span>
                </div>
                <p className="text-xs font-body text-muted-foreground leading-relaxed mt-0.5">
                  {skill.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}