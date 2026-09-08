export function normalizeImageUrl(input = "") {
  const raw = String(input || "").trim();
  if (!raw) return "";

  let url;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  const host = url.hostname.toLowerCase();

  // Imgur: normalize album/page URLs when a direct image id is present.
  if (host === "imgur.com" || host === "www.imgur.com") {
    const match = url.pathname.match(/^\/([A-Za-z0-9]+)(?:\.[A-Za-z0-9]+)?$/);
    if (match) return `https://i.imgur.com/${match[1]}.jpg`;
  }
  if (host === "imgur.com" || host === "www.imgur.com") {
    const match = url.pathname.match(/^\/gallery\/([A-Za-z0-9]+)$/);
    if (match) return `https://i.imgur.com/${match[1]}.jpg`;
  }

  // Fandom/Wikia commonly appends tracking/query parameters to the image URL.
  if (host.endsWith("fandom.com") || host.endsWith("wikia.com")) {
    ["width", "height", "cb", "format", "scale-to-width", "revision"].forEach(k => url.searchParams.delete(k));
    url.hash = "";
    return url.toString();
  }

  url.hash = "";
  return url.toString();
}

export function detectImageProvider(input = "") {
  try {
    const host = new URL(input).hostname.toLowerCase();
    if (host.includes("imgur.com")) return "imgur";
    if (host.includes("pinterest.")) return "pinterest";
    if (host.includes("deviantart.com")) return "deviantart";
    if (host.includes("fandom.com") || host.includes("wikia.com")) return "fandom";
    return "external";
  } catch {
    return "invalid";
  }
}

export function isHttpImageUrl(input = "") {
  try {
    const u = new URL(input);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
