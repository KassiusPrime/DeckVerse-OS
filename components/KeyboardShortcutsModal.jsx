// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Keyboard Shortcuts & Hotkeys Helper Modal
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from "react";
import { Keyboard, X, Command, Zap } from "lucide-react";

export default function KeyboardShortcutsModal({
  onRunAudit,
  onRunPurge,
  onSelectTab,
  onFocusSearch
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger hotkeys if typing in input or textarea
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) &&
        e.key !== "Escape"
      ) {
        return;
      }

      // Shift + ? or Alt + K to toggle shortcuts help
      if ((e.shiftKey && e.key === "?") || (e.altKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Esc to close
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      // Alt + A or 'a' -> Audit
      if ((e.altKey && e.key.toLowerCase() === "a") || (e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey)) {
        if (onRunAudit) {
          e.preventDefault();
          onRunAudit();
        }
      }

      // Alt + P or 'p' -> Purge
      if ((e.altKey && e.key.toLowerCase() === "p") || (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey)) {
        if (onRunPurge) {
          e.preventDefault();
          onRunPurge();
        }
      }

      // Number keys or letters for tab switching
      if (e.key === "1" || e.key.toLowerCase() === "q") {
        if (onSelectTab) onSelectTab("quarantine");
      } else if (e.key === "2" || e.key.toLowerCase() === "v") {
        if (onSelectTab) onSelectTab("valid");
      } else if (e.key === "3" || e.key.toLowerCase() === "r") {
        if (onSelectTab) onSelectTab("rejected");
      } else if (e.key === "4" || e.key.toLowerCase() === "c") {
        if (onSelectTab) onSelectTab("visualizer");
      }

      // '/' or 'f' -> Search focus
      if (e.key === "/" || e.key.toLowerCase() === "f") {
        if (onFocusSearch) {
          e.preventDefault();
          onFocusSearch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRunAudit, onRunPurge, onSelectTab, onFocusSearch]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-2.5 bg-black/80 hover:bg-primary/20 text-primary border border-primary/50 rounded-full shadow-lg backdrop-blur transition-all flex items-center gap-1.5 font-mono text-xs hover:scale-105"
        title="Atalhos do Teclado (Pressione Shift + ?)"
      >
        <Keyboard className="w-4 h-4" />
        <span className="hidden sm:inline font-bold">ATALHOS</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-primary/50 p-6 rounded-2xl max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-bold text-base text-foreground">
                ATALHOS RÁPIDOS DE TECLADO
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Executar Auditoria Completa</span>
                <kbd className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 rounded font-bold">A ou Alt + A</kbd>
              </div>

              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Expurgar Duplicatas / Inválidas</span>
                <kbd className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-bold">P ou Alt + P</kbd>
              </div>

              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Aba Quarentena</span>
                <kbd className="px-2 py-0.5 bg-muted text-foreground rounded border border-border font-bold">1 ou Q</kbd>
              </div>

              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Aba Cartas Válidas</span>
                <kbd className="px-2 py-0.5 bg-muted text-foreground rounded border border-border font-bold">2 ou V</kbd>
              </div>

              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Aba Cartas Rejeitadas</span>
                <kbd className="px-2 py-0.5 bg-muted text-foreground rounded border border-border font-bold">3 ou R</kbd>
              </div>

              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Aba Visualizador de Coleções</span>
                <kbd className="px-2 py-0.5 bg-muted text-foreground rounded border border-border font-bold">4 ou C</kbd>
              </div>

              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Focar na Busca</span>
                <kbd className="px-2 py-0.5 bg-muted text-foreground rounded border border-border font-bold">/ ou F</kbd>
              </div>

              <div className="flex justify-between items-center bg-muted/20 p-2 rounded border border-border/30">
                <span className="text-muted-foreground">Fechar Modal / Fechar Atalhos</span>
                <kbd className="px-2 py-0.5 bg-muted text-foreground rounded border border-border font-bold">ESC</kbd>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center font-mono pt-2">
              Você também pode pressionar <kbd className="text-primary font-bold">Shift + ?</kbd> a qualquer momento.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
