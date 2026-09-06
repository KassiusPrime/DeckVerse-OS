import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Check, Coins, Loader2, Plus, Save, Search, X } from 'lucide-react';
import Navbar from '@/Navbar';
import { Input } from '@/input';
import { useAuth } from '@/AuthContext';
import { getMyRoster } from '@/services/supabase/gameService.js';
import {
  acceptTrade,
  closeTrade,
  confirmTradeProposal,
  createTrade,
  getCardsByIds,
  getMyTrades,
  setTradeOffer,
} from '@/services/supabase/economyService.js';
import { useToast } from '@/use-toast';

const STATUS = {
  draft: ['Em negociação', 'text-amber-300', 'border-amber-400/30 bg-amber-400/5'],
  ready: ['Pronta para aceitar', 'text-cyan-300', 'border-cyan-400/30 bg-cyan-400/5'],
  completed: ['Concluída', 'text-emerald-300', 'border-emerald-400/30 bg-emerald-400/5'],
  cancelled: ['Cancelada', 'text-muted-foreground', 'border-border bg-card'],
  rejected: ['Recusada', 'text-red-300', 'border-red-400/30 bg-red-400/5'],
};

function friendly(error) {
  const raw = String(error?.message || error || 'Falha ao processar a troca.');
  if (raw.includes('RECIPIENT_NOT_FOUND')) return 'Jogador não encontrado. Use nome, usuário ou ID do Discord vinculado ao DeckVerse.';
  if (raw.includes('TRADE_ASSET_UNAVAILABLE')) return 'Uma das cartas oferecidas não está mais disponível no seu acervo.';
  if (raw.includes('TRADE_NOT_READY')) return 'Os dois jogadores precisam confirmar a proposta antes de aceitá-la.';
  if (raw.includes('INSUFFICIENT_DECK_CREDITS')) return 'Deck Credits insuficientes para concluir essa troca.';
  if (raw.includes('CANNOT_TRADE_SELF')) return 'Você não pode abrir uma troca consigo mesmo.';
  return raw;
}

function assetIds(trades) {
  const ids = [];
  for (const t of trades || []) {
    for (const side of [t.sender_assets, t.receiver_assets]) {
      if (Array.isArray(side)) for (const asset of side) if (asset?.card_id) ids.push(asset.card_id);
    }
  }
  return [...new Set(ids)];
}

export default function Trade() {
  const { isAuthenticated, profile, navigateToLogin, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [search, setSearch] = useState('');

  const tradesQuery = useQuery({ queryKey: ['my-trades-live'], queryFn: getMyTrades, enabled: isAuthenticated, refetchInterval: 10_000 });
  const rosterQuery = useQuery({ queryKey: ['my-roster-trade-live'], queryFn: getMyRoster, enabled: isAuthenticated });
  const trades = tradesQuery.data || [];
  const roster = rosterQuery.data || [];
  const referencedIds = useMemo(() => assetIds(trades), [trades]);
  const cardsQuery = useQuery({ queryKey: ['trade-card-details', referencedIds.join('|')], queryFn: () => getCardsByIds(referencedIds), enabled: isAuthenticated && referencedIds.length > 0 });
  const cardMap = useMemo(() => new Map((cardsQuery.data || []).map((c) => [c.id, c])), [cardsQuery.data]);

  const refresh = async () => Promise.all([tradesQuery.refetch(), rosterQuery.refetch(), cardsQuery.refetch(), refreshProfile()]);
  const mutation = useMutation({
    mutationFn: async ({ action, payload }) => {
      if (action === 'create') return createTrade(payload.recipient);
      if (action === 'offer') return setTradeOffer(payload.tradeId, payload.assets, payload.dc);
      if (action === 'confirm') return confirmTradeProposal(payload.tradeId);
      if (action === 'accept') return acceptTrade(payload.tradeId);
      if (action === 'cancel') return closeTrade(payload.tradeId, payload.status || 'cancelled');
      throw new Error('UNKNOWN_TRADE_ACTION');
    },
    onSuccess: async (_, variables) => {
      await refresh();
      if (variables.action === 'create') { setShowNew(false); setRecipient(''); toast({ title: 'Troca aberta', description: 'Agora cada jogador pode montar e confirmar sua própria oferta.' }); }
      if (variables.action === 'offer') toast({ title: 'Oferta atualizada', description: 'Qualquer alteração remove as confirmações anteriores por segurança.' });
      if (variables.action === 'confirm') toast({ title: 'Proposta confirmada' });
      if (variables.action === 'accept') toast({ title: 'Aceite registrado', description: 'Quando ambos aceitarem, a troca será liquidada automaticamente.' });
      if (variables.action === 'cancel') toast({ title: variables.payload.status === 'rejected' ? 'Troca recusada' : 'Troca cancelada' });
    },
    onError: (error) => toast({ title: 'Não foi possível concluir', description: friendly(error), variant: 'destructive' }),
  });

  const filtered = useMemo(() => trades.filter((t) => !search || `${t.sender_name} ${t.receiver_name} ${t.status}`.toLowerCase().includes(search.toLowerCase())), [trades, search]);

  if (!isAuthenticated) return <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto max-w-3xl p-8 text-center"><h1 className="text-3xl font-black">Trocas DeckVerse</h1><p className="mt-3 text-muted-foreground">Entre para negociar cartas e Deck Credits com outros jogadores.</p><button onClick={navigateToLogin} className="mt-5 rounded-xl bg-primary px-5 py-3 font-black text-primary-foreground">Entrar</button></main></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-cyan-300"><ArrowLeftRight className="h-4 w-4" /> Trocas P2P</div><h1 className="mt-2 text-3xl font-black tracking-tight">Negociação em duas etapas.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Cada lado monta sua oferta, ambos confirmam o conteúdo e só então ambos aceitam. A segunda aceitação transfere tudo atomicamente. Deck Credits recebidos sofrem taxa de 5%.</p></div>
          <button onClick={() => setShowNew(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-black text-black"><Plus className="h-4 w-4" /> Nova troca</button>
        </header>

        <div className="relative mt-7 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar jogador ou status" className="pl-9" /></div>

        <section className="mt-5 space-y-4">
          {tradesQuery.isLoading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : filtered.map((trade) => <TradePanel key={trade.id} trade={trade} profileId={profile?.id} roster={roster} cardMap={cardMap} busy={mutation.isPending} mutate={mutation.mutate} />)}
          {!tradesQuery.isLoading && !filtered.length && <div className="flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">Nenhuma troca encontrada.</div>}
        </section>
      </main>

      {showNew && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={(e) => e.target === e.currentTarget && setShowNew(false)}><div className="w-full max-w-md rounded-3xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">Abrir nova troca</h2><p className="mt-1 text-xs text-muted-foreground">Nome, username ou ID do Discord do destinatário.</p></div><button onClick={() => setShowNew(false)}><X className="h-5 w-5" /></button></div><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="ex.: milk058294" className="mt-5" /><button disabled={!recipient.trim() || mutation.isPending} onClick={() => mutation.mutate({ action: 'create', payload: { recipient } })} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-400 font-black text-black disabled:opacity-40">{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Abrir negociação'}</button></div></div>}
    </div>
  );
}

function TradePanel({ trade, profileId, roster, cardMap, busy, mutate }) {
  const iAmSender = trade.sender_profile_id === profileId;
  const myName = iAmSender ? trade.sender_name : trade.receiver_name;
  const otherName = iAmSender ? trade.receiver_name : trade.sender_name;
  const myAssets = iAmSender ? trade.sender_assets : trade.receiver_assets;
  const otherAssets = iAmSender ? trade.receiver_assets : trade.sender_assets;
  const myDc = iAmSender ? trade.sender_dc : trade.receiver_dc;
  const otherDc = iAmSender ? trade.receiver_dc : trade.sender_dc;
  const myConfirmed = iAmSender ? trade.sender_confirmed : trade.receiver_confirmed;
  const otherConfirmed = iAmSender ? trade.receiver_confirmed : trade.sender_confirmed;
  const myAccepted = iAmSender ? trade.sender_accepted : trade.receiver_accepted;
  const otherAccepted = iAmSender ? trade.receiver_accepted : trade.sender_accepted;
  const [selectedCard, setSelectedCard] = useState(myAssets?.[0]?.card_id || '');
  const [qty, setQty] = useState(Number(myAssets?.[0]?.quantity || 1));
  const [dc, setDc] = useState(Number(myDc || 0));
  const config = STATUS[trade.status] || STATUS.draft;
  const editable = trade.status === 'draft';
  const canAccept = trade.status === 'ready';

  return <article className={`rounded-3xl border p-5 ${config[2]}`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">{myName} ↔ {otherName}</div><div className={`mt-1 text-sm font-black ${config[1]}`}>{config[0]}</div></div><div className="text-[10px] font-mono text-muted-foreground">{trade.id}</div></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><OfferSummary title="Sua oferta" assets={myAssets} dc={myDc} cardMap={cardMap} confirmed={myConfirmed} accepted={myAccepted} /><OfferSummary title={`Oferta de ${otherName}`} assets={otherAssets} dc={otherDc} cardMap={cardMap} confirmed={otherConfirmed} accepted={otherAccepted} /></div>

    {editable && <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4"><h3 className="text-xs font-black uppercase tracking-wider">Editar sua oferta</h3><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_100px_150px_auto]"><select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-xs"><option value="">Sem carta</option>{roster.map((r) => <option key={r.card_id} value={r.card_id}>{r.cards?.name} ({r.copies}x)</option>)}</select><Input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} /><div className="relative"><Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" /><Input type="number" min="0" value={dc} onChange={(e) => setDc(Math.max(0, Number(e.target.value) || 0))} className="pl-9" /></div><button disabled={busy} onClick={() => mutate({ action: 'offer', payload: { tradeId: trade.id, assets: selectedCard ? [{ card_id: selectedCard, quantity: qty }] : [], dc } })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/30 px-3 text-xs font-black text-primary"><Save className="h-4 w-4" /> Salvar</button></div><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy || myConfirmed} onClick={() => mutate({ action: 'confirm', payload: { tradeId: trade.id } })} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-black text-black disabled:opacity-40"><Check className="h-4 w-4" /> Confirmar minha oferta</button><button disabled={busy} onClick={() => mutate({ action: 'cancel', payload: { tradeId: trade.id, status: iAmSender ? 'cancelled' : 'rejected' } })} className="min-h-10 rounded-xl border border-destructive/35 px-4 text-xs font-black text-destructive">{iAmSender ? 'Cancelar troca' : 'Recusar troca'}</button></div></div>}

    {canAccept && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-4"><div className="text-xs text-muted-foreground">As duas ofertas foram confirmadas. Revise tudo antes do aceite final.</div><div className="flex gap-2"><button disabled={busy || myAccepted} onClick={() => mutate({ action: 'accept', payload: { tradeId: trade.id } })} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-black text-black disabled:opacity-40"><Check className="h-4 w-4" /> {myAccepted ? 'Você aceitou' : 'Aceitar definitivamente'}</button><button disabled={busy} onClick={() => mutate({ action: 'cancel', payload: { tradeId: trade.id, status: iAmSender ? 'cancelled' : 'rejected' } })} className="min-h-10 rounded-xl border border-destructive/35 px-4 text-xs font-black text-destructive">Sair da troca</button></div></div>}
  </article>;
}

function OfferSummary({ title, assets, dc, cardMap, confirmed, accepted }) {
  return <div className="rounded-2xl border border-border bg-background/70 p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black">{title}</h3><div className="flex gap-1">{confirmed && <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-black text-cyan-300">CONFIRMADA</span>}{accepted && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-300">ACEITA</span>}</div></div><div className="mt-3 space-y-2">{Array.isArray(assets) && assets.length ? assets.map((a, i) => { const card = cardMap.get(a.card_id); return <div key={`${a.card_id}-${i}`} className="flex items-center gap-3"><div className="h-12 w-9 overflow-hidden rounded bg-muted">{card?.image_url ? <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" /> : null}</div><div><div className="text-xs font-black">{card?.name || a.card_id}</div><div className="text-[10px] text-muted-foreground">{a.quantity || 1}x</div></div></div>; }) : <div className="text-xs text-muted-foreground">Sem cartas.</div>}<div className="flex items-center gap-2 text-xs font-black text-amber-300"><Coins className="h-4 w-4" />{Number(dc || 0).toLocaleString('pt-BR')} DC</div></div></div>;
}
