import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Database, Gem, Minus, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, Trash2, UserRound } from 'lucide-react';
import Navbar from './Navbar';
import { adminAdjustBalance, adminSetGachaConfig, getGameSettings } from './services/supabase/gameService.js';
import { getAdminLedger, getPlayerInventory, grantCard, removeCard, searchCards, searchProfiles, transferCard } from './services/supabase/adminService.js';

const TABS = [
  { key: 'players', label: 'Jogadores', icon: UserRound },
  { key: 'economy', label: 'Economia', icon: Gem },
  { key: 'gacha', label: 'Gacha', icon: Sparkles },
  { key: 'audit', label: 'Auditoria', icon: Activity },
];

export default function AdminSupabase() {
  const [tab, setTab] = useState('players');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><ShieldCheck className="h-4 w-4" /> Administração</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Controle do jogo sem novo deploy.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Conta, economia, inventário, taxas e logs são protegidos por RLS e funções transacionais no Supabase.</p>
          {selectedPlayer && <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-muted">{selectedPlayer.avatar_url ? <img src={selectedPlayer.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}</div><div><div className="text-xs font-black">{selectedPlayer.display_name || selectedPlayer.discord_username || 'Jogador'}</div><div className="text-[10px] text-muted-foreground">Conta selecionada para operações administrativas</div></div></div>}
          <div className="mt-6 flex flex-wrap gap-2">{TABS.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black ${tab === key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
        </section>

        <section className="mt-6">
          {tab === 'players' && <PlayersPanel selected={selectedPlayer} onSelect={setSelectedPlayer} />}
          {tab === 'economy' && <EconomyPanel selected={selectedPlayer} onSelect={setSelectedPlayer} />}
          {tab === 'gacha' && <GachaConfigPanel />}
          {tab === 'audit' && <AuditPanel />}
        </section>
      </main>
    </div>
  );
}

function PlayerSearch({ onSelect, compact = false }) {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const runSearch = async () => {
    setError('');
    try { setPlayers(await searchProfiles(query)); } catch (err) { setError(err?.message || 'Falha na busca.'); }
  };
  return <div className={compact ? '' : 'rounded-3xl border border-border bg-card p-5'}><h2 className="text-lg font-black">Buscar conta</h2><p className="mt-1 text-xs text-muted-foreground">Discord ID, username ou Display Name.</p><div className="mt-4 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Buscar jogador" className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/60" /><button type="button" onClick={runSearch} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Search className="h-4 w-4" /></button></div>{error && <p className="mt-3 text-xs text-destructive">{error}</p>}<div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">{players.map((player) => <button type="button" key={player.id} onClick={() => onSelect(player)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left hover:border-primary/45"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-muted">{player.avatar_url ? <img src={player.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}</div><div className="min-w-0"><div className="truncate text-sm font-black">{player.display_name || player.discord_username || 'Jogador'}</div><div className="truncate text-[10px] text-muted-foreground">Discord: {player.discord_username || 'vinculado'} · Nível {player.level}</div></div></button>)}</div></div>;
}

function PlayersPanel({ selected, onSelect }) {
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [cardResults, setCardResults] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [copies, setCopies] = useState(1);
  const [reason, setReason] = useState('Ajuste de inventário');
  const [targetQuery, setTargetQuery] = useState('');
  const [targets, setTargets] = useState([]);
  const [transferTarget, setTransferTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadInventory = async (player) => {
    if (!player) { setInventory([]); return; }
    try { setInventory(await getPlayerInventory(player.id)); setError(''); } catch (err) { setError(err?.message || 'Falha ao carregar inventário.'); }
  };
  useEffect(() => { loadInventory(selected); }, [selected]);

  const findCards = async () => { try { setCardResults(await searchCards(cardQuery)); } catch (err) { setError(err?.message || 'Falha ao buscar carta.'); } };
  const findTargets = async () => { try { setTargets((await searchProfiles(targetQuery)).filter((player) => player.id !== selected?.id)); } catch (err) { setError(err?.message || 'Falha ao buscar destino.'); } };

  const runInventoryAction = async (action) => {
    if (!selected || !selectedCard) return setMessage('Selecione um jogador e uma carta.');
    setBusy(true); setMessage('');
    try {
      if (action === 'grant') await grantCard(selected.id, selectedCard.id, copies, reason);
      if (action === 'remove') await removeCard(selected.id, selectedCard.id, copies, reason);
      if (action === 'transfer') {
        if (!transferTarget) throw new Error('Selecione o jogador de destino.');
        await transferCard(selected.id, transferTarget.id, selectedCard.id, copies, reason);
      }
      await loadInventory(selected);
      setMessage(action === 'grant' ? 'Carta adicionada ao inventário.' : action === 'remove' ? 'Carta removida do inventário.' : 'Carta transferida com sucesso.');
    } catch (err) { setMessage(err?.message || 'Operação não concluída.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <PlayerSearch onSelect={onSelect} />
      <div className="space-y-5">
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-lg font-black">Inventário do jogador</h2>
          {!selected ? <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">Selecione um jogador.</div> : <><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><MiniMetric label="Nível" value={selected.level} /><MiniMetric label="PWR" value={selected.pwr} /><MiniMetric label="Fragmentos" value={selected.astral_shards} /><MiniMetric label="Éter" value={selected.ether_cores} /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">{inventory.map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedCard({ id: entry.card_id, ...entry.cards })} className={`overflow-hidden rounded-xl border bg-background text-left ${selectedCard?.id === entry.card_id ? 'border-primary ring-2 ring-primary/15' : 'border-border'}`}><div className="aspect-[4/5] bg-muted">{entry.cards?.image_url ? <img src={entry.cards.image_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="p-2"><div className="truncate text-xs font-black">{entry.cards?.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{entry.cards?.rarity} · {entry.copies}x</div></div></button>)}</div></>}
        </div>

        {selected && <div className="rounded-3xl border border-border bg-card p-5"><h2 className="text-lg font-black">Adicionar, remover ou transferir</h2><p className="mt-1 text-xs text-muted-foreground">As alterações são transacionais e registradas no audit log.</p><div className="mt-4 grid gap-3 lg:grid-cols-2"><div><label className="text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground">Buscar carta</label><div className="mt-1 flex gap-2"><input value={cardQuery} onChange={(e) => setCardQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findCards()} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Nome da carta" /><button type="button" onClick={findCards} className="h-11 rounded-xl border border-border px-3"><Search className="h-4 w-4" /></button></div><div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-border bg-background">{cardResults.map((card) => <button key={card.id} type="button" onClick={() => setSelectedCard(card)} className={`flex w-full items-center gap-2 border-b border-border p-2 text-left last:border-0 ${selectedCard?.id === card.id ? 'bg-primary/10' : ''}`}><div className="h-10 w-9 overflow-hidden rounded-lg bg-muted">{card.image_url ? <img src={card.image_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><div className="truncate text-xs font-black">{card.name}</div><div className="text-[9px] text-muted-foreground">{card.rarity} · {card.entity_type}</div></div></button>)}</div></div><div><label className="text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground">Carta selecionada</label><div className="mt-1 min-h-11 rounded-xl border border-border bg-background p-3 text-xs font-black">{selectedCard?.name || 'Nenhuma'}</div><div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="1" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" /><input value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Motivo" /></div></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><button type="button" disabled={busy || !selectedCard} onClick={() => runInventoryAction('grant')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" />Adicionar</button><button type="button" disabled={busy || !selectedCard} onClick={() => runInventoryAction('remove')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 text-xs font-black text-destructive disabled:opacity-50"><Minus className="h-4 w-4" />Remover</button><div className="sm:col-span-2"><div className="flex gap-2"><input value={targetQuery} onChange={(e) => setTargetQuery(e.target.value)} placeholder="Buscar destino" className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs" /><button type="button" onClick={findTargets} className="h-11 rounded-xl border border-border px-3"><Search className="h-4 w-4" /></button></div>{targets.length > 0 && <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-border bg-background">{targets.map((player) => <button type="button" key={player.id} onClick={() => { setTransferTarget(player); setTargets([]); }} className="block w-full border-b border-border p-2 text-left text-xs last:border-0">{player.display_name || player.discord_username}</button>)}</div>}</div></div>
          {transferTarget && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-xs"><span>Destino: <strong>{transferTarget.display_name || transferTarget.discord_username}</strong></span><button type="button" disabled={busy || !selectedCard} onClick={() => runInventoryAction('transfer')} className="flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3 font-black text-primary-foreground"><Send className="h-3.5 w-3.5" />Transferir</button></div>}
          {message && <div className="mt-3 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">{message}</div>}</div>}
        {error && <p className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function EconomyPanel({ selected, onSelect }) {
  const [currency, setCurrency] = useState('astral_shards');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('Ajuste administrativo');
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (!selected) return setMessage('Selecione um jogador primeiro.');
    try {
      const data = await adminAdjustBalance(selected.id, currency, amount, reason);
      const next = { ...selected, [currency]: data.balance };
      onSelect(next);
      setMessage(`Saldo atualizado para ${data.balance}.`);
    } catch (err) { setMessage(err?.message || 'Falha no ajuste.'); }
  };
  return <div className="grid gap-5 lg:grid-cols-[360px_1fr]"><PlayerSearch onSelect={onSelect} /><div className="rounded-3xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><Gem className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Ajuste econômico</h2></div><p className="mt-2 text-sm text-muted-foreground">Valores positivos adicionam; negativos deduzem. Toda alteração gera ledger e audit log.</p>{selected ? <div className="mt-5 grid gap-3"><div className="rounded-xl border border-border bg-background p-3"><div className="text-sm font-black">{selected.display_name || selected.discord_username}</div><div className="mt-1 text-xs text-muted-foreground">Fragmentos: {selected.astral_shards} · Núcleos: {selected.ether_cores}</div></div><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm"><option value="astral_shards">Fragmentos Astrais</option><option value="ether_cores">Núcleos de Éter</option></select><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 500 ou -250" className="h-12 rounded-xl border border-border bg-background px-3 text-sm" /><input value={reason} onChange={(e) => setReason(e.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm" /><button type="button" onClick={submit} className="min-h-12 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Aplicar ajuste</button>{message && <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">{message}</div>}</div> : <div className="mt-5 flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">Selecione uma conta na busca.</div>}</div></div>;
}

function GachaConfigPanel() {
  const [config, setConfig] = useState(null);
  const [raw, setRaw] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { getGameSettings().then((settings) => { const next = settings.gacha_config || {}; setConfig(next); setRaw(JSON.stringify(next, null, 2)); }).catch((err) => setMessage(err.message)); }, []);
  const save = async () => { try { const parsed = JSON.parse(raw); const data = await adminSetGachaConfig(parsed); setConfig(data.value); setMessage('Configuração salva sem novo deploy.'); } catch (err) { setMessage(err?.message || 'JSON inválido.'); } };
  return <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Configuração dinâmica do Gacha</h2></div><p className="mt-2 text-sm text-muted-foreground">Custos, taxas, pity e limites vivem no banco. O site e o bot leem a mesma configuração.</p><textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="mt-5 min-h-[360px] w-full rounded-2xl border border-border bg-background p-4 font-mono text-xs outline-none focus:border-primary/60" /><button type="button" onClick={save} className="mt-3 min-h-12 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">Salvar configuração</button>{message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}{config && <div className="mt-4 flex items-center gap-2 text-xs text-primary"><Database className="h-4 w-4" />Configuração carregada do banco.</div>}</div>;
}

function AuditPanel() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  useEffect(() => { getAdminLedger().then(setRows).catch((err) => setError(err.message)); }, []);
  const visible = useMemo(() => rows.filter((row) => !filter || String(row.action || '').toLowerCase().includes(filter.toLowerCase())), [rows, filter]);
  return <div className="rounded-3xl border border-border bg-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-black">Audit log</h2><p className="mt-1 text-xs text-muted-foreground">Alterações administrativas em economia e inventário.</p></div><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar por ação" className="h-11 rounded-xl border border-border bg-background px-3 text-sm" /></div>{error && <p className="mt-3 text-xs text-destructive">{error}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="text-muted-foreground"><tr><th className="p-2">Data</th><th className="p-2">Ação</th><th className="p-2">Alvo técnico</th><th className="p-2">Detalhes</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-2 text-muted-foreground">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="p-2 font-bold">{row.action}</td><td className="p-2 text-muted-foreground">{row.target_profile_id || '—'}</td><td className="p-2 font-mono text-[10px] text-muted-foreground">{JSON.stringify(row.payload || {})}</td></tr>)}</tbody></table></div></div>;
}

function MiniMetric({ label, value }) { return <div className="rounded-xl border border-border bg-background p-3 text-center"><div className="text-lg font-black">{value ?? 0}</div><div className="text-[9px] font-black uppercase tracking-[.1em] text-muted-foreground">{label}</div></div>; }
