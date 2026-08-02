// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Team Rosters & Character Database Presets (Marvel, DC, Anime, Games)
// ════════════════════════════════════════════════════════════════════════════

export const MARVEL_ROSTERS = {
  Avengers: [
    { name: "Iron Man", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Captain America", rarity: "SSR", role: "Tank", isBoss: false },
    { name: "Thor", rarity: "UR", role: "DPS", isBoss: false },
    { name: "Hulk", rarity: "SSR", role: "Tank", isBoss: false },
    { name: "Black Widow", rarity: "SR", role: "Assassin", isBoss: false },
    { name: "Hawkeye", rarity: "SR", role: "DPS", isBoss: false },
    { name: "Thanos", rarity: "BOSS", role: "Mage", isBoss: true }
  ],
  XMen: [
    { name: "Wolverine", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Cyclops", rarity: "SR", role: "Support", isBoss: false },
    { name: "Jean Grey", rarity: "UR", role: "Mage", isBoss: false },
    { name: "Storm", rarity: "SSR", role: "Mage", isBoss: false },
    { name: "Magneto", rarity: "BOSS", role: "Mage", isBoss: true }
  ]
};

export const DC_ROSTERS = {
  JusticeLeague: [
    { name: "Batman", rarity: "SSR", role: "Assassin", isBoss: false },
    { name: "Superman", rarity: "UR", role: "Tank", isBoss: false },
    { name: "Wonder Woman", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "The Flash", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Green Lantern", rarity: "SR", role: "Support", isBoss: false },
    { name: "Darkseid", rarity: "BOSS", role: "Tank", isBoss: true }
  ]
};

export const ANIME_ROSTERS = {
  Naruto: [
    { name: "Naruto Uzumaki", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Sasuke Uchiha", rarity: "SSR", role: "Assassin", isBoss: false },
    { name: "Kakashi Hatake", rarity: "SR", role: "Support", isBoss: false },
    { name: "Kaguya Otsutsuki", rarity: "BOSS", role: "Mage", isBoss: true }
  ],
  JujutsuKaisen: [
    { name: "Satoru Gojo", rarity: "UR", role: "Mage", isBoss: false },
    { name: "Yuji Itadori", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Megumi Fushiguro", rarity: "SR", role: "Support", isBoss: false },
    { name: "Ryomen Sukuna", rarity: "BOSS", role: "Mage", isBoss: true }
  ],
  DragonBall: [
    { name: "Goku", rarity: "UR", role: "DPS", isBoss: false },
    { name: "Vegeta", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Gohan", rarity: "SSR", role: "DPS", isBoss: false },
    { name: "Frieza", rarity: "BOSS", role: "Mage", isBoss: true }
  ]
};

export function getRosterPreset(collectionCode) {
  const code = (collectionCode || "").toUpperCase();
  if (code === "MVC" || code === "MARVEL") return MARVEL_ROSTERS.Avengers;
  if (code === "DC") return DC_ROSTERS.JusticeLeague;
  if (code === "JJK") return ANIME_ROSTERS.JujutsuKaisen;
  if (code === "DBZ") return ANIME_ROSTERS.DragonBall;
  return ANIME_ROSTERS.Naruto;
}

export const teamRosters = {
  MARVEL_ROSTERS,
  DC_ROSTERS,
  ANIME_ROSTERS,
  getRosterPreset
};

export default teamRosters;
