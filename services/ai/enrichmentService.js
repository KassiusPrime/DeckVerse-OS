// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — AI Enrichment Service (Enriquecimento Estruturado via Gemini 2.5)
// ════════════════════════════════════════════════════════════════════════════

import { GoogleGenAI } from "@google/genai";
import { fandomClient } from "../fandom/fandomClient.js";
import { validateCard } from "../../lib/importSchemas.js";

export const SEED_ARCHETYPES = [
  { id: "arch_determinado", name: "Determinado", traits: ["Resiliente", "Foco Inabalável", "Supera Limites"] },
  { id: "arch_estrategico", name: "Estratégico", traits: ["Visão Tática", "Planejamento", "Análise de Fraqueza"] },
  { id: "arch_caotico", name: "Caótico", traits: ["Imprevisível", "Dano Massivo", "Explosivo"] },
  { id: "arch_justiceiro", name: "Justiceiro", traits: ["Defensor", "Contra-Ataque", "Proteção de Aliados"] },
  { id: "arch_dominador", name: "Dominador", traits: ["Controle de Grupo", "Pressão de Campo", "Supressão"] },
  { id: "arch_adaptavel", name: "Adaptável", traits: ["Versátil", "Copia Habilidades", "Evolução"] },
  { id: "arch_intelectual", name: "Intelectual", traits: ["Amplificador Mágico", "Cálculo de Dano", "Disrupção"] },
  { id: "arch_inspirador", name: "Inspirador", traits: ["Suporte de Liderança", "Cura de Equipe", "Buff de Atributos"] },
  { id: "arch_calculista", name: "Calculista", traits: ["Ataque Crítico", "Precisão", "Foco no Alvo mais Fraco"] },
  { id: "arch_impiedoso", name: "Impiedoso", traits: ["Perfuração de Armadura", "Dano Verdadeiro", "Execução"] }
];

export const SEED_PERSONALITIES = [
  { id: "pers_sarcastico", name: "Sarcástico" },
  { id: "pers_leal", name: "Leal" },
  { id: "pers_solitario", name: "Solitário" },
  { id: "pers_humorado", name: "Bem-humorado" },
  { id: "pers_frio", name: "Frio" },
  { id: "pers_protetor", name: "Protetor" },
  { id: "pers_vingativo", name: "Vingativo" },
  { id: "pers_idealista", name: "Idealista" },
  { id: "pers_cinico", name: "Cínico" },
  { id: "pers_gentil", name: "Gentil" },
  { id: "pers_impulsivo", name: "Impulsivo" },
  { id: "pers_paciente", name: "Paciente" },
  { id: "pers_arrogante", name: "Arrogante" },
  { id: "pers_humilde", name: "Humilde" },
  { id: "pers_corajoso", name: "Corajoso" },
  { id: "pers_manipulador", name: "Manipulador" },
  { id: "pers_ingenuo", name: "Ingênuo" },
  { id: "pers_orgulhoso", name: "Orgulhoso" },
  { id: "pers_compassivo", name: "Compassivo" },
  { id: "pers_reservado", name: "Reservado" }
];

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || (typeof window !== "undefined" && window.__GEMINI_API_KEY__);
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    return null;
  }
}

/**
 * Regras de fallback determinístico quando IA offline ou sem chave
 */
function fallbackClassification(rawText = "", canonicalName = "") {
  const lower = (rawText + " " + canonicalName).toLowerCase();

  const archetype_ids = [];
  if (lower.includes("lider") || lower.includes("captain") || lower.includes("commander")) archetype_ids.push("arch_inspirador");
  if (lower.includes("smart") || lower.includes("genius") || lower.includes("estrategi")) archetype_ids.push("arch_estrategico");
  if (lower.includes("dark") || lower.includes("revenge") || lower.includes("kill") || lower.includes("demon")) archetype_ids.push("arch_impiedoso");
  if (lower.includes("protect") || lower.includes("shield") || lower.includes("hero")) archetype_ids.push("arch_justiceiro");
  if (lower.includes("chaos") || lower.includes("crazy") || lower.includes("wild")) archetype_ids.push("arch_caotico");
  if (archetype_ids.length === 0) archetype_ids.push("arch_determinado");

  const personality_ids = [];
  if (lower.includes("proud") || lower.includes("pride")) personality_ids.push("pers_orgulhoso");
  if (lower.includes("loyal") || lower.includes("friend")) personality_ids.push("pers_leal");
  if (lower.includes("cold") || lower.includes("silent")) personality_ids.push("pers_frio");
  if (lower.includes("joke") || lower.includes("funny")) personality_ids.push("pers_humorado");
  if (personality_ids.length === 0) personality_ids.push("pers_corajoso");

  return {
    archetype_ids,
    personality_ids,
    motivations: "Proteger seus companheiros e cumprir sua missão pessoal no multiverso.",
    fears: "Falhar com aqueles que dependem de sua força e liderança.",
    moral_alignment: "Ordeiro e Bom",
    voice_tone: "Firme, confiante e focado em combate.",
    bio_summary: rawText.slice(0, 300) || `${canonicalName} é um guerreiro formidável no DeckVerse.`,
    stats: {
      strength: 75, speed: 70, intelligence: 70, strategy: 65,
      resistance: 75, energy: 80, precision: 70, influence: 60,
      control: 65, versatility: 65, potential: 85, experience: 70
    },
    suggested_movepool: [
      { id: "m1", name: "Ataque Primário", power: 45, type: "Ataque", desc: "Golpe rápido e preciso." },
      { id: "m2", name: "Tática Especial", power: 70, type: "Especial", desc: "Ataque concentrado que ignora defesas parciais." },
      { id: "ult", name: "Técnica Suprema", power: 110, type: "Ultimate", desc: "Libera o poder total do personagem." }
    ]
  };
}

export async function classifyArchetypes(rawBioText, archetypeCatalog = SEED_ARCHETYPES) {
  const ai = getGeminiClient();
  if (!ai) return fallbackClassification(rawBioText).archetype_ids;

  try {
    const prompt = `Analise a biografia e classifique quais arquétipos de gameplay se aplicam a este personagem.
Catálogo disponível: ${JSON.stringify(archetypeCatalog.map(a => ({ id: a.id, name: a.name, traits: a.traits })))}
Texto: "${rawBioText.slice(0, 1500)}"

Responda EXATAMENTE em formato JSON com o array de IDs: {"archetype_ids": ["arch_id1", "arch_id2"]}`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(res.text || "{}");
    return parsed.archetype_ids || ["arch_determinado"];
  } catch (e) {
    return fallbackClassification(rawBioText).archetype_ids;
  }
}

export async function classifyPersonality(rawBioText, personalityCatalog = SEED_PERSONALITIES) {
  const ai = getGeminiClient();
  if (!ai) {
    const fb = fallbackClassification(rawBioText);
    return {
      personality_ids: fb.personality_ids,
      motivations: fb.motivations,
      fears: fb.fears,
      moral_alignment: fb.moral_alignment,
      voice_tone: fb.voice_tone,
      catchphrases: []
    };
  }

  try {
    const prompt = `Analise a personalidade do personagem com base no texto.
Lista de personalidades possíveis: ${JSON.stringify(personalityCatalog.map(p => p.name))}
Texto: "${rawBioText.slice(0, 1500)}"

Retorne em JSON:
{
  "personality_ids": ["pers_frio", "pers_protetor"],
  "motivations": "Texto curto sobre o que move o personagem",
  "fears": "Texto curto sobre o que o personagem teme",
  "moral_alignment": "Ex: Ordeiro e Bom / Caótico e Neutro",
  "voice_tone": "Ex: Irônico, sério e reservado",
  "catchphrases": ["Frase marcante 1", "Frase marcante 2"]
}`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(res.text || "{}");
  } catch (e) {
    const fb = fallbackClassification(rawBioText);
    return {
      personality_ids: fb.personality_ids,
      motivations: fb.motivations,
      fears: fb.fears,
      moral_alignment: fb.moral_alignment,
      voice_tone: fb.voice_tone,
      catchphrases: []
    };
  }
}

/**
 * Enriquece completamente os dados de um personagem importado da Fandom
 */
export async function enrichCharacterData(fandomData, existingCatalog = {}) {
  const { canonicalName, rawBioText, powersRaw, species, gender } = fandomData;
  const fallback = fallbackClassification(rawBioText, canonicalName);

  const ai = getGeminiClient();

  if (!ai) {
    return {
      status: "ai_suggested",
      canonical_name: canonicalName,
      gender,
      species,
      bio: rawBioText.slice(0, 400) || fallback.bio_summary,
      archetype_ids: fallback.archetype_ids,
      personality_ids: fallback.personality_ids,
      motivations: fallback.motivations,
      fears: fallback.fears,
      moral_alignment: fallback.moral_alignment,
      voice_tone: fallback.voice_tone,
      catchphrases: [],
      stats: fallback.stats,
      movepool: fallback.suggested_movepool,
      powers: [
        { name: powersRaw ? powersRaw.slice(0, 30) : "Técnica Principal", category: "Energia", description: powersRaw || "Ataque derivado das habilidades do personagem." }
      ]
    };
  }

  try {
    const prompt = `Você é o Archivist Core do DeckVerse OS.
Enriqueça os dados brutos de um personagem trazidos da Fandom para o nosso Banco de Conhecimento RPG.

Personagem: ${canonicalName}
Espécie: ${species} | Gênero: ${gender}
Poderes Brutos: ${powersRaw}
Biografia/Wikitext: "${rawBioText.slice(0, 2000)}"

Retorne EXATAMENTE no formato JSON:
{
  "bio_summary": "Resumo de 2 parágrafos envolventes",
  "archetype_ids": ["arch_determinado", "arch_estrategico"],
  "personality_ids": ["pers_orgulhoso", "pers_frio"],
  "motivations": "O que impulsiona o personagem",
  "fears": "O que o personagem teme",
  "moral_alignment": "Alinhamento RPG (ex: Ordeiro e Bom)",
  "voice_tone": "Tom e estilo de fala",
  "catchphrases": ["Frase icônica 1"],
  "stats": {
    "strength": 80, "speed": 75, "intelligence": 85, "strategy": 80,
    "resistance": 70, "energy": 90, "precision": 85, "influence": 75,
    "control": 80, "versatility": 70, "potential": 90, "experience": 80
  },
  "powers": [
    { "name": "Nome do Poder", "category": "Física", "description": "Descrição curta" }
  ],
  "movepool": [
    { "id": "m1", "name": "Golpe 1", "power": 45, "type": "Ataque", "desc": "Efeito" },
    { "id": "m2", "name": "Golpe 2", "power": 70, "type": "Especial", "desc": "Efeito" },
    { "id": "ult", "name": "Golpe Supremo", "power": 120, "type": "Ultimate", "desc": "Efeito devastador" }
  ]
}`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(res.text || "{}");

    return {
      status: "ai_suggested",
      canonical_name: canonicalName,
      gender,
      species,
      bio: parsed.bio_summary || rawBioText.slice(0, 400),
      archetype_ids: parsed.archetype_ids || fallback.archetype_ids,
      personality_ids: parsed.personality_ids || fallback.personality_ids,
      motivations: parsed.motivations || fallback.motivations,
      fears: parsed.fears || fallback.fears,
      moral_alignment: parsed.moral_alignment || fallback.moral_alignment,
      voice_tone: parsed.voice_tone || fallback.voice_tone,
      catchphrases: parsed.catchphrases || [],
      stats: parsed.stats || fallback.stats,
      movepool: parsed.movepool || fallback.suggested_movepool,
      powers: parsed.powers || []
    };
  } catch (err) {
    console.error("Erro no enriquecimento por IA Gemini:", err);
    return {
      status: "ai_suggested",
      canonical_name: canonicalName,
      gender,
      species,
      bio: rawBioText.slice(0, 400) || fallback.bio_summary,
      archetype_ids: fallback.archetype_ids,
      personality_ids: fallback.personality_ids,
      motivations: fallback.motivations,
      fears: fallback.fears,
      moral_alignment: fallback.moral_alignment,
      voice_tone: fallback.voice_tone,
      catchphrases: [],
      stats: fallback.stats,
      movepool: fallback.suggested_movepool,
      powers: []
    };
  }
}

/**
 * Pipeline canônico por personagem: Fandom + Gemini IA + Validação de Schema
 */
export async function enrichCardFromWikiAndAI(characterName, collectionCode = "MULTIVERSE", opts = {}) {
  const wikiSlug = opts.wikiSlug || fandomClient.resolveWikiSlug(collectionCode);
  
  // 1. Busca na Wiki
  let fandomData = null;
  const searchRes = await fandomClient.searchCharacter(characterName, wikiSlug);
  if (searchRes && searchRes.length > 0) {
    const pageTitle = searchRes[0].title;
    fandomData = await fandomClient.fetchCharacterInfobox(pageTitle, wikiSlug);
  }

  // Fallback se não achou dados de infobox
  if (!fandomData) {
    fandomData = {
      wikiSlug,
      pageTitle: characterName,
      canonicalName: characterName,
      fandomUrl: `https://${wikiSlug}.fandom.com/wiki/${encodeURIComponent(characterName.replace(/ /g, "_"))}`,
      gender: "Desconhecido",
      species: "Humano",
      rawInfobox: {},
      rawBioText: `${characterName} é um lutador icônico do multiverso.`,
      powersRaw: "",
      affiliations: "",
      mainImageUrl: opts.fallbackImage || "",
      images: []
    };
  }

  // 2. Enriquecimento via IA Gemini ou Fallback
  const enriched = await enrichCharacterData(fandomData);

  // 3. Monta rascunho de carta
  const rarity = opts.rarity || (opts.isBoss ? "BOSS" : "SSR");
  const role = opts.role || "DPS";
  const mainImg = fandomData.mainImageUrl || opts.fallbackImage || "";

  const rawCardPayload = {
    name: enriched.canonical_name || characterName,
    card_id: `${collectionCode.toUpperCase()}-${(characterName).toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10)}-${Math.floor(100 + Math.random() * 899)}`,
    collection_id: collectionCode,
    rarity,
    role,
    attack: enriched.stats?.strength || 80,
    defense: enriched.stats?.resistance || 75,
    speed: enriched.stats?.speed || 80,
    hp: (enriched.stats?.strength || 80) * 4,
    mag: enriched.stats?.energy || 80,
    img_oficial: mainImg,
    image_url: mainImg,
    lore: enriched.bio,
    version: "Wiki+IA",
    skills: (enriched.movepool || []).map(m => ({ name: m.name, description: m.desc, type: m.type })),
    tags: [collectionCode, ...(enriched.archetype_ids || [])],
    is_boss: Boolean(opts.isBoss || rarity === "BOSS" || rarity === "ANOMALIA")
  };

  // 4. Valida Schema estritamente
  const validation = validateCard(rawCardPayload);
  if (!validation.ok) {
    console.warn("[enrichCardFromWikiAndAI] Payload teve erros de validação:", validation.errors);
    throw new Error(`Validação de schema falhou para ${characterName}: ${validation.errors.join(", ")}`);
  }

  return {
    cardData: validation.data,
    fandomData,
    enriched
  };
}

export const enrichmentService = {
  classifyArchetypes,
  classifyPersonality,
  enrichCharacterData,
  enrichCardFromWikiAndAI,
  SEED_ARCHETYPES,
  SEED_PERSONALITIES
};

export default enrichmentService;
