import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Upload, Database, Scroll, Swords, ChevronRight, ChevronLeft,
  Plus, Save, Trash2, Eye, EyeOff, Pencil, X, Check, Sparkles, ShieldCheck,
  Search, Lock, Unlock, Cpu, Activity, RefreshCw, AlertTriangle, Layers,
  Terminal, UserCheck, HardDrive, Zap, CheckCircle2, XCircle, Filter, SlidersHorizontal, FileText, Crown, FileCheck, Images
} from "lucide-react";

import { adminController } from "./core/adminController.js";
import { useAuth } from "./AuthContext";
import FandomImporter from "@/FandomImporter";
import CollectionImporter from "@/CollectionImporter";
import DataQualityCenter from "@/DataQualityCenter";
import SchemaRegistryPanel from "./components/SchemaRegistryPanel";
import AdminMediaManager from "./AdminMediaManager";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/use-toast";
import {
  ELEMENTS, ROLES, PERSONALITIES, IDENTITIES, ORIGINS, NARRATIVE_FUNCTIONS, CHARACTER_CLASSES, POWER_TYPES, RARITY_TIERS, RARITY_ORDER
} from "@/constants";
import TagInput from "@/TagInput";
import { RarityBadge } from "@/RarityBadge";
import { backgroundSyncService } from "@/services/sync/backgroundSyncService";

const NEW_RARITY_ORDER = ["C", "UC", "R", "SR", "SSR", "UR", "LR", "MR", "DIV", "BOSS", "ANOMALIA"];

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
  { key: "schemas",     label: "SCHEMAS & VALIDAÇÃO", icon: FileCheck, group: "TOOLS" },
  { key: "media",       label: "MÍDIA (MEDIA MANAGER)", icon: Images, group: "TOOLS" },
];

const EMPTY_CARD = {
  name: "", card_id: "", collection_id: "MULTIVERSE", rarity: "SR", role: "DPS",
  element: "", gender: undefined,
  attack: 100, defense: 100, speed: 100, hp: 400, mag: 100,
  img_oficial: "", img_custom: "", lore: "", version: "Classic",
  evolution_stage: 1, is_boss: false, tags: [],
  personality: "", identity: "", origin: "", narrative_function: "", character_class: "", power_type: ""
};

const EMPTY_BOSS = {
  name: "",
  title: "",
  element: "",
  rarity: "BOSS",
  hp: 3000,
  attack: 250,
  defense: 180,
  speed: 120,
  image_url: "",
  lore: "",
  is_active: true,
  gold_reward: 500,
  gem_reward: 50
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
            {preview ? "OCULTAR" : "VER PRÉVIA"}
          </button>
        )}
      </div>
      <Input
        value={value || ""}
        onChange={onChange}
        placeholder="https://i.imgur.com/..."
        className="font-mono bg-muted/20 border-border/50 text-xs"
      />
      {preview && value && (
        <div className="relative border border-border/40 overflow-hidden rounded mt-1 bg-black/40 flex items-center justify-center max-h-[140px] aspect-[3/4] mx-auto">
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
              value={sk.name || ""}
              onChange={e => update(i, "name", e.target.value)}
              placeholder="Nome da Skill"
              className="font-body bg-muted/20 border-border/50 text-xs h-8"
            />
            <Select value={sk.type || "Active"} onValueChange={v => update(i, "type", v)}>
              <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Active","Passive","Ultimate"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={sk.description || ""}
            onChange={e => update(i, "description", e.target.value)}
            placeholder="Descrição do efeito da skill..."
            className="font-body bg-muted/20 border-border/50 text-xs h-14 resize-none"
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Modal/Drawer para Editar / Criar Carta (Com Classificações) ─── */
function CardEditorModal({ card, collections = [], onClose, onSave }) {
  const [formData, setFormData] = useState({ ...EMPTY_CARD, ...card });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "❌ Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      toast({ title: "✅ Carta salva com sucesso!" });
      onClose();
    } catch (err) {
      toast({ title: "❌ Erro ao salvar carta", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-primary/40 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-base tracking-wider text-foreground">
              {formData.id ? `EDITAR CARTA: ${formData.name}` : "CRIAR NOVA CARTA"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Seção 1: Dados Básicos */}
          <div className="space-y-3">
            <h3 className="font-heading text-xs font-bold tracking-widest text-primary flex items-center gap-1.5 border-b border-border/30 pb-1">
              <Sparkles className="w-3.5 h-3.5" /> DADOS BÁSICOS & RECEPTÁCULO
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">NOME DO PERSONAGEM</label>
                <Input
                  value={formData.name || ""}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Son Goku"
                  className="font-body text-xs bg-muted/20 border-border/50"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">ID DA CARTA (CARD_ID)</label>
                <Input
                  value={formData.card_id || ""}
                  onChange={e => setFormData({ ...formData, card_id: e.target.value })}
                  placeholder="Ex: DBZ-GOKU-001 (auto)"
                  className="font-mono text-xs bg-muted/20 border-border/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">COLEÇÃO / CÓDIGO</label>
                <Select value={formData.collection_id || "MULTIVERSE"} onValueChange={v => setFormData({ ...formData, collection_id: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MULTIVERSE">MULTIVERSE (Geral)</SelectItem>
                    {collections.map(c => (
                      <SelectItem key={c.id || c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">RARIDADE</label>
                <Select value={formData.rarity || "SR"} onValueChange={v => setFormData({ ...formData, rarity: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEW_RARITY_ORDER.map(r => (
                      <SelectItem key={r} value={r}>{RARITY_TIERS[r]?.label || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">FUNÇÃO (ROLE)</label>
                <Select value={formData.role || "DPS"} onValueChange={v => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">ELEMENTO</label>
                <Select value={formData.element || ""} onValueChange={v => setFormData({ ...formData, element: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ELEMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    <SelectItem value="Void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">GÊNERO</label>
                <Input
                  value={formData.gender || ""}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  placeholder="Masculino / Feminino / Outro"
                  className="font-body text-xs bg-muted/20 border-border/50"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Atributos de Combate */}
          <div className="space-y-3">
            <h3 className="font-heading text-xs font-bold tracking-widest text-primary flex items-center gap-1.5 border-b border-border/30 pb-1">
              <Swords className="w-3.5 h-3.5" /> ATRIBUTOS DE COMBATE (STATS)
            </h3>
            <div className="grid grid-cols-5 gap-2 font-mono">
              <div>
                <label className="text-[9px] text-red-400">ATK</label>
                <Input type="number" value={formData.attack || 100} onChange={e => setFormData({ ...formData, attack: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
              </div>
              <div>
                <label className="text-[9px] text-blue-400">DEF</label>
                <Input type="number" value={formData.defense || 100} onChange={e => setFormData({ ...formData, defense: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
              </div>
              <div>
                <label className="text-[9px] text-green-400">HP</label>
                <Input type="number" value={formData.hp || 400} onChange={e => setFormData({ ...formData, hp: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
              </div>
              <div>
                <label className="text-[9px] text-yellow-400">SPD</label>
                <Input type="number" value={formData.speed || 100} onChange={e => setFormData({ ...formData, speed: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
              </div>
              <div>
                <label className="text-[9px] text-purple-400">MAG</label>
                <Input type="number" value={formData.mag || 100} onChange={e => setFormData({ ...formData, mag: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
              </div>
            </div>
          </div>

          {/* Seção 3: CLASSIFICAÇÕES DO PROMPT MESTRE (6 CAMPOS) */}
          <div className="space-y-3">
            <h3 className="font-heading text-xs font-bold tracking-widest text-amber-400 flex items-center gap-1.5 border-b border-border/30 pb-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> CLASSIFICAÇÕES DO PROMPT MESTRE (CANÔNICAS)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-heading text-muted-foreground">PERSONALIDADE</label>
                <Select value={formData.personality || ""} onValueChange={v => setFormData({ ...formData, personality: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {PERSONALITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-heading text-muted-foreground">IDENTIDADE</label>
                <Select value={formData.identity || ""} onValueChange={v => setFormData({ ...formData, identity: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {IDENTITIES.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-heading text-muted-foreground">ORIGEM DE PODER</label>
                <Select value={formData.origin || ""} onValueChange={v => setFormData({ ...formData, origin: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-heading text-muted-foreground">FUNÇÃO NARRATIVA</label>
                <Select value={formData.narrative_function || ""} onValueChange={v => setFormData({ ...formData, narrative_function: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {NARRATIVE_FUNCTIONS.map(nf => <SelectItem key={nf} value={nf}>{nf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-heading text-muted-foreground">CLASSE DE PERSONAGEM</label>
                <Select value={formData.character_class || ""} onValueChange={v => setFormData({ ...formData, character_class: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {CHARACTER_CLASSES.map(cc => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-heading text-muted-foreground">TIPO DE PODER</label>
                <Select value={formData.power_type || ""} onValueChange={v => setFormData({ ...formData, power_type: v })}>
                  <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {POWER_TYPES.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 4: Imagens & Lore */}
          <div className="space-y-3">
            <h3 className="font-heading text-xs font-bold tracking-widest text-primary flex items-center gap-1.5 border-b border-border/30 pb-1">
              <Eye className="w-3.5 h-3.5" /> IMAGENS & BIOGRAFIA (LORE)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ImageField
                value={formData.img_oficial || formData.image_url}
                onChange={e => setFormData({ ...formData, img_oficial: e.target.value, image_url: e.target.value })}
                label="URL DA IMAGEM OFICIAL"
              />
              <ImageField
                value={formData.img_custom}
                onChange={e => setFormData({ ...formData, img_custom: e.target.value })}
                label="URL DA IMAGEM CUSTOMIZADA (OPCIONAL)"
              />
            </div>
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">LORE / BIOGRAFIA DO PERSONAGEM</label>
              <Textarea
                value={formData.lore || ""}
                onChange={e => setFormData({ ...formData, lore: e.target.value })}
                placeholder="História canônica e detalhes da entidade..."
                className="font-body text-xs bg-muted/20 border-border/50 h-20 resize-none"
              />
            </div>
          </div>

          {/* Seção 5: Skills & Tags */}
          <SkillsEditor skills={formData.skills || []} onChange={sk => setFormData({ ...formData, skills: sk })} />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-heading border border-border/50 rounded hover:bg-muted/20 transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground text-xs font-heading font-bold tracking-wider rounded hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? "SALVANDO..." : "SALVAR CARTA"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── Modal para Importação em Massa (JSON / TXT) ─── */
function BatchImportModal({ onClose, onImportDone }) {
  const [jsonInput, setJsonInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    setImporting(true);
    setReport(null);

    try {
      let parsed;
      try {
        parsed = JSON.parse(jsonInput);
      } catch (err) {
        toast({ title: "❌ JSON Inválido", description: "Verifique a sintaxe do JSON colado.", variant: "destructive" });
        setImporting(false);
        return;
      }

      const batchArray = Array.isArray(parsed) ? parsed : [parsed];
      const res = await adminController.importCardBatch(batchArray);
      setReport(res);
      toast({ title: `📦 Importação concluída! ${res.imported} importadas, ${res.skipped} ignoradas.` });
      onImportDone();
    } catch (err) {
      toast({ title: "❌ Erro ao importar", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonInput(event.target?.result || "");
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-primary/40 rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-base tracking-wider text-foreground">IMPORTAÇÃO EM MASSA (JSON/TXT)</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs font-mono text-muted-foreground">
          Cole abaixo um objeto único ou array JSON de cartas (suporta o formato flat e o schema do Prompt Mestre).
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-heading text-muted-foreground">CARREGAR ARQUIVO .JSON / .TXT</label>
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="text-xs font-mono text-muted-foreground file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:bg-primary/20 file:text-primary file:rounded cursor-pointer" />
          </div>
          <Textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder='[ { "name": "Goku", "rarity": "UR", "attack": 120, ... } ]'
            className="font-mono text-xs bg-muted/20 border-border/50 h-48"
          />
        </div>

        {report && (
          <div className="p-3 border border-border/40 bg-muted/10 rounded font-mono text-xs space-y-1">
            <div className="text-emerald-400 font-bold">Importadas com sucesso: {report.imported}</div>
            <div className="text-amber-400">Ignoradas (Duplicatas): {report.skipped}</div>
            {report.errors?.length > 0 && (
              <div className="text-destructive font-bold">Erros ({report.errors.length}): {report.errors.join("; ")}</div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
          <button onClick={onClose} className="px-4 py-2 text-xs font-heading border border-border/50 rounded">CANCELAR</button>
          <button
            onClick={handleImport}
            disabled={importing || !jsonInput.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(0,240,255,0.3)] disabled:opacity-40"
          >
            {importing ? "IMPORTANDO..." : "IMPORTAR NO BANCO"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Modal para Criar / Editar Boss ─── */
function BossEditorModal({ boss, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...EMPTY_BOSS, ...boss });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "❌ Nome do Boss é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      toast({ title: "👑 Entidade Boss salva com sucesso!" });
      onClose();
    } catch (err) {
      toast({ title: "❌ Erro ao salvar Boss", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-sky-400/40 rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-sky-400" />
            <h2 className="font-heading font-bold text-base tracking-wider text-sky-300">
              {formData.id ? `EDITAR BOSS: ${formData.name}` : "CRIAR NOVA ENTIDADE BOSS"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">NOME DO BOSS</label>
              <Input
                value={formData.name || ""}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Abyssal Sovereign"
                className="font-body text-xs bg-muted/20 border-border/50"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">TÍTULO / SUBTÍTULO</label>
              <Input
                value={formData.title || ""}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Senhor do Caos Multiversal"
                className="font-body text-xs bg-muted/20 border-border/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">ELEMENTO</label>
              <Select value={formData.element || ""} onValueChange={v => setFormData({ ...formData, element: v })}>
                <SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ELEMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">RARIDADE</label>
              <Select value={formData.rarity || "BOSS"} onValueChange={v => setFormData({ ...formData, rarity: v })}>
                <SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOSS">[BOSS] Divino</SelectItem>
                  <SelectItem value="DIV">[DIV] Divino</SelectItem>
                  <SelectItem value="ANOMALIA">[ANOMALIA]</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="boss_active"
                checked={Boolean(formData.is_active)}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="boss_active" className="text-xs font-heading font-bold text-sky-300">BOSS ATIVO EM EVENTO</label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 font-mono">
            <div>
              <label className="text-[9px] text-green-400">HP MASSIVO</label>
              <Input type="number" value={formData.hp || 3000} onChange={e => setFormData({ ...formData, hp: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
            </div>
            <div>
              <label className="text-[9px] text-red-400">ATK</label>
              <Input type="number" value={formData.attack || 250} onChange={e => setFormData({ ...formData, attack: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
            </div>
            <div>
              <label className="text-[9px] text-blue-400">DEF</label>
              <Input type="number" value={formData.defense || 180} onChange={e => setFormData({ ...formData, defense: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
            </div>
            <div>
              <label className="text-[9px] text-yellow-400">SPD</label>
              <Input type="number" value={formData.speed || 120} onChange={e => setFormData({ ...formData, speed: Number(e.target.value) })} className="bg-muted/20 border-border/50 text-xs text-center" />
            </div>
          </div>

          <ImageField
            value={formData.image_url}
            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
            label="URL DA IMAGEM DO BOSS"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">RECOMPENSA GOLD</label>
              <Input type="number" value={formData.gold_reward || 500} onChange={e => setFormData({ ...formData, gold_reward: Number(e.target.value) })} className="font-mono text-xs bg-muted/20 border-border/50" />
            </div>
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">RECOMPENSA GEMAS</label>
              <Input type="number" value={formData.gem_reward || 50} onChange={e => setFormData({ ...formData, gem_reward: Number(e.target.value) })} className="font-mono text-xs bg-muted/20 border-border/50" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-heading text-muted-foreground">LORE & MECÂNICA ESPECIAL DO BOSS</label>
            <Textarea
              value={formData.lore || ""}
              onChange={e => setFormData({ ...formData, lore: e.target.value })}
              placeholder="Descrição dos ataques de fase e poderes divinos..."
              className="font-body text-xs bg-muted/20 border-border/50 h-20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-heading border border-border/50 rounded">CANCELAR</button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-sky-500 text-black font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(56,189,248,0.4)]"
            >
              {saving ? "SALVANDO..." : "SALVAR BOSS"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── ABA DE GERENCIAMENTO DE BOSSES ─── */
function BossManagerTab() {
  const { toast } = useToast();
  const [editingBoss, setEditingBoss] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bosses = [], refetch } = useQuery({
    queryKey: ["admin-bosses"],
    queryFn: () => adminController.getAllBosses()
  });

  const filteredBosses = bosses.filter(b =>
    !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.title && b.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSaveBoss = async (bossPayload) => {
    await adminController.saveBoss(bossPayload);
    refetch();
  };

  const handleDeleteBoss = async (bossId, bossName) => {
    if (confirm(`Excluir a entidade Boss ${bossName}?`)) {
      await adminController.deleteBoss(bossId);
      toast({ title: `Boss ${bossName} removido!` });
      refetch();
    }
  };

  const handleToggleActive = async (boss) => {
    await adminController.saveBoss({ ...boss, is_active: !boss.is_active });
    toast({ title: `Status do Boss ${boss.name} alterado para ${!boss.is_active ? "ATIVO" : "INATIVO"}` });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="font-heading text-lg font-bold flex items-center gap-2">
            <Crown className="w-5 h-5 text-sky-400" /> ENTIDADES E BOSSES ({bosses.length})
          </h1>
          <p className="text-xs font-mono text-muted-foreground">Gerencie chefões de evento de incursão multiversal e seus atributos.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-heading font-bold text-xs rounded transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)]"
        >
          <Plus className="w-4 h-4" /> NOVO BOSS DIVINO
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filtrar bosses por nome..."
          className="pl-9 font-mono text-xs bg-muted/20 border-border/40"
        />
      </div>

      {filteredBosses.length === 0 ? (
        <div className="p-10 border border-border/40 bg-card/40 rounded text-center space-y-3">
          <Crown className="w-10 h-10 text-sky-400/40 mx-auto" />
          <p className="font-heading text-sm text-muted-foreground">Nenhum chefe de incursão cadastrado.</p>
          <button onClick={() => setIsCreating(true)} className="text-xs text-sky-400 hover:underline">
            Clique aqui para criar o primeiro Boss
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBosses.map(boss => (
            <div key={boss.id} className="p-4 border border-sky-400/30 bg-card/60 rounded-xl flex items-start justify-between gap-4 relative overflow-hidden">
              <div className="flex items-start gap-3 min-w-0">
                {boss.image_url ? (
                  <img src={boss.image_url} alt={boss.name} className="w-14 h-20 object-cover rounded border border-sky-400/40 shadow-lg shadow-sky-400/10 shrink-0" />
                ) : (
                  <div className="w-14 h-20 rounded bg-sky-950/40 border border-sky-400/40 flex items-center justify-center text-sky-300 font-bold shrink-0">
                    <Crown className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-sm text-sky-300 truncate">{boss.name}</h3>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${boss.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold" : "bg-muted/20 text-muted-foreground border-border/40"}`}>
                      {boss.is_active ? "● EVENTO ATIVO" : "○ INATIVO"}
                    </span>
                  </div>
                  {boss.title && <p className="text-[11px] font-body text-muted-foreground truncate">{boss.title}</p>}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <span className="text-amber-400">Elem: {boss.element || "Shadow"}</span> ·
                    <span className="text-green-400">HP: {boss.hp || 3000}</span> ·
                    <span className="text-red-400">ATK: {boss.attack || 250}</span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400">
                    Recompensas: +{boss.gold_reward || 500} Gold · +{boss.gem_reward || 50} Gems 💎
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(boss)}
                  title="Alternar Status de Evento"
                  className="p-1.5 text-xs text-muted-foreground hover:text-sky-300 border border-border/40 rounded hover:bg-muted/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingBoss(boss)}
                  title="Editar Boss"
                  className="p-1.5 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteBoss(boss.id, boss.name)}
                  title="Excluir Boss"
                  className="p-1.5 text-xs text-destructive border border-destructive/30 rounded hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(isCreating || editingBoss) && (
        <BossEditorModal
          boss={editingBoss}
          onClose={() => { setIsCreating(false); setEditingBoss(null); }}
          onSave={handleSaveBoss}
        />
      )}
    </div>
  );
}

/* ─── ABA DE GERENCIADOR DE CARTAS COM FILTROS AVANÇADOS ─── */
function CardsManagerTab({ cards = [], collections = [], onRefresh }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL");
  const [elementFilter, setElementFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [collectionFilter, setCollectionFilter] = useState("ALL");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const [editingCard, setEditingCard] = useState(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [isBatchImporting, setIsBatchImporting] = useState(false);

  // Filter and Sort Logic
  const filteredCards = useMemo(() => {
    return cards.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (c.name || "").toLowerCase().includes(q);
        const matchesCode = (c.card_id || "").toLowerCase().includes(q);
        const matchesLore = (c.lore || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesLore) return false;
      }

      if (rarityFilter !== "ALL" && c.rarity !== rarityFilter) return false;
      if (elementFilter !== "ALL" && c.element !== elementFilter) return false;
      if (roleFilter !== "ALL" && c.role !== roleFilter) return false;
      if (collectionFilter !== "ALL" && c.collection_id !== collectionFilter) return false;

      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [cards, searchQuery, rarityFilter, elementFilter, roleFilter, collectionFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredCards.length / pageSize) || 1;
  const paginatedCards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCards.slice(start, start + pageSize);
  }, [filteredCards, page, pageSize]);

  // Handlers
  const handleSaveCard = async (cardData) => {
    await adminController.saveCard(cardData);
    onRefresh();
  };

  const handleDeleteCard = async (cardId, cardName) => {
    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a carta ${cardName}?`)) {
      try {
        await adminController.deleteCard(cardId);
        toast({ title: `🗑️ Carta ${cardName} excluída do sistema!` });
        queryClient.invalidateQueries();
        onRefresh();
      } catch (err) {
        toast({ title: "Erro ao excluir carta", description: err.message, variant: "destructive" });
      }
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setRarityFilter("ALL");
    setElementFilter("ALL");
    setRoleFilter("ALL");
    setCollectionFilter("ALL");
    setSortField("name");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="font-heading text-lg font-bold">GERENCIADOR DE CARTAS DO ACERVO</h1>
          <p className="text-xs font-mono text-muted-foreground">
            Exibindo {filteredCards.length} de {cards.length} cartas registradas no banco local.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBatchImporting(true)}
            className="flex items-center gap-2 px-3 py-2 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-heading font-bold text-xs rounded transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> IMPORTAR LOTE (JSON)
          </button>
          <button
            onClick={() => setIsCreatingCard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-xs rounded transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)]"
          >
            <Plus className="w-4 h-4" /> NOVA CARTA
          </button>
        </div>
      </div>

      {/* ─── PAINEL DE FILTROS E BUSCA AVANÇADA ─── */}
      <div className="p-4 border border-border/40 bg-card/40 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-heading font-bold text-primary flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> FILTROS DE BUSCA E ORDENAÇÃO
          </span>
          <button onClick={resetFilters} className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline">
            LIMPAR FILTROS
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {/* Busca por texto */}
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Buscar por nome, id ou lore..."
              className="pl-8 text-xs font-mono bg-muted/20 border-border/40 h-8"
            />
          </div>

          {/* Filtro por Raridade */}
          <Select value={rarityFilter} onValueChange={v => { setRarityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/20 border-border/40"><SelectValue placeholder="Raridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Raridades</SelectItem>
              {NEW_RARITY_ORDER.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Filtro por Elemento */}
          <Select value={elementFilter} onValueChange={v => { setElementFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/20 border-border/40"><SelectValue placeholder="Elemento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos Elementos</SelectItem>
              {ELEMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Filtro por Função (Role) */}
          <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/20 border-border/40"><SelectValue placeholder="Função (Role)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Funções</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Filtro por Coleção */}
          <Select value={collectionFilter} onValueChange={v => { setCollectionFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/20 border-border/40 truncate"><SelectValue placeholder="Coleção" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Coleções</SelectItem>
              {collections.map(c => <SelectItem key={c.id || c.code} value={c.code}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Linha de Ordenação */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground pt-1 border-t border-border/20 gap-2">
          <div className="flex items-center gap-2">
            <span>Ordenar por:</span>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value)}
              className="bg-muted/30 border border-border/40 rounded text-xs px-2 py-1 text-foreground"
            >
              <option value="name">Nome (A-Z)</option>
              <option value="attack font-mono">ATK (Ataque)</option>
              <option value="defense">DEF (Defesa)</option>
              <option value="hp">HP (Vida)</option>
              <option value="speed">SPD (Velocidade)</option>
              <option value="rarity">Raridade</option>
            </select>
            <button
              onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
              className="p-1 border border-border/40 rounded hover:bg-muted/20 text-xs"
            >
              {sortOrder === "asc" ? "⬆ Carga Asc" : "⬇ Carga Desc"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>Por Página:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-muted/30 border border-border/40 rounded text-xs px-2 py-1 text-foreground"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── GRID / LISTA DE CARTAS ─── */}
      {paginatedCards.length === 0 ? (
        <div className="p-10 border border-border/40 bg-card/40 rounded text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400/50 mx-auto" />
          <p className="font-heading text-sm text-muted-foreground">Nenhuma carta corresponde aos filtros selecionados.</p>
          <button onClick={resetFilters} className="text-xs text-primary underline">Limpar Filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedCards.map(card => (
            <div
              key={card.id || card.card_id}
              className="p-3 border border-border/30 bg-card/50 hover:border-primary/40 rounded-xl transition-all flex flex-col justify-between gap-3 relative group"
            >
              <div className="flex items-start gap-3">
                {card.image_url || card.img_oficial ? (
                  <img
                    src={card.image_url || card.img_oficial}
                    alt={card.name}
                    className="w-14 h-20 object-cover rounded border border-border/40 bg-muted/20 shrink-0 shadow"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-14 h-20 rounded bg-destructive/10 border border-destructive/30 flex items-center justify-center text-[9px] font-bold text-destructive shrink-0">
                    SEM IMG
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-heading font-black text-xs text-foreground truncate">{card.name}</h3>
                    <RarityBadge rarity={card.rarity} />
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate">
                    {card.card_id || "SEM-ID"} · <span className="text-primary">{card.collection_id || "MULTIVERSE"}</span>
                  </div>

                  {/* Badges de Atributos Principais */}
                  <div className="flex flex-wrap gap-1 text-[9px] font-mono pt-1">
                    <span className="text-red-400 font-bold">ATK:{card.attack || 100}</span>
                    <span className="text-blue-400 font-bold">DEF:{card.defense || 100}</span>
                    <span className="text-green-400 font-bold">HP:{card.hp || 400}</span>
                    <span className="text-yellow-400 font-bold">SPD:{card.speed || 100}</span>
                  </div>

                  {/* Badges de Classificação do Prompt Mestre */}
                  <div className="flex flex-wrap gap-1 text-[9px] font-mono text-muted-foreground pt-1">
                    {card.personality && <span className="px-1 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">{card.personality}</span>}
                    {card.character_class && <span className="px-1 py-0.2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">{card.character_class}</span>}
                    {card.power_type && <span className="px-1 py-0.2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">{card.power_type}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/20">
                <button
                  onClick={() => setEditingCard(card)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-heading text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> EDITAR
                </button>
                <button
                  onClick={() => handleDeleteCard(card.id, card.name)}
                  className="p-1 text-destructive hover:bg-destructive/10 rounded border border-destructive/20 text-xs"
                  title="Excluir Carta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CONTROLES DE PAGINAÇÃO ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/30 font-mono text-xs">
          <span className="text-muted-foreground">Página {page} de {totalPages} ({filteredCards.length} cartas)</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 border border-border/40 rounded hover:bg-muted/20 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-primary">{page}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 border border-border/40 rounded hover:bg-muted/20 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modais de Edição e Importação */}
      {(isCreatingCard || editingCard) && (
        <CardEditorModal
          card={editingCard}
          collections={collections}
          onClose={() => { setIsCreatingCard(false); setEditingCard(null); }}
          onSave={handleSaveCard}
        />
      )}

      {isBatchImporting && (
        <BatchImportModal
          onClose={() => setIsBatchImporting(false)}
          onImportDone={() => { onRefresh(); setIsBatchImporting(false); }}
        />
      )}
    </div>
  );
}

/* ─── ABA DE FILA DE TAREFAS & SYNC AGENT ─── */
function SyncQueueTab({ summary, onRefresh }) {
  const [syncState, setSyncState] = useState({
    isSyncing: false, currentTask: "", progress: 0, online: true
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsub = backgroundSyncService.subscribe(setSyncState);
    return unsub;
  }, []);

  const handleTriggerSync = () => {
    backgroundSyncService.startBackgroundSync("ADMIN_MANUAL");
    toast({ title: "🚀 Sincronização em segundo plano iniciada!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="font-heading text-lg font-bold">FILA DE TAREFAS (JOB QUEUE) & SYNC AGENT</h1>
          <p className="text-xs font-mono text-muted-foreground">Monitoramento autônomo de sincronização e processamento assíncrono.</p>
        </div>
        <button
          onClick={handleTriggerSync}
          disabled={syncState.isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold text-xs rounded transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? "animate-spin" : ""}`} />
          {syncState.isSyncing ? "SINCRONIZANDO..." : "EXECUTAR SYNC AGENT MANUAL"}
        </button>
      </div>

      {/* Card de Status do Sync Agent */}
      <div className="p-4 border border-primary/40 bg-card/60 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-heading font-bold text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4" /> ENGINE DE SINCRONIZAÇÃO EM SEGUNDO PLANO
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${syncState.online ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-amber-400 bg-amber-500/10 border-amber-500/30"}`}>
            {syncState.online ? "ONLINE (CONECTADO)" : "OFFLINE"}
          </span>
        </div>

        {syncState.isSyncing ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-foreground">
              <span>{syncState.currentTask || "Processando dados..."}</span>
              <span className="text-primary font-bold">{syncState.progress}%</span>
            </div>
            <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${syncState.progress}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs font-mono text-muted-foreground">
            O Sync Agent está em repouso. Ele executa autonomamente no boot e periodicamente para manter lore e coleções atualizadas.
          </p>
        )}
      </div>

      {/* Fila de Jobs */}
      <div className="p-4 border border-border/40 bg-card/40 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-heading font-bold text-foreground">HISTÓRICO E FILA DE JOBS LOCAIS</span>
          <button
            onClick={() => { adminController.clearJobQueueHistory(); onRefresh(); }}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline"
          >
            LIMPAR HISTÓRICO
          </button>
        </div>

        <div className="space-y-2">
          {summary?.queue?.activeJobs?.length === 0 ? (
            <p className="text-xs font-mono text-muted-foreground">Nenhuma tarefa pendente na fila.</p>
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
  );
}

/* ─── COMPONENTE PRINCIPAL ADMIN ─── */
export default function Admin() {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(user?.role === "admin"));
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (user?.role === "admin") {
      setIsAuthenticated(true);
    }
  }, [user]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (user?.role === "admin" || adminController.verifyAdminKey(password)) {
      setIsAuthenticated(true);
      toast({
        title: "⚡ ADMIN CONSOLE UNLOCKED",
        description: "Autenticação aprovada."
      });
    } else {
      toast({
        title: "❌ ACESSO NEGADO",
        description: "Usuário sem perfil de administrador.",
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
              placeholder="Chave de Acesso Admin"
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
            placeholder="Buscar seção..."
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
                <div className="text-2xl font-mono font-bold text-foreground">{summary?.stats?.totalCards || cards.length}</div>
                <span className="text-[10px] font-mono text-emerald-400">Em {summary?.stats?.totalCollections || collections.length} coleções</span>
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
                    const res = await adminController.seedAcervo62();
                    toast({ title: `🌱 Semente Concluída! ${res.seededCount} coleções garantidas.` });
                    refetchCollections();
                    refetchSummary();
                  }}
                  className="p-3 border border-border/40 hover:border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-950/40 rounded text-left space-y-1 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-heading font-bold text-cyan-400">
                    <Database className="w-4 h-4" /> SEMENTE ACERVO (62)
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">Popula o acervo completo com os 62 universos canônicos.</p>
                </button>

                <button
                  onClick={async () => {
                    const res = await adminController.mergeDuplicateCollections();
                    toast({ title: `🔀 Fusão Concluída! ${res.mergedCount} duplicatas unificadas.` });
                    refetchCollections();
                    refetchCards();
                    refetchSummary();
                  }}
                  className="p-3 border border-border/40 hover:border-purple-500/50 bg-purple-950/20 hover:bg-purple-950/40 rounded text-left space-y-1 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-heading font-bold text-purple-400">
                    <Layers className="w-4 h-4" /> FUNDIR COLEÇÕES DUPLICADAS
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">Consolida universos repetidos por nome ou idioma.</p>
                </button>

                <button
                  onClick={async () => {
                    const res = await adminController.reclassifyCards();
                    toast({ title: `🏷️ Reclassificação Concluída! ${res.reclassifiedCount} cartas reclassificadas.` });
                    refetchCards();
                    refetchSummary();
                  }}
                  className="p-3 border border-border/40 hover:border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/40 rounded text-left space-y-1 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-heading font-bold text-amber-400">
                    <CheckCircle2 className="w-4 h-4" /> RECLASSIFICAR
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">Padroniza códigos de raridade, elementos e chefes.</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gerenciador de Cartas com Filtros e Edição */}
        {activeTab === "cards" && (
          <CardsManagerTab
            cards={cards}
            collections={collections}
            onRefresh={() => { refetchCards(); refetchSummary(); }}
          />
        )}

        {/* Bosses Tab */}
        {activeTab === "bosses" && <BossManagerTab />}

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
          <SyncQueueTab summary={summary} onRefresh={refetchSummary} />
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

        {/* Schemas & Validação Tab */}
        {activeTab === "schemas" && <SchemaRegistryPanel />}

        {/* Media Manager Tab */}
        {activeTab === "media" && <AdminMediaManager />}

        {/* Data Quality Center Tab */}
        {activeTab === "quality" && <DataQualityCenter />}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <h1 className="font-heading text-lg font-bold font-mono">COLEÇÕES DO MULTIVERSO ({collections.length})</h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {collections.map(c => (
                <div key={c.id || c.code} className="p-3 border border-border/30 bg-card/40 hover:border-primary/40 rounded flex items-center justify-between gap-3 group transition-all">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded bg-primary/20 border border-primary/40 flex items-center justify-center font-bold font-mono text-primary text-xs shrink-0">
                      {c.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-heading font-bold text-xs text-foreground truncate">{c.name}</div>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{c.description || "Sem descrição"}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(`Tem certeza que deseja excluir a coleção "${c.name}" (${c.code})?`)) {
                        await adminController.deleteCollection(c.code || c.id);
                        toast({ title: `Coleção "${c.name}" excluída com sucesso!` });
                        refetchCollections();
                        refetchCards();
                        refetchSummary();
                      }
                    }}
                    title="Excluir Coleção"
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded border border-destructive/20 text-xs shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
