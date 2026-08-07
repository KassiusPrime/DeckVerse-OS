import React, { useState, useEffect } from "react";
import {
  FileCheck, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Code, Play, RefreshCw, Cpu, Layers, Sparkles
} from "lucide-react";
import {
  UNIVERSAL_SCHEMA,
  FRANCHISE_SCHEMAS,
  listFranchiseSchemaCodes,
  getFranchiseSchema,
  resolveSchemaCode
} from "@/src/data/franchiseSchemas";
import { validateCardSchema, onSchemaValidation } from "@/core/schemaValidationApi";
import { Textarea } from "@/textarea";

const DEFAULT_TEST_JSON = JSON.stringify(
  {
    name: "Uchiha Sasuke",
    collection_id: "NRT",
    kekkei_genkai: "Sharingan / Rinnegan",
    vila: "Vila Oculta da Folha",
    rank_ninja: "Renegado / Kage das Sombras",
    rarity: "UR",
    role: "DPS"
  },
  null,
  2
);

export default function SchemaRegistryPanel() {
  const codes = listFranchiseSchemaCodes();
  const [selectedCode, setSelectedCode] = useState("NRT");
  const [jsonInput, setJsonInput] = useState(DEFAULT_TEST_JSON);
  const [validationResult, setValidationResult] = useState(null);
  const [validationMode, setValidationMode] = useState("soft");
  const [eventLogs, setEventLogs] = useState([]);

  // Inscrição no Emitter da API de Schema
  useEffect(() => {
    const unsub = onSchemaValidation((event) => {
      setEventLogs(prev => [event, ...prev.slice(0, 19)]);
    });
    return () => unsub();
  }, []);

  const handleRunValidation = (mode = "soft") => {
    setValidationMode(mode);
    try {
      const parsed = JSON.parse(jsonInput);
      const result = validateCardSchema(parsed, { mode });
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        ok: false,
        errors: [`JSON Inválido: ${err.message}`],
        warnings: [],
        data: null,
        schema_code: "N/A"
      });
    }
  };

  const selectedFields = getFranchiseSchema(selectedCode);

  return (
    <div className="space-y-6 text-foreground font-sans">
      {/* HEADER & KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-primary/30 bg-card/60 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="font-heading text-lg font-bold tracking-wider text-foreground uppercase">
              SCHEMAS & VALIDAÇÃO V9
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Modelo Universal imutável e contratos de campos específicos por franquia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 font-mono text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SOFT VALIDATION ACTIVE</span>
          </div>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border/40 bg-card/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">UNIVERSAL BASE FIELDS</p>
            <p className="font-heading text-2xl font-bold text-primary mt-1">{UNIVERSAL_SCHEMA.length}</p>
          </div>
          <Layers className="w-8 h-8 text-primary/40" />
        </div>

        <div className="p-4 rounded-xl border border-border/40 bg-card/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">FRANQUIAS REGISTRADAS</p>
            <p className="font-heading text-2xl font-bold text-emerald-400 mt-1">{codes.length}</p>
          </div>
          <Code className="w-8 h-8 text-emerald-400/40" />
        </div>

        <div className="p-4 rounded-xl border border-border/40 bg-card/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">EVENTOS REGISTRADOS</p>
            <p className="font-heading text-2xl font-bold text-cyan-400 mt-1">{eventLogs.length}</p>
          </div>
          <Cpu className="w-8 h-8 text-cyan-400/40" />
        </div>
      </div>

      {/* EXPLORADOR DE SCHEMAS DE FRANQUIA */}
      <div className="p-5 rounded-xl border border-border/50 bg-card/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider">
              CATÁLOGO DE SCHEMAS DE FRANQUIA (66 FRANQUIAS V9)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-muted-foreground">Franquia:</label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="bg-black/60 border border-primary/40 rounded-lg text-xs font-mono px-3 py-1.5 text-primary focus:outline-none focus:border-primary"
            >
              {codes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Universal Fields Quick List */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
            UNIVERSAL SCHEMA FIELDS (FROZEN BASE):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {UNIVERSAL_SCHEMA.map(f => (
              <span key={f.key} className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted/30 border border-border/40 text-muted-foreground">
                {f.key} {f.required && <span className="text-red-400">*</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Selected Franchise Fields */}
        <div>
          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">
            CAMPOS ESPECÍFICOS DA FRANQUIA [{selectedCode}]:
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFields.map(f => (
              <div key={f.key} className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2">
                <span className="font-bold">{f.key}</span>
                <span className="text-[10px] text-emerald-500/80">({f.label})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTADOR INTERATIVO DE JSON DE SCHEMA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lado Esquerdo: Input JSON */}
        <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              TESTAR VALIDATIVO DE JSON (SOFT / STRICT)
            </span>
            <button
              onClick={() => setJsonInput(DEFAULT_TEST_JSON)}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
            >
              Resetar Exemplo
            </button>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={10}
            className="font-mono text-xs bg-black/80 border-border/60 text-emerald-400 p-3"
          />

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleRunValidation("soft")}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              VALIDAR (MODO SOFT)
            </button>
            <button
              onClick={() => handleRunValidation("strict")}
              className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              VALIDAR (MODO STRICT)
            </button>
          </div>
        </div>

        {/* Lado Direito: Resultado da Validação */}
        <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-foreground">
                RESULTADO DA VALIDAÇÃO
              </span>
              {validationResult && (
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  validationResult.ok ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40" : "bg-red-950 text-red-400 border border-red-500/40"
                }`}>
                  {validationResult.ok ? "VALIDADO COM SUCESSO" : "ERRO DE SCHEMA"}
                </span>
              )}
            </div>

            {!validationResult ? (
              <div className="h-[220px] flex items-center justify-center text-xs font-mono text-muted-foreground">
                Clique em "VALIDAR" para testar o payload JSON acima.
              </div>
            ) : (
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-border/30">
                  <span className="text-muted-foreground">SCHEMA DETECTADO:</span>
                  <span className="text-primary font-bold">{validationResult.schema_code}</span>
                </div>

                {/* Warnings */}
                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/40 space-y-1">
                    <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> WARNINGS ({validationResult.warnings.length}):
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-amber-300/80 space-y-0.5">
                      {validationResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Errors */}
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40 space-y-1">
                    <p className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> ERROS ({validationResult.errors.length}):
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-red-300 space-y-0.5">
                      {validationResult.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Franchise Fields Extracted */}
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">
                    FRANCHISE_FIELDS EXTRAÍDOS:
                  </p>
                  <pre className="p-2.5 rounded bg-black/80 border border-emerald-900/50 text-[10px] text-emerald-300 overflow-x-auto">
                    {JSON.stringify(validationResult.data?.franchise_fields || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EVENT LOGS EM REA TEMPO DO EMITTER */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <span className="text-xs font-heading font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            ÚLTIMOS EVENTOS DE VALIDAÇÃO REGISTRADOS (EMITTER)
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            Total: {eventLogs.length}
          </span>
        </div>

        {eventLogs.length === 0 ? (
          <p className="text-xs font-mono text-muted-foreground p-3 text-center">
            Nenhum evento registrado nesta sessão.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {eventLogs.map((log, i) => (
              <div key={i} className="p-2 rounded bg-black/40 border border-border/30 flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${log.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="font-bold text-foreground">{log.cardName}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">{log.schemaCode}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
                  <span>Warnings: {log.warningsCount}</span>
                  <span>Modo: {log.mode}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
