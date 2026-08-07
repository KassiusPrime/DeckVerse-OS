import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { adminController } from "@/core/adminController";
import { useToast } from "@/use-toast";
import { cleanLoreText } from "@/src/utils/deduplication";
import {
  X,
  BookOpen,
  BarChart3,
  Zap,
  Target,
  Users,
  Layers,
  Image as ImageIcon,
  Shield,
  Sparkles,
  Flame,
  Award,
  Globe,
  Quote,
  Activity,
  UserCheck,
  HeartHandshake,
  Swords,
  Trash2
} from "lucide-react";
import { RarityBadge, RoleBadge } from "../RarityBadge";

export default function CardModalDrawer({ card, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("lore");
  const [isDeleting, setIsDeleting] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  if (!isOpen || !card) return null;

  const handleDeleteCard = async () => {
    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a carta "${card.name}" do sistema?`)) {
      setIsDeleting(true);
      try {
        await adminController.deleteCard(card.id || card.card_id);
        toast({
          title: "🗑️ CARTA EXCLUÍDA COM SUCESSO",
          description: `A carta "${card.name}" foi removida do banco de dados.`
        });
        qc.invalidateQueries();
        onClose();
      } catch (err) {
        toast({ title: "❌ Erro ao excluir carta", description: err.message, variant: "destructive" });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Derive display image: priority to img_custom if set by admin, otherwise img_oficial / image_url
  const displayImage = card.img_custom || card.img_oficial || card.image_url || "";
  const universeName = card.universe || (card.collection_id === "NAR" ? "Anime & Mangá" : card.collection_id === "MVC" ? "Quadrinhos & HQs" : "Multiverso");

  // Stats derivation
  const stats = {
    strength: card.attack || 75,
    speed: card.speed || 75,
    resistance: card.defense || 70,
    intelligence: card.mag || 80,
    strategy: Math.min(100, Math.round(((card.mag || 70) + (card.defense || 70)) / 2)),
    energy: card.mag || 75,
    precision: Math.min(100, Math.round(((card.speed || 75) + (card.attack || 75)) / 2)),
    control: 75,
    versatility: 70,
    potential: 85,
    experience: 75
  };

  const skills = card.skills || [
    { name: "Ataque Básico", description: "Golpe rápido e concentrado.", type: "Active" },
    { name: "Técnica Especial", description: "Ataque característico de combate.", type: "Active" },
    { name: "Golpe Supremo", description: "Liberação máxima de energia canônica.", type: "Ultimate" }
  ];

  const tags = card.tags || [card.collection_id || "MULTIVERSE"];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-primary/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded">
                {card.collection_id || card.series || "MULTIVERSE"}
              </span>
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                  {card.name}
                  {card.version && <span className="text-xs font-mono text-muted-foreground font-normal">({card.version})</span>}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                  <Globe className="w-3.5 h-3.5 text-primary" /> {universeName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteCard}
                disabled={isDeleting}
                title="Excluir Carta do Sistema"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/50 hover:bg-red-900/60 transition-all shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Excluir Carta</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Card */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-primary/30 shadow-lg group bg-black/60">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={card.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/30">
                    <Sparkles className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-end">
                  <div className="flex items-center gap-2">
                    <RarityBadge rarity={card.rarity} />
                    <RoleBadge role={card.role} />
                  </div>
                </div>
              </div>

              {card.img_custom && (
                <div className="mt-2 text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded text-center w-full">
                  ★ Imagem Customizada pelo Admin
                </div>
              )}
            </div>

            {/* Right Column: Information Tabs & Content */}
            <div className="lg:col-span-8 flex flex-col">
              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-border/40 pb-2 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab("lore")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "lore" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Lore & Bio
                </button>

                <button
                  onClick={() => setActiveTab("stats")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "stats" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Atributos
                </button>

                <button
                  onClick={() => setActiveTab("skills")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "skills" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> Poderes
                </button>

                <button
                  onClick={() => setActiveTab("archetypes")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "archetypes" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" /> Arquétipos
                </button>

                <button
                  onClick={() => setActiveTab("relations")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "relations" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Relações
                </button>
              </div>

              {/* Tab 1: Lore & Bio */}
              {activeTab === "lore" && (
                <div className="py-4 space-y-4 font-body">
                  <div className="bg-muted/20 border border-border/30 p-4 rounded-xl">
                    <h4 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" /> Biografia Canônica
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                      {cleanLoreText(card.lore, card.name, universeName)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-card/60 border border-border/40 p-3 rounded-lg">
                      <span className="text-muted-foreground block text-[10px] font-mono uppercase">ALINHAMENTO MORAL</span>
                      <span className="font-bold text-foreground">Ordeiro e Bom</span>
                    </div>
                    <div className="bg-card/60 border border-border/40 p-3 rounded-lg">
                      <span className="text-muted-foreground block text-[10px] font-mono uppercase">TOM DE VOZ</span>
                      <span className="font-bold text-foreground">Determinado e Confiante</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Stats */}
              {activeTab === "stats" && (
                <div className="py-4 space-y-3">
                  <h4 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Estatísticas Canônicas RPG</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    {Object.entries(stats).map(([key, val]) => (
                      <div key={key} className="bg-muted/20 border border-border/30 p-2.5 rounded-lg flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="uppercase text-muted-foreground font-bold">{key}</span>
                          <span className="text-primary font-bold">{val} / 100</span>
                        </div>
                        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, val)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Skills / Movepool */}
              {activeTab === "skills" && (
                <div className="py-4 space-y-3">
                  <h4 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Movepool & Poderes Especializados</h4>
                  <div className="space-y-2">
                    {skills.map((sk, idx) => (
                      <div key={idx} className="bg-muted/20 border border-border/30 p-3 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-primary/10 border border-primary/30 rounded-lg text-primary">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-sm text-foreground">{sk.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-background border border-border/40 rounded uppercase text-muted-foreground">
                              {sk.type || "Active"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{sk.description || sk.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Archetypes */}
              {activeTab === "archetypes" && (
                <div className="py-4 space-y-4">
                  <h4 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Arquétipos de Combate & Personalidade</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tg, idx) => (
                      <span key={idx} className="font-mono text-xs px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-bold rounded-lg flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> {tg}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Arquétipos substituem o sistema antigo de elementos estáticos, determinando sinergias de combate e táticas comportamentais na Arena do DeckVerse.
                  </p>
                </div>
              )}

              {/* Tab 5: Relations */}
              {activeTab === "relations" && (
                <div className="py-4 space-y-3">
                  <h4 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Rede de Relacionamentos Multiversal</h4>
                  <div className="space-y-2 text-xs font-body">
                    <div className="bg-muted/20 border border-border/30 p-3 rounded-lg flex items-center justify-between">
                      <span className="font-bold text-foreground">Franquia Principal</span>
                      <span className="font-mono text-primary font-bold">{card.collection_id || card.series}</span>
                    </div>
                    <div className="bg-muted/20 border border-border/30 p-3 rounded-lg flex items-center justify-between">
                      <span className="font-bold text-foreground">Status no Roster</span>
                      <span className="font-mono text-emerald-400 font-bold">Disponível em Packs & Drops</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
