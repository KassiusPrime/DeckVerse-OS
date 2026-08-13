import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Images, UploadCloud, FileArchive, AlertTriangle, CheckCircle2,
  XCircle, Search, Layers, ShieldAlert, Sparkles, RefreshCw, FileText,
  Info, Eye, Swords, Crown, Package, FileCode, Check, Server, Lock
} from "lucide-react";
import { adminController } from "./core/adminController.js";
import { calculateMediaCoverage } from "./services/media/mediaImportService.js";
import {
  preflightAnalyzePackage,
  commitMediaPackage,
  validateAdminAuthForCommit
} from "./services/media/mediaCommitService.js";
import { persistenceProvider } from "./services/persistence/persistenceProvider.js";
import { hasUsableMedia } from "./services/ai/dataQualityEngine.js";
import { Input } from "@/input";
import { useToast } from "@/use-toast";

export default function AdminMediaManager() {
  const [subTab, setSubTab] = useState("overview"); // overview | zip | images | missing | conflicts
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mode status
  const [persistenceMode, setPersistenceMode] = useState(persistenceProvider.getSource());

  useEffect(() => {
    const unsub = persistenceProvider.subscribe((newSource) => {
      setPersistenceMode(newSource);
    });
    return unsub;
  }, []);

  // Queries para dados runtime do catálogo
  const { data: cards = [], refetch: refetchCards } = useQuery({
    queryKey: ["admin-cards"],
    queryFn: () => adminController.getAllCards()
  });

  const { data: collections = [], refetch: refetchCollections } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => adminController.getAllCollections()
  });

  const { data: bosses = [], refetch: refetchBosses } = useQuery({
    queryKey: ["admin-bosses"],
    queryFn: () => adminController.getAllBosses()
  });

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ["admin-items"],
    queryFn: () => adminController.getAllItems()
  });

  const catalog = useMemo(() => ({
    collections,
    cards,
    items,
    bosses
  }), [collections, cards, items, bosses]);

  // Cobertura de mídia dinâmica
  const coverage = useMemo(() => calculateMediaCoverage(catalog), [catalog]);

  // Estado do preflight ativo
  const [preflightReport, setPreflightReport] = useState(null);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);

  const [missingSearch, setMissingSearch] = useState("");
  const [missingTypeFilter, setMissingTypeFilter] = useState("ALL");

  const handleZipUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast({
        title: "❌ Arquivo Inválido",
        description: "Apenas arquivos com extensão .ZIP são suportados.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingZip(true);
    setCommitResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const report = await preflightAnalyzePackage(buffer, catalog, []);
      setPreflightReport(report);
      toast({
        title: "📦 Preflight do ZIP Concluído",
        description: `${report.counts.ready} prontos, ${report.counts.notFound} não encontrados, ${report.counts.conflicts} conflitos.`
      });
    } catch (err) {
      toast({
        title: "❌ Erro ao analisar ZIP",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleImageFilesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsProcessingZip(true);
    setCommitResult(null);
    try {
      const processedInputs = [];
      for (const f of files) {
        const buf = new Uint8Array(await f.arrayBuffer());
        processedInputs.push({
          name: f.name,
          data: buf
        });
      }

      const report = await preflightAnalyzePackage(processedInputs, catalog, []);
      setPreflightReport(report);
      toast({
        title: "🖼️ Preflight de Imagens Concluído",
        description: `${report.counts.ready} arquivos prontos para envio de ${report.counts.totalFiles} processados.`
      });
    } catch (err) {
      toast({
        title: "❌ Erro no Preflight de Imagens",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleExecuteCommit = async (confirmReplacements = false) => {
    if (!preflightReport) return;

    setIsCommitting(true);
    try {
      const result = await commitMediaPackage(preflightReport, {
        confirmReplacements
      });

      setCommitResult(result);

      if (result.success) {
        toast({
          title: "🚀 Commit de Mídia Concluído!",
          description: `${result.committedCount} arquivos enviados para o Firebase Storage e indexados.`
        });
      } else {
        toast({
          title: "⚠️ Commit de Mídia Concluído com Erros",
          description: `${result.committedCount} enviados, ${result.failedCount} falharam.`,
          variant: "destructive"
        });
      }

      refreshAll();
    } catch (err) {
      toast({
        title: "❌ Envio Bloqueado / Falhou",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreateEntityFromMedia = async (fileInfo) => {
    try {
      const created = await adminController.createEntityFromMedia(fileInfo);
      toast({
        title: "✨ Entidade Criada!",
        description: `Entidade "${created.name}" foi criada no acervo.`
      });

      queryClient.invalidateQueries();
      refetchCards();
      refetchCollections();
      refetchBosses();
      refetchItems();

      // Re-run preflight to update status of newly created entity
      if (preflightReport && preflightReport.items) {
        const updatedItems = preflightReport.items.map(item => {
          if (item.originalFilename === fileInfo.originalFilename) {
            return {
              ...item,
              status: "READY",
              matchedEntity: created,
              reason: "Entidade criada e combinada."
            };
          }
          return item;
        });

        setPreflightReport({
          ...preflightReport,
          items: updatedItems,
          counts: {
            ...preflightReport.counts,
            ready: updatedItems.filter(i => i.status === "READY").length,
            notFound: updatedItems.filter(i => i.status === "NOT_FOUND").length
          }
        });
      }
    } catch (err) {
      toast({
        title: "❌ Erro ao criar entidade",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const refreshAll = () => {
    refetchCards();
    refetchCollections();
    refetchBosses();
    refetchItems();
    toast({ title: "🔄 Catálogo recarregado com sucesso!" });
  };

  // Lista de entidades sem mídia utilizável
  const missingEntities = useMemo(() => {
    const result = [];

    collections.forEach(c => {
      if (!hasUsableMedia(c)) {
        result.push({
          type: "collection",
          typeName: "Coleção",
          name: c.name,
          code: c.code,
          slug: "cover",
          expectedFilename: `${c.code}__collection__cover.jpg`,
          entity: c
        });
      }
    });

    cards.forEach(c => {
      if (!hasUsableMedia(c)) {
        const colCode = c.collection_id || "MULTIVERSE";
        const slug = c.slug || (c.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
        result.push({
          type: "character",
          typeName: "Personagem",
          name: c.name,
          code: colCode,
          slug,
          expectedFilename: `${colCode}__character__${slug}.jpg`,
          entity: c
        });
      }
    });

    items.forEach(i => {
      if (!hasUsableMedia(i)) {
        const colCode = i.collection_id || "MULTIVERSE";
        const slug = i.slug || (i.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
        result.push({
          type: "item",
          typeName: "Item",
          name: i.name,
          code: colCode,
          slug,
          expectedFilename: `${colCode}__item__${slug}.jpg`,
          entity: i
        });
      }
    });

    bosses.forEach(b => {
      if (!hasUsableMedia(b)) {
        const colCode = b.collection_id || "MULTIVERSE";
        const slug = b.slug || (b.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
        result.push({
          type: "boss",
          typeName: "Boss",
          name: b.name,
          code: colCode,
          slug,
          expectedFilename: `${colCode}__boss__${slug}.jpg`,
          entity: b
        });
      }
    });

    return result.filter(item => {
      if (missingTypeFilter !== "ALL" && item.type !== missingTypeFilter) return false;
      if (missingSearch) {
        const q = missingSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.expectedFilename.toLowerCase().includes(q);
      }
      return true;
    });
  }, [collections, cards, items, bosses, missingTypeFilter, missingSearch]);

  const conflictsList = useMemo(() => {
    if (!preflightReport || !preflightReport.items) return [];
    return preflightReport.items.filter(f => f.status === "CONFLICT" || f.status === "INVALID");
  }, [preflightReport]);

  return (
    <div className="space-y-6">
      {/* Header do Media Manager */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2 text-foreground">
            <Images className="w-6 h-6 text-primary" /> ADMIN MEDIA MANAGER (FASE 4B — FIREBASE COMMIT)
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            Pipeline de análise, pré-voo, resolução de aliases canônicos e commit seguro de mídia no Firebase Storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 border ${
            persistenceMode === "FIREBASE"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}>
            <Server className="w-3 h-3" /> MODO: {persistenceMode}
          </div>

          <button
            onClick={refreshAll}
            className="flex items-center gap-2 px-3 py-1.5 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-heading font-bold rounded transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> RECARREGAR
          </button>
        </div>
      </div>

      {/* Subabas de Navegação */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-2">
        <button
          onClick={() => setSubTab("overview")}
          className={`px-3 py-1.5 rounded text-xs font-heading font-bold transition-all flex items-center gap-1.5 ${
            subTab === "overview"
              ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(0,240,255,0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <Info className="w-3.5 h-3.5" /> VISÃO GERAL
        </button>

        <button
          onClick={() => setSubTab("zip")}
          className={`px-3 py-1.5 rounded text-xs font-heading font-bold transition-all flex items-center gap-1.5 ${
            subTab === "zip"
              ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(0,240,255,0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <FileArchive className="w-3.5 h-3.5" /> IMPORTAR ZIP
        </button>

        <button
          onClick={() => setSubTab("images")}
          className={`px-3 py-1.5 rounded text-xs font-heading font-bold transition-all flex items-center gap-1.5 ${
            subTab === "images"
              ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(0,240,255,0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" /> IMPORTAR IMAGENS
        </button>

        <button
          onClick={() => setSubTab("missing")}
          className={`px-3 py-1.5 rounded text-xs font-heading font-bold transition-all flex items-center gap-1.5 ${
            subTab === "missing"
              ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> SEM IMAGEM ({coverage.missingRealMedia})
        </button>

        <button
          onClick={() => setSubTab("conflicts")}
          className={`px-3 py-1.5 rounded text-xs font-heading font-bold transition-all flex items-center gap-1.5 ${
            subTab === "conflicts"
              ? "bg-destructive text-destructive-foreground shadow-[0_0_12px_rgba(239,68,68,0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> CONFLITOS ({conflictsList.length})
        </button>
      </div>

      {/* Visão Geral */}
      {subTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border/40 bg-card/60 space-y-1">
              <span className="text-[10px] font-heading font-bold text-muted-foreground tracking-wider">ENTIDADES ELEGÍVEIS DE MÍDIA</span>
              <div className="text-3xl font-mono font-bold text-foreground">{coverage.totalMediaEligible}</div>
              <p className="text-[10px] font-mono text-muted-foreground">Coleções + Personagens + Itens + Bosses</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
              <span className="text-[10px] font-heading font-bold text-emerald-400 tracking-wider">MÍDIA REAL UTILIZÁVEL</span>
              <div className="text-3xl font-mono font-bold text-emerald-400">{coverage.realUsableMedia}</div>
              <p className="text-[10px] font-mono text-emerald-400/80">{coverage.coveragePercentage}% de cobertura completa</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-1">
              <span className="text-[10px] font-heading font-bold text-amber-400 tracking-wider">ENTIDADES SEM MÍDIA REAL</span>
              <div className="text-3xl font-mono font-bold text-amber-400">{coverage.missingRealMedia}</div>
              <p className="text-[10px] font-mono text-amber-400/80">Aguardando importação de mídia oficial</p>
            </div>
          </div>

          <div className="p-4 border border-border/40 bg-card/40 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground">Progresso de Cobertura do Acervo:</span>
              <span className="font-bold text-primary">{coverage.coveragePercentage}% ({coverage.realUsableMedia} / {coverage.totalMediaEligible})</span>
            </div>
            <div className="w-full bg-muted/40 h-3 rounded-full overflow-hidden p-0.5 border border-border/30">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,240,255,0.5)]"
                style={{ width: `${Math.max(coverage.coveragePercentage, 1)}%` }}
              />
            </div>
          </div>

          <div className="p-5 border border-primary/30 bg-primary/5 rounded-xl space-y-3 font-mono text-xs">
            <h3 className="font-heading font-bold text-sm text-primary flex items-center gap-2">
              <FileCode className="w-4 h-4" /> PADRÃO CANÔNICO DE NOMENCLATURA & STORAGE PATHS
            </h3>
            <p className="text-muted-foreground">
              Estrutura canônica de armazenamento de arquivos no Firebase Storage:
            </p>
            <div className="bg-black/40 p-3 rounded border border-border/40 space-y-1">
              <div><code className="text-cyan-400">deckverse-media/COL-01-BER/collection/cover.webp</code></div>
              <div><code className="text-emerald-400">deckverse-media/COL-01-BER/character/guts.webp</code></div>
              <div><code className="text-purple-400">deckverse-media/COL-01-BER/item/behelit.webp</code></div>
              <div><code className="text-sky-400">deckverse-media/COL-01-BER/boss/zodd.webp</code></div>
            </div>
          </div>
        </div>
      )}

      {/* Subaba ZIP */}
      {subTab === "zip" && (
        <div className="space-y-6">
          <div className="p-8 border-2 border-dashed border-primary/40 bg-card/20 rounded-xl text-center space-y-4 relative hover:border-primary transition-all">
            <FileArchive className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">SELECIONAR OU ARRASTAR PACOTE .ZIP DE MÍDIA</h3>
              <p className="text-xs font-mono text-muted-foreground">Descompactação segura, verificação de magic bytes, SHA-256 e match de entidades.</p>
            </div>

            <input
              type="file"
              accept=".zip"
              onChange={handleZipUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isProcessingZip || isCommitting}
            />

            <button
              disabled={isProcessingZip || isCommitting}
              className="px-6 py-2 bg-primary text-primary-foreground font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(0,240,255,0.3)] disabled:opacity-50"
            >
              {isProcessingZip ? "ANALISANDO PACOTE ZIP..." : "ESCOLHER ARQUIVO .ZIP"}
            </button>
          </div>

          {preflightReport && (
            <PreflightReportView
              report={preflightReport}
              persistenceMode={persistenceMode}
              isCommitting={isCommitting}
              commitResult={commitResult}
              onRequestCreateEntity={handleCreateEntityFromMedia}
              onExecuteCommit={handleExecuteCommit}
            />
          )}
        </div>
      )}

      {/* Subaba Imagens */}
      {subTab === "images" && (
        <div className="space-y-6">
          <div className="p-8 border-2 border-dashed border-primary/40 bg-card/20 rounded-xl text-center space-y-4 relative hover:border-primary transition-all">
            <UploadCloud className="w-12 h-12 text-primary mx-auto" />
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">SELECIONAR MÚLTIPLOS ARQUIVOS DE IMAGEM</h3>
              <p className="text-xs font-mono text-muted-foreground">Selecione imagens (.jpg, .png, .webp) nomeadas como COL-CODE__type__slug.ext</p>
            </div>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageFilesUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isProcessingZip || isCommitting}
            />

            <button
              disabled={isProcessingZip || isCommitting}
              className="px-6 py-2 bg-primary text-primary-foreground font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(0,240,255,0.3)] disabled:opacity-50"
            >
              {isProcessingZip ? "ANALISANDO IMAGENS..." : "ESCOLHER IMAGENS"}
            </button>
          </div>

          {preflightReport && (
            <PreflightReportView
              report={preflightReport}
              persistenceMode={persistenceMode}
              isCommitting={isCommitting}
              commitResult={commitResult}
              onRequestCreateEntity={handleCreateEntityFromMedia}
              onExecuteCommit={handleExecuteCommit}
            />
          )}
        </div>
      )}

      {/* Subaba Sem Imagem */}
      {subTab === "missing" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={missingSearch}
                onChange={e => setMissingSearch(e.target.value)}
                placeholder="Filtrar entidades sem mídia..."
                className="font-mono text-xs bg-muted/20 border-border/40 w-full sm:w-80"
              />
            </div>

            <div className="flex items-center gap-1">
              {["ALL", "collection", "character", "item", "boss"].map(t => (
                <button
                  key={t}
                  onClick={() => setMissingTypeFilter(t)}
                  className={`px-2.5 py-1 rounded text-[10px] font-heading font-bold uppercase transition-all ${
                    missingTypeFilter === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {t === "ALL" ? "Todas" : t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {missingEntities.map((item, idx) => (
              <div key={idx} className="p-3 border border-border/30 bg-card/50 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                      {item.typeName}
                    </span>
                    <h4 className="font-heading font-bold text-xs text-foreground truncate mt-1">{item.name}</h4>
                    <p className="text-[10px] font-mono text-muted-foreground">Coleção: <span className="text-foreground">{item.code}</span></p>
                  </div>
                  <div className="w-10 h-10 rounded bg-destructive/10 border border-destructive/30 flex items-center justify-center text-[9px] font-bold text-destructive shrink-0">
                    SEM IMG
                  </div>
                </div>

                <div className="p-2 bg-black/40 rounded border border-border/40 font-mono text-[10px] text-cyan-400 truncate">
                  Expected: {item.expectedFilename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subaba Conflitos */}
      {subTab === "conflicts" && (
        <div className="space-y-4">
          <div className="border-b border-border/30 pb-3">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" /> CONFLITOS E ERROS DO PREFLIGHT ({conflictsList.length})
            </h3>
          </div>

          {conflictsList.length === 0 ? (
            <div className="p-8 border border-border/40 bg-card/40 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-heading text-xs text-muted-foreground">Nenhum conflito ou erro detectado no último preflight.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conflictsList.map((f, i) => (
                <div key={i} className="p-3 border border-destructive/40 bg-destructive/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
                  <div>
                    <div className="font-bold text-foreground">{f.originalFilename}</div>
                    <div className="text-[11px] text-destructive">{f.reason || "Conflito não identificado"}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    Status: <span className="text-destructive font-bold">{f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreflightReportView({
  report,
  persistenceMode,
  isCommitting,
  commitResult,
  onRequestCreateEntity,
  onExecuteCommit
}) {
  const [filterTab, setFilterTab] = useState("ALL");
  const [search, setSearch] = useState("");

  const items = report.items || [];
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterTab !== "ALL" && item.status !== filterTab) return false;
      if (search) {
        const q = search.toLowerCase();
        const fn = (item.originalFilename || "").toLowerCase();
        const col = (item.collectionCode || "").toLowerCase();
        const name = (item.matchedEntity?.name || "").toLowerCase();
        const key = (item.entityKey || "").toLowerCase();
        return fn.includes(q) || col.includes(q) || name.includes(q) || key.includes(q);
      }
      return true;
    });
  }, [items, filterTab, search]);

  const counts = report.counts || {};
  const readyCount = counts.ready || 0;
  const replacementCount = counts.replacementRequired || 0;
  const totalCommitable = readyCount + replacementCount;

  return (
    <div className="p-5 border border-primary/30 bg-card/60 rounded-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3">
        <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> RELATÓRIO PREFLIGHT DE MÍDIA
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            PREVIEW WRITES = 0
          </span>
        </div>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 font-mono text-xs text-center">
        <div className="p-2 border border-border/40 bg-muted/20 rounded">
          <div className="text-muted-foreground text-[10px]">TOTAL</div>
          <div className="font-bold text-foreground text-lg">{counts.totalFiles}</div>
        </div>
        <div className="p-2 border border-emerald-500/30 bg-emerald-950/20 rounded">
          <div className="text-emerald-400 text-[10px]">READY</div>
          <div className="font-bold text-emerald-400 text-lg">{counts.ready}</div>
        </div>
        <div className="p-2 border border-amber-500/30 bg-amber-950/20 rounded">
          <div className="text-amber-400 text-[10px]">REPLACEMENT</div>
          <div className="font-bold text-amber-400 text-lg">{counts.replacementRequired || 0}</div>
        </div>
        <div className="p-2 border border-cyan-500/30 bg-cyan-950/20 rounded">
          <div className="text-cyan-400 text-[10px]">EXISTS</div>
          <div className="font-bold text-cyan-400 text-lg">{counts.alreadyExists || 0}</div>
        </div>
        <div className="p-2 border border-amber-500/30 bg-amber-950/20 rounded">
          <div className="text-amber-400 text-[10px]">NOT FOUND</div>
          <div className="font-bold text-amber-400 text-lg">{counts.notFound}</div>
        </div>
        <div className="p-2 border border-destructive/30 bg-destructive/20 rounded">
          <div className="text-destructive text-[10px]">CONFLICTS</div>
          <div className="font-bold text-destructive text-lg">{counts.conflicts}</div>
        </div>
        <div className="p-2 border border-destructive/30 bg-destructive/20 rounded">
          <div className="text-destructive text-[10px]">INVALID</div>
          <div className="font-bold text-destructive text-lg">{counts.invalid}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "READY", "REPLACEMENT_REQUIRED", "ALREADY_EXISTS", "NOT_FOUND", "CONFLICT", "INVALID"].map(st => (
            <button
              key={st}
              onClick={() => setFilterTab(st)}
              className={`px-2 py-1 rounded text-[10px] font-heading font-bold uppercase shrink-0 transition-all ${
                filterTab === st
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar no preflight..."
          className="font-mono text-xs bg-muted/20 border-border/40 w-full sm:w-60"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border/40 rounded-lg">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-muted/40 border-b border-border/40 text-[10px] text-muted-foreground uppercase">
            <tr>
              <th className="p-2.5">ARQUIVO</th>
              <th className="p-2.5">COLEÇÃO</th>
              <th className="p-2.5">TIPO</th>
              <th className="p-2.5">ENTIDADE MATCH</th>
              <th className="p-2.5">STORAGE PATH</th>
              <th className="p-2.5">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filteredItems.map((item, i) => (
              <tr key={i} className="hover:bg-muted/10 transition-colors">
                <td className="p-2.5 font-bold text-foreground max-w-[180px] truncate" title={item.originalFilename}>
                  {item.originalFilename}
                </td>
                <td className="p-2.5 text-primary font-bold">
                  {item.collectionCode || "—"}
                </td>
                <td className="p-2.5 text-muted-foreground uppercase text-[10px]">
                  {item.entityType || "—"}
                </td>
                <td className="p-2.5 text-foreground">
                  {item.matchedEntity?.name || <span className="text-muted-foreground italic">Não associado</span>}
                </td>
                <td className="p-2.5 font-mono text-[10px] text-cyan-400 max-w-[200px] truncate" title={item.storagePath}>
                  {item.storagePath || "—"}
                </td>
                <td className="p-2.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} reason={item.reason} />
                    {item.status === "NOT_FOUND" && onRequestCreateEntity && (
                      <button
                        type="button"
                        onClick={() => onRequestCreateEntity(item)}
                        className="px-2 py-0.5 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/40 font-heading font-bold text-[9px] rounded shrink-0"
                      >
                        + CRIAR ENTIDADE
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Commit Action Footer */}
      <div className="p-4 border border-border/40 bg-card/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {persistenceMode === "LOCAL" ? (
            <div className="text-xs font-mono text-amber-400 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Modo Local Ativo: Altere para Modo Firebase no painel para habilitar envio real ao Firestorage.</span>
            </div>
          ) : (
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Modo Firebase Ativo: Pronto para envio e indexação real.</span>
            </div>
          )}
        </div>

        <button
          onClick={() => onExecuteCommit(replacementCount > 0)}
          disabled={persistenceMode === "LOCAL" || totalCommitable === 0 || isCommitting}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-heading font-bold text-xs rounded shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
        >
          {isCommitting ? "ENVIANDO MÍDIA..." : `CONFIRMAR E ENVIAR ${totalCommitable} ARQUIVO(S) PARA O FIREBASE`}
        </button>
      </div>

      {/* Commit Result Summary */}
      {commitResult && (
        <div className={`p-4 rounded-xl border ${
          commitResult.success
            ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
            : "border-destructive/40 bg-destructive/10 text-destructive-foreground"
        } font-mono text-xs space-y-2`}>
          <div className="font-bold font-heading text-sm">
            {commitResult.success ? "✅ COMMIT CONCLUÍDO COM SUCESSO" : "⚠️ COMMIT CONCLUÍDO COM ALERTAS"}
          </div>
          <p>
            Enviados: <span className="font-bold">{commitResult.committedCount}</span> | Falhas: <span className="font-bold">{commitResult.failedCount}</span>
            {commitResult.orphanCleanupRequired && <span className="text-destructive font-bold ml-2">(Limpeza de orfãos requerida)</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, reason }) {
  switch (status) {
    case "READY":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold" title={reason}>
          READY
        </span>
      );
    case "REPLACEMENT_REQUIRED":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold" title={reason}>
          REPLACEMENT
        </span>
      );
    case "ALREADY_EXISTS":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold" title={reason}>
          EXISTS
        </span>
      );
    case "NOT_FOUND":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold" title={reason}>
          NOT_FOUND
        </span>
      );
    case "CONFLICT":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-destructive/20 text-destructive border border-destructive/40 font-bold" title={reason}>
          CONFLICT
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-destructive/20 text-destructive border border-destructive/40 font-bold" title={reason}>
          INVALID
        </span>
      );
  }
}
