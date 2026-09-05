// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Canonical Collection Codes & Legacy Alias Map
// Revisão: 2026-09-05
// ════════════════════════════════════════════════════════════════════════════

export const CANONICAL_COLLECTION_CODES = [
  "COL-01-AOT", "COL-01-BER", "COL-01-BCL", "COL-01-BLC", "COL-01-CSM", "COL-01-DS", "COL-01-DB",
  "COL-01-FATE", "COL-01-FMA", "COL-01-HXH", "COL-01-JOJO", "COL-01-JJK", "COL-01-MHA", "COL-01-NRT",
  "COL-01-OP", "COL-01-OPM", "COL-01-SS", "COL-01-SL", "COL-01-TG", "COL-01-TOG", "COL-01-VS", "COL-01-YYH",
  "COL-01-DN", "COL-01-EVA", "COL-01-CG", "COL-01-SAO", "COL-01-YGO",
  "COL-02-BB", "COL-02-CP77", "COL-02-DS", "COL-02-DMC", "COL-02-ER", "COL-02-FF", "COL-02-GOW",
  "COL-02-LOL", "COL-02-MK", "COL-02-SKR", "COL-02-TLOU", "COL-02-ZLD", "COL-02-WITCHER", "COL-02-HALO",
  "COL-02-MGS", "COL-02-RE", "COL-02-WOW", "COL-02-GEN", "COL-02-HSR", "COL-02-ME", "COL-02-FO", "COL-02-SC",
  "COL-02-DOTA", "COL-02-OVER", "COL-02-SONIC", "COL-02-SF", "COL-02-MH",
  "COL-03-DC", "COL-03-DUNE", "COL-03-GOT", "COL-03-HP", "COL-03-LOTR", "COL-03-SW", "COL-03-BOYS",
  "COL-03-MARVEL", "COL-03-MATRIX", "COL-03-ST", "COL-03-TMNT", "COL-03-TF", "COL-03-PR", "COL-03-DND",
  "COL-03-CPT", "COL-03-40K", "COL-03-SCP",
  "COL-04-ARC", "COL-04-ATLA", "COL-04-BEN10", "COL-04-CASTLEVANIA", "COL-04-HAZBIN", "COL-04-AT", "COL-04-INV",
  "COL-05-EGY", "COL-05-GRK", "COL-05-JPN", "COL-05-POLYNESIAN", "COL-05-MESO", "COL-05-NORSE",
  "COL-06-ANTIQUITY", "COL-06-REVOLUTIONS", "COL-06-ART", "COL-06-FEUDAL", "COL-00-MULTI"
];

export const LEGACY_FULL_CODE_ALIASES = {
  "COL-01-DBZ": "COL-01-DB",
  "COL-01-BSK": "COL-01-BER",
  "COL-01-JJBA": "COL-01-JOJO",
  "COL-01-SLV": "COL-01-SL",
  "COL-01-TXG": "COL-01-TG",
  "COL-02-EGD": "COL-02-ER",
  "COL-02-ZELDA": "COL-02-ZLD",
  "COL-02-WIT": "COL-02-WITCHER",
  "COL-03-INV": "COL-04-INV",
  "COL-03-AVATAR": "COL-04-ATLA",
  "COL-01-NAR": "COL-01-NRT",
  "COL-01-KNY": "COL-01-DS",
  "COL-02-ATLA": "COL-04-ATLA"
};

export const ALL_KNOWN_COLLECTION_CODES = Array.from(new Set([
  ...CANONICAL_COLLECTION_CODES,
  ...Object.keys(LEGACY_FULL_CODE_ALIASES)
]));

export const CANONICAL_SERIES_NAMES = {
  "COL-01-AOT": "Attack on Titan", "COL-01-BER": "Berserk", "COL-01-BCL": "Black Clover",
  "COL-01-BLC": "Bleach", "COL-01-CSM": "Chainsaw Man", "COL-01-DS": "Demon Slayer", "COL-01-DB": "Dragon Ball",
  "COL-01-FATE": "Fate Series", "COL-01-FMA": "Fullmetal Alchemist", "COL-01-HXH": "Hunter x Hunter",
  "COL-01-JOJO": "JoJo Bizarre Adventure", "COL-01-JJK": "Jujutsu Kaisen", "COL-01-MHA": "My Hero Academia",
  "COL-01-NRT": "Naruto", "COL-01-OP": "One Piece", "COL-01-OPM": "One Punch Man", "COL-01-SS": "Saint Seiya",
  "COL-01-SL": "Solo Leveling", "COL-01-TG": "Tokyo Ghoul", "COL-01-TOG": "Tower of God", "COL-01-VS": "Vinland Saga",
  "COL-01-YYH": "Yu Yu Hakusho", "COL-01-DN": "Death Note", "COL-01-EVA": "Evangelion", "COL-01-CG": "Code Geass",
  "COL-01-SAO": "Sword Art Online", "COL-01-YGO": "Yu-Gi-Oh!",
  "COL-02-BB": "Bloodborne", "COL-02-CP77": "Cyberpunk 2077", "COL-02-DS": "Dark Souls", "COL-02-DMC": "Devil May Cry",
  "COL-02-ER": "Elden Ring", "COL-02-FF": "Final Fantasy", "COL-02-GOW": "God of War", "COL-02-LOL": "League of Legends",
  "COL-02-MK": "Mortal Kombat", "COL-02-SKR": "The Elder Scrolls V: Skyrim", "COL-02-TLOU": "The Last of Us",
  "COL-02-ZLD": "The Legend of Zelda", "COL-02-WITCHER": "The Witcher", "COL-02-HALO": "Halo",
  "COL-02-MGS": "Metal Gear Solid", "COL-02-RE": "Resident Evil", "COL-02-WOW": "World of Warcraft",
  "COL-02-GEN": "Genshin Impact", "COL-02-HSR": "Honkai: Star Rail", "COL-02-ME": "Mass Effect",
  "COL-02-FO": "Fallout", "COL-02-SC": "StarCraft", "COL-02-DOTA": "Dota", "COL-02-OVER": "Overwatch",
  "COL-02-SONIC": "Sonic the Hedgehog", "COL-02-SF": "Street Fighter", "COL-02-MH": "Monster Hunter",
  "COL-03-DC": "DC Universe", "COL-03-DUNE": "Dune", "COL-03-GOT": "Game of Thrones", "COL-03-HP": "Harry Potter",
  "COL-03-LOTR": "Lord of the Rings", "COL-03-SW": "Star Wars", "COL-03-BOYS": "The Boys",
  "COL-03-MARVEL": "Marvel Comics Universe", "COL-03-MATRIX": "Matrix", "COL-03-ST": "Stranger Things",
  "COL-03-TMNT": "Teenage Mutant Ninja Turtles", "COL-03-TF": "Transformers", "COL-03-PR": "Power Rangers",
  "COL-03-DND": "Dungeons & Dragons", "COL-03-CPT": "Cthulhu / Lovecraft", "COL-03-40K": "Warhammer 40k",
  "COL-03-SCP": "SCP Foundation", "COL-04-ARC": "Arcane", "COL-04-ATLA": "Avatar: The Last Airbender",
  "COL-04-BEN10": "Ben 10", "COL-04-CASTLEVANIA": "Castlevania", "COL-04-HAZBIN": "Hazbin Hotel",
  "COL-04-AT": "Hora de Aventura", "COL-04-INV": "Invencível", "COL-05-EGY": "Mitologia Egípcia",
  "COL-05-GRK": "Mitologia Grega", "COL-05-JPN": "Mitologia Japonesa", "COL-05-POLYNESIAN": "Mitologia Maori & Polinésia",
  "COL-05-MESO": "Mitologia Mesopotâmica", "COL-05-NORSE": "Mitologia Nórdica", "COL-06-ANTIQUITY": "Antiguidade Clássica",
  "COL-06-REVOLUTIONS": "Era das Revoluções", "COL-06-ART": "Mestres da Arte & Ciência",
  "COL-06-FEUDAL": "Japão Feudal & Samurai", "COL-00-MULTI": "Multiverso"
};

export const LEGACY_ALIASES = {
  "AOT":"COL-01-AOT","BER":"COL-01-BER","BSK":"COL-01-BER","BERSERK":"COL-01-BER",
  "BCL":"COL-01-BCL","BLACK_CLOVER":"COL-01-BCL","BLACKCLOVER":"COL-01-BCL","BLC":"COL-01-BLC","BLEACH":"COL-01-BLC",
  "CSM":"COL-01-CSM","CHAINSAW":"COL-01-CSM","CHAINSAW_MAN":"COL-01-CSM","DS":"COL-01-DS","DEMON_SLAYER":"COL-01-DS","KNY":"COL-01-DS",
  "DB":"COL-01-DB","DBZ":"COL-01-DB","DRAGONBALL":"COL-01-DB","DRAGON_BALL":"COL-01-DB","DRAGON_BALL_Z":"COL-01-DB","DRAGON_BALL_SUPER":"COL-01-DB","DAIMA":"COL-01-DB",
  "FATE":"COL-01-FATE","FMA":"COL-01-FMA","FULLMETAL":"COL-01-FMA","HXH":"COL-01-HXH","HUNTER":"COL-01-HXH",
  "JOJO":"COL-01-JOJO","JJBA":"COL-01-JOJO","JJK":"COL-01-JJK","JUJUTSU":"COL-01-JJK","MHA":"COL-01-MHA","BNHA":"COL-01-MHA",
  "NAR":"COL-01-NRT","NRT":"COL-01-NRT","NARUTO":"COL-01-NRT","BORUTO":"COL-01-NRT","OP":"COL-01-OP","OPC":"COL-01-OP","ONE_PIECE":"COL-01-OP","ONEPIECE":"COL-01-OP",
  "OPM":"COL-01-OPM","ONE_PUNCH_MAN":"COL-01-OPM","SS":"COL-01-SS","SAINT_SEIYA":"COL-01-SS","SL":"COL-01-SL","SLV":"COL-01-SL","SOLO_LEVELING":"COL-01-SL",
  "TG":"COL-01-TG","TXG":"COL-01-TG","TOKYO_GHOUL":"COL-01-TG","TOG":"COL-01-TOG","TOWER_OF_GOD":"COL-01-TOG","VS":"COL-01-VS","VINLAND":"COL-01-VS","VINLAND_SAGA":"COL-01-VS",
  "YYH":"COL-01-YYH","YU_YU_HAKUSHO":"COL-01-YYH","YGO":"COL-01-YGO","YUGIOH":"COL-01-YGO","YU_GI_OH":"COL-01-YGO",
  "BB":"COL-02-BB","BLOODBORNE":"COL-02-BB","CP77":"COL-02-CP77","CYB":"COL-02-CP77","CYBERPUNK":"COL-02-CP77","DARK_SOULS":"COL-02-DS",
  "DMC":"COL-02-DMC","DEVIL_MAY_CRY":"COL-02-DMC","ER":"COL-02-ER","EGD":"COL-02-ER","ELDEN_RING":"COL-02-ER","FF":"COL-02-FF","FINAL_FANTASY":"COL-02-FF",
  "GOW":"COL-02-GOW","GOD_OF_WAR":"COL-02-GOW","LOL":"COL-02-LOL","LEAGUE_OF_LEGENDS":"COL-02-LOL","MK":"COL-02-MK","MORTAL_KOMBAT":"COL-02-MK",
  "SKR":"COL-02-SKR","SKYRIM":"COL-02-SKR","TLOU":"COL-02-TLOU","LAST_OF_US":"COL-02-TLOU","ZLD":"COL-02-ZLD","ZELDA":"COL-02-ZLD","WITCHER":"COL-02-WITCHER","WIT":"COL-02-WITCHER",
  "RE":"COL-02-RE","RESIDENT_EVIL":"COL-02-RE","SONIC":"COL-02-SONIC","SONIC_THE_HEDGEHOG":"COL-02-SONIC","SF":"COL-02-SF","STREET_FIGHTER":"COL-02-SF","MH":"COL-02-MH","MONSTER_HUNTER":"COL-02-MH",
  "DC":"COL-03-DC","DCCOMICS":"COL-03-DC","DUNE":"COL-03-DUNE","GOT":"COL-03-GOT","GAME_OF_THRONES":"COL-03-GOT","HP":"COL-03-HP","HARRY_POTTER":"COL-03-HP",
  "LOTR":"COL-03-LOTR","LORD_OF_THE_RINGS":"COL-03-LOTR","SW":"COL-03-SW","STARWARS":"COL-03-SW","STAR_WARS":"COL-03-SW","BOYS":"COL-03-BOYS","THE_BOYS":"COL-03-BOYS",
  "MARVEL":"COL-03-MARVEL","MVC":"COL-03-MARVEL","TF":"COL-03-TF","TRANSFORMERS":"COL-03-TF",
  "ARC":"COL-04-ARC","ARCANE":"COL-04-ARC","ATLA":"COL-04-ATLA","AVATAR":"COL-04-ATLA","BEN10":"COL-04-BEN10","BEN_10":"COL-04-BEN10","CASTLEVANIA":"COL-04-CASTLEVANIA",
  "HAZBIN":"COL-04-HAZBIN","HAZBIN_HOTEL":"COL-04-HAZBIN","AT":"COL-04-AT","HORA_DE_AVENTURA":"COL-04-AT","INV":"COL-04-INV","INVENCIVEL":"COL-04-INV",
  "EGY":"COL-05-EGY","EGIPCIA":"COL-05-EGY","GRK":"COL-05-GRK","GREGA":"COL-05-GRK","JPN":"COL-05-JPN","JAPONESA":"COL-05-JPN","POLYNESIAN":"COL-05-POLYNESIAN","MAORI":"COL-05-POLYNESIAN",
  "MESO":"COL-05-MESO","MESOPOTAMICA":"COL-05-MESO","NORSE":"COL-05-NORSE","NORDICA":"COL-05-NORSE",
  "ANTIQUITY":"COL-06-ANTIQUITY","ANTIGUIDADE":"COL-06-ANTIQUITY","REVOLUTIONS":"COL-06-REVOLUTIONS","REVOLUCOES":"COL-06-REVOLUTIONS","ART":"COL-06-ART","ARTE_CIENCIA":"COL-06-ART","FEUDAL":"COL-06-FEUDAL","SAMURAI":"COL-06-FEUDAL",
  "MULTIVERSE":"COL-00-MULTI","MULTI":"COL-00-MULTI","GENERIC":"COL-00-MULTI","DEFAULT":"COL-00-MULTI",
  ...LEGACY_FULL_CODE_ALIASES
};

let dynamicCollectionResolverHook = null;
export function setDynamicCollectionResolver(fn) { dynamicCollectionResolverHook = fn; }

export function resolveCollectionCode(rawInput = "") {
  if (typeof rawInput !== "string" || !rawInput.trim()) return "COL-00-MULTI";
  const clean = rawInput.trim().toUpperCase();
  if (["MULTIVERSE","MULTI","COL-00-MULTI","DEFAULT","GENERIC"].includes(clean)) return "COL-00-MULTI";
  if (CANONICAL_COLLECTION_CODES.includes(clean)) return clean;
  if (LEGACY_FULL_CODE_ALIASES[clean]) return LEGACY_FULL_CODE_ALIASES[clean];
  if (LEGACY_ALIASES[clean]) return LEGACY_ALIASES[clean];
  const colMatch = clean.match(/^COL-\d{2}-([A-Z0-9_]+)$/);
  if (colMatch) {
    const suffix = colMatch[1];
    if (LEGACY_ALIASES[suffix]) return LEGACY_ALIASES[suffix];
    return clean;
  }
  if (dynamicCollectionResolverHook) {
    const dynamicResolved = dynamicCollectionResolverHook(clean);
    if (dynamicResolved) return dynamicResolved;
  }
  return "COL-00-MULTI";
}

export function resolveCollectionCodeStrict(rawInput = "") {
  if (typeof rawInput !== "string" || !rawInput.trim()) return null;
  const clean = rawInput.trim().toUpperCase();
  if (["MULTIVERSE","MULTI","COL-00-MULTI","DEFAULT","GENERIC"].includes(clean)) return "COL-00-MULTI";
  if (clean.startsWith("LORE-")) return null;
  if (CANONICAL_COLLECTION_CODES.includes(clean)) return clean;
  if (LEGACY_FULL_CODE_ALIASES[clean]) return LEGACY_FULL_CODE_ALIASES[clean];
  if (LEGACY_ALIASES[clean]) return LEGACY_ALIASES[clean];
  const colMatch = clean.match(/^COL-\d{2}-([A-Z0-9_]+)$/);
  if (colMatch && LEGACY_ALIASES[colMatch[1]]) return LEGACY_ALIASES[colMatch[1]];
  if (dynamicCollectionResolverHook) {
    const dynamicResolved = dynamicCollectionResolverHook(clean);
    if (dynamicResolved) return dynamicResolved;
  }
  return null;
}

const KNOWN_CHARACTER_COLLECTION_MAP = {
  "super-choque":"COL-03-DC","virgil hawkins":"COL-03-DC","miss martian":"COL-03-DC","m'gann m'orzz":"COL-03-DC","vandal savage":"COL-03-DC",
  "batman":"COL-03-DC","superman":"COL-03-DC","wonder woman":"COL-03-DC","mulher maravilha":"COL-03-DC","flash":"COL-03-DC","joker":"COL-03-DC","coringa":"COL-03-DC",
  "shikamaru nara":"COL-01-NRT","shikamaru":"COL-01-NRT","hamura otsutsuki":"COL-01-NRT","hamura ōtsutsuki":"COL-01-NRT","hagoromo otsutsuki":"COL-01-NRT",
  "kaguya otsutsuki":"COL-01-NRT","naruto uzumaki":"COL-01-NRT","sasuke uchiha":"COL-01-NRT","kakashi hatake":"COL-01-NRT","itachi uchiha":"COL-01-NRT","madara uchiha":"COL-01-NRT",
  "king bradley":"COL-01-FMA","king bradley (pride/wrath)":"COL-01-FMA","edward elric":"COL-01-FMA","alphonse elric":"COL-01-FMA","roy mustang":"COL-01-FMA",
  "artoria pendragon":"COL-01-FATE","saber":"COL-01-FATE","ben 10":"COL-04-BEN10","ben tennyson":"COL-04-BEN10","gwen tennyson":"COL-04-BEN10","kevin levin":"COL-04-BEN10","vilgax":"COL-04-BEN10",
  "saga de gêmeos":"COL-01-SS","saga de gemeos":"COL-01-SS","gemini saga":"COL-01-SS","seiya de pegaso":"COL-01-SS","seiya":"COL-01-SS","shiryu":"COL-01-SS","hyoga":"COL-01-SS","shun":"COL-01-SS","ikki":"COL-01-SS",
  "son goku":"COL-01-DB","goku":"COL-01-DB","vegeta":"COL-01-DB","frieza":"COL-01-DB",
  "leon s kennedy":"COL-02-RE","jill valentine":"COL-02-RE","sonic the hedgehog":"COL-02-SONIC","ryu":"COL-02-SF","optimus prime":"COL-03-TF","yugi muto":"COL-01-YGO"
};

export function inferCollectionWithConfidence(cardOrText = {}) {
  if (typeof cardOrText === "string") {
    const code = resolveCollectionCode(cardOrText);
    return { collectionCode: code, collectionConfidence: code !== "COL-00-MULTI" ? 0.95 : 0.50, reason: code !== "COL-00-MULTI" ? "Código de coleção resolvido diretamente." : "Coleção não identificada." };
  }
  const card = cardOrText || {};
  const nameLower = (card.name || card.title || "").trim().toLowerCase();
  if (KNOWN_CHARACTER_COLLECTION_MAP[nameLower]) return { collectionCode: KNOWN_CHARACTER_COLLECTION_MAP[nameLower], collectionConfidence: 0.99, reason: `Mapeamento canônico direto para o personagem "${card.name || card.title}".` };
  if (card.collection_id) {
    const resolved = resolveCollectionCode(card.collection_id);
    if (resolved !== "COL-00-MULTI") return { collectionCode: resolved, collectionConfidence: 0.95, reason: `Coleção explícita no registro (${card.collection_id}).` };
  }
  if (card.series) {
    const resolvedSeries = resolveCollectionCode(card.series);
    if (resolvedSeries !== "COL-00-MULTI") return { collectionCode: resolvedSeries, collectionConfidence: 0.92, reason: `Franquia/Série explícita no registro (${card.series}).` };
  }
  const textToScan = [card.universe,card.series,card.franchise,card.collection,card.name,card.origin,card.lore,card.class,card.publisher].filter(Boolean).join(" ").toLowerCase();
  const rules = [
    [/\b(dragon ball|dbz|daima|goku|vegeta|gohan|frieza|saiyan)\b/i,"COL-01-DB","Franquia Dragon Ball identificada."],
    [/\b(yu-?gi-?oh|yugi|kaiba|duel monsters)\b/i,"COL-01-YGO","Franquia Yu-Gi-Oh! identificada."],
    [/\b(resident evil|raccoon city|leon kennedy|jill valentine|chris redfield|umbrella)\b/i,"COL-02-RE","Franquia Resident Evil identificada."],
    [/\b(sonic|tails|knuckles|shadow the hedgehog|chaos emerald)\b/i,"COL-02-SONIC","Franquia Sonic identificada."],
    [/\b(street fighter|chun-li|ryu|ken masters|m bison|akuma)\b/i,"COL-02-SF","Franquia Street Fighter identificada."],
    [/\b(monster hunter|rathalos|fatalis|nergigante|zinogre)\b/i,"COL-02-MH","Franquia Monster Hunter identificada."],
    [/\b(transformers|autobot|decepticon|optimus prime|megatron|cybertron)\b/i,"COL-03-TF","Franquia Transformers identificada."],
    [/\b(fate|type-moon|servant|noble phantasm|holy grail|grand order|stay night)\b/i,"COL-01-FATE","Franquia Fate/Type-Moon identificada."],
    [/\b(avatar|aang|zuko|katara|sokka|toph|iroh|azula|airbender)\b/i,"COL-04-ATLA","Franquia Avatar identificada."],
    [/\b(invencivel|invincible|mark grayson|omni-man|atom eve|viltrum)\b/i,"COL-04-INV","Franquia Invincible identificada."],
    [/\b(arcane|jinx|vi|jayce|viktor|silco|caitlyn|ekko)\b/i,"COL-04-ARC","Franquia Arcane identificada."],
    [/\b(ben 10|omnitrix|ben tennyson|vilgax)\b/i,"COL-04-BEN10","Franquia Ben 10 identificada."],
    [/\b(hazbin|charlie morningstar|alastor|angel dust)\b/i,"COL-04-HAZBIN","Franquia Hazbin Hotel identificada."],
    [/\b(hora de aventura|adventure time|finn|jake|marceline|bubblegum)\b/i,"COL-04-AT","Franquia Hora de Aventura identificada."],
    [/\b(naruto|boruto|sasuke|kakashi|itachi|madara|uzumaki|uchiha)\b/i,"COL-01-NRT","Franquia Naruto identificada."],
    [/\b(one piece|luffy|zoro|sanji|shanks|kaido|mugiwara)\b/i,"COL-01-OP","Franquia One Piece identificada."],
    [/\b(marvel|iron man|captain america|spider-man|wolverine|thanos|avengers)\b/i,"COL-03-MARVEL","Universo Marvel identificado."],
    [/\b(dc comics|batman|superman|wonder woman|super-choque|justice league)\b/i,"COL-03-DC","Universo DC Comics identificado."],
    [/\b(mesopotâmia|mesopotamian|suméria|sumeria|babilônia|babylonia)\b/i,"COL-05-MESO","Mitologia Mesopotâmica identificada."],
    [/\b(mitologia grega|greek mythology|olímpo|olympus)\b/i,"COL-05-GRK","Mitologia Grega identificada."],
    [/\b(mitologia nórdica|norse mythology|asgard|valhalla)\b/i,"COL-05-NORSE","Mitologia Nórdica identificada."]
  ];
  for (const [regex,collectionCode,reason] of rules) if (regex.test(textToScan)) return { collectionCode, collectionConfidence: 0.90, reason };
  return { collectionCode: "COL-00-MULTI", collectionConfidence: 0.40, reason: "Sem indicadores suficientes de coleção canônica." };
}

export function inferCollectionCode(cardOrText = {}) { return inferCollectionWithConfidence(cardOrText).collectionCode; }
export function validateCollectionCode(code = "") {
  if (typeof code !== "string" || !code.trim()) return { valid:false, code:"COL-00-MULTI", isCanonical:false };
  const clean = code.trim().toUpperCase();
  const isCanonical = CANONICAL_COLLECTION_CODES.includes(clean);
  const resolved = resolveCollectionCode(clean);
  return { valid:isCanonical || resolved !== "COL-00-MULTI", code:resolved, isCanonical };
}

export default { CANONICAL_COLLECTION_CODES, LEGACY_FULL_CODE_ALIASES, ALL_KNOWN_COLLECTION_CODES, CANONICAL_SERIES_NAMES, LEGACY_ALIASES, resolveCollectionCode, resolveCollectionCodeStrict, setDynamicCollectionResolver, inferCollectionWithConfidence, inferCollectionCode, validateCollectionCode };
