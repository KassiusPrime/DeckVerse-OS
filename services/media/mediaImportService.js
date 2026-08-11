import JSZip from "jszip";
import { parseMediaFilename } from "./mediaFilenameParser.js";
import { matchMediaEntity } from "./mediaEntityMatcher.js";
import { hasUsableMedia } from "../ai/dataQualityEngine.js";

/**
 * Calcula dinamicamente as métricas de cobertura de mídia do catálogo runtime.
 * Entidades elegíveis: collection, character, item, boss (Metadata/Lore EXCLUÍDOS).
 * 
 * @param {Object} catalog - { collections, cards, items, bosses }
 * @returns {Object} Métrica completa de cobertura de mídia
 */
export function calculateMediaCoverage(catalog = {}) {
  const collections = catalog.collections || [];
  const characters = catalog.cards || catalog.characters || [];
  const items = catalog.items || [];
  const bosses = catalog.bosses || [];

  const totalMediaEligible = collections.length + characters.length + items.length + bosses.length;

  const collectionsMissingMedia = collections.filter(c => !hasUsableMedia(c)).length;
  const charactersMissingMedia = characters.filter(c => !hasUsableMedia(c)).length;
  const itemsMissingMedia = items.filter(i => !hasUsableMedia(i)).length;
  const bossesMissingMedia = bosses.filter(b => !hasUsableMedia(b)).length;

  const missingRealMedia = collectionsMissingMedia + charactersMissingMedia + itemsMissingMedia + bossesMissingMedia;
  const realUsableMedia = totalMediaEligible - missingRealMedia;

  return {
    totalMediaEligible,
    realUsableMedia,
    missingRealMedia,
    collectionsMissingMedia,
    charactersMissingMedia,
    itemsMissingMedia,
    bossesMissingMedia,
    unsplashConsideredUsable: 0,
    localPlaceholderConsideredUsable: 0,
    coveragePercentage: totalMediaEligible > 0 ? Number(((realUsableMedia / totalMediaEligible) * 100).toFixed(1)) : 0
  };
}

/**
 * Executa preflight de auditoria e validação sobre uma lista de arquivos de mídia.
 * GARANTIA: previewWrites = 0 (Nenhuma escrita é realizada).
 * 
 * @param {Array<Object|File|string>} fileList - Lista de objetos contendo nome ou arquivos
 * @param {Object} catalog - Catálogo runtime de entidades
 * @returns {Object} Relatório de preflight
 */
export function preflightFileList(fileList = [], catalog = {}) {
  const fileArray = Array.isArray(fileList) ? fileList : [];
  
  let validFilesCount = 0;
  let matchedCount = 0;
  let notFoundCount = 0;
  let ambiguousCount = 0;
  let invalidCount = 0;
  let conflictsCount = 0;

  const targetKeyMap = new Map();
  const processedFiles = [];

  for (const item of fileArray) {
    const rawFilename = typeof item === "string" ? item : (item.name || item.path || item.filename || "");
    if (!rawFilename) continue;

    const parsed = parseMediaFilename(rawFilename);

    // Filtrar/ignorar arquivos de sistema indiscutíveis
    if (parsed.error === "SYSTEM_OR_HIDDEN_FILE_IGNORED") {
      continue;
    }

    if (!parsed.valid) {
      invalidCount++;
      processedFiles.push({
        originalFilename: rawFilename,
        valid: false,
        parsed,
        matchStatus: "INVALID",
        matchedEntity: null,
        conflictReason: parsed.error,
        hasConflict: true,
        targetKey: null
      });
      continue;
    }

    validFilesCount++;
    const matchResult = matchMediaEntity(parsed, catalog);
    const targetKey = `${parsed.collectionCodeCanonical}::${parsed.entityType}::${parsed.slug}`;

    let hasConflict = false;
    let conflictReason = null;

    if (matchResult.matchStatus === "MATCHED") {
      if (targetKeyMap.has(targetKey)) {
        hasConflict = true;
        conflictsCount++;
        conflictReason = `DUPLICATE_MEDIA_TARGET: Múltiplas imagens no pacote direcionadas para ${targetKey}`;
        // Marcar também o primeiro arquivo do conflito se ainda não foi marcado
        const existing = targetKeyMap.get(targetKey);
        if (!existing.hasConflict) {
          existing.hasConflict = true;
          existing.conflictReason = `DUPLICATE_MEDIA_TARGET: Múltiplas imagens no pacote direcionadas para ${targetKey}`;
        }
      } else {
        targetKeyMap.set(targetKey, null);
      }
    } else if (matchResult.matchStatus === "NOT_FOUND") {
      notFoundCount++;
      conflictReason = matchResult.reason;
    } else if (matchResult.matchStatus === "AMBIGUOUS") {
      ambiguousCount++;
      conflictReason = matchResult.reason;
    }

    const fileRecord = {
      originalFilename: rawFilename,
      valid: true,
      parsed,
      matchStatus: matchResult.matchStatus,
      matchedEntity: matchResult.matchedEntity,
      conflictReason: conflictReason || (matchResult.matchStatus !== "MATCHED" ? matchResult.reason : null),
      hasConflict,
      targetKey
    };

    if (matchResult.matchStatus === "MATCHED" && !hasConflict) {
      matchedCount++;
    }

    targetKeyMap.set(targetKey, fileRecord);
    processedFiles.push(fileRecord);
  }

  // Recalcular contagem exata de matched sem conflitos
  const finalMatchedCount = processedFiles.filter(f => f.matchStatus === "MATCHED" && !f.hasConflict).length;
  const finalConflictsCount = processedFiles.filter(f => f.hasConflict || f.matchStatus === "AMBIGUOUS").length;

  return {
    totalFiles: processedFiles.length,
    validFiles: validFilesCount,
    matched: finalMatchedCount,
    notFound: notFoundCount,
    ambiguous: ambiguousCount,
    invalid: invalidCount,
    conflicts: finalConflictsCount,
    writesPerformed: 0,
    files: processedFiles
  };
}

/**
 * Executa preflight de importação a partir de um buffer ou arquivo ZIP.
 * @param {ArrayBuffer|Blob|Buffer} zipInput - Conteúdo do arquivo ZIP
 * @param {Object} catalog - Catálogo runtime de entidades
 * @returns {Promise<Object>} Relatório de preflight do ZIP
 */
export async function preflightZipImport(zipInput, catalog = {}) {
  if (!zipInput) {
    return {
      totalFiles: 0,
      validFiles: 0,
      matched: 0,
      notFound: 0,
      ambiguous: 0,
      invalid: 0,
      conflicts: 0,
      writesPerformed: 0,
      files: [],
      error: "ZIP_INPUT_EMPTY"
    };
  }

  try {
    const zip = await JSZip.loadAsync(zipInput);
    const zipEntries = [];

    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        zipEntries.push({ name: relativePath, entry: zipEntry });
      }
    });

    return preflightFileList(zipEntries, catalog);
  } catch (err) {
    return {
      totalFiles: 0,
      validFiles: 0,
      matched: 0,
      notFound: 0,
      ambiguous: 0,
      invalid: 0,
      conflicts: 0,
      writesPerformed: 0,
      files: [],
      error: `ZIP_PARSE_ERROR: ${err.message}`
    };
  }
}

export default {
  calculateMediaCoverage,
  preflightFileList,
  preflightZipImport
};
