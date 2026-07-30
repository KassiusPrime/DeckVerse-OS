const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { motion } from "framer-motion";
import { Swords, Terminal, RefreshCw } from "lucide-react";
import Navbar from "@/components/wiki/Navbar";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const MOCK_LOGS = [
  { id: "BT-0041", winner: "void_hunter", loser: "dawn_keeper", details: "Vexor the Hollow used Soul Harvest to eliminate Seraphina Dawnkeeper. Critical hit scored.", time: "3m ago" },
  { id: "BT-0040", winner: "stormcaller99", loser: "arcane_mage7", details: "Kaelith Stormfang activated Storm Surge, dealing AOE damage to entire enemy party.", time: "11m ago" },
  { id: "BT-0039", winner: "frost_witch", loser: "shadow_rogue", details: "Lyra Frostweaver used Absolute Zero — target frozen for 2 turns. Match concluded.", time: "28m ago" },
  { id: "BT-0038", winner: "ironwall_fan", loser: "void_hunter", details: "Grommash Ironwall activated Stone Barrier, absorbing 40% damage and outlasting opponent.", time: "45m ago" },
  { id: "BT-0037", winner: "warden_zero", loser: "stormcaller99", details: "Underdog victory. Warden_Zero's Emberis used Combustion Aura to burn opponent to zero HP.", time: "1h ago" },
  { id: "BT-0036", winner: "dawn_keeper", loser: "ironwall_fan", details: "Seraphina Dawnkeeper healed party to full, then Divine Blessing sealed the match.", time: "2h ago" },
  { id: "BT-0035", winner: "shadow_rogue", loser: "warden_zero", details: "Shadow operative executed a perfect Void Step combo — target eliminated before retaliation.", time: "3h ago" },
  { id: "BT-0034", winner: "arcane_mage7", loser: "frost_witch", details: "Mage counter-play: Glacial Cascade was reflected. Frost_Witch eliminated by own ability.", time: "4h ago" },
];

export default function BattleHistory() {
  const qc = useQueryClient();
  const { data: logs = [] } = useQuery({
    queryKey: ["battle-logs"],
    queryFn: () => db.entities.BattleLog.list("-created_date", 50),
  });

  const { pullY, refreshing } = usePullToRefresh(async () => {
    await qc.refetchQueries({ queryKey: ["battle-logs"] });
  });

  const displayLogs = logs.length > 0 ? logs : MOCK_LOGS;

  return (
    <div className="min-h-screen bg-background">
      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{ transform: `translateY(${refreshing ? 56 : pullY}px)`, transition: refreshing ? "transform 0.2s" : "none" }}>
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-xs font-heading font-bold">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "ATUALIZANDO..." : "SOLTE PARA ATUALIZAR"}
          </div>
        </div>
      )}
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 border border-destructive/20 bg-destructive/10 flex items-center justify-center">
              <Swords className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">BATTLE FEED</h1>
              <p className="text-xs font-body text-muted-foreground tracking-widest">LIVE COMBAT LOG — TACTICAL OUTPUT</p>
            </div>
          </div>
        </motion.div>

        {/* Terminal-style log */}
        <div className="border border-border/40 bg-card/30 font-mono">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
            <Terminal className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-heading tracking-widest text-primary">BATTLE_LOG_STREAM.exe</span>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-body text-green-400">LIVE</span>
            </div>
          </div>

          <div className="divide-y divide-border/20">
            {displayLogs.map((log, i) => (
              <motion.div
                key={log.id || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="px-4 py-3 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-heading text-muted-foreground/50 tabular-nums shrink-0 mt-0.5 w-16">
                    {log.id || `BT-${String(displayLogs.length - i).padStart(4, "0")}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-heading font-bold text-green-400">{log.winner_username || log.winner}</span>
                      <span className="text-[10px] text-muted-foreground">defeated</span>
                      <span className="text-xs font-heading font-bold text-red-400">{log.loser_username || log.loser}</span>
                    </div>
                    <p className="text-xs font-body text-muted-foreground leading-relaxed">{log.details}</p>
                  </div>
                  <span className="text-[10px] font-body text-muted-foreground/40 shrink-0 tabular-nums">{log.time || ""}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}