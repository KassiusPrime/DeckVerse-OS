import React from 'react';

export default function DeckVerseLogo({ size = "md", showTagline = true, animated = true, className = "" }) {
  // Dimensions based on size
  const scaleClass = size === "sm" ? "scale-75 origin-left" : size === "lg" ? "scale-110 sm:scale-125" : "scale-100";

  return (
    <div className={`flex items-center gap-2.5 select-none ${scaleClass} ${className}`}>
      {/* ─── GLIFO CENTRAL: CARTA DIGITAL TÁTICA E NEXUS HEXÁGONO ─── */}
      <div className="relative w-9 h-11 shrink-0 flex items-center justify-center">
        {/* Glow de fundo Vantablack/Cyber */}
        <div className="absolute -inset-1 rounded-sm bg-gradient-to-r from-[#00f0ff]/20 via-[#b400ff]/30 to-[#ff003c]/20 blur-sm opacity-75" />
        
        {/* SVG da Carta Tática + Circuito + Hexágono Rachado */}
        <svg 
          viewBox="0 0 36 44" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
        >
          {/* Moldura da Carta Tática em Ciano Neon */}
          <rect 
            x="1.5" 
            y="1.5" 
            width="33" 
            height="41" 
            rx="3" 
            fill="#030305" 
            stroke="#00f0ff" 
            strokeWidth="1.5" 
          />

          {/* Linhas Geométricas de Circuito */}
          <path d="M 1.5 8 L 7 8 L 10 11" stroke="#00f0ff" strokeWidth="0.8" opacity="0.8" />
          <path d="M 34.5 36 L 29 36 L 26 33" stroke="#00f0ff" strokeWidth="0.8" opacity="0.8" />
          <circle cx="10" cy="11" r="1" fill="#00f0ff" />
          <circle cx="26" cy="33" r="1" fill="#00f0ff" />

          {/* Hexágono Tático (Nexus) no centro */}
          <polygon 
            points="18,12 26,16.5 26,25.5 18,30 10,25.5 10,16.5" 
            fill="#080810" 
            stroke="#00f0ff" 
            strokeWidth="1.2" 
          />

          {/* Vórtice / Rachadura de Anomalia Dimensional (Roxo Gema #b400ff e Vermelho Alerta #ff003c) */}
          <g className={animated ? "anomaly-text" : ""}>
            {/* Vórtex Roxo/Vermelho vazando */}
            <path 
              d="M 17 14 L 19 22 L 15 28 L 21 27 L 18 18 Z" 
              fill="url(#anomaly-gradient)" 
            />
            {/* Linhas de Rachadura */}
            <path d="M 18 12 L 17 17 L 20 22 L 16 28" stroke="#ff003c" strokeWidth="1" strokeLinecap="round" />
            <path d="M 18 18 L 24 16" stroke="#b400ff" strokeWidth="0.8" />
            <path d="M 17 23 L 11 25" stroke="#00f0ff" strokeWidth="0.8" />
          </g>

          {/* Definições de Gradiente Tático */}
          <defs>
            <linearGradient id="anomaly-gradient" x1="10" y1="12" x2="26" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b400ff" />
              <stop offset="0.6" stopColor="#ff003c" />
              <stop offset="1" stopColor="#00f0ff" />
            </linearGradient>
          </defs>
        </svg>

        {/* LED de pulso na carta */}
        <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#00f0ff] animate-ping" />
      </div>

      {/* ─── TIPOGRAFIA DA LOGO ─── */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          {/* DECKVERSE em Orbitron Ciano Neon */}
          <span 
            className="font-['Orbitron'] font-black tracking-wider text-base sm:text-lg text-[#00f0ff] drop-shadow-[0_0_10px_rgba(0,240,255,0.7)]"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            DECK<span className="text-white">VERSE</span>
          </span>

          {/* [OS] Tático com quadrado e LED verde 'Power ON' */}
          <div className="flex items-center gap-1 border border-[#00f0ff]/60 bg-black/90 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.3)]">
            <span className="font-['Orbitron'] tracking-tighter">OS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="System Power ON" />
          </div>
        </div>

        {/* Tagline MULTIVERSE TCG */}
        {showTagline && (
          <span className="font-mono text-[9px] font-semibold tracking-[0.25em] text-cyan-400/80 mt-0.5 uppercase">
            MULTIVERSE TCG
          </span>
        )}
      </div>
    </div>
  );
}
