import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, ImagePlus, Loader2, PackageOpen, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { executeAcervoImport, getAcervoImportHistory, inspectAcervoImport } from './services/acervo/acervoService.js';

const emptyCollection = { id: '', name: '', slug: '', synopsis: '', description: '' };

export default function AcervoImport() {
  const [collection, setCollection] = useState(emptyCollection);
  const [manifestFile, setManifestFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [resumeJobId, setResumeJobId] = useState(null);

  const canInspect = collection.id.trim() && collection.name.trim() && (manifestFile || zipFile);

  const loadHistory = async () => {
    try { setHistory(await getAcervoImportHistory(12)); } catch (e) { setError(e?.message || 'Não foi possível carregar o histórico.'); }
  };
  const issueCount = plan?.issues?.length || 0;
  const previewRows = useMemo(() => plan?.entries?.slice(0, 100) || [], [plan]);

  React.useEffect(() => { loadHistory(); }, []);

  const inspect = async () => {
    setBusy(true); setError(''); setResult(null);
    try {
      const next = await inspectAcervoImport({ manifestFile, zipFile, collection: { ...collection, id: collection.id.trim().toUpperCase() } });
      setPlan(next);
      await loadHistory();
    } catch (e) {
      setError(e?.message || 'Não foi possível analisar os arquivos.');
    } finally { setBusy(false); }
  };

  const runImport = async () => {
    if (!plan || issueCount) return;
    setBusy(true); setError(''); setResult(null); setProgress({ current: 0, total: plan.images?.length || 0 });
    try {
      const done = await executeAcervoImport({ plan, existingJobId: resumeJobId, onProgress: setProgress });
      setResult(done);
      await loadHistory();
    } catch (e) {
      setError(e?.message || 'A importação falhou.');
    } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const csv = 'name,entity_type,rarity,role,synopsis,description,image_filename\nSung Jin-Woo,character,Lendário,DPS,,,"COL-99-NEW_character_sung_jin_woo.png"\nBeru,boss,Mítico,DPS,,,';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'deckverse-acervo-modelo.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return <><Navbar/><main className="min-h-screen bg-background px-4 pb-24 pt-6 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <Link to="/acervo" className="inline-flex items-center gap-2 text-xs font-black text-primary"><ArrowLeft className="h-4 w-4"/>Acervo</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-primary">Acervo · Importação</p><h1 className="mt-2 text-3xl font-black">Adicionar coleção</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Crie uma coleção inteira a partir de um ZIP, de uma lista de nomes ou dos dois juntos. O importador primeiro analisa tudo e só depois grava.</p></div>
        <button onClick={downloadTemplate} className="rounded-xl border border-border px-4 py-2 text-xs font-black">Baixar modelo CSV</button>
      </div>

      <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm font-black">1. Identidade da coleção</h2>
          <div className="mt-4 grid gap-3">
            <input value={collection.id} onChange={e=>setCollection({...collection,id:e.target.value})} placeholder="ID · ex.: COL-07-BNHA" className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold"/>
            <input value={collection.name} onChange={e=>setCollection({...collection,name:e.target.value})} placeholder="Nome da coleção" className="h-11 rounded-xl border border-border bg-background px-3 text-sm"/>
            <input value={collection.slug} onChange={e=>setCollection({...collection,slug:e.target.value})} placeholder="Slug opcional" className="h-11 rounded-xl border border-border bg-background px-3 text-sm"/>
            <textarea value={collection.synopsis} onChange={e=>setCollection({...collection,synopsis:e.target.value})} placeholder="Sinopse opcional" rows="3" className="rounded-xl border border-border bg-background p-3 text-sm"/>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm font-black">2. Fontes de conteúdo</h2>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-4 hover:border-primary/50"><FileText className="h-5 w-5 text-primary"/><div className="min-w-0"><p className="text-xs font-black">Lista / manifesto</p><p className="truncate text-[10px] text-muted-foreground">{manifestFile?.name || 'CSV, JSON ou TXT · nomes sem imagem também funcionam'}</p></div><input type="file" accept=".csv,.json,.txt" className="hidden" onChange={e=>setManifestFile(e.target.files?.[0] || null)}/></label>
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-4 hover:border-primary/50"><PackageOpen className="h-5 w-5 text-primary"/><div className="min-w-0"><p className="text-xs font-black">ZIP de imagens</p><p className="truncate text-[10px] text-muted-foreground">{zipFile?.name || 'Imagens renomeadas no padrão COL-XX-YYY_type_slug.ext'}</p></div><input type="file" accept=".zip,application/zip" className="hidden" onChange={e=>setZipFile(e.target.files?.[0] || null)}/></label>
          <button disabled={!canInspect || busy} onClick={inspect} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-primary-foreground disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}Analisar importação</button>
        </div>
      </section>

      {resumeJobId && !plan && <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm"><b>Retomada selecionada:</b> {resumeJobId.slice(0,8)}. Envie o ZIP original (ou uma nova versão com os mesmos nomes de arquivo), depois clique em <b>Analisar importação</b>.</div>}

      {error && <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {plan && <section className="mt-5 rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><CheckCircle2 className="h-5 w-5"/></div><div><h2 className="text-sm font-black">Prévia da importação</h2>{resumeJobId && <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-1 text-[9px] font-black text-primary">RETOMANDO {resumeJobId.slice(0,8)}</span>}<p className="text-xs text-muted-foreground">{plan.entries.length} entidades · {plan.images.length} imagens · {issueCount} problemas</p></div><span className="ml-auto rounded-full border border-border px-3 py-1 text-[10px] font-black">{issueCount ? 'REVISAR' : 'PRONTO'}</span></div>
        {issueCount > 0 && <div className="mt-4 max-h-48 overflow-auto rounded-2xl border border-destructive/20 bg-destructive/5 p-3">{plan.issues.slice(0,50).map((item,i)=><p key={i} className="text-[11px] text-destructive"><b>{item.file}</b> · {item.reason}</p>)}</div>}
        <div className="mt-4 overflow-auto rounded-2xl border border-border"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border"><th className="p-3">Nome</th><th className="p-3">Tipo</th><th className="p-3">Raridade</th><th className="p-3">Imagem</th></tr></thead><tbody>{previewRows.map((row,i)=><tr key={row.slug || i} className="border-b border-border/60 last:border-0"><td className="p-3 font-bold">{row.name}</td><td className="p-3">{row.entity_type}</td><td className="p-3">{row.rarity || 'Comum'}</td><td className="p-3">{row.image_filename ? '✓' : '—'}</td></tr>)}</tbody></table></div>
        {plan.entries.length > 100 && <p className="mt-3 text-[10px] text-muted-foreground">Mostrando as primeiras 100 entidades; a importação considera todas.</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div>{progress && <p className="text-xs text-muted-foreground">{progress.current}/{progress.total} imagens processadas</p>}</div><button disabled={busy || issueCount>0} onClick={runImport} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-black text-primary-foreground disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <ImagePlus className="h-4 w-4"/>}Importar agora</button></div>
      </section>}

      {history.length > 0 && <section className="mt-5 rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-black">Importações recentes</h2><p className="mt-1 text-xs text-muted-foreground">O progresso fica salvo no banco. Para retomar imagens pendentes, reenvie o mesmo ZIP e analise-o novamente.</p></div>
          <button type="button" onClick={loadHistory} className="rounded-xl border border-border px-3 py-2 text-[10px] font-black">Atualizar</button>
        </div>
        <div className="mt-4 space-y-2">
          {history.map((job) => <div key={job.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3">
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{job.collection_id} · {job.id.slice(0,8)}</p><p className="text-[10px] text-muted-foreground">{job.completed_images}/{job.total_images} concluídas · {job.failed_images} falhas · {job.status}</p></div>
            {['partial','failed','paused','running'].includes(job.status) && <button type="button" onClick={() => { setResumeJobId(job.id); setCollection((v) => ({ ...v, id: job.collection_id })); setResult(null); setPlan(null); setProgress(null); setError(''); }} className="rounded-xl bg-primary px-3 py-2 text-[10px] font-black text-primary-foreground">Retomar</button>}
          </div>)}
        </div>
      </section>}

      {result && <section className="mt-5 rounded-3xl border border-primary/30 bg-primary/5 p-6"><h2 className="text-lg font-black">{result.failed > 0 || result.state?.status === 'partial' ? 'Importação concluída com pendências' : 'Importação concluída'}</h2><p className="mt-2 text-sm text-muted-foreground">Coleção <b>{result.collectionId}</b> processada com {result.created} novas cartas, {result.updated} atualizadas, {result.uploaded} imagens novas e {result.skippedExisting || 0} imagens já existentes reaproveitadas.{result.failed > 0 ? ` ${result.failed} imagem(ns) falharam e podem ser retomadas.` : ''}</p><Link to={`/acervo/${encodeURIComponent(result.collectionId)}`} className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">Abrir coleção</Link></section>}
    </div>
  </main></>;
}
