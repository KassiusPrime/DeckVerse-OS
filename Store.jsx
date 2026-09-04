import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Coins, Gift, Loader2, RefreshCw, ShoppingBag, Sparkles, Stars } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { buyDailyMarketCard, getDailyMarket, listBanners, rollBanner } from './services/supabase/economySocialService.js';

export default function Store() {
  const { isAuthenticated, profile, navigateToLogin, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [activeBanner, setActiveBanner] = useState(null);
  const [lastPulls, setLastPulls] = useState([]);
  const [error, setError] = useState('');

  const banners = useQuery({ queryKey: ['gacha-banners'], queryFn: listBanners, staleTime: 60_000 });
  const market = useQuery({ queryKey: ['daily-market'], queryFn: getDailyMarket, staleTime: 60_000 });

  const pullMutation = useMutation({
    mutationFn: ({ bannerId, count }) => rollBanner(bannerId, count),
    onSuccess: async (data) => {
      setLastPulls(Array.isArray(data?.pulls) ? data.pulls : []);
      setError('');
      await refreshProfile?.();
      qc.invalidateQueries({ queryKey: ['my-roster'] });
    },
    onError: (err) => setError(err?.message || 'Não foi possível concluir o sorteio.'),
  });

  const marketMutation = useMutation({
    mutationFn: buyDailyMarketCard,
    onSuccess: async () => {
      setError('');
      await refreshProfile?.();
      qc.invalidateQueries({ queryKey: ['daily-market'] });
      qc.invalidateQueries({ queryKey: ['my-roster'] });
    },
    onError: (err) => setError(err?.message || 'Não foi possível comprar o item.'),
  });

  const pull = (banner, count) => {
    if (!isAuthenticated) return navigateToLogin();
    setActiveBanner(banner.id);
    pullMutation.mutate({ bannerId: banner.id, count });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-primary"><ShoppingBag className="h-4 w-4" /> Economia DeckVerse</div>
              <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-5xl">Loja, banners e mercado diário.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">DeckCredits (DC) movem a economia principal. Fragmentos Astrais (AS) ficam reservados para forja, desencanto e recompensas especiais.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[330px]">
              <Balance icon={Coins} label="DeckCredits" value={profile?.deck_credits ?? '—'} suffix="DC" />
              <Balance icon={Sparkles} label="Astral Shards" value={profile?.astral_shards ?? '—'} suffix="AS" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/trade" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-xs font-black"><ArrowLeftRight className="h-4 w-4 text-primary" /> Trocas & presentes</Link>
            <Link to="/import-mudae" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-xs font-black"><Gift className="h-4 w-4 text-primary" /> Importar Mudae</Link>
          </div>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-primary"><Stars className="h-4 w-4" /> Banners temáticos</div><h2 className="mt-1 text-2xl font-black">Sorteios por coleção</h2></div>
            <span className="text-[10px] font-bold text-muted-foreground">Pity Raro: 10 · Épico: 50</span>
          </div>
          {banners.isLoading ? <LoadingBlock /> : banners.isError ? <ErrorBlock text="Falha ao carregar banners." /> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(banners.data || []).map((banner) => {
                const cover = banner.collections?.cover_url;
                const collectionName = banner.collections?.name || banner.name;
                const busy = pullMutation.isPending && activeBanner === banner.id;
                return <article key={banner.id} className="overflow-hidden rounded-3xl border border-border bg-card">
                  <div className="relative aspect-[16/8] bg-muted">
                    {cover ? <img src={cover} alt={collectionName} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><Stars className="h-10 w-10 text-muted-foreground/25" /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                    <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md"><div className="text-sm font-black text-white">{collectionName}</div></div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-muted-foreground"><span>1x {banner.cost_1x} DC</span><span>10x {banner.cost_10x} DC</span></div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled={busy} onClick={() => pull(banner, 1)} className="min-h-11 rounded-xl border border-primary/35 bg-primary/10 text-xs font-black text-primary disabled:opacity-50">1x</button>
                      <button type="button" disabled={busy} onClick={() => pull(banner, 10)} className="min-h-11 rounded-xl bg-primary text-xs font-black text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : '10x'}</button>
                    </div>
                  </div>
                </article>;
              })}
            </div>
          )}
        </section>

        {lastPulls.length > 0 && <section className="mt-7 rounded-3xl border border-primary/25 bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Último sorteio</h2><span className="text-[10px] font-black uppercase tracking-[.13em] text-primary">{lastPulls.length} cartas</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">{lastPulls.map((card, index) => <PullCard key={`${card.card_id}-${index}`} card={card} />)}</div></section>}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-primary"><RefreshCw className="h-4 w-4" /> Rotação de 24h</div><h2 className="mt-1 text-2xl font-black">Mercado diário · 4 slots</h2></div>
            <button type="button" onClick={() => market.refetch()} className="min-h-10 rounded-xl border border-border px-3 text-xs font-black text-muted-foreground">Atualizar</button>
          </div>
          {market.isLoading ? <LoadingBlock /> : market.isError ? <ErrorBlock text="Falha ao carregar mercado diário." /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(market.data || []).map((slot) => <article key={slot.card_id} className="overflow-hidden rounded-3xl border border-border bg-card"><div className="aspect-[4/3] bg-muted">{slot.image_url ? <img src={slot.image_url} alt={slot.name} className="h-full w-full object-cover" loading="lazy" /> : null}</div><div className="p-4"><div className="text-[10px] font-black text-primary">{String(slot.rarity || 'R').toUpperCase()}</div><div className="mt-1 min-h-10 text-sm font-black">{slot.name}</div><div className="mt-3 flex items-center justify-between text-xs"><span className="text-muted-foreground">Valor {slot.nominal_dc} DC</span><strong>{slot.price_dc} DC</strong></div><button type="button" disabled={slot.purchased || marketMutation.isPending} onClick={() => isAuthenticated ? marketMutation.mutate(slot.card_id) : navigateToLogin()} className="mt-3 min-h-11 w-full rounded-xl border border-primary/35 bg-primary/10 text-xs font-black text-primary disabled:opacity-40">{slot.purchased ? 'Comprado hoje' : 'Comprar'}</button></div></article>)}</div>
          )}
        </section>
      </main>
    </div>
  );
}

function Balance({ icon: Icon, label, value, suffix }) { return <div className="rounded-2xl border border-border bg-background/65 p-4"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.13em] text-muted-foreground"><Icon className="h-4 w-4 text-primary" /> {label}</div><div className="mt-2 text-xl font-black tabular-nums">{Number(value || 0).toLocaleString('pt-BR')} <span className="text-xs text-primary">{suffix}</span></div></div>; }
function LoadingBlock() { return <div className="flex min-h-40 items-center justify-center rounded-3xl border border-border bg-card"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>; }
function ErrorBlock({ text }) { return <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">{text}</div>; }
function PullCard({ card }) { return <div className="overflow-hidden rounded-2xl border border-border bg-background"><div className="aspect-[4/5] bg-muted">{card.image_url ? <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" /> : null}</div><div className="p-3"><div className="text-[10px] font-black text-primary">{String(card.rarity || 'R').toUpperCase()}</div><div className="mt-1 line-clamp-2 text-xs font-black">{card.name}</div></div></div>; }
