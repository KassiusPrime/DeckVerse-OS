import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ImageOff, Layers, Package, Search, Sparkles, Swords, UserRound } from 'lucide-react';
import Navbar from './Navbar';
import { collectionMatches, loadCatalogSnapshot } from './services/catalog/catalogDataService.js';
import { deriveCatalogForms, formMatchesCollection } from './services/catalog/catalogFormsService.js';

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const getName = (entity) => entity?.name || entity?.title || 'Sem nome';
const alphaCompare = (a, b) => getName(a).localeCompare(getName(b), 'pt-BR', { sensitivity: 'base', numeric: true });

function collectionPath(collection) {
  const key = collection?.id || collection?.code || collection?.name;
  return `/collections/${encodeURIComponent(key)}`;
}

function Media({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.18),transparent_62%)]"><ImageOff className="h-8 w-8 text-muted-foreground/25" /></div>;
  return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setFailed(true)} />;
}

function CollectionCover({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (src && !failed) return <img src={src} alt={name} loading="lazy" className={className} onError={() => setFailed(true)} />;

  return (
    <div role="img" aria-label={`${name} — capa em preparação`} className="absolute inset-0 overflow-hidden bg-[#031017]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(22,238,244,.24),transparent_38%),radial-gradient(circle_at_82%_14%,rgba(124,92,255,.22),transparent_34%),linear-gradient(135deg,#031017,#09111f_55%,#07121a)]" />
      <div className="archive-grid absolute inset-0 opacity-30" />
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-cyan-300/10" />
      <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full border border-violet-300/10" />
      <div className="absolute inset-0 flex items-center justify-center px-6 pb-14">
        <div className="flex flex-col items-center text-center">
          <img src="/assets/brand/deckverse-mark.svg" alt="" aria-hidden="true" className="h-16 w-16 rounded-[22%] opacity-90 drop-shadow-[0_0_24px_rgba(22,238,244,.28)] sm:h-20 sm:w-20" />
          <div className="mt-3 font-orbitron text-[10px] font-extrabold uppercase tracking-[.24em] text-cyan-100/90">DeckVerse OS</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-white/50">Capa em preparação</div>
        </div>
      </div>
    </div>
  );
}

function CollectionGridCard({ collection, counts }) {
  const image = collection.image_url || collection.cover_url || '';
  return (
    <Link to={collectionPath(collection)} className="group relative min-h-[230px] overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_24px_60px_rgba(0,0,0,.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
      <CollectionCover src={image} name={getName(collection)} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/42 to-black/8" />
      <div className="absolute inset-x-5 bottom-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[.17em] text-white/50">{collection.category || 'Coleção'}</div>
        <div className="mt-1 flex items-end justify-between gap-4"><h2 className="min-w-0 truncate text-xl font-black tracking-tight text-white">{getName(collection)}</h2><ChevronRight className="h-5 w-5 shrink-0 text-white/55 transition group-hover:translate-x-1 group-hover:text-primary" /></div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-white/75"><span className="rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">{counts.characters} personagens</span><span className="rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">{counts.forms} formas</span><span className="rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">{counts.items} itens</span><span className="rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">{counts.bosses} bosses</span></div>
      </div>
    </Link>
  );
}

function AssetCard({ entity, kind }) {
  const name = getName(entity);
  const isForm = kind === 'form';
  const image = entity.image_url || entity.imageUrl || '';
  const label = isForm ? (entity.baseName || 'Forma') : kind === 'item' ? 'Item' : kind === 'boss' ? 'Boss' : 'Personagem';
  const targetId = isForm ? entity.baseCharacterId : entity.id;
  const content = <div className="group overflow-hidden rounded-2xl border border-border/80 bg-card text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_48px_rgba(0,0,0,.25)]"><div className="relative aspect-[4/5] overflow-hidden bg-muted"><Media src={image} alt={name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /><div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/94 via-black/35 to-transparent" /><div className="absolute inset-x-3 bottom-3"><div className="mb-1 text-[9px] font-black uppercase tracking-[.14em] text-white/48">{label}{entity.rarity ? ` · ${entity.rarity}` : ''}</div><h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-base">{name}</h3></div></div></div>;
  return targetId ? <Link to={`/card/${encodeURIComponent(targetId)}`}>{content}</Link> : content;
}

export default function CollectionsHub() {
  const navigate = useNavigate();
  const { collectionCode: routeCollectionKey } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('search') || '');
  const [detailQuery, setDetailQuery] = useState('');
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'characters');

  const snapshotQuery = useQuery({ queryKey: ['catalog-snapshot-canonical'], queryFn: loadCatalogSnapshot, staleTime: 30_000 });
  const snapshot = snapshotQuery.data || { collections: [], characters: [], items: [], bosses: [] };
  const { collections = [], characters = [], items = [], bosses = [] } = snapshot;
  const forms = useMemo(() => deriveCatalogForms(snapshot), [snapshot]);

  const uniqueCollections = useMemo(() => [...collections].sort(alphaCompare), [collections]);
  const selectedCollection = useMemo(() => {
    if (!routeCollectionKey) return null;
    const needle = normalize(decodeURIComponent(routeCollectionKey));
    return uniqueCollections.find((entry) => [entry.id, entry.code, entry.collectionCode, entry.name].filter(Boolean).some((value) => normalize(value) === needle)) || null;
  }, [routeCollectionKey, uniqueCollections]);

  React.useEffect(() => {
    if (!['characters', 'forms', 'items', 'bosses'].includes(activeTab)) setActiveTab('characters');
  }, [activeTab]);

  const countsFor = (collection) => ({
    characters: characters.filter((entity) => collectionMatches(entity, collection)).length,
    forms: forms.filter((form) => formMatchesCollection(form, collection)).length,
    items: items.filter((entity) => collectionMatches(entity, collection)).length,
    bosses: bosses.filter((entity) => collectionMatches(entity, collection)).length,
  });

  const filteredCollections = useMemo(() => {
    const needle = normalize(query);
    return uniqueCollections.filter((entry) => !needle || [getName(entry), entry.category, entry.description].some((value) => normalize(value).includes(needle)));
  }, [uniqueCollections, query]);

  const selectedCharacters = useMemo(() => selectedCollection ? characters.filter((entity) => collectionMatches(entity, selectedCollection)).sort(alphaCompare) : [], [characters, selectedCollection]);
  const selectedForms = useMemo(() => selectedCollection ? forms.filter((form) => formMatchesCollection(form, selectedCollection)).sort(alphaCompare) : [], [forms, selectedCollection]);
  const selectedItems = useMemo(() => selectedCollection ? items.filter((entity) => collectionMatches(entity, selectedCollection)).sort(alphaCompare) : [], [items, selectedCollection]);
  const selectedBosses = useMemo(() => selectedCollection ? bosses.filter((entity) => collectionMatches(entity, selectedCollection)).sort(alphaCompare) : [], [bosses, selectedCollection]);

  const activeList = activeTab === 'forms' ? selectedForms : activeTab === 'items' ? selectedItems : activeTab === 'bosses' ? selectedBosses : selectedCharacters;
  const visibleList = useMemo(() => {
    const needle = normalize(detailQuery);
    return activeList.filter((entity) => !needle || [getName(entity), entity.baseName, entity.description, entity.rarity, entity.role].some((value) => normalize(value).includes(needle)));
  }, [activeList, detailQuery]);

  const chooseTab = (tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('search');
    setSearchParams(next, { replace: true });
  };

  if (snapshotQuery.isLoading) return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 lg:px-8"><div className="h-44 animate-pulse rounded-3xl border border-border bg-card" /><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-60 animate-pulse rounded-3xl border border-border bg-card" />)}</div></main></div>;

  if (routeCollectionKey && !selectedCollection) return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-5 text-center"><Layers className="h-10 w-10 text-muted-foreground/40" /><h1 className="mt-4 text-3xl font-black">Coleção não encontrada</h1><p className="mt-3 text-sm text-muted-foreground">Ela pode estar desativada ou ainda não ter sido importada.</p><Link to="/collections" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"><ArrowLeft className="h-4 w-4" /> Voltar às coleções</Link></main></div>;

  if (!selectedCollection) return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-card/75 p-6 sm:p-8 lg:p-10"><div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,420px)] lg:items-end"><div><div className="text-xs font-extrabold uppercase tracking-[.17em] text-primary">Arquivo multiversal</div><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Coleções</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Escolha um universo para explorar personagens, formas, itens e bosses. A interface pública usa apenas nomes e informações úteis para o jogador.</p></div><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Buscar coleção" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar coleção..." className="h-12 w-full rounded-2xl border border-border bg-background/80 pl-11 pr-4 text-sm outline-none focus:border-primary/60" /></label></div></section>
        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs font-bold text-muted-foreground">{filteredCollections.length} coleções disponíveis</p><Link to="/forms" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold text-primary hover:bg-primary/10"><Sparkles className="h-4 w-4" /> Ver todas as formas</Link></div>
        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredCollections.map((collection) => <CollectionGridCard key={collection.id || getName(collection)} collection={collection} counts={countsFor(collection)} />)}</section>
      </main>
    </div>
  );

  const cover = selectedCollection.image_url || selectedCollection.cover_url || '';
  const tabs = [
    { id: 'characters', label: 'Personagens', icon: UserRound, count: selectedCharacters.length },
    { id: 'forms', label: 'Formas', icon: Sparkles, count: selectedForms.length },
    { id: 'items', label: 'Itens', icon: Package, count: selectedItems.length },
    { id: 'bosses', label: 'Bosses', icon: Swords, count: selectedBosses.length },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigate('/collections')} className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-muted-foreground hover:bg-muted/60 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Todas as coleções</button>
        <section className="relative min-h-[310px] overflow-hidden rounded-3xl border border-border bg-card sm:min-h-[360px]"><CollectionCover src={cover} name={getName(selectedCollection)} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-black/94 via-black/58 to-black/18" /><div className="relative flex min-h-[310px] max-w-3xl flex-col justify-end p-6 sm:min-h-[360px] sm:p-9"><div className="text-[10px] font-black uppercase tracking-[.2em] text-primary">{selectedCollection.category || 'Coleção'}</div><h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-white sm:text-5xl">{getName(selectedCollection)}</h1>{selectedCollection.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">{selectedCollection.description}</p>}</div></section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-3 sm:p-4"><div className="flex gap-2 overflow-x-auto">{tabs.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" onClick={() => chooseTab(id)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-extrabold ${activeTab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}><Icon className="h-4 w-4" />{label}<span className="rounded-full bg-black/10 px-1.5 text-[10px]">{count}</span></button>)}</div><label className="relative mt-3 block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label={`Buscar em ${getName(selectedCollection)}`} value={detailQuery} onChange={(event) => setDetailQuery(event.target.value)} placeholder={`Buscar em ${getName(selectedCollection)}...`} className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary/60" /></label></section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{visibleList.map((entity, index) => <AssetCard key={entity.id || `${getName(entity)}-${index}`} entity={entity} kind={activeTab === 'characters' ? 'character' : activeTab === 'forms' ? 'form' : activeTab === 'items' ? 'item' : 'boss'} />)}</section>
        {!visibleList.length && <div className="mt-5 flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/45 px-6 text-center text-sm text-muted-foreground">Nenhuma entidade encontrada nesta seção.</div>}
      </main>
    </div>
  );
}
