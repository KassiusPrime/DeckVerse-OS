import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArchiveRestore, CheckCircle2, CloudUpload, Database, ExternalLink, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import Navbar from "./Navbar";
import AdminMediaManager from "./AdminMediaManager";
import { useAuth } from "./AuthContext";
import { authProvider } from "./services/firebase/authProvider.js";
import { runOwnerCatalogMigration } from "./services/migration/catalogCleanupService.js";
import { importCanonicalDrivePackages } from "./services/media/driveCanonicalImportService.js";

export default function OwnerConsole() {
  const { user, signInWithGoogle } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");

  const runMigrationOnly = async () => {
    setBusy(true);
    setError("");
    setPhase("Limpando famílias aposentadas e migrando Bosses...");
    try {
      const result = await runOwnerCatalogMigration();
      setMigrationResult(result);
      await queryClient.invalidateQueries();
      setPhase("Migração estrutural concluída.");
      return result;
    } catch (err) {
      setError(err?.message || String(err));
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const runFullImport = async () => {
    setBusy(true);
    setError("");
    setImportResult(null);
    setProgress(null);
    try {
      setPhase("1/3 — Corrigindo catálogo e removendo conteúdo aposentado...");
      const migration = await runOwnerCatalogMigration();
      setMigrationResult(migration);
      await queryClient.invalidateQueries();

      setPhase("2/3 — Autorizando leitura da pasta canônica do Google Drive...");
      const google = await signInWithGoogle({ requestDriveAccess: true });
      if (!google?.user?.isOwner) throw new Error("OWNER_ACCOUNT_REQUIRED: selecione a mesma conta Google proprietária do DeckVerse.");
      const token = authProvider.getGoogleAccessToken();
      if (!token) throw new Error("DRIVE_TOKEN_MISSING: a permissão Google Drive não foi concedida.");

      setPhase("3/3 — Importando os 23 ZIPs canônicos...");
      const imported = await importCanonicalDrivePackages(token, {
        onProgress: (state) => {
          setProgress(state);
          if (state.filename) setPhase(`${state.phase === "download" ? "Baixando" : state.phase === "preflight" ? "Validando" : state.phase === "commit" ? "Publicando" : "Processando"} ${state.index}/${state.total}: ${state.filename}`);
        },
      });
      setImportResult(imported);
      await queryClient.invalidateQueries();
      setPhase("Catálogo e mídia sincronizados.");
    } catch (err) {
      setError(err?.message || String(err));
      setPhase("Operação interrompida com segurança.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-7 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card p-6 shadow-[0_24px_80px_rgba(0,0,0,.24)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="h-4 w-4" /> Proprietário</div>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">Painel privado do DeckVerse</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Ferramentas destrutivas, migrações e importação em massa aparecem somente para a conta proprietária. Contas comuns não recebem esta rota nem estes controles.</p>
              <p className="mt-2 text-xs text-muted-foreground">Sessão: {user?.name || "Proprietário"}</p>
            </div>
            <Link to="/owner/advanced" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-extrabold text-foreground transition hover:border-primary/45"><Database className="h-4 w-4" /> Administração avançada <ExternalLink className="h-3.5 w-3.5" /></Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><ArchiveRestore className="h-5 w-5 text-primary" /><h2 className="text-lg font-black text-foreground">Migração estrutural</h2></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Remove fisicamente COL‑05 (Mitologias) e COL‑06 (História/Antiguidade) do catálogo colecionável, apaga sua mídia indexada e converte Bosses legados em Personagens ou Formas.</p>
            <button type="button" onClick={runMigrationOnly} disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-black text-primary transition hover:bg-primary/15 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />} Aplicar migração</button>
          </div>

          <div className="rounded-3xl border border-primary/25 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><CloudUpload className="h-5 w-5 text-primary" /><h2 className="text-lg font-black text-foreground">Importação canônica do Drive</h2></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Executa a migração acima, solicita acesso somente de leitura ao Drive e importa exatamente os 23 ZIPs auditados / 1.402 assets pelo pipeline Storage + mediaIndex.</p>
            <button type="button" onClick={runFullImport} disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />} Migrar e importar tudo</button>
          </div>
        </section>

        {(phase || progress) && (
          <section className="mt-4 rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex items-start gap-3">{busy ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" /> : error ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}<div className="min-w-0"><div className="text-sm font-bold text-foreground">{phase}</div>{progress?.summary && <div className="mt-1 text-xs leading-5 text-muted-foreground">ZIPs: {progress.summary.processedZips || 0}/23 · analisados: {progress.summary.analyzedAssets || 0} · publicados: {progress.summary.committedAssets || 0} · já existentes: {progress.summary.alreadyExistingAssets || 0}</div>}{error && <div className="mt-2 break-words text-xs text-destructive">{error}</div>}</div></div>
          </section>
        )}

        {migrationResult && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">Migração:</strong> {migrationResult.retired?.deletedDocuments || 0} documentos aposentados removidos · {migrationResult.bosses?.convertedToCharacter || 0} bosses → personagens · {migrationResult.bosses?.convertedToForm || 0} → formas · {migrationResult.bosses?.mergedIntoCharacter || 0} fundidos.
          </section>
        )}

        {importResult && (
          <section className={`mt-4 rounded-2xl border p-5 ${importResult.auditCountMatches ? "border-emerald-500/30 bg-emerald-500/8" : "border-amber-500/30 bg-amber-500/8"}`}>
            <div className="flex items-center gap-2 text-sm font-black text-foreground">{importResult.auditCountMatches ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <TriangleAlert className="h-5 w-5 text-amber-400" />} Resultado da importação</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4"><Metric label="ZIPs" value={`${importResult.processedZips}/23`} /><Metric label="Analisados" value={importResult.analyzedAssets} /><Metric label="Publicados" value={importResult.committedAssets} /><Metric label="Já existentes" value={importResult.alreadyExistingAssets} /></div>
          </section>
        )}

        <section className="mt-10 border-t border-border pt-8">
          <div className="mb-5"><div className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mídia</div><h2 className="mt-1 text-2xl font-black text-foreground">Media Manager</h2><p className="mt-1 text-sm text-muted-foreground">Upload manual, conflitos, cobertura e preflight continuam disponíveis aqui, dentro da página Owner.</p></div>
          <AdminMediaManager />
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-border bg-background/60 px-3 py-3"><div className="text-lg font-black text-foreground">{value}</div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</div></div>;
}
