import { resolveCollectionCodeStrict } from "../../lib/collectionCodes.js";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_ENTITY_TYPES = new Set(["collection", "character", "item", "boss"]);

/**
 * Normaliza e limpa um caminho para extrair apenas o nome do arquivo,
 * prevenindo tentativas de path traversal.
 */
function sanitizePath(filename) {
  if (typeof filename !== "string") return { cleanName: "", hasTraversal: false };
  const raw = filename.trim();
  
  // Detecção de path traversal
  const hasTraversal = raw.includes("..") || raw.startsWith("/") || raw.startsWith("\\");
  
  // Extrai nome do arquivo sem diretórios
  const parts = raw.split(/[/\\]/);
  const cleanName = parts[parts.length - 1] || "";
  
  return { cleanName, hasTraversal };
}

/**
 * Parser do filename de mídia para o Media Manager do DeckVerse OS.
 * Formato oficial: COL-CODE__entityType__slug.ext
 * 
 * Exs:
 * - COL-01-BER__collection__cover.jpg
 * - COL-01-BER__character__guts.png
 * - COL-01-DS__boss__muzan_kibutsuji.webp
 * - COL-01-FMA__item__philosophers_stone.jpg
 * 
 * @param {string} rawFilename - Nome do arquivo a ser parseado
 * @returns {Object} Resultado do parsing
 */
export function parseMediaFilename(rawFilename = "") {
  if (typeof rawFilename !== "string" || !rawFilename.trim()) {
    return {
      valid: false,
      originalFilename: String(rawFilename || ""),
      collectionCodeInput: null,
      collectionCodeCanonical: null,
      entityType: null,
      slug: null,
      extension: null,
      isLegacyCollectionAlias: false,
      error: "FILENAME_EMPTY"
    };
  }

  const { cleanName, hasTraversal } = sanitizePath(rawFilename);

  if (hasTraversal) {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: null,
      collectionCodeCanonical: null,
      entityType: null,
      slug: null,
      extension: null,
      isLegacyCollectionAlias: false,
      error: "PATH_TRAVERSAL_ATTEMPT"
    };
  }

  // Ignorar arquivos ocultos, arquivos de sistema ou metadados macOS
  if (cleanName.startsWith(".") || rawFilename.includes("__MACOSX") || cleanName === ".DS_Store") {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: null,
      collectionCodeCanonical: null,
      entityType: null,
      slug: null,
      extension: null,
      isLegacyCollectionAlias: false,
      error: "SYSTEM_OR_HIDDEN_FILE_IGNORED"
    };
  }

  // Identificação de extensão
  const lastDotIndex = cleanName.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: null,
      collectionCodeCanonical: null,
      entityType: null,
      slug: null,
      extension: null,
      isLegacyCollectionAlias: false,
      error: "MISSING_EXTENSION"
    };
  }

  const ext = cleanName.substring(lastDotIndex).toLowerCase();
  const nameWithoutExt = cleanName.substring(0, lastDotIndex);

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: null,
      collectionCodeCanonical: null,
      entityType: null,
      slug: null,
      extension: ext,
      isLegacyCollectionAlias: false,
      error: "INVALID_EXTENSION"
    };
  }

  // Split por duplo underline '__'
  const parts = nameWithoutExt.split("__");
  if (parts.length !== 3) {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: null,
      collectionCodeCanonical: null,
      entityType: null,
      slug: null,
      extension: ext,
      isLegacyCollectionAlias: false,
      error: "MALFORMED_FILENAME"
    };
  }

  const [codeInput, rawEntityType, rawSlug] = parts.map(p => (p || "").trim());

  if (!codeInput || !rawEntityType || !rawSlug) {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: codeInput || null,
      collectionCodeCanonical: null,
      entityType: null,
      slug: null,
      extension: ext,
      isLegacyCollectionAlias: false,
      error: "MALFORMED_FILENAME"
    };
  }

  const entityType = rawEntityType.toLowerCase();

  // Recusa explícita de metadados / lore
  if (entityType === "metadata" || entityType === "lore") {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: codeInput,
      collectionCodeCanonical: null,
      entityType: entityType,
      slug: rawSlug.toLowerCase(),
      extension: ext,
      isLegacyCollectionAlias: false,
      error: "METADATA_NOT_ACCEPTED"
    };
  }

  if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: codeInput,
      collectionCodeCanonical: null,
      entityType: entityType,
      slug: rawSlug.toLowerCase(),
      extension: ext,
      isLegacyCollectionAlias: false,
      error: "INVALID_ENTITY_TYPE"
    };
  }

  // Resolução do código da coleção
  const canonicalCode = resolveCollectionCodeStrict(codeInput);

  if (!canonicalCode) {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: codeInput,
      collectionCodeCanonical: null,
      entityType: entityType,
      slug: rawSlug.toLowerCase(),
      extension: ext,
      isLegacyCollectionAlias: false,
      error: "COLLECTION_CODE_UNKNOWN"
    };
  }

  const slug = rawSlug.toLowerCase();

  if (entityType === "collection" && slug !== "cover") {
    return {
      valid: false,
      originalFilename: rawFilename,
      collectionCodeInput: codeInput,
      collectionCodeCanonical: canonicalCode,
      entityType: entityType,
      slug: slug,
      extension: ext,
      isLegacyCollectionAlias: codeInput.toUpperCase() !== canonicalCode,
      error: "COLLECTION_SLUG_MUST_BE_COVER"
    };
  }

  const isLegacyCollectionAlias = codeInput.toUpperCase() !== canonicalCode;

  return {
    valid: true,
    originalFilename: rawFilename,
    collectionCodeInput: codeInput,
    collectionCodeCanonical: canonicalCode,
    entityType: entityType,
    slug: slug,
    extension: ext,
    isLegacyCollectionAlias
  };
}

export default {
  parseMediaFilename
};
