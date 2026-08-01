// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Retro CRT Command Terminal Overlay
// Features CRT scanline effects, phosphor flicker, retro typography & live user action logging
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Terminal as TerminalIcon, Minimize2, Maximize2, Trash2, Cpu, Activity } from "lucide-react";

// Global listener helper to push logs to the CRT overlay from anywhere
export function pushCRTLog(message, category = "SYS") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("crt-terminal-log", {
        detail: { message, category, time: new Date().toLocaleTimeString() }
      })
    );
  }
}

export default function CRTTerminalOverlay() {
  const [logs, setLogs] = useState([
    { id: 1, message: "DECKVERSE OS v2.5 SYSTEM INITIALIZED", category: "BOOT", time: new Date().toLocaleTimeString() },
    { id: 2, message: "CRITICAL CORE READY — WIKI+IA ENRICHMENT ONLINE", category: "OK", time: new Date().toLocaleTimeString() }
  ]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const location = useLocation();
  const logsEndRef = useRef(null);

  // Escuta rota atual para emitir logs automáticos imersivos
  useEffect(() => {
    const routeMap = {
      "/gacha": "Accessing Gacha Zone & Summoning Matrix...",
      "/collections": "Loading Card Deck & Multiverse Collections...",
      "/arena": "Initializing Tactical Battle Arena Subsystem...",
      "/roster": "Querying Player Roster & Card Affinity Indexes...",
      "/market": "Connecting to Player Card Exchange & Market...",
      "/store": "Opening Multiverse Emporium & Item Store...",
      "/lore": "Retrieving Archives from Fandom Lore Database...",
      "/fandom": "Launching Fandom AI Importer Pipeline...",
      "/synergy": "Calculating Deck Synergies & Team Affinities...",
      "/upgrade": "Opening Cybernetic Card Forge & Upgrader...",
      "/quests": "Syncing Daily Missions & Multiverse Quests...",
      "/guilds": "Accessing Guild Hall & Faction Command...",
      "/admin": "SECURITY OVERRIDE — Accessing OS Terminal..."
    };

    const actionText = routeMap[location.pathname];
    if (actionText) {
      pushCRTLog(actionText, "NAV");
    }
  }, [location.pathname]);

  // Event listener para logs customizados do sistema
  useEffect(() => {
    const handleLogEvent = (e) => {
      const { message, category, time } = e.detail || {};
      if (message) {
        setLogs((prev) => [
          ...prev.slice(-49), // Mantém no máximo 50 logs recentes
          { id: Date.now() + Math.random(), message, category: category || "SYS", time: time || new Date().toLocaleTimeString() }
        ]);
      }
    };

    window.addEventListener("crt-terminal-log", handleLogEvent);
    return () => window.removeEventListener("crt-terminal-log", handleLogEvent);
  }, []);

  // Auto scroll para o final dos logs
  useEffect(() => {
    if (!isMinimized && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isMinimized]);

  return (
    <div className="fixed bottom-3 left-3 z-[9999] font-mono pointer-events-auto">
      {/* Botão Minimizado CRT */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="group relative flex items-center gap-2 px-3 py-1.5 bg-black/90 text-emerald-400 border border-emerald-500/50 rounded shadow-lg hover:border-emerald-400 transition-all backdrop-blur-md"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <TerminalIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold tracking-widest uppercase">
            CRT TERMINAL [{logs.length}]
          </span>
          <Maximize2 className="w-3 h-3 text-emerald-500 group-hover:text-emerald-300" />
        </button>
      ) : (
        /* Janela Expandida CRT Overlay com efeito Scanlines */
        <div className="w-[320px] sm:w-[420px] bg-black/95 border-2 border-emerald-500/60 rounded-md shadow-[0_0_20px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col backdrop-blur-xl transition-all">
          {/* Top Bar do Terminal */}
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-3 py-1.5 flex items-center justify-between text-emerald-400 text-[10px] font-bold tracking-wider">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>DECKVERSE_CRT_MONITOR_v2.5</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLogs([])}
                title="Limpar logs"
                className="p-1 hover:bg-emerald-900/50 rounded text-emerald-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimizar"
                className="p-1 hover:bg-emerald-900/50 rounded text-emerald-400 transition-colors"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* CRT Screen Area com linhas de varredura (Scanlines) e Flicker */}
          <div className="relative p-3 h-48 overflow-y-auto space-y-1.5 text-[11px] leading-relaxed select-text scrollbar-thin scrollbar-thumb-emerald-800/50">
            {/* Efeito Visual de Scanlines em sobreposição */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-60 z-10" />

            {logs.length === 0 ? (
              <div className="text-emerald-700 italic text-[10px]">Aguardando ações do sistema...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-1.5 font-mono text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.8)]">
                  <span className="text-emerald-600 text-[9px] shrink-0">[{log.time}]</span>
                  <span className="text-cyan-400 font-bold shrink-0">[{log.category}]</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Prompt de comando de fundo */}
          <div className="border-t border-emerald-500/30 px-3 py-1 bg-black/90 flex items-center gap-2 text-[10px] text-emerald-500">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="font-bold">&gt; EXEC_STATUS: READY</span>
            <span className="ml-auto text-[9px] text-emerald-600">CRT_MONITOR</span>
          </div>
        </div>
      )}
    </div>
  );
}
