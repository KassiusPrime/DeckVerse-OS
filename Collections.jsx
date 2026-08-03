import { db } from "@/base44Client";
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, getAllExpandedCards } from "@/src/data/megaCollectionsData";
import { importService } from "@/core/importService";
import { entityRepository } from "@/core/entityRepository";
import {
  Filter,
  Layers,
  Search,
  X,
  Lock,
  Skull,
  Package,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
  Info,
  Trophy,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Star,
  Globe,
  Gamepad2,
  Film,
  Tv,
  Crown,
  Scroll,
  BookOpen,
  Compass,
  Wand2,
  Swords
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import Navbar from "@/Navbar";
import CardListItem from "@/CardListItem";
import { RARITY_ORDER, RARITY_ALIAS, ELEMENTS, ROLES } from "@/constants";
import { DeckVerseLoader, CollectionSkeleton, CardGridSkeleton, ItemSkeleton } from "@/LoadingAnimation";

const GENDER_OPTIONS = ["Male", "Female", "Unknown", "Other"];

// Helper to return thematic Lucide icon for each collection
function getCollectionIcon(collection) {
  if (!collection) return <Layers className="w-5 h-5 text-primary" />;
  const code = (collection.code || "").toUpperCase();
  const name = (collection.name || "").toLowerCase();
  const bank = collection.bank || (code.startsWith("COL-01") ? "COL-01" : code.startsWith("COL-02") ? "COL-02" : code.startsWith("COL-03") ? "COL-03" : code.startsWith("COL-04") ? "COL-04" : code.startsWith("COL-05") ? "COL-05" : "COL-06");

  if (code.includes("DC") || name.includes("dc universe")) return <Shield className="w-5 h-5 text-blue-400" />;
  if (code.includes("MARVEL") || name.includes("marvel")) return <Shield className="w-5 h-5 text-red-500" />;
  if (code.includes("SW") || name.includes("star wars")) return <Sparkles className="w-5 h-5 text-cyan-400" />;
  if (code.includes("GOT") || name.includes("game of thrones")) return <Crown className="w-5 h-5 text-amber-500" />;
  if (code.includes("HP") || name.includes("harry potter")) return <Wand2 className="w-5 h-5 text-purple-400" />;
  if (code.includes("LOTR") || name.includes("lord of the rings")) return <Crown className="w-5 h-5 text-amber-400" />;
  if (code.includes("BOYS") || name.includes("the boys")) return <Zap className="w-5 h-5 text-yellow-400" />;
  if (code.includes("DUNE") || name.includes("dune")) return <Compass className="w-5 h-5 text-orange-400" />;

  if (bank === "COL-01") return <Flame className="w-5 h-5 text-amber-400" />;
  if (bank === "COL-02") return <Gamepad2 className="w-5 h-5 text-purple-400" />;
  if (bank === "COL-03") return <Film className="w-5 h-5 text-rose-400" />;
  if (bank === "COL-04") return <Tv className="w-5 h-5 text-sky-400" />;
  if (bank === "COL-05") return <Crown className="w-5 h-5 text-yellow-400" />;
  if (bank === "COL-06") return <Scroll className="w-5 h-5 text-emerald-400" />;

  return <Layers className="w-5 h-5 text-primary" />;
}

// Standardized Rarity Badge helper
function RarityBadge({ rarity }) {
  const norm = RARITY_ALIAS[rarity] || rarity;
  let bgClass = "bg-muted text-muted-foreground border-border/40";
  if (norm === "DIV" || norm === "ANOMALIA") bgClass = "bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]";
  else if (norm === "LR" || norm === "MR" || norm === "TRS") bgClass = "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
  else if (norm === "UR" || norm === "SSR") bgClass = "bg-rose-950/80 text-rose-300 border-rose-500/50";
  else if (norm === "SR" || norm === "R") bgClass = "bg-blue-950/80 text-blue-300 border-blue-500/50";
  else if (norm === "UC") bgClass = "bg-emerald-950/80 text-emerald-300 border-emerald-500/50";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border rounded-none uppercase ${bgClass}`}>
      {norm}
    </span>
  );
}

// Collection Card Tile Component
function CollectionTile({ collection, characterCount, ownedCharacterCount, itemCount, ownedItemCount, onClick, active }) {
  const charPct = characterCount > 0 ? Math.round((ownedCharacterCount / characterCount) * 100) : 0;
  const itemPct = itemCount > 0 ? Math.round((ownedItemCount / itemCount) * 100) : 0;
  const totalItems = characterCount + itemCount;
  const totalOwned = ownedCharacterCount + ownedItemCount;
  const overallPct = totalItems > 0 ? Math.round((totalOwned / totalItems) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`relative cursor-pointer border overflow-hidden transition-all duration-300 rounded-lg group ${
        active
          ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(234,88,12,0.15)]"
          : "border-border/40 bg-card/60 hover:border-border/80 hover:bg-card/90"
      }`}
    >
      <div className="aspect-[16/8] relative overflow-hidden bg-muted/20">
        {collection.image_url ? (
          <img
            src={collection.image_url}
            alt={collection.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card via-muted/20 to-background flex items-center justify-center relative">
            <div className="p-3 rounded-xl bg-background/80 border border-border/40 shadow-xl flex items-center justify-center">
              {getCollectionIcon(collection)}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        {active && <div className="absolute inset-0 bg-primary/10" />}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="font-mono text-[10px] text-primary font-bold px-2 py-0.5 bg-background/90 border border-primary/40 rounded-sm">
            {collection.code}
          </span>
          {overallPct === 100 && (
            <span className="font-mono text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-950/90 border border-amber-500/50 rounded-sm flex items-center gap-1">
              <Trophy className="w-3 h-3" /> COMPLETA
            </span>
          )}
        </div>
      </div>

      <div className="p-4 relative">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-muted/30 border border-border/40 shrink-0">
            {getCollectionIcon(collection)}
          </div>
          <h3 className="font-heading text-lg font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
            {collection.name}
          </h3>
        </div>
        {collection.description && (
          <p className="text-xs font-body text-muted-foreground mt-1 line-clamp-1">
            {collection.description}
          </p>
        )}

        {/* Display Obras / Titles contained in this collection */}
        {collection.works && collection.works.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-border/20">
            <span className="text-[10px] font-mono text-muted-foreground/80 font-bold block mb-1">
              OBRAS NESTA COLEÇÃO ({collection.works.length}):
            </span>
            <div className="flex flex-wrap gap-1">
              {collection.works.slice(0, 3).map((w, idx) => (
                <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted/40 border border-border/30 rounded text-foreground/80 truncate max-w-[130px]">
                  {w}
                </span>
              ))}
              {collection.works.length > 3 && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 rounded font-bold">
                  +{collection.works.length - 3} mais
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {/* Characters Count */}
          <div className="flex items-center justify-between text-[11px] font-body">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" /> Personagens
            </span>
            <span className="font-mono font-bold text-foreground">
              {ownedCharacterCount} / {characterCount} <span className="text-muted-foreground/60">({charPct}%)</span>
            </span>
          </div>

          {/* Items Count */}
          <div className="flex items-center justify-between text-[11px] font-body">
            <span className="text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3 text-emerald-400" /> Objetos & Equip.
            </span>
            <span className="font-mono font-bold text-foreground">
              {ownedItemCount} / {itemCount} <span className="text-muted-foreground/60">({itemPct}%)</span>
            </span>
          </div>

          {/* Overall Progress Bar */}
          <div className="pt-1">
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full ${overallPct === 100 ? "bg-amber-400" : "bg-primary"}`}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/20 flex items-center justify-between text-xs font-heading font-bold text-primary group-hover:translate-x-1 transition-transform">
          <span>VER DETALHES DA COLEÇÃO</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
}

// Placeholder for unowned card
function PlaceholderCard({ card }) {
  return (
    <div className="border border-border/20 bg-card/20 rounded-md overflow-hidden opacity-50 hover:opacity-75 transition-opacity">
      <div className="aspect-[3/4] bg-muted/10 flex items-center justify-center relative p-3">
        <div className="text-center">
          <Lock className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="font-heading text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">NÃO OBTIDA</p>
          <p className="font-body text-[11px] text-foreground/80 mt-1 line-clamp-1">{card.name}</p>
        </div>
        <div className="absolute top-2 right-2">
          <RarityBadge rarity={card.rarity} />
        </div>
      </div>
      <div className="p-2.5 bg-background/50 border-t border-border/10">
        <p className="font-mono text-[9px] text-muted-foreground truncate">{card.card_id || card.id}</p>
      </div>
    </div>
  );
}

// Item Card Component
function ItemTile({ item, ownedQuantity }) {
  const isOwned = ownedQuantity > 0;
  return (
    <div className={`border rounded-md p-3 transition-all ${isOwned ? "border-emerald-500/40 bg-emerald-950/10" : "border-border/30 bg-card/30 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded border border-border/40 bg-muted/20 flex items-center justify-center text-xl shrink-0">
          {item.icon || "📦"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-heading text-xs font-bold text-foreground truncate">{item.name}</h4>
            <RarityBadge rarity={item.rarity || "Common"} />
          </div>
          <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{item.item_id || item.id}</p>
        </div>
      </div>
      <p className="text-[11px] font-body text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
      <div className="mt-3 pt-2 border-t border-border/20 flex items-center justify-between text-[11px] font-body">
        <span className="text-muted-foreground/70">Possuído:</span>
        <span className={`font-mono font-bold ${isOwned ? "text-emerald-400" : "text-muted-foreground"}`}>
          {ownedQuantity} unid.
        </span>
      </div>
    </div>
  );
}

// Boss Tile Component (Separated Bosses)
function BossTile({ boss }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border border-red-500/30 bg-gradient-to-b from-red-950/20 to-background rounded-lg overflow-hidden shadow-lg relative group"
    >
      <div className="aspect-[16/9] relative overflow-hidden bg-black/60">
        {boss.image_url ? (
          <img src={boss.image_url} alt={boss.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-red-950/30">
            <Skull className="w-12 h-12 text-red-500/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="font-mono text-[10px] font-black text-red-400 px-2 py-0.5 bg-black/80 border border-red-500/50 rounded">
            BOSS LVL {boss.level || 99}
          </span>
          <span className="font-mono text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-950/80 border border-amber-500/40 rounded">
            {boss.series || "DeckVerse Raid"}
          </span>
        </div>
      </div>

      <div className="p-4 relative">
        <h3 className="font-heading text-lg font-black text-red-400 tracking-tight flex items-center gap-2">
          <Skull className="w-5 h-5 text-red-500 shrink-0" /> {boss.name}
        </h3>
        <p className="text-xs font-body text-muted-foreground mt-1 line-clamp-2">{boss.lore || boss.description}</p>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-red-500/20 text-[11px] font-body">
          <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
            <span className="text-red-300/70 block text-[10px] font-mono">PONTOS DE VIDA</span>
            <span className="font-mono font-bold text-red-400 text-xs">{(boss.hp || 50000).toLocaleString()} HP</span>
          </div>
          <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
            <span className="text-red-300/70 block text-[10px] font-mono">FRAQUEZA</span>
            <span className="font-mono font-bold text-amber-300 text-xs">{boss.weakness || "None"}</span>
          </div>
        </div>

        {boss.drops && boss.drops.length > 0 && (
          <div className="mt-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">RECOMPENSAS DE DROP:</span>
            <div className="flex flex-wrap gap-1">
              {boss.drops.map((drop, idx) => (
                <span key={idx} className="text-[10px] font-mono bg-amber-950/50 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  {drop}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const BANKS = [
  { id: "all", code: "TODOS", label: "Todos os Bancos do Multiverso", icon: <Globe className="w-4 h-4 text-cyan-400" /> },
  { id: "COL-01", code: "B1", label: "COL-01 — Animes, Mangás, LN & Webtoons", icon: <Flame className="w-4 h-4 text-amber-400" /> },
  { id: "COL-02", code: "B2", label: "COL-02 — Jogos", icon: <Gamepad2 className="w-4 h-4 text-purple-400" /> },
  { id: "COL-03", code: "B3", label: "COL-03 — Cinema & HQ Franquias", icon: <Film className="w-4 h-4 text-rose-400" /> },
  { id: "COL-04", code: "B4", label: "COL-04 — Séries & Animação Ocidental", icon: <Tv className="w-4 h-4 text-sky-400" /> },
  { id: "COL-05", code: "B5", label: "COL-05 — Mitologias", icon: <Crown className="w-4 h-4 text-yellow-400" /> },
  { id: "COL-06", code: "B6", label: "COL-06 — Históricos & Realidade", icon: <Scroll className="w-4 h-4 text-emerald-400" /> }
];

export default function Collections() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("collections"); // "collections" | "bosses" | "items"
  const [activeCollection, setActiveCollection] = useState(null);
  const [collectionSubTab, setCollectionSubTab] = useState("characters"); // "characters" | "items" | "bosses"
  const [selectedBank, setSelectedBank] = useState("all");
  const [sortBy, setSortBy] = useState("code"); // "code" | "name" | "cards" | "progress"
  const [showMetadata, setShowMetadata] = useState(false);
  
  const [rarityFilter, setRarityFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [elementFilter, setElementFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);

  // Queries
  const { data: dbCollections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => db.entities.Collection.list(),
  });

  const { data: dbCards = [], isLoading: loadingCards } = useQuery({
    queryKey: ["cards"],
    queryFn: () => db.entities.Card.list("-created_date", 1000),
  });

  const { data: dbItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => db.entities.Item.list(),
  });

  const { data: dbBosses = [] } = useQuery({
    queryKey: ["bosses"],
    queryFn: () => db.entities.Boss.list(),
  });

  // Combined canonical data
  const collections = useMemo(() => {
    const seenIds = new Set();
    const seenCodes = new Set();
    const seenNames = new Set();
    const list = [];

    dbCollections.forEach((c, idx) => {
      const codeKey = (c.code || "").toUpperCase();
      const nameKey = (c.name || "").toLowerCase();

      // Exclude legacy standalone Super-Choque and Justiça Jovem collections
      if (
        codeKey === "COL-04-STATIC" ||
        codeKey === "COL-04-YJ" ||
        nameKey.includes("super-choque") ||
        nameKey.includes("justiça jovem") ||
        nameKey.includes("justica jovem")
      ) {
        return;
      }

      const idKey = c.id || c.code || `db_col_${idx}`;
      let finalName = c.name;
      let finalDescription = c.description;
      let finalWorks = c.works;

      if (codeKey === "COL-03-MARVEL") {
        finalName = "Marvel Comics Universe";
      } else if (codeKey === "COL-03-DC") {
        finalName = "DC Universe";
        finalWorks = ["DC Universe", "Justiça Jovem", "Super-Choque", "Batman", "Superman", "Flash", "Liga da Justiça"];
      }

      if (!seenIds.has(idKey) && (!codeKey || !seenCodes.has(codeKey)) && (!finalName || !seenNames.has(finalName.toLowerCase()))) {
        seenIds.add(idKey);
        if (codeKey) seenCodes.add(codeKey);
        if (finalName) seenNames.add(finalName.toLowerCase());
        list.push({
          ...c,
          name: finalName,
          description: finalDescription,
          works: finalWorks || [finalName],
          id: idKey,
        });
      }
    });

    MEGA_COLLECTIONS.forEach((m, idx) => {
      const codeKey = (m.code || "").toUpperCase();
      const nameKey = (m.name || "").toLowerCase();
      const idKey = m.id || `mega_col_${idx}`;

      if (!seenIds.has(idKey) && !seenCodes.has(codeKey) && !seenNames.has(nameKey)) {
        seenIds.add(idKey);
        if (codeKey) seenCodes.add(codeKey);
        if (nameKey) seenNames.add(nameKey);
        list.push({
          id: idKey,
          code: m.code,
          bank: m.bank,
          name: m.name,
          description: m.description,
          image_url: m.image_url,
          works: m.works || [m.name]
        });
      }
    });

    return list;
  }, [dbCollections]);

  const cards = useMemo(() => {
    if (dbCards && dbCards.length > 0) return dbCards;
    return getAllExpandedCards();
  }, [dbCards]);

  const items = useMemo(() => {
    if (dbItems && dbItems.length > 0) return dbItems;
    return MEGA_ITEMS;
  }, [dbItems]);

  const bosses = useMemo(() => {
    if (dbBosses && dbBosses.length > 0) return dbBosses;
    return MEGA_BOSSES;
  }, [dbBosses]);

  const handleSeedAcervo = async () => {
    setIsSeeding(true);
    try {
      await importService.seedAcervo62();
      
      const expandedCards = getAllExpandedCards();
      for (let i = 0; i < expandedCards.length; i += 25) {
        const chunk = expandedCards.slice(i, i + 25);
        await Promise.all(chunk.map(c => entityRepository.saveCard(c)));
      }
      for (const item of MEGA_ITEMS) {
        await db.entities.Item.create(item).catch(() => {});
      }
      for (const boss of MEGA_BOSSES) {
        await entityRepository.saveBoss(boss).catch(() => {});
      }

      await queryClient.invalidateQueries(["collections"]);
      await queryClient.invalidateQueries(["cards"]);
      await queryClient.invalidateQueries(["items"]);
      await queryClient.invalidateQueries(["bosses"]);

      toast.success("⚡ Acervo semeado com sucesso! 62 coleções e catálogos sincronizados.");
    } catch (err) {
      console.error("Erro ao semear acervo:", err);
      toast.error("Falha ao semear acervo: " + (err.message || err));
    } finally {
      setIsSeeding(false);
    }
  };

  const { data: players = [] } = useQuery({
    queryKey: ["players-col"],
    queryFn: () => db.entities.Player.list(),
    enabled: !!user,
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ["roster-col"],
    queryFn: () => db.entities.Roster.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: playerItems = [] } = useQuery({
    queryKey: ["player-items-col"],
    queryFn: () => db.entities.PlayerItem.list(),
    enabled: !!user,
  });

  const player = players.find(p => p.created_by === user?.email) || null;
  const myId = player?.discord_id || user?.email || "";

  const ownedCardIds = useMemo(() => {
    return new Set(rosterEntries.filter(r => r.player_discord_id === myId).map(r => r.card_id));
  }, [rosterEntries, myId]);

  const playerItemsMap = useMemo(() => {
    const map = {};
    playerItems.filter(pi => pi.player_discord_id === myId).forEach(pi => {
      map[pi.item_id] = (map[pi.item_id] || 0) + (pi.quantity || 1);
    });
    return map;
  }, [playerItems, myId]);

  // Counts by Collection
  const collectionStats = useMemo(() => {
    const stats = {};
    collections.forEach(col => {
      stats[col.name] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
      if (col.code) stats[col.code] = stats[col.name];
    });

    cards.forEach(card => {
      const colId = card.collection_id;
      const series = card.series || "Other";
      const matchedCol = collections.find(c =>
        c.code === colId ||
        c.name === series ||
        (c.works && Array.isArray(c.works) && c.works.includes(series))
      );
      if (matchedCol) {
        const key = matchedCol.name;
        if (!stats[key]) stats[key] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
        stats[key].totalCards += 1;
        if (ownedCardIds.has(card.id)) stats[key].ownedCards += 1;
      } else {
        if (!stats[series]) stats[series] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
        stats[series].totalCards += 1;
        if (ownedCardIds.has(card.id)) stats[series].ownedCards += 1;
      }
    });

    items.forEach(item => {
      const colId = item.collection_id;
      const series = item.series || item.collection_name || "Outros";
      const matchedCol = collections.find(c =>
        c.code === colId ||
        c.name === series ||
        (c.works && Array.isArray(c.works) && c.works.includes(series))
      );
      if (matchedCol) {
        const key = matchedCol.name;
        if (!stats[key]) stats[key] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
        stats[key].totalItems += 1;
        if (playerItemsMap[item.id] > 0 || playerItemsMap[item.item_id] > 0) {
          stats[key].ownedItems += 1;
        }
      } else {
        if (!stats[series]) stats[series] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
        stats[series].totalItems += 1;
        if (playerItemsMap[item.id] > 0 || playerItemsMap[item.item_id] > 0) {
          stats[series].ownedItems += 1;
        }
      }
    });

    return stats;
  }, [collections, cards, items, ownedCardIds, playerItemsMap]);

  // Total metrics
  const totalOwnedCardsCount = ownedCardIds.size;
  const totalCardsCount = cards.length;
  const globalCardsCompletionPct = totalCardsCount > 0 ? Math.round((totalOwnedCardsCount / totalCardsCount) * 100) : 0;

  const totalItemsCount = items.length;
  const totalOwnedItemsCount = useMemo(() => {
    return items.filter(item => (playerItemsMap[item.id] || playerItemsMap[item.item_id] || 0) > 0).length;
  }, [items, playerItemsMap]);
  const globalItemsCompletionPct = totalItemsCount > 0 ? Math.round((totalOwnedItemsCount / totalItemsCount) * 100) : 0;

  // Collection breakdown counts
  const { completedCollectionsCount, inProgressCollectionsCount, unstartedCollectionsCount } = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let unstarted = 0;
    collections.forEach(col => {
      const stats = collectionStats[col.name] || { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
      const total = stats.totalCards + stats.totalItems;
      const owned = stats.ownedCards + stats.ownedItems;
      if (total > 0 && owned === total) completed++;
      else if (owned > 0) inProgress++;
      else unstarted++;
    });
    return { completedCollectionsCount: completed, inProgressCollectionsCount: inProgress, unstartedCollectionsCount: unstarted };
  }, [collections, collectionStats]);

  // Supreme cards count
  const supremeCardsCount = useMemo(() => {
    const supremeRarities = new Set(["DIV", "ANOMALIA", "LR", "MR", "TRS", "UR", "SSR", "Mythic", "Legendary", "Sovereign"]);
    return cards.filter(c => ownedCardIds.has(c.id) && supremeRarities.has(c.rarity)).length;
  }, [cards, ownedCardIds]);

  const [overviewStatusFilter, setOverviewStatusFilter] = useState("all"); // "all" | "completed" | "in_progress" | "unstarted"

  // Filtered collections by overview status, bank & search
  const filteredCollections = useMemo(() => {
    return collections.filter(col => {
      const stats = collectionStats[col.name] || { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
      const total = stats.totalCards + stats.totalItems;
      const owned = stats.ownedCards + stats.ownedItems;
      const matchesSearch = !searchQuery ||
        col.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        col.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (col.works && col.works.some(w => w.toLowerCase().includes(searchQuery.toLowerCase())));
      
      let matchesStatus = true;
      if (overviewStatusFilter === "completed") matchesStatus = total > 0 && owned === total;
      else if (overviewStatusFilter === "in_progress") matchesStatus = owned > 0 && owned < total;
      else if (overviewStatusFilter === "unstarted") matchesStatus = owned === 0;

      let matchesBank = true;
      if (selectedBank !== "all") {
        matchesBank = (col.code && col.code.startsWith(selectedBank)) || col.bank === selectedBank || col.bank_id === selectedBank;
      }

      return matchesSearch && matchesStatus && matchesBank;
    }).sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: 'base' });
      } else if (sortBy === "cards") {
        const statsA = collectionStats[a.name]?.totalCards || 0;
        const statsB = collectionStats[b.name]?.totalCards || 0;
        return statsB - statsA;
      } else if (sortBy === "progress") {
        const sA = collectionStats[a.name] || { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
        const sB = collectionStats[b.name] || { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
        const pctA = (sA.totalCards + sA.totalItems) > 0 ? (sA.ownedCards + sA.ownedItems) / (sA.totalCards + sA.totalItems) : 0;
        const pctB = (sB.totalCards + sB.totalItems) > 0 ? (sB.ownedCards + sB.ownedItems) / (sB.totalCards + sB.totalItems) : 0;
        return pctB - pctA;
      } else {
        // "code" (default numeral sort)
        const codeA = a.code || a.name || "";
        const codeB = b.code || b.name || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
  }, [collections, collectionStats, searchQuery, overviewStatusFilter, selectedBank, sortBy]);

  // Filtered Cards for active selection (Sorted Alphabetically by Name)
  const filteredCards = useMemo(() => {
    const normalizeRarity = (r) => RARITY_ALIAS[r] || r;
    return cards.filter((card) => {
      const matchesRarity = rarityFilter === "all" || normalizeRarity(card.rarity) === rarityFilter || card.rarity === rarityFilter;
      const matchesRole = roleFilter === "all" || card.role === roleFilter;
      const matchesElement = elementFilter === "all" || card.element === elementFilter;
      const matchesGender = genderFilter === "all" || card.gender === genderFilter;
      const matchesLevel = levelFilter === "all" ||
        (levelFilter === "owned" && ownedCardIds.has(card.id)) ||
        (levelFilter === "missing" && !ownedCardIds.has(card.id));
      const matchesSearch = !searchQuery ||
        card.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.series?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollection = !activeCollection ||
        card.collection_id === activeCollection.code ||
        card.series === activeCollection.name ||
        (activeCollection.works && Array.isArray(activeCollection.works) && activeCollection.works.includes(card.series));
      const isValidStatus = card.status !== "quarantine" && card.status !== "rejected";
      return matchesRarity && matchesRole && matchesElement && matchesGender && matchesLevel && matchesSearch && matchesCollection && isValidStatus;
    }).sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: 'base' }));
  }, [cards, rarityFilter, roleFilter, elementFilter, genderFilter, levelFilter, searchQuery, activeCollection, ownedCardIds]);

  // Filtered Items for active selection (Sorted Alphabetically by Name)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !searchQuery ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const itemSeries = item.series || item.collection_name;
      const matchesCollection = !activeCollection ||
        item.collection_id === activeCollection.code ||
        itemSeries === activeCollection.name ||
        (activeCollection.works && Array.isArray(activeCollection.works) && activeCollection.works.includes(itemSeries));
      return matchesSearch && matchesCollection;
    }).sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: 'base' }));
  }, [items, searchQuery, activeCollection]);

  // Filtered Bosses strictly bound to active collection (Sorted Alphabetically by Name)
  const filteredBosses = useMemo(() => {
    return bosses.filter((boss) => {
      const matchesSearch = !searchQuery ||
        boss.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        boss.series?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollection = !activeCollection ||
        boss.collection_id === activeCollection.code ||
        boss.series === activeCollection.name ||
        (activeCollection.works && Array.isArray(activeCollection.works) && activeCollection.works.includes(boss.series));
      return matchesSearch && matchesCollection;
    }).sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: 'base' }));
  }, [bosses, searchQuery, activeCollection]);

  const hasActiveFilters = rarityFilter !== "all" || roleFilter !== "all" || elementFilter !== "all" || genderFilter !== "all" || levelFilter !== "all" || searchQuery;

  const clearAllFilters = () => {
    setRarityFilter("all");
    setRoleFilter("all");
    setElementFilter("all");
    setGenderFilter("all");
    setLevelFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <Navbar onSearch={setSearchQuery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header Banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border border-primary/30 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">COLEÇÕES DO DECKVERSE</h1>
                <p className="text-xs font-body text-muted-foreground mt-0.5">
                  EXPLORE UNIVERSOS • {totalCardsCount} PERSONAGENS • {items.length} OBJETOS • {bosses.length} CHEFES
                </p>
              </div>
            </div>

            {/* Top Level Navigation Tabs */}
            <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border/40 self-start sm:self-auto">
              <button
                onClick={() => { setActiveTab("collections"); setActiveCollection(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-heading font-bold rounded-md transition-all ${
                  activeTab === "collections" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Coleções ({collections.length})
              </button>

              <button
                onClick={() => { setActiveTab("bosses"); setActiveCollection(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-heading font-bold rounded-md transition-all ${
                  activeTab === "bosses" ? "bg-red-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-red-950/20"
                }`}
              >
                <Skull className="w-3.5 h-3.5 text-red-400" /> Chefes ({bosses.length})
              </button>

              <button
                onClick={() => { setActiveTab("items"); setActiveCollection(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-heading font-bold rounded-md transition-all ${
                  activeTab === "items" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-emerald-950/20"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-emerald-400" /> Objetos ({items.length})
              </button>
            </div>
          </div>
        </motion.div>

        {/* VIEW 1: SINGLE COLLECTION DETAILED VIEW */}
        {activeCollection ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <button
              onClick={() => setActiveCollection(null)}
              className="inline-flex items-center gap-2 text-xs font-heading font-bold text-muted-foreground hover:text-primary transition-colors border border-border/40 px-3 py-1.5 rounded-md bg-card/40"
            >
              <ArrowLeft className="w-4 h-4" /> VOLTAR PARA TODAS AS COLEÇÕES
            </button>

            {/* Collection Selected Header */}
            <div className="border border-primary/30 bg-card/60 rounded-xl p-6 relative overflow-hidden shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/20 text-primary border border-primary/40 rounded">
                      {activeCollection.code}
                    </span>
                    <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground">{activeCollection.name}</h2>
                  </div>
                  <p className="text-sm font-body text-muted-foreground mt-2 max-w-2xl">{activeCollection.description}</p>
                  {activeCollection.works && activeCollection.works.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-primary uppercase">OBRAS DESTA COLEÇÃO ({activeCollection.works.length}):</span>
                      {activeCollection.works.map((w, idx) => (
                        <span key={idx} className="font-mono text-[11px] px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary rounded font-bold">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 bg-background/80 p-4 rounded-lg border border-border/40">
                  <div className="text-center px-2">
                    <span className="text-[10px] font-mono text-muted-foreground block">PERSONAGENS</span>
                    <span className="font-mono text-lg font-bold text-primary">
                      {collectionStats[activeCollection.name]?.ownedCards || 0} / {collectionStats[activeCollection.name]?.totalCards || 0}
                    </span>
                  </div>
                  <div className="h-8 w-[1px] bg-border/40" />
                  <div className="text-center px-2">
                    <span className="text-[10px] font-mono text-muted-foreground block">OBJETOS & EQUIP.</span>
                    <span className="font-mono text-lg font-bold text-emerald-400">
                      {collectionStats[activeCollection.name]?.ownedItems || 0} / {collectionStats[activeCollection.name]?.totalItems || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapsible Universe Metadata */}
              <div className="mt-4 pt-4 border-t border-border/30 relative z-10">
                <button
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="flex items-center gap-2 text-xs font-heading font-bold text-primary hover:underline"
                >
                  <Info className="w-4 h-4" />
                  <span>Metadados do universo {showMetadata ? "▲" : "▾"}</span>
                </button>

                {showMetadata && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-3 p-4 bg-background/90 border border-border/40 rounded-lg space-y-3 text-xs font-body"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-mono">CÓDIGO FULL</span>
                        <span className="font-mono font-bold text-foreground">{activeCollection.code}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-mono">BANCO</span>
                        <span className="font-mono font-bold text-foreground">
                          {activeCollection.code?.substring(0, 6) || "COL-01"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-mono">FANDOM / SÉRIE</span>
                        <span className="font-mono font-bold text-foreground">{activeCollection.name}</span>
                      </div>
                    </div>

                    {filteredBosses.length > 0 && (
                      <div className="pt-2 border-t border-border/20">
                        <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">
                          4 SERES MAIS FORTES (BOSSES CANÔNICOS):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {filteredBosses.slice(0, 4).map((boss, idx) => (
                            <span key={boss.id || idx} className="px-2 py-0.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded font-mono text-[11px]">
                              {idx + 1}. {boss.name} (Lvl {boss.level || 99})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Collection Content Sub-Tabs */}
            <div className="sticky top-14 z-20 bg-background/95 backdrop-blur-md py-3 border-b border-border/40 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setCollectionSubTab("characters")}
                  className={`font-heading text-xs sm:text-sm font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                    collectionSubTab === "characters" ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="w-4 h-4" /> Personagens & Cartas ({filteredCards.length})
                </button>

                <button
                  onClick={() => setCollectionSubTab("items")}
                  className={`font-heading text-xs sm:text-sm font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                    collectionSubTab === "items" ? "border-emerald-400 bg-emerald-950/20 text-emerald-400" : "border-border/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-400" /> Objetos & Equip. ({filteredItems.length})
                </button>

                <button
                  onClick={() => setCollectionSubTab("bosses")}
                  className={`font-heading text-xs sm:text-sm font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                    collectionSubTab === "bosses" ? "border-red-500 bg-red-950/20 text-red-400" : "border-border/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Skull className="w-4 h-4 text-red-400" /> Chefes da Coleção ({filteredBosses.length})
                </button>
              </div>

              {collectionSubTab === "characters" && (
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-1.5 h-8 px-3 border rounded text-xs font-heading font-bold transition-all ${
                    showFilters ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" /> FILTROS {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              )}
            </div>

            {/* Filters Row */}
            <AnimatePresence>
              {showFilters && collectionSubTab === "characters" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <div className="flex flex-wrap gap-2 p-4 bg-card/40 border border-border/30 rounded-lg">
                    <Select value={rarityFilter} onValueChange={setRarityFilter}>
                      <SelectTrigger className="w-36 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Raridade" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas Raridades</SelectItem>
                        {RARITY_ORDER.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-32 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Classe" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas Classes</SelectItem>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select value={elementFilter} onValueChange={setElementFilter}>
                      <SelectTrigger className="w-36 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Elemento" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Elementos</SelectItem>
                        {ELEMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                      <SelectTrigger className="w-32 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Gênero" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Gêneros</SelectItem>
                        {GENDER_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="w-36 h-8 bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Cartas</SelectItem>
                        <SelectItem value="owned">Coletadas</SelectItem>
                        <SelectItem value="missing">Não Coletadas</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground border border-border/40 px-3 h-8 rounded">
                        <X className="w-3 h-3" /> Limpar
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Display Characters or Items */}
            {collectionSubTab === "characters" ? (
              filteredCards.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/40 rounded-lg">
                  <p className="font-heading text-base text-muted-foreground">Nenhum personagem encontrado nesta coleção.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredCards.map((card, idx) => {
                    const isOwned = ownedCardIds.has(card.id);
                    return isOwned || !user ? (
                      <CardListItem key={card.id} card={card} index={idx} />
                    ) : (
                      <PlaceholderCard key={card.id} card={card} />
                    );
                  })}
                </div>
              )
            ) : collectionSubTab === "items" ? (
              filteredItems.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/40 rounded-lg">
                  <p className="font-heading text-base text-muted-foreground">Nenhum objeto registrado nesta coleção.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredItems.map((item) => {
                    const ownedQty = playerItemsMap[item.id] || playerItemsMap[item.item_id] || 0;
                    return <ItemTile key={item.id} item={item} ownedQuantity={ownedQty} />;
                  })}
                </div>
              )
            ) : filteredBosses.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-lg">
                <p className="font-heading text-base text-muted-foreground">Nenhum chefe de raid vinculado diretamente a esta coleção.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBosses.map((boss) => (
                  <BossTile key={boss.id} boss={boss} />
                ))}
              </div>
            )}
          </motion.div>
        ) : activeTab === "bosses" ? (
          /* VIEW 2: DEDICATED BOSSES SECTION */
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="border border-red-500/30 bg-gradient-to-r from-red-950/30 via-background to-background p-6 rounded-xl relative">
              <div className="flex items-center gap-3">
                <Skull className="w-8 h-8 text-red-500" />
                <div>
                  <h2 className="font-heading text-xl font-black text-red-400">CHEFES DE RAID E BOSSES DO DECKVERSE</h2>
                  <p className="text-xs font-body text-muted-foreground mt-0.5">
                    ESTES BOSSES NÃO FAZEM PARTE DAS COLEÇÕES PADRÃO. DESAFIE-OS NA ARENA DE BATALHA!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bosses.map((boss) => (
                <BossTile key={boss.id} boss={boss} />
              ))}
            </div>
          </motion.div>
        ) : activeTab === "items" ? (
          /* VIEW 3: ALL ITEMS CATALOG */
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-background to-background p-6 rounded-xl">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-emerald-400" />
                <div>
                  <h2 className="font-heading text-xl font-black text-emerald-400">CATÁLOGO GERAL DE OBJETOS & EQUIPAMENTOS</h2>
                  <p className="text-xs font-body text-muted-foreground mt-0.5">
                    TODOS OS ITENS, CONSUMÍVEIS E EQUIPS DISPONÍVEIS NO DECKVERSE.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((item) => {
                const ownedQty = playerItemsMap[item.id] || playerItemsMap[item.item_id] || 0;
                return <ItemTile key={item.id} item={item} ownedQuantity={ownedQty} />;
              })}
            </div>
          </motion.div>
        ) : (
          /* VIEW 4: MAIN COLLECTIONS LIST WITH COLLECTION OVERVIEW */
          <div className="space-y-8">
            {/* COLLECTION OVERVIEW DASHBOARD PANEL */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-primary/30 bg-gradient-to-br from-card/80 via-card/50 to-background/90 rounded-2xl p-6 shadow-xl relative overflow-hidden"
            >
              {/* Background accent glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-primary/40 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                      VISÃO GERAL DO COLECIONADOR
                    </h2>
                    <p className="text-xs font-body text-muted-foreground mt-0.5">
                      PROGRESSO GLOBAL DE CARTAS, OBJETOS E CONQUISTAS DE COLEÇÃO
                    </p>
                  </div>
                </div>

                {/* Status Badges Filter + Semente CTA */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={handleSeedAcervo}
                    disabled={isSeeding}
                    className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-primary-foreground font-heading text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Semeia as 62 coleções canônicas do acervo no banco de dados"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isSeeding ? "Semeando..." : "⚡ Semente Acervo (62)"}
                  </button>

                  <div className="h-4 w-[1px] bg-border/40 my-auto hidden sm:block" />

                  <button
                    onClick={() => setOverviewStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all border ${
                      overviewStatusFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/20 border-border/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Todas ({collections.length})
                  </button>
                  <button
                    onClick={() => setOverviewStatusFilter("completed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all border flex items-center gap-1 ${
                      overviewStatusFilter === "completed"
                        ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm"
                        : "bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-950/40"
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" /> Concluídas ({completedCollectionsCount})
                  </button>
                  <button
                    onClick={() => setOverviewStatusFilter("in_progress")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all border flex items-center gap-1 ${
                      overviewStatusFilter === "in_progress"
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-blue-950/20 border-blue-500/30 text-blue-300 hover:bg-blue-950/40"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Em Progresso ({inProgressCollectionsCount})
                  </button>
                  <button
                    onClick={() => setOverviewStatusFilter("unstarted")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all border flex items-center gap-1 ${
                      overviewStatusFilter === "unstarted"
                        ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                        : "bg-slate-900/40 border-slate-700/40 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    Não Iniciadas ({unstartedCollectionsCount})
                  </button>
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* Stat 1: Cards */}
                <div className="bg-background/80 border border-border/40 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider">PERSONAGENS</span>
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-black text-foreground tabular-nums">
                      {totalOwnedCardsCount} <span className="text-xs text-muted-foreground font-normal">/ {totalCardsCount}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-primary">{globalCardsCompletionPct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${globalCardsCompletionPct}%` }} />
                  </div>
                </div>

                {/* Stat 2: Items */}
                <div className="bg-background/80 border border-border/40 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider">OBJETOS & EQUIPS</span>
                    <Package className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-black text-foreground tabular-nums">
                      {totalOwnedItemsCount} <span className="text-xs text-muted-foreground font-normal">/ {totalItemsCount}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-400">{globalItemsCompletionPct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${globalItemsCompletionPct}%` }} />
                  </div>
                </div>

                {/* Stat 3: Completed Collections */}
                <div className="bg-background/80 border border-amber-500/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-amber-300">COLEÇÕES 100%</span>
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-black text-amber-400 tabular-nums">
                      {completedCollectionsCount} <span className="text-xs text-muted-foreground font-normal">/ {collections.length}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {collections.length > 0 ? Math.round((completedCollectionsCount / collections.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${collections.length > 0 ? (completedCollectionsCount / collections.length) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Stat 4: Supreme Rarities */}
                <div className="bg-background/80 border border-purple-500/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-purple-300">CARTAS SUPREMAS</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-black text-purple-300 tabular-nums">
                      {supremeCardsCount}
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold px-1.5 py-0.5 bg-purple-950/60 border border-purple-500/40 rounded">
                      SSR/UR/LR
                    </span>
                  </div>
                  <p className="text-[11px] font-body text-muted-foreground truncate">Personagens de elite no seu Roster</p>
                </div>
              </div>
            </motion.div>

            {/* BANK SELECTOR BAR & LEGEND */}
            <div className="bg-card/40 border border-border/40 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-heading text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> BANCOS DO MULTIVERSO:
                </span>
                
                {/* SORTING CONTROLS */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground uppercase font-bold">ORDENAR POR:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-background border border-border/60 text-foreground font-mono text-xs px-2.5 py-1 rounded-md focus:outline-none focus:border-primary font-bold cursor-pointer"
                  >
                    <option value="code">🔢 Código (Numeral)</option>
                    <option value="name">🔤 Nome (A-Z)</option>
                    <option value="cards">🎴 Mais Cartas</option>
                    <option value="progress">📊 Maior Progresso %</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {BANKS.map(bank => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                      selectedBank === bank.id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/20 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span>{bank.icon}</span>
                    <span>{bank.code}</span>
                  </button>
                ))}
              </div>

              <div className="pt-1 border-t border-border/20 flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted-foreground">
                  Legenda: <span className="text-primary font-bold">{BANKS.find(b => b.id === selectedBank)?.label || "COL-01 — Animes, Mangás, LN & Webtoons"}</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Exibindo <span className="text-foreground font-bold">{filteredCollections.length}</span> coleções
                </span>
              </div>
            </div>

            {/* COLLECTIONS GRID */}
            {loadingCards ? (
              <CollectionSkeleton count={6} />
            ) : filteredCollections.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-primary/40 rounded-2xl bg-gradient-to-b from-card/80 via-card/50 to-background p-8 space-y-4 shadow-xl">
                <div className="w-16 h-16 mx-auto bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center text-primary shadow-lg animate-pulse">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="font-heading text-lg font-black text-foreground uppercase tracking-tight">
                    NENHUMA COLEÇÃO REGISTRADA NESTE BANCO
                  </h3>
                  <p className="text-xs font-body text-muted-foreground leading-relaxed">
                    Semeie as 62 coleções do acervo canônico (COL-01 a COL-06) para popular todos os universos de Animes, Jogos, Filmes, Séries, Mitologias e Históricos.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <button
                    onClick={handleSeedAcervo}
                    disabled={isSeeding}
                    className="px-6 py-3 bg-primary text-primary-foreground font-heading text-xs font-black tracking-wider uppercase rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    {isSeeding ? "SEMEANDO ACERVO DECKVERSE..." : "⚡ SEMENTE ACERVO (62 COLEÇÕES)"}
                  </button>
                  <button
                    onClick={() => { setOverviewStatusFilter("all"); setSelectedBank("all"); setSearchQuery(""); }}
                    className="px-4 py-3 bg-card border border-border text-foreground font-heading text-xs font-bold rounded-xl hover:border-primary/50 transition-all cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCollections.map((col) => {
                  const stats = collectionStats[col.name] || { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
                  return (
                    <CollectionTile
                      key={col.id}
                      collection={col}
                      characterCount={stats.totalCards}
                      ownedCharacterCount={stats.ownedCards}
                      itemCount={stats.totalItems}
                      ownedItemCount={stats.ownedItems}
                      onClick={() => {
                        setActiveCollection(col);
                        setCollectionSubTab("characters");
                      }}
                      active={activeCollection?.id === col.id}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
