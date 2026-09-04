import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Check, Coins, Gift, Loader2, Package, Plus, ShieldCheck, X } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import {
  acceptTrade, closeTrade, confirmTrade, createTrade, giftAssets, getMyRosterForTrading,
  listMyTrades, setTradeOffer,
} from './services/supabase/economySocialService.js';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
const parseAssets = (value) => Array.isArray(value) ? value : [];

export default function Trade() {
  const { isAuthenticated, profile, navigateToLogin, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [recipient, setRecipient] = useState('');
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftCardId, setGiftCardId] = useState('');
  const [giftQty, setGiftQty] = useState(1);
  const [giftDc, setGiftDc] = useState(0);
  const [confirmGift, setConfirmGift] = useState(false);
  const [drafts, setDrafts] = useState({});

  const roster = useQuery({ queryKey: ['trade-roster'], queryFn: getMyRosterForTrading, enabled: isAuthenticated });
  const trades = useQuery({ queryKey: ['my-trades-v2'], queryFn: listMyTrades, enabled: isAuthenticated, refetchInterval: 15_000 });

  const sync = async () => {
    setError('');
    await Promise.all([qc.invalidateQueries({ queryKey: ['my-trades-v2'] }), qc.invalidateQueries({ queryKey: ['trade-roster'] })]);
    await refreshProfile?.();
  };
  const fail = (err) => setError(err?.message || 'A operação não pôde ser concluída.');

  const newTrade = useMutation({ mutationFn: createTrade, onSuccess: async () => { setRecipient(''); await sync(); }, onError: fail });
  const saveOffer = useMutation({ mutationFn: ({ id, assets, dc }) => setTradeOffer(id, assets, dc), onSuccess: sync, onError: fail });
  const confirm = useMutation({ mutationFn: confirmTrade, onSuccess: sync, onError: fail });
  const accept = useMutation({ mutationFn: acceptTrade, onSuccess: sync, onError: fail });
  const close = useMutation({ mutationFn: ({ id, status }) => closeTrade(id, status), onSuccess: sync, onError: fail });
  const gift = useMutation({ mutationFn: giftAssets, onSuccess: async () => { setConfirmGift(false); setGiftRecipient(''); setGiftCardId(''); setGiftQty(1); setGiftDc(0); await sync(); }, onError: fail });

  const cards = roster.data || [];
  const selectedGift = cards.find((c) => c.card_id === giftCardId);
  const busy = newTrade.isPending || saveOffer.isPending || confirm.isPending || accept.isPending || close.isPending || gift.isPending;

  if (!isAuthenticated) return <div className="min-h-screen bg-background text-foreground"><Navbar /><main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><ShieldCheck className="h-10 w-10 text-primary" /><h1 className="mt-4 text-2xl font-black">Entre para negociar</h1><p className="mt-2 text-sm text-muted-foreground">Presentes e trocas usam liquidação atômica no servidor.</p><button onClick={navigateToLogin} className="mt-6 min-h-11 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">Entrar</button></main></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-primary"><ArrowLeftRight className="h-4 w-4" /> P2P seguro</div><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Trocas & presentes</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">As duas partes confirmam a proposta e depois aceitam a liquidação. A movimentação de DeckCredits sofre taxa de 5% no fechamento da troca.</p></div>
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3"><div className="text-[9px] font-black uppercase tracking-[.13em] text-muted-foreground">Saldo disponível</div><div className="mt-1 text-xl font-black">{fmt(profile?.deck_credits)} <span className="text-xs text-primary">DC</span></div></div>
          </div>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Presente direto</h2></div>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">Envie carta, item ou DeckCredits por ID/username. A transferência é irreversível após a confirmação.</p>
            <label className="mt-5 block text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">ID ou username</label>
            <input value={giftRecipient} onChange={(e) => setGiftRecipient(e.target.value)} placeholder="@jogador ou ID" className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
            <label className="mt-4 block text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Carta / item opcional</label>
            <select value={giftCardId} onChange={(e) => setGiftCardId(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="">Nenhum</option>{cards.map((card) => <option key={card.card_id} value={card.card_id}>{card.name} · {card.entity_type === 'item' ? 'Item' : 'Carta'} · x{card.copies}</option>)}</select>
            <div className="mt-4 grid grid-cols-2 gap-3"><Field label="Quantidade" type="number" min="1" value={giftQty} onChange={(e) => setGiftQty(e.target.value)} /><Field label="DeckCredits" type="number" min="0" value={giftDc} onChange={(e) => setGiftDc(e.target.value)} /></div>
            <button disabled={!giftRecipient || (!giftCardId && Number(giftDc) <= 0)} onClick={() => setConfirmGift(true)} className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-40">Revisar presente</button>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Abrir troca em escrow</h2></div>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">Crie o canal bilateral. Cada participante define a própria oferta; qualquer edição invalida as confirmações anteriores.</p>
            <label className="mt-5 block text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">ID ou username do outro jogador</label>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="@jogador ou ID" className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
            <button disabled={!recipient.trim() || newTrade.isPending} onClick={() => newTrade.mutate(recipient)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-black text-primary disabled:opacity-40">{newTrade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />} Criar troca</button>
            <div className="mt-5 rounded-xl border border-border bg-background/50 p-3 text-[11px] leading-5 text-muted-foreground"><strong className="text-foreground">Taxa:</strong> 5% somente sobre DC movimentado. Cartas e itens não sofrem taxa.</div>
          </section>
        </div>

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black">Minhas trocas</h2><button onClick={() => trades.refetch()} className="min-h-10 rounded-xl border border-border px-3 text-xs font-black text-muted-foreground">Atualizar</button></div>
          {trades.isLoading ? <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (trades.data || []).length === 0 ? <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhuma troca criada ainda.</div> : <div className="space-y-4">{(trades.data || []).map((trade) => <TradeCard key={trade.id} trade={trade} me={profile?.id} cards={cards} drafts={drafts} setDrafts={setDrafts} busy={busy} onSave={(payload) => saveOffer.mutate(payload)} onConfirm={(id) => confirm.mutate(id)} onAccept={(id) => accept.mutate(id)} onClose={(payload) => close.mutate(payload)} />)}</div>}
        </section>
      </main>

      {confirmGift && <ConfirmModal title="Confirmar presente irreversível" onClose={() => setConfirmGift(false)} onConfirm={() => gift.mutate({ recipient: giftRecipient, cardId: giftCardId || null, quantity: giftCardId ? Number(giftQty) : 0, deckCredits: Number(giftDc) || 0 })} busy={gift.isPending}><p className="text-sm text-muted-foreground">Destino: <strong className="text-foreground">{giftRecipient}</strong></p>{selectedGift && <p className="mt-2 text-sm text-muted-foreground">Asset: <strong className="text-foreground">{selectedGift.name} × {giftQty}</strong></p>}<p className="mt-2 text-sm text-muted-foreground">DeckCredits: <strong className="text-foreground">{fmt(giftDc)} DC</strong></p><p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">Após confirmar, o servidor transfere os ativos imediatamente e não há desfazer automático.</p></ConfirmModal>}
    </div>
  );
}

function TradeCard({ trade, me, cards, drafts, setDrafts, busy, onSave, onConfirm, onAccept, onClose }) {
  const isSender = trade.sender_profile_id === me;
  const myConfirmed = isSender ? trade.sender_confirmed : trade.receiver_confirmed;
  const otherConfirmed = isSender ? trade.receiver_confirmed : trade.sender_confirmed;
  const myAccepted = isSender ? trade.sender_accepted : trade.receiver_accepted;
  const myAssets = parseAssets(isSender ? trade.sender_assets : trade.receiver_assets);
  const otherAssets = parseAssets(isSender ? trade.receiver_assets : trade.sender_assets);
  const myDc = Number(isSender ? trade.sender_dc : trade.receiver_dc) || 0;
  const otherDc = Number(isSender ? trade.receiver_dc : trade.sender_dc) || 0;
  const draft = drafts[trade.id] || { assets: myAssets, dc: myDc };
  const toggle = (card) => {
    const exists = draft.assets.some((a) => (a.card_id || a.id) === card.card_id);
    const assets = exists ? draft.assets.filter((a) => (a.card_id || a.id) !== card.card_id) : [...draft.assets, { card_id: card.card_id, quantity: 1, name: card.name, entity_type: card.entity_type }];
    setDrafts((prev) => ({ ...prev, [trade.id]: { ...draft, assets } }));
  };
  const closed = ['completed', 'cancelled', 'rejected'].includes(trade.status);
  return <article className="rounded-3xl border border-border bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.13em] text-primary">Troca {String(trade.id).slice(0, 8)}</div><div className="mt-1 text-lg font-black">{labelStatus(trade.status)}</div></div><div className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-black text-muted-foreground">Taxa DC 5%</div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><OfferBox title="Sua oferta" assets={myAssets} dc={myDc} confirmed={myConfirmed} /><OfferBox title="Oferta da outra parte" assets={otherAssets} dc={otherDc} confirmed={otherConfirmed} /></div>
    {!closed && trade.status === 'draft' && <div className="mt-5 rounded-2xl border border-border bg-background/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Editar sua oferta</div><div className="mt-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">{cards.map((card) => { const active = draft.assets.some((a) => (a.card_id || a.id) === card.card_id); return <button key={card.card_id} onClick={() => toggle(card)} className={`rounded-xl border p-2 text-left ${active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}><div className="truncate text-[11px] font-black">{card.name}</div><div className="mt-1 text-[9px] text-muted-foreground">{card.entity_type} · x{card.copies}</div></button>; })}</div><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><Field label="DeckCredits na oferta" type="number" min="0" value={draft.dc} onChange={(e) => setDrafts((prev) => ({ ...prev, [trade.id]: { ...draft, dc: e.target.value } }))} /><button disabled={busy} onClick={() => onSave({ id: trade.id, assets: draft.assets, dc: Number(draft.dc) || 0 })} className="mt-auto min-h-11 rounded-xl border border-primary/35 bg-primary/10 px-4 text-xs font-black text-primary disabled:opacity-40">Salvar oferta</button></div></div>}
    <div className="mt-5 flex flex-wrap gap-2">{trade.status === 'draft' && <button disabled={busy || myConfirmed} onClick={() => onConfirm(trade.id)} className="min-h-11 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-40"><Check className="mr-2 inline h-4 w-4" />Confirmar proposta</button>}{trade.status === 'ready' && <button disabled={busy || myAccepted} onClick={() => onAccept(trade.id)} className="min-h-11 rounded-xl bg-emerald-500 px-4 text-xs font-black text-black disabled:opacity-40"><ShieldCheck className="mr-2 inline h-4 w-4" />{myAccepted ? 'Aceite registrado' : 'Aceitar troca'}</button>}{!closed && <button disabled={busy} onClick={() => onClose({ id: trade.id, status: isSender ? 'cancelled' : 'rejected' })} className="min-h-11 rounded-xl border border-border px-4 text-xs font-black text-muted-foreground"><X className="mr-2 inline h-4 w-4" />{isSender ? 'Cancelar' : 'Recusar'}</button>}</div>
  </article>;
}

function OfferBox({ title, assets, dc, confirmed }) { return <div className="rounded-2xl border border-border bg-background/55 p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground">{title}</span><span className={`text-[9px] font-black ${confirmed ? 'text-emerald-300' : 'text-amber-300'}`}>{confirmed ? 'Confirmada' : 'Pendente'}</span></div><div className="mt-3 space-y-1">{assets.length ? assets.map((a, i) => <div key={`${a.card_id}-${i}`} className="flex items-center gap-2 text-xs"><Package className="h-3.5 w-3.5 text-primary" /><span className="truncate">{a.name || a.card_id}</span><strong className="ml-auto">x{a.quantity || 1}</strong></div>) : <div className="text-xs text-muted-foreground">Nenhum asset</div>}</div><div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs"><Coins className="h-3.5 w-3.5 text-primary" /><span>DeckCredits</span><strong className="ml-auto">{fmt(dc)} DC</strong></div></div>; }
function Field({ label, ...props }) { return <label className="block"><span className="text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</span><input {...props} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" /></label>; }
function ConfirmModal({ title, children, onClose, onConfirm, busy }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"><h2 className="text-lg font-black">{title}</h2><div className="mt-4">{children}</div><div className="mt-6 grid grid-cols-2 gap-2"><button onClick={onClose} disabled={busy} className="min-h-11 rounded-xl border border-border text-xs font-black">Voltar</button><button onClick={onConfirm} disabled={busy} className="min-h-11 rounded-xl bg-primary text-xs font-black text-primary-foreground">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Confirmar'}</button></div></div></div>; }
function labelStatus(status) { return ({ draft: 'Proposta em montagem', ready: 'Pronta para aceite final', completed: 'Troca concluída', cancelled: 'Cancelada', rejected: 'Recusada' }[status] || status); }
