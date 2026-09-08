import React, { useState } from "react";
import { Images } from "lucide-react";
import CardArtworkEditorModal from "./CardArtworkEditorModal.jsx";

export default function CardArtworkButton({ card, onApply }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/30 text-primary text-[10px] font-heading font-bold hover:bg-primary/10" title="Alterar arte da carta">
        <Images className="w-3.5 h-3.5" /> ALTERAR ARTE
      </button>
      {open && <CardArtworkEditorModal card={card} onClose={() => setOpen(false)} onApply={async payload => { await onApply(payload); setOpen(false); }} />}
    </>
  );
}
