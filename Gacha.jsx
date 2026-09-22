import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Gem, Loader2, SlidersHorizontal, Sparkles, Stars, Zap } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { getMetaGameState } from './services/supabase/metagameService.js';
import { isGachaV2Enabled, openPack } from './services/supabase/gameService.js';

const RARITY_ORDER = ['R', 'SR', 'SSR', 'UR', 'LR', 'MR'];

function friendlyGachaError(error) {
  const message = String(error?.message || error || 'Não foi possível abrir o pacote.');
  if (message.includes('GACHA_V2_DISABLED')) return 'O Gacha v2 ainda está bloqueado para validação.';
  if (message.includes('NO_GACHA_CARDS_AVAILABLE')) return 'Não existem cartas elegíveis para este pacote.';
  if (message.includes('ROLL_COUNT_EXCEEDS_LEVEL_LIMIT')) return 'A quantidade de aberturas excede o limite liberado pelo seu nível.';
  if (message.includes('INSUFFICIENT_BALANCE')) return 'Deck Credits insuficientes.';
  return message;
}

export default function Gacha() {
  const { isAuthenticated, profile, navigateToLogin, refreshProfile } = useAuth();
  const [count, setCount] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const metaQuery = useQuery({ queryKey: ['metagame-state'], queryFn: getMetaGameState, enabled: isAuthenticated, staleTime: 5_000 });
  const flagQuery = useQuery({ queryKey: ['feature-flag', 'gacha_v2'], queryFn: isGachaV2Enabled, staleTime: 10_000 });
  const enabled = Boolean(flagQuery.data);

  const level = Number(profile?.level || 1);
  const maxBatch = Math.min(100, 10 + Math.floor(level / 10) * 5);
  const options = useMemo(() => [...new Set([1, 5, 10, maxBatch].filter((value) => value <= maxBatch))], [maxBatch]);

  const execute = async () => {
    if (!isAuthenticated) return navigateToLogin();
    if (!enabled) {
      setError('O Gacha v2 está desabilitado pela Feature Flag.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await openPack(count);
      setResult(data);
      await Promise.all([refreshProfile(), metaQuery.refetch()]);
    } catch (err) {
      setError(friendlyGachaError(err));
    } finally {
      setBusy(false);
    }
  };

  const pulls = Array.isArray(result?.pulls) ? result.pulls : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><Stars className="h-4 w-4" /> Gacha v2</div>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] ${enabled ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-border bg-background text-muted-foreground'}`}>
              {enabled ? 'Ativo' : 'Bloqueado'}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-[-.04em] sm:text-5xl">Abra pacotes com Deck Credits.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">Cada abertura é uma operação transacional: cobrança, geração das cartas, ledger, auditoria, idempotência e observabilidade ficam vinculados ao mesmo transaction_id.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:min-w-[460px]">
              <Metric label="Nível" value={level} />
              <Metric label="Pity" value={profile?.pity_counter ?? 0} />
              <Metric label="Deck Credits" value={profile?.deck_credits ?? 0} />
              <Metric label="Limite" value={`${maxBatch}x`} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Abrir pacote</h2>
              <Link to="/game?tab=disables" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.12em] text-primary hover:underline"><SlidersHorizontal className="h-3.5 w-3.5" /> Filtros</Link>
            </div>
            <div className="mt-5">
              <label className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Quantidade</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {options.map((value) => <button type="button" key={value} onClick={() => setCount(value)} className={`min-h-11 rounded-xl border text-sm font-black ${count === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>{value}x</button>)}
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-xs font-black"><Gem className="h-4 w-4 text-primary" /> Moeda oficial</div>
              <div className="mt-1 text-sm font-black">Deck Credits</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Custo configurado pelo servidor: 100 DC por abertura.</div>
            </div>
            <button type="button" onClick={execute} disabled={busy || !enabled} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {!enabled ? 'Gacha bloqueado' : `Abrir ${count}x`}
            </button>
            {error && <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black">Resultado</h2>
              {result?.transaction_id && <span className="rounded-full border border-border bg-background px-3 py-1 text-[9px] font-mono text-muted-foreground">{result.transaction_id}</span>}
            </div>
            {!pulls.length
              ? <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 text-center text-sm text-muted-foreground">Seus drops aparecerão aqui.</div>
              : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{pulls.map((pull, index) => <DropCard key={`${pull.card_id || pull.name}-${index}`} pull={pull} />)}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }) { return <div className="rounded-2xl border border-border bg-background/70 px-3 py-3 text-center"><div className="text-lg font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>; }

function DropCard({ pull }) {
  const rarity = String(pull.rarity || 'R').toUpperCase();
  const order = RARITY_ORDER.indexOf(rarity);
  return <div className={`overflow-hidden rounded-2xl border bg-background ${order >= 3 ? 'border-primary/45 shadow-[0_0_30px_hsl(var(--primary)/.08)]' : 'border-border'}`}>
    <div className="aspect-[4/5] bg-muted">{pull.image_url ? <img src={pull.image_url} alt={pull.name || 'Drop'} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-8 w-8 text-muted-foreground/30" /></div>}</div>
    <div className="p-3"><div className="text-[10px] font-black text-primary">{rarity}</div><div className="mt-1 line-clamp-2 text-sm font-black">{pull.name}</div></div>
  </div>;
}
