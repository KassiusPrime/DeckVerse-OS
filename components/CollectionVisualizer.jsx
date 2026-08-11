// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Collection Visualizer (Visualizador Interativo de Coleções)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from "react";
import {
  CANONICAL_COLLECTION_CODES,
  resolveCollectionCode,
  inferCollectionCode
} from "@/lib/collectionCodes";
import { MEGA_COLLECTIONS } from "@/src/data/megaCollectionsData";
import {
  Layers, Search, CheckCircle2, ShieldAlert, Sparkles, Filter,
  Globe, Gamepad2, Tv, Shield, ArrowRight, Activity
} from "lucide-react";

// Helper metadata derived dynamically from canonical MEGA_COLLECTIONS
const MEGA_MAP = new Map(MEGA_COLLECTIONS.map((col) => [col.code, col]));

function getCategoryFromCode(code = "") {
  if (code.startsWith("COL-01")) return "COL-01";
  if (code.startsWith("COL-02")) return "COL-02";
  if (code.startsWith("COL-03")) return "COL-03";
  if (code.startsWith("COL-04")) return "COL-04";
  if (code.startsWith("COL-05")) return "COL-05";
  if (code.startsWith("COL-06")) return "COL-06";
  return "COL-00";
}

function getUniverseFromCode(code = "") {
  if (code.startsWith("COL-01")) return "Anime & Manga";
  if (code.startsWith("COL-02")) return "Gaming";
  if (code.startsWith("COL-03")) return "Comics & Pop";
  if (code.startsWith("COL-04")) return "Cartoons & Series";
  if (code.startsWith("COL-05")) return "Mythology";
  if (code.startsWith("COL-06")) return "History";
  return "Multiverse";
}

export default function CollectionVisualizer({ dbCards = [], onSelectCollection }) {
  const [categoryFilter, setCategoryFilter] = useState("ALL"); // ALL | COL-01 | COL-02 | COL-03 | COL-00
  const [searchQuery, setSearchQuery] = useState("");

  // Process collection stats for canonical codes
  const collectionStats = useMemo(() => {
    const statsMap = {};

    // Initialize all canonical codes
    CANONICAL_COLLECTION_CODES.forEach((code) => {
      const megaEntry = MEGA_MAP.get(code);
      const name = megaEntry?.name || code.replace("COL-", "").replace("-", " ");
      const category = megaEntry?.bank || getCategoryFromCode(code);
      const universe = megaEntry?.category || getUniverseFromCode(code);
      const image = megaEntry?.image_url || "/assets/placeholders/collection.svg";

      statsMap[code] = {
        code,
        name,
        category,
        universe,
        image,
        totalCards: 0,
        validCards: 0,
        quarantineCards: 0,
        avgQualityScore: 0,
        scoresSum: 0
      };
    });

    // Populate with actual cards from DB
    dbCards.forEach((card) => {
      const code = inferCollectionCode(card);
      if (!statsMap[code]) {
        statsMap[code] = {
          code,
          name: code,
          category: "COL-00",
          universe: "Multiverse",
          image: "/assets/placeholders/collection.svg",
          totalCards: 0,
          validCards: 0,
          quarantineCards: 0,
          avgQualityScore: 0,
          scoresSum: 0
        };
      }

      const item = statsMap[code];
      item.totalCards += 1;
      const score = card.quality_score || 80;
      item.scoresSum += score;

      if (card.status === "valid" || (!card.status && score >= 50)) {
        item.validCards += 1;
      } else if (card.status === "quarantine" || score < 50) {
        item.quarantineCards += 1;
      }
    });

    // Compute average quality score per collection
    Object.values(statsMap).forEach((item) => {
      item.avgQualityScore = item.totalCards > 0 ? Math.round(item.scoresSum / item.totalCards) : 100;
    });

    return Object.values(statsMap);
  }, [dbCards]);

  // Filter collections by category and search
  const filteredCollections = useMemo(() => {
    return collectionStats.filter((col) => {
      const matchCat = categoryFilter === "ALL" || col.category === categoryFilter;
      const matchSearch =
        !searchQuery ||
        col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        col.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        col.universe.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [collectionStats, categoryFilter, searchQuery]);

  // High-level KPIs
  const totalCollections = CANONICAL_COLLECTION_CODES.length;
  const collectionsWithCards = collectionStats.filter((c) => c.totalCards > 0).length;
  const totalCardsInDB = dbCards.length;
  const overallAvgScore =
    dbCards.length > 0
      ? Math.round(dbCards.reduce((acc, c) => acc + (c.quality_score || 80), 0) / dbCards.length)
      : 100;

  return (
    <div className="space-y-6">
      {/* Header KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card/60 border border-primary/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-primary font-bold uppercase block">COLEÇÕES CANÔNICAS</span>
            <span className="text-2xl font-heading font-black text-primary">
              {collectionsWithCards} / {totalCollections}
            </span>
          </div>
          <Layers className="w-7 h-7 text-primary/60" />
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">CARTAS VÁLIDAS</span>
            <span className="text-2xl font-heading font-black text-emerald-400">
              {dbCards.filter((c) => c.status === "valid" || (!c.status && (c.quality_score || 80) >= 50)).length}
            </span>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-500/60" />
        </div>

        <div className="bg-amber-950/20 border border-amber-500/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">SCORE DE INTEGRIDADE</span>
            <span className="text-2xl font-heading font-black text-amber-400">{overallAvgScore} / 100</span>
          </div>
          <Activity className="w-7 h-7 text-amber-500/60" />
        </div>

        <div className="bg-card/60 border border-border/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground font-bold uppercase block">TOTAL NO BANCO</span>
            <span className="text-2xl font-heading font-black text-foreground">{totalCardsInDB}</span>
          </div>
          <Sparkles className="w-7 h-7 text-muted-foreground/60" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all ${
              categoryFilter === "ALL" ? "bg-primary text-black shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            TODAS (60)
          </button>

          <button
            onClick={() => setCategoryFilter("COL-01")}
            className={`px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all flex items-center gap-1 ${
              categoryFilter === "COL-01" ? "bg-amber-500 text-black shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Tv className="w-3.5 h-3.5" /> Anime & Manga (COL-01)
          </button>

          <button
            onClick={() => setCategoryFilter("COL-02")}
            className={`px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all flex items-center gap-1 ${
              categoryFilter === "COL-02" ? "bg-cyan-500 text-black shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> Gaming (COL-02)
          </button>

          <button
            onClick={() => setCategoryFilter("COL-03")}
            className={`px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all flex items-center gap-1 ${
              categoryFilter === "COL-03" ? "bg-purple-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Comics & Pop (COL-03)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar coleção..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-body bg-muted/20 border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Grid of Canonical Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCollections.map((col) => {
          const validRatio = col.totalCards > 0 ? Math.round((col.validCards / col.totalCards) * 100) : 0;

          return (
            <div
              key={col.code}
              className="border border-border/50 bg-card/60 hover:bg-card/90 hover:border-primary/60 transition-all rounded-xl p-4 flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="aspect-video w-full rounded-lg overflow-hidden relative bg-black/40 border border-border/40">
                  <img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  <span className="absolute top-2 left-2 font-mono text-[9px] font-bold text-primary bg-black/80 border border-primary/50 px-2 py-0.5 rounded shadow">
                    {col.code}
                  </span>

                  <span className="absolute bottom-2 left-2 text-xs font-heading font-bold text-white drop-shadow">
                    {col.name}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{col.universe}</span>
                  <span className="text-emerald-400 font-bold">
                    Score: {col.avgQualityScore}/100
                  </span>
                </div>
              </div>

              {/* Progress and Stats */}
              <div className="space-y-1.5 pt-1 border-t border-border/30">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-muted-foreground">Cartas Cadastradas</span>
                  <span className="text-foreground font-bold">
                    {col.validCards} / {col.totalCards} válidas
                  </span>
                </div>

                <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${col.totalCards > 0 ? validRatio : 0}%` }}
                  />
                </div>
              </div>

              {/* Quick Action Button */}
              {onSelectCollection && (
                <button
                  onClick={() => onSelectCollection(col.code)}
                  className="w-full py-1.5 bg-muted/40 hover:bg-primary hover:text-black text-muted-foreground font-heading text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 mt-2"
                >
                  Filtrar Cartas <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
