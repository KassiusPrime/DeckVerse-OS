// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Fandom API Client (Com Cache, Retries, Erros Tipados e Wiki Map)
// ════════════════════════════════════════════════════════════════════════════

import { isNonCharacterName } from "../../lib/importSchemas.js";

export const COLLECTION_WIKI_MAP = {
  NAR: "naruto",
  NARUTO: "naruto",
  SNK: "attackontitan",
  AOT: "attackontitan",
  ATTACKONTITAN: "attackontitan",
  KNY: "kimetsu-no-yaiba",
  DEMONSLAYER: "kimetsu-no-yaiba",
  DBZ: "dragonball",
  DRAGONBALL: "dragonball",
  JJK: "jujutsukaisen",
  JUJUTSUKAISEN: "jujutsukaisen",
  JBA: "jojo",
  JOJO: "jojo",
  OPM: "onepunchman",
  ONEPUNCHMAN: "onepunchman",
  STW: "starwars",
  STARWARS: "starwars",
  BLE: "bleach",
  BLEACH: "bleach",
  HXH: "hunterxhunter",
  HUNTERXHUNTER: "hunterxhunter",
  FMA: "fma",
  FULLMETAL: "fma",
  MHA: "myheroacademia",
  MYHEROACADEMIA: "myheroacademia",
  OP: "onepiece",
  ONEPIECE: "onepiece",
  SL: "solo-leveling",
  SOLOLEVELING: "solo-leveling",
  MVC: "marvel",
  MARVEL: "marvel",
  DC: "dc",
  CYB: "cyberpunk",
  CYBERPUNK: "cyberpunk",
  GKN: "tekken",
  TEKKEN: "tekken",
  SF: "streetfighter",
  STREETFIGHTER: "streetfighter",
  FATE: "fategrandorder"
};

export const DEFAULT_WIKIS = [
  { name: "Naruto", slug: "naruto" },
  { name: "Marvel", slug: "marvel" },
  { name: "DC Comics", slug: "dc" },
  { name: "Jujutsu Kaisen", slug: "jujutsukaisen" },
  { name: "One Piece", slug: "onepiece" },
  { name: "Dragon Ball", slug: "dragonball" },
  { name: "Attack on Titan", slug: "attackontitan" },
  { name: "Bleach", slug: "bleach" },
  { name: "My Hero Academia", slug: "myheroacademia" },
  { name: "Cyberpunk 2077", slug: "cyberpunk" },
];

// ─── CACHE LAYER (Map em memória + sessionStorage fallback) ───
const memoryCache = new Map();

function getCacheKey(type, wiki, query) {
  const normQuery = (query || "").toLowerCase().trim().replace(/ /g, "_");
  return `${type}:${wiki}:${normQuery}`;
}

export function getFandomCache(key) {
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key);
    if (Date.now() < entry.expiresAt) {
      return entry.data;
    }
    memoryCache.delete(key);
  }

  // Tenta sessionStorage
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(`deckverse_fandom_cache:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() < parsed.expiresAt) {
          memoryCache.set(key, parsed); // popula memória
          return parsed.data;
        }
        sessionStorage.removeItem(`deckverse_fandom_cache:${key}`);
      }
    } catch (e) {
      // ignora erro de quota
    }
  }
  return null;
}

export function setFandomCache(key, data, ttlMs = 45 * 60 * 1000) {
  const entry = { data, expiresAt: Date.now() + ttlMs };
  memoryCache.set(key, entry);

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      sessionStorage.setItem(`deckverse_fandom_cache:${key}`, JSON.stringify(entry));
    } catch (e) {
      // quota excedida ou desabilitado
    }
  }
}

export function clearFandomCache() {
  memoryCache.clear();
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith("deckverse_fandom_cache:")) {
          sessionStorage.removeItem(k);
        }
      });
    } catch (e) {}
  }
  console.log("🧹 Cache da Fandom limpo com sucesso!");
}

// Helper para delay de taxa de requisição
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wrapper seguro para chamadas HTTP à Fandom API
 */
async function fandomRequest(url, maxRetries = 2, baseDelay = 300) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      if (baseDelay > 0) await delay(baseDelay);
      const res = await fetch(url);

      if (res.status === 404) {
        return { ok: false, error: { code: "http", status: 404, message: "Página não encontrada (404)", retryable: false } };
      }

      if (!res.ok) {
        const isRetryable = res.status === 429 || res.status >= 500;
        if (isRetryable && attempt < maxRetries) {
          attempt++;
          await delay(500 * Math.pow(2, attempt));
          continue;
        }
        return { ok: false, error: { code: "http", status: res.status, message: `Erro HTTP ${res.status}`, retryable: isRetryable } };
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        await delay(600 * Math.pow(2, attempt));
        continue;
      }
      return { ok: false, error: { code: "network", message: err.message || "Erro de conexão", retryable: true } };
    }
  }
}

/**
 * Mapeia código de coleção para slug da wiki
 */
export function resolveWikiSlug(collectionCode = "", fallbackWiki = "naruto") {
  const code = (collectionCode || "").toUpperCase().trim();
  if (COLLECTION_WIKI_MAP[code]) return COLLECTION_WIKI_MAP[code];

  // Tenta encontrar em DEFAULT_WIKIS
  const match = DEFAULT_WIKIS.find(w => w.slug.toLowerCase().includes(code.toLowerCase()) || code.toLowerCase().includes(w.slug.toLowerCase()));
  return match ? match.slug : fallbackWiki;
}

/**
 * Busca personagens com CACHE + RETRY
 */
export async function searchCharacter(query, wikiSlug = "") {
  if (!query || query.trim().length < 2) return [];

  const wiki = wikiSlug || "naruto";
  const cacheKey = getCacheKey("search", wiki, query);
  const cached = getFandomCache(cacheKey);
  if (cached) {
    return cached;
  }

  const wikisToSearch = wikiSlug
    ? [{ slug: wikiSlug, name: wikiSlug }]
    : DEFAULT_WIKIS;

  try {
    const promises = wikisToSearch.map(async (w) => {
      const url = `https://${w.slug}.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
      const result = await fandomRequest(url);
      if (!result.ok) return [];

      const searchResults = result.data?.query?.search || [];
      return searchResults
        .filter((item) => !isNonCharacterName(item.title))
        .slice(0, 4)
        .map((item) => ({
          title: item.title,
          snippet: item.snippet?.replace(/<\/?[^>]+(>|$)/g, "") || "",
          wikiSlug: w.slug,
          wikiName: w.name,
          pageid: item.pageid,
          url: `https://${w.slug}.fandom.com/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`
        }));
    });

    const resultsByWiki = await Promise.all(promises);
    const flatResults = resultsByWiki.flat();

    if (flatResults.length > 0) {
      setFandomCache(cacheKey, flatResults, 60 * 60 * 1000);
    } else {
      setFandomCache(cacheKey, [], 5 * 60 * 1000); // 5 min para buscas vazias
    }

    return flatResults;
  } catch (err) {
    console.error("Erro em searchCharacter:", err);
    return [];
  }
}

/**
 * Parseia wikitext
 */
function parseInfoboxWikitext(wikitext = "") {
  const fields = {};
  const infoboxMatch = wikitext.match(/\{\{Infobox[\s\S]*?\n\}\}/i) || wikitext.match(/\{\{[\s\S]*?\}\}/);
  const textToParse = infoboxMatch ? infoboxMatch[0] : wikitext;

  const lines = textToParse.split("\n");
  lines.forEach((line) => {
    const pipeIdx = line.indexOf("=");
    if (line.trim().startsWith("|") && pipeIdx > -1) {
      const rawKey = line.substring(1, pipeIdx).trim().toLowerCase();
      let rawVal = line.substring(pipeIdx + 1).trim();

      rawVal = rawVal
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
        .replace(/\{\{[^}]+\}\}/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/['"]+/g, "")
        .trim();

      if (rawKey && rawVal) {
        fields[rawKey] = rawVal;
      }
    }
  });

  return fields;
}

/**
 * Tenta inferir a imagem principal do artigo da Fandom (com Cache)
 */
export async function fetchPageImages(pageTitle, wikiSlug) {
  if (!pageTitle || !wikiSlug) return null;

  const cacheKey = getCacheKey("image", wikiSlug, pageTitle);
  const cached = getFandomCache(cacheKey);
  if (cached !== null) return cached;

  const url = `https://${wikiSlug}.fandom.com/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages|imageinfo&iiprop=url&piprop=original|thumbnail&pithumbsize=600&format=json&origin=*`;
  const result = await fandomRequest(url);

  if (!result.ok) return null;

  const pages = result.data?.query?.pages || {};
  const firstPageKey = Object.keys(pages)[0];
  if (!firstPageKey || firstPageKey === "-1") return null;

  const page = pages[firstPageKey];
  const imageUrl = page?.original?.source || page?.thumbnail?.source || page?.imageinfo?.[0]?.url || null;

  if (imageUrl) {
    setFandomCache(cacheKey, imageUrl, 24 * 60 * 60 * 1000);
  }
  return imageUrl;
}

/**
 * Extrai infobox e conteúdo estruturado com CACHE + RETRY
 */
export async function fetchCharacterInfobox(pageTitle, wikiSlug) {
  if (!pageTitle || !wikiSlug) return null;

  const cacheKey = getCacheKey("infobox", wikiSlug, pageTitle);
  const cached = getFandomCache(cacheKey);
  if (cached) return cached;

  const parseUrl = `https://${wikiSlug}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext|images|sections&format=json&origin=*`;
  const result = await fandomRequest(parseUrl);

  if (!result.ok) {
    console.warn(`[FandomClient] Falha ao extrair ${pageTitle} em ${wikiSlug}:`, result.error?.message);
    return null;
  }

  const data = result.data;
  if (data.error) {
    return null;
  }

  const wikitext = data?.parse?.wikitext?.["*"] || "";
  const parsedInfobox = parseInfoboxWikitext(wikitext);
  const mainImageUrl = await fetchPageImages(pageTitle, wikiSlug);

  let rawBioText = wikitext
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    .replace(/==[\s\S]*?==/g, "\n")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .slice(0, 3000)
    .trim();

  const canonicalName = parsedInfobox.name || parsedInfobox.title || pageTitle;
  const gender = parsedInfobox.gender || parsedInfobox.sexo || undefined;
  const species = parsedInfobox.species || parsedInfobox.espécie || parsedInfobox.race || undefined;
  const powersRaw = parsedInfobox.powers || parsedInfobox.abilities || parsedInfobox.poderes || parsedInfobox.jutsu || "";
  const affiliations = parsedInfobox.affiliation || parsedInfobox.team || parsedInfobox.afiliação || "";

  const payload = {
    wikiSlug,
    pageTitle,
    canonicalName,
    fandomUrl: `https://${wikiSlug}.fandom.com/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`,
    gender,
    species,
    rawInfobox: parsedInfobox,
    rawBioText,
    powersRaw,
    affiliations,
    mainImageUrl,
    images: data?.parse?.images || []
  };

  setFandomCache(cacheKey, payload, 60 * 60 * 1000);
  return payload;
}

/**
 * Resolve a imagem direta do personagem usando a wiki Fandom
 */
export async function resolveCharacterImage(characterName, collectionCode) {
  if (!characterName) return "";
  const wikiSlug = resolveWikiSlug(collectionCode || "NAR");

  try {
    const directImg = await fetchPageImages(characterName, wikiSlug);
    if (directImg) return directImg;

    const searchResults = await searchCharacter(characterName, wikiSlug);
    if (searchResults && searchResults.length > 0) {
      const bestMatch = searchResults[0].title;
      const searchImg = await fetchPageImages(bestMatch, wikiSlug);
      if (searchImg) return searchImg;
    }
  } catch (err) {
    console.warn(`[FandomClient] Erro ao resolver imagem para ${characterName}:`, err.message);
  }

  return "";
}

export const fandomClient = {
  searchCharacter,
  fetchCharacterInfobox,
  fetchPageImages,
  resolveWikiSlug,
  resolveCharacterImage,
  clearFandomCache,
  COLLECTION_WIKI_MAP,
  DEFAULT_WIKIS
};

export default fandomClient;
