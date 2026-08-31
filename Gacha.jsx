import React, { useMemo, useState } from 'react';
import { Gem, Loader2, Sparkles, Stars, Zap } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { rollGacha } from './services/supabase/gameService.js';

const RARITY_ORDER = ['R', 'SR', 'SSR', 'UR', 'LR', 'MR'];

export default function Gacha() {
  const { isAuthenticated, profile, navigateToLogin, refreshProfile } = useAuth();
  const [count, setCount] = useState(1);
  const [currency, setCurrency] = useState('astral_shards');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const level = Number(profile?.level || 1);
  const maxBatch = Math.min(50, 10 + Math.floor(level / 10) * 5);
  const options = useMemo(() => [...new Set([1, 5, 10, maxBatch].filter((value) => value <= maxBatch))], [maxBatch]);

  const execute = async () => {
    if (!isAuthenticated) return navigateToLogin();
    setBusy(true);
    setError('');
    try {
      const data = await rollGacha(count, currency);
      setResult(data);
      await refreshProfile();
    } catch (err) {
      setError(err?.message || 'Não foi possível executar o giro.');
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
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><Stars className="h-4 w-4" /> Gacha cósmico</div>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div><h1 className="text-3xl font-black tracking-[-.04em] sm:text-5xl">Giros individuais ou em lote.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">O servidor valida saldo, limite por nível, taxas e Sorte Cósmica. O navegador nunca escolhe o resultado.</p></div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]"><Metric label="Nível" value={level} /><Metric label="Pity" value={profile?.pity_counter ?? 0} /><Metric label="Limite" value={`${maxBatch}x`} /></div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-black">Configurar giro</h2>
            <div className="mt-5"><label className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Quantidade</label><div className="mt-2 grid grid-cols-4 gap-2">{options.map((value) => <button type="button" key={value} onClick={() => setCount(value)} className={`min-h-11 rounded-xl border text-sm font-black ${count === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>{value}x</button>)}</div></div>
            <div className="mt-5"><label className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">Moeda</label><div className="mt-2 grid gap-2"><CurrencyButton active={currency === 'astral_shards'} onClick={() => setCurrency('astral_shards')} icon={Sparkles} title="Fragmentos Astrais" value={profile?.astral_shards ?? '—'} /><CurrencyButton active={currency === 'ether_cores'} onClick={() => setCurrency('ether_cores')} icon={Gem} title="Núcleos de Éter" value={profile?.ether_cores ?? '—'} /></div></div>
            <button type="button" onClick={execute} disabled={busy} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{isAuthenticated ? `Girar ${count}x` : 'Entrar para girar'}</button>
            {error && <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Resultado</h2>{result?.pity_after !== undefined && <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-black text-muted-foreground">Pity: {result.pity_after}</span>}</div>
            {!pulls.length ? <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 text-center text-sm text-muted-foreground">Seus drops aparecerão aqui.</div> : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{pulls.map((pull, index) => <DropCard key={`${pull.card_id || pull.name}-${index}`} pull={pull} />)}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }) { return <div className="rounded-2xl border border-border bg-background/70 px-3 py-3 text-center"><div className="text-lg font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{label}</div></div>; }
function CurrencyButton({ active, onClick, icon: Icon, title, value }) { return <button type="button" onClick={onClick} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left ${active ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}><Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} /><div className="flex-1"><div className="text-xs font-black">{title}</div><div className="text-[10px] text-muted-foreground">Saldo: {value}</div></div></button>; }
function DropCard({ pull }) { const rarity = String(pull.rarity || 'R').toUpperCase(); const order = RARITY_ORDER.indexOf(rarity); return <div className={`overflow-hidden rounded-2xl border bg-background ${order >= 3 ? 'border-primary/45 shadow-[0_0_30px_hsl(var(--primary)/.08)]' : 'border-border'}`}><div className="aspect-[4/5] bg-muted">{pull.image_url ? <img src={pull.image_url} alt={pull.name || 'Drop'} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-8 w-8 text-muted-foreground/30" /></div>}</div><div className="p-3"><div className="text-[10px] font-black text-primary">{rarity}</div><div className="mt-1 line-clamp-2 text-sm font-black">{pull.name}</div>{pull.copies > 1 && <div className="mt-1 text-[10px] text-muted-foreground">Cópias: {pull.copies}</div>}</div></div>; }
