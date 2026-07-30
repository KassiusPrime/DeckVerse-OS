import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { ALL_TAGS } from "@/lib/tagSynergies";

export default function TagInput({ value = [], onChange }) {
  const [custom, setCustom] = useState("");
  const [showAll, setShowAll] = useState(false);

  const add = (tag) => {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
  };

  const remove = (tag) => onChange(value.filter(t => t !== tag));

  const handleCustomAdd = () => {
    add(custom);
    setCustom("");
  };

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold border border-primary/40 bg-primary/10 text-primary">
              #{tag}
              <button type="button" onClick={() => remove(tag)} className="hover:text-destructive ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleCustomAdd())}
          placeholder="Tag customizada..."
          className="flex-1 px-3 py-1.5 bg-muted/20 border border-border/50 text-xs font-body focus:outline-none focus:border-primary/50"
        />
        <button type="button" onClick={handleCustomAdd}
          className="px-3 py-1.5 border border-primary/30 text-primary hover:bg-primary/10 text-xs font-heading font-bold transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset buttons */}
      <div>
        <button type="button" onClick={() => setShowAll(p => !p)}
          className="text-[10px] font-heading text-muted-foreground hover:text-primary underline mb-2 block">
          {showAll ? "▲ OCULTAR TAGS PRESET" : "▼ MOSTRAR TAGS PRESET"}
        </button>
        {showAll && (
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-muted/10 border border-border/30">
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => add(tag)}
                className={`text-[10px] font-heading px-2 py-0.5 border rounded-full transition-colors ${
                  value.includes(tag)
                    ? "border-primary/60 bg-primary/15 text-primary opacity-50 cursor-default"
                    : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}