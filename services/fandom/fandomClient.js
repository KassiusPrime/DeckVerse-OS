// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Fandom API Client (Camada de Extração Determinística sem Custo de IA)
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_WIKIS = [
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

/**
 * Busca por personagens em uma wiki específica ou entre as wikis mais populares.
 */
export async function searchCharacter(query, wikiSlug = "") {
  if (!query || query.trim().length < 2) return [];

  const wikisToSearch = wikiSlug
    ? [{ slug: wikiSlug, name: wikiSlug }]
    : DEFAULT_WIKIS;

  try {
    const promises = wikisToSearch.map(async (wiki) => {
      const url = `https://${wiki.slug}.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const searchResults = data?.query?.search || [];
        return searchResults.slice(0, 4).map((item) => ({
          title: item.title,
          snippet: item.snippet?.replace(/<\/?[^>]+(>|$)/g, "") || "",
          wikiSlug: wiki.slug,
          wikiName: wiki.name,
          pageid: item.pageid,
          url: `https://${wiki.slug}.fandom.com/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`
        }));
      } catch (err) {
        return [];
      }
    });

    const resultsByWiki = await Promise.all(promises);
    return resultsByWiki.flat();
  } catch (err) {
    console.error("Erro na busca da Fandom API:", err);
    return [];
  }
}

/**
 * Parseia e limpa o wikitext de infobox da Fandom.
 */
function parseInfoboxWikitext(wikitext = "") {
  const fields = {};

  // Extrai trecho da {{Infobox ... }}
  const infoboxMatch = wikitext.match(/\{\{Infobox[\s\S]*?\n\}\}/i) || wikitext.match(/\{\{[\s\S]*?\}\}/);
  const textToParse = infoboxMatch ? infoboxMatch[0] : wikitext;

  // Quebra por linhas com pipe '|'
  const lines = textToParse.split("\n");
  lines.forEach((line) => {
    const pipeIdx = line.indexOf("=");
    if (line.trim().startsWith("|") && pipeIdx > -1) {
      const rawKey = line.substring(1, pipeIdx).trim().toLowerCase();
      let rawVal = line.substring(pipeIdx + 1).trim();

      // Limpa sintaxe de wikitext: [[Link|Texto]], {{ref|...}}, HTML tags
      rawVal = rawVal
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1") // Links [[Target|Text]] -> Text
        .replace(/\{\{[^}]+\}\}/g, "") // Remoção de templates {{...}}
        .replace(/<[^>]+>/g, "") // Tags HTML
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
 * Tenta inferir a imagem principal do artigo da Fandom
 */
async function fetchPageImages(pageTitle, wikiSlug) {
  try {
    const url = `https://${wikiSlug}.fandom.com/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages|imageinfo&iiprop=url&piprop=original|thumbnail&pithumbsize=600&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const firstPageKey = Object.keys(pages)[0];
    if (!firstPageKey || firstPageKey === "-1") return null;

    const page = pages[firstPageKey];
    const original = page?.original?.source;
    const thumbnail = page?.thumbnail?.source;
    const imageInfoUrl = page?.imageinfo?.[0]?.url;

    return original || thumbnail || imageInfoUrl || null;
  } catch (e) {
    return null;
  }
}

/**
 * Extrai infobox e conteúdo estruturado de uma página de personagem.
 */
export async function fetchCharacterInfobox(pageTitle, wikiSlug) {
  if (!pageTitle || !wikiSlug) return null;

  try {
    const parseUrl = `https://${wikiSlug}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext|images|sections&format=json&origin=*`;
    const res = await fetch(parseUrl);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.info || "Página não encontrada na Fandom.");
    }

    const wikitext = data?.parse?.wikitext?.["*"] || "";
    const parsedInfobox = parseInfoboxWikitext(wikitext);
    const mainImageUrl = await fetchPageImages(pageTitle, wikiSlug);

    // Extração de bio bruta tirando templates
    let rawBioText = wikitext
      .replace(/\{\{[\s\S]*?\}\}/g, "")
      .replace(/==[\s\S]*?==/g, "\n")
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/<[^>]+>/g, "")
      .slice(0, 3000)
      .trim();

    const canonicalName = parsedInfobox.name || parsedInfobox.title || pageTitle;
    const gender = parsedInfobox.gender || parsedInfobox.sexo || "Desconhecido";
    const species = parsedInfobox.species || parsedInfobox.espécie || parsedInfobox.race || "Humano";
    const powersRaw = parsedInfobox.powers || parsedInfobox.abilities || parsedInfobox.poderes || parsedInfobox.jutsu || "";
    const affiliations = parsedInfobox.affiliation || parsedInfobox.team || parsedInfobox.afiliação || "";

    return {
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
  } catch (err) {
    console.error("Erro ao buscar infobox na Fandom:", err);
    throw err;
  }
}

export const fandomClient = {
  searchCharacter,
  fetchCharacterInfobox,
  DEFAULT_WIKIS
};

export default fandomClient;
