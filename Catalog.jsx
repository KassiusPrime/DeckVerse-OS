import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import JSZip from "jszip";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  ImageOff,
  Layers,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Skull,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import Navbar from "@/Navbar";
import { useAuth } from "@/AuthContext";
import { parseMediaFilename } from "@/services/media/mediaFilenameParser";
import {
  buildMediaLookup,
  collectionMatches,
  getEntityCollectionCode,
  loadCatalogSnapshot,
  resolveIndexedImage,
  slugifyCatalogName,
} from "@/services/catalog/catalogDataService";
import { CATALOG_RARITIES, normalizeCatalogRarity } from "@/src/utils/rarityPolicy";

const TYPE_CONFIG = {
  collections: { label: "Coleções", singular: "collection", icon: Layers, path: "/collections" },
  characters: { label: "Personagens", singular: "character", icon: UserRound, path: "/characters" },
  items: { label: "Itens", singular: "item", icon: Package, path: "/items" },
  bosses: { label: "Bosses", singular: "boss", icon: Skull, path: "/bosses" },
};

const RARITY_STYLES = {
  C: "border-zinc-400/25 bg-zinc-400/12 text-zinc-200",
  UC: "border-emerald-400/25 bg-emerald-400/12 text-emerald-200",
  R: "border-sky-400/25 bg-sky-400/12 text-sky-200",
  SR: "border-violet-400/25 bg-violet-400/12 text-violet-200",
  SSR: "border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200",
  UR: "border-amber-400/30 bg-amber-400/12 text-amber-100",
  LR: "border-orange-400/30 bg-orange-400/12 text-orange-100",
  MR: "border-rose-400/30 bg-rose-400/12 text-rose-100",
};

const normalize = (value) => String(value ?? "").trim().toLowerCase();
const getName = (entity) => entity?.name || entity?.canonicalName || entity?.title || "Sem nome";
const getDirectImage = (entity) => entity?.image_url || entity?.imageUrl || entity?.img || entity?.media_url || entity?.mediaUrl || "";
const getRarity = (entity) => normalizeCatalogRarity(entity?.rarity || entity?.tier);

function mediaKeyForEntity(entity, entityType) {
  const code = getEntityCollectionCode(entity);
  if (!code) return "";
  const slug = entityType === "collection"
    ? "cover"
    : String(entity?.slug || slugifyCatalogName(getName(entity)));
  return slug ? `${code}|${entityType}|${slug}` : "";
}

function Placeholder({ type = "entity" }) {
  const Icon = type === "collection" ? BookOpen : ImageOff;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_62%)]">
      <Icon className="h-9 w-9 text-muted-foreground/35" />
    </div>
  );
}

function MediaImage({ src, alt, className, placeholderType = "entity" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <Placeholder type={placeholderType} />;
  return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setFailed(true)} />;
}

function RarityPill({ rarity }) {
  if (!rarity) return null;
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-black tracking-[0.12em] backdrop-blur-md ${RARITY_STYLES[rarity] || "border-white/10 bg-black/45 text-white"}`}>
      {rarity}
    </span>
  );
}

function EntityCard({ entity, type, onOpen, resolveImage }) {
  const image = resolveImage(entity, TYPE_CONFIG[type]?.singular || type);
  const name = getName(entity);
  const rarity = getRarity(entity);
  const collection = entity?.collection_name || entity?.series || entity?.collection || entity?.collectionCode || entity?.collection_id || "";
  const formsCount = Array.isArray(entity?.forms) ? entity.forms.length : 0;
  const owned = entity?.owned === true || Number(entity?.copies || 0) > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(entity)}
      className="group overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <MediaImage src={image} alt={name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <RarityPill rarity={rarity} />
          {owned && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-100 backdrop-blur-md">
              <Check className="h-3 w-3" /> Coletado
            </span>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3">
          <h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-base">{name}</h3>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/65 sm:text-[11px]">
            <span className="truncate">{collection || TYPE_CONFIG[type]?.label}</span>
            {formsCount > 0 && <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5">{formsCount} formas</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function CollectionCard({ collection, counts, onOpen, resolveImage }) {
  const image = resolveImage(collection, "collection");
  const name = getName(collection);
  const code = collection?.code || collection?.collectionCode || collection?.id || "";

  return (
    <button
      type="button"
      onClick={() => onOpen(collection)}
      className="group overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <MediaImage src={image} alt={name} placeholderType="collection" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/5" />
        <div className="absolute inset-x-4 bottom-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{code || "Coleção"}</div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h3 className="min-w-0 text-lg font-black leading-tight text-white">{name}</h3>
            <span className="shrink-0 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-xs font-black text-white backdrop-blur">
              {counts.total} cartas
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-white/65">
            <span>{counts.characters} personagens</span>
            <span>{counts.items} itens</span>
            <span>{counts.bosses} bosses</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function EntityDrawer({ entity, type, onClose, resolveImage }) {
  if (!entity) return null;
  const name = getName(entity);
  const entityType = TYPE_CONFIG[type]?.singular || type;
  const image = resolveImage(entity, entityType);
  const rarity = getRarity(entity);
  const forms = Array.isArray(entity?.forms) ? entity.forms : [];
  const description = entity?.description || entity?.summary || entity?.bio || "";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:max-w-3xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="grid sm:grid-cols-[280px_1fr]">
          <div className="relative min-h-[280px] overflow-hidden bg-muted sm:min-h-[430px]">
            <MediaImage src={image} alt={name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent sm:hidden" />
          </div>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <RarityPill rarity={rarity} />
                  <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{TYPE_CONFIG[type]?.label || type}</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{entity?.collection_name || entity?.series || entity?.collection || entity?.collectionCode || entity?.collection_id || "DeckVerse"}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-border bg-card p-2.5 text-muted-foreground transition hover:text-foreground" aria-label="Fechar"><X className="h-4 w-4" /></button>
            </div>

            {description && <p className="mt-6 text-sm leading-7 text-muted-foreground">{description}</p>}

            {forms.length > 0 && (
              <div className="mt-7">
                <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-foreground"><Sparkles className="h-4 w-4 text-primary" /> Formas disponíveis</div>
                <div className="flex flex-wrap gap-2">
                  {forms.map((form) => <span key={form.formId || form.id || form.name} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">{form.name || form.formId || form.id}</span>)}
                </div>
              </div>
            )}

            {type === "characters" && entity?.id && (
              <Link to={`/card/${entity.id}`} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-110">Abrir ficha <ChevronRight className="h-4 w-4" /></Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function collectZipPreview(data, map, stats, urls, depth = 0) {
  const zip = await JSZip.loadAsync(data);
  const entries = Object.values(zip.files);

  for (const entry of entries) {
    if (entry.dir) continue;
    const lower = entry.name.toLowerCase();

    if (lower.endsWith(".zip") && depth < 2) {
      stats.nestedZips += 1;
      const nested = await entry.async("uint8array");
      await collectZipPreview(nested, map, stats, urls, depth + 1);
      continue;
    }

    if (!/\.(jpg|jpeg|png|webp)$/i.test(lower)) continue;
    stats.imageFiles += 1;
    const parsed = parseMediaFilename(entry.name);
    if (!parsed.valid) {
      stats.ignored += 1;
      stats.errors[parsed.error || "INVALID"] = (stats.errors[parsed.error || "INVALID"] || 0) + 1;
      continue;
    }

    const blob = await entry.async("blob");
    const url = URL.createObjectURL(blob);
    urls.push(url);
    map.set(`${parsed.collectionCodeCanonical}|${parsed.entityType}|${parsed.slug}`, url);
    stats.recognized += 1;
  }
}

export default function Catalog({ initialType }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const zipInputRef = useRef(null);
  const objectUrlsRef = useRef([]);

  const routeType = location.pathname === "/characters" ? "characters" : location.pathname === "/items" ? "items" : location.pathname === "/bosses" ? "bosses" : "collections";
  const [type, setType] = useState(initialType || routeType);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("search") || "");
  const [rarity, setRarity] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionType, setCollectionType] = useState("characters");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionRarity, setCollectionRarity] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(() => new Map());
  const [zipStatus, setZipStatus] = useState(null);
  const [zipLoading, setZipLoading] = useState(false);

  const snapshotQuery = useQuery({ queryKey: ["catalog-snapshot"], queryFn: loadCatalogSnapshot, staleTime: 30_000 });
  const snapshot = snapshotQuery.data || { collections: [], characters: [], items: [], bosses: [], mediaIndex: [], source: "LOCAL" };
  const { collections = [], characters = [], items = [], bosses = [], mediaIndex = [], source = "LOCAL" } = snapshot;
  const loading = snapshotQuery.isLoading;
  const mediaLookup = useMemo(() => buildMediaLookup(mediaIndex), [mediaIndex]);

  useEffect(() => {
    setType(initialType || routeType);
  }, [initialType, routeType]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const uniqueCollections = useMemo(() => {
    const seen = new Set();
    return collections.filter((collection) => {
      const key = normalize(collection.code || collection.id || collection.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [collections]);

  const collectionByKey = useMemo(() => {
    const map = new Map();
    uniqueCollections.forEach((collection) => {
      [collection.code, collection.id, collection.name].filter(Boolean).forEach((value) => map.set(normalize(value), collection));
    });
    return map;
  }, [uniqueCollections]);

  const collectionCounts = useMemo(() => {
    const map = new Map();
    uniqueCollections.forEach((collection) => {
      const characterCount = characters.filter((entity) => collectionMatches(entity, collection)).length;
      const itemCount = items.filter((entity) => collectionMatches(entity, collection)).length;
      const bossCount = bosses.filter((entity) => collectionMatches(entity, collection)).length;
      map.set(collection.code || collection.id || collection.name, {
        characters: characterCount,
        items: itemCount,
        bosses: bossCount,
        total: characterCount + itemCount + bossCount,
      });
    });
    return map;
  }, [uniqueCollections, characters, items, bosses]);

  const resolveImage = (entity, entityType) => {
    const previewKey = mediaKeyForEntity(entity, entityType);
    if (previewKey && previewMedia.has(previewKey)) return previewMedia.get(previewKey);
    return resolveIndexedImage(entity, entityType, mediaLookup) || getDirectImage(entity);
  };

  const activeEntities = type === "characters" ? characters : type === "items" ? items : bosses;

  const filteredCollections = useMemo(() => {
    const needle = normalize(query);
    const filtered = uniqueCollections.filter((collection) => {
      if (!needle) return true;
      return [collection.name, collection.code, collection.publisher, collection.description].some((value) => normalize(value).includes(needle));
    });
    return [...filtered].sort((a, b) => {
      if (sort === "count-desc") {
        const aCount = collectionCounts.get(a.code || a.id || a.name)?.total || 0;
        const bCount = collectionCounts.get(b.code || b.id || b.name)?.total || 0;
        return bCount - aCount || getName(a).localeCompare(getName(b), "pt-BR");
      }
      return getName(a).localeCompare(getName(b), "pt-BR");
    });
  }, [uniqueCollections, query, sort, collectionCounts]);

  const filteredEntities = useMemo(() => {
    const needle = normalize(query);
    const filtered = activeEntities.filter((entity) => {
      if (rarity !== "all" && getRarity(entity) !== rarity) return false;
      if (collectionFilter !== "all") {
        const collection = collectionByKey.get(normalize(collectionFilter));
        if (!collection || !collectionMatches(entity, collection)) return false;
      }
      if (!needle) return true;
      return [getName(entity), entity?.series, entity?.collection, entity?.collectionCode, entity?.collection_id, entity?.aliases?.join?.(" ")]
        .some((value) => normalize(value).includes(needle));
    });

    return [...filtered].sort((a, b) => {
      if (sort === "rarity-desc") {
        return CATALOG_RARITIES.indexOf(getRarity(b)) - CATALOG_RARITIES.indexOf(getRarity(a)) || getName(a).localeCompare(getName(b), "pt-BR");
      }
      if (sort === "name-desc") return getName(b).localeCompare(getName(a), "pt-BR");
      return getName(a).localeCompare(getName(b), "pt-BR");
    });
  }, [activeEntities, query, rarity, collectionFilter, collectionByKey, sort]);

  const selectedCollectionEntities = useMemo(() => {
    if (!selectedCollection) return [];
    const sourceList = collectionType === "characters" ? characters : collectionType === "items" ? items : bosses;
    const needle = normalize(collectionQuery);
    return sourceList.filter((entity) => {
      if (!collectionMatches(entity, selectedCollection)) return false;
      if (collectionRarity !== "all" && getRarity(entity) !== collectionRarity) return false;
      if (!needle) return true;
      return [getName(entity), entity?.aliases?.join?.(" ")].some((value) => normalize(value).includes(needle));
    }).sort((a, b) => getName(a).localeCompare(getName(b), "pt-BR"));
  }, [selectedCollection, collectionType, characters, items, bosses, collectionQuery, collectionRarity]);

  const total = type === "collections" ? uniqueCollections.length : activeEntities.length;
  const visible = type === "collections" ? filteredCollections.length : filteredEntities.length;

  const changeType = (nextType) => {
    setSelectedCollection(null);
    setSelectedEntity(null);
    setRarity("all");
    setCollectionFilter("all");
    setQuery("");
    setType(nextType);
    navigate(TYPE_CONFIG[nextType].path);
  };

  const clearZipPreview = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setPreviewMedia(new Map());
    setZipStatus(null);
  };

  const handleZipFile = async (file) => {
    if (!file) return;
    setZipLoading(true);
    clearZipPreview();
    const map = new Map();
    const urls = [];
    const stats = { imageFiles: 0, recognized: 0, ignored: 0, nestedZips: 0, errors: {} };
    try {
      await collectZipPreview(file, map, stats, urls);
      objectUrlsRef.current = urls;
      setPreviewMedia(map);

      const allEntities = [
        ...uniqueCollections.map((entity) => [entity, "collection"]),
        ...characters.map((entity) => [entity, "character"]),
        ...items.map((entity) => [entity, "item"]),
        ...bosses.map((entity) => [entity, "boss"]),
      ];
      const matched = allEntities.filter(([entity, entityType]) => {
        const key = mediaKeyForEntity(entity, entityType);
        return key && map.has(key);
      }).length;

      setZipStatus({ ...stats, matched, fileName: file.name });
    } catch (error) {
      urls.forEach((url) => URL.revokeObjectURL(url));
      setZipStatus({ error: error.message || "Não foi possível ler o ZIP.", fileName: file.name });
    } finally {
      setZipLoading(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-6 sm:px-6 sm:pt-9 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 archive-grid opacity-35" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-primary"><ShieldCheck className="h-4 w-4" /> Catálogo multiversal</div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">Encontre qualquer carta.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Pesquise por nome, filtre pela coleção e pela raridade e abra cada universo para ver seu conteúdo real.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs font-bold text-muted-foreground"><Database className="h-3.5 w-3.5" /> {source === "FIREBASE" ? "Dados do Firebase" : "Dados locais"}</span>
              <span className="rounded-full border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground"><strong className="text-foreground">{visible}</strong> de <strong className="text-foreground">{total}</strong></span>
              <button type="button" onClick={() => snapshotQuery.refetch()} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-background/70 px-3 text-xs font-bold text-muted-foreground transition hover:text-foreground" aria-label="Atualizar catálogo"><RefreshCw className={`h-3.5 w-3.5 ${snapshotQuery.isFetching ? "animate-spin" : ""}`} /> Atualizar</button>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card/75 p-3 sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const active = type === key && !selectedCollection;
              return <button key={key} type="button" onClick={() => changeType(key)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-extrabold transition ${active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><Icon className="h-4 w-4" /> {config.label}</button>;
            })}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_220px_160px_160px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={type === "collections" ? "Pesquisar coleção..." : `Pesquisar em ${TYPE_CONFIG[type].label.toLowerCase()}...`} className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
            </label>

            {type !== "collections" ? (
              <select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)} className="h-12 min-w-0 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60" aria-label="Filtrar por coleção">
                <option value="all">Todas as coleções</option>
                {uniqueCollections.map((collection) => <option key={collection.code || collection.id || collection.name} value={collection.code || collection.id || collection.name}>{getName(collection)}</option>)}
              </select>
            ) : <div className="hidden lg:block" />}

            {type !== "collections" ? (
              <select value={rarity} onChange={(event) => setRarity(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60" aria-label="Filtrar por raridade">
                <option value="all">Todas as raridades</option>
                {CATALOG_RARITIES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            ) : <div className="hidden lg:block" />}

            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60" aria-label="Ordenar catálogo">
              <option value="name-asc">Nome A–Z</option>
              {type !== "collections" && <option value="name-desc">Nome Z–A</option>}
              {type !== "collections" && <option value="rarity-desc">Maior raridade</option>}
              {type === "collections" && <option value="count-desc">Mais cartas</option>}
            </select>
          </div>

          {user?.role === "admin" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
              <input ref={zipInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => handleZipFile(event.target.files?.[0])} />
              <button type="button" disabled={zipLoading} onClick={() => zipInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-xs font-extrabold text-foreground transition hover:border-primary/45 disabled:opacity-50"><Upload className="h-4 w-4 text-secondary" /> {zipLoading ? "Lendo ZIP..." : "Testar imagens do ZIP"}</button>
              {previewMedia.size > 0 && <button type="button" onClick={clearZipPreview} className="min-h-10 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:text-foreground">Encerrar prévia</button>}
              {zipStatus && !zipStatus.error && <p className="text-xs text-muted-foreground"><strong className="text-foreground">{zipStatus.recognized}</strong> imagens reconhecidas • <strong className="text-foreground">{zipStatus.matched}</strong> ligadas a entidades atuais • {zipStatus.ignored} ignoradas{zipStatus.nestedZips ? ` • ${zipStatus.nestedZips} ZIPs internos` : ""}. Prévia local, sem salvar.</p>}
              {zipStatus?.error && <p className="text-xs text-destructive">{zipStatus.error}</p>}
            </div>
          )}
        </section>

        {selectedCollection ? (
          <section className="mt-7">
            <button type="button" onClick={() => { setSelectedCollection(null); setCollectionQuery(""); setCollectionRarity("all"); }} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-bold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar às coleções</button>

            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="relative min-h-[220px] p-6 sm:p-8">
                {resolveImage(selectedCollection, "collection") && <img src={resolveImage(selectedCollection, "collection")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
                <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/60" />
                <div className="relative max-w-3xl">
                  <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">{selectedCollection.code || "Coleção"}</div>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{getName(selectedCollection)}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
                    {(() => { const c = collectionCounts.get(selectedCollection.code || selectedCollection.id || selectedCollection.name) || { total: 0, characters: 0, items: 0, bosses: 0 }; return <><span>{c.total} cartas</span><span>•</span><span>{c.characters} personagens</span><span>•</span><span>{c.items} itens</span><span>•</span><span>{c.bosses} bosses</span></>; })()}
                  </div>
                  {selectedCollection.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{selectedCollection.description}</p>}
                </div>
              </div>

              <div className="border-t border-border p-3 sm:p-4">
                <div className="flex gap-2 overflow-x-auto">
                  {["characters", "items", "bosses"].map((key) => {
                    const ConfigIcon = TYPE_CONFIG[key].icon;
                    return <button key={key} type="button" onClick={() => setCollectionType(key)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-extrabold transition ${collectionType === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><ConfigIcon className="h-4 w-4" /> {TYPE_CONFIG[key].label}</button>;
                  })}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_170px]">
                  <label className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={collectionQuery} onChange={(event) => setCollectionQuery(event.target.value)} placeholder={`Pesquisar em ${getName(selectedCollection)}...`} className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary/60" /></label>
                  <select value={collectionRarity} onChange={(event) => setCollectionRarity(event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none"><option value="all">Todas as raridades</option>{CATALOG_RARITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {selectedCollectionEntities.map((entity, index) => <EntityCard key={entity.id || entity.entityKey || `${getName(entity)}-${index}`} entity={entity} type={collectionType} onOpen={setSelectedEntity} resolveImage={resolveImage} />)}
            </div>
            {selectedCollectionEntities.length === 0 && <EmptyState label={`Nenhum ${TYPE_CONFIG[collectionType].label.toLowerCase()} corresponde aos filtros nesta coleção.`} />}
          </section>
        ) : (
          <section className="mt-7">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-card" />)}</div>
            ) : type === "collections" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCollections.map((collection) => <CollectionCard key={collection.id || collection.code || collection.name} collection={collection} counts={collectionCounts.get(collection.code || collection.id || collection.name) || { characters: 0, items: 0, bosses: 0, total: 0 }} onOpen={(value) => { setSelectedCollection(value); setCollectionType("characters"); setCollectionQuery(""); setCollectionRarity("all"); }} resolveImage={resolveImage} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredEntities.map((entity, index) => <EntityCard key={entity.id || entity.entityKey || `${getName(entity)}-${index}`} entity={entity} type={type} onOpen={setSelectedEntity} resolveImage={resolveImage} />)}
              </div>
            )}
            {!loading && visible === 0 && <EmptyState label="Nenhum resultado encontrado. Ajuste a busca ou os filtros." />}
          </section>
        )}
      </main>
      <EntityDrawer entity={selectedEntity} type={selectedCollection ? collectionType : type} onClose={() => setSelectedEntity(null)} resolveImage={resolveImage} />
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 text-center">
      <ImageOff className="mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="max-w-md text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
