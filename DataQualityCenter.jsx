// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Centro de Qualidade dos Dados (Data Quality Center)
// Painel Administrativo de Controle de Integridade, Quarentena e Deduplicação
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/base44Client";
import { dataQualityEngine } from "@/services/ai/dataQualityEngine";
import { useToast } from "@/use-toast";
import { pushCRTLog } from "./CRTTerminalOverlay";
import {
  ShieldCheck, AlertTriangle, XCircle, RefreshCw, Sparkles, CheckCircle2,
  Database, Trash2, Wrench, Search, Layers, Activity, FileCheck, Layers3, Play
} from "lucide-react";

export default function DataQualityCenter() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("quarantine"); // quarantine | valid | rejected | audit
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  // Query Cards from DB
  const { data: dbCards = [], isLoading } = useQuery({
    queryKey: ["admin-cards-quality"],
    queryFn: () => db.entities.Card.list("-created_date", 2000)
  });

  const addLog = (msg, type = "info") => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() }]);
    pushCRTLog(msg, type.toUpperCase());
  };

  // KPI Calculations
  const validCards = dbCards.filter(c => (c.status === "valid" || (!c.status && (c.quality_score || 80) >= 50)));
  const quarantinedCards = dbCards.filter(c => c.status === "quarantine" || (c.quality_score && c.quality_score < 50));
  const rejectedCards = dbCards.filter(c => c.status === "rejected");

  const avgScore = dbCards.length > 0
    ? Math.round(dbCards.reduce((acc, c) => acc + (c.quality_score || 75), 0) / dbCards.length)
    : 100;

  // 1. Executar Auditoria Completa
  const handleRunFullAudit = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog("🛡️ Iniciando auditoria e sanitização pelo Data Quality Engine...");

    try {
      const result = await dataQualityEngine.runDataQualityAudit((msg, type) => addLog(msg, type));
      qc.invalidateQueries();
      toast({
        title: "Auditoria Concluída!",
        description: `Válidas: ${result.stats.validCards} | Quarentena: ${result.stats.quarantinedCards} | Duplicadas mescladas: ${result.stats.mergedDuplicates}`
      });
    } catch (err) {
      addLog(`💥 Erro fatal: ${err.message}`, "error");
      toast({ title: "Erro na Auditoria", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  // 2. Auto-Reparar Carta Específica da Quarentena
  const handleRepairCard = async (cardId) => {
    try {
      addLog(`🔧 Reparando carta ID ${cardId}...`);
      await dataQualityEngine.repairQuarantinedCard(cardId, (msg, type) => addLog(msg, type));
      qc.invalidateQueries();
      toast({ title: "Carta Reparada!", description: "Dados canônicos e artes atualizados com sucesso." });
    } catch (err) {
      addLog(`✗ Erro ao reparar carta: ${err.message}`, "error");
    }
  };

  // 3. Aprovação Manual
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

  // 4. Rejeitar Carta
  const handleRejectCard = async (cardId, reason = "Rejeitado pelo Admin") => {
    try {
      await db.entities.Card.update(cardId, {
        status: "rejected",
        rejection_reason: reason,
        last_validation: new Date().toISOString()
      });
      qc.invalidateQueries();
      addLog(`✗ Carta ID ${cardId} movida para rejeitadas.`, "warning");
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // 5. Excluir Rejeitadas Definitivamente
  const handlePurgeRejected = async () => {
    if (rejectedCards.length === 0) return;
    setIsRunning(true);
    addLog(`🧹 Expurgando ${rejectedCards.length} cartas rejeitadas definitivamente...`);

    try {
      for (const card of rejectedCards) {
        await db.entities.Card.delete(card.id);
      }
      qc.invalidateQueries();
      addLog(`✓ ${rejectedCards.length} cartas expurgadas.`, "success");
      toast({ title: "Limpeza Concluída", description: `${rejectedCards.length} registros rejeitados foram removidos.` });
    } catch (err) {
      addLog(`💥 Erro ao expurgar: ${err.message}`, "error");
    } finally {
      setIsRunning(false);
    }
  };

  const filteredQuarantine = quarantinedCards.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.collection_id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredValid = validCards.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.collection_id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRejected = rejectedCards.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.collection_id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="border border-primary/40 bg-card/60 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> CENTRO DE QUALIDADE DOS DADOS (DATA QUALITY ENGINE)
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-1">
            Monitoramento em tempo real de integridade, cálculo de score de qualidade (0-100), quarentena automática e deduplicação inteligente.
          </p>
        </div>

        <button
          onClick={handleRunFullAudit}
          disabled={isRunning}
          className="px-4 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground font-heading text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          EXECUTAR AUDITORIA & CORREÇÃO COMPLETA
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-emerald-950/20 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">CARTAS VÁLIDAS</span>
            <span className="text-2xl font-heading font-black text-emerald-400">{validCards.length}</span>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-500/60" />
        </div>

        <div className="bg-amber-950/20 border border-amber-500/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">EM QUARENTENA</span>
            <span className="text-2xl font-heading font-black text-amber-400">{quarantinedCards.length}</span>
          </div>
          <AlertTriangle className="w-7 h-7 text-amber-500/60" />
        </div>

        <div className="bg-red-950/20 border border-red-500/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-red-400 font-bold uppercase block">REJEITADAS</span>
            <span className="text-2xl font-heading font-black text-red-400">{rejectedCards.length}</span>
          </div>
          <XCircle className="w-7 h-7 text-red-500/60" />
        </div>

        <div className="bg-primary/10 border border-primary/40 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-primary font-bold uppercase block">SCORE MÉDIO DO DB</span>
            <span className="text-2xl font-heading font-black text-primary">{avgScore} / 100</span>
          </div>
          <Activity className="w-7 h-7 text-primary/60" />
        </div>
      </div>

      {/* Filter and Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("quarantine")}
            className={`px-3.5 py-1.5 text-xs font-heading font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "quarantine" ? "bg-amber-500 text-black shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Quarentena ({quarantinedCards.length})
          </button>

          <button
            onClick={() => setActiveTab("valid")}
            className={`px-3.5 py-1.5 text-xs font-heading font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "valid" ? "bg-emerald-500 text-black shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Válidas ({validCards.length})
          </button>

          <button
            onClick={() => setActiveTab("rejected")}
            className={`px-3.5 py-1.5 text-xs font-heading font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "rejected" ? "bg-red-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Rejeitadas ({rejectedCards.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-body bg-muted/20 border border-border/40 rounded-lg text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* ─── TAB 1: QUARENTENA ─── */}
      {activeTab === "quarantine" && (
        <div className="space-y-4">
          {filteredQuarantine.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/40 rounded-xl bg-card/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="font-heading text-sm font-bold text-foreground">Nenhuma carta em quarentena!</h3>
              <p className="text-xs font-body text-muted-foreground mt-1">Todas as cartas ativas cumprem os padrões mínimos de qualidade canônica.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuarantine.map((card) => (
                <div key={card.id} className="border border-amber-500/40 bg-amber-950/10 p-4 rounded-xl flex gap-4 items-start">
                  <div className="w-16 h-20 rounded-lg overflow-hidden bg-black/50 border border-amber-500/30 shrink-0 relative">
                    {card.img_custom || card.img_oficial || card.image_url ? (
                      <img src={card.img_custom || card.img_oficial || card.image_url} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">Sem Img</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading text-sm font-bold text-foreground truncate">{card.name}</h4>
                      <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                        SCORE: {card.quality_score || 45}/100
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-amber-300/80">
                      Motivo: {card.rejection_reason || "Dados canônicos incompletos."}
                    </p>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleRepairCard(card.id)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-heading text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                      >
                        <Wrench className="w-3 h-3" /> Auto-Reparar (Wiki+IA)
                      </button>

                      <button
                        onClick={() => handleApproveCard(card.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </button>

                      <button
                        onClick={() => handleRejectCard(card.id)}
                        className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/60 text-red-300 font-heading text-[10px] font-bold rounded flex items-center gap-1 transition-colors ml-auto"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: CARTAS VÁLIDAS ─── */}
      {activeTab === "valid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredValid.map((card) => (
            <div key={card.id} className="border border-border/40 bg-card/40 p-3 rounded-lg flex items-center gap-3">
              <div className="w-12 h-14 rounded overflow-hidden bg-black/40 border border-border/40 shrink-0">
                <img src={card.img_custom || card.img_oficial || card.image_url} alt={card.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-heading text-xs font-bold text-foreground truncate">{card.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {card.collection_id || "MULTIVERSE"}
                  </span>
                  <span className="font-mono text-[9px] text-emerald-400">Score: {card.quality_score || 85}/100</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 3: CARTAS REJEITADAS ─── */}
      {activeTab === "rejected" && (
        <div className="space-y-4">
          {rejectedCards.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handlePurgeRejected}
                disabled={isRunning}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-heading text-xs font-bold rounded shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> PURGAR TODAS AS REJEITADAS ({rejectedCards.length})
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredRejected.map((card) => (
              <div key={card.id} className="border border-red-500/30 bg-red-950/10 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-heading text-xs font-bold text-red-300">{card.name}</h4>
                  <p className="text-[10px] font-mono text-muted-foreground">{card.rejection_reason}</p>
                </div>
                <button
                  onClick={() => handleApproveCard(card.id)}
                  className="px-2 py-1 bg-muted/40 hover:bg-muted text-xs font-heading font-bold rounded"
                >
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal de Logs */}
      {logs.length > 0 && (
        <div className="border border-border/50 bg-black/90 p-4 rounded-xl font-mono text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-primary font-bold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" /> LOG DE EXECUÇÃO DO DATA QUALITY ENGINE
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
            {logs.map((log) => (
              <div key={log.id} className="text-[11px] leading-tight flex items-start gap-2">
                <span className="text-gray-600 text-[9px] shrink-0">[{log.time}]</span>
                <span className={log.type === "error" ? "text-red-400" : log.type === "success" ? "text-emerald-400 font-bold" : "text-gray-300"}>
                  {log.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
