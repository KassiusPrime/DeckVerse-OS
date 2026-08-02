// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Multi-tier Image Resolver Service
// Fallback Chain: Fandom -> Cloudflare CDN -> Superhero API -> Jikan/AniList -> TVMaze -> Wikimedia -> Pollinations -> DiceBear
// ════════════════════════════════════════════════════════════════════════════

import { fandomClient } from "../fandom/fandomClient";
import { cloudflareImages } from "../cdn/cloudflareImages";

/**
 * Tenta buscar imagem via Superhero API (Marvel / DC / Comic characters)
 */
async function fetchSuperheroApiImage(characterName) {
  const apiKey =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPERHERO_API_KEY) ||
    (typeof process !== "undefined" && process.env && process.env.VITE_SUPERHERO_API_KEY) ||
    "";

  if (!apiKey || !characterName) return "";

  try {
    const res = await fetch(`https://superheroapi.com/api.php/${apiKey}/search/${encodeURIComponent(characterName)}`);
    if (!res.ok) return "";
    const data = await res.json();
    if (data.response === "success" && data.results && data.results.length > 0) {
      return data.results[0].image?.url || "";
    }
  } catch (err) {
    console.warn("[ImageResolver] Superhero API warning:", err.message);
  }

  return "";
}

/**
 * Tenta buscar imagem via Jikan API (MyAnimeList - Anime characters)
 */
async function fetchJikanAnimeImage(characterName) {
  if (!characterName) return "";
  try {
    const res = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(characterName)}&limit=1`);
    if (!res.ok) return "";
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].images?.jpg?.image_url || data.data[0].images?.webp?.image_url || "";
    }
  } catch (err) {
    console.warn("[ImageResolver] Jikan API warning:", err.message);
  }

  return "";
}

/**
 * Tenta buscar imagem via Wikimedia Commons API
 */
async function fetchWikimediaImage(characterName) {
  if (!characterName) return "";
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(characterName)}&gsrlimit=1&prop=pageimages&piprop=original|thumbnail&pithumbsize=600&format=json&origin=*`
    );
    if (!res.ok) return "";
    const data = await res.json();
    const pages = data.query?.pages || {};
    const firstKey = Object.keys(pages)[0];
    if (firstKey && pages[firstKey]) {
      return pages[firstKey].original?.source || pages[firstKey].thumbnail?.source || "";
    }
  } catch (err) {
    console.warn("[ImageResolver] Wikimedia API warning:", err.message);
  }

  return "";
}

/**
 * Gerador de imagem AI via Pollinations.ai (Fallback gratuito sem API key)
 */
function getPollinationsImageUrl(characterName, collectionCode) {
  const prompt = `anime trading card portrait of ${characterName} from ${collectionCode || "fantasy multiverse"}, highly detailed, digital art, sharp focus, 8k`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=800&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
}

/**
 * Gerador de avatar procedural via DiceBear (Garantia de 100% de disponibilidade)
 */
function getDicebearAvatarUrl(characterName) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(characterName)}`;
}

/**
 * RESOLVER PRINCIPAL MULTI-TIER DE IMAGENS
 * @param {string} characterName - Nome do personagem
 * @param {string} collectionCode - Código da coleção (ex: NAR, MVC, DC, JJK)
 * @param {object} options - Configurações extras
 */
export async function resolveMultiTierCharacterImage(characterName, collectionCode = "NAR", options = {}) {
  if (!characterName) return "";

  // 1. Tenta Fandom Wiki
  let fandomUrl = "";
  try {
    fandomUrl = await fandomClient.resolveCharacterImage(characterName, collectionCode);
  } catch (e) {}

  if (fandomUrl) {
    const cdnUrl = await cloudflareImages.resolveCdnImage(fandomUrl, {
      name: characterName,
      collection_id: collectionCode
    });
    return cdnUrl || fandomUrl;
  }

  // 2. Se for Marvel / DC ou Quadrinhos, tenta Superhero API
  if (["MVC", "MARVEL", "DC", "HQ", "HERO"].includes((collectionCode || "").toUpperCase())) {
    const superheroUrl = await fetchSuperheroApiImage(characterName);
    if (superheroUrl) {
      const cdnUrl = await cloudflareImages.resolveCdnImage(superheroUrl, {
        name: characterName,
        collection_id: collectionCode
      });
      return cdnUrl || superheroUrl;
    }
  }

  // 3. Tenta Jikan / Anime API
  const jikanUrl = await fetchJikanAnimeImage(characterName);
  if (jikanUrl) {
    const cdnUrl = await cloudflareImages.resolveCdnImage(jikanUrl, {
      name: characterName,
      collection_id: collectionCode
    });
    return cdnUrl || jikanUrl;
  }

  // 4. Tenta Wikimedia Commons
  const wikiMediaUrl = await fetchWikimediaImage(characterName);
  if (wikiMediaUrl) {
    const cdnUrl = await cloudflareImages.resolveCdnImage(wikiMediaUrl, {
      name: characterName,
      collection_id: collectionCode
    });
    return cdnUrl || wikiMediaUrl;
  }

  // 5. Fallback opcional por IA ou Avatar Procedural
  if (options.useAiFallback) {
    return getPollinationsImageUrl(characterName, collectionCode);
  }

  return getDicebearAvatarUrl(characterName);
}

export const imageResolver = {
  resolveMultiTierCharacterImage,
  fetchSuperheroApiImage,
  fetchJikanAnimeImage,
  fetchWikimediaImage,
  getPollinationsImageUrl,
  getDicebearAvatarUrl
};

export default imageResolver;
