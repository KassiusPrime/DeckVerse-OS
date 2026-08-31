import React, { useEffect, useState } from 'react';
import { Activity, Database, Gem, Search, Settings2, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import Navbar from './Navbar';
import { adminAdjustBalance, adminSetGachaConfig, getGameSettings } from './services/supabase/gameService.js';
import { getAdminLedger, getPlayerInventory, searchProfiles } from './services/supabase/adminService.js';

const TABS = [
  { key: 'players', label: 'Jogadores', icon: UserRound },
  { key: 'economy', label: 'Economia', icon: Gem },
  { key: 'gacha', label: 'Gacha', icon: Sparkles },
  { key: 'audit', label: 'Auditoria', icon: Activity },
];

export default function AdminSupabase() {
  const [tab, setTab] = useState('players');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><ShieldCheck className="h-4 w-4" /> Administração</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Controle do jogo sem novo deploy.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Conta, economia, inventário, taxas e logs são protegidos por RLS e funções transacionais no Supabase.</p>
          <div className="mt-6 flex flex-wrap gap-2">{TABS.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black ${tab === key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
        </section>
        <section className="mt-6">{tab === 'players' && <PlayersPanel />}{tab === 'economy' && <EconomyPanel />}{tab === 'gacha' && <GachaConfigPanel />}{tab === 'audit' && <AuditPanel />}</section>
      </main>
    </div>
  );
}

function PlayersPanel() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState('');

  const runSearch = async () => {
    setError('');
    try { setPlayers(await searchProfiles(query)); } catch (err) { setError(err?.message || 'Falha na busca.'); }
  };
  const selectPlayer = async (player) => {
    setSelected(player);
    try { setInventory(await getPlayerInventory(player.id)); } catch (err) { setError(err?.message || 'Falha ao carregar inventário.'); }
  };

  return <div className="grid gap-5 lg:grid-cols-[420px_1fr]"><div className="rounded-3xl border border-border bg-card p-5"><h2 className="text-lg font-black">Buscar conta</h2><div className="mt-4 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Discord ID ou Display Name" className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/60" /><button type="button" onClick={runSearch} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Search className="h-4 w-4" /></button></div>{error && <p className="mt-3 text-xs text-destructive">{error}</p>}<div className="mt-4 space-y-2">{players.map((player) => <button type="button" key={player.id} onClick={() => selectPlayer(player)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left hover:border-primary/45"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-muted">{player.avatar_url ? <img src={player.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}</div><div className="min-w-0"><div className="truncate text-sm font-black">{player.display_name || player.discord_username || 'Jogador'}</div><div className="truncate text-[10px] text-muted-foreground">Discord: {player.discord_username || 'vinculado'}</div></div></button>)}</div></div><div className="rounded-3xl border border-border bg-card p-5"><h2 className="text-lg font-black">Inventário</h2>{!selected ? <div className="mt-4 flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">Selecione um jogador.</div> : <><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><MiniMetric label="Nível" value={selected.level} /><MiniMetric label="PWR" value={selected.pwr} /><MiniMetric label="Fragmentos" value={selected.astral_shards} /><MiniMetric label="Éter" value={selected.ether_cores} /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{inventory.map((entry) => <div key={entry.id} className="overflow-hidden rounded-xl border border-border bg-background"><div className="aspect-[4/5] bg-muted">{entry.cards?.image_url ? <img src={entry.cards.image_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="p-2"><div className="text-xs font-black">{entry.cards?.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{entry.cards?.rarity} · {entry.copies}x</div></div></div>)}</div></>}</div></div>;
}

function EconomyPanel() {
  const [profileId, setProfileId] = useState('');
  const [currency, setCurrency] = useState('astral_shards');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('Ajuste administrativo');
  const [message, setMessage] = useState('');
  const submit = async () => { try { const data = await adminAdjustBalance(profileId, currency, amount, reason); setMessage(`Saldo atualizado: ${JSON.stringify(data)}`); } catch (err) { setMessage(err?.message || 'Falha no ajuste.'); } };
  return <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><Gem className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Ajuste econômico</h2></div><p className="mt-2 text-sm text-muted-foreground">Valores positivos adicionam; negativos deduzem. Toda alteração gera ledger e audit log.</p><div className="mt-5 grid gap-3"><input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Profile UUID selecionado pela busca" className="h-12 rounded-xl border border-border bg-background px-3 text-sm" /><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm"><option value="astral_shards">Fragmentos Astrais</option><option value="ether_cores">Núcleos de Éter</option></select><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm" /><input value={reason} onChange={(e) => setReason(e.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm" /><button type="button" onClick={submit} className="min-h-12 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Aplicar ajuste</button>{message && <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">{message}</div>}</div></div>;
}

function GachaConfigPanel() {
  const [config, setConfig] = useState(null);
  const [raw, setRaw] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { getGameSettings().then((settings) => { const next = settings.gacha_config || {}; setConfig(next); setRaw(JSON.stringify(next, null, 2)); }).catch((err) => setMessage(err.message)); }, []);
  const save = async () => { try { const parsed = JSON.parse(raw); const data = await adminSetGachaConfig(parsed); setConfig(data.value); setMessage('Configuração salva sem novo deploy.'); } catch (err) { setMessage(err?.message || 'JSON inválido.'); } };
  return <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Configuração dinâmica do Gacha</h2></div><p className="mt-2 text-sm text-muted-foreground">Custos, taxas, pity e limites vivem em `game_settings`. O front e o bot leem a mesma configuração.</p><textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="mt-5 min-h-[360px] w-full rounded-2xl border border-border bg-background p-4 font-mono text-xs outline-none focus:border-primary/60" /><button type="button" onClick={save} className="mt-3 min-h-12 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground">Salvar configuração</button>{message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}{config && <div className="mt-4 flex items-center gap-2 text-xs text-primary"><Database className="h-4 w-4" />Config carregada do Supabase.</div>}</div>;
}

function AuditPanel() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { getAdminLedger().then(setRows).catch((err) => setError(err.message)); }, []);
  return <div className="rounded-3xl border border-border bg-card p-5"><h2 className="text-lg font-black">Audit log</h2>{error && <p className="mt-3 text-xs text-destructive">{error}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="text-muted-foreground"><tr><th className="p-2">Data</th><th className="p-2">Ação</th><th className="p-2">Alvo</th><th className="p-2">Payload</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-2 text-muted-foreground">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="p-2 font-bold">{row.action}</td><td className="p-2 text-muted-foreground">{row.target_profile_id || '—'}</td><td className="p-2 font-mono text-[10px] text-muted-foreground">{JSON.stringify(row.payload || {})}</td></tr>)}</tbody></table></div></div>;
}

function MiniMetric({ label, value }) { return <div className="rounded-xl border border-border bg-background p-3 text-center"><div className="text-lg font-black">{value ?? 0}</div><div className="text-[9px] font-black uppercase tracking-[.1em] text-muted-foreground">{label}</div></div>; }
