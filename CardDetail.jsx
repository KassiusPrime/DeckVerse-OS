import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Heart, ImageOff, Lock, Sparkles } from "lucide-react";
import { db } from "@/deckverseClient";
import Navbar from "@/Navbar";

const getImage = (entity) => entity?.image_url || entity?.imageUrl || entity?.img || entity?.img_custom || entity?.img_oficial || entity?.media_url || "";
const getName = (entity) => entity?.name || entity?.canonicalName || entity?.canonical_name || "Sem nome";
const getRarity = (entity) => String(entity?.rarity || "").toUpperCase();

function normalizeForms(card) {
  const raw = Array.isArray(card?.forms) ? card.forms : [];
  return raw
    .filter(Boolean)
    .map((form, index) => ({
      id: form.id || form.formId || form.formKey || form.slug || `form-${index}`,
      name: form.name || form.canonicalName || form.formName || form.formKey || `Forma ${index + 1}`,
      image: getImage(form),
      locked: form.locked === true || form.unlocked === false,
      order: Number.isFinite(Number(form.order)) ? Number(form.order) : index + 1,
      rarity: getRarity(form),
    }))
    .sort((a, b) => a.order - b.order);
}

export default function CardDetail() {
  const { id } = useParams();
  const [selectedFormId, setSelectedFormId] = useState("base");
  const [favorite, setFavorite] = useState(false);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["card-detail", id],
    queryFn: () => db.entities.Card.filter({ id }),
    enabled: Boolean(id),
  });

  const card = matches[0];
  const forms = useMemo(() => normalizeForms(card), [card]);
  const selectedForm = selectedFormId === "base" ? null : forms.find((form) => form.id === selectedFormId) || null;
  const activeImage = selectedForm?.image || getImage(card);
  const activeLabel = selectedForm?.name || "Base";

  React.useEffect(() => {
    if (!card) return;
    const key = String(card.id || card.card_id || card.entityKey || card.name);
    try {
      const values = JSON.parse(localStorage.getItem("deckverse_favorite_cards") || "[]");
      setFavorite(Array.isArray(values) && values.map(String).includes(key));
    } catch {
      setFavorite(false);
    }
  }, [card]);

  const toggleFavorite = () => {
    if (!card) return;
    const key = String(card.id || card.card_id || card.entityKey || card.name);
    try {
      const values = JSON.parse(localStorage.getItem("deckverse_favorite_cards") || "[]");
      const set = new Set(Array.isArray(values) ? values.map(String) : []);
      if (set.has(key)) set.delete(key); else set.add(key);
      localStorage.setItem("deckverse_favorite_cards", JSON.stringify([...set]));
      setFavorite(set.has(key));
    } catch {
      setFavorite((value) => !value);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:px-8">
          <div className="aspect-[4/5] animate-pulse rounded-3xl border border-border bg-card" />
          <div className="space-y-4"><div className="h-10 w-2/3 animate-pulse rounded-xl bg-card" /><div className="h-5 w-1/3 animate-pulse rounded-xl bg-card" /><div className="h-32 animate-pulse rounded-2xl bg-card" /></div>
        </main>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
          <ImageOff className="h-10 w-10 text-muted-foreground/40" />
          <h1 className="mt-4 text-2xl font-black text-foreground">Personagem não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">A entrada pode ter sido removida, renomeada ou ainda não ter sido sincronizada.</p>
          <Link to="/characters" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-extrabold text-foreground hover:border-primary/45"><ArrowLeft className="h-4 w-4" /> Voltar aos personagens</Link>
        </main>
      </div>
    );
  }

  const description = card.description || card.bio || card.summary || card.lore || "";
  const aliases = Array.isArray(card.aliases) ? card.aliases.filter(Boolean) : [];
  const collection = card.collection_name || card.collection || card.series || card.collectionCode || "DeckVerse";
  const rarity = getRarity(card);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Link to="/characters" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Personagens</Link>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-10">
          <section>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,.28)]">
              <div className="relative aspect-[4/5] bg-muted">
                {activeImage ? <img key={`${selectedFormId}-${activeImage}`} src={activeImage} alt={`${getName(card)} — ${activeLabel}`} className="h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.15),transparent_65%)]"><ImageOff className="h-10 w-10 text-muted-foreground/35" /></div>}
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                  <div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55">Visual atual</div><div className="mt-1 text-lg font-black text-white">{activeLabel}</div></div>
                  {rarity && <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-black tracking-[0.12em] text-white backdrop-blur">{rarity}</span>}
                </div>
              </div>
            </div>

            {forms.length > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-3">
                <div className="mb-3 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> Formas</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <FormButton label="Base" active={selectedFormId === "base"} onClick={() => setSelectedFormId("base")} />
                  {forms.map((form) => <FormButton key={form.id} label={form.name} locked={form.locked} active={selectedFormId === form.id} onClick={() => !form.locked && setSelectedFormId(form.id)} />)}
                </div>
              </div>
            )}
          </section>

          <section className="min-w-0 lg:pt-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{collection}</div>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">{getName(card)}</h1>
                {aliases.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Também conhecido como {aliases.join(", ")}</p>}
              </div>
              <button type="button" onClick={toggleFavorite} aria-pressed={favorite} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${favorite ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:text-foreground"}`} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}><Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} /></button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {rarity && <MetaChip label="Raridade" value={rarity} />}
              {card.card_id && <MetaChip label="ID" value={card.card_id} />}
              {card.collectionCode && <MetaChip label="Coleção" value={card.collectionCode} />}
              {forms.length > 0 && <MetaChip label="Formas" value={String(forms.length)} />}
            </div>

            {description && <div className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">Sobre</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{description}</p></div>}

            {forms.length > 0 && (
              <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">Progressão de formas</h2><p className="mt-1 text-xs text-muted-foreground">A carta continua sendo a mesma identidade; somente o visual/etapa muda após o desbloqueio.</p></div><Sparkles className="h-5 w-5 shrink-0 text-primary" /></div>
                <div className="mt-4 space-y-2">
                  <ProgressRow name="Base" unlocked />
                  {forms.map((form) => <ProgressRow key={form.id} name={form.name} unlocked={!form.locked} />)}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FormButton({ label, active, locked, onClick }) {
  return <button type="button" onClick={onClick} disabled={locked} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition ${active ? "border-primary/55 bg-primary/12 text-primary" : locked ? "cursor-not-allowed border-border bg-background/50 text-muted-foreground/45" : "border-border bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground"}`}>{locked && <Lock className="h-3.5 w-3.5" />}{label}</button>;
}

function MetaChip({ label, value }) {
  return <div className="rounded-xl border border-border bg-card px-3 py-2"><div className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{label}</div><div className="mt-0.5 text-xs font-extrabold text-foreground">{value}</div></div>;
}

function ProgressRow({ name, unlocked }) {
  return <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3"><span className="text-sm font-bold text-foreground">{name}</span>{unlocked ? <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300"><Check className="h-3.5 w-3.5" /> Desbloqueada</span> : <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Bloqueada</span>}</div>;
}
