// DeckVerse canonical catalog reference.
// Counts represent TOP-LEVEL collectible cards only: base characters + items + bosses.
// Collection covers and forms/alternate states never increase the card count.

const rows = [
  ["AOT", "Attack on Titan", 28, 10, 8],
  ["BER", "Berserk", 34, 9, 7],
  ["BCL", "Black Clover", 42, 8, 4],
  // Yhwach "Rei Quincy" is a title duplicate of Yhwach, not another card.
  ["BLC", "Bleach", 47, 10, 15],
  // Aki's Gun Fiend state is a form of Aki Hayakawa, not another Boss card.
  ["CSM", "Chainsaw Man", 21, 5, 1],
  ["DS", "Demon Slayer", 21, 12, 6],
  // Kid Buu is a named stage/form of Majin Buu.
  ["DBZ", "Dragon Ball", 30, 9, 8],
  ["FATE", "Fate Series", 49, 11, 13],
  ["FMA", "Fullmetal Alchemist", 22, 7, 5],
  ["HXH", "Hunter x Hunter", 34, 3, 3],
  // DIO and Dio Brando are one identity across eras.
  ["JOJO", "JoJo's Bizarre Adventure", 28, 8, 5],
  ["JJK", "Jujutsu Kaisen", 27, 6, 8],
  ["MHA", "My Hero Academia", 38, 7, 3],
  ["NRT", "Naruto", 81, 18, 16],
  ["OP", "One Piece", 81, 23, 16],
  ["OPM", "One Punch Man", 25, 10, 3],
  ["SS", "Saint Seiya", 27, 4, 10],
  ["SL", "Solo Leveling", 47, 15, 7],
  ["TG", "Tokyo Ghoul", 50, 7, 6],
  ["TOG", "Tower of God", 45, 8, 7],
  ["VS", "Vinland Saga", 38, 3, 6],
  ["YYH", "Yu Yu Hakusho", 40, 9, 4],
  // Gehrman — First Hunter and Lady Maria — Astral Clocktower are forms.
  ["BB", "Bloodborne", 30, 16, 14],
  ["CP77", "Cyberpunk 2077", 62, 8, 14],
  ["DSG", "Dark Souls", 51, 20, 15],
  ["DMC", "Devil May Cry", 21, 12, 15],
  ["ER", "Elden Ring", 59, 23, 15],
  ["FF", "Final Fantasy", 65, 16, 15],
  ["GOW", "God of War", 46, 15, 15],
  ["LOL", "League of Legends", 173, 10, 15],
  ["MK", "Mortal Kombat", 60, 12, 14],
  ["SKR", "Skyrim", 46, 10, 15],
  ["TLOU", "The Last of Us", 34, 6, 11],
  ["ZLD", "The Legend of Zelda", 63, 18, 18],
];

export const CATALOG_REFERENCE = Object.fromEntries(rows.map(([suffix, name, characters, bosses, items]) => [
  suffix,
  { suffix, name, characters, bosses, items, cards: characters + bosses + items },
]));

export const CANONICAL_RARITIES = ["R", "SR", "SSR", "UR", "LR", "MR"];

const CODE_ALIASES = {
  "COL-01-AOT": "AOT", "COL-AOT": "AOT",
  "COL-01-BER": "BER", "COL-BER": "BER",
  "COL-01-BCL": "BCL", "COL-BCL": "BCL",
  "COL-01-BLC": "BLC", "COL-BLC": "BLC",
  "COL-01-CSM": "CSM", "COL-CSM": "CSM",
  "COL-01-DS": "DS", "COL-DS": "DS",
  "COL-01-DBZ": "DBZ", "COL-DBZ": "DBZ",
  "COL-01-FATE": "FATE", "COL-FATE": "FATE",
  "COL-01-FMA": "FMA", "COL-FMA": "FMA",
  "COL-01-HXH": "HXH", "COL-HXH": "HXH",
  "COL-01-JOJO": "JOJO", "COL-JOJO": "JOJO",
  "COL-01-JJK": "JJK", "COL-JJK": "JJK",
  "COL-01-MHA": "MHA", "COL-MHA": "MHA",
  "COL-01-NRT": "NRT", "COL-NRT": "NRT",
  "COL-01-OP": "OP", "COL-OP": "OP",
  "COL-01-OPM": "OPM", "COL-OPM": "OPM",
  "COL-01-SS": "SS", "COL-SS": "SS",
  "COL-01-SL": "SL", "COL-SL": "SL",
  "COL-01-TG": "TG", "COL-TG": "TG",
  "COL-01-TOG": "TOG", "COL-TOG": "TOG",
  "COL-01-VS": "VS", "COL-VS": "VS",
  "COL-01-YYH": "YYH", "COL-YYH": "YYH",
  "COL-02-BB": "BB", "COL-BB": "BB",
  "COL-02-CP77": "CP77", "COL-CP77": "CP77",
  "COL-02-DS": "DSG", "COL-DSG": "DSG",
  "COL-02-DMC": "DMC", "COL-DMC": "DMC",
  "COL-02-ER": "ER", "COL-ER": "ER",
  "COL-02-FF": "FF", "COL-FF": "FF",
  "COL-02-GOW": "GOW", "COL-GOW": "GOW",
  "COL-02-LOL": "LOL", "COL-LOL": "LOL",
  "COL-02-MK": "MK", "COL-MK": "MK",
  "COL-02-SKR": "SKR", "COL-SKR": "SKR",
  "COL-02-TLOU": "TLOU", "COL-TLOU": "TLOU",
  "COL-02-ZLD": "ZLD", "COL-ZLD": "ZLD",
};

export function getCatalogReference(codeOrSuffix) {
  if (!codeOrSuffix) return null;
  const raw = String(codeOrSuffix).trim().toUpperCase();
  const key = CODE_ALIASES[raw] || raw.replace(/^COL-/, "");
  return CATALOG_REFERENCE[key] || null;
}

export function isCanonicalRarity(value) {
  return CANONICAL_RARITIES.includes(String(value || "").toUpperCase());
}
