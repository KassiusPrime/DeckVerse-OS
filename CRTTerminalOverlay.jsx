import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, Cpu, Maximize2, Minimize2, Power, Terminal as TerminalIcon, Trash2 } from "lucide-react";

export function pushCRTLog(message, category = "SYS") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("crt-terminal-log", {
      detail: { message, category, time: new Date().toLocaleTimeString() }
    }));
  }
}

export default function CRTTerminalOverlay() {
  const [isDisabled, setIsDisabled] = useState(() => typeof window !== "undefined" && localStorage.getItem("deckverse_crt_disabled") === "true");
  const [logs, setLogs] = useState([
    { id: 1, message: "DeckVerse inicializado", category: "BOOT", time: new Date().toLocaleTimeString() },
    { id: 2, message: "Ferramentas administrativas prontas", category: "OK", time: new Date().toLocaleTimeString() }
  ]);
  const [isMinimized, setIsMinimized] = useState(true);
  const location = useLocation();
  const logsEndRef = useRef(null);

  const togglePower = (state) => {
    const nextState = typeof state === "boolean" ? state : !isDisabled;
    setIsDisabled(nextState);
    if (typeof window !== "undefined") {
      if (nextState) localStorage.setItem("deckverse_crt_disabled", "true");
      else localStorage.removeItem("deckverse_crt_disabled");
    }
  };

  useEffect(() => {
    const routeMap = {
      "/collections": "Catálogo de coleções aberto",
      "/characters": "Catálogo de personagens aberto",
      "/items": "Catálogo de itens aberto",
      "/bosses": "Catálogo de bosses aberto",
      "/my-collection": "Acervo do usuário aberto",
      "/admin": "Painel administrativo aberto",
      "/fandom": "Importador de referências aberto",
    };
    const actionText = routeMap[location.pathname];
    if (actionText) pushCRTLog(actionText, "NAV");
  }, [location.pathname]);

  useEffect(() => {
    const handleLogEvent = (event) => {
      const { message, category, time } = event.detail || {};
      if (!message) return;
      setLogs((prev) => [
        ...prev.slice(-49),
        { id: Date.now() + Math.random(), message, category: category || "SYS", time: time || new Date().toLocaleTimeString() }
      ]);
    };
    window.addEventListener("crt-terminal-log", handleLogEvent);
    return () => window.removeEventListener("crt-terminal-log", handleLogEvent);
  }, []);

  useEffect(() => {
    if (!isMinimized && logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs, isMinimized]);

  // The CRT is an administrative desktop utility. Hiding its floating launcher
  // below the sm breakpoint prevents it from covering BottomNav and catalog cards.
  if (isDisabled) {
    return (
      <div className="fixed bottom-3 left-3 z-[9999] hidden font-mono pointer-events-auto sm:block">
        <button onClick={() => togglePower(false)} title="Ligar terminal CRT" className="flex items-center gap-1.5 rounded border border-emerald-900/60 bg-black/80 p-1.5 text-[10px] text-emerald-600 shadow-md backdrop-blur-md transition-all hover:border-emerald-500 hover:text-emerald-400">
          <Power className="h-3.5 w-3.5" /><span className="font-bold">Ligar CRT</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-[9999] hidden font-mono pointer-events-auto sm:block">
      {isMinimized ? (
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(false)} className="group relative flex items-center gap-2 rounded border border-emerald-500/50 bg-black/90 px-3 py-1.5 text-emerald-400 shadow-lg backdrop-blur-md transition-all hover:border-emerald-400">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <TerminalIcon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">CRT [{logs.length}]</span>
            <Maximize2 className="h-3 w-3 text-emerald-500 group-hover:text-emerald-300" />
          </button>
          <button onClick={() => togglePower(true)} title="Desligar terminal CRT" className="rounded border border-red-800/40 bg-black/90 p-1.5 text-red-400 shadow-lg backdrop-blur-md transition-all hover:border-red-500"><Power className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <div className="flex w-[420px] flex-col overflow-hidden rounded-md border-2 border-emerald-500/60 bg-black/95 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-emerald-500/40 bg-emerald-950/80 px-3 py-1.5 text-[10px] font-bold tracking-wider text-emerald-400">
            <div className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5" /><span>DECKVERSE_CRT_MONITOR</span></div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setLogs([])} title="Limpar logs" className="rounded p-1 text-emerald-400 hover:bg-emerald-900/50"><Trash2 className="h-3 w-3" /></button>
              <button onClick={() => setIsMinimized(true)} title="Minimizar" className="rounded p-1 text-emerald-400 hover:bg-emerald-900/50"><Minimize2 className="h-3 w-3" /></button>
              <button onClick={() => togglePower(true)} title="Desligar terminal CRT" className="ml-1 rounded border border-red-800/30 p-1 text-red-400 hover:bg-red-950/80"><Power className="h-3 w-3" /></button>
            </div>
          </div>
          <div className="relative h-48 space-y-1.5 overflow-y-auto p-3 text-[11px] leading-relaxed">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-45" />
            {logs.length === 0 ? <div className="text-[10px] italic text-emerald-700">Aguardando ações...</div> : logs.map((log) => <div key={log.id} className="flex items-start gap-1.5 text-emerald-400"><span className="shrink-0 text-[9px] text-emerald-600">[{log.time}]</span><span className="shrink-0 font-bold text-cyan-400">[{log.category}]</span><span className="break-all">{log.message}</span></div>)}
            <div ref={logsEndRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-emerald-500/30 bg-black/90 px-3 py-1 text-[10px] text-emerald-500"><Activity className="h-3 w-3 text-emerald-400" /><span className="font-bold">STATUS: PRONTO</span><span className="ml-auto text-[9px] text-emerald-600">CRT_MONITOR</span></div>
        </div>
      )}
    </div>
  );
}
