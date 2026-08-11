import React, { useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Search, Pencil, Trash2, Layers } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminController } from "@/core/adminController";
import { hasUsableMedia } from "@/services/media/mediaImportService";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/input";

export function ItemManagerTab({ onCreateItem, onEditItem }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["admin-items"],
    queryFn: () => adminController.getAllItems()
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => adminController.getAllCollections()
  });

  const filteredItems = items.filter(i =>
    !searchFilter ||
    i.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    i.collection_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    i.type?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleDeleteItem = async (item) => {
    if (confirm(`Excluir permanentemente o item "${item.name}"?`)) {
      try {
        await adminController.deleteItem(item.id);
        toast({ title: `🗑️ Item "${item.name}" removido com sucesso!` });
        queryClient.invalidateQueries();
      } catch (err) {
        toast({ title: "❌ Erro ao excluir item", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 border border-purple-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-base text-purple-300 tracking-wide flex items-center gap-2">
              GERENCIADOR DE ITENS & ARTEFATOS
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {items.length} CADASTRADOS
              </span>
            </h2>
            <p className="text-xs font-body text-muted-foreground">
              Consumíveis, equipamentos e relíquias utilizáveis no ecossistema de cartas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Buscar item por nome/coleção..."
              className="pl-9 font-mono text-xs h-9 bg-muted/20 border-border/50 w-full sm:w-64"
            />
          </div>

          <button
            onClick={() => onCreateItem()}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-500 text-black font-heading font-bold text-xs rounded transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] shrink-0"
          >
            <Plus className="w-4 h-4" /> NOVO ITEM
          </button>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center border border-border/30 bg-muted/10 rounded-xl space-y-3">
          <Package className="w-10 h-10 text-purple-400/40 mx-auto" />
          <h3 className="font-heading font-bold text-sm text-foreground">Nenhum item encontrado</h3>
          <p className="text-xs text-muted-foreground font-body">
            Cadastre novos itens ou altere os termos de busca.
          </p>
          <button
            onClick={() => onCreateItem()}
            className="px-4 py-2 bg-purple-500 text-black font-heading font-bold text-xs rounded"
          >
            CRIAR PRIMEIRO ITEM
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const itemHasMedia = hasUsableMedia(item);
            const col = collections.find(c => c.code === item.collection_id);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-purple-500/20 hover:border-purple-500/50 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> {item.collection_id || "COL-00-MULTI"}
                    </span>

                    <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${itemHasMedia ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                      {itemHasMedia ? "● MÍDIA OK" : "○ SEM MÍDIA"}
                    </span>
                  </div>

                  <div className="flex items-start gap-3 pt-1">
                    <div className="w-12 h-14 bg-purple-950/30 border border-purple-500/40 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-purple-400" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-heading font-bold text-sm text-foreground group-hover:text-purple-300 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                      <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                        <span>Tipo: {item.type || "Consumível"}</span>
                        {col && <span className="text-primary truncate">({col.name})</span>}
                      </div>
                      <p className="text-[11px] font-body text-muted-foreground line-clamp-2 pt-0.5">
                        {item.description || item.lore || "Sem descrição cadastrada."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">ID: {item.id}</span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditItem(item)}
                      className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-heading font-bold rounded flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> EDITAR
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
