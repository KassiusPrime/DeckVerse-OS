import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CircleHelp, Gem, Layers, Package, Search, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from './AuthContext';
import { loadPublicCatalog } from './services/supabase/catalogService.js';

const STATIC_COMMANDS = [
  { label: 'Início', to: '/', icon: BookOpen },
  { label: 'Coleções', to: '/collections', icon: Layers },
  { label: 'Personagens', to: '/characters', icon: UserRound },
  { label: 'Formas', to: '/forms', icon: Sparkles },
  { label: 'Itens', to: '/items', icon: Package },
  { label: 'Gacha', to: '/gacha', icon: Gem },
  { label: 'Meu acervo', to: '/my-collection', icon: ShieldCheck },
  { label: 'Suporte', to: '/support', icon: CircleHelp },
];

const normalize = (value) => String(value || '').trim().toLowerCase();

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const catalogQuery = useQuery({ queryKey: ['public-catalog-supabase'], queryFn: loadPublicCatalog, staleTime: 60_000, enabled: open });
  const catalog = catalogQuery.data || { collections: [], cards: [] };

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen((value) => !value); }
      else if (event.key === 'Escape') setOpen(false);
    };
    const onCustomOpen = (event) => { setOpen(true); if (event.detail?.query) setQuery(event.detail.query); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-global-search', onCustomOpen);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('open-global-search', onCustomOpen); };
  }, []);

  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()); else setQuery(''); }, [open]);

  const needle = normalize(query);
  const commands = useMemo(() => {
    const list = [...STATIC_COMMANDS];
    if (isAdmin) list.push({ label: 'Admin', to: '/admin', icon: ShieldCheck });
    return list.filter((entry) => !needle || normalize(entry.label).includes(needle));
  }, [needle, isAdmin]);
  const collections = useMemo(() => !needle ? [] : catalog.collections.filter((entry) => normalize(entry.name).includes(needle)).slice(0, 5), [catalog.collections, needle]);
  const cards = useMemo(() => !needle ? [] : catalog.cards.filter((entry) => [entry.name, entry.collectionName, entry.entityType, entry.rarity].some((value) => normalize(value).includes(needle))).slice(0, 8), [catalog.cards, needle]);

  const go = (path) => { setOpen(false); navigate(path); };
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/70 px-4 pt-16 backdrop-blur-sm sm:pt-24" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Busca rápida">
        <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 sm:px-5"><Search className="h-5 w-5 shrink-0 text-primary" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, coleção ou raridade…" className="min-h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60" /><kbd className="hidden rounded-lg border border-border bg-muted/50 px-2 py-1 text-[10px] font-mono text-muted-foreground sm:block">ESC</kbd></div>
        <div className="max-h-[70vh] overflow-y-auto p-2 sm:p-3">
          {needle.length < 2 ? <Section title="Atalhos">{commands.map((entry) => <Row key={entry.to} icon={entry.icon} label={entry.label} onClick={() => go(entry.to)} />)}</Section> : <>
            {collections.length > 0 && <Section title="Coleções">{collections.map((entry) => <Row key={entry.id} icon={Layers} label={entry.name} sub={entry.category} onClick={() => go(`/collections/${encodeURIComponent(entry.id)}`)} />)}</Section>}
            {cards.length > 0 && <Section title="Entidades">{cards.map((entry) => <Row key={entry.id} icon={entry.entityType === 'item' ? Package : entry.entityType === 'boss' ? Sparkles : UserRound} label={entry.name} sub={[entry.collectionName, entry.rarity].filter(Boolean).join(' · ')} image={entry.imageUrl} onClick={() => go(`/card/${encodeURIComponent(entry.id)}`)} />)}</Section>}
            {commands.length > 0 && <Section title="Atalhos">{commands.map((entry) => <Row key={entry.to} icon={entry.icon} label={entry.label} onClick={() => go(entry.to)} />)}</Section>}
            {!collections.length && !cards.length && !commands.length && <div className="px-5 py-12 text-center text-sm text-muted-foreground">Nada encontrado.</div>}
          </>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) { return <section className="mb-2"><div className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">{title}</div>{children}</section>; }
function Row({ icon: Icon, label, sub, image, onClick }) { return <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition hover:bg-muted/70">{image ? <img src={image} alt="" className="h-10 w-9 rounded-lg object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card"><Icon className="h-4 w-4 text-primary" /></div>}<div className="min-w-0"><div className="truncate text-sm font-bold text-foreground">{label}</div>{sub && <div className="truncate text-[10px] text-muted-foreground">{sub}</div>}</div></button>; }
