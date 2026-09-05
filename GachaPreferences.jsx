import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Ban, Heart, ImageOff, Loader2, RotateCcw, Search, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { loadCatalogSnapshot } from './services/catalog/catalogDataService.js';
import {
  clearGachaDisablelist,
  getMyGachaPreferences,
  setCardWish,
  setCollectionGachaPreference,
} from './services/supabase/gachaPreferencesService.js';

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const getName = (entry) => entry?.name || entry?.title || 'Sem nome';
const alpha = (a, b) => getName(a).localeCompare(getName(b), 'pt-BR', { sensitivity: 'base', numeric: true });

function friendlyError(error) {
  const message = String(error?.message || error || 'Não foi possível salvar a preferência.');
  if (message.includes('DISABLELIST_WOULD_EMPTY_POOL')) return 'Essa alteração desativaria todas as cartas disponíveis no Gacha. Mantenha ao menos uma coleção habilitada.';
  if (message.includes('COLLECTION_NOT_AVAILABLE')) return 'Essa coleção não está disponível para rolls no momento.';
  if (message.includes('CARD_NOT_AVAILABLE')) return 'Essa carta não está disponível para wishlist no momento.';
  if (message.includes('AUTH_REQUIRED')) return 'Entre na sua conta para alterar preferências.';
  return message;
}

export default function GachaPreferences() {
  const { isAuthenticated, isLoadingAuth, profile, navigateToLogin } = useAuth();
  const queryClient = useQueryClient();
  const [collectionQuery, setCollectionQuery] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const catalogQuery = useQuery({
    queryKey: ['catalog-snapshot-canonical'],
    queryFn: loadCatalogSnapshot,
    staleTime: 30_000,
  });
  const preferencesQuery = useQuery({
    queryKey: ['my-gacha-preferences'],
    queryFn: getMyGachaPreferences,
    enabled: Boolean(isAuthenticated),
    staleTime: 10_000,
  });

  const snapshot = catalogQuery.data || { collections: [], characters: [], items: [], bosses: [] };
  const collections = useMemo(() => [...(snapshot.collections || [])].sort(alpha), [snapshot.collections]);
  const allCards = useMemo(() => [...(snapshot.characters || []), ...(snapshot.bosses || []), ...(snapshot.items || [])].sort(alpha), [snapshot]);
  const preferences = preferencesQuery.data || { disabledCollections: [], wishedCollections: [], wishedCards: [] };
  const disabledSet = useMemo(() => new Set(preferences.disabledCollections.map(String)), [preferences.disabledCollections]);
  const wishedCollectionSet = useMemo(() => new Set(preferences.wishedCollections.map(String)), [preferences.wishedCollections]);
  const wishedCardSet = useMemo(() => new Set(preferences.wishedCards.map(String)), [preferences.wishedCards]);

  const maxBatch = Math.min(50, 10 + Math.floor(Number(profile?.level || 1) / 10) * 5);
  const enabledCollections = Math.max(0, collections.length - disabledSet.size);

  const filteredCollections = useMemo(() => {
    const needle = normalize(collectionQuery);
    return collections.filter((entry) => !needle || [entry.name, entry.category, entry.description].some((value) => normalize(value).includes(needle)));
  }, [collections, collectionQuery]);

  const wishedCards = useMemo(() => allCards.filter((entry) => wishedCardSet.has(String(entry.id))), [allCards, wishedCardSet]);
  const cardResults = useMemo(() => {
    const needle = normalize(cardQuery);
    if (!needle) return wishedCards.slice(0, 30);
    return allCards
      .filter((entry) => [entry.name, entry.collection, entry.series, entry.rarity, entry.entity_type].some((value) => normalize(value).includes(needle)))
      .slice(0, 40);
  }, [allCards, wishedCards, cardQuery]);

  const updatePreferencesCache = (next) => queryClient.setQueryData(['my-gacha-preferences'], next);

  const toggleCollection = async (collection, field) => {
    const id = String(collection.id || collection.code || '');
    if (!id) return;
    const disabled = disabledSet.has(id);
    const wished = wishedCollectionSet.has(id);
    const next = field === 'disabled'
      ? { disabled: !disabled, wished }
      : { disabled, wished: !wished };
    setBusyKey(`${field}:${id}`);
    setError('');
    try {
      updatePreferencesCache(await setCollectionGachaPreference(id, next));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyKey('');
    }
  };

  const toggleCard = async (card) => {
    const id = String(card.id || card.card_id || '');
    if (!id) return;
    setBusyKey(`card:${id}`);
    setError('');
    try {
      updatePreferencesCache(await setCardWish(id, !wishedCardSet.has(id)));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyKey('');
    }
  };

  const clearDisabled = async () => {
    setBusyKey('clear');
    setError('');
    try {
      updatePreferencesCache(await clearGachaDisablelist());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyKey('');
    }
  };

  if (isLoadingAuth) return <Loading />;
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <SlidersHorizontal className="h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-black">Preferências de Gacha</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">Entre para criar sua Disablelist e Wishlist. Essas preferências são exclusivas da sua conta.</p>
        <button type="button" onClick={navigateToLogin} className="mt-6 min-h-11 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">Entrar</button>
      </main>
    </div>
  );

  const loading = catalogQuery.isLoading || preferencesQuery.isLoading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link to="/gacha" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-muted-foreground hover:bg-muted/60 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao Gacha</Link>
          <button type="button" onClick={clearDisabled} disabled={!disabledSet.size || busyKey === 'clear'} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-black text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40">{busyKey === 'clear' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Limpar Disablelist</button>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-9">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><SlidersHorizontal className="h-4 w-4" /> Preferências de rolls</div>
          <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-5xl">Seu pool, suas escolhas.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Desabilitar uma coleção a remove apenas dos seus rolls. Wishes funcionam como marcação e destaque: não alteram secretamente as probabilidades do Gacha.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Coleções no pool" value={enabledCollections} />
            <Metric label="Desabilitadas" value={disabledSet.size} />
            <Metric label="Wishes" value={wishedCardSet.size + wishedCollectionSet.size} />
            <Metric label="Roll máximo" value={`${maxBatch}x`} />
          </div>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-bold text-destructive">{error}</div>}
        {loading ? <div className="mt-6 flex min-h-48 items-center justify-center rounded-3xl border border-border bg-card"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
            <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><div className="text-xs font-black uppercase tracking-[.14em] text-primary">Disablelist</div><h2 className="mt-1 text-2xl font-black">Coleções</h2><p className="mt-1 text-xs text-muted-foreground">A coleção continua visível no catálogo; apenas seus rolls são filtrados.</p></div>
                <SearchBox value={collectionQuery} onChange={setCollectionQuery} placeholder="Buscar coleção..." />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {filteredCollections.map((collection) => {
                  const id = String(collection.id || collection.code || '');
                  const disabled = disabledSet.has(id);
                  const wished = wishedCollectionSet.has(id);
                  return <div key={id} className={`rounded-2xl border p-4 transition ${disabled ? 'border-destructive/35 bg-destructive/5' : 'border-border bg-background/55'}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <CollectionThumb collection={collection} />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{getName(collection)}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{disabled ? 'Fora dos seus rolls' : 'Ativa nos seus rolls'}</div></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled={Boolean(busyKey)} onClick={() => toggleCollection(collection, 'disabled')} className={`min-h-10 rounded-xl border px-2 text-xs font-black ${disabled ? 'border-destructive/35 bg-destructive/10 text-destructive' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>{busyKey === `disabled:${id}` ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> {disabled ? 'Reativar' : 'Disable'}</span>}</button>
                      <button type="button" disabled={Boolean(busyKey)} onClick={() => toggleCollection(collection, 'wished')} className={`min-h-10 rounded-xl border px-2 text-xs font-black ${wished ? 'border-amber-400/45 bg-amber-400/10 text-amber-300' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>{busyKey === `wished:${id}` ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><Heart className={`h-3.5 w-3.5 ${wished ? 'fill-current' : ''}`} /> {wished ? 'Wished' : 'Wish coleção'}</span>}</button>
                    </div>
                  </div>;
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <div><div className="text-xs font-black uppercase tracking-[.14em] text-primary">Wishlist</div><h2 className="mt-1 text-2xl font-black">Cartas desejadas</h2><p className="mt-1 text-xs text-muted-foreground">Pesquise qualquer carta-base. Quando ela sair, o resultado será destacado como WISH.</p></div>
              <div className="mt-4"><SearchBox value={cardQuery} onChange={setCardQuery} placeholder="Personagem, boss, item..." /></div>
              <div className="mt-4 space-y-2">
                {cardResults.length ? cardResults.map((card) => {
                  const id = String(card.id || card.card_id || '');
                  const wished = wishedCardSet.has(id);
                  return <div key={id} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-background/55 p-2.5">
                    <CardThumb card={card} />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{getName(card)}</div><div className="truncate text-[10px] font-bold text-muted-foreground">{card.collection || card.series || card.collectionName || 'DeckVerse'}{card.rarity ? ` · ${card.rarity}` : ''}</div></div>
                    <button type="button" disabled={Boolean(busyKey)} onClick={() => toggleCard(card)} aria-label={wished ? `Remover ${getName(card)} da wishlist` : `Adicionar ${getName(card)} à wishlist`} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${wished ? 'border-amber-400/45 bg-amber-400/10 text-amber-300' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>{busyKey === `card:${id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${wished ? 'fill-current' : ''}`} />}</button>
                  </div>;
                }) : <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma carta encontrada.</div>}
              </div>
            </section>
          </div>
        )}

        <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><div className="flex items-center gap-2 text-sm font-black"><Zap className="h-4 w-4 text-primary" /> Pronto para rolar</div><p className="mt-1 text-xs leading-6 text-muted-foreground">O servidor aplica sua Disablelist antes de escolher cada carta. Pity e taxas de raridade continuam funcionando normalmente.</p></div>
          <Link to="/gacha" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground"><Sparkles className="h-4 w-4" /> Ir para o Gacha</Link>
        </section>
      </main>
    </div>
  );
}

function Loading() { return <div className="min-h-screen bg-background"><Navbar /><main className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></main></div>; }
function Metric({ label, value }) { return <div className="rounded-2xl border border-border bg-background/65 p-3 text-center"><div className="text-xl font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>; }
function SearchBox({ value, onChange, placeholder }) { return <label className="relative block min-w-[220px]"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary/50" /></label>; }
function CollectionThumb({ collection }) { const src = collection.image_url || collection.cover_url || collection.coverUrl || ''; return <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageOff className="h-4 w-4 text-muted-foreground/35" /></div>}</div>; }
function CardThumb({ card }) { const src = card.image_url || card.imageUrl || ''; return <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageOff className="h-4 w-4 text-muted-foreground/35" /></div>}</div>; }
