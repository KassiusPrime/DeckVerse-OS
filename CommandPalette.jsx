import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers, Package, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "@/AuthContext";
import { buildMediaLookup, getEntityCollectionCode, loadCatalogSnapshot, resolveIndexedImage } from "@/services/catalog/catalogDataService";
import { deriveCatalogForms } from "@/services/catalog/catalogFormsService";

const STATIC_COMMANDS = [
  { label: "Início", to: "/", icon: BookOpen },
  { label: "Coleções", to: "/collections", icon: Layers },
  { label: "Personagens", to: "/characters", icon: UserRound },
  { label: "Formas", to: "/forms", icon: Sparkles },
  { label: "Itens", to: "/items", icon: Package },
  { label: "Meu acervo", to: "/my-collection", icon: ShieldCheck },
];

const normalize = (value) => String(value ?? "").trim().toLowerCase();
const getName = (entity) => entity?.name || entity?.canonicalName || entity?.title || "Sem nome";
const getDirectImage = (entity) => entity?.image_url || entity?.imageUrl || entity?.img || entity?.media_url || entity?.mediaUrl || entity?.img_art || "";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const snapshotQuery = useQuery({ queryKey: ["catalog-snapshot-canonical"], queryFn: loadCatalogSnapshot, staleTime: 30_000, enabled: open });
  const snapshot = snapshotQuery.data || { collections: [], characters: [], items: [], bosses: [], mediaIndex: [] };
  const forms = useMemo(() => deriveCatalogForms(snapshot), [snapshot]);
  const mediaLookup = useMemo(() => buildMediaLookup(snapshot.mediaIndex || []), [snapshot.mediaIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((value) => !value); }
      else if (event.key === "Escape") setOpen(false);
    };
    const onCustomOpen = (event) => { setOpen(true); if (event.detail?.query) setQuery(event.detail.query); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-global-search", onCustomOpen);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("open-global-search", onCustomOpen); };
  }, []);

  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()); else setQuery(""); }, [open]);

  const needle = normalize(query);
  const filter = (list) => !needle ? [] : (list || []).filter((entity) => [getName(entity), entity?.baseName, entity?.collectionCode, entity?.collection, entity?.series, entity?.code].some((value) => normalize(value).includes(needle))).slice(0, 5);
  const matches = useMemo(() => ({ collections: filter(snapshot.collections), characters: filter(snapshot.characters), forms: filter(forms), items: filter(snapshot.items) }), [needle, snapshot.collections, snapshot.characters, snapshot.items, forms]);

  const commands = useMemo(() => {
    const base = [...STATIC_COMMANDS];
    const isActiveAdmin = isAuthenticated && user?.role === "admin" && user?.status !== "inactive" && user?.status !== "disabled";
    if (isActiveAdmin) base.push({ label: "Admin", to: "/admin", icon: ShieldCheck });
    return base.filter((command) => !needle || normalize(command.label).includes(needle));
  }, [needle, isAuthenticated, user]);

  const resolveImage = (entity, type) => {
    if (getDirectImage(entity)) return getDirectImage(entity);
    const code = getEntityCollectionCode(entity) || String(entity?.code || entity?.collectionCode || "").trim().toUpperCase();
    const enriched = { ...entity, collectionCode: code, slug: entity?.mediaSlug || entity?.slug };
    if (type === "collection") enriched.slug = "cover";
    return resolveIndexedImage(enriched, type, mediaLookup) || "";
  };

  const go = (to) => { setOpen(false); navigate(to); };
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/70 px-4 pt-16 backdrop-blur-sm sm:pt-24" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Busca rápida">
        <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 sm:px-5"><Search className="h-5 w-5 shrink-0 text-primary" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar personagem, forma, item ou coleção..." className="min-h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60" /><kbd className="hidden rounded-lg border border-border bg-muted/50 px-2 py-1 text-[10px] font-mono text-muted-foreground sm:block">ESC</kbd></div>
        <div className="max-h-[70vh] overflow-y-auto p-2 sm:p-3">
          {needle.length < 2 ? <Section title="Atalhos">{commands.map((command) => <CommandRow key={command.to} command={command} onClick={() => go(command.to)} />)}</Section> : <>
            {matches.collections.length > 0 && <EntitySection title="Coleções" icon={Layers} entities={matches.collections} resolveImage={(entity) => resolveImage(entity, "collection")} onOpen={(entity) => go(`/collections/${encodeURIComponent(entity.code || entity.collectionCode || entity.id || getName(entity))}`)} />}
            {matches.characters.length > 0 && <EntitySection title="Personagens" icon={UserRound} entities={matches.characters} resolveImage={(entity) => resolveImage(entity, "character")} onOpen={(entity) => go(entity.id ? `/card/${encodeURIComponent(entity.id)}` : `/characters?search=${encodeURIComponent(query)}`)} />}
            {matches.forms.length > 0 && <EntitySection title="Formas" icon={Sparkles} entities={matches.forms} resolveImage={(entity) => resolveImage(entity, entity.entityType || "character")} onOpen={(entity) => go(entity.baseCharacterId ? `/card/${encodeURIComponent(entity.baseCharacterId)}` : `/forms?search=${encodeURIComponent(query)}`)} />}
            {matches.items.length > 0 && <EntitySection title="Itens" icon={Package} entities={matches.items} resolveImage={(entity) => resolveImage(entity, "item")} onOpen={() => go(`/items?search=${encodeURIComponent(query)}`)} />}
            {commands.length > 0 && <Section title="Atalhos">{commands.map((command) => <CommandRow key={command.to} command={command} onClick={() => go(command.to)} />)}</Section>}
            {matches.collections.length + matches.characters.length + matches.forms.length + matches.items.length + commands.length === 0 && <div className="px-5 py-12 text-center text-sm text-muted-foreground">Nada encontrado para esta busca.</div>}
          </>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) { return <section className="mb-2"><div className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">{title}</div>{children}</section>; }
function CommandRow({ command, onClick }) { const Icon = command.icon; return <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-foreground transition hover:bg-muted/70"><Icon className="h-4 w-4 text-primary" />{command.label}</button>; }
function EntitySection({ title, icon: Icon, entities, onOpen, resolveImage }) { return <Section title={title}>{entities.map((entity, index) => { const image = resolveImage(entity); return <button type="button" key={entity.id || entity.entityKey || `${getName(entity)}-${index}`} onClick={() => onOpen(entity)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-muted/70"><div className="flex h-10 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Icon className="h-4 w-4 text-muted-foreground/50" />}</div><div className="min-w-0"><div className="truncate text-sm font-extrabold text-foreground">{getName(entity)}</div><div className="truncate text-[11px] text-muted-foreground">{entity.baseName || entity.collectionCode || entity.collection || entity.series || entity.code || title}</div></div></button>; })}</Section>; }
