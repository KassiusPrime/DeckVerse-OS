import React, { useState, useEffect, useRef } from "react";
import { Search, Layers, Sparkles, Package, Crown, X, ArrowRight } from "lucide-react";
import { adminController } from "@/core/adminController";
import { Input } from "@/input";

export function GlobalAdminSearch({
  onSelectCollection,
  onSelectCharacter,
  onSelectItem,
  onSelectBoss
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ collections: [], characters: [], items: [], bosses: [] });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (query.trim().length >= 2) {
      adminController.searchCatalog(query).then(res => {
        if (isMounted) {
          setResults(res);
          setIsOpen(true);
        }
      });
    } else {
      setResults({ collections: [], characters: [], items: [], bosses: [] });
      setIsOpen(false);
    }
    return () => { isMounted = false; };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalHits =
    results.collections.length +
    results.characters.length +
    results.items.length +
    results.bosses.length;

  return (
    <div ref={dropdownRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
          placeholder="Busca administrativa global (nome, código, ID)..."
          className="pl-9 pr-8 text-xs font-mono bg-muted/20 border-border/50 h-9 rounded-lg"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false); }}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 bg-card border border-primary/40 rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto divide-y divide-border/40 text-xs font-mono">
          <div className="p-2.5 bg-muted/30 text-muted-foreground flex items-center justify-between font-heading font-bold text-[10px]">
            <span>RESULTADOS DA BUSCA: "{query}"</span>
            <span className="text-primary">{totalHits} ENCONTRADOS</span>
          </div>

          {totalHits === 0 ? (
            <div className="p-6 text-center text-muted-foreground font-body text-xs">
              Nenhuma entidade ou coleção corresponde aos termos.
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {/* Coleções */}
              {results.collections.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-heading font-bold text-primary flex items-center gap-1.5 border-b border-border/30">
                    <Layers className="w-3 h-3" /> COLEÇÕES ({results.collections.length})
                  </div>
                  {results.collections.slice(0, 5).map(col => (
                    <div
                      key={col.id || col.code}
                      onClick={() => {
                        setIsOpen(false);
                        if (onSelectCollection) onSelectCollection(col);
                      }}
                      className="p-2 hover:bg-primary/10 rounded cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-primary px-1.5 py-0.2 bg-primary/20 rounded">{col.code}</span>
                        <span className="text-foreground group-hover:text-primary transition-colors truncate">{col.name}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Personagens */}
              {results.characters.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-heading font-bold text-cyan-400 flex items-center gap-1.5 border-b border-border/30">
                    <Sparkles className="w-3 h-3" /> PERSONAGENS ({results.characters.length})
                  </div>
                  {results.characters.slice(0, 8).map(char => (
                    <div
                      key={char.id || char.card_id}
                      onClick={() => {
                        setIsOpen(false);
                        if (onSelectCharacter) onSelectCharacter(char);
                      }}
                      className="p-2 hover:bg-cyan-500/10 rounded cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-muted-foreground text-[10px]">{char.collection_id || char.collection_code}</span>
                        <span className="text-foreground font-bold group-hover:text-cyan-300 transition-colors truncate">{char.name}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-cyan-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Itens */}
              {results.items.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-heading font-bold text-purple-400 flex items-center gap-1.5 border-b border-border/30">
                    <Package className="w-3 h-3" /> ITENS ({results.items.length})
                  </div>
                  {results.items.slice(0, 5).map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setIsOpen(false);
                        if (onSelectItem) onSelectItem(item);
                      }}
                      className="p-2 hover:bg-purple-500/10 rounded cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-muted-foreground text-[10px]">{item.collection_id}</span>
                        <span className="text-foreground font-bold group-hover:text-purple-300 transition-colors truncate">{item.name}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-purple-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Bosses */}
              {results.bosses.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-heading font-bold text-sky-400 flex items-center gap-1.5 border-b border-border/30">
                    <Crown className="w-3 h-3" /> BOSSES ({results.bosses.length})
                  </div>
                  {results.bosses.slice(0, 5).map(boss => (
                    <div
                      key={boss.id}
                      onClick={() => {
                        setIsOpen(false);
                        if (onSelectBoss) onSelectBoss(boss);
                      }}
                      className="p-2 hover:bg-sky-500/10 rounded cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-muted-foreground text-[10px]">{boss.collection_id}</span>
                        <span className="text-foreground font-bold group-hover:text-sky-300 transition-colors truncate">{boss.name}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-sky-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
