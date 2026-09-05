import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, ImageOff, Save, Search, ShieldCheck, WandSparkles } from 'lucide-react';
import { searchSynopsisTargets, updateSynopsis } from '../../../services/supabase/adminService.js';
import { synopsisLengthStatus } from '../../utils/catalogSynopsisPolicy.js';

const FILTERS = [
  ['all', 'Tudo'],
  ['collection', 'Coleções'],
  ['character', 'Personagens'],
  ['form', 'Formas'],
  ['boss', 'Bosses'],
  ['item', 'Itens'],
];

const STATUS_FILTERS = [
  ['all', 'Todos'],
  ['missing', 'Sem sinopse'],
  ['valid', 'Dentro do limite'],
  ['invalid', 'Fora do limite'],
];

const LABELS = {
  collection: 'Coleção',
  character: 'Personagem',
  form: 'Forma',
  boss: 'Boss',
  item: 'Item',
};

function editorialKind(target) {
  return target?.entityType || 'character';
}

export default function SynopsisAdminPanel() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const runSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await searchSynopsisTargets(query, kind, 100);
      setResults(rows);
      if (selected) {
        const refreshed = rows.find((row) => row.scope === selected.scope && row.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (err) {
      setError(err?.message || 'Não foi possível carregar as sinopses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runSearch(); }, [kind]);

  const visible = useMemo(() => results.filter((target) => {
    const state = synopsisLengthStatus(target.synopsis, editorialKind(target));
    if (statusFilter === 'missing') return state.missing;
    if (statusFilter === 'valid') return state.valid;
    if (statusFilter === 'invalid') return !state.missing && !state.valid;
    return true;
  }), [results, statusFilter]);

  const draftState = synopsisLengthStatus(draft, selected ? editorialKind(selected) : 'character');
  const currentState = selected ? synopsisLengthStatus(selected.synopsis, editorialKind(selected)) : null;

  const selectTarget = (target) => {
    setSelected(target);
    setDraft(target.synopsis || '');
    setMessage('');
    setError('');
  };

  const useDescriptionAsBase = () => {
    if (!selected?.description) return;
    setDraft(selected.description.trim());
    setMessage('Descrição carregada como rascunho. Ajuste o texto até entrar no limite editorial.');
  };

  const save = async () => {
    if (!selected || !draftState.valid) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const data = await updateSynopsis(selected.scope, selected.id, draft);
      const next = { ...selected, synopsis: data?.synopsis || draft.trim() };
      setSelected(next);
      setDraft(next.synopsis);
      setResults((rows) => rows.map((row) => row.scope === next.scope && row.id === next.id ? next : row));
      setMessage(selected.synopsis?.trim() ? 'Sinopse atualizada e registrada no audit log.' : 'Sinopse criada e registrada no audit log.');
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar a sinopse.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">Editor de Sinopses</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Acesso exclusivo de administrador. Crie ou edite sinopses de coleções, personagens, formas, bosses e itens sem abrir permissão pública de escrita no catálogo.</p>

        <div className="mt-5 flex gap-2">
          <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Buscar por nome..." className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/60" /></label>
          <button type="button" onClick={runSearch} className="h-11 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground">Buscar</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">{FILTERS.map(([value, label]) => <button key={value} type="button" onClick={() => setKind(value)} className={`min-h-9 rounded-lg border px-3 text-[10px] font-black ${kind === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>{label}</button>)}</div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-3 h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold">{STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>

        {error && !selected && <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
        <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[.1em] text-muted-foreground"><span>{loading ? 'Carregando…' : `${visible.length} resultado(s)`}</span><span>{kind === 'all' ? 'Catálogo completo' : LABELS[kind]}</span></div>
        <div className="mt-2 max-h-[680px] space-y-2 overflow-y-auto pr-1">
          {visible.map((target) => {
            const state = synopsisLengthStatus(target.synopsis, editorialKind(target));
            const active = selected?.scope === target.scope && selected?.id === target.id;
            return <button type="button" key={`${target.scope}:${target.id}`} onClick={() => selectTarget(target)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/35'}`}>
              <div className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">{target.imageUrl ? <img src={target.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-4 w-4 text-muted-foreground/40" />}</div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-xs font-black">{target.name}</span>{target.isActive === false && <span className="rounded border border-amber-400/30 px-1 text-[8px] text-amber-300">INATIVO</span>}</div><div className="mt-1 truncate text-[9px] uppercase tracking-[.1em] text-muted-foreground">{LABELS[target.entityType] || target.entityType}{target.collectionName && target.entityType !== 'collection' ? ` · ${target.collectionName}` : ''}</div><div className={`mt-1 text-[9px] font-bold ${state.valid ? 'text-emerald-400' : state.missing ? 'text-amber-400' : 'text-red-400'}`}>{state.missing ? 'Sem sinopse' : state.valid ? `${state.length} caracteres · válida` : `${state.length} caracteres · revisar`}</div></div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>;
          })}
        </div>
      </aside>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        {!selected ? <div className="flex min-h-[560px] flex-col items-center justify-center text-center"><BookOpen className="h-10 w-10 text-muted-foreground/30" /><h3 className="mt-4 text-xl font-black">Selecione uma entidade</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">O editor mostrará o limite correto de caracteres e permitirá criar ou substituir a sinopse diretamente no Supabase.</p></div> : <>
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Permissão administrativa</div><h3 className="mt-2 text-2xl font-black tracking-tight">{selected.name}</h3><p className="mt-1 text-xs text-muted-foreground">{LABELS[selected.entityType] || selected.entityType}{selected.baseName ? ` · Forma de ${selected.baseName}` : ''}{selected.collectionName && selected.entityType !== 'collection' ? ` · ${selected.collectionName}` : ''}</p></div>
            <div className={`rounded-2xl border px-4 py-3 text-right ${draftState.valid ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}><div className="text-2xl font-black tabular-nums">{draftState.length}</div><div className="text-[9px] font-black uppercase tracking-[.1em] text-muted-foreground">meta {draftState.min}–{draftState.max}</div></div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <div className="flex items-center justify-between gap-3"><label className="text-xs font-black uppercase tracking-[.12em]">Sinopse</label><span className={`text-[10px] font-black ${draftState.valid ? 'text-emerald-400' : draftState.length > draftState.max ? 'text-red-400' : 'text-amber-400'}`}>{draftState.valid ? 'Dentro do limite' : draftState.length > draftState.max ? `${draftState.length - draftState.max} acima` : `${draftState.min - draftState.length} abaixo`}</span></div>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={draftState.max} className="mt-2 min-h-[250px] w-full rounded-2xl border border-border bg-background p-4 text-sm leading-7 outline-none focus:border-primary/60" placeholder="Escreva uma sinopse canônica, objetiva e editorial..." />
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={save} disabled={saving || !draftState.valid} className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-40"><Save className="h-4 w-4" />{saving ? 'Salvando…' : selected.synopsis?.trim() ? 'Salvar edição' : 'Criar sinopse'}</button>{selected.description && <button type="button" onClick={useDescriptionAsBase} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-black text-muted-foreground hover:border-primary/40 hover:text-primary"><WandSparkles className="h-4 w-4" />Usar descrição como base</button>}</div>
              {message && <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{message}</div>}
              {error && <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
            </div>

            <div className="space-y-3">
              <InfoCard title="Status atual" value={currentState?.missing ? 'Sem sinopse' : currentState?.valid ? 'Válida' : 'Fora do limite'} tone={currentState?.valid ? 'good' : 'warn'} />
              <InfoCard title="Tipo editorial" value={LABELS[selected.entityType] || selected.entityType} />
              <InfoCard title="ID técnico" value={selected.id} mono />
              {selected.rarity && <InfoCard title="Raridade" value={selected.rarity} />}
              <div className="rounded-2xl border border-border bg-background p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Auditoria</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Cada criação ou edição é gravada no <strong>admin_audit_log</strong> com entidade, autor, tipo e tamanho anterior/novo.</p></div>
            </div>
          </div>
        </>}
      </section>
    </div>
  );
}

function InfoCard({ title, value, mono = false, tone = '' }) {
  return <div className={`rounded-2xl border p-4 ${tone === 'good' ? 'border-emerald-500/25 bg-emerald-500/8' : tone === 'warn' ? 'border-amber-500/25 bg-amber-500/8' : 'border-border bg-background'}`}><div className="text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">{title}</div><div className={`mt-1 break-words text-sm font-black ${mono ? 'font-mono text-[11px]' : ''}`}>{value || '—'}</div></div>;
}
