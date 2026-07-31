import { db } from "@/base44Client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Database,
  Search,
  Terminal,
  ShieldAlert,
  BookOpen,
  Sparkles,
  FileText,
  Filter,
  Bookmark,
  Copy,
  Plus,
  X,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Layers,
  Radio,
  Cpu,
  RefreshCw,
  Check,
  Tag,
  ArrowLeft,
  Share2,
  ListFilter,
  Eye
} from "lucide-react";

import Navbar from "@/Navbar";
import { useToast } from "@/use-toast";

// Clearance Badge styling mapping
const CLEARANCE_STYLES = {
  "UNCLASSIFIED": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: Unlock },
  "CONFIDENTIAL": { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", icon: Lock },
  "SECRET": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", icon: Lock },
  "TOP SECRET": { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", icon: ShieldAlert },
  "OMEGA-LEVEL": { bg: "bg-rose-500/15", text: "text-rose-400 font-bold animate-pulse", border: "border-rose-500/50", icon: ShieldAlert }
};

const CATEGORIES = [
  "ALL CATEGORIES",
  "Cosmology & Origins",
  "Character Chronicles",
  "Faction Archives",
  "Anomalies & Bosses",
  "Artifact & Tech Records",
  "Multiverse Events",
  "Card Backstories"
];

const ERAS = [
  "ALL ERAS",
  "Genesis Epoch",
  "Shinobi Epoch",
  "Modern Sorcery Era",
  "Titan Crisis Era",
  "Cybernetic Future",
  "Abyssal Rift Era"
];

export default function LoreArchive() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL CATEGORIES");
  const [selectedEra, setSelectedEra] = useState("ALL ERAS");
  const [selectedClearance, setSelectedClearance] = useState("ALL");
  const [viewMode, setViewMode] = useState("terminal"); // "terminal" | "grid"
  const [activeLoreId, setActiveLoreId] = useState(null);
  
  // Customization & Interactive states
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("deckverse_lore_bookmarks") || "[]");
    } catch {
      return [];
    }
  });
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [fontScale, setFontScale] = useState("normal"); // "compact" | "normal" | "large"
  const [audioHum, setAudioHum] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Form state for creating new lore
  const [newLore, setNewLore] = useState({
    title: "",
    code: "",
    category: "Cosmology & Origins",
    era: "Genesis Epoch",
    clearance_level: "UNCLASSIFIED",
    author: "Terminal Unit #01",
    summary: "",
    content: "",
    image_url: "",
    tags: "",
    related_series: "DeckVerse Core"
  });

  // Fetch Lore Entities
  const { data: loreList = [], isLoading: isLoadingLore, refetch } = useQuery({
    queryKey: ["lore-archive"],
    queryFn: async () => {
      const records = await db.entities.Lore.list("-created_date", 200);
      return records;
    }
  });

  // Fetch Cards to synthesize character backstories if requested
  const { data: cardsList = [] } = useQuery({
    queryKey: ["lore-cards-supplement"],
    queryFn: () => db.entities.Card.list("-created_date", 50)
  });

  // Combine Dedicated Lore Records + Card Backstories
  const aggregatedLore = useMemo(() => {
    const list = [...loreList];

    // Synthesize card lore entries for "Card Backstories" category
    cardsList.forEach(card => {
      if (card.lore && !list.some(l => l.code === `LORE-CARD-${card.card_id}`)) {
        list.push({
          id: `card_lore_${card.id}`,
          title: `Archive: ${card.name} (${card.version || 'Base'})`,
          code: `LORE-CARD-${card.card_id}`,
          category: "Card Backstories",
          era: card.series === "Naruto" ? "Shinobi Epoch" :
               card.series === "Jujutsu Kaisen" ? "Modern Sorcery Era" :
               card.series === "Attack on Titan" ? "Titan Crisis Era" :
               card.series === "Cyberpunk Legends" ? "Cybernetic Future" : "Genesis Epoch",
          clearance_level: card.rarity === "MR" || card.rarity === "BOSS" ? "OMEGA-LEVEL" :
                           card.rarity === "UR" || card.rarity === "LR" ? "TOP SECRET" : "CONFIDENTIAL",
          author: `Card Spec // ${card.series || 'DeckVerse'}`,
          summary: `${card.name} (${card.rarity}) — ${card.role} archetype wielding ${card.element || 'Universal'} energy.`,
          content: card.lore + (card.skills?.length ? `\n\nAbilities Log:\n` + card.skills.map(s => `• [${s.type}] ${s.name}: ${s.description}`).join('\n') : ''),
          image_url: card.image_url,
          tags: card.tags || [card.name, card.series],
          related_series: card.series || "DeckVerse Core",
          created_date: card.created_date || new Date().toISOString()
        });
      }
    });

    return list;
  }, [loreList, cardsList]);

  // Create Lore Mutation
  const createLoreMutation = useMutation({
    mutationFn: (data) => db.entities.Lore.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lore-archive"] });
      setIsAddModalOpen(false);
      setNewLore({
        title: "",
        code: "",
        category: "Cosmology & Origins",
        era: "Genesis Epoch",
        clearance_level: "UNCLASSIFIED",
        author: "Terminal Unit #01",
        summary: "",
        content: "",
        image_url: "",
        tags: "",
        related_series: "DeckVerse Core"
      });
      toast({
        title: "[RECORD_SAVED]",
        description: "New history log successfully encrypted into Lore Archive node.",
      });
    }
  });

  // Handle auto-selection of first item when list loads
  useEffect(() => {
    if (aggregatedLore.length > 0 && !activeLoreId) {
      setActiveLoreId(aggregatedLore[0].id);
    }
  }, [aggregatedLore, activeLoreId]);

  // Bookmarking
  const toggleBookmark = (id, e) => {
    if (e) e.stopPropagation();
    let updated;
    if (bookmarkedIds.includes(id)) {
      updated = bookmarkedIds.filter(bId => bId !== id);
    } else {
      updated = [...bookmarkedIds, id];
    }
    setBookmarkedIds(updated);
    localStorage.setItem("deckverse_lore_bookmarks", JSON.stringify(updated));
  };

  // Copy Content
  const copyRecord = (item) => {
    const text = `[DECKVERSE LORE ARCHIVE]\nREF: ${item.code}\nTITLE: ${item.title}\nCLEARANCE: ${item.clearance_level}\n\n${item.content}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "[CYPHER_COPIED]",
      description: `Record ${item.code} exported to local buffer.`,
    });
  };

  // Filtering Logic
  const filteredLore = useMemo(() => {
    return aggregatedLore.filter(item => {
      // Bookmark filter
      if (onlyBookmarks && !bookmarkedIds.includes(item.id)) return false;

      // Category filter
      if (selectedCategory !== "ALL CATEGORIES" && item.category !== selectedCategory) return false;

      // Era filter
      if (selectedEra !== "ALL ERAS" && item.era !== selectedEra) return false;

      // Clearance filter
      if (selectedClearance !== "ALL" && item.clearance_level !== selectedClearance) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesContent = item.content?.toLowerCase().includes(q);
        const matchesSummary = item.summary?.toLowerCase().includes(q);
        const matchesCode = item.code?.toLowerCase().includes(q);
        const matchesAuthor = item.author?.toLowerCase().includes(q);
        const matchesTags = item.tags?.some(t => t.toLowerCase().includes(q));

        return matchesTitle || matchesContent || matchesSummary || matchesCode || matchesAuthor || matchesTags;
      }

      return true;
    });
  }, [aggregatedLore, searchQuery, selectedCategory, selectedEra, selectedClearance, onlyBookmarks, bookmarkedIds]);

  const activeRecord = useMemo(() => {
    return aggregatedLore.find(l => l.id === activeLoreId) || filteredLore[0] || null;
  }, [aggregatedLore, activeLoreId, filteredLore]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newLore.title || !newLore.content) {
      toast({
        title: "[INPUT_ERROR]",
        description: "Title and Content body are required for archive entry.",
        variant: "destructive"
      });
      return;
    }

    const generatedCode = newLore.code || `LORE-${newLore.category.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const formattedTags = typeof newLore.tags === 'string'
      ? newLore.tags.split(',').map(t => t.trim()).filter(Boolean)
      : newLore.tags;

    createLoreMutation.mutate({
      ...newLore,
      code: generatedCode,
      tags: formattedTags
    });
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 font-sans selection:bg-[#00F0FF]/30 selection:text-[#00F0FF] relative overflow-x-hidden">
      
      {/* Deep-Space Ambient Grid & Scanline Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-0"
        style={{
          backgroundImage: `linear-gradient(#00F0FF 1px, transparent 1px), linear-gradient(90deg, #00F0FF 1px, transparent 1px)`,
          backgroundSize: "32px 32px"
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.06),transparent_70%)] z-0" />
      
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 relative z-10 space-y-6">

        {/* Console Header Bar */}
        <div className="border border-[#00F0FF]/30 bg-black/80 backdrop-blur-md p-4 sm:p-6 shadow-2xl shadow-[#00F0FF]/5 relative overflow-hidden rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F0FF]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#00F0FF]/20 pb-4 mb-4">
            
            {/* Title & Status */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 uppercase">
                  <Radio className="w-3 h-3 animate-pulse" />
                  ORBITAL_ARCHIVE_NODE_09
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                  <Check className="w-3 h-3" /> DECRYPT_STREAM: ONLINE
                </span>
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  LATENCY: 14ms | COORD: 44.912°N 120.04°W
                </span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-wider text-white uppercase flex items-center gap-3">
                <Database className="w-7 h-7 text-[#00F0FF]" />
                LORE ARCHIVE <span className="text-xs font-mono font-normal text-slate-400 tracking-normal text-[#00F0FF]/80">[DEEP-SPACE CONSOLE v4.2]</span>
              </h1>
              <p className="text-xs sm:text-sm font-mono text-slate-400 mt-1 max-w-2xl">
                Repository of multiverse timeline events, cosmological genesis logs, classified anomaly profiles, and hero backstories.
              </p>
            </div>

            {/* Top Controls */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setAudioHum(!audioHum)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                  audioHum 
                    ? "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]" 
                    : "bg-black/60 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
                title="Toggle Sub-space Audio Hum"
              >
                {audioHum ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">AUDIO HUM</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00F0FF] text-black font-mono text-xs font-bold tracking-wider hover:bg-[#00F0FF]/80 transition-all shadow-lg shadow-[#00F0FF]/20 rounded"
              >
                <Plus className="w-4 h-4" />
                NEW LOG ENTRY
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              
              {/* Search Input */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-[#00F0FF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs by keyword, CID, author, tag..."
                  className="w-full bg-black/60 border border-[#00F0FF]/30 rounded pl-9 pr-8 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Dropdown */}
              <div className="md:col-span-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-black/60 border border-[#00F0FF]/30 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#00F0FF]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                  ))}
                </select>
              </div>

              {/* Era Dropdown */}
              <div className="md:col-span-2">
                <select
                  value={selectedEra}
                  onChange={(e) => setSelectedEra(e.target.value)}
                  className="w-full bg-black/60 border border-[#00F0FF]/30 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#00F0FF]"
                >
                  {ERAS.map(era => (
                    <option key={era} value={era} className="bg-slate-900 text-white">{era}</option>
                  ))}
                </select>
              </div>

              {/* View Switcher */}
              <div className="md:col-span-2 flex items-center justify-end gap-1 border border-slate-800 rounded p-1 bg-black/40">
                <button
                  onClick={() => setViewMode("terminal")}
                  className={`flex-1 py-1 px-2 text-[10px] font-mono font-bold rounded transition-colors flex items-center justify-center gap-1 ${
                    viewMode === "terminal" ? "bg-[#00F0FF]/20 text-[#00F0FF]" : "text-slate-400 hover:text-white"
                  }`}
                  title="Split Terminal Console Mode"
                >
                  <Terminal className="w-3 h-3" /> FEED
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex-1 py-1 px-2 text-[10px] font-mono font-bold rounded transition-colors flex items-center justify-center gap-1 ${
                    viewMode === "grid" ? "bg-[#00F0FF]/20 text-[#00F0FF]" : "text-slate-400 hover:text-white"
                  }`}
                  title="Holo Projection Cards"
                >
                  <Layers className="w-3 h-3" /> GRID
                </button>
              </div>
            </div>

            {/* Sub-Filters / Clearance / Bookmarks */}
            <div className="flex items-center justify-between gap-3 text-xs font-mono text-slate-400 flex-wrap pt-1">
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">Clearance:</span>
                {["ALL", "UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET", "OMEGA-LEVEL"].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedClearance(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] shrink-0 border transition-colors ${
                      selectedClearance === lvl
                        ? "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50"
                        : "bg-black/30 border-slate-800 hover:border-slate-700 text-slate-400"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setOnlyBookmarks(!onlyBookmarks)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] border transition-colors ${
                    onlyBookmarks
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                      : "bg-black/40 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Bookmark className={`w-3 h-3 ${onlyBookmarks ? "fill-amber-400" : ""}`} />
                  Bookmarks ({bookmarkedIds.length})
                </button>

                <span className="text-[10px] text-slate-500">
                  RECORDS FOUND: <span className="text-[#00F0FF] font-bold">{filteredLore.length}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content View Modes */}
        {isLoadingLore ? (
          <div className="border border-[#00F0FF]/20 bg-black/60 p-12 text-center rounded-lg space-y-4">
            <RefreshCw className="w-8 h-8 text-[#00F0FF] animate-spin mx-auto" />
            <p className="font-mono text-xs text-[#00F0FF] tracking-widest uppercase">
              DECRYPTING ARCHIVE SECTORS... PLEASE STAND BY
            </p>
          </div>
        ) : filteredLore.length === 0 ? (
          <div className="border border-dashed border-slate-800 bg-black/40 p-12 text-center rounded-lg space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-mono text-sm text-slate-300 uppercase tracking-wider">NO DECRYPTED RECORDS MATCH YOUR SEARCH CRITERIA</p>
            <p className="font-mono text-xs text-slate-500">Try adjusting your category, clearance, or search keywords.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL CATEGORIES");
                setSelectedEra("ALL ERAS");
                setSelectedClearance("ALL");
                setOnlyBookmarks(false);
              }}
              className="mt-2 px-4 py-1.5 bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-mono text-xs rounded hover:bg-[#00F0FF]/20 transition-colors"
            >
              RESET ALL FILTERS
            </button>
          </div>
        ) : viewMode === "terminal" ? (
          /* Split Terminal View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Stream List */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#00F0FF]/30">
              {filteredLore.map(item => {
                const isActive = activeRecord?.id === item.id;
                const clearanceStyle = CLEARANCE_STYLES[item.clearance_level] || CLEARANCE_STYLES["UNCLASSIFIED"];
                const ClearanceIcon = clearanceStyle.icon;
                const isBookmarked = bookmarkedIds.includes(item.id);

                return (
                  <motion.div
                    key={item.id}
                    onClick={() => setActiveLoreId(item.id)}
                    whileHover={{ x: 2 }}
                    className={`p-3.5 rounded border transition-all cursor-pointer relative overflow-hidden ${
                      isActive
                        ? "bg-[#00F0FF]/10 border-[#00F0FF] shadow-lg shadow-[#00F0FF]/10"
                        : "bg-black/60 border-slate-800/80 hover:border-slate-700 hover:bg-black/80"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00F0FF]" />
                    )}

                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] text-[#00F0FF] tracking-wider uppercase font-bold">
                        {item.code}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${clearanceStyle.bg} ${clearanceStyle.text} ${clearanceStyle.border}`}>
                          <ClearanceIcon className="w-2.5 h-2.5" />
                          {item.clearance_level}
                        </span>

                        <button
                          onClick={(e) => toggleBookmark(item.id, e)}
                          className="text-slate-500 hover:text-amber-400 p-0.5"
                          title="Bookmark Record"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-heading text-sm font-bold text-slate-100 group-hover:text-[#00F0FF] transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xs font-mono text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.summary || item.content}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/50 text-[10px] font-mono text-slate-500">
                      <span>{item.era || item.category}</span>
                      <span>{item.author?.split('//')[0] || 'Archivist Log'}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right Main Deep Reader Panel */}
            <div className="lg:col-span-7 sticky top-20">
              {activeRecord ? (
                <div className="border border-[#00F0FF]/40 bg-black/90 backdrop-blur-md rounded-lg p-5 sm:p-7 shadow-2xl space-y-5 relative">
                  
                  {/* Top Bar controls */}
                  <div className="flex items-center justify-between gap-3 border-b border-[#00F0FF]/20 pb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-mono text-xs font-bold">
                        {activeRecord.code}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        SERIES: <span className="text-slate-200">{activeRecord.related_series || 'DeckVerse'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Font scaling control */}
                      <div className="flex items-center border border-slate-800 rounded bg-black/40 text-[10px] font-mono">
                        <button
                          onClick={() => setFontScale("compact")}
                          className={`px-2 py-0.5 ${fontScale === 'compact' ? 'text-[#00F0FF] font-bold' : 'text-slate-500'}`}
                        >
                          S
                        </button>
                        <button
                          onClick={() => setFontScale("normal")}
                          className={`px-2 py-0.5 border-x border-slate-800 ${fontScale === 'normal' ? 'text-[#00F0FF] font-bold' : 'text-slate-500'}`}
                        >
                          M
                        </button>
                        <button
                          onClick={() => setFontScale("large")}
                          className={`px-2 py-0.5 ${fontScale === 'large' ? 'text-[#00F0FF] font-bold' : 'text-slate-500'}`}
                        >
                          L
                        </button>
                      </div>

                      <button
                        onClick={() => copyRecord(activeRecord)}
                        className="p-1.5 rounded border border-slate-800 hover:border-[#00F0FF]/50 text-slate-400 hover:text-[#00F0FF] transition-colors"
                        title="Copy Decoded Record"
                      >
                        {copiedId === activeRecord.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={(e) => toggleBookmark(activeRecord.id, e)}
                        className="p-1.5 rounded border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Toggle Bookmark"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${bookmarkedIds.includes(activeRecord.id) ? "fill-amber-400 text-amber-400" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Header info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap text-xs font-mono">
                      <span className="text-[#00F0FF] font-bold">{activeRecord.category}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300">{activeRecord.era}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400">{activeRecord.author}</span>
                    </div>

                    <h2 className="font-heading text-xl sm:text-2xl font-black text-white uppercase tracking-wide leading-tight">
                      {activeRecord.title}
                    </h2>
                  </div>

                  {/* Optional Image Holo Projection */}
                  {activeRecord.image_url && (
                    <div className="relative rounded overflow-hidden border border-[#00F0FF]/30 group max-h-56">
                      <img
                        src={activeRecord.image_url}
                        alt={activeRecord.title}
                        className="w-full h-56 object-cover filter brightness-90 contrast-105 group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-[#00F0FF] bg-black/60 backdrop-blur px-2.5 py-1 border border-[#00F0FF]/20 rounded">
                        <span>HOLO-PROJECTION REF: #{activeRecord.id}</span>
                        <span>SCAN_RESOLUTION: 4K_SPECTRAL</span>
                      </div>
                    </div>
                  )}

                  {/* Summary Box */}
                  {activeRecord.summary && (
                    <div className="border-l-2 border-[#00F0FF] bg-[#00F0FF]/5 p-3.5 text-xs font-mono text-slate-300 leading-relaxed rounded-r">
                      <span className="text-[#00F0FF] font-bold uppercase tracking-wider block mb-1">
                        [EXECUTIVE TELEMETRY SUMMARY]:
                      </span>
                      {activeRecord.summary}
                    </div>
                  )}

                  {/* Full Body Text */}
                  <div
                    className={`font-sans text-slate-200 leading-relaxed space-y-4 border-t border-slate-800/80 pt-4 whitespace-pre-line ${
                      fontScale === 'compact' ? 'text-xs' : fontScale === 'large' ? 'text-base' : 'text-sm'
                    }`}
                  >
                    {activeRecord.content}
                  </div>

                  {/* Tags & Footer Metadata */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-[#00F0FF]" />
                      {activeRecord.tags?.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px]">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-500">
                      LOGGED: {new Date(activeRecord.created_date).toLocaleDateString()}
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

          </div>
        ) : (
          /* Holo Grid Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLore.map(item => {
              const clearanceStyle = CLEARANCE_STYLES[item.clearance_level] || CLEARANCE_STYLES["UNCLASSIFIED"];
              const isBookmarked = bookmarkedIds.includes(item.id);

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  className="border border-[#00F0FF]/30 bg-black/80 backdrop-blur rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-[#00F0FF] hover:shadow-xl hover:shadow-[#00F0FF]/10 transition-all group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#00F0FF] font-bold">
                        {item.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${clearanceStyle.bg} ${clearanceStyle.text} ${clearanceStyle.border}`}>
                          {item.clearance_level}
                        </span>
                        <button
                          onClick={(e) => toggleBookmark(item.id, e)}
                          className="text-slate-500 hover:text-amber-400 p-0.5"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Image preview */}
                    {item.image_url && (
                      <div className="aspect-video w-full rounded overflow-hidden border border-slate-800 relative">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                      </div>
                    )}

                    <h3 className="font-heading text-base font-bold text-white group-hover:text-[#00F0FF] transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xs font-mono text-slate-400 line-clamp-3 leading-relaxed">
                      {item.summary || item.content}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      {item.era}
                    </span>
                    <button
                      onClick={() => {
                        setActiveLoreId(item.id);
                        setViewMode("terminal");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black font-mono text-xs transition-colors rounded"
                    >
                      DECRYPT <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </main>

      {/* New Lore Entry Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-2xl border border-[#00F0FF]/40 bg-black/95 p-6 rounded-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#00F0FF]/30 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#00F0FF]" />
                  <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wider">
                    NEW ARCHIVE ENTRY RECORD
                  </h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs">
                
                <div>
                  <label className="block text-slate-300 mb-1">RECORD TITLE *</label>
                  <input
                    type="text"
                    required
                    value={newLore.title}
                    onChange={(e) => setNewLore({ ...newLore, title: e.target.value })}
                    placeholder="e.g., The Void Incident of Sector 09"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">CATEGORY</label>
                    <select
                      value={newLore.category}
                      onChange={(e) => setNewLore({ ...newLore, category: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                    >
                      {CATEGORIES.filter(c => c !== "ALL CATEGORIES").map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">ERA / EPOCH</label>
                    <select
                      value={newLore.era}
                      onChange={(e) => setNewLore({ ...newLore, era: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                    >
                      {ERAS.filter(e => e !== "ALL ERAS").map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">CLEARANCE LEVEL</label>
                    <select
                      value={newLore.clearance_level}
                      onChange={(e) => setNewLore({ ...newLore, clearance_level: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                    >
                      {["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET", "OMEGA-LEVEL"].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">AUTHOR / CALLSIGN</label>
                    <input
                      type="text"
                      value={newLore.author}
                      onChange={(e) => setNewLore({ ...newLore, author: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">IMAGE / HOLO PROJECTION URL</label>
                  <input
                    type="url"
                    value={newLore.image_url}
                    onChange={(e) => setNewLore({ ...newLore, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">EXECUTIVE SUMMARY LOG</label>
                  <textarea
                    rows={2}
                    value={newLore.summary}
                    onChange={(e) => setNewLore({ ...newLore, summary: e.target.value })}
                    placeholder="Brief 1-2 sentence overview summary..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">FULL DOCUMENTATION CONTENT *</label>
                  <textarea
                    required
                    rows={6}
                    value={newLore.content}
                    onChange={(e) => setNewLore({ ...newLore, content: e.target.value })}
                    placeholder="Enter full telemetry history text, data points, or event details..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">TAGS (Comma Separated)</label>
                  <input
                    type="text"
                    value={newLore.tags}
                    onChange={(e) => setNewLore({ ...newLore, tags: e.target.value })}
                    placeholder="Void, Sector9, Anomaly, Boss"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={createLoreMutation.isPending}
                    className="px-5 py-2 bg-[#00F0FF] text-black font-bold hover:bg-[#00F0FF]/80 rounded transition-colors"
                  >
                    {createLoreMutation.isPending ? "ENCRYPTING..." : "COMMIT TO ARCHIVE"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
