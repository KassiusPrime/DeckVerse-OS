// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — MEGA CROSSOVER COLLECTIONS DATA
// Fully parsed from user provided dataset.
// Image URLs are intentionally empty so the user can easily edit and add images.
// ════════════════════════════════════════════════════════════════════════════

export const MEGA_COLLECTIONS = [
  { id: "col_naruto", code: "NAR", name: "Naruto", description: "🍥 Ninjas de Konoha, Akatsuki, Hokages e Jinchurikis", image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80" },
  { id: "col_aot", code: "SNK", name: "Shingeki no Kyojin", description: "⚔ Tropa de Exploração, Titãs Shifters e Guerreiros de Marley", image_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80" },
  { id: "col_demonslayer", code: "KNY", name: "Kimetsu no Yaiba", description: "👹 Hashiras, Esquadrão de Caçadores e Doze Kizuki", image_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80" },
  { id: "col_dragonball", code: "DBZ", name: "Dragon Ball Z", description: "🐉 Guerreiros Z, Saiyajins, Torneio do Poder e Deuses", image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80" },
  { id: "col_jjk", code: "JJK", name: "Jujutsu Kaisen", description: "⛩ Feiticeiros de Jujutsu, Maldições e Expansões de Domínio", image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80" },
  { id: "col_jojo", code: "JBA", name: "JoJo's Bizarre Adventure", description: "👊 Linhagem Joestar, Usuários de Stand e Homens do Pilar", image_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80" },
  { id: "col_opm", code: "OPM", name: "One Punch Man", description: "👊 Associação de Heróis Classe S e Associação de Monstros", image_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80" },
  { id: "col_starwars", code: "STW", name: "Star Wars", description: "🌌 Ordem Jedi, Império Sith, Mandalorianos e A Força", image_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80" },
  { id: "col_bleach", code: "BLE", name: "Bleach", description: "⚔ Gotei 13, Espadas, Quincy e Shinigamis Substitutos", image_url: "" },
  { id: "col_hxh", code: "HXH", name: "Hunter x Hunter", description: "🕸 Usuários de Nen, Trupe Fantasma, Zoldycks e Formigas Quimera", image_url: "" },
  { id: "col_fma", code: "FMA", name: "Fullmetal Alchemist", description: "⚗ Alquimistas de Amestris, Homúnculos e Troca Equivalente", image_url: "" },
  { id: "col_mha", code: "MHA", name: "Boku no Hero Academia", description: "🦸‍♂️ Heróis da Classe 1-A, Pro Heroes e Liga dos Vilões", image_url: "" },
  { id: "col_onepiece", code: "OP", name: "One Piece", description: "🏴‍☠️ Chapéus de Palha, Marinha e Yonkous", image_url: "" },
  { id: "col_sololeveling", code: "SL", name: "Solo Leveling", description: "🗡 Exército das Sombras, Caçadores Nível S e Monarcas", image_url: "" },
  { id: "col_mvc", code: "MVC", name: "Marvel vs Capcom", description: "Multiversal Heroes and Villains from Comic & Gaming Universes", image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80" },
  { id: "col_dc", code: "DC", name: "DC Comics", description: "🦇 Liga da Justiça, Bat-Família, Apokolips e Trindade", image_url: "" },
  { id: "col_cyb", code: "CYB", name: "Cyberpunk Legends", description: "Futuristic Netrunners, Mercenaries & Augmented Warriors", image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80" },
];

export const MEGA_ITEMS = [
  // Naruto
  { id: "item_nar_1", item_code: "NAR-ITM-C-001", name: "Kunai de Konoha", rarity: "C", type: "Equipment", effect: "+15 ATQ básico em ataques à distância.", series: "Naruto", collection_id: "NAR", image_url: "" },
  { id: "item_nar_2", item_code: "NAR-ITM-R-002", name: "Pergaminho de Invocação", rarity: "R", type: "Consumable", effect: "Invoca um sapo guerreiro para absorver o próximo impacto do inimigo.", series: "Naruto", collection_id: "NAR", image_url: "" },
  { id: "item_nar_3", item_code: "NAR-ITM-SR-003", name: "Kunai do Trovão Voador", rarity: "SR", type: "Equipment", effect: "Concede +50 VEL e permite teletransporte evasivo imediato.", series: "Naruto", collection_id: "NAR", image_url: "" },
  { id: "item_nar_4", item_code: "NAR-ITM-UR-004", name: "Esferas da Busca da Verdade (Gudodama)", rarity: "UR", type: "Artifact", effect: "Anula todos os ataques mágicos e concede imunidade a debuffs por 2 turnos.", series: "Naruto", collection_id: "NAR", image_url: "" },

  // Shingeki no Kyojin
  { id: "item_snk_1", item_code: "SNK-ITM-C-001", name: "Sinalizador da Tropa", rarity: "C", type: "Consumable", effect: "+20% Precisão para toda a equipe.", series: "Shingeki no Kyojin", collection_id: "SNK", image_url: "" },
  { id: "item_snk_2", item_code: "SNK-ITM-R-002", name: "Lâminas Ultramacabras", rarity: "R", type: "Equipment", effect: "Garantem Acerto Crítico (2x Dano) contra a tag [Titã].", series: "Shingeki no Kyojin", collection_id: "SNK", image_url: "" },
  { id: "item_snk_3", item_code: "SNK-ITM-SR-003", name: "Equipamento DMT Tridimensional", rarity: "SR", type: "Equipment", effect: "+40% de Evasão e ignora qualquer dano de queda.", series: "Shingeki no Kyojin", collection_id: "SNK", image_url: "" },
  { id: "item_snk_4", item_code: "SNK-ITM-UR-004", name: "Soro de Titã Puro", rarity: "UR", type: "Consumable", effect: "Transforma o herói com HP baixo num Titã com dobro de HP e ATQ.", series: "Shingeki no Kyojin", collection_id: "SNK", image_url: "" },

  // Kimetsu no Yaiba
  { id: "item_kny_1", item_code: "KNY-ITM-C-001", name: "Brincos Hanafuda", rarity: "C", type: "Artifact", effect: "Provoca intimidação em demônios reduzindo AGI do alvo.", series: "Kimetsu no Yaiba", collection_id: "KNY", image_url: "" },
  { id: "item_kny_2", item_code: "KNY-ITM-R-002", name: "Frasco de Glicínia", rarity: "R", type: "Consumable", effect: "Cria uma névoa venenosa impedindo avanço de demônios.", series: "Kimetsu no Yaiba", collection_id: "KNY", image_url: "" },
  { id: "item_kny_3", item_code: "KNY-ITM-SR-003", name: "Máscara de Proteção de Urokodaki", rarity: "SR", type: "Equipment", effect: "Aumenta a taxa de Evasão em 40%.", series: "Kimetsu no Yaiba", collection_id: "KNY", image_url: "" },
  { id: "item_kny_4", item_code: "KNY-ITM-UR-004", name: "Lâmina Nichirin Vermelha", rarity: "UR", type: "Equipment", effect: "Ignora a regeneração absoluta de demônios.", series: "Kimetsu no Yaiba", collection_id: "KNY", image_url: "" },

  // Dragon Ball Z
  { id: "item_dbz_1", item_code: "DBZ-ITM-UR-001", name: "Semente dos Deuses (Senzu Bean)", rarity: "UR", type: "Consumable", effect: "Restaura 100% de HP e MP instantaneamente.", series: "Dragon Ball Z", collection_id: "DBZ", image_url: "" },
  { id: "item_dbz_2", item_code: "DBZ-ITM-R-002", name: "Nuvem Voadora (Kinto'un)", rarity: "R", type: "Equipment", effect: "Concede Evasão elevada contra ataques terrestres.", series: "Dragon Ball Z", collection_id: "DBZ", image_url: "" },
  { id: "item_dbz_3", item_code: "DBZ-ITM-C-003", name: "Radar do Dragão", rarity: "C", type: "Artifact", effect: "Aumenta a chance de loot raro ao derrotar inimigos.", series: "Dragon Ball Z", collection_id: "DBZ", image_url: "" },
  { id: "item_dbz_4", item_code: "DBZ-ITM-SR-004", name: "Brincos Potara", rarity: "SR", type: "Artifact", effect: "Permite fusão de status entre dois aliados.", series: "Dragon Ball Z", collection_id: "DBZ", image_url: "" }
];

export const MEGA_BOSSES = [
  { id: "boss_snk_1", boss_code: "SNK-BSS-TRS-001", name: "Eren Yeager (Titã Fundador)", rarity: "ANOMALIA", series: "Shingeki no Kyojin", collection_id: "SNK", hp: 1600, attack: 240, defense: 200, element: "Earth", tags: ["Deus", "Titã", "Humano"], drop_item: "O Caminho (Absoluto)", lore: "Centenas de Colossais marcham ao fundo drenando HP irredutível a cada rodada.", img_oficial: "", img_custom: "", is_boss: true },
  { id: "boss_kny_1", boss_code: "KNY-BSS-TRS-001", name: "Muzan Kibutsuji", rarity: "ANOMALIA", series: "Kimetsu no Yaiba", collection_id: "KNY", hp: 1500, attack: 250, defense: 190, element: "Shadow", tags: ["Demônio", "Rei dos Demônios"], drop_item: "Extrato de Lírio Aranha Azul", lore: "O Rei dos Demônios com sangue celular infectante e regeneração suprema.", img_oficial: "", img_custom: "", is_boss: true },
  { id: "boss_dbz_1", boss_code: "DBZ-BSS-DIV-001", name: "Jiren (O Cinzento)", rarity: "DIV", series: "Dragon Ball Z", collection_id: "DBZ", hp: 1800, attack: 290, defense: 230, element: "Light", tags: ["Alienígena", "Tropa do Orgulho"], drop_item: "Aura do Universo 11", lore: "Guerreiro do Universo 11 cujo poder supera os Deuses da Destruição.", img_oficial: "", img_custom: "", is_boss: true },
  { id: "boss_jjk_1", boss_code: "JJK-BSS-DIV-001", name: "Ryomen Sukuna (Rei das Maldições)", rarity: "DIV", series: "Jujutsu Kaisen", collection_id: "JJK", hp: 1750, attack: 280, defense: 210, element: "Shadow", tags: ["Maldição", "Rei das Maldições"], drop_item: "Dedo Amaldiçoado de Sukuna", lore: "Rei das Maldições com técnica de corte espacial e Santuário Malevolente.", img_oficial: "", img_custom: "", is_boss: true },
  { id: "boss_opm_1", boss_code: "OPM-BSS-TRS-001", name: "Lord Boros (Dominador do Universo)", rarity: "ANOMALIA", series: "One Punch Man", collection_id: "OPM", hp: 1900, attack: 300, defense: 220, element: "Lightning", tags: ["Alienígena", "Monstro"], drop_item: "Armadura de Restrição Solar", lore: "Lorde alienígena capaz de desferir o Canhão de Colapso de Estrelas.", img_oficial: "", img_custom: "", is_boss: true }
];

export function generateExpandedCards() {
  const cards = [];
  
  // Clean mapping per canonical series
  const seriesList = [
    { code: "NAR", series: "Naruto", energy: "Chakra", characters: ["Naruto Uzumaki", "Sasuke Uchiha", "Kakashi Hatake", "Itachi Uchiha", "Jiraiya", "Tsunade", "Orochimaru", "Minato Namikaze", "Madara Uchiha", "Obito Uchiha", "Pain (Nagato)", "Gaara", "Rock Lee", "Neji Hyuga", "Shikamaru Nara", "Sakura Haruno", "Hinata Hyuga", "Killer Bee", "Might Guy", "Hashirama Senju"], tags: ["Ninjas de Konoha", "Shinobi", "Hokage", "Akatsuki", "Jinchuriki"] },
    { code: "SNK", series: "Shingeki no Kyojin", energy: "Paths & Will", characters: ["Eren Yeager", "Mikasa Ackerman", "Armin Arlert", "Levi Ackerman", "Erwin Smith", "Reiner Braun", "Bertholdt Hoover", "Annie Leonhart", "Hange Zoë", "Sasha Blouse", "Connie Springer", "Jean Kirstein", "Zeke Yeager", "Historia Reiss", "Pieck Finger", "Porco Galliard", "Kenny Ackerman", "Ymir", "Falco Grice", "Gabi Braus"], tags: ["Tropa de Exploração", "Titã Shifter", "Guerreiro de Marley", "Ackerman"] },
    { code: "KNY", series: "Kimetsu no Yaiba", energy: "Breath Technique", characters: ["Tanjiro Kamado", "Nezuko Kamado", "Zenitsu Agatsuma", "Inosuke Hashibira", "Giyu Tomioka", "Kyojuro Rengoku", "Shinobu Kocho", "Tengen Uzui", "Muichiro Tokito", "Mitsuri Kanroji", "Obanai Iguro", "Sanemi Shinazugawa", "Gyomei Himejima", "Muzan Kibutsuji", "Kokushibo", "Doma", "Akaza", "Hantengu", "Gyokko", "Gyutaro"], tags: ["Esquadrão de Caçadores", "Hashira", "Doze Kizuki", "Respiração Solar"] },
    { code: "DBZ", series: "Dragon Ball Z", energy: "Ki", characters: ["Son Goku", "Vegeta", "Gohan", "Piccolo", "Future Trunks", "Goten", "Freeza", "Cell", "Majin Buu", "Beerus", "Whis", "Broly", "Jiren", "Hit", "Goku Black", "Android 17", "Android 18", "Bardock", "Gogeta", "Vegito"], tags: ["Saiyajin", "Guerreiros Z", "God Ki", "Universo 7"] },
    { code: "JJK", series: "Jujutsu Kaisen", energy: "Cursed Energy", characters: ["Yuji Itadori", "Megumi Fushiguro", "Nobara Kugisaki", "Satoru Gojo", "Suguru Geto", "Ryomen Sukuna", "Yuta Okkotsu", "Maki Zen'in", "Toge Inumaki", "Panda", "Kento Nanami", "Aoi Todo", "Toji Fushiguro", "Mahito", "Jogo", "Hanami", "Choso", "Kashimo", "Hakari", "Kenjaku"], tags: ["Feiticeiro de Jujutsu", "Espírito Amaldiçoado", "Limitless", "Six Eyes"] },
    { code: "JBA", series: "JoJo's Bizarre Adventure", energy: "Stand Power", characters: ["Jotaro Kujo", "DIO", "Giorno Giovanna", "Joseph Joestar", "Jonathan Joestar", "Josuke Higashikata", "Jolyne Cujo", "Yoshikage Kira", "Diavolo", "Enrico Pucci", "Funny Valentine", "Bruno Bucciarati", "Rohan Kishibe", "Noriaki Kakyoin", "Jean Pierre Polnareff", "Guido Mista", "Gyro Zeppeli", "Caesar Zeppeli", "Speedwagon", "Kars"], tags: ["Joestar", "Stand User", "Hamon", "Homem do Pilar"] },
    { code: "OPM", series: "One Punch Man", energy: "Limit Break", characters: ["Saitama", "Genos", "Tatsumaki", "Bang (Silver Fang)", "Atomic Samurai", "Metal Knight", "King", "Garou", "Boros", "Zombieman", "Flashy Flash", "Metal Bat", "Child Emperor", "Superalloy Darkshine", "Fubuki", "Drive Knight", "Puri-Puri Prisoner", "Sonic", "Watchdog Man", "Golden Sperm"], tags: ["Associação de Heróis", "Classe S", "Monstro", "Cyborg"] },
    { code: "STW", series: "Star Wars", energy: "The Force", characters: ["Luke Skywalker", "Darth Vader", "Yoda", "Obi-Wan Kenobi", "Emperor Palpatine", "Ahsoka Tano", "Anakin Skywalker", "Mace Windu", "Count Dooku", "Darth Maul", "Din Djarin (Mandalorian)", "Boba Fett", "Han Solo", "Princess Leia", "Rey Skywalker", "Kylo Ren", "Chewbacca", "Grand Inquisitor", "Revan", "Starkiller"], tags: ["Ordem Jedi", "Império Sith", "Mandaloriano", "A Força"] },
    { code: "BLE", series: "Bleach", energy: "Reiatsu", characters: ["Ichigo Kurosaki", "Rukia Kuchiki", "Renji Abarai", "Byakuya Kuchiki", "Sosuke Aizen", "Kisuke Urahara", "Yoruichi Shihoin", "Kenpachi Zaraki", "Toshiro Hitsugaya", "Yamamoto", "Kyoraku", "Ulquiorra", "Grimmjow", "Yhwach", "Uryu Ishida", "Orihime Inoue", "Gin Ichimaru", "Shinji Hirako", "Neliel", "Barragan"], tags: ["Shinigami", "Gotei 13", "Espada", "Quincy"] },
    { code: "HXH", series: "Hunter x Hunter", energy: "Nen", characters: ["Gon Freecss", "Killua Zoldyck", "Kurapika", "Leorio", "Hisoka Morow", "Chrollo Lucilfer", "Meruem", "Neferpitou", "Ging Freecss", "Netero", "Feitan", "Machi", "Illumi Zoldyck", "Silva Zoldyck", "Zeno Zoldyck", "Kaito", "Bisket Krueger", "Shaiapouf", "Youpi", "Knuckle"], tags: ["Hunter", "Nen", "Trupe Fantasma", "Zoldyck", "Formiga Quimera"] },
    { code: "FMA", series: "Fullmetal Alchemist", energy: "Alquimia", characters: ["Edward Elric", "Alphonse Elric", "Roy Mustang", "Riza Hawkeye", "Winry Rockbell", "Maes Hughes", "Armstrong", "Olivier Armstrong", "Ling Yao", "Greed", "Lust", "Envy", "Gluttony", "Wrath (Bradley)", "Pride", "Father", "Van Hohenheim", "Scar", "Kimblee", "Izumi Curtis"], tags: ["Alquimista do Estado", "Homúnculo", "Amestris"] },
    { code: "MHA", series: "Boku no Hero Academia", energy: "Quirk", characters: ["Izuku Midoriya", "Katsuki Bakugo", "Ochaco Uraraka", "Shoto Todoroki", "All Might", "Endeavor", "Hawks", "Aizawa", "Tomura Shigaraki", "All For One", "Dabi", "Himiko Toga", "Twice", "Mirio Togata", "Kirishima", "Iida", "Tokoyami", "Momo Yaoyorozu", "Overhaul", "Best Jeanist"], tags: ["UA High", "Pro Hero", "One For All", "Liga dos Vilões"] },
    { code: "OP", series: "One Piece", energy: "Haki", characters: ["Monkey D. Luffy", "Roronoa Zoro", "Nami", "Usopp", "Sanji", "Chopper", "Nico Robin", "Franky", "Brook", "Jinbe", "Shanks", "Gol D. Roger", "Whitebeard", "Kaido", "Big Mom", "Blackbeard", "Trafalgar Law", "Eustass Kid", "Ace", "Sabo"], tags: ["Chapéu de Palha", "Yonkou", "Marinha", "Revolucionário"] },
    { code: "SL", series: "Solo Leveling", energy: "Shadow Energy", characters: ["Sung Jinwoo", "Cha Hae-In", "Go Gun-Hee", "Thomas Andre", "Liu Zhigang", "Baek Yoonho", "Choi Jong-In", "Woo Jinchul", "Igris", "Beru", "Tusk", "Iron", "Greed", "Bellion", "Ashborn", "Sung Il-Hwan", "Goto Ryuji", "Yoo Jinho", "Baruka", "Kamish"], tags: ["Caçador Nível S", "Exército das Sombras", "Monarca"] },
    { code: "MVC", series: "Marvel vs Capcom", energy: "Technology", characters: ["Iron Man", "Captain America", "Thor", "Spider-Man", "Wolverine", "Ryu", "Chun-Li", "Dante", "Vergil", "Morrigan", "Venom", "Deadpool", "Doctor Doom", "Magneto", "Hulk", "Thanos", "Strider Hiryu", "Zero", "Akuma", "Phoenix Wright"], tags: ["Avengers", "Capcom Legends", "Multiverse", "Tech"] },
    { code: "DC", series: "DC Comics", energy: "Speed Force & Magic", characters: ["Batman", "Superman", "Wonder Woman", "The Flash", "Green Lantern", "Aquaman", "Cyborg", "Martian Manhunter", "Joker", "Harley Quinn", "Lex Luthor", "Darkseid", "Nightwing", "Red Hood", "Supergirl", "Shazam", "Doctor Fate", "Zatanna", "Deathstroke", "Poison Ivy"], tags: ["Justice League", "Bat-Family", "Kryptonian", "Apokolips"] },
    { code: "CYB", series: "Cyberpunk Legends", energy: "Neural Cybernetics", characters: ["V (Mercenary)", "Johnny Silverhand", "David Martinez", "Lucy (Netrunner)", "Rebecca", "Adam Smasher", "Vexor Cyberblade", "Judy Alvarez", "Panam Palmer", "Jackie Welles", "Rogue Amendiares", "Takemura", "Maine", "Dorio", "Kiwi", "Faraday", "T-Bug", "Viktor Vector", "Meredith Stout", "Alt Cunningham"], tags: ["Netrunner", "Augmented", "Mercenary", "Night City"] }
  ];

  let globalCounter = 100;

  seriesList.forEach(group => {
    group.characters.forEach((charName, index) => {
      globalCounter++;
      const rarityTiers = ["UR", "LR", "MR", "SSR", "SR", "R", "UC", "C"];
      let rarity = "C";
      if (index === 0) rarity = "MR";
      else if (index === 1) rarity = "LR";
      else if (index === 2) rarity = "UR";
      else if (index < 6) rarity = "SSR";
      else if (index < 11) rarity = "SR";
      else if (index < 16) rarity = "R";
      else rarity = "UC";

      const roles = ["DPS", "Tank", "Support", "Assassin", "Mage", "Sniper", "Berserker"];
      const elements = ["Fire", "Lightning", "Wind", "Earth", "Water", "Shadow", "Light"];
      
      const role = roles[index % roles.length];
      const element = elements[index % elements.length];
      
      const cardCode = `${group.code}-CHR-${rarity}-${String(index + 1).padStart(3, '0')}`;

      cards.push({
        id: `card_${group.code.toLowerCase()}_${index + 1}`,
        name: charName,
        card_id: cardCode,
        collection_id: group.code,
        series: group.series,
        rarity: rarity,
        role: role,
        gender: index % 2 === 0 ? "Male" : "Female",
        element: element,
        tags: group.tags,
        mag_source: group.energy,
        mag: 90 + (index * 6),
        attack: 110 + (index * 7),
        defense: 80 + (index * 5),
        speed: 95 + (index * 6),
        hp: 350 + (index * 25),
        image_url: "",
        img_oficial: "",
        img_custom: "",
        lore: `${charName} é um icônico personagem de ${group.series}. Domina ${group.energy} e luta nas arenas do DeckVerse.`,
        skills: [
          { name: `Habilidade Principal de ${charName}`, description: `Causa dano do tipo ${element} canalizando ${group.energy}.`, type: "Active" },
          { name: `Despertar Supremo`, description: `Aumenta ATQ e VEL em +35% durante 3 turnos.`, type: "Ultimate" }
        ],
        version: "Standard Form",
        created_date: new Date().toISOString()
      });
    });
  });

  return cards;
}

export function getAllExpandedCards() {
  return generateExpandedCards();
}
