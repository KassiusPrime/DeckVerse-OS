import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ImageOff, Package, RefreshCw, Search, ShieldCheck, Skull, UserRound, X } from 'lucide-react';
import Navbar from './Navbar';
import { collectionMatches, loadCatalogSnapshot } from './services/catalog/catalogDataService.js';
import { CATALOG_RARITIES, isRarityReviewed, normalizeCatalogRarity } from './src/utils/rarityPolicy.js';

const TYPE_CONFIG = {
  characters: { label: 'Personagens', singular: 'Personagem', icon: UserRound, path: '/characters' },
  items: { label: 'Itens', singular: 'Item', icon: Package, path: '/items' },
  bosses: { label: 'Bosses', singular: 'Boss', icon: Skull, path: '/bosses' },
};

const RARITY_STYLES = {
  R: 'border-sky-400/25 bg-sky-400/12 text-sky-200',
  SR: 'border-violet-400/25 bg-violet-400/12 text-violet-200',
  SSR: 'border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200',
  UR: 'border-amber-400/30 bg-amber-400/12 text-amber-100',
  LR: 'border-orange-400/30 bg-orange-400/12 text-orange-100',
  MR: 'border-rose-400/30 bg-rose-400/12 text-rose-100',
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const getName = (entity) => entity?.name || entity?.title || 'Sem nome';
const getImage = (entity) => entity?.image_url || entity?.imageUrl || '';
const getRarity = (entity) => normalizeCatalogRarity(entity?.rarity || entity?.tier);
const alphaCompare = (a, b) => getName(a).localeCompare(getName(b), 'pt-BR', { sensitivity: 'base', numeric: true });

function RarityPill({ entity }) {
  const rarity = getRarity(entity);
  if (rarity) return <span className={`rounded-full border px-2 py-1 text-[10px] font-black tracking-[.12em] backdrop-blur-md ${RARITY_STYLES[rarity] || 'border-border bg-black/35 text-white'}`}>{rarity}</span>;
  if (!isRarityReviewed(entity) && (entity?.rarity || entity?.tier || entity?.rarityReviewed === false)) return <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.08em] text-amber-100">Em revisão</span>;
  return null;
}

function EntityCard({ entity, type, onOpen }) {
  const image = getImage(entity);
  const name = getName(entity);
  const collectionName = entity?.collection || entity?.series || 'DeckVerse';
  const formsCount = type === 'characters' && Array.isArray(entity?.forms) ? entity.forms.length : 0;
  return (
    <button type="button" onClick={() => onOpen(entity)} className="group overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_50px_rgba(0,0,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {image ? <img src={image} alt={name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.16),transparent_64%)]"><ImageOff className="h-8 w-8 text-muted-foreground/25" /></div>}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/92 via-black/38 to-transparent" />
        <div className="absolute left-2.5 top-2.5"><RarityPill entity={entity} /></div>
        <div className="absolute inset-x-3 bottom-3"><h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-base">{name}</h3><div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/62 sm:text-[11px]"><span className="truncate">{collectionName}</span>{formsCount > 0 && <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5">{formsCount} formas</span>}</div></div>
      </div>
    </button>
  );
}

function EntityDrawer({ entity, type, onClose }) {
  if (!entity) return null;
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.characters;
  const name = getName(entity);
  const image = getImage(entity);
  const collectionName = entity?.collection || entity?.series || 'DeckVerse';
  const description = entity?.description || entity?.summary || entity?.bio || entity?.lore || '';
  const forms = type === 'characters' && Array.isArray(entity?.forms) ? entity.forms : [];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:max-w-3xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="grid sm:grid-cols-[280px_1fr]">
          <div className="relative min-h-[260px] overflow-hidden bg-muted sm:min-h-[430px]">{image ? <img src={image} alt={name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><ImageOff className="h-10 w-10 text-muted-foreground/30" /></div>}</div>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex flex-wrap items-center gap-2"><RarityPill entity={entity} /><span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{config.singular}</span></div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">{name}</h2><p className="mt-1 text-sm text-muted-foreground">{collectionName}</p></div><button type="button" onClick={onClose} className="rounded-full border border-border bg-card p-2.5 text-muted-foreground hover:text-foreground" aria-label="Fechar"><X className="h-4 w-4" /></button></div>
            {description && <p className="mt-6 text-sm leading-7 text-muted-foreground">{description}</p>}
            {forms.length > 0 && <div className="mt-7"><div className="mb-3 text-xs font-extrabold uppercase tracking-[.14em]">Formas disponíveis</div><div className="flex flex-wrap gap-2">{forms.map((form) => <span key={form.id || form.name} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">{form.name || 'Forma'}</span>)}</div></div>}
            {entity?.id && <Link to={`/card/${encodeURIComponent(entity.id)}`} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-110">Abrir ficha <ChevronRight className="h-4 w-4" /></Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Catalog({ initialType }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeType = location.pathname === '/items' ? 'items' : location.pathname === '/bosses' ? 'bosses' : 'characters';
  const [type, setType] = useState(initialType || routeType);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [rarity, setRarity] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [sort, setSort] = useState('name-asc');
  const [selectedEntity, setSelectedEntity] = useState(null);

  const snapshotQuery = useQuery({ queryKey: ['catalog-snapshot-canonical'], queryFn: loadCatalogSnapshot, staleTime: 30_000 });
  const snapshot = snapshotQuery.data || { collections: [], characters: [], items: [], bosses: [] };
  const { collections = [], characters = [], items = [], bosses = [] } = snapshot;

  useEffect(() => setType(initialType || routeType), [initialType, routeType]);

  const activeEntities = type === 'items' ? items : type === 'bosses' ? bosses : characters;
  const uniqueCollections = useMemo(() => [...collections].sort(alphaCompare), [collections]);
  const filteredEntities = useMemo(() => {
    const needle = normalize(query);
    const collection = collectionFilter === 'all' ? null : uniqueCollections.find((entry) => String(entry.id) === collectionFilter);
    const rows = activeEntities.filter((entity) => {
      if (rarity !== 'all' && (rarity === 'unreviewed' ? isRarityReviewed(entity) : getRarity(entity) !== rarity)) return false;
      if (collection && !collectionMatches(entity, collection)) return false;
      if (!needle) return true;
      return [getName(entity), entity?.collection, entity?.series, entity?.role, getRarity(entity)].some((value) => normalize(value).includes(needle));
    });
    return [...rows].sort((a, b) => sort === 'name-desc' ? -alphaCompare(a, b) : sort === 'rarity-desc' ? CATALOG_RARITIES.indexOf(getRarity(b)) - CATALOG_RARITIES.indexOf(getRarity(a)) || alphaCompare(a, b) : alphaCompare(a, b));
  }, [activeEntities, query, collectionFilter, uniqueCollections, rarity, sort]);

  const changeType = (nextType) => {
    setType(nextType); setQuery(''); setRarity('all'); setCollectionFilter('all'); setSort('name-asc'); setSelectedEntity(null); navigate(TYPE_CONFIG[nextType].path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 archive-grid opacity-25" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.17em] text-primary"><ShieldCheck className="h-4 w-4" /> Catálogo multiversal</div><h1 className="text-3xl font-black tracking-[-.04em] sm:text-5xl">{TYPE_CONFIG[type].label}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Nomes, arte, raridade e atributos relevantes. Detalhes internos do banco permanecem fora da interface pública.</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-border bg-background/70 px-3 py-2 text-[10px] text-muted-foreground"><strong className="text-foreground">{filteredEntities.length}</strong> encontrados</span><button type="button" onClick={() => snapshotQuery.refetch()} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-background/70 px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground"><RefreshCw className={`h-3.5 w-3.5 ${snapshotQuery.isFetching ? 'animate-spin' : ''}`} /> Atualizar</button></div></div>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card/75 p-3 sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">{Object.entries(TYPE_CONFIG).map(([key, config]) => { const Icon = config.icon; return <button key={key} type="button" onClick={() => changeType(key)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-extrabold transition ${type === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}><Icon className="h-4 w-4" />{config.label}</button>; })}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_minmax(180px,260px)_170px_160px]">
            <label className="relative min-w-0"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Pesquisar ${TYPE_CONFIG[type].label.toLowerCase()}...`} className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary/60" /></label>
            <select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="all">Todas as coleções</option>{uniqueCollections.map((collection) => <option key={collection.id} value={String(collection.id)}>{getName(collection)}</option>)}</select>
            <select value={rarity} onChange={(event) => setRarity(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="all">Todas as raridades</option>{CATALOG_RARITIES.map((value) => <option key={value} value={value}>{value}</option>)}<option value="unreviewed">Em revisão</option></select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="name-asc">Nome A–Z</option><option value="name-desc">Nome Z–A</option><option value="rarity-desc">Maior raridade</option></select>
          </div>
        </section>

        <section className="mt-6">
          {snapshotQuery.isLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-card" />)}</div> : filteredEntities.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{filteredEntities.map((entity) => <EntityCard key={entity.id} entity={entity} type={type} onOpen={setSelectedEntity} />)}</div> : <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/45 px-6 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</div>}
        </section>
      </main>
      <EntityDrawer entity={selectedEntity} type={type} onClose={() => setSelectedEntity(null)} />
    </div>
  );
}
