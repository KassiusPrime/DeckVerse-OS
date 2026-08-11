import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Package, Crown, Plus, Pencil, Trash2, X, Image as ImageIcon, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminController } from "@/core/adminController";
import { hasUsableMedia } from "@/services/media/mediaImportService";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/input";

export function CollectionDetailModal({
  collection,
  onClose,
  onEditCollection,
  onCreateCharacter,
  onCreateItem,
  onCreateBoss,
  onEditCharacter,
  onEditItem,
  onEditBoss,
  onNavigateToMedia
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("characters");
  const [searchFilter, setSearchFilter] = useState("");

  const colCode = collection?.code || collection?.id;

  const { data: entities = { characters: [], items: [], bosses: [] }, refetch } = useQuery({
    queryKey: ["collection-detail-entities", colCode],
    queryFn: () => adminController.getCollectionEntities(colCode),
    enabled: Boolean(colCode)
  });

  const { characters = [], items = [], bosses = [] } = entities;

  const filteredCharacters = characters.filter(c => !searchFilter || c.name?.toLowerCase().includes(searchFilter.toLowerCase()));
  const filteredItems = items.filter(i => !searchFilter || i.name?.toLowerCase().includes(searchFilter.toLowerCase()));
  const filteredBosses = bosses.filter(b => !searchFilter || b.name?.toLowerCase().includes(searchFilter.toLowerCase()));

  const handleDeleteEntity = async (type, id, name) => {
    if (confirm(`Excluir permanentemente o ${type} "${name}"?`)) {
      try {
        if (type === "personagem") await adminController.deleteCard(id);
        else if (type === "item") await adminController.deleteItem(id);
        else if (type === "boss") await adminController.deleteBoss(id);

        toast({ title: `🗑️ ${type} "${name}" removido com sucesso!` });
        queryClient.invalidateQueries();
        refetch();
      } catch (err) {
        toast({ title: "❌ Erro ao excluir", description: err.message, variant: "destructive" });
      }
    }
  };

  const colHasMedia = hasUsableMedia(collection);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-primary/50 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-foreground"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center font-bold font-mono text-primary text-sm shrink-0">
              {colCode}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading font-black text-lg sm:text-xl text-foreground truncate">{collection?.name}</h1>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${colHasMedia ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                  {colHasMedia ? "● MÍDIA DISPONÍVEL" : "○ SEM MÍDIA REAL"}
                </span>
              </div>
              <p className="text-xs font-body text-muted-foreground line-clamp-1">{collection?.description || "Coleção canônica do multiverso DeckVerse."}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onEditCollection(collection)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-heading font-bold rounded transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> EDITAR COLEÇÃO
            </button>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded border border-border/40">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-border/30 bg-card flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab("characters")}
              className={`px-3 py-2 rounded-t text-xs font-heading font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "characters" ? "border-primary text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> PERSONAGENS ({characters.length})
            </button>

            <button
              onClick={() => setActiveTab("items")}
              className={`px-3 py-2 rounded-t text-xs font-heading font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "items" ? "border-purple-400 text-purple-400 bg-purple-500/10" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-3.5 h-3.5" /> ITENS ({items.length})
            </button>

            <button
              onClick={() => setActiveTab("bosses")}
              className={`px-3 py-2 rounded-t text-xs font-heading font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "bosses" ? "border-sky-400 text-sky-400 bg-sky-500/10" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="w-3.5 h-3.5" /> BOSSES ({bosses.length})
            </button>

            <button
              onClick={() => setActiveTab("media")}
              className={`px-3 py-2 rounded-t text-xs font-heading font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === "media" ? "border-emerald-400 text-emerald-400 bg-emerald-500/10" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> MÍDIA & ATALHOS
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filtrar nesta coleção..."
                className="pl-8 text-xs font-mono h-7 bg-muted/20 border-border/40 w-44"
              />
            </div>

            {activeTab === "characters" && (
              <button
                onClick={() => onCreateCharacter(colCode)}
                className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground font-heading font-bold text-xs rounded transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              >
                <Plus className="w-3.5 h-3.5" /> ADICIONAR
              </button>
            )}
            {activeTab === "items" && (
              <button
                onClick={() => onCreateItem(colCode)}
                className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-black font-heading font-bold text-xs rounded transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              >
                <Plus className="w-3.5 h-3.5" /> ADICIONAR
              </button>
            )}
            {activeTab === "bosses" && (
              <button
                onClick={() => onCreateBoss(colCode)}
                className="flex items-center gap-1 px-3 py-1 bg-sky-500 text-black font-heading font-bold text-xs rounded transition-all shadow-[0_0_10px_rgba(56,189,248,0.3)]"
              >
                <Plus className="w-3.5 h-3.5" /> ADICIONAR
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeTab === "characters" && (
            <div>
              {filteredCharacters.length === 0 ? (
                <div className="p-10 text-center border border-border/30 bg-muted/10 rounded-xl space-y-2">
                  <Sparkles className="w-8 h-8 text-primary/40 mx-auto" />
                  <p className="font-heading text-xs text-muted-foreground">Nenhum personagem cadastrado para esta coleção.</p>
                  <button onClick={() => onCreateCharacter(colCode)} className="text-xs text-primary underline">Cadastrar Primeiro Personagem</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCharacters.map(char => {
                    const charHasMedia = hasUsableMedia(char);
                    return (
                      <div key={char.id || char.card_id} className="p-3 border border-border/30 bg-card/60 rounded-xl flex items-start justify-between gap-3 group hover:border-primary/40 transition-all">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {char.image_url || char.img_oficial ? (
                            <img src={char.image_url || char.img_oficial} alt={char.name} className="w-12 h-16 object-cover rounded border border-border/40 shrink-0" onError={e => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <div className="w-12 h-16 rounded bg-muted/20 border border-border/40 flex items-center justify-center text-[9px] text-muted-foreground shrink-0 font-mono">
                              SEM IMG
                            </div>
                          )}
                          <div className="min-w-0 space-y-1">
                            <h3 className="font-heading font-bold text-xs text-foreground truncate">{char.name}</h3>
                            <div className="text-[10px] font-mono text-muted-foreground truncate">{char.card_id || colCode}</div>
                            <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${charHasMedia ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                              {charHasMedia ? "MÍDIA REAL" : "SEM MÍDIA"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => onEditCharacter(char)} className="p-1 text-primary hover:bg-primary/10 rounded">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteEntity("personagem", char.id, char.name)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "items" && (
            <div>
              {filteredItems.length === 0 ? (
                <div className="p-10 text-center border border-border/30 bg-muted/10 rounded-xl space-y-2">
                  <Package className="w-8 h-8 text-purple-400/40 mx-auto" />
                  <p className="font-heading text-xs text-muted-foreground">Nenhum item cadastrado para esta coleção.</p>
                  <button onClick={() => onCreateItem(colCode)} className="text-xs text-purple-400 underline">Cadastrar Primeiro Item</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredItems.map(item => {
                    const itemHasMedia = hasUsableMedia(item);
                    return (
                      <div key={item.id} className="p-3 border border-purple-500/30 bg-card/60 rounded-xl flex items-start justify-between gap-3 hover:border-purple-500/50 transition-all">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-12 h-16 rounded bg-purple-950/30 border border-purple-500/40 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h3 className="font-heading font-bold text-xs text-purple-300 truncate">{item.name}</h3>
                            <div className="text-[10px] font-mono text-muted-foreground">{item.type || "Item"}</div>
                            <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${itemHasMedia ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                              {itemHasMedia ? "MÍDIA REAL" : "SEM MÍDIA"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => onEditItem(item)} className="p-1 text-purple-400 hover:bg-purple-500/10 rounded">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteEntity("item", item.id, item.name)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "bosses" && (
            <div>
              {filteredBosses.length === 0 ? (
                <div className="p-10 text-center border border-border/30 bg-muted/10 rounded-xl space-y-2">
                  <Crown className="w-8 h-8 text-sky-400/40 mx-auto" />
                  <p className="font-heading text-xs text-muted-foreground">Nenhum boss cadastrado para esta coleção.</p>
                  <button onClick={() => onCreateBoss(colCode)} className="text-xs text-sky-400 underline">Cadastrar Primeiro Boss</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBosses.map(boss => {
                    const bossHasMedia = hasUsableMedia(boss);
                    return (
                      <div key={boss.id} className="p-3 border border-sky-500/30 bg-card/60 rounded-xl flex items-start justify-between gap-3 hover:border-sky-500/50 transition-all">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-12 h-16 rounded bg-sky-950/30 border border-sky-500/40 flex items-center justify-center shrink-0">
                            <Crown className="w-5 h-5 text-sky-400" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h3 className="font-heading font-bold text-xs text-sky-300 truncate">{boss.name}</h3>
                            <div className="text-[10px] font-mono text-muted-foreground">{boss.title || "Boss de Incursão"}</div>
                            <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${bossHasMedia ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                              {bossHasMedia ? "MÍDIA REAL" : "SEM MÍDIA"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => onEditBoss(boss)} className="p-1 text-sky-400 hover:bg-sky-500/10 rounded">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteEntity("boss", boss.id, boss.name)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "media" && (
            <div className="p-6 border border-border/40 bg-card/40 rounded-xl space-y-4 font-mono text-xs">
              <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> GERENCIAMENTO DE MÍDIA DA COLEÇÃO ({colCode})
              </h3>
              <p className="text-muted-foreground">
                Importe pacotes de mídia formatados especificamente para as entidades desta coleção.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToMedia) onNavigateToMedia("images");
                  }}
                  className="p-4 border border-primary/40 bg-primary/10 hover:bg-primary/20 rounded-xl text-left space-y-1 transition-all"
                >
                  <div className="font-heading font-bold text-xs text-primary">IMPORTAR IMAGENS DIRETAS</div>
                  <div className="text-[10px] text-muted-foreground">Formatadas como {colCode}__character__slug.ext</div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToMedia) onNavigateToMedia("zip");
                  }}
                  className="p-4 border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 rounded-xl text-left space-y-1 transition-all"
                >
                  <div className="font-heading font-bold text-xs text-emerald-400">IMPORTAR PACOTE .ZIP DE MÍDIA</div>
                  <div className="text-[10px] text-muted-foreground">Processamento automático com preflight local</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
