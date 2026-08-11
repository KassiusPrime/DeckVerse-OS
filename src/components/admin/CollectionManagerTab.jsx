import React, { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Plus, Search, Eye, Pencil, Trash2, Sparkles, Package, Crown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminController } from "@/core/adminController";
import { hasUsableMedia } from "@/services/media/mediaImportService";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/input";

export function CollectionManagerTab({
  onOpenCollection,
  onEditCollection,
  onCreateCollection,
  onCreateCharacter,
  onCreateItem,
  onCreateBoss
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");

  const { data: collections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => adminController.getAllCollections()
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["admin-cards"],
    queryFn: () => adminController.getAllCards()
  });

  const { data: items = [] } = useQuery({
    queryKey: ["admin-items"],
    queryFn: () => adminController.getAllItems()
  });

  const { data: bosses = [] } = useQuery({
    queryKey: ["admin-bosses"],
    queryFn: () => adminController.getAllBosses()
  });

  const filteredCollections = collections.filter(c =>
    !searchFilter ||
    c.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleDeleteCollection = async (col) => {
    if (confirm(`Excluir a coleção "${col.name}" (${col.code})?`)) {
      try {
        await adminController.deleteCollection(col.id || col.code);
        toast({ title: `🗑️ Coleção "${col.name}" removida com sucesso!` });
        queryClient.invalidateQueries();
      } catch (err) {
        toast({
          title: "❌ Exclusão bloqueada",
          description: err.message || "Esta coleção possui entidades vinculadas.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 border border-border/40 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/30 rounded-lg text-primary">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-base text-foreground tracking-wide flex items-center gap-2">
              GERENCIADOR DE COLEÇÕES
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                {collections.length} CADASTRADAS
              </span>
            </h2>
            <p className="text-xs font-body text-muted-foreground">
              Universos canônicos que agrupam personagens, itens e bosses do acervo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Buscar coleção por código/nome..."
              className="pl-9 font-mono text-xs h-9 bg-muted/20 border-border/50 w-full sm:w-64"
            />
          </div>

          <button
            onClick={onCreateCollection}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-heading font-bold text-xs rounded transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0"
          >
            <Plus className="w-4 h-4" /> NOVA COLEÇÃO
          </button>
        </div>
      </div>

      {/* Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCollections.map(col => {
          const colCode = col.code;
          const colCards = cards.filter(c => c.collection_id === colCode || c.collection_code === colCode);
          const colItems = items.filter(i => i.collection_id === colCode || i.collection_code === colCode);
          const colBosses = bosses.filter(b => b.collection_id === colCode || b.collection_code === colCode);
          const colHasMedia = hasUsableMedia(col);

          return (
            <motion.div
              key={col.id || col.code}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/40 hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-lg transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      {colCode}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${colHasMedia ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                      {colHasMedia ? "● MÍDIA OK" : "○ SEM MÍDIA"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCollection(col)}
                      className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-muted/30"
                      title="Editar Coleção"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(col)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted/30"
                      title="Excluir Coleção"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {col.name}
                  </h3>
                  <p className="text-[11px] font-body text-muted-foreground line-clamp-2 mt-0.5">
                    {col.description || "Coleção canônica do multiverso DeckVerse."}
                  </p>
                </div>

                {/* Entity Counters */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30 text-center font-mono text-xs">
                  <div className="p-1.5 bg-muted/20 border border-border/30 rounded space-y-0.5">
                    <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" /> CARDS
                    </div>
                    <div className="font-bold text-primary">{colCards.length}</div>
                  </div>

                  <div className="p-1.5 bg-muted/20 border border-border/30 rounded space-y-0.5">
                    <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-1">
                      <Package className="w-3 h-3 text-purple-400" /> ITENS
                    </div>
                    <div className="font-bold text-purple-400">{colItems.length}</div>
                  </div>

                  <div className="p-1.5 bg-muted/20 border border-border/30 rounded space-y-0.5">
                    <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-1">
                      <Crown className="w-3 h-3 text-sky-400" /> BOSSES
                    </div>
                    <div className="font-bold text-sky-400">{colBosses.length}</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-border/30 flex flex-col gap-2">
                <button
                  onClick={() => onOpenCollection(col)}
                  className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-heading font-bold text-xs rounded flex items-center justify-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> GERENCIAR CONTEÚDO
                </button>

                <div className="grid grid-cols-3 gap-1 text-[10px] font-heading font-bold">
                  <button
                    onClick={() => onCreateCharacter(colCode)}
                    className="py-1 bg-muted/30 hover:bg-muted/60 border border-border/40 rounded text-muted-foreground hover:text-foreground text-center"
                  >
                    + CARD
                  </button>
                  <button
                    onClick={() => onCreateItem(colCode)}
                    className="py-1 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/30 rounded text-purple-300 text-center"
                  >
                    + ITEM
                  </button>
                  <button
                    onClick={() => onCreateBoss(colCode)}
                    className="py-1 bg-sky-950/20 hover:bg-sky-950/40 border border-sky-500/30 rounded text-sky-300 text-center"
                  >
                    + BOSS
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
