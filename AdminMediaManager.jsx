import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Images, UploadCloud, FileArchive, AlertTriangle, CheckCircle2,
  XCircle, Search, Layers, ShieldAlert, Sparkles, RefreshCw, FileText,
  Info, Eye, Swords, Crown, Package, FileCode
} from "lucide-react";
import { adminController } from "./core/adminController.js";
import {
  calculateMediaCoverage,
  preflightFileList,
  preflightZipImport
} from "./services/media/mediaImportService.js";
import { hasUsableMedia } from "./services/ai/dataQualityEngine.js";
import { Input } from "@/input";
import { useToast } from "@/use-toast";

export default function AdminMediaManager() {
  const [subTab, setSubTab] = useState("overview"); // overview | zip | images | missing | conflicts
  const { toast } = useToast();

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

  // Em runtime, itens podem vir das coleções ou de repositórios do sistema
  const items = useMemo(() => {
    const list = [];
    collections.forEach(col => {
      if (Array.isArray(col.items)) {
        col.items.forEach(i => list.push({ ...i, collection_id: col.code }));
      }
    });
    return list;
  }, [collections]);

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
    try {
      const buffer = await file.arrayBuffer();
      const report = await preflightZipImport(buffer, catalog);
      setPreflightReport(report);
      toast({
        title: "📦 Preflight do ZIP Concluído",
        description: `${report.matched} arquivos combinados, ${report.conflicts} conflitos/alertas.`
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

  const handleImageFilesUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const report = preflightFileList(files, catalog);
    setPreflightReport(report);
    toast({
      title: "🖼️ Preflight de Imagens Concluído",
      description: `${report.matched} arquivos combinados com sucesso de ${report.totalFiles} processados.`
    });
  };

  const refreshAll = () => {
    refetchCards();
    refetchCollections();
    refetchBosses();
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
    if (!preflightReport || !preflightReport.files) return [];
    return preflightReport.files.filter(f => f.hasConflict || f.matchStatus !== "MATCHED");
  }, [preflightReport]);

  return (
    <div className="space-y-6">
      {/* Header do Media Manager */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2 text-foreground">
            <Images className="w-6 h-6 text-primary" /> ADMIN MEDIA MANAGER (FASE 1 - LOCAL)
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            Serviço de parsing, resolução canônica e match de pacotes de mídia para o acervo do DeckVerse OS.
          </p>
        </div>

        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-3 py-1.5 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-heading font-bold rounded transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> RECARREGAR RUNTIME
        </button>
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

      {/* Conteúdo da Subaba 1: Visão Geral */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* Métricas Principais de Cobertura */}
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

          {/* Barra de Progresso de Cobertura */}
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

          {/* Breakdown por Tipo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 border border-border/30 bg-card/40 rounded-lg space-y-1">
              <div className="text-xs font-heading font-bold text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" /> Coleções sem Capa
              </div>
              <div className="text-xl font-mono font-bold text-foreground">{coverage.collectionsMissingMedia}</div>
            </div>

            <div className="p-3 border border-border/30 bg-card/40 rounded-lg space-y-1">
              <div className="text-xs font-heading font-bold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Personagens sem Img
              </div>
              <div className="text-xl font-mono font-bold text-foreground">{coverage.charactersMissingMedia}</div>
            </div>

            <div className="p-3 border border-border/30 bg-card/40 rounded-lg space-y-1">
              <div className="text-xs font-heading font-bold text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" /> Itens sem Img
              </div>
              <div className="text-xl font-mono font-bold text-foreground">{coverage.itemsMissingMedia}</div>
            </div>

            <div className="p-3 border border-border/30 bg-card/40 rounded-lg space-y-1">
              <div className="text-xs font-heading font-bold text-muted-foreground flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-sky-400" /> Bosses sem Img
              </div>
              <div className="text-xl font-mono font-bold text-foreground">{coverage.bossesMissingMedia}</div>
            </div>
          </div>

          {/* Guia do Padrão Oficial de Nomenclatura */}
          <div className="p-5 border border-primary/30 bg-primary/5 rounded-xl space-y-3 font-mono text-xs">
            <h3 className="font-heading font-bold text-sm text-primary flex items-center gap-2">
              <FileCode className="w-4 h-4" /> PADRÃO OFICIAL DE NOMENCLATURA DE ARQUIVOS
            </h3>
            <p className="text-muted-foreground">
              Para importação automática sem falhas, nomeie todos os arquivos conforme a especificação estrita:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-black/40 p-3 rounded border border-border/40">
              <div><code className="text-cyan-400">COL-CODE__collection__cover.ext</code></div>
              <div><code className="text-emerald-400">COL-CODE__character__slug.ext</code></div>
              <div><code className="text-purple-400">COL-CODE__item__slug.ext</code></div>
              <div><code className="text-sky-400">COL-CODE__boss__slug.ext</code></div>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p>• Extensões permitidas: <span className="text-foreground font-bold">.jpg, .jpeg, .png, .webp</span></p>
              <p>• Resolução de aliases legados ativa (ex: <span className="text-amber-400">COL-01-BSK</span> direciona para <span className="text-emerald-400">COL-01-BER</span> automaticamente).</p>
              <p>• Metadados e registros de lore são expressamente recusados neste importador.</p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Subaba 2: Importar ZIP */}
      {subTab === "zip" && (
        <div className="space-y-6">
          <div className="p-8 border-2 border-dashed border-primary/40 bg-card/20 rounded-xl text-center space-y-4 relative hover:border-primary transition-all">
            <FileArchive className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">SELECIONAR OU ARRASTAR PACOTE .ZIP DE MÍDIA</h3>
              <p className="text-xs font-mono text-muted-foreground">O importador irá descompactar, ler a estrutura, resolver o código da coleção e validar as entidades.</p>
            </div>

            <input
              type="file"
              accept=".zip"
              onChange={handleZipUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isProcessingZip}
            />

            <button
              disabled={isProcessingZip}
              className="px-6 py-2 bg-primary text-primary-foreground font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(0,240,255,0.3)] disabled:opacity-50"
            >
              {isProcessingZip ? "ANALISANDO PACOTE ZIP..." : "ESCOLHER ARQUIVO .ZIP"}
            </button>
          </div>

          {preflightReport && <PreflightReportView report={preflightReport} />}
        </div>
      )}

      {/* Conteúdo da Subaba 3: Importar Imagens */}
      {subTab === "images" && (
        <div className="space-y-6">
          <div className="p-8 border-2 border-dashed border-primary/40 bg-card/20 rounded-xl text-center space-y-4 relative hover:border-primary transition-all">
            <UploadCloud className="w-12 h-12 text-primary mx-auto" />
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">SELECIONAR MÚLTIPLOS ARQUIVOS DE IMAGEM (.JPG, .PNG, .WEBP)</h3>
              <p className="text-xs font-mono text-muted-foreground">Selecione uma ou mais imagens formatadas seguindo o padrão COL-CODE__type__slug.ext.</p>
            </div>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageFilesUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />

            <button className="px-6 py-2 bg-primary text-primary-foreground font-heading font-bold text-xs rounded shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              ESCOLHER IMAGENS
            </button>
          </div>

          {preflightReport && <PreflightReportView report={preflightReport} />}
        </div>
      )}

      {/* Conteúdo da Subaba 4: Sem Imagem */}
      {subTab === "missing" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={missingSearch}
                onChange={e => setMissingSearch(e.target.value)}
                placeholder="Filtrar entidades sem mídia por nome ou código..."
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

          <p className="text-xs font-mono text-muted-foreground">
            Listando {missingEntities.length} entidades elegíveis aguardando arquivo de imagem oficial.
          </p>

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

      {/* Conteúdo da Subaba 5: Conflitos */}
      {subTab === "conflicts" && (
        <div className="space-y-4">
          <div className="border-b border-border/30 pb-3">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" /> CONFLITOS E ALERTAS DO PREFLIGHT ({conflictsList.length})
            </h3>
            <p className="text-xs font-mono text-muted-foreground">
              Arquivos de pacotes analisados que apresentaram duplicidade, entidades não encontradas ou nomes fora do padrão.
            </p>
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
                    <div className="text-[11px] text-destructive">{f.conflictReason || "Conflito não identificado"}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    Status: <span className="text-destructive font-bold">{f.matchStatus}</span>
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

/* Subcomponente para exibir o relatório visual do Preflight */
function PreflightReportView({ report }) {
  return (
    <div className="p-5 border border-primary/30 bg-card/60 rounded-xl space-y-5">
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> RESULTADO DO PREFLIGHT DE MÍDIA (PREVIEW)
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
          PREVIEW WRITES = 0 (SEM ESCRITA)
        </span>
      </div>

      {/* Cards com resumo de status */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-xs text-center">
        <div className="p-2 border border-border/40 bg-muted/20 rounded">
          <div className="text-muted-foreground text-[10px]">TOTAL</div>
          <div className="font-bold text-foreground text-lg">{report.totalFiles}</div>
        </div>
        <div className="p-2 border border-emerald-500/30 bg-emerald-950/20 rounded">
          <div className="text-emerald-400 text-[10px]">COMBINADOS</div>
          <div className="font-bold text-emerald-400 text-lg">{report.matched}</div>
        </div>
        <div className="p-2 border border-amber-500/30 bg-amber-950/20 rounded">
          <div className="text-amber-400 text-[10px]">NÃO ENCONTRADOS</div>
          <div className="font-bold text-amber-400 text-lg">{report.notFound}</div>
        </div>
        <div className="p-2 border border-purple-500/30 bg-purple-950/20 rounded">
          <div className="text-purple-400 text-[10px]">AMBÍGUOS</div>
          <div className="font-bold text-purple-400 text-lg">{report.ambiguous}</div>
        </div>
        <div className="p-2 border border-destructive/30 bg-destructive/20 rounded">
          <div className="text-destructive text-[10px]">INVÁLIDOS</div>
          <div className="font-bold text-destructive text-lg">{report.invalid}</div>
        </div>
        <div className="p-2 border border-destructive/30 bg-destructive/20 rounded">
          <div className="text-destructive text-[10px]">CONFLITOS</div>
          <div className="font-bold text-destructive text-lg">{report.conflicts}</div>
        </div>
      </div>

      {/* Tabela Interativa dos Arquivos Analisados */}
      <div className="overflow-x-auto border border-border/40 rounded-lg">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-muted/40 border-b border-border/40 text-[10px] text-muted-foreground uppercase">
            <tr>
              <th className="p-2.5">NOME DO ARQUIVO</th>
              <th className="p-2.5">COLEÇÃO (CANÔNICA)</th>
              <th className="p-2.5">TIPO</th>
              <th className="p-2.5">ENTIDADE MATCH</th>
              <th className="p-2.5">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {report.files.map((f, i) => (
              <tr key={i} className="hover:bg-muted/10 transition-colors">
                <td className="p-2.5 font-bold text-foreground max-w-[200px] truncate" title={f.originalFilename}>
                  {f.originalFilename}
                </td>
                <td className="p-2.5">
                  {f.parsed?.collectionCodeCanonical ? (
                    <div className="flex items-center gap-1">
                      <span className="text-primary font-bold">{f.parsed.collectionCodeCanonical}</span>
                      {f.parsed.isLegacyCollectionAlias && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded" title={`Alias legado detectado: ${f.parsed.collectionCodeInput}`}>
                          ALIAS
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-2.5 text-muted-foreground uppercase text-[10px]">
                  {f.parsed?.entityType || "—"}
                </td>
                <td className="p-2.5 text-foreground">
                  {f.matchedEntity?.name || <span className="text-muted-foreground italic">Não associado</span>}
                </td>
                <td className="p-2.5">
                  <StatusBadge status={f.matchStatus} hasConflict={f.hasConflict} reason={f.conflictReason} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botão de Confirmação Desabilitado para Fase 1 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/30">
        <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
          <Info className="w-4 h-4" /> Armazenamento de mídia será habilitado na próxima fase (Fase 2).
        </div>

        <button
          disabled
          className="px-6 py-2 bg-muted text-muted-foreground font-heading font-bold text-xs rounded border border-border/40 cursor-not-allowed opacity-60"
        >
          CONFIRMAR IMPORTAÇÃO (ARMAZENAMENTO DESABILITADO NA FASE 1)
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, hasConflict, reason }) {
  if (hasConflict) {
    return (
      <span className="px-2 py-0.5 rounded text-[9px] bg-destructive/20 text-destructive border border-destructive/40 font-bold" title={reason}>
        CONFLITO
      </span>
    );
  }

  switch (status) {
    case "MATCHED":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
          MATCHED
        </span>
      );
    case "NOT_FOUND":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold" title={reason}>
          NOT_FOUND
        </span>
      );
    case "AMBIGUOUS":
      return (
        <span className="px-2 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/40 font-bold" title={reason}>
          AMBIGUOUS
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
