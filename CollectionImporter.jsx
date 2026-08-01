// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Collection Importer & Mass Repair Panel (Wiki Fandom + Gemini IA)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/base44Client";
import { fandomClient } from "@/services/fandom/fandomClient";
import { enrichmentService } from "@/services/ai/enrichmentService";
import { validateCollection, validateCard, validateItem, validateBoss } from "@/lib/importSchemas";
import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES } from "@/src/data/megaCollectionsData";
import { Input } from "@/input";
import { Textarea } from "@/textarea";
import { useToast } from "@/use-toast";
import {
  Database, Sparkles, RefreshCw, Check, AlertCircle, Layers, Shield,
  FileCode, Play, Image as ImageIcon, Wrench, Trash2, Plus, CheckCircle2, XCircle
} from "lucide-react";

export default function CollectionImporter() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("builder"); // builder | repair | json

  // ─── BUILDER STATE ───
  const [collectionCode, setCollectionCode] = useState("NAR");
  const [collectionName, setCollectionName] = useState("Naruto");
  const [collectionDesc, setCollectionDesc] = useState("Ninjas de Konoha, Akatsuki, Hokages e Jinchurikis");
  const [collectionImage, setCollectionImage] = useState("https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80");

  const [cardSeeds, setCardSeeds] = useState([
    { name: "Naruto Uzumaki", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Sasuke Uchiha", rarity: "SSR", role: "Assassin", isBoss: false },
    { name: "Kakashi Hatake", rarity: "SR", role: "Support", isBoss: false },
    { name: "Kaguya Otsutsuki", rarity: "BOSS", role: "Mage", isBoss: true }
  ]);

  // ─── TOGGLES ───
  const [includeCards, setIncludeCards] = useState(true);
  const [includeItems, setIncludeItems] = useState(true);
  const [includeBosses, setIncludeBosses] = useState(true);
  const [useWikiAI, setUseWikiAI] = useState(true);

  // ─── JSON BULK STATE ───
  const [jsonInput, setJsonInput] = useState("");
  const [jsonValidation, setJsonValidation] = useState(null);

  // ─── EXECUTION & LOG STATE ───
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // DB Queries for Repair tab
  const { data: dbCollections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => db.entities.Collection.list(),
  });

  const { data: dbCards = [] } = useQuery({
    queryKey: ["admin-cards"],
    queryFn: () => db.entities.Card.list("-created_date", 1000),
  });

  // Helper para adicionar logs com scroll
  const addLog = (msg, type = "info") => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() }]);
  };

  // Carrega Preset MEGA
  const handleSelectPreset = (col) => {
    setCollectionCode(col.code);
    setCollectionName(col.name);
    setCollectionDesc(col.description || "");
    setCollectionImage(col.image_url || "");

    // Generates preset seeds based on collection
    if (col.code === "NAR") {
      setCardSeeds([
        { name: "Naruto Uzumaki", rarity: "SSR", role: "DPS", isBoss: false },
        { name: "Sasuke Uchiha", rarity: "SSR", role: "Assassin", isBoss: false },
        { name: "Kakashi Hatake", rarity: "SR", role: "Support", isBoss: false },
        { name: "Madara Uchiha", rarity: "UR", role: "Tank", isBoss: true }
      ]);
    } else if (col.code === "DBZ") {
      setCardSeeds([
        { name: "Son Goku", rarity: "UR", role: "DPS", isBoss: false },
        { name: "Vegeta", rarity: "SSR", role: "DPS", isBoss: false },
        { name: "Piccolo", rarity: "SR", role: "Tank", isBoss: false },
        { name: "Jiren", rarity: "BOSS", role: "Berserker", isBoss: true }
      ]);
    } else if (col.code === "SNK") {
      setCardSeeds([
        { name: "Eren Yeager", rarity: "SSR", role: "DPS", isBoss: false },
        { name: "Mikasa Ackerman", rarity: "SSR", role: "Assassin", isBoss: false },
        { name: "Levi Ackerman", rarity: "UR", role: "Assassin", isBoss: false },
        { name: "Eren Yeager (Titã Fundador)", rarity: "ANOMALIA", role: "Berserker", isBoss: true }
      ]);
    } else {
      setCardSeeds([
        { name: `${col.name} Protagonista`, rarity: "SSR", role: "DPS", isBoss: false },
        { name: `${col.name} Rival`, rarity: "SR", role: "Assassin", isBoss: false },
        { name: `${col.name} Mentor`, rarity: "SR", role: "Support", isBoss: false },
        { name: `Boss Lendário de ${col.name}`, rarity: "BOSS", role: "Tank", isBoss: true }
      ]);
    }

    toast({ title: "Preset Carregado", description: `Coleção ${col.name} (${col.code}) pronta para importação.` });
  };

  // ─── OPERAÇÃO 1: IMPORTAR COLEÇÃO NOVA / BUILDER ───
  const handleRunImport = async () => {
    setIsRunning(true);
    setLogs([]);

    try {
      addLog(`🚀 Iniciando pipeline de importação da Coleção: ${collectionName} [${collectionCode}]...`);

      // 1. Validar e Salvar Coleção
      const colValidation = validateCollection({
        code: collectionCode,
        name: collectionName,
        description: collectionDesc,
        image_url: collectionImage
      });

      if (!colValidation.ok) {
        addLog(`✗ Erro na validação da coleção: ${colValidation.errors.join(", ")}`, "error");
        toast({ title: "Validação Falhou", description: colValidation.errors[0], variant: "destructive" });
        setIsRunning(false);
        return;
      }

      const colData = colValidation.data;
      const existingCols = await db.entities.Collection.filter({ code: colData.code });
      if (existingCols.length > 0) {
        await db.entities.Collection.update(existingCols[0].id, colData);
        addLog(`✓ Coleção [${colData.code}] atualizada no DB.`, "success");
      } else {
        await db.entities.Collection.create(colData);
        addLog(`✓ Coleção [${colData.code}] criada no DB.`, "success");
      }

      // 2. Importar Cartas com Wiki + IA + Schema
      if (includeCards && cardSeeds.length > 0) {
        setProgress({ current: 0, total: cardSeeds.length });
        addLog(`📦 Importando ${cardSeeds.length} personagens...`);

        for (let i = 0; i < cardSeeds.length; i++) {
          const seed = cardSeeds[i];
          setProgress({ current: i + 1, total: cardSeeds.length });

          try {
            let finalCardData;

            if (useWikiAI) {
              addLog(`  🔍 [Wiki+IA] Buscando ${seed.name}...`);
              const enrichedResult = await enrichmentService.enrichCardFromWikiAndAI(seed.name, colData.code, {
                rarity: seed.rarity,
                role: seed.role,
                isBoss: seed.isBoss,
                fallbackImage: colData.image_url
              });
              finalCardData = enrichedResult.cardData;
            } else {
              // Modo básico sem wiki
              const basicValidation = validateCard({
                name: seed.name,
                collection_id: colData.code,
                rarity: seed.rarity,
                role: seed.role,
                is_boss: seed.isBoss,
                image_url: colData.image_url,
                lore: `${seed.name} da franquia ${colData.name}.`
              });
              finalCardData = basicValidation.data;
            }

            // Salva / Atualiza Carta no DB
            const existingCards = await db.entities.Card.filter({ name: finalCardData.name, collection_id: colData.code });
            if (existingCards.length > 0) {
              // Preserva img_custom se existir no DB
              const oldImgCustom = existingCards[0].img_custom;
              if (oldImgCustom) {
                finalCardData.img_custom = oldImgCustom;
              }
              await db.entities.Card.update(existingCards[0].id, finalCardData);
              addLog(`✓ [OK] ${finalCardData.name} — ${finalCardData.rarity} (Atualizado)`, "success");
            } else {
              await db.entities.Card.create(finalCardData);
              addLog(`✓ [OK] ${finalCardData.name} — ${finalCardData.rarity} (Criado)`, "success");
            }
          } catch (err) {
            addLog(`✗ [ERRO] ${seed.name} — ${err.message}`, "error");
          }
        }
      }

      // 3. Importar Itens da Coleção se houver
      if (includeItems) {
        const matchingItems = MEGA_ITEMS.filter(itm => itm.collection_id === colData.code);
        if (matchingItems.length > 0) {
          addLog(`🗡 Importando ${matchingItems.length} itens da coleção ${colData.code}...`);
          for (const rawItem of matchingItems) {
            const itemVal = validateItem(rawItem);
            if (itemVal.ok) {
              const existing = await db.entities.Item.filter({ item_code: itemVal.data.item_code });
              if (existing.length > 0) {
                await db.entities.Item.update(existing[0].id, itemVal.data);
              } else {
                await db.entities.Item.create(itemVal.data);
              }
              addLog(`✓ [ITEM] ${itemVal.data.name} (${itemVal.data.rarity})`, "success");
            }
          }
        }
      }

      // 4. Importar Bosses da Coleção se houver
      if (includeBosses) {
        const matchingBosses = MEGA_BOSSES.filter(b => b.collection_id === colData.code);
        if (matchingBosses.length > 0) {
          addLog(`👑 Importando ${matchingBosses.length} Bosses da coleção ${colData.code}...`);
          for (const rawBoss of matchingBosses) {
            const bossVal = validateBoss(rawBoss);
            if (bossVal.ok) {
              const existing = await db.entities.Card.filter({ name: bossVal.data.name, collection_id: colData.code });
              if (existing.length > 0) {
                const oldCustom = existing[0].img_custom;
                if (oldCustom) bossVal.data.img_custom = oldCustom;
                await db.entities.Card.update(existing[0].id, bossVal.data);
              } else {
                await db.entities.Card.create(bossVal.data);
              }
              addLog(`✓ [BOSS] ${bossVal.data.name} (HP: ${bossVal.data.hp})`, "success");
            }
          }
        }
      }

      // Invalidar queries do React Query
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["admin-cards"] });
      qc.invalidateQueries({ queryKey: ["cards-arena"] });
      qc.invalidateQueries({ queryKey: ["roster-arena"] });

      addLog(`🎉 Importação da coleção ${colData.name} concluída com sucesso!`, "success");
      toast({ title: "Importação Concluída!", description: `Coleção ${colData.name} gravada com sucesso no Banco de Conhecimento!` });

    } catch (err) {
      addLog(`💥 Falha fatal na importação: ${err.message}`, "error");
      toast({ title: "Erro na Importação", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  // ─── OPERAÇÃO 2: REPARAR EXISTENTES (FULL OU SÓ IMAGENS) ───
  const handleRepairDatabase = async (mode = "full") => {
    setIsRunning(true);
    setLogs([]);

    try {
      addLog(`🔧 Iniciando reparo em lote no DB (Modo: ${mode.toUpperCase()})...`);
      
      const allCards = await db.entities.Card.list("-created_date", 2000);
      const targetCards = mode === "images" 
        ? allCards.filter(c => !c.img_oficial && !c.image_url) 
        : allCards;

      if (targetCards.length === 0) {
        addLog(`· Nenhuma carta precisa de reparo no modo ${mode}.`, "warning");
        setIsRunning(false);
        return;
      }

      setProgress({ current: 0, total: targetCards.length });
      addLog(`📋 Processando ${targetCards.length} cartas do Banco de Dados...`);

      for (let i = 0; i < targetCards.length; i++) {
        const card = targetCards[i];
        setProgress({ current: i + 1, total: targetCards.length });

        try {
          const wikiSlug = fandomClient.resolveWikiSlug(card.collection_id || card.series || "NAR");

          if (mode === "images") {
            // Busca apenas imagem oficial via cache da Fandom
            const wikiImg = await fandomClient.fetchPageImages(card.name, wikiSlug);
            if (wikiImg) {
              await db.entities.Card.update(card.id, {
                img_oficial: wikiImg,
                image_url: card.image_url || wikiImg
              });
              addLog(`✓ [IMAGEM] ${card.name} → Imagem vinculada com sucesso.`, "success");
            } else {
              addLog(`· [IMAGEM] ${card.name} → Imagem não encontrada na wiki ${wikiSlug}.`, "warning");
            }
          } else {
            // Reparo completo: Fandom Infobox + Gemini IA + Re-validação de Schema
            addLog(`  🔍 [Reparo Full] ${card.name} (${card.collection_id || "MULTIVERSE"})...`);
            
            const enriched = await enrichmentService.enrichCardFromWikiAndAI(card.name, card.collection_id || "MULTIVERSE", {
              rarity: card.rarity,
              role: card.role,
              isBoss: card.is_boss
            });

            const updatedPayload = enriched.cardData;

            // REGRA CRÍTICA: NUNCA SOBRESCREVER img_custom DO ADMIN
            if (card.img_custom) {
              updatedPayload.img_custom = card.img_custom;
            }

            await db.entities.Card.update(card.id, updatedPayload);
            addLog(`✓ [REPARADO] ${card.name} — Stats, Lore, Skills e Imagem atualizados com sucesso.`, "success");
          }
        } catch (err) {
          addLog(`✗ [ERRO] Falha ao reparar ${card.name}: ${err.message}`, "error");
        }
      }

      qc.invalidateQueries();
      addLog(`✅ Reparo em lote concluído com sucesso!`, "success");
      toast({ title: "Reparo Concluído!", description: `${targetCards.length} cartas processadas com sucesso.` });

    } catch (err) {
      addLog(`💥 Erro fatal no reparo: ${err.message}`, "error");
    } finally {
      setIsRunning(false);
    }
  };

  // ─── OPERAÇÃO 3: IMPORTAR JSON BULK ───
  const handleValidateAndImportJSON = async () => {
    if (!jsonInput.trim()) return;

    try {
      const parsed = JSON.parse(jsonInput);
      const itemsToImport = Array.isArray(parsed) ? parsed : [parsed];

      const validatedItems = [];
      const errors = [];

      itemsToImport.forEach((item, idx) => {
        if (item.code || item.type === "collection") {
          const val = validateCollection(item);
          if (val.ok) validatedItems.push({ type: "collection", data: val.data });
          else errors.push(`Item #${idx + 1} (Coleção): ${val.errors.join(", ")}`);
        } else {
          const val = validateCard(item);
          if (val.ok) validatedItems.push({ type: "card", data: val.data });
          else errors.push(`Item #${idx + 1} (Carta): ${val.errors.join(", ")}`);
        }
      });

      setJsonValidation({ ok: errors.length === 0, count: validatedItems.length, errors });

      if (errors.length > 0) {
        toast({ title: "Erros no JSON", description: `${errors.length} entradas inválidas encontradas.`, variant: "destructive" });
        return;
      }

      // Se validado, salva no DB
      setIsRunning(true);
      setLogs([]);
      addLog(`📄 Gravando ${validatedItems.length} entradas do JSON no DB...`);

      for (const item of validatedItems) {
        if (item.type === "collection") {
          const existing = await db.entities.Collection.filter({ code: item.data.code });
          if (existing.length > 0) await db.entities.Collection.update(existing[0].id, item.data);
          else await db.entities.Collection.create(item.data);
          addLog(`✓ [JSON COL] Coleção ${item.data.name} salva.`, "success");
        } else {
          const existing = await db.entities.Card.filter({ name: item.data.name, collection_id: item.data.collection_id });
          if (existing.length > 0) {
            if (existing[0].img_custom) item.data.img_custom = existing[0].img_custom;
            await db.entities.Card.update(existing[0].id, item.data);
          } else {
            await db.entities.Card.create(item.data);
          }
          addLog(`✓ [JSON CARD] Carta ${item.data.name} (${item.data.rarity}) salva.`, "success");
        }
      }

      qc.invalidateQueries();
      toast({ title: "Importação JSON Concluída", description: `${validatedItems.length} registros inseridos com sucesso.` });

    } catch (err) {
      toast({ title: "JSON Inválido", description: "Erro de sintaxe no JSON colado: " + err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border border-primary/30 bg-primary/5 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-sm font-bold text-primary flex items-center gap-2">
            <Database className="w-4 h-4" /> CENTRAL DE IMPORTAÇÃO & REPARO DE COLEÇÕES
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-1">
            Importe franquias completas com dados oficiais da Fandom + IA Gemini, repare artes e estatísticas antigas preservando customizações do Admin.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-muted/20 p-1 border border-border/40 rounded shrink-0">
          <button
            onClick={() => setActiveTab("builder")}
            className={`px-3 py-1.5 text-xs font-heading font-bold rounded transition-colors flex items-center gap-1.5 ${
              activeTab === "builder" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> BUILDER & PRESETS
          </button>
          <button
            onClick={() => setActiveTab("repair")}
            className={`px-3 py-1.5 text-xs font-heading font-bold rounded transition-colors flex items-center gap-1.5 ${
              activeTab === "repair" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> REPARAR DB EXISTENTE
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`px-3 py-1.5 text-xs font-heading font-bold rounded transition-colors flex items-center gap-1.5 ${
              activeTab === "json" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> JSON BULK
          </button>
        </div>
      </div>

      {/* ─── TAB 1: BUILDER & PRESETS ─── */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="space-y-2">
            <h3 className="font-heading text-xs font-bold text-muted-foreground tracking-wider uppercase">
              — SELECIONE UM PRESET MEGA PRE-CONFIGURADO ({MEGA_COLLECTIONS.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {MEGA_COLLECTIONS.map(col => (
                <button
                  key={col.id}
                  onClick={() => handleSelectPreset(col)}
                  className={`text-xs font-heading px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 ${
                    collectionCode === col.code
                      ? "bg-primary/20 text-primary border-primary font-bold"
                      : "bg-card/40 text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="font-mono text-[10px] text-primary bg-primary/10 px-1 rounded">{col.code}</span>
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form Coleção */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border border-border/40 bg-card/30 p-4 rounded-lg">
            <div className="space-y-4">
              <h4 className="font-heading text-xs font-bold text-primary tracking-widest uppercase">
                1. DADOS DA COLEÇÃO / FRANQUIA
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground">CÓDIGO (PREFIXO) *</label>
                  <Input
                    value={collectionCode}
                    onChange={(e) => setCollectionCode(e.target.value.toUpperCase())}
                    placeholder="ex: NAR, DBZ, CYB"
                    className="font-mono text-xs bg-muted/30 border-border/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-heading tracking-widest text-muted-foreground">NOME DA FRANQUIA *</label>
                  <Input
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="ex: Naruto Shippuden"
                    className="font-body text-xs bg-muted/30 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-heading tracking-widest text-muted-foreground">DESCRIÇÃO</label>
                <Textarea
                  value={collectionDesc}
                  onChange={(e) => setCollectionDesc(e.target.value)}
                  className="font-body text-xs bg-muted/30 border-border/50 h-16 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-heading tracking-widest text-muted-foreground">IMAGEM DE BANNER DA COLEÇÃO</label>
                <Input
                  value={collectionImage}
                  onChange={(e) => setCollectionImage(e.target.value)}
                  placeholder="https://..."
                  className="font-mono text-xs bg-muted/30 border-border/50"
                />
              </div>
            </div>

            {/* Preview da Coleção */}
            <div className="space-y-3 flex flex-col justify-between">
              <h4 className="font-heading text-xs font-bold text-muted-foreground tracking-widest uppercase">
                PREVIEW DO BANNER
              </h4>
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border/40 bg-black/50 flex items-center justify-center">
                {collectionImage ? (
                  <img src={collectionImage} alt={collectionName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-mono text-muted-foreground">Sem Banner</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                  <span className="text-[10px] font-mono text-primary font-bold">COLLECTION #{collectionCode}</span>
                  <span className="text-sm font-heading font-black text-white">{collectionName}</span>
                </div>
              </div>

              {/* Toggles de Importação */}
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2 border border-border/30 rounded">
                <label className="flex items-center gap-2 text-xs font-body text-foreground cursor-pointer">
                  <input type="checkbox" checked={includeCards} onChange={(e) => setIncludeCards(e.target.checked)} className="rounded" />
                  Cartas ({cardSeeds.length})
                </label>
                <label className="flex items-center gap-2 text-xs font-body text-foreground cursor-pointer">
                  <input type="checkbox" checked={includeItems} onChange={(e) => setIncludeItems(e.target.checked)} className="rounded" />
                  Itens da Coleção
                </label>
                <label className="flex items-center gap-2 text-xs font-body text-foreground cursor-pointer">
                  <input type="checkbox" checked={includeBosses} onChange={(e) => setIncludeBosses(e.target.checked)} className="rounded" />
                  Bosses de Elite
                </label>
                <label className="flex items-center gap-2 text-xs font-body text-primary font-bold cursor-pointer">
                  <input type="checkbox" checked={useWikiAI} onChange={(e) => setUseWikiAI(e.target.checked)} className="rounded" />
                  Wiki Fandom + Gemini IA
                </label>
              </div>
            </div>
          </div>

          {/* Seeds de Personagens */}
          <div className="border border-border/40 bg-card/30 p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading text-xs font-bold text-primary tracking-widest uppercase">
                2. PERSONAGENS SEEMENTADOS PARA IMPORTAÇÃO ({cardSeeds.length})
              </h4>
              <button
                type="button"
                onClick={() => setCardSeeds([...cardSeeds, { name: "Novo Personagem", rarity: "SSR", role: "DPS", isBoss: false }])}
                className="px-3 py-1 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/40 rounded text-xs font-heading font-bold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> ADICIONAR LINHA
              </button>
            </div>

            <div className="space-y-2">
              {cardSeeds.map((seed, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 border border-border/30 bg-muted/10 rounded">
                  <span className="text-xs font-mono text-muted-foreground w-6">#{idx + 1}</span>
                  <Input
                    value={seed.name}
                    onChange={(e) => {
                      const updated = [...cardSeeds];
                      updated[idx].name = e.target.value;
                      setCardSeeds(updated);
                    }}
                    placeholder="Nome do Personagem"
                    className="flex-1 font-body text-xs bg-muted/30 border-border/50"
                  />
                  <select
                    value={seed.rarity}
                    onChange={(e) => {
                      const updated = [...cardSeeds];
                      updated[idx].rarity = e.target.value;
                      setCardSeeds(updated);
                    }}
                    className="bg-muted/30 border border-border/50 text-xs font-mono p-1.5 rounded text-foreground"
                  >
                    {["C","UC","R","SR","SSR","UR","LR","MR","BOSS","ANOMALIA"].map(r => (
                      <option key={r} value={r}>[{r}]</option>
                    ))}
                  </select>

                  <select
                    value={seed.role}
                    onChange={(e) => {
                      const updated = [...cardSeeds];
                      updated[idx].role = e.target.value;
                      setCardSeeds(updated);
                    }}
                    className="bg-muted/30 border border-border/50 text-xs font-mono p-1.5 rounded text-foreground"
                  >
                    {["DPS","Tank","Support","Healer","Assassin","Mage","Berserker","Sniper"].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1 text-xs font-heading text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seed.isBoss}
                      onChange={(e) => {
                        const updated = [...cardSeeds];
                        updated[idx].isBoss = e.target.checked;
                        if (e.target.checked) updated[idx].rarity = "BOSS";
                        setCardSeeds(updated);
                      }}
                      className="rounded"
                    />
                    Boss
                  </label>

                  <button
                    type="button"
                    onClick={() => setCardSeeds(cardSeeds.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleRunImport}
              disabled={isRunning || !collectionCode || !collectionName}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-xs font-bold tracking-widest transition-colors rounded shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              EXECUTAR IMPORTAÇÃO DA COLEÇÃO {collectionCode}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: REPARAR DB EXISTENTE ─── */}
      {activeTab === "repair" && (
        <div className="space-y-6">
          <div className="border border-amber-500/30 bg-amber-500/5 p-4 rounded-lg space-y-3">
            <h3 className="font-heading text-sm font-bold text-amber-400 flex items-center gap-2">
              <Wrench className="w-4 h-4" /> REPARADOR EM LOTE DO BANCO DE DADOS
            </h3>
            <p className="text-xs font-body text-muted-foreground">
              Esta ferramenta analisa todas as cartas já cadastradas no DB ({dbCards.length} cartas) e atualiza seus atributos, lore, habilidades e imagens oficiais a partir da Fandom + Gemini IA.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>GARANTIA DE SEGURANÇA: Imagens customizadas pelo Admin (`img_custom`) NUNCA são sobrescritas!</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleRepairDatabase("full")}
                disabled={isRunning}
                className="flex-1 py-3 bg-primary hover:bg-primary/80 text-primary-foreground font-heading text-xs font-bold tracking-wider rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                REPARAR EXISTENTES COMPLETO (Wiki + IA + Imagens)
              </button>

              <button
                onClick={() => handleRepairDatabase("images")}
                disabled={isRunning}
                className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-heading text-xs font-bold tracking-wider rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                SÓ IMAGENS (Apenas preencher artes faltando)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: JSON BULK ─── */}
      {activeTab === "json" && (
        <div className="space-y-4 border border-border/40 bg-card/30 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-xs font-bold text-primary uppercase flex items-center gap-2">
              <FileCode className="w-4 h-4" /> IMPORTADOR DE JSON EM LOTE
            </h4>
            <span className="text-[10px] font-mono text-muted-foreground">
              Formato aceito: Array de Coleções e/ou Cartas com validação de Schema
            </span>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`[\n  {\n    "name": "Goku",\n    "collection_id": "DBZ",\n    "rarity": "UR",\n    "role": "DPS",\n    "attack": 95,\n    "hp": 400\n  }\n]`}
            className="font-mono text-xs bg-muted/30 border-border/50 h-48"
          />

          <button
            onClick={handleValidateAndImportJSON}
            disabled={isRunning || !jsonInput.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-xs font-bold tracking-widest rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            VALIDAR SCHEMA E GRAVAR NO BANCO
          </button>
        </div>
      )}

      {/* ─── TERMINAL DE LOGS DE EXECUÇÃO EM TEMPO REAL ─── */}
      {(isRunning || logs.length > 0) && (
        <div className="border border-border/50 bg-black/90 p-4 rounded-lg font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-primary font-bold flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
              LOG DE EXECUÇÃO DA FANDOM WIKI & GEMINI IA
            </span>
            {progress.total > 0 && (
              <span className="text-muted-foreground text-[10px]">
                PROGRESSO: {progress.current} / {progress.total} (
                {Math.round((progress.current / progress.total) * 100)}%)
              </span>
            )}
          </div>

          {progress.total > 0 && (
            <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`text-[11px] leading-tight flex items-start gap-2 ${
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                    ? "text-emerald-400 font-bold"
                    : log.type === "warning"
                    ? "text-amber-400"
                    : "text-gray-300"
                }`}
              >
                <span className="text-gray-600 text-[9px] shrink-0">[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
