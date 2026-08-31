import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ImageOff, Search, Sparkles } from 'lucide-react';
import Navbar from './Navbar';
import { loadCatalogSnapshot } from './services/catalog/catalogDataService.js';
import { deriveCatalogForms } from './services/catalog/catalogFormsService.js';

const normalize = (value) => String(value ?? '').trim().toLowerCase();

function Media({ src, alt }) {
  const [failed, setFailed] = useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.18),transparent_60%)]"><ImageOff className="h-8 w-8 text-muted-foreground/25" /></div>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />;
}

export default function FormsCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('search') || '');
  const [collectionFilter, setCollectionFilter] = useState(() => searchParams.get('collection') || 'all');
  const snapshotQuery = useQuery({ queryKey: ['catalog-snapshot-canonical'], queryFn: loadCatalogSnapshot, staleTime: 30_000 });
  const snapshot = snapshotQuery.data || { collections: [], characters: [] };
  const forms = useMemo(() => deriveCatalogForms(snapshot), [snapshot]);

  const collections = useMemo(() => [...(snapshot.collections || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })), [snapshot.collections]);
  const collectionNames = useMemo(() => new Map(collections.flatMap((entry) => [[String(entry.id || ''), entry.name], [String(entry.code || ''), entry.name], [String(entry.collectionCode || ''), entry.name]])), [collections]);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return forms.filter((form) => {
      if (collectionFilter !== 'all' && normalize(form.collectionCode) !== normalize(collectionFilter)) return false;
      if (!needle) return true;
      return [form.name, form.baseName, collectionNames.get(String(form.collectionCode)), form.description].some((value) => normalize(value).includes(needle));
    });
  }, [forms, query, collectionFilter, collectionNames]);

  const updateCollection = (value) => {
    setCollectionFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('collection'); else next.set('collection', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-card/75 p-6 sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,520px)] lg:items-end">
            <div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.17em] text-primary"><Sparkles className="h-4 w-4" /> Estados colecionáveis</div><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Formas & Transformações</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Transformações, evoluções e estados pertencem ao personagem-base. Bosses permanecem em sua própria categoria e não são tratados como formas automaticamente.</p></div>
            <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
              <label className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Buscar forma ou personagem" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar forma ou personagem..." className="h-12 w-full rounded-2xl border border-border bg-background/80 pl-11 pr-4 text-sm outline-none focus:border-primary/60" /></label>
              <select aria-label="Filtrar formas por coleção" value={collectionFilter} onChange={(event) => updateCollection(event.target.value)} className="h-12 rounded-2xl border border-border bg-background/80 px-3 text-sm font-semibold outline-none focus:border-primary/60"><option value="all">Todas as coleções</option>{collections.map((collection) => { const value = collection.id || collection.code || collection.collectionCode; return <option key={value} value={value}>{collection.name || 'Coleção'}</option>; })}</select>
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs font-bold text-muted-foreground">{snapshotQuery.isLoading ? 'Carregando...' : `${filtered.length} formas encontradas`}</p><Link to="/collections" className="text-xs font-extrabold text-primary hover:underline">Explorar por coleção</Link></div>

        {snapshotQuery.isLoading ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-card" />)}</div> : filtered.length > 0 ? (
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((form, index) => {
              const collectionName = collectionNames.get(String(form.collectionCode)) || 'DeckVerse';
              const card = <div className="group overflow-hidden rounded-2xl border border-border/80 bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_48px_rgba(0,0,0,.25)]"><div className="relative aspect-[4/5] overflow-hidden bg-muted"><Media src={form.image_url || form.imageUrl || ''} alt={form.name} /><div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/95 via-black/38 to-transparent" /><div className="absolute inset-x-3 bottom-3"><div className="text-[9px] font-black uppercase tracking-[.14em] text-primary">{collectionName}</div><h2 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-white">{form.name}</h2><p className="mt-1 truncate text-[10px] text-white/55">{form.baseName || 'Personagem-base'}</p></div></div></div>;
              return form.baseCharacterId ? <Link key={form.id || index} to={`/card/${encodeURIComponent(form.baseCharacterId)}`}>{card}</Link> : <div key={form.id || index}>{card}</div>;
            })}
          </section>
        ) : <div className="mt-4 rounded-3xl border border-dashed border-border bg-card/45 px-6 py-16 text-center"><Sparkles className="mx-auto h-9 w-9 text-muted-foreground/30" /><h2 className="mt-3 text-lg font-black">Nenhuma forma encontrada</h2><p className="mt-1 text-sm text-muted-foreground">Tente outra coleção ou termo de busca.</p></div>}
      </main>
    </div>
  );
}
