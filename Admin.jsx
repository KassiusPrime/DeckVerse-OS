import { db } from "@/base44Client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Upload, Database, Scroll, Swords, ChevronRight,
  Plus, Save, Trash2, Eye, EyeOff, Pencil, X, Check
} from "lucide-react";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/use-toast";
import { RARITY_ORDER, ELEMENTS, ROLES } from "@/constants";
import TagInput from "@/TagInput";

const NAV = [
  { key: "cards",       label: "CARD EDITOR",    icon: Upload },
  { key: "collections", label: "COLLECTIONS",    icon: Database },
  { key: "players",     label: "PLAYER OPS",     icon: Shield },
  { key: "changelog",   label: "CHANGELOG",      icon: Scroll },
  { key: "battles",     label: "LOG BATTLE",     icon: Swords },
];

const NEW_RARITY_ORDER = ["C","UC","R","SR","SSR","UR","LR","MR","BOSS","ANOMALIA"];

const EMPTY_CARD = {
  name: "", card_id: "", collection_id: "", rarity: "C", role: "DPS",
  element: "", gender: "Unknown",
  attack: "", defense: "", speed: "", hp: "", mag: "",
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
        <div className="relative border border-border/40 overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: 160 }}>
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

/* ─── Skill row editor ─── */
function SkillsEditor({ skills, onChange }) {
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
          className="flex items-center gap-1 text-[10px] font-heading text-primary hover:text-primary/80 border border-primary/30 px-2 py-0.5"
        >
          <Plus className="w-2.5 h-2.5" /> ADD SKILL
        </button>
      </div>
      {skills.map((sk, i) => (
        <div key={i} className="border border-border/30 bg-muted/10 p-3 space-y-2 relative">
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
            className="font-body bg-muted/20 border-border/50 text-xs h-16 resize-none"
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Inline card edit row with quick image paste ─── */
function CardRow({ card, onDelete, onEdit, onQuickSaveImage }) {
  const currentImg = card.img_custom || card.img_oficial || card.image_url || "";
  const [quickImg, setQuickImg] = useState(currentImg);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if card updates
  React.useEffect(() => {
    setQuickImg(card.img_custom || card.img_oficial || card.image_url || "");
  }, [card.img_custom, card.img_oficial, card.image_url]);

  const handleQuickSave = async () => {
    setIsSaving(true);
    await onQuickSaveImage(card.id, quickImg);
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 hover:bg-muted/10 group gap-3 border-b border-border/10">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {currentImg ? (
          <img src={currentImg} alt={card.name} className="w-10 h-12 object-cover border border-border/30 rounded shrink-0 bg-muted/30" />
        ) : (
          <div className="w-10 h-12 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/30 rounded shrink-0 text-center">
            <span className="text-[8px] font-heading font-bold text-destructive">SEM IMG</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xs font-bold text-foreground">{card.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{card.card_id}</span>
          </div>
          <div className="flex gap-1 mt-1 flex-wrap items-center">
            <span className="text-[9px] font-heading text-primary border border-primary/30 px-1 rounded">{card.rarity}</span>
            <span className="text-[9px] font-heading text-muted-foreground border border-border/30 px-1 rounded">{card.role}</span>
            {card.series && <span className="text-[9px] font-body text-muted-foreground/60">· {card.series}</span>}
          </div>
        </div>
      </div>

      {/* Quick Image Input & Actions */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Input
          value={quickImg}
          onChange={e => setQuickImg(e.target.value)}
          placeholder="URL da Imagem..."
          className="font-mono text-[11px] h-8 w-full sm:w-60 bg-muted/20 border-border/40 focus:border-primary"
        />
        <button
          onClick={handleQuickSave}
          disabled={isSaving}
          title="Salvar Imagem Rápidamente"
          className="h-8 px-2.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/40 rounded text-[10px] font-heading font-bold tracking-wider transition-colors shrink-0 flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          {isSaving ? "..." : "SALVAR"}
        </button>
        <button
          onClick={() => onEdit(card)}
          title="Editar Dados Completos"
          className="p-2 text-muted-foreground/60 hover:text-primary transition-colors border border-border/30 rounded shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(card.id)}
          title="Excluir Carta"
          className="p-2 text-destructive/50 hover:text-destructive transition-colors border border-destructive/20 rounded shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function CardEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_CARD });
  const [skills, setSkills] = useState([]);
  const [tags, setTags] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [imgStatusFilter, setImgStatusFilter] = useState("all");

  const { data: cards = [] } = useQuery({
    queryKey: ["admin-cards"],
    queryFn: () => db.entities.Card.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Card.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cards"] });
      toast({ title: "✅ Card criado com sucesso!" });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Card.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cards"] });
      toast({ title: "✅ Card atualizado!" });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Card.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cards"] }),
  });

  const handleQuickSaveImage = async (id, newUrl) => {
    await db.entities.Card.update(id, { image_url: newUrl, img_oficial: newUrl });
    qc.invalidateQueries({ queryKey: ["admin-cards"] });
    toast({ title: "✅ Imagem salva com sucesso!" });
  };

  const resetForm = () => {
    setForm({ ...EMPTY_CARD });
    setSkills([]);
    setTags([]);
    setEditingId(null);
  };

  const loadForEdit = (card) => {
    setForm({
      name: card.name || "",
      card_id: card.card_id || "",
      collection_id: card.collection_id || card.series || "",
      rarity: card.rarity || "C",
      role: card.role || "DPS",
      element: card.element || "",
      gender: card.gender || "Unknown",
      attack: card.attack ?? "",
      defense: card.defense ?? "",
      speed: card.speed ?? "",
      hp: card.hp ?? "",
      mag: card.mag ?? "",
      img_oficial: card.img_oficial || card.image_url || "",
      img_custom: card.img_custom || "",
      lore: card.lore || "",
      version: card.version || "Classic",
      evolution_stage: card.evolution_stage || 1,
      is_boss: card.is_boss || false,
    });
    setSkills(card.skills || []);
    setTags(card.tags || []);
    setEditingId(card.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });
  const sel = (k) => ({ value: form[k], onValueChange: (v) => setForm(p => ({ ...p, [k]: v })) });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      attack: Number(form.attack) || 0,
      defense: Number(form.defense) || 0,
      speed: Number(form.speed) || 0,
      hp: Number(form.hp) || 0,
      mag: Number(form.mag) || 0,
      evolution_stage: Number(form.evolution_stage) || 1,
      skills,
      tags,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredCards = cards.filter(c => {
    const matchesSearch = !searchFilter ||
      c.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.card_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.series?.toLowerCase().includes(searchFilter.toLowerCase());
    const hasImg = !!(c.img_custom || c.img_oficial || c.image_url);
    if (imgStatusFilter === "missing") return matchesSearch && !hasImg;
    if (imgStatusFilter === "has_image") return matchesSearch && hasImg;
    return matchesSearch;
  });

  const missingImgCount = cards.filter(c => !(c.img_custom || c.img_oficial || c.image_url)).length;
  const hasImgCount = cards.length - missingImgCount;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Form header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
          — {editingId ? "✏️ Editando Card" : "➕ Nova Carta"}
        </h2>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-1 text-[10px] font-heading text-muted-foreground hover:text-foreground border border-border/40 px-2 py-1"
          >
            <X className="w-3 h-3" /> CANCELAR EDIÇÃO
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border border-border/40 p-5 space-y-5">

        {/* — Basic info — */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">CARD NAME *</label>
            <Input {...f("name")} placeholder="e.g. Itachi Uchiha" className="font-body bg-muted/20 border-border/50" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">SMART CID * <span className="text-muted-foreground/50 normal-case font-body">(ORIG-TIPO-RAR-NUM)</span></label>
            <Input {...f("card_id")} placeholder="e.g. NAR-CHR-UR-005" className="font-mono bg-muted/20 border-border/50" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">ID COLEÇÃO <span className="text-muted-foreground/50 font-body normal-case">(ex: NAR, MVC, AOT)</span></label>
            <Input {...f("collection_id")} placeholder="NAR" className="font-mono bg-muted/20 border-border/50" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">VERSION</label>
            <Input {...f("version")} placeholder="Classic / Summer Alt..." className="font-body bg-muted/20 border-border/50" />
          </div>
        </div>

        {/* — Classification — */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">RARIDADE *</label>
            <Select {...sel("rarity")}>
              <SelectTrigger className="bg-muted/20 border-border/50 font-body text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NEW_RARITY_ORDER.map(r => <SelectItem key={r} value={r}>[{r}]</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">ROLE *</label>
            <Select {...sel("role")}>
              <SelectTrigger className="bg-muted/20 border-border/50 font-body text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">ELEMENT</label>
            <Select value={form.element || "none"} onValueChange={(v) => setForm(p => ({ ...p, element: v === "none" ? "" : v }))}>
              <SelectTrigger className="bg-muted/20 border-border/50 font-body text-sm"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {ELEMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">GENDER</label>
            <Select {...sel("gender")}>
              <SelectTrigger className="bg-muted/20 border-border/50 font-body text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Male","Female","Unknown","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* — Stats — */}
        <div className="grid grid-cols-5 gap-3">
          {[["attack","ATK"],["defense","DEF"],["speed","SPD"],["hp","HP"],["mag","MAG"]].map(([k, label]) => (
            <div key={k} className="space-y-1">
              <label className="text-[10px] font-heading tracking-widest text-muted-foreground">{label}</label>
              <Input {...f(k)} type="number" min="0" placeholder="0" className="font-mono bg-muted/20 border-border/50" />
            </div>
          ))}
        </div>

        {/* — Evolution — */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">EVOLUTION STAGE</label>
            <Select
              value={String(form.evolution_stage)}
              onValueChange={(v) => setForm(p => ({ ...p, evolution_stage: Number(v) }))}
            >
              <SelectTrigger className="bg-muted/20 border-border/50 font-body text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3].map(n => <SelectItem key={n} value={String(n)}>Stage {n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* — Boss toggle — */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, is_boss: !p.is_boss }))}
            className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-heading font-bold tracking-widest transition-all ${
              form.is_boss
                ? "border-sky-400/60 bg-sky-400/10 text-sky-300"
                : "border-border/40 text-muted-foreground hover:border-border"
            }`}
          >
            {form.is_boss ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {form.is_boss ? "☆ DIVINE BOSS" : "BOSS CARD?"}
          </button>
          <span className="text-[10px] font-body text-muted-foreground/60">
            Marca a carta como chefe Divine invocável apenas pelo Pack Divine
          </span>
        </div>

        {/* — Tags (Sinergia) — */}
        <div className="space-y-1">
          <label className="text-[10px] font-heading tracking-widest text-muted-foreground">TAGS DE SINERGIA</label>
          <p className="text-[10px] font-body text-muted-foreground/50 mb-1">Tags que ativam bônus de sinergia no Synergy Builder (ex: Uchihas, Vingadores)</p>
          <TagInput value={tags} onChange={setTags} />
        </div>

        {/* — Imagens — */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageField
            value={form.img_oficial}
            onChange={(e) => setForm(p => ({ ...p, img_oficial: e.target.value }))}
            label="IMG OFICIAL (URL padrão)"
          />
          <div className="space-y-1">
            <ImageField
              value={form.img_custom}
              onChange={(e) => setForm(p => ({ ...p, img_custom: e.target.value }))}
              label="IMG CUSTOM / SKIN (sobrepõe oficial)"
            />
            <p className="text-[10px] font-body text-muted-foreground/50">Para ANOMALIAs ou skins customizadas. Esta imagem tem prioridade na exibição.</p>
          </div>
        </div>

        {/* — Lore — */}
        <div className="space-y-1">
          <label className="text-[10px] font-heading tracking-widest text-muted-foreground">LORE / BACKSTORY</label>
          <Textarea
            {...f("lore")}
            placeholder="Historia do personagem, flavor text..."
            className="font-body bg-muted/20 border-border/50 text-sm h-24 resize-none"
          />
        </div>

        {/* — Skills — */}
        <SkillsEditor skills={skills} onChange={setSkills} />

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {editingId ? <Pencil className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {isPending ? "SALVANDO..." : editingId ? "ATUALIZAR CARD" : "SALVAR CARD"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2.5 border border-border/40 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">
              CANCELAR
            </button>
          )}
        </div>
      </form>

      {/* Card list header & filter controls */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
            <span>— CARTAS EXISTENTES ({filteredCards.length}/{cards.length})</span>
          </h2>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Buscar por nome, ID ou coleção..."
              className="w-full sm:w-60 h-8 text-xs font-body bg-muted/20 border-border/50"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setImgStatusFilter("all")}
            className={`px-3 py-1 font-heading text-[11px] font-bold rounded border transition-colors ${imgStatusFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border/40 hover:text-foreground"}`}
          >
            Todas ({cards.length})
          </button>
          <button
            type="button"
            onClick={() => setImgStatusFilter("missing")}
            className={`px-3 py-1 font-heading text-[11px] font-bold rounded border transition-colors flex items-center gap-1.5 ${imgStatusFilter === "missing" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"}`}
          >
            ⚠️ Sem Imagem ({missingImgCount})
          </button>
          <button
            type="button"
            onClick={() => setImgStatusFilter("has_image")}
            className={`px-3 py-1 font-heading text-[11px] font-bold rounded border transition-colors flex items-center gap-1.5 ${imgStatusFilter === "has_image" ? "bg-emerald-600 text-white border-emerald-500" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"}`}
          >
            🖼️ Com Imagem ({hasImgCount})
          </button>
        </div>
      </div>

      <div className="border border-border/40 divide-y divide-border/20 max-h-[500px] overflow-y-auto rounded-lg bg-card/40">
        {filteredCards.length === 0 && (
          <div className="px-4 py-8 text-center text-xs font-body text-muted-foreground">
            {cards.length === 0 ? "Nenhuma carta cadastrada ainda." : "> ERRO_404: Nenhuma carta encontrada com este filtro."}
          </div>
        )}
        {filteredCards.map(card => (
          <CardRow
            key={card.id}
            card={card}
            onDelete={deleteMutation.mutate}
            onEdit={loadForEdit}
            onQuickSaveImage={handleQuickSaveImage}
          />
        ))}
      </div>
    </div>
  );
}

function CollectionRowItem({ col, loadForEdit, onDelete, onQuickSaveImage }) {
  const [quickImg, setQuickImg] = useState(col.image_url || "");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setQuickImg(col.image_url || "");
  }, [col.image_url]);

  const handleSave = async () => {
    setIsSaving(true);
    await onQuickSaveImage(col.id, quickImg);
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 hover:bg-muted/10 group gap-3 border-b border-border/10">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {col.image_url ? (
          <img src={col.image_url} alt={col.name} className="w-12 h-8 object-cover border border-border/30 rounded shrink-0 bg-muted/30" />
        ) : (
          <div className="w-12 h-8 flex items-center justify-center bg-destructive/10 border border-destructive/30 rounded shrink-0 text-center">
            <span className="text-[8px] font-heading font-bold text-destructive">SEM IMG</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-primary font-bold">{col.code}</span>
            <span className="font-body text-xs font-semibold text-foreground">{col.name}</span>
          </div>
          {col.description && (
            <p className="text-[10px] font-body text-muted-foreground/60 truncate mt-0.5">{col.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Input
          value={quickImg}
          onChange={e => setQuickImg(e.target.value)}
          placeholder="URL da Imagem..."
          className="font-mono text-[11px] h-8 w-full sm:w-60 bg-muted/20 border-border/40 focus:border-primary"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          title="Salvar Imagem Rápidamente"
          className="h-8 px-2.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/40 rounded text-[10px] font-heading font-bold tracking-wider transition-colors shrink-0 flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          {isSaving ? "..." : "SALVAR"}
        </button>
        <button
          onClick={() => loadForEdit(col)}
          title="Editar Coleção"
          className="p-2 text-muted-foreground/60 hover:text-primary transition-colors border border-border/30 rounded shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(col.id)}
          title="Excluir Coleção"
          className="p-2 text-destructive/50 hover:text-destructive transition-colors border border-destructive/20 rounded shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function CollectionEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: collections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => db.entities.Collection.list(),
  });
  const [form, setForm] = useState({ code: "", name: "", description: "", image_url: "" });
  const [editingId, setEditingId] = useState(null);
  const [colSearch, setColSearch] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Collection.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      toast({ title: "✅ Coleção criada!" });
      setForm({ code: "", name: "", description: "", image_url: "" });
      setEditingId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Collection.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      toast({ title: "✅ Coleção atualizada!" });
      setForm({ code: "", name: "", description: "", image_url: "" });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Collection.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collections"] }),
  });

  const handleQuickSaveImage = async (id, newUrl) => {
    await db.entities.Collection.update(id, { image_url: newUrl });
    qc.invalidateQueries({ queryKey: ["admin-collections"] });
    toast({ title: "✅ Imagem da coleção salva!" });
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

  const loadForEdit = (col) => {
    setForm({ code: col.code, name: col.name, description: col.description || "", image_url: col.image_url || "" });
    setEditingId(col.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredCols = collections.filter(c =>
    !colSearch ||
    c.name?.toLowerCase().includes(colSearch.toLowerCase()) ||
    c.code?.toLowerCase().includes(colSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
          — {editingId ? "✏️ Editando Coleção" : "➕ Nova Coleção"}
        </h2>
        {editingId && (
          <button
            type="button"
            onClick={() => { setForm({ code: "", name: "", description: "", image_url: "" }); setEditingId(null); }}
            className="flex items-center gap-1 text-[10px] font-heading text-muted-foreground hover:text-foreground border border-border/40 px-2 py-1"
          >
            <X className="w-3 h-3" /> CANCELAR
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="border border-border/40 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">CÓDIGO *</label>
            <Input {...f("code")} placeholder="JJK-0001" className="font-mono bg-muted/20 border-border/50" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-heading tracking-widest text-muted-foreground">NOME *</label>
            <Input {...f("name")} placeholder="Jujutsu Kaisen" className="font-body bg-muted/20 border-border/50" required />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-heading tracking-widest text-muted-foreground">DESCRIÇÃO</label>
          <Textarea {...f("description")} placeholder="Descrição da coleção..." className="font-body bg-muted/20 border-border/50 text-sm h-16 resize-none" />
        </div>
        <ImageField
          value={form.image_url}
          onChange={(e) => setForm(p => ({ ...p, image_url: e.target.value }))}
          label="BACKGROUND IMAGE URL"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {editingId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {editingId ? "ATUALIZAR COLEÇÃO" : "ADICIONAR COLEÇÃO"}
        </button>
      </form>

      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">
          — Coleções ({filteredCols.length}/{collections.length})
        </h2>
        <Input
          value={colSearch}
          onChange={e => setColSearch(e.target.value)}
          placeholder="Buscar coleção..."
          className="w-56 h-8 text-xs font-body bg-muted/20 border-border/50"
        />
      </div>
      <div className="border border-border/40 divide-y divide-border/30 max-h-[450px] overflow-y-auto rounded-lg bg-card/40">
        {filteredCols.length === 0 && (
          <div className="px-4 py-6 text-center text-xs font-body text-muted-foreground">Nenhuma coleção cadastrada.</div>
        )}
        {filteredCols.map(col => (
          <CollectionRowItem
            key={col.id}
            col={col}
            loadForEdit={loadForEdit}
            onDelete={deleteMutation.mutate}
            onQuickSaveImage={handleQuickSaveImage}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerOps() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: players = [] } = useQuery({ queryKey: ["admin-players"], queryFn: () => db.entities.Player.list() });
  const [form, setForm] = useState({ discord_id: "", username: "", gems: 0, gold: 0, level: 1 });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Player.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-players"] }); toast({ title: "Player criado" }); },
  });

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">— Register Player</h2>
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, gems: Number(form.gems), gold: Number(form.gold), level: Number(form.level) }); }} className="border border-border/40 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">DISCORD ID</label><Input {...f("discord_id")} placeholder="123456789" className="font-mono bg-muted/20 border-border/50" required /></div>
          <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">USERNAME</label><Input {...f("username")} placeholder="Vincent" className="font-body bg-muted/20 border-border/50" required /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["gems","gold","level"].map(k => (
            <div key={k} className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">{k.toUpperCase()}</label><Input {...f(k)} type="number" className="font-mono bg-muted/20 border-border/50" /></div>
          ))}
        </div>
        <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? "SAVING..." : "ADD PLAYER"}
        </button>
      </form>
      <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">— Players ({players.length})</h2>
      <div className="border border-border/40 divide-y divide-border/30 max-h-60 overflow-y-auto">
        {players.map(p => (
          <div key={p.id} className="flex items-center gap-4 px-4 py-2.5">
            <span className="font-body text-sm text-foreground flex-1">{p.username}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{p.discord_id}</span>
            <span className="font-heading text-xs text-primary tabular-nums">{p.gems} GEM</span>
            <span className="font-heading text-xs text-amber-400 tabular-nums">{p.gold} GOLD</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangelogEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: logs = [] } = useQuery({ queryKey: ["admin-changelog"], queryFn: () => db.entities.Changelog.list("-created_date", 20) });
  const [form, setForm] = useState({ patch_version: "", notes: "" });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Changelog.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-changelog"] }); toast({ title: "Patch postado" }); setForm({ patch_version: "", notes: "" }); },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">— Post Patch Notes</h2>
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="border border-border/40 p-5 space-y-4">
        <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">VERSÃO</label><Input value={form.patch_version} onChange={(e) => setForm(p => ({ ...p, patch_version: e.target.value }))} placeholder="v1.2.3" className="font-mono bg-muted/20 border-border/50 w-40" required /></div>
        <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">PATCH NOTES</label><Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="- Buffed Hollow Purple scaling&#10;- Nerfed Storm Surge cooldown" className="font-mono bg-muted/20 border-border/50 text-xs h-32 resize-none" required /></div>
        <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {createMutation.isPending ? "POSTANDO..." : "POST PATCH"}
        </button>
      </form>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="border border-border/30 p-3 bg-muted/10">
            <span className="font-mono text-xs text-primary">{log.patch_version}</span>
            <pre className="text-xs font-body text-muted-foreground mt-1 whitespace-pre-wrap">{log.notes}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function BattleLogger() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ winner_username: "", loser_username: "", winner_card: "", loser_card: "", details: "" });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.BattleLog.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["battle-logs"] }); toast({ title: "Battle logged" }); setForm({ winner_username: "", loser_username: "", winner_card: "", loser_card: "", details: "" }); },
  });

  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground">— Log Battle</h2>
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="border border-border/40 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-green-400">WINNER</label><Input {...f("winner_username")} placeholder="Username" className="font-body bg-green-500/5 border-green-500/20" required /></div>
          <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-red-400">LOSER</label><Input {...f("loser_username")} placeholder="Username" className="font-body bg-red-500/5 border-red-500/20" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">WINNER CARD</label><Input {...f("winner_card")} placeholder="Card Name" className="font-body bg-muted/20 border-border/50" /></div>
          <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">LOSER CARD</label><Input {...f("loser_card")} placeholder="Card Name" className="font-body bg-muted/20 border-border/50" /></div>
        </div>
        <div className="space-y-1"><label className="text-[10px] font-heading tracking-widest text-muted-foreground">DETAILS</label><Textarea {...f("details")} placeholder="Vexor used Soul Harvest to eliminate..." className="font-body bg-muted/20 border-border/50 text-sm h-20 resize-none" required /></div>
        <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading text-xs font-bold tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50">
          <Swords className="w-3.5 h-3.5" /> {createMutation.isPending ? "LOGGING..." : "LOG BATTLE"}
        </button>
      </form>
    </div>
  );
}

const PANELS = { cards: CardEditor, collections: CollectionEditor, players: PlayerOps, changelog: ChangelogEditor, battles: BattleLogger };

export default function Admin() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState("cards");

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 border border-destructive/30 bg-destructive/5 p-10">
          <Shield className="w-10 h-10 text-destructive mx-auto" />
          <h1 className="font-heading text-xl font-black text-foreground">ACCESS DENIED</h1>
          <p className="text-sm font-body text-muted-foreground">Admin clearance required.</p>
          <Link to="/" className="flex items-center justify-center gap-1 text-xs font-heading text-primary hover:underline">
            RETURN TO BASE <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  const Panel = PANELS[activePanel];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-border/40 bg-card/30 flex flex-col">
        <div className="px-4 py-5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-heading text-xs font-black tracking-widest text-primary">ADMIN PANEL</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-body text-green-400">DB CONNECTED</span>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setActivePanel(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activePanel === item.key
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-heading text-[10px] font-bold tracking-widest">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-border/40">
          <Link to="/" className="flex items-center gap-1.5 text-[10px] font-heading text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-3 h-3 rotate-180" /> EXIT ADMIN
          </Link>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
          <span className="font-heading text-xs font-bold tracking-widest text-muted-foreground">
            {NAV.find(n => n.key === activePanel)?.label}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/50">@{user.email}</span>
        </div>
        <div className="p-6">
          <motion.div key={activePanel} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
            <Panel />
          </motion.div>
        </div>
      </div>
    </div>
  );
}