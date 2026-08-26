import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ImageOff,
  Layers,
  Package,
  Search,
  ShieldCheck,
  Skull,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { db } from "@/deckverseClient";
import Navbar from "@/Navbar";

const TYPE_CONFIG = {
  collections: { label: "Coleções", icon: Layers, path: "/collections" },
  characters: { label: "Personagens", icon: UserRound, path: "/characters" },
  items: { label: "Itens", icon: Package, path: "/items" },
  bosses: { label: "Bosses", icon: Skull, path: "/bosses" },
};

const RARITIES = ["R", "SR", "SSR", "UR", "LR", "MR"];

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const getImage = (entity) =>
  entity?.image_url || entity?.imageUrl || entity?.img || entity?.media_url || entity?.mediaUrl || "";

const getName = (entity) => entity?.name || entity?.canonicalName || entity?.title || "Sem nome";

const getRarity = (entity) => {
  const value = String(entity?.rarity || entity?.tier || "").toUpperCase().trim();
  const aliases = {
    COMMON: "R",
    RARE: "R",
    EPIC: "SR",
    LEGENDARY: "SSR",
    MYTHIC: "MR",
  };
  return aliases[value] || value;
};

const collectionRefs = (entity) =>
  [
    entity?.collectionCode,
    entity?.collection_code,
    entity?.collection_id,
    entity?.collectionId,
    entity?.collection,
    entity?.series,
  ]
    .filter(Boolean)
    .map(normalize);

const matchesCollection = (entity, collection) => {
  if (!collection) return true;
  const refs = collectionRefs(entity);
  const candidates = [collection.code, collection.id, collection.name, collection.slug]
    .filter(Boolean)
    .map(normalize);
  return candidates.some((candidate) => refs.includes(candidate));
};

function Placeholder({ type = "entity" }) {
  const Icon = type === "collection" ? BookOpen : ImageOff;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_62%)]">
      <Icon className="h-9 w-9 text-muted-foreground/35" />
    </div>
  );
}

function RarityPill({ rarity }) {
  if (!rarity) return null;
  return (
    <span className="rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-black tracking-[0.12em] text-white backdrop-blur-md">
      {rarity}
    </span>
  );
}

function EntityCard({ entity, type, onOpen }) {
  const image = getImage(entity);
  const name = getName(entity);
  const rarity = getRarity(entity);
  const collection = entity?.collection_name || entity?.series || entity?.collection || entity?.collectionCode || "";
  const formsCount = Array.isArray(entity?.forms) ? entity.forms.length : 0;
  const owned = entity?.owned === true || Number(entity?.copies || 0) > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(entity)}
      className="group overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Placeholder />
        )}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <RarityPill rarity={rarity} />
          {owned && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-200 backdrop-blur-md">
              <Check className="h-3 w-3" /> Possuído
            </span>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3">
          <h3 className="line-clamp-2 text-base font-extrabold leading-tight text-white">{name}</h3>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/65">
            <span className="truncate">{collection || TYPE_CONFIG[type]?.label}</span>
            {formsCount > 0 && (
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5">{formsCount} formas</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function CollectionCard({ collection, counts, onOpen }) {
  const image = getImage(collection);
  const name = getName(collection);
  const code = collection?.code || collection?.collectionCode || "";

  return (
    <button
      type="button"
      onClick={() => onOpen(collection)}
      className="group overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {image ? (
          <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
        ) : (
          <Placeholder type="collection" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/5" />
        <div className="absolute inset-x-4 bottom-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{code || "Coleção"}</div>
          <h3 className="text-lg font-black leading-tight text-white">{name}</h3>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold text-white/75">
            <span className="rounded-full bg-white/10 px-2 py-1">{counts.characters} personagens</span>
            <span className="rounded-full bg-white/10 px-2 py-1">{counts.items} itens</span>
            <span className="rounded-full bg-white/10 px-2 py-1">{counts.bosses} bosses</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function EntityDrawer({ entity, type, onClose }) {
  if (!entity) return null;
  const name = getName(entity);
  const image = getImage(entity);
  const rarity = getRarity(entity);
  const forms = Array.isArray(entity?.forms) ? entity.forms : [];
  const description = entity?.description || entity?.summary || entity?.bio || "";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:max-w-3xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="grid sm:grid-cols-[280px_1fr]">
          <div className="relative min-h-[280px] overflow-hidden bg-muted sm:min-h-[430px]">
            {image ? <img src={image} alt={name} className="absolute inset-0 h-full w-full object-cover" /> : <Placeholder />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent sm:hidden" />
          </div>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <RarityPill rarity={rarity} />
                  <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {TYPE_CONFIG[type]?.label || type}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entity?.collection_name || entity?.series || entity?.collection || entity?.collectionCode || "DeckVerse"}
                </p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-border bg-card p-2.5 text-muted-foreground transition hover:text-foreground" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {description && <p className="mt-6 text-sm leading-7 text-muted-foreground">{description}</p>}

            {forms.length > 0 && (
              <div className="mt-7">
                <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Formas desbloqueáveis
                </div>
                <div className="flex flex-wrap gap-2">
                  {forms.map((form) => (
                    <span key={form.formId || form.id || form.name} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
                      {form.name || form.formId || form.id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {type === "characters" && entity?.id && (
              <Link to={`/card/${entity.id}`} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-110">
                Abrir ficha completa <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Catalog({ initialType }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeType = location.pathname === "/characters" ? "characters" : location.pathname === "/items" ? "items" : location.pathname === "/bosses" ? "bosses" : "collections";
  const [type, setType] = useState(initialType || routeType);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("search") || "");
  const [rarity, setRarity] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionType, setCollectionType] = useState("characters");
  const [selectedEntity, setSelectedEntity] = useState(null);

  useEffect(() => {
    setType(initialType || routeType);
  }, [initialType, routeType]);

  const collectionsQuery = useQuery({ queryKey: ["catalog-collections"], queryFn: () => db.entities.Collection.list() });
  const charactersQuery = useQuery({ queryKey: ["catalog-characters"], queryFn: () => db.entities.Card.list() });
  const itemsQuery = useQuery({ queryKey: ["catalog-items"], queryFn: () => db.entities.Item.list() });
  const bossesQuery = useQuery({ queryKey: ["catalog-bosses"], queryFn: () => db.entities.Boss.list() });

  const collections = collectionsQuery.data || [];
  const characters = charactersQuery.data || [];
  const items = itemsQuery.data || [];
  const bosses = bossesQuery.data || [];
  const loading = collectionsQuery.isLoading || charactersQuery.isLoading || itemsQuery.isLoading || bossesQuery.isLoading;

  const uniqueCollections = useMemo(() => {
    const seen = new Set();
    return collections.filter((collection) => {
      const key = normalize(collection.code || collection.id || collection.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [collections]);

  const collectionCounts = useMemo(() => {
    const map = new Map();
    uniqueCollections.forEach((collection) => {
      map.set(collection.code || collection.id || collection.name, {
        characters: characters.filter((entity) => matchesCollection(entity, collection)).length,
        items: items.filter((entity) => matchesCollection(entity, collection)).length,
        bosses: bosses.filter((entity) => matchesCollection(entity, collection)).length,
      });
    });
    return map;
  }, [uniqueCollections, characters, items, bosses]);

  const activeEntities = type === "characters" ? characters : type === "items" ? items : bosses;
  const collectionEntities = collectionType === "characters" ? characters : collectionType === "items" ? items : bosses;

  const filteredCollections = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return uniqueCollections;
    return uniqueCollections.filter((collection) => [collection.name, collection.code, collection.category, collection.publisher].some((value) => normalize(value).includes(needle)));
  }, [uniqueCollections, query]);

  const filteredEntities = useMemo(() => {
    const needle = normalize(query);
    return activeEntities.filter((entity) => {
      if (rarity !== "all" && getRarity(entity) !== rarity) return false;
      if (!needle) return true;
      return [getName(entity), entity?.series, entity?.collection, entity?.collectionCode, entity?.aliases?.join?.(" ")]
        .some((value) => normalize(value).includes(needle));
    });
  }, [activeEntities, query, rarity]);

  const selectedCollectionEntities = useMemo(
    () => collectionEntities.filter((entity) => matchesCollection(entity, selectedCollection)),
    [collectionEntities, selectedCollection]
  );

  const changeType = (nextType) => {
    setSelectedCollection(null);
    setRarity("all");
    setType(nextType);
    navigate(TYPE_CONFIG[nextType].path);
  };

  const total = type === "collections" ? uniqueCollections.length : activeEntities.length;
  const visible = type === "collections" ? filteredCollections.length : filteredEntities.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-7 sm:px-6 sm:pt-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-0 archive-grid opacity-40" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                <ShieldCheck className="h-4 w-4" /> Arquivo multiversal
              </div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">Explore o DeckVerse sem ruído.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Coleções, personagens, itens e bosses em um catálogo único. A identidade permanece estável; formas desbloqueáveis pertencem à mesma carta quando não existe uma entidade Boss própria.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm">
              <span className="font-black text-foreground">{visible}</span> exibidos de <span className="font-black text-foreground">{total}</span>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card/70 p-3 sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const active = type === key && !selectedCollection;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeType(key)}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-extrabold transition ${active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15" : "border border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" /> {config.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Buscar em ${TYPE_CONFIG[type].label.toLowerCase()}...`}
                className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            {type !== "collections" && (
              <select
                value={rarity}
                onChange={(event) => setRarity(event.target.value)}
                className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary/60"
                aria-label="Filtrar por raridade"
              >
                <option value="all">Todas as raridades</option>
                {RARITIES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            )}
          </div>
        </section>

        {selectedCollection ? (
          <section className="mt-7">
            <button type="button" onClick={() => setSelectedCollection(null)} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-bold text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Voltar às coleções
            </button>

            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="relative min-h-[220px] p-6 sm:p-8">
                {getImage(selectedCollection) && <img src={getImage(selectedCollection)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
                <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/60" />
                <div className="relative max-w-3xl">
                  <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">{selectedCollection.code || "Coleção"}</div>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{getName(selectedCollection)}</h2>
                  {selectedCollection.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{selectedCollection.description}</p>}
                </div>
              </div>

              <div className="border-t border-border p-3 sm:p-4">
                <div className="flex gap-2 overflow-x-auto">
                  {["characters", "items", "bosses"].map((key) => {
                    const ConfigIcon = TYPE_CONFIG[key].icon;
                    return (
                      <button key={key} type="button" onClick={() => setCollectionType(key)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-extrabold transition ${collectionType === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
                        <ConfigIcon className="h-4 w-4" /> {TYPE_CONFIG[key].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {selectedCollectionEntities.map((entity, index) => (
                <EntityCard key={entity.id || entity.entityKey || `${getName(entity)}-${index}`} entity={entity} type={collectionType} onOpen={setSelectedEntity} />
              ))}
            </div>
            {selectedCollectionEntities.length === 0 && <EmptyState label={`Nenhum ${TYPE_CONFIG[collectionType].label.toLowerCase()} encontrado nesta coleção.`} />}
          </section>
        ) : (
          <section className="mt-7">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-card" />)}
              </div>
            ) : type === "collections" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCollections.map((collection) => (
                  <CollectionCard
                    key={collection.id || collection.code || collection.name}
                    collection={collection}
                    counts={collectionCounts.get(collection.code || collection.id || collection.name) || { characters: 0, items: 0, bosses: 0 }}
                    onOpen={(value) => {
                      setSelectedCollection(value);
                      setCollectionType("characters");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredEntities.map((entity, index) => <EntityCard key={entity.id || entity.entityKey || `${getName(entity)}-${index}`} entity={entity} type={type} onOpen={setSelectedEntity} />)}
              </div>
            )}

            {!loading && visible === 0 && <EmptyState label="Nenhum resultado encontrado. Ajuste a busca ou os filtros." />}
          </section>
        )}
      </main>

      <EntityDrawer entity={selectedEntity} type={selectedCollection ? collectionType : type} onClose={() => setSelectedEntity(null)} />
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
