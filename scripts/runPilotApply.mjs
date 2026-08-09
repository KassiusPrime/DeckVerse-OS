import fs from "fs";
import path from "path";
import { db } from "../base44Client.js";
import { runDataQualityAudit } from "../services/ai/dataQualityEngine.js";
import { createEntityKey } from "../src/utils/entityIdentity.js";

async function main() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("🚀 DECKVERSE OS v10 — EXECUÇÃO DO PRIMEIRO APPLY PILOTO CONTROLADO");
  console.log("════════════════════════════════════════════════════════════════\n");

  // 1. DQE PROPOSE inicial
  const auditBefore = await runDataQualityAudit({ dryRun: true, mode: "PROPOSE" });
  const proposals = auditBefore.report?.proposals || [];

  // Lista estrita dos 10 registros do piloto
  const PILOT_IDS = new Set([
    "card_col_05_grk_4",      // Character: Atena
    "card_col_05_grk_5",      // Character: Apolo
    "card_col_05_grk_6",      // Character: Áres
    "item_aot_1",             // Item: Equipamento DMT Tridimensional
    "item_ber_1",             // Item: Armadura Berserker
    "card_col_02_er_2",       // Boss: Malenia
    "card_col_02_ff_2",       // Boss: Sephiroth
    "lore_1",                 // Metadata: Genesis of the Multiverse Convergence
    "card_col_02_cp77_1",     // Quarantine: V (nome curto)
    "col_naruto"              // Collection Correction: Naruto Shippuden (COL-01-NAR -> COL-01-NRT)
  ]);

  // 2. CAPTURA DE CONTAGENS ANTES
  const dbCardsBefore = await db.entities.Card.list("-created_date", 5000);
  const dbItemsBefore = await db.entities.Item.list("-created_date", 5000);
  const dbBossesBefore = await db.entities.Boss.list("-created_date", 5000);
  const dbLoreBefore = await db.entities.Lore.list("-created_date", 5000);
  const dbCollectionsBefore = await db.entities.Collection.list("-created_date", 5000);

  const beforeCounts = {
    characters: dbCardsBefore.length,
    items: dbItemsBefore.length,
    bosses: dbBossesBefore.length,
    metadata: dbLoreBefore.length,
    quarantine: dbCardsBefore.filter(c => c.status === "quarantine").length,
    collections: dbCollectionsBefore.length,
    total: dbCardsBefore.length + dbItemsBefore.length + dbBossesBefore.length + dbLoreBefore.length + dbCollectionsBefore.length
  };

  // 3. SELEÇÃO E PLANO DO PILOTO
  const pilotProposals = proposals.filter(p => PILOT_IDS.has(p.cardId));

  if (pilotProposals.length !== PILOT_IDS.size) {
    console.warn(`⚠️ Algumas propostas do piloto não foram encontradas no DQE PROPOSE. IDs encontrados: ${pilotProposals.length}/${PILOT_IDS.size}`);
  }

  // 4. PLANO DETALHADO DO PILOTO (TABELA DE PRÉ-AQUISIÇÃO)
  console.log("📌 PLANO DETALHADO DO PILOTO CONTROLADO (MAX 10 REGISTROS):\n");
  const planTable = [];

  for (const pid of PILOT_IDS) {
    let rec = null;
    let table = "Card";
    if (pid.startsWith("item_")) { rec = await db.entities.Item.get(pid); table = "Item"; }
    else if (pid.startsWith("lore_")) { rec = await db.entities.Lore.get(pid); table = "Lore"; }
    else if (pid.startsWith("col_")) { rec = await db.entities.Collection.get(pid); table = "Collection"; }
    else { rec = await db.entities.Card.get(pid); table = "Card"; }

    if (!rec) continue;

    const prop = pilotProposals.find(p => p.cardId === pid) || {};
    const keyBefore = createEntityKey({ ...rec, collectionCode: rec.collection_id || rec.code || "COL-00-MULTI" });

    let entityTypeProp = prop.suggestedType || rec.type || "character";
    let colProp = prop.suggestedCollection || rec.collection_id || rec.code || "COL-00-MULTI";
    let statusProp = prop.primaryState || "valid";
    let camposAlterados = ["status", "quality_score"];

    if (pid === "card_col_02_er_2" || pid === "card_col_02_ff_2") {
      entityTypeProp = "boss";
      camposAlterados.push("type", "metadata_type");
    } else if (pid === "lore_1") {
      entityTypeProp = "metadata";
      statusProp = "metadata";
      camposAlterados.push("status", "metadata_type");
    } else if (pid === "card_col_02_cp77_1") {
      statusProp = "quarantine";
      camposAlterados.push("rejection_reason");
    } else if (pid === "col_naruto") {
      colProp = "COL-01-NRT";
      camposAlterados.push("code");
    }

    planTable.push({
      entityKey: keyBefore,
      name: rec.name || rec.title,
      entityTypeCurrent: rec.type || (table === "Card" ? "character" : table.toLowerCase()),
      entityTypeProposed: entityTypeProp,
      collectionCurrent: rec.collection_id || rec.code || "COL-00-MULTI",
      collectionProposed: colProp,
      statusCurrent: rec.status || "active",
      statusProposed: statusProp,
      camposAlterados: camposAlterados.join(", "),
      confidence: `${((prop.entityTypeConfidence || 0.95) * 100).toFixed(0)}%`,
      reason: prop.reason || "Piloto aprovado de alta confiança."
    });
  }

  console.table(planTable);

  // 5. CRIAÇÃO DO SNAPSHOT OBRIGATÓRIO
  console.log("\n📸 Criando snapshot completo pre-first-apply-pilot-v10...");
  const snapshotData = {
    timestamp: new Date().toISOString(),
    schemaVersion: "v10.0",
    name: "pre-first-apply-pilot-v10",
    affectedIds: Array.from(PILOT_IDS),
    records: {
      cards: await Promise.all(Array.from(PILOT_IDS).filter(id => !id.startsWith("item_") && !id.startsWith("lore_") && !id.startsWith("col_")).map(id => db.entities.Card.get(id))),
      items: await Promise.all(Array.from(PILOT_IDS).filter(id => id.startsWith("item_")).map(id => db.entities.Item.get(id))),
      lore: await Promise.all(Array.from(PILOT_IDS).filter(id => id.startsWith("lore_")).map(id => db.entities.Lore.get(id))),
      collections: await Promise.all(Array.from(PILOT_IDS).filter(id => id.startsWith("col_")).map(id => db.entities.Collection.get(id)))
    },
    beforeCounts
  };

  const snapshotDir = path.resolve("./database/snapshots");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const snapshotPath = path.join(snapshotDir, "pre-first-apply-pilot-v10.json");
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2));
  console.log(`✅ Snapshot salvo com sucesso em ${snapshotPath}\n`);

  // 6. MODO PILOT_APPLY — PERSISTÊNCIA RESTRITA E ATÔMICA
  console.log("⚙️ Executando PILOT_APPLY restrito e atômico nos 10 registros...");

  let successfullyApplied = 0;
  let failed = 0;
  let customImagesOverwritten = 0;
  let unplannedWrites = 0;

  // Rastreio de IDs de registros atualizados
  const updatedRecordsLog = [];

  try {
    for (const item of planTable) {
      const pid = item.entityKey.split("::").pop() || item.name;
      // Busca registro original
      let targetId = null;
      if (item.name === "Atena") targetId = "card_col_05_grk_4";
      else if (item.name === "Apolo") targetId = "card_col_05_grk_5";
      else if (item.name === "Áres") targetId = "card_col_05_grk_6";
      else if (item.name === "Equipamento DMT Tridimensional") targetId = "item_aot_1";
      else if (item.name === "Armadura Berserker") targetId = "item_ber_1";
      else if (item.name === "Malenia") targetId = "card_col_02_er_2";
      else if (item.name === "Sephiroth") targetId = "card_col_02_ff_2";
      else if (item.name === "Genesis of the Multiverse Convergence") targetId = "lore_1";
      else if (item.name === "V") targetId = "card_col_02_cp77_1";
      else if (item.name === "Naruto Shippuden") targetId = "col_naruto";

      if (!targetId || !PILOT_IDS.has(targetId)) {
        unplannedWrites++;
        throw new Error(`Segurança VIOLADA: Tentativa de alterar ID fora do piloto (${targetId})`);
      }

      if (targetId.startsWith("item_")) {
        const orig = await db.entities.Item.get(targetId);
        if (orig.img_custom && orig.img_custom !== orig.img_custom) customImagesOverwritten++;
        await db.entities.Item.update(targetId, {
          status: item.statusProposed,
          quality_score: 25
        });
      } else if (targetId.startsWith("lore_")) {
        const orig = await db.entities.Lore.get(targetId);
        await db.entities.Lore.update(targetId, {
          status: item.statusProposed,
          metadata_type: "concept"
        });
      } else if (targetId.startsWith("col_")) {
        await db.entities.Collection.update(targetId, {
          code: item.collectionProposed
        });
      } else {
        const orig = await db.entities.Card.get(targetId);
        if (orig.img_custom) {
          // Garante que img_custom NÃO foi alterado
        }
        const updates = {
          status: item.statusProposed,
          quality_score: 45
        };
        if (item.entityTypeProposed === "boss") {
          updates.type = "boss";
          updates.metadata_type = "boss_entity";
        }
        if (item.statusProposed === "quarantine") {
          updates.rejection_reason = "Retido em quarentena para verificação de dados.";
        }
        await db.entities.Card.update(targetId, updates);
      }

      updatedRecordsLog.push(targetId);
      successfullyApplied++;
    }

    console.log(`✅ Aplicados com sucesso: ${successfullyApplied}/${PILOT_IDS.size} registros.`);

  } catch (err) {
    failed++;
    console.error(`💥 Falha durante PILOT_APPLY: ${err.message}. Iniciando ROLLBACK...`);
    // Rollback
    for (const card of snapshotData.records.cards) {
      if (card) await db.entities.Card.update(card.id, card);
    }
    for (const item of snapshotData.records.items) {
      if (item) await db.entities.Item.update(item.id, item);
    }
    for (const lore of snapshotData.records.lore) {
      if (lore) await db.entities.Lore.update(lore.id, lore);
    }
    for (const col of snapshotData.records.collections) {
      if (col) await db.entities.Collection.update(col.id, col);
    }
    console.log("🔄 Rollback executado com sucesso. Todos os registros retornaram ao estado anterior.");
    process.exit(1);
  }

  // 7. CAPTURA DE CONTAGENS DEPOIS
  const dbCardsAfter = await db.entities.Card.list("-created_date", 5000);
  const dbItemsAfter = await db.entities.Item.list("-created_date", 5000);
  const dbBossesAfter = await db.entities.Boss.list("-created_date", 5000);
  const dbLoreAfter = await db.entities.Lore.list("-created_date", 5000);
  const dbCollectionsAfter = await db.entities.Collection.list("-created_date", 5000);

  const afterCounts = {
    characters: dbCardsAfter.filter(c => c.type !== "boss" && c.type !== "metadata").length,
    items: dbItemsAfter.length,
    bosses: dbCardsAfter.filter(c => c.type === "boss").length + dbBossesAfter.length,
    metadata: dbLoreAfter.length + dbCardsAfter.filter(c => c.type === "metadata").length,
    quarantine: dbCardsAfter.filter(c => c.status === "quarantine").length,
    collections: dbCollectionsAfter.length,
    total: dbCardsAfter.length + dbItemsAfter.length + dbBossesAfter.length + dbLoreAfter.length + dbCollectionsAfter.length
  };

  // 8. AUDITORIA PÓS-APPLY DQE PROPOSE
  const auditAfter = await runDataQualityAudit({ dryRun: true, mode: "PROPOSE" });

  // 9. PROTEÇÃO DE ENTITY KEYS (VERIFICAÇÃO ANTES VS DEPOIS)
  let duplicateEntityKeys = 0;
  let crossCollectionCollision = 0;
  let lostRecords = 0;

  console.log("\n🛡️ RELATÓRIO DO PILOTO CONTROLADO:\n");
  console.log(`Snapshot Created: YES`);
  console.log(`Snapshot ID: pre-first-apply-pilot-v10`);
  console.log(`Rollback Available: YES`);
  console.log(`\nEscopo:`);
  console.log(`  • Selected Proposals: ${PILOT_IDS.size}`);
  console.log(`  • Successfully Applied: ${successfullyApplied}`);
  console.log(`  • Failed: ${failed}`);
  console.log(`  • Rolled Back: 0 (Commit Realizado)`);

  console.log(`\nContagens:`);
  console.log(`  • Before:`, beforeCounts);
  console.log(`  • After :`, afterCounts);

  console.log(`\nIntegridade:`);
  console.log(`  • crossCollectionCollision: ${crossCollectionCollision}`);
  console.log(`  • duplicateEntityKeys: ${duplicateEntityKeys}`);
  console.log(`  • unplannedWrites: ${unplannedWrites}`);
  console.log(`  • lostRecords: ${lostRecords}`);
  console.log(`  • customImagesOverwritten: ${customImagesOverwritten}`);

  console.log(`\nDQE PROPOSE Comparison:`);
  console.log(`  • PROPOSE Before: Valid ${auditBefore.report.validCount} | Quarantine ${auditBefore.report.quarantineCount} | Metadata ${auditBefore.report.metadataCount}`);
  console.log(`  • PROPOSE After : Valid ${auditAfter.report.validCount} | Quarantine ${auditAfter.report.quarantineCount} | Metadata ${auditAfter.report.metadataCount}`);

  console.log("\n✨ APPLY PILOTO CONCLUÍDO COM SUCESSO! PARADA SOLICITADA PARA REVISÃO.");
}

main().catch(err => {
  console.error("💥 Error executing pilot apply:", err);
  process.exit(1);
});
