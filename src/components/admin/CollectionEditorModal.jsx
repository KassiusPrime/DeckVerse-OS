import React, { useState } from "react";
import { motion } from "framer-motion";
import { Layers, X, Save, AlertCircle } from "lucide-react";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Anime/Mangá", "Games", "Quadrinhos/Herois", "Séries/Cinema", "Mitologia/História", "Ficção/Original"];

export function CollectionEditorModal({ collection, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id: collection?.id || "",
    name: collection?.name || "",
    code: collection?.code || "",
    category: collection?.category || "Anime/Mangá",
    description: collection?.description || ""
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
      await onSave({
        ...formData,
        code: formData.code.toUpperCase().trim()
      });
      toast({ title: "✨ Coleção salva com sucesso!" });
      onClose();
    } catch (err) {
      if (err.isCollision) {
        toast({
          title: "❌ Código de coleção já existente",
          description: err.message || "Este código já pertence a outra coleção cadastrada.",
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
              {formData.id ? `EDITAR COLEÇÃO: ${formData.code}` : "CRIAR NOVA COLEÇÃO"}
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
              placeholder="Ex: Demon Slayer: Kimetsu no Yaiba"
              className="font-body text-xs bg-muted/20 border-border/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-heading text-muted-foreground">CÓDIGO CANÔNICO (CÓDIGO DA COLEÇÃO)</label>
              <Input
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ex: COL-01-DS"
                className="font-mono text-xs bg-muted/20 border-border/50"
                required
                disabled={Boolean(formData.id)}
              />
              <span className="text-[9px] font-mono text-muted-foreground">Ex: COL-01-DS, COL-02-GOW</span>
            </div>

            <div>
              <label className="text-[10px] font-heading text-muted-foreground">CATEGORIA / GÊNERO</label>
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-muted/20 border-border/50 font-body text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-heading text-muted-foreground">DESCRIÇÃO DA COLEÇÃO / UNIVERSO</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Resumo do universo, era, e contextualização multiversal..."
              className="font-body text-xs bg-muted/20 border-border/50 h-24 resize-none"
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
              <Save className="w-3.5 h-3.5" /> {saving ? "SALVANDO..." : "SALVAR COLEÇÃO"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
