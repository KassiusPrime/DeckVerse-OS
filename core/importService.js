// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Core Import Service
// Unified card and collection import pipeline with automatic deduplication
// ════════════════════════════════════════════════════════════════════════════

import { entityRepository } from "./entityRepository.js";
import { db } from "../deckverseClient.js";
import { validateCard, validateCollection, normalizeCode } from "../lib/importSchemas.js";
import { validateCardSchema } from "./schemaValidationApi.js";
import { inferCollectionCode, CANONICAL_SERIES_NAMES } from "../lib/collectionCodes.js";

class ImportService {
  /**
   * Import a single card with normalization and deduplication
   */
  async importSingleCard(cardData, options = { overwrite: true }) {
    const existingCards = await entityRepository.getAllCards();
    const normalizedCollection = inferCollectionCode(cardData);

    // Formats & Fallbacks
    const name = (cardData.name || "Carta Sem Nome").trim();
    const card_id = cardData.card_id || `${normalizedCollection}-${name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)}-${Math.floor(Math.random() * 899 + 100)}`;

    const duplicate = existingCards.find(c =>
      c.card_id === card_id ||
      (c.name.toLowerCase() === name.toLowerCase() && normalizeCode(c.collection_id) === normalizedCollection)
    );

    if (duplicate && !options.overwrite) {
      return {
        status: "skipped",
        reason: "Carta já existente",
        card: duplicate
      };
    }

    const seriesName = cardData.series || CANONICAL_SERIES_NAMES[normalizedCollection] || cardData.collection_id || "DeckVerse";

    const payload = {
      id: duplicate ? duplicate.id : `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      card_id,
      collection_id: normalizedCollection,
      series: seriesName,
      rarity: cardData.rarity || "SR",
      role: cardData.role || "DPS",
      element: cardData.element || undefined,
      gender: cardData.gender || undefined,
      attack: Number(cardData.attack) || 100,
      defense: Number(cardData.defense) || 100,
      speed: Number(cardData.speed) || 100,
      hp: Number(cardData.hp) || 400,
      mag: Number(cardData.mag) || 100,
      image_url: cardData.image_url || cardData.img_oficial || "",
      img_oficial: cardData.img_oficial || cardData.image_url || "",
      img_custom: cardData.img_custom || "",
      lore: cardData.lore || cardData.bio || `Personagem lendário da coleção ${seriesName}.`,
      skills: Array.isArray(cardData.skills) ? cardData.skills : [],
      tags: Array.isArray(cardData.tags) ? cardData.tags : [normalizedCollection],
      version: cardData.version || "Classic",
      evolution_stage: Number(cardData.evolution_stage) || 1,
      is_boss: Boolean(cardData.is_boss || cardData.rarity === "BOSS" || cardData.rarity === "ANOMALIA"),
      ...cardData,
      collection_id: normalizedCollection,
      series: seriesName
    };

    const schemaCheck = validateCardSchema(payload, { mode: "soft" });
    const validated = validateCard({ ...payload, ...schemaCheck.data });
    const cardToSave = validated.ok ? { ...validated.data, warnings: schemaCheck.warnings } : { ...payload, franchise_fields: schemaCheck.data?.franchise_fields, schema_code: schemaCheck.schema_code };
    const savedCard = await entityRepository.saveCard(cardToSave);

    // Auto-add to Roster so card appears in player collection
    try {
      const players = await entityRepository.getAllPlayers().catch(() => []);
      const pId = players[0]?.discord_id || "player_001";
      const roster = (await db.entities.Roster.list().catch(() => [])) || [];
      const cId = String(savedCard.id || savedCard.card_id);
      const cName = String(savedCard.name || "").toLowerCase().trim();
      const existsInRoster = roster.some(r =>
        String(r.card_id) === cId || (r.card_name && String(r.card_name).toLowerCase().trim() === cName)
      );

      if (!existsInRoster) {
        await db.entities.Roster.create({
          player_discord_id: pId,
          card_id: savedCard.card_id || savedCard.id,
          card_name: savedCard.name,
          level: 1,
          attack_bonus: 0,
          defense_bonus: 0,
          copies: 1,
          is_favorite: false,
          created_date: new Date().toISOString()
        }).catch(() => null);
      }
    } catch (e) {
      console.warn("Roster sync warning on importSingleCard:", e);
    }

    return {
      status: duplicate ? "updated" : "created",
      card: savedCard
    };
  }

  /**
   * Import batch array of cards
   */
  async importCardBatch(cardsArray, options = { overwrite: true }) {
    if (!Array.isArray(cardsArray) || cardsArray.length === 0) {
      return { total: 0, imported: 0, skipped: 0, errors: ["Nenhuma carta enviada."] };
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];
    const results = [];

    for (let i = 0; i < cardsArray.length; i++) {
      try {
        const res = await this.importSingleCard(cardsArray[i], options);
        if (res.status === "skipped") {
          skipped++;
        } else {
          imported++;
        }
        results.push(res);
      } catch (err) {
        errors.push(`Item ${i + 1} (${cardsArray[i]?.name || "sem nome"}): ${err.message}`);
      }
    }

    return {
      total: cardsArray.length,
      imported,
      skipped,
      errors,
      results
    };
  }

  /**
   * Import or update collection metadata
   */
  async importCollection(collectionData) {
    const code = normalizeCode(collectionData.code || collectionData.name || "NEW");
    const payload = {
      name: collectionData.name || "Nova Coleção",
      code,
      description: collectionData.description || `Coleção ${code} importada no DeckVerse OS.`,
      image_url: collectionData.image_url || "",
      created_date: collectionData.created_date || new Date().toISOString()
    };

    const validated = validateCollection(payload);
    const colToSave = validated.ok ? validated.data : payload;
    return await entityRepository.saveCollection(colToSave);
  }

  /**
   * Seed Acervo — 62 Collections (COL-01...COL-62)
   */
  async seedAcervo62() {
    const collectionsList = [
      // COL-01 — ANIMES / MANGÁS / LN & WEBTOONS (22)
      { code: "COL-01-AOT", name: "Attack on Titan", bank: "COL-01", description: "Divisão de Reconhecimento, Titãs Originais e a batalha por Paradis." },
      { code: "COL-01-BER", name: "Berserk", bank: "COL-01", description: "Guts, Marca do Sacrifício, Bando do Falcão e a Mão de Deus." },
      { code: "COL-01-BCL", name: "Black Clover", bank: "COL-01", description: "Cavaleiros Mágicos, Anti-magia, Demônios e o Reino Clover." },
      { code: "COL-01-BLC", name: "Bleach", bank: "COL-01", description: "Shinigamis, Zanpakutos, Espadas e Guerra Sangrenta dos Mil Anos." },
      { code: "COL-01-CSM", name: "Chainsaw Man", bank: "COL-01", description: "Caçadores de demônios da Segurança Pública e Pactos Diabólicos." },
      { code: "COL-01-DS", name: "Demon Slayer", bank: "COL-01", description: "Caçadores de demônios, respirações lendárias e Luas Superiores." },
      { code: "COL-01-DBZ", name: "Dragon Ball Z", bank: "COL-01", description: "Esferas do Dragão, Saiyajins, Fusões e Guerreiros Z." },
      { code: "COL-01-FATE", name: "Fate Series", bank: "COL-01", description: "Servos, Espíritos Heroicos, Mestres e o Grande Cálice Sagrado." },
      { code: "COL-01-FMA", name: "Fullmetal Alchemist", bank: "COL-01", description: "Alquimistas de Estado, Pedra Filosofal e os 7 Homúnculos." },
      { code: "COL-01-HXH", name: "Hunter x Hunter", bank: "COL-01", description: "Exame Hunter, usuários de Nen e a Invasão das Formigas Quimera." },
      { code: "COL-01-JOJO", name: "JoJo Bizarre Adventure", bank: "COL-01", description: "Linhagem Joestar, Stands lendários e Máscaras de Pedra." },
      { code: "COL-01-JJK", name: "Jujutsu Kaisen", bank: "COL-01", description: "Feiticeiros Jujutsu, maldições especiais e expansões de domínio." },
      { code: "COL-01-MHA", name: "My Hero Academia", bank: "COL-01", description: "Heróis profissionais, Peculiaridades e a Associação de Vilões." },
      { code: "COL-01-NRT", name: "Naruto", bank: "COL-01", description: "Aldeias ocultas, jutsus lendários, jinchurikis e clãs." },
      { code: "COL-01-OP", name: "One Piece", bank: "COL-01", description: "Grand Line, Akuma no Mi, Yonkous e a busca pelo One Piece." },
      { code: "COL-01-OPM", name: "One Punch Man", bank: "COL-01", description: "Saitama, Heróis Classe S e Ameaças Nível Deus." },
      { code: "COL-01-SS", name: "Saint Seiya", bank: "COL-01", description: "Cavaleiros de Atena, Armaduras de Ouro e o Sétimo Sentido." },
      { code: "COL-01-SL", name: "Solo Leveling", bank: "COL-01", description: "Portais dimensionais, Caçadores Rank S e o Exército de Sombras." },
      { code: "COL-01-TG", name: "Tokyo Ghoul", bank: "COL-01", description: "Ghouls, Quinques, Kagunes e a CCG." },
      { code: "COL-01-TOG", name: "Tower of God", bank: "COL-01", description: "A Torre de Deus, Regulares, Irregulares e Testes de Posição." },
      { code: "COL-01-VS", name: "Vinland Saga", bank: "COL-01", description: "Guerreiros Vikings, Thorfinn, vingança e a busca por Vinland." },
      { code: "COL-01-YYH", name: "Yu Yu Hakusho", bank: "COL-01", description: "Detetive Espiritual, Torneio das Trevas e Energia de Leikou." },

      // COL-02 — JOGOS (13)
      { code: "COL-02-BB", name: "Bloodborne", bank: "COL-02", description: "Yharnam, Caçadores, Sangue Antigo e Grandes Antigos." },
      { code: "COL-02-CP77", name: "Cyberpunk 2077", bank: "COL-02", description: "Night City, Cyberware, Mercenários, Arasaka e Lendas de Night City." },
      { code: "COL-02-DS", name: "Dark Souls", bank: "COL-02", description: "A Era do Fogo, Lordes de Cinder e a Maldição dos Mortos-Vivos." },
      { code: "COL-02-DMC", name: "Devil May Cry", bank: "COL-02", description: "Dante, Vergil, Caçadores de Demônios e a espada Rebellion." },
      { code: "COL-02-ER", name: "Elden Ring", bank: "COL-02", description: "Maculados, Demideuses, Anel Prístino e Térvore." },
      { code: "COL-02-FF", name: "Final Fantasy", bank: "COL-02", description: "Guerreiros da Luz, Cristais Primordiais e Summons Místicas." },
      { code: "COL-02-GOW", name: "God of War", bank: "COL-02", description: "Kratos, Deuses das Mitologias Grega e Nórdica." },
      { code: "COL-02-LOL", name: "League of Legends", bank: "COL-02", description: "Campeões de Runeterra, Zaun, Noxus, Demacia e Ionia." },
      { code: "COL-02-MK", name: "Mortal Kombat", bank: "COL-02", description: "Protetores de Earthrealm, Fatalities e a Invasão de Outworld." },
      { code: "COL-02-SKR", name: "The Elder Scrolls V: Skyrim", bank: "COL-02", description: "Dragonborn, Shouts, Alduin e Província de Skyrim." },
      { code: "COL-02-TLOU", name: "The Last of Us", bank: "COL-02", description: "Sobreviventes, Infectados Cordyceps, Vira-Lupas e Joel & Ellie." },
      { code: "COL-02-ZLD", name: "The Legend of Zelda", bank: "COL-02", description: "Heroi da Legenda, Princesa Zelda, Triforce e Ganondorf." },
      { code: "COL-02-WITCHER", name: "The Witcher", bank: "COL-02", description: "Geralt de Rívia, Bruxos, Caçada Selvagem e Sinais Mágicos." },

      // COL-03 — CINEMA & FRANQUIAS (8)
      { code: "COL-03-DC", name: "DC Universe", bank: "COL-03", description: "Liga da Justiça, Bat-família, Justiça Jovem, Super-Choque, Lanternas e Crises Cósmicas." },
      { code: "COL-03-DUNE", name: "Dune", bank: "COL-03", description: "Arrakis, Especiaria Melange, Paul Atreides e os Vermes da Areia." },
      { code: "COL-03-GOT", name: "Game of Thrones", bank: "COL-03", description: "Casas de Westeros, Trono de Ferro, Dragões e Caminhantes Brancos." },
      { code: "COL-03-HP", name: "Harry Potter", bank: "COL-03", description: "Escola de Hogwarts, Casas de Magia, Feitiços e Comensais." },
      { code: "COL-03-LOTR", name: "Lord of the Rings", bank: "COL-03", description: "Sociedade do Anel, Um Anel, Sauron e a Terra-Média." },
      { code: "COL-03-SW", name: "Star Wars", bank: "COL-03", description: "Cavaleiros Jedi, Lordes Sith, a Força e a Aliança Rebelde." },
      { code: "COL-03-BOYS", name: "The Boys", bank: "COL-03", description: "Vought International, Os Sete, Composto V e Os Boys." },
      { code: "COL-03-MARVEL", name: "Marvel Comics Universe", bank: "COL-03", description: "Mutantes, Vingadores, Joias do Infinito, Quarteto Fantástico e Heróis Cósmicos." },

      // COL-04 — SÉRIES & ANIMAÇÃO OCIDENTAL (7)
      { code: "COL-04-ARC", name: "Arcane", bank: "COL-04", description: "A Cidade do Progresso Piltover, o Submundo de Zaun e Cristais Hextech." },
      { code: "COL-04-ATLA", name: "Avatar: The Last Airbender", bank: "COL-04", description: "Avatar, Dobradores dos Quatro Elementos e a Nação do Fogo." },
      { code: "COL-04-BEN10", name: "Ben 10", bank: "COL-04", description: "Omnitrix, Transformações Alienígenas e Encanadores Galácticos." },
      { code: "COL-04-CASTLEVANIA", name: "Castlevania", bank: "COL-04", description: "Clã Belmont, Chicote Sagrado, Alucard e o Castelo do Conde Drácula." },
      { code: "COL-04-HAZBIN", name: "Hazbin Hotel", bank: "COL-04", description: "Redenção no Inferno, Charlie Morningstar e o Hotel Hazbin." },
      { code: "COL-04-AT", name: "Hora de Aventura", bank: "COL-04", description: "Terra de Ooo, Finn o Humano, Jake o Cão e Rei Gelado." },
      { code: "COL-04-INV", name: "Invencível", bank: "COL-04", description: "Mark Grayson, Viltrumitas, Guardiões do Globo e Omni-Man." },

      // COL-05 — MITOLOGIAS (6)
      { code: "COL-05-EGY", name: "Mitologia Egípcia", bank: "COL-05", description: "Deuses do Nilo, Rá, Anúbis, Osíris e Faraós Sagrados." },
      { code: "COL-05-GRK", name: "Mitologia Grega", bank: "COL-05", description: "Olimpo, Zeus, Poseidon, Hades e Heróis Mitológicos." },
      { code: "COL-05-JPN", name: "Mitologia Japonesa", bank: "COL-05", description: "Kami, Amaterasu, Susanoo, Yokais e Espíritos Shinto." },
      { code: "COL-05-POLYNESIAN", name: "Mitologia Maori & Polinésia", bank: "COL-05", description: "Maui, Pele, Tangaroa e Lendas do Pacífico Ocidental." },
      { code: "COL-05-MESO", name: "Mitologia Mesopotâmica", bank: "COL-05", description: "Gilgamesh, Enkidu, Ishtar, Marduk e o Berço da Civilização." },
      { code: "COL-05-NORSE", name: "Mitologia Nórdica", bank: "COL-05", description: "Asgard, Odin, Thor, Loki, Yggdrasil e o Ragnarok." },

      // COL-06 — HISTÓRICOS & REALIDADE (4)
      { code: "COL-06-ANTIQUITY", name: "Antiguidade Clássica", bank: "COL-06", description: "Imperadores Romanos, Falanges Espartanas e Filósofos de Atenas." },
      { code: "COL-06-REVOLUTIONS", name: "Era das Revoluções", bank: "COL-06", description: "Líderes Revolucionários, Estrategistas e Mudanças Mundiais." },
      { code: "COL-06-ART", name: "Mestres da Arte & Ciência", bank: "COL-06", description: "Da Vinci, Tesla, Newton, Galileu e Mentes Brilhantes." },
      { code: "COL-06-FEUDAL", name: "Japão Feudal & Samurai", bank: "COL-06", description: "Shoguns, Ninjas Shinobi, Ronins e Código Bushido." }
    ];

    let seededCount = 0;
    for (const c of collectionsList) {
      await this.importCollection(c);
      seededCount++;
    }

    return { success: true, seededCount, total: collectionsList.length };
  }

  /**
   * Merge Duplicate Collections by name or code similarity
   */
  async mergeDuplicateCollections() {
    const collections = await entityRepository.getAllCollections();
    const cards = await entityRepository.getAllCards();

    const collectionMap = new Map();
    const mergedResults = [];

    // Group collections by canonical key
    for (const col of collections) {
      const cleanKey = col.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!collectionMap.has(cleanKey)) {
        collectionMap.set(cleanKey, col);
      } else {
        const canonical = collectionMap.get(cleanKey);
        // Transfer cards from duplicate collection to canonical
        let transferredCards = 0;
        for (const card of cards) {
          if (card.collection_id === col.code || card.series === col.name) {
            await entityRepository.saveCard({
              ...card,
              collection_id: canonical.code,
              series: canonical.name
            });
            transferredCards++;
          }
        }
        // Delete duplicate collection entity
        await entityRepository.deleteCollection(col.id);
        mergedResults.push({
          duplicate: col.name,
          mergedInto: canonical.name,
          transferredCards
        });
      }
    }

    return {
      success: true,
      mergedCount: mergedResults.length,
      details: mergedResults
    };
  }

  /**
   * Reclassify cards into canonical formats
   */
  async reclassifyCards() {
    const cards = await entityRepository.getAllCards();
    let reclassifiedCount = 0;

    const rarityMap = {
      "Lendário": "UR", "Lendario": "UR", "Épico": "SSR", "Epico": "SSR",
      "Raro": "SR", "Incomum": "UC", "Comum": "C", "Mítico": "MR", "Mitico": "MR",
      "Transcendente": "TRS", "Divino": "DIV", "Divine": "DIV", "Boss": "BOSS", "Anomalia": "ANOMALIA"
    };

    for (const card of cards) {
      let changed = false;
      let newRarity = card.rarity;

      if (rarityMap[card.rarity]) {
        newRarity = rarityMap[card.rarity];
        changed = true;
      }

      const isBoss = Boolean(card.is_boss || newRarity === "BOSS" || newRarity === "ANOMALIA");
      if (card.is_boss !== isBoss) {
        changed = true;
      }

      if (changed) {
        await entityRepository.saveCard({
          ...card,
          rarity: newRarity,
          is_boss: isBoss
        });
        reclassifiedCount++;
      }
    }

    return { success: true, reclassifiedCount, totalCards: cards.length };
  }

  /**
   * Sync all imported and system cards directly into the active Player's Roster (Collection)
   */
  async syncCardsToRoster(targetPlayerId) {
    const players = await entityRepository.getAllPlayers().catch(() => []);
    const player = players[0] || null;
    const pId = targetPlayerId || player?.discord_id || "player_001";

    const allCards = await entityRepository.getAllCards().catch(() => []);
    const allRoster = (await db.entities.Roster.list().catch(() => [])) || [];

    const rosterCardIds = new Set();
    const rosterCardNames = new Set();

    allRoster.forEach(r => {
      if (r.card_id) rosterCardIds.add(String(r.card_id));
      if (r.card_name) rosterCardNames.add(String(r.card_name).toLowerCase().trim());
    });

    let addedToRoster = 0;

    for (const card of allCards) {
      const cId = String(card.id || card.card_id);
      const cName = String(card.name || "").toLowerCase().trim();

      if (!rosterCardIds.has(cId) && !rosterCardNames.has(cName)) {
        await db.entities.Roster.create({
          player_discord_id: pId,
          card_id: card.card_id || card.id,
          card_name: card.name,
          level: card.level || 1,
          attack_bonus: 0,
          defense_bonus: 0,
          copies: 1,
          is_favorite: false,
          created_date: new Date().toISOString()
        }).catch(() => null);

        rosterCardIds.add(cId);
        if (cName) rosterCardNames.add(cName);
        addedToRoster++;
      }
    }

    return { success: true, addedToRoster, totalRoster: allRoster.length + addedToRoster };
  }
}

export const importService = new ImportService();
