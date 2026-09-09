import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Package, Search, Sparkles, Swords, UserRound } from 'lucide-react';
import Navbar from './Navbar';
import { loadCatalogSnapshot } from './services/catalog/catalogDataService.js';
import { deriveCatalogForms } from './services/catalog/catalogFormsService.js';

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const nameOf = (entity) => entity?.name || entity?.title || 'Sem nome';
const imageOf = (entity) => entity?.image_url || entity?.imageUrl || '';
const matches = (entity, needle) => [entity?.name, entity?.title, entity?.collection, entity?.series, entity?.role, entity?.synopsis, entity?.description].some((value) => normalize(value).includes(needle));

function ResultCard({ entity, type }) {
  const image = imageOf(entity);
  const href = type === 'forms' ? `/card/${encodeURIComponent(entity.baseEntityId || entity.baseCharacterId || entity.card_id || '')}` : `/card/${encodeURIComponent(entity.id || entity.card_id || '')}`;
  const Icon = type === 'characters' ? UserRound : type === 'items' ? Package : type === 'bosses' ? Swords : Sparkles;
  const label = type === 'characters' ? 'Personagem' : type === 'items' ? 'Item' : type === 'bosses' ? 'Boss' : 'Forma';
  return <Link to={href} className="group flex gap-3 rounded-2xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card/90"><div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">{image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover"/> : <div className="flex h-full w-full items-center justify-center"><Icon className="h-5 w-5 text-muted-foreground/35"/></div>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-primary"><Icon className="h-3.5 w-3.5"/>{label}</div><h2 className="mt-1 truncate text-sm font-black">{nameOf(entity)}</h2><p className="mt-1 truncate text-[11px] text-muted-foreground">{entity?.collection || entity?.series || entity?.baseName || 'DeckVerse'}</p></div><ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"/></Link>;
}

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const needle = normalize(query);
  const snapshotQuery = useQuery({ queryKey: ['catalog-snapshot-canonical'], queryFn: loadCatalogSnapshot, staleTime: 60_000 });
  const snapshot = snapshotQuery.data || { characters: [], items: [], bosses: [], collections: [] };
  const forms = useMemo(() => deriveCatalogForms(snapshot), [snapshot]);
  const groups = useMemo(() => {
    if (!needle) return [];
    return [
      ['characters', snapshot.characters || []],
      ['forms', forms],
      ['items', snapshot.items || []],
      ['bosses', snapshot.bosses || []],
    ].map(([type, rows]) => [type, rows.filter((row) => matches(row, needle)).slice(0, 12)]).filter(([, rows]) => rows.length);
  }, [needle, snapshot, forms]);
  const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);

  return <div className="min-h-screen bg-background text-foreground"><Navbar/><main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:px-8"><section className="rounded-3xl border border-border bg-card p-6 sm:p-8"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><Search className="h-4 w-4"/> Busca global</div><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Resultados para “{query || '...'}”</h1><p className="mt-3 text-sm text-muted-foreground">Pesquisamos personagens, formas, itens e bosses em uma única interface.</p></section><section className="mt-6">{snapshotQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:9}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card"/>)}</div> : !needle ? <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">Digite algo na busca para encontrar registros.</div> : !groups.length ? <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center"><Search className="mx-auto h-8 w-8 text-muted-foreground/35"/><h2 className="mt-3 text-lg font-black">Nenhum resultado</h2><p className="mt-1 text-sm text-muted-foreground">Tente outro nome, universo ou termo.</p></div> : <div className="space-y-8">{groups.map(([type, rows])=><div key={type}><div className="mb-3 flex items-end justify-between"><h2 className="text-lg font-black">{type === 'characters' ? 'Personagens' : type === 'forms' ? 'Formas' : type === 'items' ? 'Itens' : 'Bosses'}</h2><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{rows.length}{rows.length === 12 ? '+' : ''}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((row)=><ResultCard key={`${type}-${row.id || row.card_id || row.name}`} entity={row} type={type}/>)}</div></div>)}<p className="text-center text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{total} resultados exibidos</p></div>}</section></main></div>;
}
