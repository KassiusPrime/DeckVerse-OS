// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Centro de Qualidade dos Dados (Data Quality Center)
// Painel Administrativo de Controle de Integridade, Quarentena e Deduplicação
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/base44Client";
import { adminController } from "@/core/adminController";
import { dataQualityEngine } from "@/services/ai/dataQualityEngine";
import { cleanAndDeduplicateAllStorage } from "@/src/utils/deduplication";
import { useToast } from "@/use-toast";
import { pushCRTLog } from "./CRTTerminalOverlay";
import ScanlineProgress from "@/components/ScanlineProgress";
import CollectionVisualizer from "@/components/CollectionVisualizer";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import {
  ShieldCheck, AlertTriangle, XCircle, RefreshCw, Sparkles, CheckCircle2,
  Database, Trash2, Wrench, Search, Layers, Activity, FileCheck, Layers3, Play, Keyboard, Lock, Eye, CheckSquare
} from "lucide-react";

export default function DataQualityCenter() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const searchInputRef = useRef(null);

  const [engineMode, setEngineMode] = useState("PROPOSE"); // "PROPOSE" | "REVIEW" | "APPLY"
  const [activeTab, setActiveTab] = useState("quarantine"); // quarantine | valid | metadata | high_risk | visualizer
  const [isRunning, setIsRunning] = useState(false);
  const [runningAction, setRunningAction] = useState("");
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 100 });
  const [searchQuery, setSearchQuery] = useState("");
  const [purgingCardIds, setPurgingCardIds] = useState(new Set());
  const [auditReport, setAuditReport] = useState(null);

  // Query Cards from DB
  const { data: dbCards = [], isLoading } = useQuery({
    queryKey: ["admin-cards-quality"],
    queryFn: () => db.entities.Card.list("-created_date", 2000)
  });

  const addLog = (msg, type = "info") => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() }]);
    pushCRTLog(msg, type.toUpperCase());
  };

  const handleFocusSearch = () => {
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // 1. Executar Auditoria Completa pelo Data Quality Engine
  const handleRunFullAudit = async (selectedMode = "PROPOSE") => {
    setEngineMode(selectedMode);
    setIsRunning(true);
    const isDryRun = selectedMode !== "APPLY";
    setRunningAction(`Auditoria Engine (${selectedMode}: ${isDryRun ? "Somente Leitura" : "Modo Persistente"})`);
    setProgress({ current: 15, total: 100 });
    setLogs([]);
    addLog(`🛡️ Executando Data Quality Engine v10.0 (Modo ${selectedMode})...`);

    try {
      setProgress({ current: 50, total: 100 });
      const result = await dataQualityEngine.runDataQualityAudit({
        mode: selectedMode,
        dryRun: isDryRun,
        onLog: (msg, type) => addLog(msg, type)
      });

      setProgress({ current: 85, total: 100 });
      setAuditReport(result.report);
      qc.invalidateQueries();
      setProgress({ current: 100, total: 100 });

      toast({
        title: isDryRun ? `Proposta Gerada (Modo ${selectedMode})` : "Auditoria Aplicada com Sucesso!",
        description: `Analisados: ${result.report.totalAnalyzed} | Válidos: ${result.report.validCount} | Metadados: ${result.report.metadataCount} | Quarentena: ${result.report.quarantineCount}`
      });
    } catch (err) {
      addLog(`💥 Erro na auditoria: ${err.message}`, "error");
      toast({ title: "Erro na Auditoria", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
      setRunningAction("");
    }
  };

  // Executar Limpeza/Purga SOMENTE se estiver em modo APPLY
  const handlePurgeDuplicates = async () => {
    if (engineMode === "PROPOSE") {
      toast({
        title: "Modo PROPOSE (Somente Leitura) Ativo",
        description: "Operações destrutivas e alterações no banco estão bloqueadas em PROPOSE. Mude para o modo APPLY para executar a sanitização.",
        variant: "warning"
      });
      addLog("⚠️ Purga bloqueada: O modo atual é PROPOSE (Somente Leitura).", "warning");
      return;
    }

    if (!confirm("Confirmar execução do plano de sanitização e purga de registros inválidos?")) return;

    setIsRunning(true);
    setRunningAction("Sanitização Persistente em Modo APPLY");
    setProgress({ current: 30, total: 100 });
    addLog("🧹 Aplicando plano de sanitização e deduplicação...");

    try {
      const result = await dataQualityEngine.runDataQualityAudit({ mode: "APPLY", dryRun: false, onLog: addLog });
      const storageRes = cleanAndDeduplicateAllStorage();
      setProgress({ current: 90, total: 100 });

      qc.invalidateQueries();
      setProgress({ current: 100, total: 100 });

      const totalUpdates = (result.stats?.updatedCount || 0) + (storageRes.cardsRemoved || 0);
      addLog(`✓ Sanitização concluída: ${totalUpdates} registros sanitizados.`, "success");
      toast({
        title: "Sanitização Concluída!",
        description: `${totalUpdates} registros atualizados ou deduplicados com sucesso.`
      });
    } catch (err) {
      addLog(`💥 Erro na sanitização: ${err.message}`, "error");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
      setRunningAction("");
    }
  };

  // Reparar Carta da Quarentena
  const handleRepairCard = async (cardId) => {
    try {
      addLog(`🔧 Reparando carta ID ${cardId}...`);
      await dataQualityEngine.repairQuarantinedCard(cardId, (msg, type) => addLog(msg, type));
      qc.invalidateQueries();
      toast({ title: "Carta Reparada!", description: "Dados atualizados com sucesso." });
    } catch (err) {
      addLog(`✗ Erro ao reparar carta: ${err.message}`, "error");
    }
  };

  // Aprovação Manual
  const handleApproveCard = async (cardId) => {
    try {
      await db.entities.Card.update(cardId, {
        status: "valid",
        quality_score: 85,
        rejection_reason: "",
        last_validation: new Date().toISOString()
      });
      qc.invalidateQueries();
      addLog(`✓ Carta ID ${cardId} aprovada manualmente.`, "success");
      toast({ title: "Carta Aprovada!", description: "Carta promovida a Válida." });
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // Contadores Unificados do AuditReport (Fonte Única da Verdade)
  const totalAnalyzed = auditReport ? auditReport.totalAnalyzed : dbCards.length;
  const validCount = auditReport ? auditReport.validCount : dbCards.filter(c => c.status === "valid" || (!c.status && (c.quality_score || 80) >= 50)).length;
  const metadataCount = auditReport ? auditReport.metadataCount : dbCards.filter(c => c.status === "metadata" || c.type === "metadata").length;
  const quarantineCount = auditReport ? auditReport.quarantineCount : dbCards.filter(c => c.status === "quarantine" || (c.quality_score && c.quality_score < 50)).length;
  const invalidCount = auditReport ? auditReport.invalidCount : dbCards.filter(c => c.status === "invalid").length;
  const unknownCount = auditReport ? auditReport.unknownCount : 0;

  const collectionConflicts = auditReport ? auditReport.flags.collectionConflicts : 0;
  const duplicateRisks = auditReport ? auditReport.flags.duplicateRisks : 0;
  const syntheticEntities = auditReport ? auditReport.flags.syntheticEntities : 0;

  const charactersCount = auditReport ? auditReport.charactersCount : dbCards.filter(c => c.type === "character" || !c.type).length;
  const itemsCount = auditReport ? auditReport.itemsCount : dbCards.filter(c => c.type === "item").length;
  const bossesCount = auditReport ? auditReport.bossesCount : dbCards.filter(c => c.type === "boss" || c.is_boss).length;

  return (
    <div className="space-y-6">
      <KeyboardShortcutsModal
        onRunAudit={() => handleRunFullAudit("PROPOSE")}
        onRunPurge={handlePurgeDuplicates}
        onSelectTab={(tab) => setActiveTab(tab)}
        onFocusSearch={handleFocusSearch}
      />

      {/* Top Header & Mode Switcher */}
      <div className="border border-primary/40 bg-card/60 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">
              DATA QUALITY ENGINE v10.0
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
              engineMode === "PROPOSE" 
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" 
                : engineMode === "REVIEW"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}>
              {engineMode === "PROPOSE" ? "PROPOSE (SOMENTE LEITURA)" : engineMode === "REVIEW" ? "REVIEW (REVISÃO)" : "APPLY (PERSISTENTE)"}
            </span>
          </div>
          <p className="text-xs font-body text-muted-foreground mt-1">
            {engineMode === "PROPOSE" 
              ? "Modo 100% Leitura: analisa, classifica e gera relatórios sem alterar nem excluir nada do banco."
              : engineMode === "REVIEW"
              ? "Modo de Revisão: exibe propostas e plano de migração para auditoria do usuário."
              : "Modo Aplicação: executa alterações e migrações validadas de forma atômica e segura."}
          </p>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleRunFullAudit("PROPOSE")}
            disabled={isRunning}
            className={`px-3.5 py-2.5 font-heading text-xs font-bold rounded-lg transition-all flex items-center gap-2 border ${
              engineMode === "PROPOSE"
                ? "bg-cyan-500 text-black border-cyan-400 font-extrabold shadow-md"
                : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
            }`}
          >
            <Lock className="w-4 h-4 text-cyan-400" />
            PROPOSE (DRY-RUN)
          </button>

          <button
            onClick={() => handleRunFullAudit("REVIEW")}
            disabled={isRunning}
            className={`px-3.5 py-2.5 font-heading text-xs font-bold rounded-lg transition-all flex items-center gap-2 border ${
              engineMode === "REVIEW"
                ? "bg-amber-500 text-black border-amber-400 font-extrabold shadow-md"
                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
            }`}
          >
            <Eye className="w-4 h-4 text-amber-400" />
            REVIEW
          </button>

          <button
            onClick={() => handleRunFullAudit("APPLY")}
            disabled={isRunning}
            className={`px-3.5 py-2.5 font-heading text-xs font-bold rounded-lg transition-all flex items-center gap-2 border ${
              engineMode === "APPLY"
                ? "bg-emerald-500 text-black border-emerald-400 font-extrabold shadow-md"
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            APPLY
          </button>

          <button
            onClick={handlePurgeDuplicates}
            disabled={isRunning || engineMode === "PROPOSE"}
            className="px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-heading text-xs font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            title={engineMode === "PROPOSE" ? "Bloqueado no modo PROPOSE" : "Executar purga"}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            PURGAR
          </button>
        </div>
      </div>

      {isRunning && (
        <ScanlineProgress
          current={progress.current}
          total={progress.total}
          label={runningAction || "Executando operação..."}
          status="PROCESSANDO"
          color="primary"
        />
      )}

      {/* KPI Cards (MUTUALLY EXCLUSIVE PRIMARY STATES) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-card/40 border border-border/60 p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-muted-foreground font-bold uppercase block">REGISTROS</span>
          <span className="text-xl font-heading font-black text-foreground">{totalAnalyzed}</span>
          <span className="text-[9px] font-mono text-muted-foreground block mt-0.5">Analisados</span>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">VÁLIDOS</span>
          <span className="text-xl font-heading font-black text-emerald-400">{validCount}</span>
          <span className="text-[9px] font-mono text-emerald-500/70 block mt-0.5">100% Aprovados</span>
        </div>

        <div className="bg-amber-950/20 border border-amber-500/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">QUARENTENA</span>
          <span className="text-xl font-heading font-black text-amber-400">{quarantineCount}</span>
          <span className="text-[9px] font-mono text-amber-500/70 block mt-0.5">Em Análise</span>
        </div>

        <div className="bg-purple-950/20 border border-purple-500/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-purple-400 font-bold uppercase block">METADADOS</span>
          <span className="text-xl font-heading font-black text-purple-400">{metadataCount}</span>
          <span className="text-[9px] font-mono text-purple-500/70 block mt-0.5">Mídia/Game/Universo</span>
        </div>

        <div className="bg-red-950/20 border border-red-500/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-red-400 font-bold uppercase block">INVÁLIDOS</span>
          <span className="text-xl font-heading font-black text-red-400">{invalidCount}</span>
          <span className="text-[9px] font-mono text-red-500/70 block mt-0.5">Estrutural</span>
        </div>

        <div className="bg-blue-950/20 border border-blue-500/40 p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-blue-400 font-bold uppercase block">CONFLITO COL.</span>
          <span className="text-xl font-heading font-black text-blue-400">{collectionConflicts}</span>
          <span className="text-[9px] font-mono text-blue-500/70 block mt-0.5">Flag Secundária</span>
        </div>
      </div>

      {/* Secondary Entity Type Breakdown Banner */}
      <div className="bg-secondary/20 border border-border/50 p-3 rounded-lg flex flex-wrap items-center justify-between text-xs font-mono gap-3">
        <div className="flex items-center gap-4">
          <span>👥 PERSONAGENS: <strong className="text-primary">{charactersCount}</strong></span>
          <span>⚔️ ITENS: <strong className="text-amber-400">{itemsCount}</strong></span>
          <span>👑 BOSSES: <strong className="text-purple-400">{bossesCount}</strong></span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {duplicateRisks > 0 && <span className="text-amber-300 font-bold">⚠️ {duplicateRisks} Riscos de Duplicata</span>}
          {syntheticEntities > 0 && <span className="text-red-300 font-bold">🤖 {syntheticEntities} Sintéticos Suspeitos</span>}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/60 gap-1">
        <button
          onClick={() => setActiveTab("quarantine")}
          className={`px-4 py-2 font-heading text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "quarantine" ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> QUARENTENA ({quarantineCount})
        </button>

        <button
          onClick={() => setActiveTab("valid")}
          className={`px-4 py-2 font-heading text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "valid" ? "border-emerald-400 text-emerald-400 bg-emerald-400/10" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> CARTAS VÁLIDAS ({validCount})
        </button>

        <button
          onClick={() => setActiveTab("metadata")}
          className={`px-4 py-2 font-heading text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "metadata" ? "border-purple-400 text-purple-400 bg-purple-400/10" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" /> METADADOS ({metadataCount})
        </button>

        {auditReport?.highRiskRecords?.length > 0 && (
          <button
            onClick={() => setActiveTab("high_risk")}
            className={`px-4 py-2 font-heading text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "high_risk" ? "border-red-400 text-red-400 bg-red-400/10" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="w-4 h-4" /> REGISTROS DE RISCO ({auditReport.highRiskRecords.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab("visualizer")}
          className={`px-4 py-2 font-heading text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "visualizer" ? "border-primary text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers3 className="w-4 h-4" /> CANÔNICO POR COLEÇÃO
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === "visualizer" ? (
        <CollectionVisualizer cards={dbCards} />
      ) : activeTab === "high_risk" && auditReport ? (
        <div className="space-y-3">
          <h3 className="font-heading text-xs font-bold uppercase text-red-400 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Top Registros de Maior Risco Identificados na Auditoria
          </h3>
          <div className="border border-red-500/30 rounded-xl overflow-hidden bg-card/40">
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border/40 font-mono text-xs">
              {auditReport.highRiskRecords.map((item, idx) => (
                <div key={item.id || idx} className="p-3 hover:bg-secondary/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-foreground text-sm">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground block">ID: {item.id} | Coleção Atual: {item.currentCollection} → Sugerida: {item.suggestedCollection}</span>
                    <span className="text-xs text-amber-300/80 block mt-1">Motivo: {item.reason}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-300 border border-red-500/30 block mb-1">
                      {item.primaryState.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Score: {item.qualityScore}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nome ou coleção... (Atalho: Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-secondary/40 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground w-full sm:w-80 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
            <div className="p-4 text-xs font-mono text-muted-foreground border-b border-border/40 flex items-center justify-between">
              <span>Exibindo categoria "{activeTab.toUpperCase()}"</span>
              <span>Visualizando catálogo</span>
            </div>

            <div className="max-h-[600px] overflow-y-auto divide-y divide-border/40 font-mono text-xs">
              {dbCards
                .filter(c => {
                  if (activeTab === "quarantine") return c.status === "quarantine" || (c.quality_score && c.quality_score < 50);
                  if (activeTab === "valid") return c.status === "valid" || (!c.status && (c.quality_score || 80) >= 50);
                  if (activeTab === "metadata") return c.status === "metadata" || c.type === "metadata";
                  return true;
                })
                .filter(c => !searchQuery || (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (c.collection_id || "").toLowerCase().includes(searchQuery.toLowerCase()))
                .map((card) => (
                  <div key={card.id} className="p-3 hover:bg-secondary/30 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-3">
                      {card.image_url || card.img_oficial || card.img_custom ? (
                        <img src={card.img_custom || card.img_oficial || card.image_url} alt={card.name} className="w-10 h-10 object-cover rounded border border-border/60 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-secondary/80 rounded flex items-center justify-center text-muted-foreground text-[10px] shrink-0 font-bold">SEM IMG</div>
                      )}

                      <div>
                        <div className="font-bold text-foreground text-sm flex items-center gap-2">
                          {card.name}
                          <span className="text-[10px] font-normal px-1.5 py-0.2 bg-secondary text-muted-foreground rounded border border-border/40">
                            {card.collection_id || "COL-00-MULTI"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          Tipo: {card.type || "character"} | Score: {card.quality_score || 75}/100
                        </span>
                        {card.rejection_reason && (
                          <span className="text-[11px] text-amber-300 block mt-0.5">⚠️ {card.rejection_reason}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleRepairCard(card.id)}
                        className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 transition-all text-[10px] font-bold flex items-center gap-1"
                        title="Reparar com Fandom/Catalog"
                      >
                        <Wrench className="w-3.5 h-3.5" /> REPARAR
                      </button>

                      <button
                        onClick={() => handleApproveCard(card.id)}
                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 transition-all text-[10px] font-bold flex items-center gap-1"
                        title="Promover a Válida"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> APROVAR
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
