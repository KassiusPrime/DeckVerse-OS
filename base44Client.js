// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Base44 Client & Persistence Layer
// ════════════════════════════════════════════════════════════════════════════

import { MEGA_COLLECTIONS, MEGA_ITEMS, MEGA_BOSSES, generateExpandedCards } from "./src/data/megaCollectionsData.js";

const EXISTING_COLLECTIONS = [
  {
    id: "col_1",
    name: "Naruto",
    code: "NAR",
    description: "Shinobi & Ninjutsu Masters from the Hidden Leaf & beyond",
    image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    created_date: "2026-07-01T10:00:00Z"
  },
  {
    id: "col_2",
    name: "Marvel vs Capcom",
    code: "MVC",
    description: "Multiversal Heroes and Villains from Comic & Gaming Universes",
    image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    created_date: "2026-07-02T10:00:00Z"
  },
  {
    id: "col_3",
    name: "Attack on Titan",
    code: "AOT",
    description: "Scouts and Titan Shifters fighting for humanity's survival",
    image_url: "",
    created_date: "2026-07-03T10:00:00Z"
  },
  {
    id: "col_4",
    name: "Jujutsu Kaisen",
    code: "JJK",
    description: "Sorcerers and Cursed Spirits fighting in modern Tokyo",
    image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    created_date: "2026-07-04T10:00:00Z"
  },
  {
    id: "col_5",
    name: "Dragon Ball",
    code: "DBZ",
    description: "Z Fighters, Saiyans, and God-like Entities across time and space",
    image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    created_date: "2026-07-05T10:00:00Z"
  },
  {
    id: "col_6",
    name: "Cyberpunk Legends",
    code: "CYB",
    description: "Futuristic Netrunners, Mercenaries & Augmented Warriors",
    image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
    created_date: "2026-07-06T10:00:00Z"
  }
];

// Combine existing with MEGA_COLLECTIONS avoiding duplicates
const colCodes = new Set(EXISTING_COLLECTIONS.map(c => c.code));
const DEFAULT_COLLECTIONS = [
  ...EXISTING_COLLECTIONS,
  ...MEGA_COLLECTIONS.filter(c => !colCodes.has(c.code))
];

const DEFAULT_CARDS = [
  ...generateExpandedCards(),
  {
    id: "card_1",
    name: "Sasuke Uchiha",
    card_id: "NAR-CHR-SSR-001",
    collection_id: "NAR",
    series: "Naruto",
    rarity: "SSR",
    role: "DPS",
    gender: "Male",
    element: "Lightning",
    tags: ["Uchihas", "Shinobi", "Rival"],
    mag_source: "Chakra",
    mag: 85,
    attack: 120,
    defense: 75,
    speed: 110,
    hp: 320,
    image_url: "",
    lore: "Surviving heir of the Uchiha Clan, wielding the Mangekyo Sharingan and Chidori.",
    skills: [
      { name: "Chidori Stream", description: "Deals lightning damage to target and paralyzes.", type: "Active" },
      { name: "Amaterasu", description: "Burns enemy continuously for 3 turns.", type: "Ultimate" }
    ],
    version: "Classic",
    created_date: "2026-07-10T10:00:00Z"
  },
  {
    id: "card_2",
    name: "Naruto Uzumaki",
    card_id: "NAR-CHR-UR-002",
    collection_id: "NAR",
    series: "Naruto",
    rarity: "UR",
    role: "DPS",
    gender: "Male",
    element: "Wind",
    tags: ["Jinchuriki", "Shinobi", "Hokage"],
    mag_source: "Chakra",
    mag: 110,
    attack: 140,
    defense: 90,
    speed: 105,
    hp: 450,
    image_url: "",
    lore: "The Nine-Tails Jinchuriki who pledged to become Hokage and protect his bonds.",
    skills: [
      { name: "Rasengan", description: "High single target wind strike.", type: "Active" },
      { name: "Kurama Link Mode", description: "Boosts all stats by 40% for 3 turns.", type: "Ultimate" }
    ],
    version: "Sage Form",
    created_date: "2026-07-11T10:00:00Z"
  },
  {
    id: "card_3",
    name: "Gojo Satoru",
    card_id: "JJK-SOR-MR-001",
    collection_id: "JJK",
    series: "Jujutsu Kaisen",
    rarity: "MR",
    role: "Mage",
    gender: "Male",
    element: "Light",
    tags: ["Limitless", "Six Eyes", "Sorcerer"],
    mag_source: "Cursed Energy",
    mag: 200,
    attack: 180,
    defense: 150,
    speed: 160,
    hp: 600,
    image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    lore: "The strongest sorcerer of modern era. Wielder of Limitless Infinity and Six Eyes.",
    skills: [
      { name: "Cursed Technique Reversal: Red", description: "Fires repulsive force dealing massive area damage.", type: "Active" },
      { name: "Hollow Purple", description: "Obliterates target dealing catastrophic true damage.", type: "Ultimate" }
    ],
    version: "Unblindfolded",
    created_date: "2026-07-12T10:00:00Z"
  },
  {
    id: "card_4",
    name: "Ryomen Sukuna",
    card_id: "JJK-CUR-BOSS-001",
    collection_id: "JJK",
    series: "Jujutsu Kaisen",
    rarity: "BOSS",
    role: "Berserker",
    gender: "Male",
    element: "Shadow",
    tags: ["King of Curses", "Disaster Curses"],
    mag_source: "Cursed Energy",
    mag: 220,
    attack: 210,
    defense: 140,
    speed: 150,
    hp: 800,
    is_boss: true,
    image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    lore: "Ancient King of Curses whose 20 fingers hold catastrophic power.",
    skills: [
      { name: "Dismantle & Cleave", description: "Continuous slicing attacks bypassing defenses.", type: "Active" },
      { name: "Malevolent Shrine", description: "Domain expansion shredding all foes in range.", type: "Ultimate" }
    ],
    version: "True Form",
    created_date: "2026-07-13T10:00:00Z"
  },
  {
    id: "card_5",
    name: "Levi Ackerman",
    card_id: "AOT-SCO-LR-001",
    collection_id: "AOT",
    series: "Attack on Titan",
    rarity: "LR",
    role: "Assassin",
    gender: "Male",
    element: "Wind",
    tags: ["Survey Corps", "Ackerman", "Captain"],
    mag_source: "Human Will",
    mag: 40,
    attack: 165,
    defense: 60,
    speed: 190,
    hp: 380,
    image_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    lore: "Humanity's Strongest Soldier, captain of the Special Operations Squad.",
    skills: [
      { name: "ODM Blade Tornado", description: "Rapid spinning strike inflicting Bleed.", type: "Active" },
      { name: "Ackerman Awakening", description: "Increases Critical Rate by 50% for 2 turns.", type: "Passive" }
    ],
    version: "Battle Ready",
    created_date: "2026-07-14T10:00:00Z"
  },
  {
    id: "card_6",
    name: "Iron Man",
    card_id: "MVC-HER-SR-001",
    collection_id: "MVC",
    series: "Marvel vs Capcom",
    rarity: "SR",
    role: "Sniper",
    gender: "Male",
    element: "Lightning",
    tags: ["Avengers", "Tech", "Genius"],
    mag_source: "Technology",
    mag: 95,
    attack: 115,
    defense: 85,
    speed: 100,
    hp: 350,
    image_url: "https://images.unsplash.com/photo-1635863138275-d9b33299680b?w=600&auto=format&fit=crop&q=80",
    lore: "Genius billionaire Tony Stark in high-tech repulsor-powered suit.",
    skills: [
      { name: "Unibeam", description: "Fires chest-mounted energy blast.", type: "Active" },
      { name: "Proton Cannon", description: "Summons massive cannon for heavy beam damage.", type: "Ultimate" }
    ],
    version: "Mark 85",
    created_date: "2026-07-15T10:00:00Z"
  },
  {
    id: "card_7",
    name: "Son Goku",
    card_id: "DBZ-SAI-MR-001",
    collection_id: "DBZ",
    series: "Dragon Ball",
    rarity: "MR",
    role: "DPS",
    gender: "Male",
    element: "Light",
    tags: ["Saiyan", "Z Fighters", "God Ki"],
    mag_source: "Ki",
    mag: 190,
    attack: 195,
    defense: 130,
    speed: 170,
    hp: 650,
    image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    lore: "Earth's greatest warrior who broke through mortal limits into Ultra Instinct.",
    skills: [
      { name: "Kamehameha", description: "Fires concentrated Ki beam.", type: "Active" },
      { name: "Autonomous Ultra Instinct", description: "Evades next 2 attacks and counter-strikes.", type: "Ultimate" }
    ],
    version: "Ultra Instinct",
    created_date: "2026-07-16T10:00:00Z"
  },
  {
    id: "card_8",
    name: "Vexor Cyberblade",
    card_id: "CYB-MERC-UR-001",
    collection_id: "CYB",
    series: "Cyberpunk Legends",
    rarity: "UR",
    role: "Assassin",
    gender: "Female",
    element: "Shadow",
    tags: ["Netrunner", "Augmented", "Mercenary"],
    mag_source: "Technology",
    mag: 130,
    attack: 150,
    defense: 70,
    speed: 180,
    hp: 410,
    image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
    lore: "Legendary Night City mercenary equipped with Sandevistan neural speed booster.",
    skills: [
      { name: "Sandevistan Dash", description: "Gains extra turn and 100% Critical Rate.", type: "Active" }
    ],
    version: "Augmented",
    created_date: "2026-07-17T10:00:00Z"
  }
];

const DEFAULT_PLAYERS = [
  {
    id: "player_1",
    username: "DeckMaster",
    discord_id: "player_001",
    created_by: "player@deckverse.io",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    gold: 4800,
    gems: 950,
    xp: 1850,
    level: 14,
    wins: 32,
    losses: 6,
    elo: 1890,
    bio: "Chief Warden of DeckVerse OS.",
    guild_id: "guild_1",
    is_registered: true,
    created_date: "2026-07-01T10:00:00Z"
  },
  {
    id: "player_2",
    username: "KassiusPrime",
    discord_id: "kassius_01",
    created_by: "kassius@deckverse.io",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    gold: 15400,
    gems: 3200,
    xp: 9400,
    level: 28,
    wins: 168,
    losses: 14,
    elo: 2540,
    bio: "Top Ranked Grandmaster.",
    guild_id: "guild_1",
    is_registered: true,
    created_date: "2026-07-01T10:00:00Z"
  },
  {
    id: "player_3",
    username: "VexorHunter",
    discord_id: "vexor_02",
    created_by: "vexor@deckverse.io",
    avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
    gold: 9200,
    gems: 1400,
    xp: 4800,
    level: 21,
    wins: 95,
    losses: 24,
    elo: 2150,
    bio: "Survey Corps Raid Leader.",
    guild_id: "guild_2",
    is_registered: true,
    created_date: "2026-07-02T10:00:00Z"
  }
];

const DEFAULT_ROSTER = [
  { id: "rost_1", player_discord_id: "player_001", card_id: "card_1", card_name: "Sasuke Uchiha", level: 5, copies: 1, is_favorite: true, created_date: "2026-07-10T10:00:00Z" },
  { id: "rost_2", player_discord_id: "player_001", card_id: "card_2", card_name: "Naruto Uzumaki", level: 6, copies: 1, is_favorite: true, created_date: "2026-07-11T10:00:00Z" },
  { id: "rost_3", player_discord_id: "player_001", card_id: "card_5", card_name: "Levi Ackerman", level: 4, copies: 1, is_favorite: false, created_date: "2026-07-14T10:00:00Z" },
  { id: "rost_4", player_discord_id: "player_001", card_id: "card_6", card_name: "Iron Man", level: 3, copies: 1, is_favorite: false, created_date: "2026-07-15T10:00:00Z" },
  { id: "rost_5", player_discord_id: "player_001", card_id: "card_7", card_name: "Son Goku", level: 8, copies: 1, is_favorite: true, created_date: "2026-07-16T10:00:00Z" },
  { id: "rost_6", player_discord_id: "kassius_01", card_id: "card_3", card_name: "Gojo Satoru", level: 10, copies: 2, is_favorite: true, created_date: "2026-07-12T10:00:00Z" }
];

const DEFAULT_GUILDS = [
  {
    id: "guild_1",
    name: "Shadow Legion",
    tag: "SHDW",
    level: 5,
    xp: 14500,
    member_count: 14,
    leader_discord_id: "kassius_01",
    logo_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80",
    description: "Top competitive syndicate conquering bosses and arena seasons.",
    created_date: "2026-07-01T10:00:00Z"
  },
  {
    id: "guild_2",
    name: "Survey Corps",
    tag: "SCO",
    level: 3,
    xp: 6800,
    member_count: 8,
    leader_discord_id: "vexor_02",
    logo_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80",
    description: "Dedicated raid wardens targeting high difficulty boss drops.",
    created_date: "2026-07-02T10:00:00Z"
  }
];

const DEFAULT_ITEMS = [
  ...MEGA_ITEMS,
  { id: "item_1", name: "Refined Catalyst", type: "upgrade_stone", rarity: "Rare", icon: "💎", description: "Essential catalyst for card level ascension.", created_date: "2026-07-01T10:00:00Z" },
  { id: "item_2", name: "Gacha Ticket", type: "gacha_ticket", rarity: "Epic", icon: "🎟️", description: "Grants 1 free pull in the Gacha Zone.", created_date: "2026-07-01T10:00:00Z" },
  { id: "item_3", name: "Gold Pouch", type: "consumable", rarity: "Uncommon", icon: "💰", description: "Redeemable for 500 gold coins.", created_date: "2026-07-01T10:00:00Z" }
];

const DEFAULT_PLAYER_ITEMS = [
  { id: "pitem_1", player_discord_id: "player_001", item_id: "item_1", quantity: 15, created_date: "2026-07-01T10:00:00Z" },
  { id: "pitem_2", player_discord_id: "player_001", item_id: "item_2", quantity: 3, created_date: "2026-07-01T10:00:00Z" }
];

const DEFAULT_BATTLE_LOGS = [
  {
    id: "log_1",
    winner_username: "DeckMaster",
    loser_username: "Ember Drake",
    winner_card: "Sasuke Uchiha",
    loser_card: "Ember Drake",
    details: "PVE [NORMAL] — Sasuke Uchiha vs Ember Drake. 1/1 ondas vencidas.",
    created_date: "2026-07-29T14:20:00Z"
  },
  {
    id: "log_2",
    winner_username: "KassiusPrime",
    loser_username: "ABYSSAL SOVEREIGN",
    winner_card: "Gojo Satoru",
    loser_card: "ABYSSAL SOVEREIGN",
    details: "PVE [BOSS ☆] — Gojo Satoru vs ABYSSAL SOVEREIGN. 1/1 ondas vencidas.",
    created_date: "2026-07-29T16:45:00Z"
  }
];

const DEFAULT_CHANGELOGS = [
  {
    id: "log_v24",
    patch_version: "v2.4.0 — Tag System & Boss Era",
    release_date: "2026-07-28",
    notes: "• Added Synergy Tag System v2\n• Boss Event: ABYSSAL SOVEREIGN launched in Arena\n• Added Divine Gacha Pack & Pity Meter\n• Performance optimizations and smooth route transitions",
    created_date: "2026-07-28T10:00:00Z"
  },
  {
    id: "log_v23",
    patch_version: "v2.3.1 — Multiverse Collections",
    release_date: "2026-07-20",
    notes: "• Integrated Marvel vs Capcom & Attack on Titan collections\n• Added Guild Rankings & Member Perks\n• Improved Card Upgrade Laboratory",
    created_date: "2026-07-20T10:00:00Z"
  }
];

const DEFAULT_LORE = [
  {
    id: "lore_1",
    title: "Genesis of the Multiverse Convergence",
    code: "LORE-COS-CORE-001",
    category: "Cosmology & Origins",
    era: "Genesis Epoch",
    clearance_level: "OMEGA-LEVEL",
    author: "Archivist AI Core // Node-01",
    summary: "Telemetry record detailing the sudden collapse of dimensional boundaries, unifying Shinobi, Sorcerers, Titans, and Netrunners into DeckVerse OS.",
    content: "At epoch index T-0.0042, quantum space collapsed across sub-dimensional sectors 01 through 09. Energy signatures from Chakra, Cursed Energy, God Ki, and Neural Cybernetics collided at the nexus point, giving birth to the DeckVerse matrix.\n\nAll entities transformed into digital energy cards locked inside hyper-dense crystalline matrices. Wardens now operate deep-space terminals to summon, combine, and deploy these heroes in orbital PVE arenas.",
    image_url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80",
    tags: ["Multiverse", "Nexus", "Genesis", "Matrix", "DeckVerse"],
    related_series: "DeckVerse Core",
    created_date: "2026-07-01T00:00:00Z"
  },
  {
    id: "lore_2",
    title: "The Six Eyes & Infinity Continuum",
    code: "LORE-JJK-SOR-002",
    category: "Character Chronicles",
    era: "Modern Sorcery Era",
    clearance_level: "TOP SECRET",
    author: "Jujutsu High High-Archivist Log",
    summary: "Deep-space analysis on Gojo Satoru's atomic perception and space-manipulating Limitless technique.",
    content: "Log entry #9941: Gojo Satoru's Six Eyes allow perception of cursed energy down to the atomic sub-particle scale. When paired with the Limitless technique, space around him decelerates infinitely, making physical contact mathematically impossible.\n\nIn orbital simulation battles, his 'Hollow Purple' anti-matter pulse disintegrates target hull structures instantaneously. Terminal scan advises caution when engaging in 1v1 Arena duels.",
    image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    tags: ["Gojo", "Six Eyes", "Limitless", "Jujutsu", "Tokyo"],
    related_series: "Jujutsu Kaisen",
    created_date: "2026-07-05T12:00:00Z"
  },
  {
    id: "lore_3",
    title: "Survey Corps Recon #808: Titan Origin Matrix",
    code: "LORE-AOT-SCO-003",
    category: "Faction Archives",
    era: "Titan Crisis Era",
    clearance_level: "SECRET",
    author: "Commander Hange Zoë // Scout Recon",
    summary: "Classified reconnaissance logs regarding the Founding Titan path coordinates and Ackerman genetic awakenings.",
    content: "Scout Regiment Telemetry: The Nine Titans originate from an organic spinal anomaly linked to the Paths dimension. Human subjects belonging to the Ackerman lineage possess awakened instincts from ancient titan research, granting inhuman speed and blade precision.\n\nCaptain Levi Ackerman's ODM Maneuver speed reached 190 knots in recent orbital simulations, cutting down high-tier boss entities before sensor lock.",
    image_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    tags: ["Scouts", "Titans", "Levi", "Ackerman", "Paradis"],
    related_series: "Attack on Titan",
    created_date: "2026-07-08T15:30:00Z"
  },
  {
    id: "lore_4",
    title: "Uchiha Eye Evolution & Chakra Resonance",
    code: "LORE-NAR-UCH-004",
    category: "Multiverse Events",
    era: "Shinobi Epoch",
    clearance_level: "CONFIDENTIAL",
    author: "Shinobi Intel Archives #04",
    summary: "Historical progression of the Sharingan, Mangekyo black flames, and Susanoo armor manifestation.",
    content: "Data Record NAR-004: The Uchiha bloodline manifests ocular chakra spikes when experiencing intense emotional trauma or passion. Sasuke Uchiha's Mangekyo Sharingan unlocks black flames of Amaterasu that burn until target erasure.\n\nSynergy Tag Analysis: Pairing Sasuke with fellow Uchiha or Shinobi triggers +25% Critical Rate boost across the tactical frontline.",
    image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    tags: ["Sasuke", "Uchiha", "Chakra", "Sharingan", "Shinobi"],
    related_series: "Naruto",
    created_date: "2026-07-12T09:15:00Z"
  },
  {
    id: "lore_5",
    title: "Sandevistan Neural Overclock Protocol",
    code: "LORE-CYB-NCT-005",
    category: "Artifact & Tech Records",
    era: "Cybernetic Future",
    clearance_level: "UNCLASSIFIED",
    author: "Night City Netrunner Network",
    summary: "Technical schematics and neural safety warning logs for military-grade cyberware acceleration.",
    content: "Cyberware Ref #NCT-882: The Sandevistan spinal implant floods the human central nervous system with neural acceleration currents, perception-shifting reality so the user moves faster than optical sensors can track.\n\nWarning: Prolonged overclocking induces cyberpsychosis unless mitigated by Refined Catalysts and high-tier Warden gear.",
    image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
    tags: ["Sandevistan", "Netrunner", "NightCity", "Tech", "Cyberware"],
    related_series: "Cyberpunk Legends",
    created_date: "2026-07-16T18:40:00Z"
  },
  {
    id: "lore_6",
    title: "Abyssal Sovereign Void Entity Analysis",
    code: "LORE-BOSS-ABY-006",
    category: "Anomalies & Bosses",
    era: "Abyssal Rift Era",
    clearance_level: "OMEGA-LEVEL",
    author: "Deep-Space Tactical Command",
    summary: "Emergency bulletin detailing the dark void entity emerging from Sector Zero PVE Boss Raids.",
    content: "ALERT [SECTOR_ZERO]: An ancient void entity designated 'ABYSSAL SOVEREIGN' has breached orbital quarantine. Fueled by dark matter corruption, it drains 15% team HP every round while absorbing elemental elemental strikes.\n\nWardens must form 5-man Guild Syndicates with high-synergy tags (God Ki, Six Eyes, Limitless) to break its void shield and secure Mythic Gacha Drops.",
    image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    tags: ["Boss", "Abyssal", "Void", "Raid", "Anomaly"],
    related_series: "DeckVerse Core",
    created_date: "2026-07-22T21:10:00Z"
  }
];

// Helper to initialize LocalStorage storage table
function getStorageTable(tableName, defaultData) {
  try {
    const raw = localStorage.getItem(`deckverse_${tableName}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && Array.isArray(defaultData)) {
        const existingKeys = new Set(parsed.map(i => i.id || i.card_id || i.code));
        let added = false;
        for (const item of defaultData) {
          const key = item.id || item.card_id || item.code;
          if (key && !existingKeys.has(key)) {
            parsed.push(item);
            existingKeys.add(key);
            added = true;
          }
        }
        if (added) {
          saveStorageTable(tableName, parsed);
        }
        return parsed;
      }
      return parsed;
    }
  } catch (e) {
    console.warn(`Failed reading storage for ${tableName}:`, e);
  }
  try {
    localStorage.setItem(`deckverse_${tableName}`, JSON.stringify(defaultData));
  } catch (e) {}
  return [...defaultData];
}

function saveStorageTable(tableName, data) {
  try {
    localStorage.setItem(`deckverse_${tableName}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed saving storage for ${tableName}:`, e);
  }
}

// Create Entity Handler for a given table name
function createEntityStore(tableName, defaultData) {
  return {
    list: async (order = "-created_date", limit = 100) => {
      let items = getStorageTable(tableName, defaultData);
      if (order) {
        const desc = order.startsWith("-");
        const key = desc ? order.slice(1) : order;
        items = [...items].sort((a, b) => {
          const valA = a[key] ?? "";
          const valB = b[key] ?? "";
          if (valA < valB) return desc ? 1 : -1;
          if (valA > valB) return desc ? -1 : 1;
          return 0;
        });
      }
      if (limit && limit > 0) items = items.slice(0, limit);
      return items;
    },

    filter: async (query = {}) => {
      const items = getStorageTable(tableName, defaultData);
      if (typeof query === "function") return items.filter(query);
      return items.filter(item => {
        return Object.entries(query).every(([k, v]) => item[k] === v);
      });
    },

    get: async (id) => {
      const items = getStorageTable(tableName, defaultData);
      return items.find(item => item.id === id || item.card_id === id) || null;
    },

    create: async (data) => {
      const items = getStorageTable(tableName, defaultData);
      const newItem = {
        id: `${tableName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        created_date: new Date().toISOString(),
        ...data
      };
      items.unshift(newItem);
      saveStorageTable(tableName, items);
      return newItem;
    },

    update: async (id, data) => {
      const items = getStorageTable(tableName, defaultData);
      const idx = items.findIndex(item => item.id === id || item.card_id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...data, updated_date: new Date().toISOString() };
        saveStorageTable(tableName, items);
        return items[idx];
      }
      return null;
    },

    delete: async (id) => {
      let items = getStorageTable(tableName, defaultData);
      items = items.filter(item => item.id !== id && item.card_id !== id);
      saveStorageTable(tableName, items);
      return { success: true };
    }
  };
}

// Registry of stores
const entityStores = {
  Card: createEntityStore("Card", DEFAULT_CARDS),
  Collection: createEntityStore("Collection", DEFAULT_COLLECTIONS),
  Player: createEntityStore("Player", DEFAULT_PLAYERS),
  Roster: createEntityStore("Roster", DEFAULT_ROSTER),
  Guild: createEntityStore("Guild", DEFAULT_GUILDS),
  GuildMember: createEntityStore("GuildMember", []),
  Item: createEntityStore("Item", DEFAULT_ITEMS),
  PlayerItem: createEntityStore("PlayerItem", DEFAULT_PLAYER_ITEMS),
  BattleLog: createEntityStore("BattleLog", DEFAULT_BATTLE_LOGS),
  TradeRequest: createEntityStore("TradeRequest", []),
  Changelog: createEntityStore("Changelog", DEFAULT_CHANGELOGS),
  Lore: createEntityStore("Lore", DEFAULT_LORE)
};

export const db = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => ({
      id: "user_1",
      name: "DeckMaster",
      email: "player@deckverse.io",
      role: "admin",
      discord_id: "player_001"
    })
  },
  entities: new Proxy({}, {
    get: (_target, prop) => {
      if (entityStores[prop]) return entityStores[prop];
      return createEntityStore(prop, []);
    }
  }),
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        return { file_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80" };
      }
    }
  }
};

globalThis.__B44_DB__ = db;
export const base44 = db;
export default db;
