import { resolveCollectionCodeStrict } from "../../lib/collectionCodes.js";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_ENTITY_TYPES = new Set(["collection", "character", "item", "boss"]);
const ENTITY_MARKERS = ["collection", "character", "item", "boss", "metadata", "lore"];

const STABLE_MEDIA_CODE_ALIASES = {
  DSG: "COL-02-DS",
};

function resolveMediaCollectionCode(codeInput) {
  const direct = resolveCollectionCodeStrict(codeInput);
  if (direct) return direct;

  const stable = String(codeInput || "").trim().toUpperCase().match(/^COL-([A-Z0-9]+)$/);
  if (!stable) return null;
  const suffix = stable[1];
  return STABLE_MEDIA_CODE_ALIASES[suffix] || resolveCollectionCodeStrict(suffix);
}

function baseResult(rawFilename = "") {
  return {
    valid: false,
    originalFilename: String(rawFilename || ""),
    collectionCodeInput: null,
    collectionCodeCanonical: null,
    entityType: null,
    slug: null,
    extension: null,
    isLegacyCollectionAlias: false,
    namingStyle: null,
    error: null,
  };
}

function sanitizePath(filename) {
  if (typeof filename !== "string") return { cleanName: "", hasTraversal: false };
  const raw = filename.trim();
  const hasTraversal = raw.includes("..") || raw.startsWith("/") || raw.startsWith("\\");
  const parts = raw.split(/[/\\]/);
  return { cleanName: parts[parts.length - 1] || "", hasTraversal };
}

function splitMediaStem(stem) {
  const legacyParts = stem.split("__");
  if (legacyParts.length === 3 && legacyParts.every(Boolean)) {
    return {
      codeInput: legacyParts[0].trim(),
      entityType: legacyParts[1].trim().toLowerCase(),
      slug: legacyParts[2].trim().toLowerCase(),
      namingStyle: "double-underscore-legacy",
    };
  }

  for (const marker of ENTITY_MARKERS) {
    const token = `_${marker}_`;
    const markerIndex = stem.indexOf(token);
    if (markerIndex > 0) {
      const codeInput = stem.slice(0, markerIndex).trim();
      const slug = stem.slice(markerIndex + token.length).trim().toLowerCase();
      if (codeInput && slug) {
        return { codeInput, entityType: marker, slug, namingStyle: "single-underscore-canonical" };
      }
    }
  }
  return null;
}

export function parseMediaFilename(rawFilename = "") {
  const result = baseResult(rawFilename);
  if (typeof rawFilename !== "string" || !rawFilename.trim()) return { ...result, error: "FILENAME_EMPTY" };

  const { cleanName, hasTraversal } = sanitizePath(rawFilename);
  if (hasTraversal) return { ...result, error: "PATH_TRAVERSAL_ATTEMPT" };
  if (cleanName.startsWith(".") || rawFilename.includes("__MACOSX") || cleanName === ".DS_Store") {
    return { ...result, error: "SYSTEM_OR_HIDDEN_FILE_IGNORED" };
  }

  const lastDotIndex = cleanName.lastIndexOf(".");
  if (lastDotIndex <= 0) return { ...result, error: "MISSING_EXTENSION" };

  const extension = cleanName.slice(lastDotIndex).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return { ...result, extension, error: "INVALID_EXTENSION" };

  const stem = cleanName.slice(0, lastDotIndex);
  const parsed = splitMediaStem(stem);
  if (!parsed) return { ...result, extension, error: "MALFORMED_FILENAME" };

  const { codeInput, entityType, slug, namingStyle } = parsed;
  const partial = { ...result, extension, collectionCodeInput: codeInput, entityType, slug, namingStyle };

  if (entityType === "metadata" || entityType === "lore") {
    return { ...partial, error: "METADATA_NOT_ACCEPTED" };
  }
  if (!ALLOWED_ENTITY_TYPES.has(entityType)) return { ...partial, error: "INVALID_ENTITY_TYPE" };

  const canonicalCode = resolveMediaCollectionCode(codeInput);
  if (!canonicalCode) return { ...partial, error: "COLLECTION_CODE_UNKNOWN" };

  if (entityType === "collection" && slug !== "cover") {
    return {
      ...partial,
      collectionCodeCanonical: canonicalCode,
      isLegacyCollectionAlias: codeInput.toUpperCase() !== canonicalCode,
      error: "COLLECTION_SLUG_MUST_BE_COVER",
    };
  }

  return {
    ...partial,
    valid: true,
    collectionCodeCanonical: canonicalCode,
    isLegacyCollectionAlias: codeInput.toUpperCase() !== canonicalCode,
    error: null,
  };
}

export default { parseMediaFilename };
