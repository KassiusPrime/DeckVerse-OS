import React, { useState, useEffect } from "react";
import { backgroundSyncService } from "@/services/sync/backgroundSyncService";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, CheckCircle2, WifiOff, Sparkles, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BackgroundSyncIndicator() {
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    currentTask: "",
    progress: 0,
    online: true
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = backgroundSyncService.subscribe((state) => {
      setSyncState(state);
      if (state.isSyncing) {
        setIsDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  if (isDismissed && !syncState.isSyncing) return null;

  return (
    <AnimatePresence>
      {(syncState.isSyncing || !syncState.online) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-4 right-4 z-40 bg-card/95 border border-primary/40 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono max-w-sm"
        >
          {syncState.online ? (
            <div className="p-2 bg-primary/10 border border-primary/30 rounded-lg text-primary shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-400 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading font-bold text-foreground truncate">
                {syncState.online ? "Sincronizando DeckVerse OS..." : "Modo Offline"}
              </span>
              {syncState.isSyncing && (
                <span className="text-primary font-bold">{syncState.progress}%</span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {syncState.online ? syncState.currentTask || "Atualizando coleções e lore..." : "Alterações serão enviadas ao reconectar."}
            </p>

            {syncState.isSyncing && (
              <div className="h-1 bg-muted/40 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${syncState.progress}%` }}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/admin")}
            title="Abrir Centro de Qualidade dos Dados"
            className="p-1.5 hover:bg-muted/40 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
