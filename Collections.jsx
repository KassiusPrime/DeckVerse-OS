import { db } from "@/deckverseClient";
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { soundEffects } from "@/src/utils/soundEffects";
import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, getAllExpandedCards } from "@/src/data/megaCollectionsData";
import { deduplicateCards, deduplicateCollections, enforceCollectionMaxLimit } from "@/src/utils/deduplication";
import { inferCollectionCode } from "@/lib/collectionCodes";
import { importService } from "@/core/importService";
import { entityRepository } from "@/core/entityRepository";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
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
  Swords,
  Volume2,
  VolumeX,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
  User,
  Heart,
  EyeOff,
  ImageOff,
  RefreshCw,
  Sparkle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import Navbar from "@/Navbar";
import CardListItem from "@/CardListItem";
import { RARITY_ORDER, RARITY_ALIAS } from "@/constants";
import { DeckVerseLoader } from "@/LoadingAnimation";

const OFFICIAL_CATEGORIES = [
  { id: "all", label: "Todas", icon: <Globe className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: "Quadrinhos", label: "Quadrinhos", icon: <BookOpen className="w-3.5 h-3.5 text-rose-400" /> },
  { id: "Anime", label: "Anime", icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
  { id: "Mangá", label: "Mangá", icon: <Compass className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: "Literatura", label: "Literatura", icon: <Scroll className="w-3.5 h-3.5 text-yellow-400" /> },
  { id: "Cinema", label: "Cinema", icon: <Film className="w-3.5 h-3.5 text-indigo-400" /> },
  { id: "Séries", label: "Séries", icon: <Tv className="w-3.5 h-3.5 text-sky-400" /> },
  { id: "Games", label: "Games", icon: <Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> },
  { id: "Mitologia", label: "Mitologia", icon: <Crown className="w-3.5 h-3.5 text-amber-300" /> },
  { id: "Animações", label: "Animações", icon: <Wand2 className="w-3.5 h-3.5 text-pink-400" /> },
  { id: "Outros", label: "Outros", icon: <Layers className="w-3.5 h-3.5 text-slate-400" /> }
];

const ALPHABET = ["TODOS", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

const CATEGORY_COLORS = {
  Quadrinhos: "#E11D48",
  Anime: "#F59E0B",
  Mangá: "#10B981",
  Literatura: "#D97706",
  Cinema: "#6366F1",
  Séries: "#0284C7",
  Games: "#A855F7",
  Mitologia: "#FBBF24",
  Animações: "#EC4899",
  Outros: "#64748B"
};

const PERSONALITY_OPTIONS = ["Estratégico", "Determinado", "Caótico", "Manipulador", "Inspirador", "Idealista", "Calculista", "Pragmático", "Dominador", "Reservado", "Adaptável", "Persistente"];
const IDENTITY_OPTIONS = ["Herói", "Vilão", "Anti-herói", "Anti-vilão", "Civil", "Entidade", "Deus", "Alienígena", "Mutante", "Humano", "IA", "Criatura"];
const ORIGIN_OPTIONS = ["Tecnológica", "Mística", "Divina", "Cósmica", "Mutante", "Artificial", "Biológica", "Dimensional", "Temporal", "Experimental"];
const CLASS_OPTIONS = ["Combatente", "Mago", "Tanque", "Assassino", "Suporte", "Atirador", "Líder", "Cientista", "Detetive", "Invocador"];
const NARRATIVE_ROLE_OPTIONS = ["Protagonista", "Antagonista", "Anti-herói", "Aliado", "Rival", "Coadjuvante", "NPC"];
const POWER_TYPE_OPTIONS = ["Físico", "Mental", "Mágico", "Cósmico", "Tecnológico", "Temporal", "Espacial", "Biológico", "Elemental", "Multiversal"];

function getCollectionIcon(collection) {
  const cat = collection?.category || "";
  const name = (collection?.name || "").toLowerCase();

  if (cat === "Quadrinhos" || name.includes("dc") || name.includes("marvel")) return <BookOpen className="w-5 h-5 text-rose-400" />;
  if (cat === "Anime" || cat === "Mangá") return <Flame className="w-5 h-5 text-amber-400" />;
  if (cat === "Games") return <Gamepad2 className="w-5 h-5 text-purple-400" />;
  if (cat === "Cinema") return <Film className="w-5 h-5 text-indigo-400" />;
  if (cat === "Séries" || cat === "Animações") return <Tv className="w-5 h-5 text-sky-400" />;
  if (cat === "Mitologia") return <Crown className="w-5 h-5 text-yellow-400" />;
  if (cat === "Literatura") return <Scroll className="w-5 h-5 text-emerald-400" />;
  return <Layers className="w-5 h-5 text-cyan-400" />;
}

export default function Collections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Primary Views & Subtabs
  const [activeTab, setActiveTab] = useState("collections"); // "collections" | "bosses" | "items"
  const [activeCollection, setActiveCollection] = useState(null);
  const [collectionSubTab, setCollectionSubTab] = useState("characters"); // "characters" | "bosses" | "items"
  
  // Controls & Sound Toggle
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Category & Quick Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all"); // "all" | "favorites" | "recent" | "completed" | "updating" | "no_image" | "incomplete" | "hidden"
  const [selectedLetter, setSelectedLetter] = useState("TODOS");
  const [selectedBank, setSelectedBank] = useState("all");
  const [sortBy, setSortBy] = useState("alphabetical"); // "alphabetical" | "category" | "publisher" | "universe" | "cards" | "progress"
  const [searchQuery, setSearchQuery] = useState("");

  // Favorites in LocalStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("deckverse_col_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (colId, e) => {
    if (e) e.stopPropagation();
    soundEffects.playClick();
    setFavorites(prev => {
      const next = prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId];
      localStorage.setItem("deckverse_col_favorites", JSON.stringify(next));
      return next;
    });
  };

  // Card Advanced Multi-Classification Filters
  const [personalityFilter, setPersonalityFilter] = useState("all");
  const [identityFilter, setIdentityFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [narrativeRoleFilter, setNarrativeRoleFilter] = useState("all");
  const [powerTypeFilter, setPowerTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [elementFilter, setElementFilter] = useState("all");

  const [isSeeding, setIsSeeding] = useState(false);

  // sound toggle sync
  useEffect(() => {
    soundEffects.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playToggle();
  };

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

  // Combined canonical collections
  const collections = useMemo(() => {
    const seenIds = new Set();
    const seenCodes = new Set();
    const seenNames = new Set();
    const list = [];

    dbCollections.forEach((c, idx) => {
      const codeKey = (c.code || "").toUpperCase();
      const nameKey = (c.name || "").toLowerCase();

      // Skip deprecated standalone entries
      if (codeKey === "COL-04-STATIC" || codeKey === "COL-04-YJ" || nameKey.includes("super-choque") || nameKey.includes("justiça jovem")) return;

      const idKey = c.id || c.code || `db_col_${idx}`;
      let finalName = c.name;
      let finalWorks = c.works;

      if (codeKey === "COL-03-MARVEL") finalName = "Marvel Comics Universe";
      else if (codeKey === "COL-03-DC") {
        finalName = "DC Universe";
        finalWorks = ["DC Universe", "Justiça Jovem", "Super-Choque", "Batman", "Superman", "Flash", "Liga da Justiça"];
      }

      const megaRef = MEGA_COLLECTIONS.find(m => m.code === codeKey || m.name?.toLowerCase() === nameKey);

      if (!seenIds.has(idKey) && (!codeKey || !seenCodes.has(codeKey)) && (!finalName || !seenNames.has(finalName.toLowerCase()))) {
        seenIds.add(idKey);
        if (codeKey) seenCodes.add(codeKey);
        if (finalName) seenNames.add(finalName.toLowerCase());
        list.push({
          ...c,
          id: idKey,
          name: finalName,
          category: c.category || megaRef?.category || "Outros",
          publisher: c.publisher || megaRef?.publisher || "Standard Universe",
          works: finalWorks || c.works || [finalName],
          color_primary: c.color_primary || megaRef?.color_primary || "#0284C7",
          color_secondary: c.color_secondary || megaRef?.color_secondary || "#1E293B",
          image_url: c.image_url || megaRef?.image_url || ""
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
          category: m.category || "Outros",
          publisher: m.publisher || "Standard Universe",
          description: m.description,
          image_url: m.image_url,
          color_primary: m.color_primary || "#0284C7",
          color_secondary: m.color_secondary || "#1E293B",
          works: m.works || [m.name]
        });
      }
    });

    return deduplicateCollections(list);
  }, [dbCollections]);

  const cards = useMemo(() => {
    const combined = [...(dbCards || []), ...getAllExpandedCards()];
    const deduped = deduplicateCards(combined);
    return enforceCollectionMaxLimit(deduped, dbBosses || [], 100);
  }, [dbCards, dbBosses]);

  const items = useMemo(() => {
    if (dbItems && dbItems.length > 0) return dbItems;
    return MEGA_ITEMS;
  }, [dbItems]);

  const bosses = useMemo(() => {
    if (dbBosses && dbBosses.length > 0) return dbBosses;
    return MEGA_BOSSES;
  }, [dbBosses]);

  // Player inventory tracking
  const { data: players = [] } = useQuery({ queryKey: ["players-col"], queryFn: () => db.entities.Player.list() });
  const { data: rosterEntries = [] } = useQuery({ queryKey: ["roster-col"], queryFn: () => db.entities.Roster.list("-created_date", 500) });
  const { data: playerItems = [] } = useQuery({ queryKey: ["player-items-col"], queryFn: () => db.entities.PlayerItem.list() });

  const player = players.find(p => p.created_by === user?.email || p.discord_id === "player_001") || players[0] || null;
  const myId = player?.discord_id || user?.email || "player_001";

  // Auto-synchronize imported CRT and database cards into active player's Roster / Collection
  useEffect(() => {
    let isMounted = true;
    const runAutoRosterSync = async () => {
      try {
        const res = await importService.syncCardsToRoster(myId);
        if (res && res.addedToRoster > 0 && isMounted) {
          queryClient.invalidateQueries({ queryKey: ["roster-col"] });
          queryClient.invalidateQueries({ queryKey: ["cards"] });
        }
      } catch (err) {
        console.warn("Auto roster sync error:", err);
      }
    };
    runAutoRosterSync();
    return () => { isMounted = false; };
  }, [myId, queryClient]);

  const ownedCardIds = useMemo(() => {
    const set = new Set();
    rosterEntries.forEach(r => {
      if (
        !user ||
        r.player_discord_id === myId ||
        r.player_discord_id === "player_001" ||
        r.player_discord_id === user?.email ||
        (player && r.player_discord_id === player.discord_id)
      ) {
        if (r.card_id) set.add(r.card_id);
        if (r.card_name) set.add(r.card_name.toLowerCase());
      }
    });
    return set;
  }, [rosterEntries, myId, user, player]);

  const playerItemsMap = useMemo(() => {
    const map = {};
    playerItems.forEach(pi => {
      if (
        !user ||
        pi.player_discord_id === myId ||
        pi.player_discord_id === "player_001" ||
        pi.player_discord_id === user?.email
      ) {
        map[pi.item_id] = (map[pi.item_id] || 0) + (pi.quantity || 1);
      }
    });
    return map;
  }, [playerItems, myId, user]);

  // Per-collection metrics
  const collectionStats = useMemo(() => {
    const stats = {};
    collections.forEach(col => {
      stats[col.name] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0, totalBosses: 0 };
      if (col.code) stats[col.code] = stats[col.name];
    });

    cards.forEach(card => {
      const colId = card.collection_id;
      const series = card.series || "Other";
      const inferredCode = inferCollectionCode(card);
      const matched = collections.find(c =>
        c.code === colId ||
        c.code === inferredCode ||
        c.name === series ||
        (c.works && c.works.includes(series))
      );
      const key = matched ? matched.name : series;
      if (!stats[key]) stats[key] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0, totalBosses: 0 };
      stats[key].totalCards += 1;
      const isOwned = ownedCardIds.has(card.id) || ownedCardIds.has(card.card_id) || ownedCardIds.has(card.name?.toLowerCase());
      if (isOwned) stats[key].ownedCards += 1;
    });

    items.forEach(item => {
      const colId = item.collection_id;
      const series = item.series || item.collection_name || "Outros";
      const matched = collections.find(c => c.code === colId || c.name === series || (c.works && c.works.includes(series)));
      const key = matched ? matched.name : series;
      if (!stats[key]) stats[key] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0, totalBosses: 0 };
      stats[key].totalItems += 1;
      if (playerItemsMap[item.id] > 0 || playerItemsMap[item.item_id] > 0) stats[key].ownedItems += 1;
    });

    bosses.forEach(boss => {
      const colId = boss.collection_id;
      const series = boss.series || "Outros";
      const matched = collections.find(c => c.code === colId || c.name === series || (c.works && c.works.includes(series)));
      const key = matched ? matched.name : series;
      if (!stats[key]) stats[key] = { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0, totalBosses: 0 };
      stats[key].totalBosses += 1;
    });

    return stats;
  }, [collections, cards, items, bosses, ownedCardIds, playerItemsMap]);

  // Chart dataset for category distribution
  const categoryChartData = useMemo(() => {
    const counts = {};
    collections.forEach(col => {
      const cat = col.category || "Outros";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts).map(cat => ({ name: cat, count: counts[cat], fill: CATEGORY_COLORS[cat] || "#0284C7" }));
  }, [collections]);

  // Filtered & Sorted Collections (Automatic Sorting)
  const filteredCollections = useMemo(() => {
    return collections.filter(col => {
      const colName = col.name || "";
      const colCode = col.code || "";
      const colCategory = col.category || "Outros";
      const stats = collectionStats[col.name] || { totalCards: 0, ownedCards: 0, totalItems: 0, ownedItems: 0 };
      const total = stats.totalCards + stats.totalItems;
      const owned = stats.ownedCards + stats.ownedItems;
      const pct = total > 0 ? (owned / total) * 100 : 0;

      // Search Query
      const matchesSearch = !searchQuery ||
        colName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        colCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (col.publisher && col.publisher.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (col.works && col.works.some(w => w.toLowerCase().includes(searchQuery.toLowerCase())));

      // Category filter
      const matchesCategory = selectedCategory === "all" || colCategory === selectedCategory;

      // Letter jump index
      const matchesLetter = selectedLetter === "TODOS" || colName.toUpperCase().startsWith(selectedLetter);

      // Quick filter
      let matchesQuick = true;
      if (quickFilter === "favorites") matchesQuick = favorites.includes(col.id);
      else if (quickFilter === "completed") matchesQuick = total > 0 && owned === total;
      else if (quickFilter === "incomplete") matchesQuick = owned < total;
      else if (quickFilter === "no_image") matchesQuick = !col.image_url;
      else if (quickFilter === "updating") matchesQuick = total === 0;

      // Bank filter
      let matchesBank = true;
      if (selectedBank !== "all") {
        matchesBank = (col.code && col.code.startsWith(selectedBank)) || col.bank === selectedBank;
      }

      return matchesSearch && matchesCategory && matchesLetter && matchesQuick && matchesBank;
    }).sort((a, b) => {
      if (sortBy === "category") {
        const catA = a.category || "Outros";
        const catB = b.category || "Outros";
        if (catA !== catB) return catA.localeCompare(catB, "pt-BR");
        return a.name.localeCompare(b.name, "pt-BR");
      } else if (sortBy === "publisher") {
        const pubA = a.publisher || "Standard";
        const pubB = b.publisher || "Standard";
        if (pubA !== pubB) return pubA.localeCompare(pubB, "pt-BR");
        return a.name.localeCompare(b.name, "pt-BR");
      } else if (sortBy === "universe") {
        const uA = a.works?.[0] || a.name;
        const uB = b.works?.[0] || b.name;
        return uA.localeCompare(uB, "pt-BR");
      } else if (sortBy === "cards") {
        const totalA = collectionStats[a.name]?.totalCards || 0;
        const totalB = collectionStats[b.name]?.totalCards || 0;
        return totalB - totalA;
      } else if (sortBy === "progress") {
        const sA = collectionStats[a.name] || { totalCards: 0, ownedCards: 0 };
        const sB = collectionStats[b.name] || { totalCards: 0, ownedCards: 0 };
        const pctA = sA.totalCards > 0 ? sA.ownedCards / sA.totalCards : 0;
        const pctB = sB.totalCards > 0 ? sB.ownedCards / sB.totalCards : 0;
        return pctB - pctA;
      } else {
        // "alphabetical" (Standard strict alphabetical order A-Z)
        return (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: 'base' });
      }
    });
  }, [collections, collectionStats, searchQuery, selectedCategory, selectedLetter, quickFilter, selectedBank, sortBy, favorites]);

  // Raw collection cards (before classification filters)
  const rawCollectionCards = useMemo(() => {
    if (!activeCollection) return [];
    return cards.filter(c => {
      const inferredCode = inferCollectionCode(c);
      return (
        c.collection_id === activeCollection.code ||
        inferredCode === activeCollection.code ||
        c.series === activeCollection.name ||
        (activeCollection.works && activeCollection.works.includes(c.series))
      );
    });
  }, [cards, activeCollection]);

  // Contextual options present in active collection (Requirement 7)
  const activeCollectionElements = useMemo(() => {
    const set = new Set();
    rawCollectionCards.forEach(c => { if (c.element) set.add(c.element); });
    return Array.from(set);
  }, [rawCollectionCards]);

  const activeCollectionPersonalities = useMemo(() => {
    const set = new Set();
    rawCollectionCards.forEach(c => { if (c.personality) set.add(c.personality); });
    return PERSONALITY_OPTIONS.filter(p => set.has(p));
  }, [rawCollectionCards]);

  const activeCollectionIdentities = useMemo(() => {
    const set = new Set();
    rawCollectionCards.forEach(c => { if (c.identity) set.add(c.identity); });
    return IDENTITY_OPTIONS.filter(i => set.has(i));
  }, [rawCollectionCards]);

  const activeCollectionOrigins = useMemo(() => {
    const set = new Set();
    rawCollectionCards.forEach(c => { if (c.origin) set.add(c.origin); });
    return ORIGIN_OPTIONS.filter(o => set.has(o));
  }, [rawCollectionCards]);

  const activeCollectionClasses = useMemo(() => {
    const set = new Set();
    rawCollectionCards.forEach(c => {
      if (c.character_class) set.add(c.character_class);
      if (c.class) set.add(c.class);
      if (c.role) set.add(c.role);
    });
    return CLASS_OPTIONS.filter(cl => set.has(cl));
  }, [rawCollectionCards]);

  const activeCollectionNarratives = useMemo(() => {
    const set = new Set();
    rawCollectionCards.forEach(c => { if (c.narrative_role) set.add(c.narrative_role); });
    return NARRATIVE_ROLE_OPTIONS.filter(nr => set.has(nr));
  }, [rawCollectionCards]);

  const activeCollectionPowerTypes = useMemo(() => {
    const set = new Set();
    rawCollectionCards.forEach(c => { if (c.power_type) set.add(c.power_type); });
    return POWER_TYPE_OPTIONS.filter(pt => set.has(pt));
  }, [rawCollectionCards]);

  // Collection detail filtered cards with normalized global search
  const collectionCards = useMemo(() => {
    if (!activeCollection) return [];
    
    // Normalized search query helper (Requirement 6)
    const normSearch = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const q = normSearch(searchQuery);

    return rawCollectionCards.filter(c => {
      let matchesSearch = true;
      if (q) {
        const searchBlob = normSearch([
          c.name, c.original_name, c.name_jp, c.card_id, c.id, c.alias,
          Array.isArray(c.aliases) ? c.aliases.join(" ") : c.aliases,
          c.race, c.identity, c.organization, c.character_class, c.class, c.role,
          c.clan, c.family, c.house, c.origin, c.title,
          Array.isArray(c.tags) ? c.tags.join(" ") : c.tags
        ].filter(Boolean).join(" "));
        matchesSearch = searchBlob.includes(q);
      }

      const matchesPersonality = personalityFilter === "all" || (c.personality && c.personality.includes(personalityFilter));
      const matchesIdentity = identityFilter === "all" || (c.identity && c.identity.includes(identityFilter));
      const matchesOrigin = originFilter === "all" || (c.origin && c.origin.includes(originFilter));
      const matchesClass = classFilter === "all" || c.class === classFilter || c.role === classFilter || c.character_class === classFilter;
      const matchesNarrative = narrativeRoleFilter === "all" || c.narrative_role === narrativeRoleFilter;
      const matchesPowerType = powerTypeFilter === "all" || c.power_type === powerTypeFilter;
      const matchesRarity = rarityFilter === "all" || c.rarity === rarityFilter;
      const matchesElement = elementFilter === "all" || c.element === elementFilter;

      return matchesSearch && matchesPersonality && matchesIdentity && matchesOrigin && matchesClass && matchesNarrative && matchesPowerType && matchesRarity && matchesElement;
    });
  }, [rawCollectionCards, searchQuery, personalityFilter, identityFilter, originFilter, classFilter, narrativeRoleFilter, powerTypeFilter, rarityFilter, elementFilter]);

  // Group collection cards hierarchically
  const groupedCollectionCards = useMemo(() => {
    const groups = {
      Protagonista: [],
      Antagonista: [],
      "Anti-herói": [],
      "Aliado / Coadjuvante": [],
      Demais: []
    };

    collectionCards.forEach(c => {
      const role = c.narrative_role || "Coadjuvante";
      if (role === "Protagonista") groups.Protagonista.push(c);
      else if (role === "Antagonista") groups.Antagonista.push(c);
      else if (role === "Anti-herói") groups["Anti-herói"].push(c);
      else if (role === "Aliado" || role === "Rival" || role === "Coadjuvante") groups["Aliado / Coadjuvante"].push(c);
      else groups.Demais.push(c);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    });

    return groups;
  }, [collectionCards]);

  // Filtered collection bosses
  const collectionBosses = useMemo(() => {
    if (!activeCollection) return [];
    return bosses.filter(b => {
      return b.collection_id === activeCollection.code ||
        b.series === activeCollection.name ||
        (activeCollection.works && activeCollection.works.includes(b.series));
    });
  }, [bosses, activeCollection]);

  // Filtered collection items
  const collectionItems = useMemo(() => {
    if (!activeCollection) return [];
    return items.filter(i => {
      const series = i.series || i.collection_name;
      return i.collection_id === activeCollection.code ||
        series === activeCollection.name ||
        (activeCollection.works && activeCollection.works.includes(series));
    });
  }, [items, activeCollection]);

  const handleSeedAcervo = async () => {
    soundEffects.playClick();
    setIsSeeding(true);
    try {
      await importService.seedAcervo62();
      const expanded = getAllExpandedCards();
      for (let i = 0; i < expanded.length; i += 25) {
        await Promise.all(expanded.slice(i, i + 25).map(c => entityRepository.saveCard(c)));
      }
      for (const item of MEGA_ITEMS) await db.entities.Item.create(item).catch(() => {});
      for (const boss of MEGA_BOSSES) await entityRepository.saveBoss(boss).catch(() => {});

      const rosterRes = await importService.syncCardsToRoster(myId);

      await queryClient.invalidateQueries(["collections"]);
      await queryClient.invalidateQueries(["cards"]);
      await queryClient.invalidateQueries(["items"]);
      await queryClient.invalidateQueries(["bosses"]);
      await queryClient.invalidateQueries(["roster-col"]);

      toast.success(`✨ Acervo e ${rosterRes.addedToRoster || 0} carta(s) importadas sincronizados na Coleção!`);
    } catch (err) {
      toast.error("Erro ao sincronizar: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-cyan-500/30">
      <Navbar onSearch={setSearchQuery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Top Header Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-cyan-950/40 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase">
                  {activeCollection ? activeCollection.name : "Biblioteca de Coleções"}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 rounded-full">
                  {collections.length} UNIVERSOS
                </span>
              </div>
              <p className="text-xs font-body text-muted-foreground mt-0.5">
                Classificação Canônica por Categorias, Editoras e Árvores Narrativas
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                soundEnabled
                  ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50"
                  : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
              }`}
              title="Alternar Efeitos Sonoros de Interface"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? "SOM ON" : "MUTADO"}</span>
            </button>

            {/* Dashboard Toggle */}
            <button
              onClick={() => { soundEffects.playClick(); setShowDashboard(!showDashboard); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                showDashboard
                  ? "bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-md shadow-amber-950/40"
                  : "bg-card border-border/60 text-foreground hover:border-amber-500/30"
              }`}
            >
              <PieChartIcon className="w-4 h-4 text-amber-400" />
              <span>PAINEL & GRÁFICOS</span>
            </button>

            {/* Seeder Button */}
            <button
              onClick={handleSeedAcervo}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg text-xs font-mono transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
              <span>SINCRONIZAR BANCADA</span>
            </button>
          </div>
        </div>

        {/* Expandable Status Dashboard & Data Charts */}
        <AnimatePresence>
          {showDashboard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-6"
            >
              <div className="bg-card/90 border border-border/60 rounded-2xl p-5 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-4 border-b border-border/30 mb-5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-400" />
                    <h2 className="font-heading text-sm font-bold tracking-wide uppercase text-foreground">
                      Status Global do Acervo Multiversal
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ESTATUTO CANÔNICO OK
                  </span>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="p-3.5 bg-background/60 border border-border/40 rounded-xl">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Total Coleções</span>
                    <span className="font-mono font-black text-xl text-foreground mt-1 block">{collections.length}</span>
                    <span className="text-[10px] text-cyan-400 mt-1 block font-mono">100% Indexadas</span>
                  </div>
                  <div className="p-3.5 bg-background/60 border border-border/40 rounded-xl">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Personagens & Cartas</span>
                    <span className="font-mono font-black text-xl text-amber-400 mt-1 block">{cards.length}</span>
                    <span className="text-[10px] text-muted-foreground mt-1 block font-mono">{ownedCardIds.size} Obtidas</span>
                  </div>
                  <div className="p-3.5 bg-background/60 border border-border/40 rounded-xl">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Chefes de Raide</span>
                    <span className="font-mono font-black text-xl text-rose-400 mt-1 block">{bosses.length}</span>
                    <span className="text-[10px] text-rose-400 mt-1 block font-mono">Desafios Lendários</span>
                  </div>
                  <div className="p-3.5 bg-background/60 border border-border/40 rounded-xl">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Objetos de Poder</span>
                    <span className="font-mono font-black text-xl text-emerald-400 mt-1 block">{items.length}</span>
                    <span className="text-[10px] text-emerald-400 mt-1 block font-mono">Equipamentos e Relíquias</span>
                  </div>
                </div>

                {/* Recharts Category Chart */}
                <div className="bg-background/40 border border-border/40 rounded-xl p-4">
                  <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Distribuição de Coleções por Categoria Oficial
                  </h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value) => [`${value} Coleções`, 'Quantidade']}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* If Active Collection is Selected, Show Collection View */}
        {activeCollection ? (
          <div className="mt-6">
            {/* Back Button */}
            <button
              onClick={() => { soundEffects.playClick(); setActiveCollection(null); }}
              className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> VOLTAR ÀS COLEÇÕES
            </button>

            {/* Collection Detail Banner Header */}
            <div
              className="relative overflow-hidden rounded-2xl border border-border/80 p-6 sm:p-8 mb-6 shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${activeCollection.color_primary}22 0%, ${activeCollection.color_secondary}44 100%)`
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-card border border-border/80 flex items-center justify-center shadow-xl shrink-0">
                    {getCollectionIcon(activeCollection)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                        {activeCollection.category}
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300">
                        {activeCollection.publisher}
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300">
                        {activeCollection.code}
                      </span>
                    </div>
                    <h2 className="font-heading text-2xl sm:text-3xl font-black text-foreground">
                      {activeCollection.name}
                    </h2>
                    <p className="text-xs font-body text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                      {activeCollection.description}
                    </p>
                  </div>
                </div>

                {/* Stats Pill */}
                <div className="flex items-center gap-3 bg-card/80 border border-border/60 p-3.5 rounded-xl backdrop-blur shrink-0">
                  <div className="text-center px-3 border-r border-border/40">
                    <span className="block text-xs font-mono font-bold text-foreground">{collectionCards.length}</span>
                    <span className="block text-[9px] font-mono text-muted-foreground uppercase">Personagens</span>
                  </div>
                  <div className="text-center px-3 border-r border-border/40">
                    <span className="block text-xs font-mono font-bold text-rose-400">{collectionBosses.length}</span>
                    <span className="block text-[9px] font-mono text-muted-foreground uppercase">Chefes</span>
                  </div>
                  <div className="text-center px-3">
                    <span className="block text-xs font-mono font-bold text-emerald-400">{collectionItems.length}</span>
                    <span className="block text-[9px] font-mono text-muted-foreground uppercase">Objetos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collection Detail Subtabs */}
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-6 overflow-x-auto">
              <button
                onClick={() => { soundEffects.playClick(); setCollectionSubTab("characters"); }}
                className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                  collectionSubTab === "characters"
                    ? "bg-cyan-950 border border-cyan-500/40 text-cyan-300 shadow-md"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" /> Personagens ({collectionCards.length})
              </button>
              <button
                onClick={() => { soundEffects.playClick(); setCollectionSubTab("bosses"); }}
                className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                  collectionSubTab === "bosses"
                    ? "bg-rose-950 border border-rose-500/40 text-rose-300 shadow-md"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Skull className="w-3.5 h-3.5 text-rose-400" /> Chefes da Coleção ({collectionBosses.length})
              </button>
              <button
                onClick={() => { soundEffects.playClick(); setCollectionSubTab("items"); }}
                className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                  collectionSubTab === "items"
                    ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300 shadow-md"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-emerald-400" /> Objetos & Equipamentos ({collectionItems.length})
              </button>
            </div>

            {/* Content for Characters Subtab */}
            {collectionSubTab === "characters" && (
              <div>
                {/* Character Multi-Classification Filters Panel */}
                <div className="bg-card/60 border border-border/50 rounded-xl p-4 mb-6">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-3 font-bold flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filtros Avançados de Classificação Multidimensional
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {activeCollectionElements.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-muted-foreground block mb-1">Elemento</span>
                        <Select value={elementFilter} onValueChange={setElementFilter}>
                          <SelectTrigger className="h-8 text-xs bg-background/60"><SelectValue placeholder="Todos" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {activeCollectionElements.map(el => <SelectItem key={el} value={el}>{el}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {activeCollectionPersonalities.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-muted-foreground block mb-1">Personalidade</span>
                        <Select value={personalityFilter} onValueChange={setPersonalityFilter}>
                          <SelectTrigger className="h-8 text-xs bg-background/60"><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {activeCollectionPersonalities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {activeCollectionIdentities.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-muted-foreground block mb-1">Identidade</span>
                        <Select value={identityFilter} onValueChange={setIdentityFilter}>
                          <SelectTrigger className="h-8 text-xs bg-background/60"><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {activeCollectionIdentities.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {activeCollectionOrigins.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-muted-foreground block mb-1">Origem</span>
                        <Select value={originFilter} onValueChange={setOriginFilter}>
                          <SelectTrigger className="h-8 text-xs bg-background/60"><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {activeCollectionOrigins.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {activeCollectionClasses.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-muted-foreground block mb-1">Classe</span>
                        <Select value={classFilter} onValueChange={setClassFilter}>
                          <SelectTrigger className="h-8 text-xs bg-background/60"><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {activeCollectionClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {activeCollectionNarratives.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-muted-foreground block mb-1">Função Narrativa</span>
                        <Select value={narrativeRoleFilter} onValueChange={setNarrativeRoleFilter}>
                          <SelectTrigger className="h-8 text-xs bg-background/60"><SelectValue placeholder="Todas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {activeCollectionNarratives.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {activeCollectionPowerTypes.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-muted-foreground block mb-1">Tipo de Poder</span>
                        <Select value={powerTypeFilter} onValueChange={setPowerTypeFilter}>
                          <SelectTrigger className="h-8 text-xs bg-background/60"><SelectValue placeholder="Todos" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {activeCollectionPowerTypes.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grouped Characters Hierarchy */}
                {Object.entries(groupedCollectionCards).map(([groupName, groupCards]) => {
                  if (groupCards.length === 0) return null;
                  return (
                    <div key={groupName} className="mb-8">
                      <div className="flex items-center gap-2 mb-3 pb-1 border-b border-border/30">
                        <Sparkle className="w-4 h-4 text-cyan-400" />
                        <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">
                          {groupName}s ({groupCards.length})
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {groupCards.map((card, cardIdx) => {
                          const isCardOwned = ownedCardIds.has(card.id) || ownedCardIds.has(card.card_id) || ownedCardIds.has(card.name?.toLowerCase());
                          return (
                            <CardListItem key={`${groupName}_${card.id || cardIdx}`} card={card} isOwned={isCardOwned} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {collectionCards.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
                    <p className="text-xs font-mono text-muted-foreground">Nenhum personagem atende aos filtros atuais nesta coleção.</p>
                  </div>
                )}
              </div>
            )}

            {/* Content for Bosses Subtab */}
            {collectionSubTab === "bosses" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collectionBosses.map(boss => (
                  <motion.div
                    key={boss.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-card border border-rose-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded">
                          BOSS EXCLUSIVO
                        </span>
                        <h4 className="font-heading font-black text-lg text-foreground mt-1">{boss.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{boss.lore || boss.description}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                        <Skull className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-rose-500/20 text-xs font-mono">
                      <div className="bg-rose-950/20 p-2 rounded border border-rose-500/20">
                        <span className="text-[9px] text-muted-foreground block">PONTOS DE VIDA</span>
                        <span className="font-bold text-rose-400">{(boss.hp || 50000).toLocaleString()} HP</span>
                      </div>
                      <div className="bg-rose-950/20 p-2 rounded border border-rose-500/20">
                        <span className="text-[9px] text-muted-foreground block">FRAQUEZA</span>
                        <span className="font-bold text-amber-300">{boss.weakness || "Nenhuma"}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {collectionBosses.length === 0 && (
                  <div className="col-span-full text-center py-12 border border-dashed border-border/50 rounded-xl">
                    <p className="text-xs font-mono text-muted-foreground">Nenhum chefe de raide exclusivo registrado nesta coleção.</p>
                  </div>
                )}
              </div>
            )}

            {/* Content for Items Subtab */}
            {collectionSubTab === "items" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {collectionItems.map(item => (
                  <motion.div key={item.id} whileHover={{ scale: 1.01 }} className="bg-card border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-sm text-foreground">{item.name}</h4>
                        <span className="text-[10px] font-mono text-emerald-400">{item.type || "Equipamento"}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                  </motion.div>
                ))}

                {collectionItems.length === 0 && (
                  <div className="col-span-full text-center py-12 border border-dashed border-border/50 rounded-xl">
                    <p className="text-xs font-mono text-muted-foreground">Nenhum objeto de poder registrado nesta coleção.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          /* Main Collections Grid View */
          <div>
            {/* Official Categories Bar */}
            <div className="mt-6 mb-4">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-2 font-bold">
                Categorias Oficiais
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {OFFICIAL_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { soundEffects.playClick(); setSelectedCategory(cat.id); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap border ${
                      selectedCategory === cat.id
                        ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 shadow-md"
                        : "bg-card/70 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setQuickFilter("all")}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                    quickFilter === "all" ? "bg-muted border-border text-foreground" : "text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                >
                  Todas ({collections.length})
                </button>
                <button
                  onClick={() => setQuickFilter("favorites")}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-all flex items-center gap-1 ${
                    quickFilter === "favorites" ? "bg-amber-950/60 border-amber-500/40 text-amber-300" : "text-muted-foreground hover:text-amber-400 border-transparent"
                  }`}
                >
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Favoritas ({favorites.length})
                </button>
                <button
                  onClick={() => setQuickFilter("completed")}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                    quickFilter === "completed" ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "text-muted-foreground hover:text-emerald-400 border-transparent"
                  }`}
                >
                  Completas
                </button>
                <button
                  onClick={() => setQuickFilter("incomplete")}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                    quickFilter === "incomplete" ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300" : "text-muted-foreground hover:text-cyan-400 border-transparent"
                  }`}
                >
                  Em Progresso
                </button>
              </div>

              {/* Sorting Selection */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Ordenar Por:</span>
                <Select value={sortBy} onValueChange={(val) => { soundEffects.playClick(); setSortBy(val); }}>
                  <SelectTrigger className="h-8 text-xs bg-card border-border/60 w-44 font-mono">
                    <SelectValue placeholder="Ordem Alfabética" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabetical">Ordem Alfabética (A-Z)</SelectItem>
                    <SelectItem value="category">Por Categoria</SelectItem>
                    <SelectItem value="publisher">Por Editora</SelectItem>
                    <SelectItem value="universe">Por Universo</SelectItem>
                    <SelectItem value="cards">Total de Cartas</SelectItem>
                    <SelectItem value="progress">% de Obtenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Alphabetical Jump Index Bar */}
            <div className="bg-card/40 border border-border/40 rounded-xl p-2 mb-6 flex items-center justify-between overflow-x-auto gap-1">
              {ALPHABET.map(letter => (
                <button
                  key={letter}
                  onClick={() => { soundEffects.playClick(); setSelectedLetter(letter); }}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-all font-bold ${
                    selectedLetter === letter
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>

            {/* Collections Grid with Hover Animations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCollections.map(col => {
                const stats = collectionStats[col.name] || { totalCards: 0, ownedCards: 0 };
                const total = stats.totalCards;
                const owned = stats.ownedCards;
                const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
                const isFav = favorites.includes(col.id);

                return (
                  <motion.div
                    key={col.id}
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => { soundEffects.playClick(); setActiveCollection(col); }}
                    className="group bg-card/80 border border-border/70 hover:border-cyan-500/50 rounded-2xl p-4 shadow-lg cursor-pointer relative overflow-hidden transition-all flex flex-col justify-between"
                  >
                    {/* Top Header info */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-background border border-border/80 flex items-center justify-center shadow-inner shrink-0 group-hover:border-cyan-500/40 transition-colors">
                          {getCollectionIcon(col)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase border border-border/40">
                            {col.category}
                          </span>
                          <button
                            onClick={(e) => toggleFavorite(col.id, e)}
                            className="p-1 text-muted-foreground hover:text-amber-400 transition-colors"
                          >
                            <Star className={`w-4 h-4 ${isFav ? "text-amber-400 fill-amber-400" : ""}`} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-heading font-black text-base text-foreground group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {col.name}
                      </h3>
                      <p className="text-[11px] font-body text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {col.description}
                      </p>
                    </div>

                    {/* Progress Bar & Footer */}
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1.5">
                        <span>PROGRESSO</span>
                        <span className="font-bold text-cyan-400">{owned}/{total} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredCollections.length === 0 && (
              <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-card/30">
                <p className="text-sm font-mono text-muted-foreground">
                  Nenhuma coleção encontrada para os filtros selecionados.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
