import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Coins, Loader2, Search, ShoppingCart, Tag, X } from 'lucide-react';
import Navbar from '@/Navbar';
import { Input } from '@/input';
import { useAuth } from '@/AuthContext';
import { getMyRoster } from '@/services/supabase/gameService.js';
import { browseMarket, buyMarketListing, cancelMarketListing, createMarketListing, sellCard } from '@/services/supabase/economyService.js';
import { useToast } from '@/use-toast';

function errText(error) {
  const raw = String(error?.message || error || 'Falha na operação.');
  if (raw.includes('INSUFFICIENT_DECK_CREDITS')) return 'Deck Credits insuficientes.';
  if (raw.includes('INSUFFICIENT_COPIES')) return 'Você não possui cópias suficientes.';
  if (raw.includes('CARD_IS_EQUIPPED')) return 'Remova a carta do equipamento antes de vender a última cópia.';
  if (raw.includes('LISTING_NOT_ACTIVE')) return 'Esse anúncio não está mais disponível.';
  if (raw.includes('CANNOT_BUY_OWN_LISTING')) return 'Você não pode comprar o próprio anúncio.';
  return raw;
}

export default function Market() {
  const { isAuthenticated, profile, navigateToLogin, refreshProfile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [listingCard, setListingCard] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(100);

  const marketQuery = useQuery({ queryKey: ['market-live'], queryFn: browseMarket, enabled: isAuthenticated, refetchInterval: 15_000 });
  const rosterQuery = useQuery({ queryKey: ['my-roster-market'], queryFn: getMyRoster, enabled: isAuthenticated });
  const listings = marketQuery.data || [];
  const roster = rosterQuery.data || [];

  const refresh = async () => Promise.all([
    marketQuery.refetch(), rosterQuery.refetch(), refreshProfile(), qc.invalidateQueries({ queryKey: ['my-roster'] }),
  ]);

  const mutation = useMutation({
    mutationFn: async ({ type, payload }) => {
      if (type === 'buy') return buyMarketListing(payload.id);
      if (type === 'cancel') return cancelMarketListing(payload.id);
      if (type === 'list') return createMarketListing(payload.cardId, payload.quantity, payload.price);
      if (type === 'sell') return sellCard(payload.cardId, payload.quantity);
      throw new Error('UNKNOWN_MARKET_ACTION');
    },
    onSuccess: async (_, variables) => {
      await refresh();
      if (variables.type === 'buy') toast({ title: 'Carta adquirida', description: 'A compra foi liquidada em Deck Credits.' });
      if (variables.type === 'cancel') toast({ title: 'Anúncio cancelado', description: 'As cartas voltaram ao seu acervo.' });
      if (variables.type === 'list') { toast({ title: 'Carta anunciada', description: 'A cópia ficou reservada até vender ou cancelar.' }); setListingCard(null); }
      if (variables.type === 'sell') toast({ title: 'Carta vendida ao sistema', description: 'Deck Credits creditados imediatamente.' });
    },
    onError: (error) => toast({ title: 'Não foi possível concluir', description: errText(error), variant: 'destructive' }),
  });

  const filtered = useMemo(() => listings.filter((l) => !search || `${l.card_name} ${l.collection_name}`.toLowerCase().includes(search.toLowerCase())), [listings, search]);

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto max-w-3xl p-8 text-center"><h1 className="text-3xl font-black">Mercado DeckVerse</h1><p className="mt-3 text-muted-foreground">Entre para comprar, anunciar e vender cartas.</p><button onClick={navigateToLogin} className="mt-5 rounded-xl bg-primary px-5 py-3 font-black text-primary-foreground">Entrar</button></main></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-amber-300"><ArrowLeftRight className="h-4 w-4" /> Mercado real</div><h1 className="mt-2 text-3xl font-black tracking-tight">Comprar, anunciar ou liquidar.</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Os anúncios reservam a carta no servidor. Compras, cancelamentos e vendas são transacionais — sem estado local simulado.</p></div>
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 px-4 py-3"><div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Deck Credits</div><div className="mt-1 flex items-center gap-2 text-xl font-black text-amber-300"><Coins className="h-5 w-5" />{Number(profile?.deck_credits || 0).toLocaleString('pt-BR')}</div></div>
        </header>

        <section className="mt-7 rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Seu acervo</h2><p className="text-xs text-muted-foreground">Venda imediatamente pelo valor de liquidação ou anuncie pelo preço que quiser.</p></div><span className="text-xs font-bold text-muted-foreground">{roster.length} cartas únicas</span></div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {roster.map((entry) => {
              const card = entry.cards || {}; return <div key={entry.card_id} className="w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-background"><div className="aspect-[3/4] bg-muted">{card.image_url ? <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" /> : null}</div><div className="p-3"><div className="truncate text-sm font-black">{card.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{card.rarity} · {entry.copies}x</div><div className="mt-3 grid gap-2"><button disabled={mutation.isPending} onClick={() => mutation.mutate({ type: 'sell', payload: { cardId: entry.card_id, quantity: 1 } })} className="min-h-9 rounded-lg border border-border px-2 text-[10px] font-black hover:border-amber-400/50">Vender 1 agora</button><button onClick={() => { setListingCard(entry); setQuantity(1); setPrice(100); }} className="min-h-9 rounded-lg bg-amber-400 px-2 text-[10px] font-black text-black">Anunciar</button></div></div></div>;
            })}
            {!roster.length && <div className="flex min-h-40 w-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">Seu acervo ainda está vazio.</div>}
          </div>
        </section>

        <section className="mt-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Anúncios ativos</h2><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar carta ou coleção" className="pl-9" /></div></div>
          {marketQuery.isLoading ? <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : filtered.length ? <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{filtered.map((listing) => <MarketCard key={listing.id} listing={listing} own={listing.seller_profile_id === profile?.id} busy={mutation.isPending} onBuy={() => mutation.mutate({ type: 'buy', payload: listing })} onCancel={() => mutation.mutate({ type: 'cancel', payload: listing })} />)}</div> : <div className="mt-6 flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground"><Tag className="mr-2 h-5 w-5" /> Nenhum anúncio encontrado.</div>}
        </section>
      </main>

      <AnimatePresence>{listingCard && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={(e) => e.target === e.currentTarget && setListingCard(null)}><motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="w-full max-w-md rounded-3xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">Anunciar {listingCard.cards?.name}</h3><p className="mt-1 text-xs text-muted-foreground">Você possui {listingCard.copies} cópia(s).</p></div><button onClick={() => setListingCard(null)}><X className="h-5 w-5" /></button></div><label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Quantidade</label><Input type="number" min="1" max={listingCard.copies} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(listingCard.copies, Number(e.target.value) || 1)))} className="mt-2" /><label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Preço total em Deck Credits</label><Input type="number" min="1" value={price} onChange={(e) => setPrice(Math.max(1, Number(e.target.value) || 1))} className="mt-2" /><button disabled={mutation.isPending} onClick={() => mutation.mutate({ type: 'list', payload: { cardId: listingCard.card_id, quantity, price } })} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-400 font-black text-black">{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publicar anúncio'}</button></motion.div></div>}</AnimatePresence>
    </div>
  );
}

function MarketCard({ listing, own, busy, onBuy, onCancel }) {
  return <article className="overflow-hidden rounded-2xl border border-border bg-card"><div className="aspect-[3/4] bg-muted">{listing.image_url ? <img src={listing.image_url} alt={listing.card_name} className="h-full w-full object-cover" /> : null}</div><div className="p-3"><div className="text-[10px] font-black text-primary">{listing.rarity} · {listing.quantity}x</div><div className="mt-1 truncate text-sm font-black">{listing.card_name}</div><div className="mt-1 truncate text-[10px] text-muted-foreground">{listing.collection_name} · {listing.seller_name}</div><div className="mt-3 flex items-center gap-1 text-sm font-black text-amber-300"><Coins className="h-4 w-4" />{Number(listing.price_dc).toLocaleString('pt-BR')}</div>{own ? <button disabled={busy} onClick={onCancel} className="mt-3 min-h-9 w-full rounded-lg border border-destructive/35 text-[10px] font-black text-destructive">Cancelar</button> : <button disabled={busy} onClick={onBuy} className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded-lg bg-primary text-[10px] font-black text-primary-foreground"><ShoppingCart className="h-3.5 w-3.5" /> Comprar</button>}</div></article>;
}
