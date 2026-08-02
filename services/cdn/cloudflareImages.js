// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Cloudflare Images CDN Service
// Opcional CDN mirror flow: Fandom (pageimages) → Worker CF → imagedelivery.net
// ════════════════════════════════════════════════════════════════════════════

const MAP_CACHE_KEY = "dv_cf_image_map_v1";

function getImageMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MAP_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setImageMap(map) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MAP_CACHE_KEY, JSON.stringify(map));
  } catch (e) {
    // quota exceeded or disabled
  }
}

/**
 * Retorna o hash da conta CF da variável de ambiente ou fallback
 */
export function getAccountHash() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CF_ACCOUNT_HASH) ||
    (typeof process !== "undefined" && process.env && process.env.VITE_CF_ACCOUNT_HASH) ||
    ""
  );
}

/**
 * Retorna a variante da imagem CF (default: 'public')
 */
export function getImageVariant() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CF_IMAGE_VARIANT) ||
    (typeof process !== "undefined" && process.env && process.env.VITE_CF_IMAGE_VARIANT) ||
    "public"
  );
}

/**
 * Retorna a URL do Worker proxy da Cloudflare Images se configurado
 */
export function getImagesProxyUrl() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CF_IMAGES_PROXY) ||
    (typeof process !== "undefined" && process.env && process.env.VITE_CF_IMAGES_PROXY) ||
    ""
  );
}

/**
 * Constrói a URL final no CDN imagedelivery.net/{hash}/{imageId}/{variant}
 */
export function getDeliveryUrl(imageId) {
  const accountHash = getAccountHash();
  const variant = getImageVariant();
  if (!accountHash || !imageId) return "";
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
}

/**
 * Busca URL mapeada no cache local
 */
export function getCachedCdnUrl(originalUrl) {
  if (!originalUrl) return "";
  const map = getImageMap();
  return map[originalUrl] || "";
}

/**
 * Registra mapeamento no cache local
 */
export function setCachedCdnUrl(originalUrl, cdnUrl) {
  if (!originalUrl || !cdnUrl) return;
  const map = getImageMap();
  map[originalUrl] = cdnUrl;
  setImageMap(map);
}

/**
 * Chama o Worker da Cloudflare Images para espelhar a imagem por URL.
 * Se VITE_CF_IMAGES_PROXY não estiver configurado ou falhar, retorna string vazia (passthrough).
 */
export async function mirrorUrlToCloudflare(imageUrl, metadata = {}) {
  const proxyUrl = getImagesProxyUrl();
  if (!proxyUrl || !imageUrl || !imageUrl.startsWith("http")) {
    return "";
  }

  // Verifica cache local primeiro
  const cached = getCachedCdnUrl(imageUrl);
  if (cached) return cached;

  try {
    const res = await fetch(`${proxyUrl.replace(/\/$/, "")}/upload-by-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        metadata: {
          name: metadata.name || "",
          collection_id: metadata.collection_id || "",
          source: "DeckVerse-Fandom"
        }
      })
    });

    if (!res.ok) {
      console.warn(`[CF Images] Proxy respondeu status ${res.status}`);
      return "";
    }

    const data = await res.json();
    if (data.success && data.result) {
      const cdnUrl = data.result.deliveryUrl || getDeliveryUrl(data.result.id);
      if (cdnUrl) {
        setCachedCdnUrl(imageUrl, cdnUrl);
        return cdnUrl;
      }
    }
    return "";
  } catch (err) {
    console.warn("[CF Images] Erro ao conectar com o Worker proxy:", err.message);
    return "";
  }
}

/**
 * Resolve a imagem final: Tenta espelhar no Cloudflare Images CDN;
 * se falhar ou se não houver proxy configurado, faz passthrough e devolve a URL original da Fandom.
 */
export async function resolveCdnImage(originalUrl, metadata = {}) {
  if (!originalUrl) return "";
  
  // Se já for uma URL da Cloudflare Images, retorna diretamente
  if (originalUrl.includes("imagedelivery.net")) {
    return originalUrl;
  }

  const cached = getCachedCdnUrl(originalUrl);
  if (cached) return cached;

  const cdnUrl = await mirrorUrlToCloudflare(originalUrl, metadata);
  return cdnUrl || originalUrl; // Passthrough para Fandom se CDN falhar/ausente
}

export const cloudflareImages = {
  getAccountHash,
  getImageVariant,
  getImagesProxyUrl,
  getDeliveryUrl,
  getCachedCdnUrl,
  setCachedCdnUrl,
  mirrorUrlToCloudflare,
  resolveCdnImage
};

export default cloudflareImages;
