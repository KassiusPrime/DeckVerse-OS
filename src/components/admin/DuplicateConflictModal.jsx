import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink, X } from "lucide-react";

export function DuplicateConflictModal({ collisionData, onOpenExisting, onClose }) {
  if (!collisionData) return null;

  const { existingEntity, entityKey, message } = collisionData;
  const name = existingEntity?.name || existingEntity?.title || "Entidade Desconhecida";
  const type = existingEntity?.entityType || collisionData.type || "entidade";
  const colCode = existingEntity?.collection_id || existingEntity?.collection_code || existingEntity?.code || "MULTIVERSE";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-amber-500/50 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4 text-foreground"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading font-bold text-sm text-amber-400 tracking-wider">
              DUPLICIDADE BLOQUEADA
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <p className="text-muted-foreground">
            {message || "Uma entidade com essa mesma identidade canônica já existe no acervo. Para evitar corrupção, a criação duplicada foi bloqueada."}
          </p>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center justify-between">
              <span>{name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 uppercase">{type}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Coleção: <span className="text-foreground font-bold">{colCode}</span>
            </div>
            {entityKey && (
              <div className="text-[9px] text-muted-foreground/80 break-all bg-black/40 p-1.5 rounded">
                Key: <code className="text-cyan-400">{entityKey}</code>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40 font-heading text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border/50 rounded hover:bg-muted/20"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenExisting && existingEntity) {
                onOpenExisting(existingEntity);
              }
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
          >
            <ExternalLink className="w-3.5 h-3.5" /> ABRIR EXISTENTE
          </button>
        </div>
      </motion.div>
    </div>
  );
}
