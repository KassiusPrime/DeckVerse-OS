import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Upload, Database, Scroll, Swords, ChevronRight,
  Plus, Save, Trash2, Eye, EyeOff, Pencil, X, Check, Sparkles, ShieldCheck,
  Search, Lock, Unlock, Cpu, Activity, RefreshCw, AlertTriangle, Layers,
  Terminal, UserCheck, HardDrive, Zap, CheckCircle2, XCircle
} from "lucide-react";

import { adminController } from "./core/adminController.js";
import FandomImporter from "@/FandomImporter";
import CollectionImporter from "@/CollectionImporter";
import DataQualityCenter from "@/DataQualityCenter";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/use-toast";
import { ELEMENTS, ROLES } from "@/constants";
import TagInput from "@/TagInput";

const NEW_RARITY_ORDER = ["C", "UC", "R", "SR", "SSR", "UR", "LR", "MR", "BOSS", "ANOMALIA"];

const NAV_ITEMS = [
  { key: "dashboard",   label: "CONSOLE DASHBOARD", icon: Activity, group: "OVERVIEW" },
  { key: "quality",     label: "QUALIDADE & QUARENTENA", icon: ShieldCheck, group: "DATA" },
  { key: "cards",       label: "GERENCIADOR DE CARTAS", icon: Upload, group: "DATA" },
  { key: "collections", label: "COLEÇÕES", icon: Database, group: "DATA" },
  { key: "bosses",      label: "ENTIDADES & BOSSES", icon: Swords, group: "DATA" },
  { key: "players",     label: "PLAYERS & GEMAS", icon: Shield, group: "USERS" },
  { key: "queue",       label: "FILA DE TAREFAS & SYNC", icon: Cpu, group: "SYSTEM" },
  { key: "db",          label: "EXPLORADOR DE BANCO", icon: HardDrive, group: "SYSTEM" },
  { key: "fandom",      label: "FANDOM IA IMPORT", icon: Sparkles, group: "TOOLS" },
  { key: "collection_import", label: "COLLECTION IMPORT", icon: Layers, group: "TOOLS" },
];

const EMPTY_CARD = {
  name: "", card_id: "", collection_id: "", rarity: "C", role: "DPS",
  element: "Void", gender: "Unknown",
  attack: 100, defense: 100, speed: 100, hp: 400, mag: 100,
  img_oficial: "", img_custom: "", lore: "", version: "Classic",
  evolution_stage: 1, is_boss: false, tags: [],
};

/* ─── Image URL input with live preview ─── */
function ImageField({ value, onChange, label = "IMAGE URL" }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-heading tracking-widest text-muted-foreground">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => setPreview(p => !p)}
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"
          >
            {preview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {preview ? "HIDE" : "PREVIEW"}
          </button>
        )}
      </div>
      <Input
        value={value}
        onChange={onChange}
        placeholder="https://i.imgur.com/..."
        className="font-mono bg-muted/20 border-border/50 text-xs"
      />
      {preview && value && (
        <div className="relative border border-border/40 overflow-hidden rounded mt-1" style={{ aspectRatio: "3/4", maxHeight: 140 }}>
          <img
            src={value}
            alt="preview"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = ""; setPreview(false); }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Skills Editor ─── */
function SkillsEditor({ skills = [], onChange }) {
  const add = () => onChange([...skills, { name: "", description: "", type: "Active" }]);
  const remove = (i) => onChange(skills.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...skills];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-heading tracking-widest text-muted-foreground">SKILLS ({skills.length})</label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-[10px] font-heading text-primary hover:text-primary/80 border border-primary/30 px-2 py-0.5 rounded"
        >
          <Plus className="w-2.5 h-2.5" /> ADD SKILL
        </button>
      </div>
      {skills.map((sk, i) => (
        <div key={i} className="border border-border/30 bg-muted/10 p-3 rounded space-y-2 relative">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-2 right-2 text-destructive/50 hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={sk.name}
              onChange={e => update(i, "name", e.target.value)}
              placeholder="Skill name"
              className="font-body bg-muted/20 border-border/50 text-xs h-8"
            />
            <Select value={sk.type} onValueChange={v => update(i, "type", v)}>
              <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Active","Passive","Ultimate"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={sk.description}
            onChange={e => update(i, "description", e.target.value)}
            placeholder="Skill description..."
            className="font-body bg-muted/20 border-border/50 text-xs h-14 resize-none"
          />
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  // Handle Login / Unlock
  const handleLogin = (e) => {
    e.preventDefault();
    if (adminController.verifyAdminKey(password)) {
      setIsAuthenticated(true);
      toast({
        title: "⚡ ADMIN CONSOLE UNLOCKED",
        description: "Autenticação aprovada pelo controller mestre."
      });
    } else {
      toast({
        title: "❌ ACESSO NEGADO",
        description: "Senha de override incorreta.",
        variant: "destructive"
      });
    }
  };

  // Queries using Admin Controller
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: () => adminController.getDashboardSummary(),
    enabled: isAuthenticated
  });

  const { data: cards = [], refetch: refetchCards } = useQuery({
    queryKey: ["admin-cards"],
    queryFn: () => adminController.getAllCards(),
    enabled: isAuthenticated
  });

  const { data: collections = [], refetch: refetchCollections } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => adminController.getAllCollections(),
    enabled: isAuthenticated
  });

  const { data: players = [], refetch: refetchPlayers } = useQuery({
    queryKey: ["admin-players"],
    queryFn: () => adminController.getAllPlayers(),
    enabled: isAuthenticated
  });

  const { data: quarantine = [], refetch: refetchQuarantine } = useQuery({
    queryKey: ["admin-quarantine"],
    queryFn: () => adminController.getQuarantineItems(),
    enabled: isAuthenticated
  });

  // Filtered Navigation Items via Ctrl+K or search box
  const filteredNav = NAV_ITEMS.filter(item =>
    item.label.toLowerCase().includes(globalSearch.toLowerCase()) ||
    item.key.toLowerCase().includes(globalSearch.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md border border-primary/40 bg-card/90 backdrop-blur-md p-6 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.15)] space-y-6"
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-xl font-bold tracking-wider text-foreground">DECKVERSE OS — ADMIN CONSOLE</h1>
            <p className="text-xs font-mono text-muted-foreground">Insira a chave de override para acessar o painel de administração.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Senha de Acesso (padrão: OS_OVERRIDE_99)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="font-mono text-center bg-muted/20 border-border/50 text-sm h-11"
            />
            <button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold tracking-widest text-xs rounded transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" /> DESBLOQUEAR CONSOLE
            </button>
          </form>

          <div className="text-center">
            <span className="text-[10px] font-mono text-muted-foreground/60">Controle Unificado via adminController.js</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* ─── SIDEBAR FIXA ─── */}
      <aside className="w-full md:w-64 bg-card/80 border-r border-border/40 shrink-0 p-4 flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-sm tracking-wider text-primary">DECKVERSE ADM</span>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            title="Bloquear Console"
            className="p-1.5 text-muted-foreground hover:text-destructive text-xs rounded border border-border/30"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Busca Global na Sidebar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            placeholder="Buscar seção (Ctrl+K)..."
            className="pl-8 text-xs font-mono h-8 bg-muted/20 border-border/40"
          />
        </div>

        {/* Lista de Seções */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-heading font-bold tracking-wider transition-all text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.key === "quality" && summary?.quality?.quarantinedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-destructive text-destructive-foreground font-mono font-bold">
                    {summary.quality.quarantinedCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-border/30 text-[10px] font-mono text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Status da IA:</span>
            <span className={summary?.aiStatus?.geminiConfigured ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {summary?.aiStatus?.geminiConfigured ? "Gemini Online" : "Modo Fallback"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Política Canônica:</span>
            <span className="text-primary font-bold">Propose</span>
          </div>
        </div>
      </aside>

      {/* ─── CONTEÚDO PRINCIPAL ─── */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto space-y-6">
        {/* Dashboard Overview */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
              <div>
                <h1 className="font-heading text-xl font-bold text-foreground">CONSOLE DASHBOARD</h1>
                <p className="text-xs font-mono text-muted-foreground">Visão geral do estado do banco de dados, qualidade de dados e fila de tarefas.</p>
              </div>
              <button
                onClick={() => { refetchSummary(); refetchCards(); }}
                className="flex items-center gap-2 px-3 py-1.5 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-heading font-bold rounded transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> ATUALIZAR MÉTRICAS
              </button>
            </div>

            {/* Grid de Métricas Mestre */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/40 bg-card/60 space-y-1">
                <span className="text-[10px] font-heading font-bold text-muted-foreground tracking-wider">TOTAL DE CARTAS</span>
                <div className="text-2xl font-mono font-bold text-foreground">{summary?.stats?.totalCards || 0}</div>
                <span className="text-[10px] font-mono text-emerald-400">Em {summary?.stats?.totalCollections || 0} coleções</span>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-card/60 space-y-1">
                <span className="text-[10px] font-heading font-bold text-muted-foreground tracking-wider">SCORE DE QUALIDADE</span>
                <div className="text-2xl font-mono font-bold text-primary">{summary?.quality?.globalScore || 100}/100</div>
                <span className="text-[10px] font-mono text-muted-foreground">{summary?.quality?.incompleteCardsCount || 0} cartas incompletas</span>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-card/60 space-y-1">
                <span className="text-[10px] font-heading font-bold text-muted-foreground tracking-wider">QUARENTENA</span>
                <div className="text-2xl font-mono font-bold text-destructive">{summary?.quality?.quarantinedCount || 0}</div>
                <span className="text-[10px] font-mono text-destructive/80">Requer revisão ou descarte</span>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-card/60 space-y-1">
                <span className="text-[10px] font-heading font-bold text-muted-foreground tracking-wider">ARMAZENAMENTO</span>
                <div className="text-2xl font-mono font-bold text-foreground">{summary?.stats?.storageUsedKB || 0} KB</div>
                <span className="text-[10px] font-mono text-muted-foreground">localStorage ativo</span>
              </div>
            </div>

            {/* Ações Rápidas de Manutenção */}
            <div className="p-5 rounded-xl border border-border/40 bg-card/40 space-y-4">
              <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> AÇÕES DE MANUTENÇÃO DO SISTEMA
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={async () => {
                    await adminController.triggerDataQualityAudit();
                    toast({ title: "⚡ Auditoria iniciada na fila de tarefas!" });
                    refetchSummary();
                  }}
                  className="p-3 border border-border/40 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded text-left space-y-1 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-heading font-bold text-primary">
                    <ShieldCheck className="w-4 h-4" /> AUDITAR QUALIDADE
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">Analisa imagens, stats e textos de todas as cartas.</p>
                </button>

                <button
                  onClick={async () => {
                    await adminController.triggerImageRepair();
                    toast({ title: "⚡ Reparo de Imagens adicionado à fila!" });
                    refetchSummary();
                  }}
                  className="p-3 border border-border/40 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded text-left space-y-1 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-heading font-bold text-emerald-400">
                    <RefreshCw className="w-4 h-4" /> AUTO-REPARO MULTI-TIER
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">Busca imagens ausentes via Fandom/Superhero/Jikan.</p>
                </button>

                <button
                  onClick={async () => {
                    await adminController.clearCaches();
                    toast({ title: "🧹 Caches limpos com sucesso!" });
                    refetchSummary();
                  }}
                  className="p-3 border border-border/40 hover:border-amber-500/50 bg-muted/20 hover:bg-muted/40 rounded text-left space-y-1 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-heading font-bold text-amber-400">
                    <Trash2 className="w-4 h-4" /> LIMPAR CACHES LOCAL
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">Remove cache temporário de Fandom e requisições.</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gerenciador de Cartas */}
        {activeTab === "cards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div>
                <h1 className="font-heading text-lg font-bold">GERENCIADOR DE CARTAS</h1>
                <p className="text-xs font-mono text-muted-foreground">Total: {cards.length} cartas registradas no banco local.</p>
              </div>
            </div>

            <div className="space-y-2">
              {cards.slice(0, 50).map(card => (
                <div key={card.id || card.card_id} className="p-3 border border-border/30 bg-card/40 rounded flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {card.image_url || card.img_oficial ? (
                      <img src={card.image_url || card.img_oficial} alt={card.name} className="w-10 h-12 object-cover rounded border border-border/30 bg-muted/20" />
                    ) : (
                      <div className="w-10 h-12 rounded bg-destructive/10 border border-destructive/30 flex items-center justify-center text-[8px] font-bold text-destructive">SEM IMG</div>
                    )}
                    <div className="min-w-0">
                      <div className="font-heading font-bold text-xs truncate">{card.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{card.card_id} · {card.rarity} · {card.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (confirm(`Excluir carta ${card.name}?`)) {
                          await adminController.deleteCard(card.id);
                          toast({ title: "Carta excluída!" });
                          refetchCards();
                        }
                      }}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded border border-destructive/20 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Ops & Gemas */}
        {activeTab === "players" && (
          <div className="space-y-4">
            <h1 className="font-heading text-lg font-bold">JOGADORES & RECURSOS (GEMAS/GOLD)</h1>
            <div className="space-y-3">
              {players.map(p => (
                <PlayerRow key={p.id} player={p} onRefresh={() => { refetchPlayers(); refetchSummary(); }} />
              ))}
            </div>
          </div>
        )}

        {/* Fila de Tarefas & Sync */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            <h1 className="font-heading text-lg font-bold">FILA DE TAREFAS (JOB QUEUE) & SYNC</h1>
            <div className="p-4 border border-border/40 bg-card/40 rounded space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-primary">TAREFAS RECENTES E EM EXECUÇÃO</span>
                <button
                  onClick={() => { adminController.clearJobQueueHistory(); refetchSummary(); }}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
                >
                  LIMPAR HISTÓRICO
                </button>
              </div>
              <div className="space-y-2">
                {summary?.queue?.activeJobs?.length === 0 ? (
                  <p className="text-xs font-mono text-muted-foreground">Nenhuma tarefa ativa na fila neste momento.</p>
                ) : (
                  summary?.queue?.activeJobs?.map(job => (
                    <div key={job.id} className="p-3 border border-border/30 bg-muted/10 rounded space-y-1">
                      <div className="flex justify-between text-xs font-heading font-bold">
                        <span>{job.title}</span>
                        <span className="text-primary">{job.status.toUpperCase()} ({job.progress}%)</span>
                      </div>
                      <div className="w-full bg-muted/40 h-1.5 rounded overflow-hidden">
                        <div className="bg-primary h-full transition-all" style={{ width: `${job.progress}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Explorador de Banco */}
        {activeTab === "db" && (
          <div className="space-y-4">
            <h1 className="font-heading text-lg font-bold">EXPLORADOR DE BANCO DE DADOS LOCAL</h1>
            <div className="p-4 border border-border/40 bg-card/40 rounded font-mono text-xs space-y-2">
              <div><strong>Ambiente:</strong> {summary?.stats?.environment}</div>
              <div><strong>Tamanho do Armazenamento:</strong> {summary?.stats?.storageUsedKB} KB</div>
              <div><strong>Total de Entidades:</strong> {summary?.stats?.totalCards} Cartas | {summary?.stats?.totalCollections} Coleções</div>
            </div>
          </div>
        )}

        {/* Fandom IA Import Tab */}
        {activeTab === "fandom" && <FandomImporter />}

        {/* Collection Import Tab */}
        {activeTab === "collection_import" && <CollectionImporter />}

        {/* Data Quality Center Tab */}
        {activeTab === "quality" && <DataQualityCenter />}

        {/* Bosses Tab */}
        {activeTab === "bosses" && (
          <div className="space-y-4">
            <h1 className="font-heading text-lg font-bold">ENTIDADES E BOSSES</h1>
            <p className="text-xs font-mono text-muted-foreground">Painel de gerenciamento de Chefões de Incursão e Eventos.</p>
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div className="space-y-4">
            <h1 className="font-heading text-lg font-bold font-mono">COLEÇÕES DO MULTIVERSO ({collections.length})</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {collections.map(c => (
                <div key={c.id || c.code} className="p-3 border border-border/30 bg-card/40 rounded flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary/20 border border-primary/40 flex items-center justify-center font-bold font-mono text-primary text-xs">
                    {c.code}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-bold text-xs">{c.name}</div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{c.description || "Sem descrição"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* Row editor for Players */
function PlayerRow({ player, onRefresh }) {
  const [gems, setGems] = useState(player.gems || 0);
  const [gold, setGold] = useState(player.gold || 0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    await adminController.updatePlayerCurrency(player.id, gems, gold);
    setSaving(false);
    toast({ title: "Gemas e Gold atualizados com sucesso!" });
    onRefresh();
  };

  return (
    <div className="p-3 border border-border/30 bg-card/40 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <div className="font-heading font-bold text-xs">{player.name || "Jogador"}</div>
        <div className="font-mono text-[10px] text-muted-foreground">ID: {player.id}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-cyan-400 font-bold">GEMAS:</span>
          <Input type="number" value={gems} onChange={e => setGems(e.target.value)} className="w-20 h-7 text-xs font-mono" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-amber-400 font-bold">GOLD:</span>
          <Input type="number" value={gold} onChange={e => setGold(e.target.value)} className="w-20 h-7 text-xs font-mono" />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-7 px-3 bg-primary text-primary-foreground font-heading font-bold text-[10px] rounded"
        >
          {saving ? "..." : "SALVAR"}
        </button>
      </div>
    </div>
  );
}
