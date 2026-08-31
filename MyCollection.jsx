import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, ImageOff, Package, Search, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from './AuthContext';
import Navbar from './Navbar';
import { getMyRoster, setEquipped } from './services/supabase/gameService.js';

const RARITIES = ['R', 'SR', 'SSR', 'UR', 'LR', 'MR'];
const normalize = (value) => String(value || '').trim().toLowerCase();
const typeLabel = (type) => type === 'item' ? 'Item' : type === 'boss' ? 'Boss' : 'Personagem';

export default function MyCollection() {
  const { isAuthenticated, navigateToLogin, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState('all');
  const [type, setType] = useState('all');
  const [busyCard, setBusyCard] = useState('');
  const [message, setMessage] = useState('');

  const rosterQuery = useQuery({
    queryKey: ['my-roster-supabase'],
    queryFn: getMyRoster,
    enabled: isAuthenticated,
    staleTime: 15_000,
  });
  const roster = rosterQuery.data || [];

  const filtered = useMemo(() => {
    const needle = normalize(search);
    return roster.filter((entry) => {
      const card = entry.cards || {};
      if (rarity !== 'all' && String(card.rarity || '').toUpperCase() !== rarity) return false;
      if (type !== 'all' && card.entity_type !== type) return false;
      if (!needle) return true;
      return [card.name, card.collections?.name, card.rarity, typeLabel(card.entity_type)].some((value) => normalize(value).includes(needle));
    });
  }, [roster, search, rarity, type]);

  const totalCopies = useMemo(() => roster.reduce((sum, entry) => sum + Number(entry.copies || 0), 0), [roster]);
  const equipped = useMemo(() => roster.filter((entry) => entry.is_equipped).length, [roster]);

  const toggleEquipped = async (entry) => {
    setBusyCard(entry.card_id);
    setMessage('');
    try {
      await setEquipped(entry.card_id, !entry.is_equipped);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-roster-supabase'] }),
        refreshProfile(),
      ]);
    } catch (error) {
      setMessage(error?.message || 'Não foi possível alterar a equipe.');
    } finally {
      setBusyCard('');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-secondary"><ShieldCheck className="h-4 w-4" /> Meu acervo</div>
              <h1 className="text-3xl font-black tracking-[-.04em] sm:text-5xl">Tudo o que você já coletou.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Seu inventário fica vinculado à conta Discord. Cópias extras são agrupadas e cartas equipadas entram no cálculo de PWR.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]"><Summary value={isAuthenticated ? roster.length : '—'} label="únicas" /><Summary value={isAuthenticated ? totalCopies : '—'} label="cópias" /><Summary value={isAuthenticated ? equipped : '—'} label="equipadas" /></div>
          </div>
        </section>

        {!isAuthenticated ? (
          <section className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 text-center">
            <UserRound className="mb-4 h-9 w-9 text-muted-foreground/40" />
            <h2 className="text-xl font-black">Entre para acessar seu acervo</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Inventário, cópias, equipe e progressão são salvos na sua conta.</p>
            <button type="button" onClick={navigateToLogin} className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Entrar com Discord</button>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-border bg-card/70 p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <label className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Buscar no meu acervo" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou coleção..." className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary/60" /></label>
                <select aria-label="Filtrar acervo por tipo" value={type} onChange={(event) => setType(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="all">Todos os tipos</option><option value="character">Personagens</option><option value="item">Itens</option><option value="boss">Bosses</option></select>
                <select aria-label="Filtrar acervo por raridade" value={rarity} onChange={(event) => setRarity(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="all">Todas as raridades</option>{RARITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
              </div>
            </section>
            {message && <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">{message}</div>}

            {rosterQuery.isLoading ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-card" />)}</div>
            ) : filtered.length ? (
              <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map((entry) => <OwnedCard key={entry.id} entry={entry} busy={busyCard === entry.card_id} onToggle={() => toggleEquipped(entry)} />)}
              </section>
            ) : (
              <section className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 text-center"><ImageOff className="mb-3 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">Nenhuma entidade do seu acervo corresponde aos filtros.</p></section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Summary({ value, label }) {
  return <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-center"><div className="text-xl font-black">{value}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>;
}

function OwnedCard({ entry, busy, onToggle }) {
  const card = entry.cards || {};
  const Icon = card.entity_type === 'item' ? Package : card.entity_type === 'boss' ? Sparkles : UserRound;
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/45">
      <Link to={`/card/${encodeURIComponent(entry.card_id)}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          {card.image_url ? <img src={card.image_url} alt={card.name || 'Entidade'} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 flex items-center justify-center"><Icon className="h-8 w-8 text-muted-foreground/30" /></div>}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-100 backdrop-blur"><Check className="h-3 w-3" /> {entry.copies}x</div>
          <div className="absolute inset-x-3 bottom-3"><div className="text-[9px] font-black uppercase tracking-[.1em] text-white/60">{typeLabel(card.entity_type)} · {card.rarity || 'R'}</div><h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-white">{card.name || 'Sem nome'}</h3><div className="mt-1 truncate text-[10px] text-white/60">{card.collections?.name || 'DeckVerse'}</div></div>
        </div>
      </Link>
      <button type="button" onClick={onToggle} disabled={busy} className={`flex min-h-10 w-full items-center justify-center gap-1 border-t border-border px-2 text-[10px] font-black transition ${entry.is_equipped ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-50`}><ShieldCheck className="h-3.5 w-3.5" />{busy ? 'Atualizando…' : entry.is_equipped ? 'Equipado' : 'Equipar'}</button>
    </div>
  );
}
