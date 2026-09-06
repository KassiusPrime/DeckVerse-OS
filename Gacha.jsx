import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Gem, Heart, KeyRound, Loader2, LockKeyhole, Save, SlidersHorizontal, Sparkles, Stars, Ticket, Zap } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { rollGacha } from './services/supabase/gameService.js';
import { getMetaGameState } from './services/supabase/metagameService.js';
import { buyRollLimitUnlock, getRollProgression, setLevelProgression } from './services/supabase/economyService.js';

const RARITY_ORDER = ['R', 'SR', 'SSR', 'UR', 'LR', 'MR'];

function friendlyGachaError(error) {
  const message = String(error?.message || error || 'Não foi possível executar o giro.');
  if (message.includes('NO_GACHA_CARDS_AVAILABLE_FOR_FILTER') || message.includes('NO_GACHA_CARDS_AVAILABLE')) return 'Sua Disablelist removeu todas as cartas elegíveis. Reative pelo menos uma coleção para continuar.';
  if (message.includes('ROLL_COUNT_EXCEEDS_LEVEL_LIMIT')) return 'Essa quantidade excede seu limite atual de giros. Aumente o limite por nível ou compre o Expansor +10.';
  if (message.includes('ROLL_LIMIT_ALREADY_MAX')) return 'Seu limite de giros já atingiu o máximo permitido.';
  if (message.includes('PROGRESSION_POINTS_EXCEEDED')) return 'A distribuição excede os pontos liberados pelo seu nível.';
  if (message.includes('INSUFFICIENT_FREE_ROLLS')) return 'Você não possui Rolls gratuitos suficientes.';
  if (message.includes('INSUFFICIENT_DECK_CREDITS')) return 'Deck Credits insuficientes.';
  if (message.includes('INSUFFICIENT_BALANCE')) return 'Saldo insuficiente para esse roll.';
  return message;
}

export default function Gacha() {
  const { isAuthenticated, profile, navigateToLogin, refreshProfile } = useAuth();
  const [count, setCount] = useState(1);
  const [currency, setCurrency] = useState('astral_shards');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
  const [rollAllocation, setRollAllocation] = useState(0);

  const metaQuery = useQuery({ queryKey: ['metagame-state'], queryFn: getMetaGameState, enabled: isAuthenticated, staleTime: 5_000 });
  const progressionQuery = useQuery({ queryKey: ['roll-progression'], queryFn: getRollProgression, enabled: isAuthenticated, staleTime: 5_000 });
  const meta = metaQuery.data || {};
  const progression = progressionQuery.data || {};

  const level = Number(profile?.level || progression.level || 1);
  const availablePoints = Number(progression.available_points || Math.max(level - 1, 0));
  const maxBatch = Number(progression.max_batch || 10);
  const luckPoints = Math.max(0, availablePoints - rollAllocation);
  const options = useMemo(() => [...new Set([1, 5, 10, maxBatch].filter((value) => value >= 1 && value <= maxBatch))], [maxBatch]);

  useEffect(() => {
    if (progressionQuery.data) setRollAllocation(Number(progressionQuery.data.roll_points || 0));
  }, [progressionQuery.data]);

  useEffect(() => {
    if (count > maxBatch) setCount(maxBatch);
  }, [count, maxBatch]);

  const refreshAll = async () => Promise.all([refreshProfile(), metaQuery.refetch(), progressionQuery.refetch()]);

  const execute = async () => {
    if (!isAuthenticated) return navigateToLogin();
    setBusy(true);
    setError('');
    try {
      const data = await rollGacha(count, currency);
      setResult(data);
      await refreshAll();
    } catch (err) {
      setError(friendlyGachaError(err));
    } finally {
      setBusy(false);
    }
  };

  const saveProgression = async () => {
    if (!isAuthenticated) return navigateToLogin();
    setProgressBusy(true); setError('');
    try {
      await setLevelProgression(rollAllocation, luckPoints);
      await refreshAll();
    } catch (err) { setError(friendlyGachaError(err)); }
    finally { setProgressBusy(false); }
  };

  const buyUnlock = async () => {
    if (!isAuthenticated) return navigateToLogin();
    setProgressBusy(true); setError('');
    try {
      await buyRollLimitUnlock();
      await refreshAll();
    } catch (err) { setError(friendlyGachaError(err)); }
    finally { setProgressBusy(false); }
  };

  const pulls = Array.isArray(result?.pulls) ? result.pulls : [];
  const wishedDrops = pulls.filter((pull) => pull?.wished || pull?.is_wished || pull?.collection_wished).length;
  const keysGained = pulls.filter((pull) => pull?.key_gained).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><Stars className="h-4 w-4" /> Gacha cósmico</div>
            <Link to="/game?tab=disables" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-xs font-black text-muted-foreground transition hover:border-primary/50 hover:text-primary"><SlidersHorizontal className="h-4 w-4" /> Disables & Wishs</Link>
          </div>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div><h1 className="text-3xl font-black tracking-[-.04em] sm:text-5xl">Giros individuais ou em lote.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">O servidor valida saldo, seu limite real, Sorte Cósmica e a Disablelist. A cada nível você decide entre +1 no limite ou mais sorte — e pode redistribuir quando quiser.</p></div>
            <div className="grid grid-cols-4 gap-2 sm:min-w-[460px]"><Metric label="Nível" value={level} /><Metric label="Sorte" value={`${Number(progression.cosmic_luck || profile?.cosmic_luck || 1).toFixed(2)}x`} /><Metric label="Rolls" value={meta.free_rolls ?? 0} /><Metric label="Limite" value={`${maxBatch}x`} /></div>
          </div>
        </section>

        {isAuthenticated && (
          <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Progressão por nível</h2><p className="mt-1 text-xs text-muted-foreground">{availablePoints} ponto(s) liberado(s). Arraste para decidir quantos vão para limite; o restante vai para sorte.</p></div><div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-black text-primary">{rollAllocation} Limite · {luckPoints} Sorte</div></div>
              <input aria-label="Distribuição de pontos entre limite e sorte" type="range" min="0" max={availablePoints} step="1" value={Math.min(rollAllocation, availablePoints)} onChange={(e) => setRollAllocation(Number(e.target.value))} className="mt-5 w-full accent-primary" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground"><span>← mais Sorte</span><span>+1 limite por ponto · +2% no multiplicador de sorte por ponto</span><span>mais Limite →</span></div>
              <button type="button" onClick={saveProgression} disabled={progressBusy || progressionQuery.isLoading} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-xs font-black text-primary disabled:opacity-50"><Save className="h-4 w-4" /> Salvar distribuição</button>
            </div>
            <div className="rounded-3xl border border-amber-400/25 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2 text-amber-300"><LockKeyhole className="h-5 w-5" /><h2 className="text-base font-black">Expansor de Giros +{progression.roll_unlock_amount || 10}</h2></div>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">Compra permanente que aumenta seu limite de giro em lote em +{progression.roll_unlock_amount || 10}, até o teto global de {progression.hard_max || 100}.</p>
              <button type="button" onClick={buyUnlock} disabled={progressBusy || maxBatch >= Number(progression.hard_max || 100)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-black text-black disabled:opacity-40"><Zap className="h-4 w-4" /> Comprar por {Number(progression.roll_unlock_cost_dc || 2500).toLocaleString('pt-BR')} DC</button>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Configurar giro</h2><Link to="/game?tab=disables" className="text-[10px] font-black uppercase tracking-[.12em] text-primary hover:underline">Filtros</Link></div>
            <div className="mt-5"><label className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Quantidade</label><div className="mt-2 grid grid-cols-4 gap-2">{options.map((value) => <button type="button" key={value} onClick={() => setCount(value)} className={`min-h-11 rounded-xl border text-sm font-black ${count === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>{value}x</button>)}</div></div>
            <div className="mt-5"><label className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Moeda</label><div className="mt-2 grid gap-2"><CurrencyButton active={currency === 'free_rolls'} onClick={() => setCurrency('free_rolls')} icon={Ticket} title="Rolls gratuitos" value={meta.free_rolls ?? 0} /><CurrencyButton active={currency === 'astral_shards'} onClick={() => setCurrency('astral_shards')} icon={Sparkles} title="Fragmentos Astrais" value={profile?.astral_shards ?? '—'} /><CurrencyButton active={currency === 'ether_cores'} onClick={() => setCurrency('ether_cores')} icon={Gem} title="Núcleos de Éter" value={profile?.ether_cores ?? '—'} /></div></div>
            <button type="button" onClick={execute} disabled={busy} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{isAuthenticated ? `Girar ${count}x` : 'Entrar para girar'}</button>
            {error && <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">Resultado</h2><div className="flex items-center gap-2">{wishedDrops > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-[10px] font-black text-amber-300"><Heart className="h-3 w-3 fill-current" /> {wishedDrops} WISH</span>}{keysGained > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[10px] font-black text-primary"><KeyRound className="h-3 w-3" /> +{keysGained} KEY</span>}{result?.pity_after !== undefined && <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-black text-muted-foreground">Pity: {result.pity_after}</span>}</div></div>
            {!pulls.length ? <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 text-center text-sm text-muted-foreground">Seus drops aparecerão aqui.</div> : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{pulls.map((pull, index) => <DropCard key={`${pull.card_id || pull.name}-${index}`} pull={pull} />)}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }) { return <div className="rounded-2xl border border-border bg-background/70 px-3 py-3 text-center"><div className="text-lg font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>; }
function CurrencyButton({ active, onClick, icon: Icon, title, value }) { return <button type="button" onClick={onClick} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left ${active ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}><Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} /><div className="flex-1"><div className="text-xs font-black">{title}</div><div className="text-[10px] text-muted-foreground">Saldo: {value}</div></div></button>; }
function DropCard({ pull }) { const rarity = String(pull.rarity || 'R').toUpperCase(); const order = RARITY_ORDER.indexOf(rarity); const wished = Boolean(pull.wished || pull.is_wished); const collectionWished = Boolean(pull.collection_wished); const keyGained = Boolean(pull.key_gained); return <div className={`relative overflow-hidden rounded-2xl border bg-background ${wished ? 'border-amber-300/70 shadow-[0_0_34px_rgba(251,191,36,.16)]' : order >= 3 ? 'border-primary/45 shadow-[0_0_30px_hsl(var(--primary)/.08)]' : 'border-border'}`}>{wished && <div className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-amber-300/45 bg-black/75 px-2 py-1 text-[9px] font-black text-amber-200 backdrop-blur"><Heart className="h-3 w-3 fill-current" /> WISH</div>}{keyGained && <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-primary/45 bg-black/75 px-2 py-1 text-[9px] font-black text-primary backdrop-blur"><KeyRound className="h-3 w-3" /> KEY</div>}<div className="aspect-[4/5] bg-muted">{pull.image_url ? <img src={pull.image_url} alt={pull.name || 'Drop'} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-8 w-8 text-muted-foreground/30" /></div>}</div><div className="p-3"><div className="flex items-center justify-between gap-2"><div className="text-[10px] font-black text-primary">{rarity}</div>{collectionWished && !wished && <div className="text-[9px] font-black text-amber-300">WISH COLEÇÃO</div>}</div><div className="mt-1 line-clamp-2 text-sm font-black">{pull.name}</div>{pull.copies > 1 && <div className="mt-1 text-[10px] text-muted-foreground">Cópias: {pull.copies}</div>}</div></div>; }
