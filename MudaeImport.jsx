import React, { useMemo, useState } from 'react';
import { CheckCircle2, CopyCheck, FileInput, Loader2, SearchX, Sparkles } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { importMudaeCards } from './services/supabase/economySocialService.js';

const META_PATTERNS = [
  /^\$mm[y]?\b/i,
  /^(marry|claim|like|note|series|value|kakera|key|keys|divorces?)\s*[:：]/i,
  /^page\s+\d+/i,
  /^[-=*_]{3,}$/,
];

export function parseMudaeExport(raw) {
  const text = String(raw || '').replace(/\r/g, '\n');
  const candidates = [];
  for (const original of text.split(/\n+/)) {
    let line = original.trim();
    if (!line || META_PATTERNS.some((rx) => rx.test(line))) continue;
    line = line
      .replace(/^[-•·▸►»>]+\s*/, '')
      .replace(/^\*{1,2}|\*{1,2}$/g, '')
      .replace(/^`+|`+$/g, '')
      .replace(/\s+\$\d[\d,\.]*\s*$/i, '')
      .replace(/\s+\(\d+\s*(?:keys?|kakera)\)\s*$/i, '')
      .replace(/\s+[❤💖💘💞💗💓💝💟💛💚💙💜🖤🤍]+.*$/u, '')
      .replace(/\s+\|\s+.*$/, '')
      .trim();
    if (!line || line.length < 2 || line.length > 120) continue;
    candidates.push(line);
  }
  return [...new Set(candidates)];
}

export default function MudaeImport() {
  const { isAuthenticated, navigateToLogin, refreshProfile } = useAuth();
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const names = useMemo(() => parseMudaeExport(raw), [raw]);

  const runImport = async () => {
    if (!isAuthenticated) return navigateToLogin();
    if (!names.length) return setError('Nenhum nome de personagem foi detectado no texto colado.');
    setBusy(true); setError(''); setResult(null);
    try {
      const data = await importMudaeCards(names);
      setResult(data || {});
      await refreshProfile?.();
    } catch (err) {
      setError(err?.message || 'Falha ao importar a lista do Mudae.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-primary/25 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-primary"><FileInput className="h-4 w-4" /> Integração Mudae</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Importação em lote de $mm / $mmy</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Cole a exportação bruta. O navegador extrai os nomes; o servidor normaliza, cruza com os IDs canônicos do DeckVerse e converte duplicatas em Astral Shards.</p>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <label className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Exportação bruta</label>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'Cole aqui a saída do Mudae…\nEx.:\n- Makima\n- Power\n- Denji'} className="mt-3 min-h-[360px] w-full resize-y rounded-2xl border border-border bg-background p-4 font-mono text-sm leading-6 outline-none focus:border-primary/50" />
            {error && <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
            <button onClick={runImport} disabled={busy || names.length === 0} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{isAuthenticated ? `Conferir e importar ${names.length} nomes` : 'Entrar para importar'}</button>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5"><div className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Prévia do parser</div><div className="mt-2 text-3xl font-black">{names.length}</div><div className="text-xs text-muted-foreground">nomes únicos detectados</div><div className="mt-4 max-h-52 space-y-1 overflow-y-auto">{names.slice(0, 40).map((name) => <div key={name} className="truncate rounded-lg bg-background/60 px-2 py-1.5 text-xs">{name}</div>)}{names.length > 40 && <div className="text-[10px] text-muted-foreground">+ {names.length - 40} nomes</div>}</div></div>
            <div className="rounded-3xl border border-border bg-card p-5 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">Regra de duplicata:</strong> uma carta já existente no seu acervo não aumenta cópias por importação; ela vira AS conforme a raridade. Isso impede farm duplicado via exportações repetidas.</div>
          </aside>
        </div>

        {result && <section className="mt-7"><h2 className="mb-4 text-2xl font-black">Relatório de conferência</h2><div className="grid gap-4 md:grid-cols-3"><Report icon={CheckCircle2} title="Importadas com sucesso" data={result.imported} tone="emerald" /><Report icon={CopyCheck} title="Repetidas → Shards" data={result.duplicates} tone="amber" suffix={result.shards_awarded ? `${result.shards_awarded} AS` : ''} /><Report icon={SearchX} title="Não encontradas" data={result.not_found} tone="rose" /></div></section>}
      </main>
    </div>
  );
}

function Report({ icon: Icon, title, data, suffix, tone }) {
  const rows = Array.isArray(data) ? data : [];
  const toneClass = tone === 'emerald' ? 'text-emerald-300 border-emerald-400/20' : tone === 'amber' ? 'text-amber-300 border-amber-400/20' : 'text-rose-300 border-rose-400/20';
  return <div className={`rounded-3xl border bg-card p-5 ${toneClass}`}><div className="flex items-center gap-2"><Icon className="h-5 w-5" /><h3 className="text-sm font-black">{title}</h3></div><div className="mt-3 text-3xl font-black">{rows.length}</div>{suffix && <div className="mt-1 text-xs font-black">{suffix}</div>}<div className="mt-4 max-h-64 space-y-1 overflow-y-auto">{rows.map((row, index) => <div key={`${row.card_id || row.input}-${index}`} className="rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-[11px] text-foreground"><div className="truncate font-bold">{row.name || row.input}</div>{row.shards ? <div className="text-[9px] text-muted-foreground">+{row.shards} AS</div> : null}</div>)}</div></div>;
}
