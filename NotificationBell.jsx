import React, { useState, useEffect, useRef } from "react";
import { Bell, X, Trophy, Star, Zap, Gift, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

let _nListeners = [];
let _nQueue = [];
let _nCounter = 0;

export function pushNotification({ title, description, type = "info", reward = false }) {
  const id = ++_nCounter;
  _nQueue = [{ id, title, description, type, reward, read: false, ts: Date.now() }, ..._nQueue].slice(0, 30);
  _nListeners.forEach(fn => fn([..._nQueue]));
}

function useNotifications() {
  const [notifs, setNotifs] = useState([..._nQueue]);
  useEffect(() => {
    _nListeners.push(setNotifs);
    return () => { _nListeners = _nListeners.filter(fn => fn !== setNotifs); };
  }, []);
  return [notifs, setNotifs];
}

const TYPE_CONFIG = {
  reward:  { icon: Trophy,       color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/30" },
  success: { icon: Star,         color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30" },
  info:    { icon: Info,         color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30"   },
  warning: { icon: AlertTriangle,color: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  anomaly: { icon: Zap,          color: "text-fuchsia-400",bg: "bg-fuchsia-400/10",border: "border-fuchsia-400/30"},
  update:  { icon: Gift,         color: "text-secondary",  bg: "bg-secondary/10",  border: "border-secondary/30" },
};

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "agora";
  if (sec < 3600) return `há ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `há ${Math.floor(sec / 3600)} h`;
  return `há ${Math.floor(sec / 86400)} d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useNotifications();
  const panelRef = useRef(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    setTimeout(() => document.addEventListener("pointerdown", handler), 10);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const markAllRead = () => {
    _nQueue = _nQueue.map(n => ({ ...n, read: true }));
    _nListeners.forEach(fn => fn([..._nQueue]));
  };

  const removeNotif = (id) => {
    _nQueue = _nQueue.filter(n => n.id !== id);
    _nListeners.forEach(fn => fn([..._nQueue]));
  };

  const markRead = (id) => {
    _nQueue = _nQueue.map(n => n.id === id ? { ...n, read: true } : n);
    _nListeners.forEach(fn => fn([..._nQueue]));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative flex items-center justify-center w-8 h-8 border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        aria-label={open ? "Fechar notificações" : "Abrir notificações"}
        aria-expanded={open}
      >
        <Bell className="w-3.5 h-3.5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[9px] font-heading font-black text-white flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-10 w-[320px] sm:w-[360px] border border-border/50 bg-background/98 backdrop-blur-xl shadow-2xl shadow-black/40 z-[9998]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <span className="font-heading text-xs font-black tracking-wide text-foreground">Notificações</span>
                {notifs.length > 0 && (
                  <span className="text-[9px] font-mono text-muted-foreground border border-border/30 px-1.5 py-0.5">{notifs.length}</span>
                )}
              </div>
              {notifs.length > 0 && unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] font-heading text-primary/70 hover:text-primary transition-colors"
                >
                  Marcar como lidas
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-border/20">
              {notifs.length === 0 && (
                <div className="py-10 text-center px-6">
                  <Bell className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs font-body text-muted-foreground">Tudo em dia. Nenhuma notificação por enquanto.</p>
                </div>
              )}
              <AnimatePresence>
                {notifs.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/10 transition-colors ${!n.read ? "bg-primary/3" : ""}`}
                      onClick={() => markRead(n.id)}
                    >
                      <div className={`shrink-0 w-7 h-7 flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-heading text-[11px] font-black truncate ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        {n.description && (
                          <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.description}</p>
                        )}
                        <p className="text-[9px] font-mono text-muted-foreground/40 mt-1">{timeAgo(n.ts)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remover notificação: ${n.title || "sem título"}`}
                        onPointerDown={(e) => { e.stopPropagation(); removeNotif(n.id); }}
                        className="shrink-0 p-1 text-muted-foreground/30 hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {notifs.length > 0 && (
              <div className="px-4 py-2 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => { _nQueue = []; _nListeners.forEach(fn => fn([])); }}
                  className="text-[10px] font-heading text-destructive/60 hover:text-destructive transition-colors"
                >
                  Limpar notificações
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}