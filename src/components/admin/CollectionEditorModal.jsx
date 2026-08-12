import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layers, X, Save, AlertCircle, Wand2, Lock } from "lucide-react";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/hooks/use-toast";
import { collectionRegistryService } from "../../../services/registry/collectionRegistryService";

const CATEGORIES = [
  "COL-01 Anime/Mangá",
  "COL-02 Games",
  "COL-03 Quadrinhos/Herois",
  "COL-04 Séries/Cinema",
  "COL-05 Mitologia/História",
  "COL-06 Ficção/Original"
];

export function CollectionEditorModal({ collection, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id: collection?.id || "",
    name: collection?.name || "",
    code: collection?.code || "",
    category: collection?.category || collection?.bank || "COL-01 Anime/Mangá",
    description: collection?.description || "",
    aliases: Array.isArray(collection?.aliases)
      ? collection.aliases.join(", ")
      : collection?.aliases || ""
  });

  const [codeLock, setCodeLock] = useState({ isLocked: false, reason: "" });
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function checkLock() {
      if (formData.id || formData.code) {
        const check = await collectionRegistryService.canEditCanonicalCode(formData.code || formData.id);
        if (!check.allowed) {
          setCodeLock({ isLocked: true, reason: check.reason });
        } else {
          setCodeLock({ isLocked: false, reason: "" });
        }
      }
    }
    checkLock();
  }, [formData.id, formData.code]);

  const handleSuggestCode = async () => {
    if (!formData.name.trim()) {
      toast({ title: "⚠️ Digite o nome da coleção primeiro para sugerir o código", variant: "destructive" });
      return;
    }
    setSuggesting(true);
    try {
      const suggested = await collectionRegistryService.suggestCollectionCode(formData.name, formData.category);
      setFormData(prev => ({ ...prev, code: suggested }));
      toast({ title: "✨ Código sugerido!", description: `Código gerado: ${suggested}` });
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "❌ Nome da coleção é obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.code.trim()) {
      toast({ title: "❌ Código da coleção é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const parsedAliases = formData.aliases
        ? formData.aliases.split(",").map(a => a.trim().toUpperCase()).filter(Boolean)
        : [];

      await onSave({
        ...formData,
        code: formData.code.toUpperCase().trim(),
        aliases: parsedAliases
      });
      toast({ title: "✨ Coleção salva com sucesso!" });
      onClose();
    } catch (err) {
      if (err.isCollision) {
        toast({
          title: "❌ Colisão de Código/Alias de Coleção",
          description: err.message || "Este código ou alias já pertence a outra coleção cadastrada.",
          variant: "destructive"
        });
      } else {
        toast({ title: "❌ Erro ao salvar coleção", description: err.message, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-primary/40 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-base tracking-wider text-foreground">
              {formData.id ? `EDITAR COLEÇÃO: ${formData.code}` : "NOVA COLEÇÃO (Phase 3 Dynamic Registry)"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[10px] font-heading text-muted-foreground">NOME DA COLEÇÃO / UNIVERSO</label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Dandadan"
              className="font-body text-xs bg-muted/20 border-border/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-heading text-muted-foreground">CÓDIGO CANÔNICO</label>
                {!formData.id && (
                  <button
                    type="button"
                    onClick={handleSuggestCode}
                    disabled={suggesting}
                    className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30"
                  >
                    <Wand2 className="w-2.5 h-2.5" /> Sugerir Código
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: COL-01-DAN"
                  className="font-mono text-xs bg-muted/20 border-border/50"
                  required
                  disabled={codeLock.isLocked}
                />
                {codeLock.isLocked && (
                  <Lock className="w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-2.5" />
                )}
              </div>
              {codeLock.isLocked ? (
                <span className="text-[9px] font-mono text-amber-400/90 block mt-0.5">{codeLock.reason}</span>
              ) : (
                <span className="text-[9px] font-mono text-muted-foreground">Ex: COL-01-DAN, COL-02-CP77</span>
              )}
            </div>

            <div>
              <label className="text-[10px] font-heading text-muted-foreground">BANCO / CATEGORIA</label>
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-heading text-muted-foreground">ALIASES ADICIONAIS (Separados por vírgula)</label>
            <Input
              value={formData.aliases}
              onChange={e => setFormData({ ...formData, aliases: e.target.value })}
              placeholder="Ex: DAN, DANDADAN_MANGA"
              className="font-mono text-xs bg-muted/20 border-border/50"
            />
            <span className="text-[9px] font-mono text-muted-foreground">Aliases curtos para reconhecer mídias e buscas</span>
          </div>

          <div>
            <label className="text-[10px] font-heading text-muted-foreground">DESCRIÇÃO DA COLEÇÃO / UNIVERSO</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Resumo do universo, autor, gênero e contextualização..."
              className="font-body text-xs bg-muted/20 border-border/50 h-20 resize-none"
            />
          </div>

          <div className="p-2.5 bg-muted/20 border border-border/30 rounded font-mono text-[10px] text-muted-foreground space-y-1">
            <div className="font-bold text-cyan-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Padrão de Mídia da Coleção:
            </div>
            <div>Capa da Coleção: <code className="text-emerald-400">{formData.code || "COL-CODE"}__collection__cover.ext</code></div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-heading border border-border/50 rounded">CANCELAR</button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(0,240,255,0.3)] flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? "SALVANDO..." : "CONFIRMAR COLEÇÃO"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
