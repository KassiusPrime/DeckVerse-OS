// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Scanline Progress UI (Retro-Futuristic CRT Progress Indicator)
// ════════════════════════════════════════════════════════════════════════════

import React from "react";
import { Activity, Cpu, ShieldCheck, Zap } from "lucide-react";

export default function ScanlineProgress({
  current = 0,
  total = 100,
  label = "Processando registros do banco de dados...",
  status = "RUNNING",
  color = "primary" // primary | amber | emerald | red
}) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  const colorStyles = {
    primary: {
      border: "border-primary/50",
      bg: "bg-primary/10",
      barBg: "bg-primary",
      text: "text-primary",
      glow: "shadow-[0_0_15px_rgba(0,240,255,0.4)]"
    },
    amber: {
      border: "border-amber-500/50",
      bg: "bg-amber-950/20",
      barBg: "bg-amber-500",
      text: "text-amber-400",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.4)]"
    },
    emerald: {
      border: "border-emerald-500/50",
      bg: "bg-emerald-950/20",
      barBg: "bg-emerald-500",
      text: "text-emerald-400",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]"
    },
    red: {
      border: "border-red-500/50",
      bg: "bg-red-950/20",
      barBg: "bg-red-500",
      text: "text-red-400",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]"
    }
  };

  const style = colorStyles[color] || colorStyles.primary;

  return (
    <div className={`border ${style.border} ${style.bg} p-4 rounded-xl space-y-3 relative overflow-hidden backdrop-blur-md`}>
      {/* CRT Scanline overlay effect */}
      <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_2px,rgba(0,0,0,0.3)_2px,rgba(0,0,0,0.3)_4px)] opacity-60 z-10" />

      {/* Header Info */}
      <div className="flex items-center justify-between text-xs font-mono relative z-20">
        <div className="flex items-center gap-2">
          <Cpu className={`w-4 h-4 ${style.text} animate-pulse`} />
          <span className={`font-bold ${style.text} tracking-wider uppercase flex items-center gap-1.5`}>
            {label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground font-mono">
            [{current} / {total > 0 ? total : "∞"}]
          </span>
          <span className={`font-bold text-sm ${style.text}`}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-3 bg-black/60 rounded-full border border-border/60 overflow-hidden relative z-20">
        {/* Animated Bar */}
        <div
          className={`h-full ${style.barBg} ${style.glow} transition-all duration-300 ease-out scanline-progress-bar`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Sub-status indicators */}
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground relative z-20 pt-0.5">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-primary animate-spin" /> STATUS: {status}
        </span>
        <span className="flex items-center gap-1 text-primary/80">
          <Zap className="w-3 h-3 text-primary" /> CANONICAL DATA ENGINE ACTIVE
        </span>
      </div>
    </div>
  );
}
