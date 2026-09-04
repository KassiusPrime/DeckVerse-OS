import React, { useState } from "react";
import { motion } from "framer-motion";
import { Package, X, Save, AlertCircle } from "lucide-react";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/select";
import { useToast } from "@/hooks/use-toast";
import { normalizeNameKey } from "@/src/utils/deduplication";
import { synopsisLengthStatus } from "@/src/utils/catalogSynopsisPolicy";

export function ItemEditorModal({ item, collections = [], prefilledCollectionCode, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id: item?.id || "",
    name: item?.name || "",
    collection_id: item?.collection_id || prefilledCollectionCode || collections[0]?.code || "COL-00-MULTI",
    type: item?.type || "Relíquia",
    rarity: item?.rarity || "R",
    synopsis: item?.synopsis || "",
    description: item?.description || item?.lore || "",
    image_url: item?.image_url || ""
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const synopsisState = synopsisLengthStatus(formData.synopsis, 'item');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast({ title: "❌ Nome do Item é obrigatório", variant: "destructive" });
    if (!synopsisState.valid) return toast({ title: "❌ Sinopse fora do limite", description: "Itens exigem 200–240 caracteres, contando espaços.", variant: "destructive" });
    setSaving(true);
    try { await onSave(formData); toast({ title: "📦 Item salvo com sucesso!" }); onClose(); }
    catch (err) { toast({ title: err.isCollision ? "❌ Entidade já existente" : "❌ Erro ao salvar Item", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const expectedSlug = normalizeNameKey(formData.name) || "slug";
  const expectedFilename = `${formData.collection_id}__item__${expectedSlug}.{jpg|png|webp}`;

  return <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-purple-500/40 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border/40 pb-3"><div className="flex items-center gap-2"><Package className="w-5 h-5 text-purple-400" /><h2 className="font-heading font-bold text-base tracking-wider text-purple-300">{formData.id ? `EDITAR ITEM: ${formData.name}` : "CRIAR NOVO ITEM DO ACERVO"}</h2></div><button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button></div>
      <form onSubmit={handleSave} className="space-y-4">
        <div><label className="text-[10px] font-heading text-muted-foreground">NOME DO ITEM / RELÍQUIA / ARTEFATO</label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Wado Ichimonji" className="font-body text-xs bg-muted/20 border-border/50" required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="text-[10px] font-heading text-muted-foreground">COLEÇÃO</label><Select value={formData.collection_id} onValueChange={v => setFormData({ ...formData, collection_id: v })}><SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COL-00-MULTI">COL-00-MULTI (Multiverso)</SelectItem>{collections.map(c => <SelectItem key={c.id || c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent></Select></div><div><label className="text-[10px] font-heading text-muted-foreground">TIPO</label><Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}><SelectTrigger className="bg-muted/20 border-border/50 font-mono text-xs"><SelectValue /></SelectTrigger><SelectContent>{["Equipamento","Artefato","Relíquia","Consumível","Material"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div></div>
        <div><label className="text-[10px] font-heading text-muted-foreground">URL DA IMAGEM (OPCIONAL)</label><Input value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." className="font-mono text-xs bg-muted/20 border-border/50" /></div>
        <div><div className="mb-1 flex items-center justify-between"><label className="text-[10px] font-heading text-muted-foreground">SINOPSE EDITORIAL</label><span className={`text-[10px] font-mono ${synopsisState.valid ? 'text-emerald-400' : synopsisState.length > synopsisState.max ? 'text-red-400' : 'text-amber-400'}`}>{synopsisState.length}/200–240</span></div><Textarea value={formData.synopsis} onChange={e => setFormData({ ...formData, synopsis: e.target.value })} maxLength={240} placeholder="Origem, propriedades singulares e risco de uso, sem números de combate..." className="font-body text-xs bg-muted/20 border-border/50 h-24 resize-none" /></div>
        <div><label className="text-[10px] font-heading text-muted-foreground">LORE ESTENDIDA (OPCIONAL)</label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Contexto adicional, história e aparições canônicas..." className="font-body text-xs bg-muted/20 border-border/50 h-20 resize-none" /></div>
        <div className="p-2.5 bg-purple-950/20 border border-purple-500/30 rounded font-mono text-[10px] text-purple-300 space-y-1"><div className="font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3 text-purple-400" /> Formato Esperado de Mídia:</div><div className="text-emerald-400 break-all">{expectedFilename}</div></div>
        <div className="flex justify-end gap-3 pt-3 border-t border-border/40"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-heading border border-border/50 rounded">CANCELAR</button><button type="submit" disabled={saving || !synopsisState.valid} className="px-6 py-2 bg-purple-500 text-black font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(168,85,247,0.4)] flex items-center gap-1.5 disabled:opacity-40"><Save className="w-3.5 h-3.5" /> {saving ? "SALVANDO..." : "SALVAR ITEM"}</button></div>
      </form>
    </motion.div>
  </div>;
}
