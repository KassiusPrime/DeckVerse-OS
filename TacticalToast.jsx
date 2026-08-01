import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Zap, CheckCircle2, AlertCircle } from "lucide-react";

// ─── Global store ─────────────────────────────────────────────────────────────
let _listeners = [];
let _queue = [];
let _idCounter = 0;

export function tacticalToast({ title, description, type = "success", isAnomaly = false, duration, onClickGo }) {
  const id = ++_idCounter;
  const defaultDuration = isAnomaly ? 6000 : type === "error" ? 5000 : 3500;
  const finalDuration = duration || defaultDuration;

  _queue = [{ id, title, description, type, isAnomaly, duration: finalDuration, onClickGo }, ..._queue].slice(0, 4);
  _listeners.forEach(fn => fn([..._queue]));
  return id;
}

export function dismissTacticalToast(id) {
  _queue = _queue.filter(t => t.id !== id);
  _listeners.forEach(fn => fn([..._queue]));
}

function useTacticalToasts() {
  const [toasts, setToasts] = useState([..._queue]);
  useEffect(() => {
    _listeners.push(setToasts);
    return () => { _listeners = _listeners.filter(fn => fn !== setToasts); };
  }, []);
  return toasts;
}

// ─── Glitch text ──────────────────────────────────────────────────────────────
const GLITCH_CHARS = "!@#$%^&*<>?/\\|[]{}";
function GlitchText({ text }) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    const iv = setInterval(() => {
      const arr = text.split("");
      const idx = Math.floor(Math.random() * arr.length);
      arr[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      setDisplay(arr.join(""));
      setTimeout(() => setDisplay(text), 80);
    }, 500);
    return () => clearInterval(iv);
  }, [text]);
  return <>{display}</>;
}

// ─── Single item (pure CSS animations, no framer-motion to avoid style conflicts) ──
function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const timerRef = useRef(null);
  const startXRef = useRef(null);
  const itemRef = useRef(null);

  // Mount animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    clearTimeout(timerRef.current);
    setTimeout(() => onDismiss(toast.id), 280);
  }, [toast.id, onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (hovered) { clearTimeout(timerRef.current); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, toast.duration || 2000);
    return () => clearTimeout(timerRef.current);
  }, [hovered, dismiss, toast.duration]);

  // ── Touch drag ──
  const onTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (startXRef.current === null) return;
    setDragX(e.touches[0].clientX - startXRef.current);
  };
  const onTouchEnd = () => {
    if (Math.abs(dragX) > 100) { dismiss(); return; }
    setDragX(0);
    setDragging(false);
    startXRef.current = null;
  };

  // ── Mouse drag ──
  const onMouseDown = (e) => {
    startXRef.current = e.clientX;
    setDragging(true);
    const onMove = (ev) => setDragX(ev.clientX - startXRef.current);
    const onUp = (ev) => {
      const delta = ev.clientX - startXRef.current;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (Math.abs(delta) > 100) { dismiss(); return; }
      setDragX(0);
      setDragging(false);
      startXRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const dragOpacity = Math.max(0, 1 - Math.abs(dragX) / 200);

  const style = {
    transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
    opacity: exiting ? 0 : visible ? dragOpacity : 0,
    transition: dragging
      ? "opacity 0.1s"
      : exiting
      ? "transform 0.28s ease-in, opacity 0.28s ease-in"
      : "transform 0.38s cubic-bezier(.34,1.56,.64,1), opacity 0.25s ease",
  };

  const isAnomaly = toast.isAnomaly;
  const border = isAnomaly ? "border-[#b400ff]/60" : toast.type === "error" ? "border-red-500/40" : "border-primary/30";
  const bg = isAnomaly ? "bg-black" : "bg-background/96";

  return (
    <div
      ref={itemRef}
      style={style}
      className={`relative w-[300px] sm:w-[340px] border ${border} ${bg} backdrop-blur-xl overflow-hidden select-none cursor-grab active:cursor-grabbing ${isAnomaly ? "anomaly-glitch" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={toast.onClickGo ? () => { toast.onClickGo(); dismiss(); } : undefined}
    >
      {/* Progress bar */}
      {!hovered && !exiting && (
        <div
          className={`absolute top-0 left-0 h-[2px] ${isAnomaly ? "bg-[#ff003c]" : "bg-primary"}`}
          style={{
            animation: `shrink-bar ${(toast.duration || 2000)}ms linear forwards`,
          }}
        />
      )}

      {isAnomaly && <div className="absolute inset-0 pointer-events-none scanlines-glitch opacity-20 z-0" />}

      <div className="relative z-10 p-3 flex items-start gap-3">
        <div className={`shrink-0 w-8 h-8 flex items-center justify-center border ${isAnomaly ? "border-[#ff003c]/50 bg-[#ff003c]/10" : toast.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-primary/30 bg-primary/10"}`}>
          {isAnomaly
            ? <AlertTriangle className="w-4 h-4 text-[#ff003c] animate-pulse" />
            : toast.type === "error"
            ? <AlertCircle className="w-4 h-4 text-red-400" />
            : <CheckCircle2 className="w-4 h-4 text-primary" />
          }
        </div>

        <div className="flex-1 min-w-0 pointer-events-none">
          <p className={`font-heading text-xs font-black tracking-wide truncate ${isAnomaly ? "text-[#ff003c] anomaly-text" : "text-foreground"}`}>
            {isAnomaly ? <GlitchText text={toast.title || ""} /> : toast.title}
          </p>
          {toast.description && (
            <p className={`text-[10px] font-body mt-0.5 leading-relaxed line-clamp-2 ${isAnomaly ? "text-[#b400ff]" : "text-muted-foreground"}`}>
              {toast.description}
            </p>
          )}
          {toast.onClickGo && (
            <p className="text-[9px] font-heading text-primary/60 mt-0.5 tracking-widest">CLIQUE PARA IR →</p>
          )}
        </div>

        {/* X button — pointer-events explicit, no drag interference */}
        <button
          type="button"
          style={{ pointerEvents: "all", zIndex: 50, position: "relative" }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); dismiss(); }}
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${isAnomaly ? "text-[#ff003c]" : "text-muted-foreground hover:text-foreground"}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isAnomaly && (
        <>
          <div className="absolute inset-0 pointer-events-none anomaly-red-shift z-0" />
          <div className="absolute inset-0 pointer-events-none anomaly-blue-shift z-0" />
        </>
      )}
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────
export function TacticalToastContainer() {
  const toasts = useTacticalToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissTacticalToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}