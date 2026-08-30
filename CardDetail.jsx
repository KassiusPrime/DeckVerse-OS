import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Heart, ImageOff, Lock, Sparkles } from "lucide-react";
import Navbar from "@/Navbar";
import { buildMediaLookup, getEntityCollectionCode, loadCatalogSnapshot, resolveIndexedImage } from "@/services/catalog/catalogDataService";
import { deriveCatalogForms } from "@/services/catalog/catalogFormsService";

const getDirectImage = (entity) => entity?.image_url || entity?.imageUrl || entity?.img || entity?.img_custom || entity?.img_oficial || entity?.media_url || entity?.mediaUrl || entity?.img_art || "";
const getName = (entity) => entity?.name || entity?.canonicalName || entity?.canonical_name || entity?.title || "Sem nome";
const getRarity = (entity) => String(entity?.rarity || "").toUpperCase();
const normalize = (value) => String(value ?? "").trim().toLowerCase();

export default function CardDetail() {
  const { id } = useParams();
  const [selectedFormId, setSelectedFormId] = useState("base");
  const [favorite, setFavorite] = useState(false);
  const snapshotQuery = useQuery({ queryKey: ["catalog-snapshot-canonical"], queryFn: loadCatalogSnapshot, staleTime: 30_000 });
  const snapshot = snapshotQuery.data || { characters: [], bosses: [], mediaIndex: [] };
  const mediaLookup = useMemo(() => buildMediaLookup(snapshot.mediaIndex || []), [snapshot.mediaIndex]);
  const allForms = useMemo(() => deriveCatalogForms(snapshot), [snapshot]);

  const card = useMemo(() => (snapshot.characters || []).find((entry) => [entry?.id, entry?.card_id, entry?.entityKey].filter(Boolean).some((value) => String(value) === String(id))) || null, [snapshot.characters, id]);
  const collectionCode = getEntityCollectionCode(card);

  const resolveImage = (entity, entityType = "character") => {
    if (!entity) return "";
    if (getDirectImage(entity)) return getDirectImage(entity);
    const enriched = { ...entity, collectionCode: getEntityCollectionCode(entity) || collectionCode, slug: entity?.mediaSlug || entity?.slug };
    return resolveIndexedImage(enriched, entityType, mediaLookup) || "";
  };

  const forms = useMemo(() => {
    if (!card) return [];
    const cardId = String(card.id || card.card_id || "");
    const cardName = normalize(getName(card));
    return allForms
      .filter((form) => {
        if (form.baseCharacterId && String(form.baseCharacterId) === cardId) return true;
        if (form.collectionCode && collectionCode && normalize(form.collectionCode) !== normalize(collectionCode)) return false;
        return normalize(form.baseName) === cardName;
      })
      .map((form, index) => ({
        ...form,
        id: form.id || form.formId || `form-${index}`,
        name: form.name || `Forma ${index + 1}`,
        image: resolveImage(form, form.entityType || "character"),
        locked: form.locked === true || form.unlocked === false,
        order: Number.isFinite(Number(form.order)) ? Number(form.order) : index + 1,
        rarity: getRarity(form),
      }))
      .sort((a, b) => a.order - b.order || getName(a).localeCompare(getName(b), "pt-BR", { sensitivity: "base" }));
  }, [allForms, card, collectionCode, mediaLookup]);

  const selectedForm = selectedFormId === "base" ? null : forms.find((form) => form.id === selectedFormId) || null;
  const baseImage = resolveImage(card, "character");
  const activeImage = selectedForm?.image || baseImage;
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

  React.useEffect(() => setSelectedFormId("base"), [id]);

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

  if (snapshotQuery.isLoading) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:px-8"><div className="aspect-[4/5] animate-pulse rounded-3xl border border-border bg-card" /><div className="space-y-4"><div className="h-10 w-2/3 animate-pulse rounded-xl bg-card" /><div className="h-5 w-1/3 animate-pulse rounded-xl bg-card" /><div className="h-32 animate-pulse rounded-2xl bg-card" /></div></main></div>;
  }

  if (!card) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center"><ImageOff className="h-10 w-10 text-muted-foreground/40" /><h1 className="mt-4 text-2xl font-black text-foreground">Personagem não encontrado</h1><p className="mt-2 text-sm text-muted-foreground">Ele pode ter sido removido, renomeado ou ainda não estar sincronizado.</p><Link to="/characters" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-extrabold text-foreground hover:border-primary/45"><ArrowLeft className="h-4 w-4" /> Voltar aos personagens</Link></main></div>;
  }

  const description = card.description || card.bio || card.summary || card.lore || "";
  const aliases = Array.isArray(card.aliases) ? card.aliases.filter(Boolean) : [];
  const collection = card.collection_name || card.collection || card.series || collectionCode || "DeckVerse";
  const rarity = getRarity(card);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2"><Link to={collectionCode ? `/collections/${encodeURIComponent(collectionCode)}` : "/characters"} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {collectionCode ? "Voltar à coleção" : "Personagens"}</Link><Link to="/forms" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground transition hover:bg-muted/50 hover:text-primary"><Sparkles className="h-4 w-4" /> Todas as formas</Link></div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-10">
          <section>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,.28)]"><div className="relative aspect-[4/5] bg-muted">{activeImage ? <img key={`${selectedFormId}-${activeImage}`} src={activeImage} alt={`${getName(card)} — ${activeLabel}`} className="h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.15),transparent_65%)]"><ImageOff className="h-10 w-10 text-muted-foreground/35" /></div>}<div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/35 to-transparent" /><div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3"><div><div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55">Forma selecionada</div><div className="mt-1 text-lg font-black text-white">{activeLabel}</div></div>{rarity && <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-black tracking-[0.12em] text-white backdrop-blur">{rarity}</span>}</div></div></div>
            {forms.length > 0 && <div className="mt-4 rounded-2xl border border-border bg-card p-3"><div className="mb-3 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> Formas disponíveis</div><div className="flex gap-2 overflow-x-auto pb-1"><FormButton label="Base" active={selectedFormId === "base"} onClick={() => setSelectedFormId("base")} />{forms.map((form) => <FormButton key={form.id} label={form.name} locked={form.locked} active={selectedFormId === form.id} onClick={() => !form.locked && setSelectedFormId(form.id)} />)}</div></div>}
          </section>

          <section className="min-w-0 lg:pt-3">
            <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{collection}</div><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">{getName(card)}</h1>{aliases.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Também conhecido como {aliases.join(", ")}</p>}</div><button type="button" onClick={toggleFavorite} aria-pressed={favorite} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${favorite ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:text-foreground"}`} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}><Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} /></button></div>
            <div className="mt-5 flex flex-wrap gap-2">{rarity && <MetaChip label="Raridade" value={rarity} />}{card.card_id && <MetaChip label="ID" value={card.card_id} />}{collectionCode && <MetaChip label="Coleção" value={collectionCode} />}{forms.length > 0 && <MetaChip label="Formas" value={String(forms.length)} />}</div>
            {description && <div className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">Sobre</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{description}</p></div>}
            {forms.length > 0 && <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">Transformações do personagem</h2><p className="mt-1 text-xs text-muted-foreground">A carta-base permanece a mesma; cada evolução troca a representação visual/estado disponível.</p></div><Sparkles className="h-5 w-5 shrink-0 text-primary" /></div><div className="mt-4 space-y-2"><ProgressRow name="Base" unlocked />{forms.map((form) => <ProgressRow key={form.id} name={form.name} unlocked={!form.locked} legacy={form.legacyBoss} />)}</div></div>}
          </section>
        </div>
      </main>
    </div>
  );
}

function FormButton({ label, active, locked, onClick }) { return <button type="button" onClick={onClick} disabled={locked} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition ${active ? "border-primary/55 bg-primary/12 text-primary" : locked ? "cursor-not-allowed border-border bg-background/50 text-muted-foreground/45" : "border-border bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground"}`}>{locked && <Lock className="h-3.5 w-3.5" />}{label}</button>; }
function MetaChip({ label, value }) { return <div className="rounded-xl border border-border bg-card px-3 py-2"><div className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{label}</div><div className="mt-0.5 text-xs font-extrabold text-foreground">{value}</div></div>; }
function ProgressRow({ name, unlocked, legacy }) { return <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3"><div className="min-w-0"><span className="text-sm font-bold text-foreground">{name}</span>{legacy && <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">legado</span>}</div>{unlocked ? <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300"><Check className="h-3.5 w-3.5" /> Disponível</span> : <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Bloqueada</span>}</div>; }
