// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Franchise Schemas & Universal Base Card Model (V9 Frozen)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Universal Base Card Model (Frozen Schema)
 * Base fields required or standard across all franchises and universes in DeckVerse OS.
 */
export const UNIVERSAL_SCHEMA = Object.freeze([
  Object.freeze({ key: "codigo", label: "Código da Carta / Card ID", type: "string", required: false }),
  Object.freeze({ key: "card_id", label: "Card ID Canônico", type: "string", required: false }),
  Object.freeze({ key: "name", label: "Nome do Personagem / Entidade", type: "string", required: true }),
  Object.freeze({ key: "nome_original", label: "Nome Original (Japonês / Nativo)", type: "string", required: false }),
  Object.freeze({ key: "race", label: "Raça / Espécie Base", type: "string", required: false }),
  Object.freeze({ key: "natures", label: "Afinidades Elementais / Natures", type: "array", required: false }),
  Object.freeze({ key: "organizacao", label: "Organização / Grupo / Equipe", type: "string", required: false }),
  Object.freeze({ key: "clan", label: "Clã / Linhagem / Família", type: "string", required: false }),
  Object.freeze({ key: "classe", label: "Classe Combatente", type: "string", required: false }),
  Object.freeze({ key: "origin", label: "Origem / Mundo de Origem", type: "string", required: false }),
  Object.freeze({ key: "titulo", label: "Título Honorífico / Alcunha", type: "string", required: false }),
  Object.freeze({ key: "tags", label: "Tags Múltiplas", type: "array", required: false }),
  Object.freeze({ key: "entity_type", label: "Tipo de Entidade (character | item | boss)", type: "string", required: false }),
  Object.freeze({ key: "collection_id", label: "Código de Coleção", type: "string", required: false }),
  Object.freeze({ key: "character_key", label: "Chave Única do Personagem", type: "string", required: false }),
  Object.freeze({ key: "form_id", label: "ID da Forma / Transformação", type: "string", required: false }),
  Object.freeze({ key: "form_label", label: "Rótulo da Forma (ex: Bankai, SSJ)", type: "string", required: false }),
  Object.freeze({ key: "elemento", label: "Elemento Primário", type: "string", required: false })
]);

/**
 * Mapeamento de Aliases para os Códigos de Franquia Canônicos V9 (3 letras)
 */
export const ALIAS_TO_V9 = Object.freeze({
  // Naruto
  NAR: "NRT", NARUTO: "NRT", BORUTO: "NRT", "COL-01-NRT": "NRT",
  // Bleach
  BLEACH: "BLC", "COL-01-BLC": "BLC",
  // Dragon Ball
  DBZ: "DRG", DRAGONBALL: "DRG", DRAGON_BALL: "DRG", "COL-01-DBZ": "DRG",
  // One Piece
  OP: "OPN", OPC: "OPN", ONEPIECE: "OPN", ONE_PIECE: "OPN", "COL-01-OP": "OPN",
  // Jujutsu Kaisen
  JUJUTSU: "JJK", JUJUTSU_KAISEN: "JJK", "COL-01-JJK": "JJK",
  // DC Comics
  DC: "DCC", DCCOMICS: "DCC", "COL-03-DC": "DCC",
  // Marvel
  MVC: "MRV", MARVEL: "MRV", "COL-03-MARVEL": "MRV",
  // Star Wars
  SW: "STW", STARWARS: "STW", STAR_WARS: "STW", "COL-03-SW": "STW",
  // Attack on Titan
  ATTACK_ON_TITAN: "AOT", SHINGEKI: "AOT", "COL-01-AOT": "AOT",
  // Demon Slayer
  DS: "KNY", DEMON_SLAYER: "KNY", KIMETSU: "KNY", "COL-01-DS": "KNY",
  // My Hero Academia
  BNHA: "MHA", MY_HERO: "MHA", "COL-01-MHA": "MHA",
  // Fullmetal Alchemist
  FULLMETAL: "FMA", "COL-01-FMA": "FMA",
  // Hunter x Hunter
  HUNTER: "HXH", HUNTER_X_HUNTER: "HXH", "COL-01-HXH": "HXH",
  // JoJo's Bizarre Adventure
  JJBA: "JJO", JOJO: "JJO", "COL-01-JJBA": "JJO",
  // Solo Leveling
  SOLO_LEVELING: "SLV", "COL-01-SLV": "SLV",
  // Cyberpunk 2077
  CYB: "CPK", CP77: "CPK", CYBERPUNK: "CPK", "COL-02-CP77": "CPK",
  // Legend of Zelda
  ZELDA: "ZLD", "COL-02-ZELDA": "ZLD",
  // League of Legends
  LEAGUE: "LOL", "COL-02-LOL": "LOL",
  // God of War
  GOD_OF_WAR: "GOW", "COL-02-GOW": "GOW",
  // Devil May Cry
  DEVIL_MAY_CRY: "DMC", "COL-02-DMC": "DMC",
  // Berserk
  BSK: "BRS", BERSERK: "BRS", "COL-01-BSK": "BRS",
  // Tokyo Ghoul
  TG: "TKG", TOKYO_GHOUL: "TKG", "COL-01-TXG": "TKG",
  // Fate
  FATE: "FST", "COL-01-FATE": "FST",
  // Genshin
  GENSHIN: "GNS", GEN: "GNS", "COL-02-GEN": "GNS",
  // Avatar
  ATLA: "ATL", AVATAR: "ATL", "COL-04-ATLA": "ATL", "COL-03-AVATAR": "ATL",
  // Invincible
  INV: "INV", INVENCIVEL: "INV", INVINCIBLE: "INV", "COL-04-INV": "INV", "COL-03-INV": "INV",
  // Arcane
  ARC: "ARC", ARCANE: "ARC", "COL-04-ARC": "ARC",
  // Ben 10
  BEN10: "BEN", BEN_10: "BEN", "COL-04-BEN10": "BEN",
  // Hazbin
  HAZBIN: "HZB", "COL-04-HAZBIN": "HZB",
  // Hora de Aventura
  AT: "ADV", HORA_DE_AVENTURA: "ADV", ADVENTURE_TIME: "ADV", "COL-04-AT": "ADV",
  // Castlevania
  CASTLEVANIA: "CST", "COL-04-CASTLEVANIA": "CST",
  // Mitologias & História
  EGY: "EGY", "COL-05-EGY": "EGY",
  GRK: "GRK", "COL-05-GRK": "GRK",
  JPN: "JPN", "COL-05-JPN": "JPN",
  POLYNESIAN: "POL", "COL-05-POLYNESIAN": "POL",
  MESO: "MSO", "COL-05-MESO": "MSO",
  NORSE: "NRS", "COL-05-NORSE": "NRS",
  ANTIQUITY: "ANT", "COL-06-ANTIQUITY": "ANT",
  REVOLUTIONS: "REV", "COL-06-REVOLUTIONS": "REV",
  ART: "ART", "COL-06-ART": "ART",
  FEUDAL: "FDL", "COL-06-FEUDAL": "FDL",
  // Multiverse / Default
  MULTIVERSE: "MULTI", "COL-00-MULTI": "MULTI"
});

/**
 * Mapeamento dos 66 Schemas Específicos por Franquia V9
 */
export const FRANCHISE_SCHEMAS = Object.freeze({
  NRT: Object.freeze([
    Object.freeze({ key: "elemento", label: "Elemento Chakra", type: "string" }),
    Object.freeze({ key: "kekkei_genkai", label: "Kekkei Genkai", type: "string" }),
    Object.freeze({ key: "bijuu", label: "Bijuu / Jinchuuriki", type: "string" }),
    Object.freeze({ key: "rank_ninja", label: "Rank Ninja (Genin, Jounin, Kage)", type: "string" }),
    Object.freeze({ key: "vila", label: "Vila Oculta", type: "string" })
  ]),
  BLC: Object.freeze([
    Object.freeze({ key: "tipo_espiritual", label: "Tipo Espiritual (Shinigami, Quincy, Hollow)", type: "string" }),
    Object.freeze({ key: "zanpakuto", label: "Zanpakutō", type: "string" }),
    Object.freeze({ key: "bankai", label: "Bankai / Liberação Final", type: "string" }),
    Object.freeze({ key: "divisao", label: "Esquadrão / Divisão", type: "string" })
  ]),
  DRG: Object.freeze([
    Object.freeze({ key: "raca_detalhe", label: "Linhagem Saiyajin / Raça", type: "string" }),
    Object.freeze({ key: "transformacao", label: "Nível de Transformação (SSJ, Ultra Instinto)", type: "string" }),
    Object.freeze({ key: "ki_tipo", label: "Tipo de Ki (Divino, Maligno, Comum)", type: "string" }),
    Object.freeze({ key: "afiliacao", label: "Universo / Facção (U7, Patrulha do Tempo)", type: "string" })
  ]),
  OPN: Object.freeze([
    Object.freeze({ key: "akuma_no_mi", label: "Akuma no Mi", type: "string" }),
    Object.freeze({ key: "haki", label: "Tipos de Haki", type: "string" }),
    Object.freeze({ key: "recompensa", label: "Recompensa / Bounty (Berries)", type: "string" }),
    Object.freeze({ key: "tripulacao", label: "Tripulação / Marinha / Frota", type: "string" })
  ]),
  JJK: Object.freeze([
    Object.freeze({ key: "tecnica_amaldicoada", label: "Técnica Inata / Amaldiçoada", type: "string" }),
    Object.freeze({ key: "grau", label: "Grau Jujutsu (Especial, 1º Grau)", type: "string" }),
    Object.freeze({ key: "cla_jujutsu", label: "Clã Jujutsu (Gojo, Zenin, Kamo)", type: "string" }),
    Object.freeze({ key: "tipo_jujutsu", label: "Expansão de Domínio / Barreira", type: "string" })
  ]),
  DCC: Object.freeze([
    Object.freeze({ key: "liga", label: "Equipe DC (Liga da Justiça, Titãs)", type: "string" }),
    Object.freeze({ key: "identidade_secreta", label: "Identidade Secreta", type: "string" }),
    Object.freeze({ key: "base_operacoes", label: "Base de Operações (Gotham, Metrópolis)", type: "string" }),
    Object.freeze({ key: "tipo_poder_dc", label: "Fonte do Poder (Meta-humano, Magia, Tech)", type: "string" })
  ]),
  MRV: Object.freeze([
    Object.freeze({ key: "equipe", label: "Equipe Marvel (Vingadores, X-Men)", type: "string" }),
    Object.freeze({ key: "identidade_secreta", label: "Identidade Secreta", type: "string" }),
    Object.freeze({ key: "origem_poder", label: "Origem (Mutante, Experimento, Cósmico)", type: "string" })
  ]),
  STW: Object.freeze([
    Object.freeze({ key: "afiliacao_sw", label: "Lado da Força / Afiliação (Jedi, Sith, Império)", type: "string" }),
    Object.freeze({ key: "forca", label: "Afinidade com a Força", type: "string" }),
    Object.freeze({ key: "especie_sw", label: "Espécie Galáctica", type: "string" })
  ]),
  AOT: Object.freeze([
    Object.freeze({ key: "tipo_tita", label: "Titã Original / Shifter", type: "string" }),
    Object.freeze({ key: "esquadrao", label: "Regimento (Reconhecimento, Guarda)", type: "string" }),
    Object.freeze({ key: "muralha_origem", label: "Origem (Paradis, Marley)", type: "string" })
  ]),
  KNY: Object.freeze([
    Object.freeze({ key: "respiracao_arte", label: "Estilo de Respiração / Ketsuijutsu", type: "string" }),
    Object.freeze({ key: "posto_kisatsutai", label: "Posto (Hashira, Tsukuguko, Oni)", type: "string" }),
    Object.freeze({ key: "demonio_tipo", label: "Kizuki / Tipo de Demônio", type: "string" })
  ]),
  MHA: Object.freeze([
    Object.freeze({ key: "individualidade", label: "Individualidade / Quirk", type: "string" }),
    Object.freeze({ key: "heroi_nome", label: "Nome de Herói / Vilão", type: "string" }),
    Object.freeze({ key: "turma_agencia", label: "Classe U.A. / Agência", type: "string" })
  ]),
  FMA: Object.freeze([
    Object.freeze({ key: "alquimia_especialidade", label: "Especialidade Alquímica", type: "string" }),
    Object.freeze({ key: "circulo_alquimico", label: "Círculo / Alquimia Transmutativa", type: "string" }),
    Object.freeze({ key: "homunculo_pecado", label: "Pecado Capital / Homúnculo", type: "string" })
  ]),
  HXH: Object.freeze([
    Object.freeze({ key: "tipo_nen", label: "Categoria de Nen (Intensificação, Materialização)", type: "string" }),
    Object.freeze({ key: "tecnica_hatsu", label: "Hatsu Especialista", type: "string" }),
    Object.freeze({ key: "licenca_hunter", label: "Tipo de Hunter", type: "string" })
  ]),
  JJO: Object.freeze([
    Object.freeze({ key: "stand_nome", label: "Nome do Stand / Hamon", type: "string" }),
    Object.freeze({ key: "stand_poder", label: "Habilidade do Stand", type: "string" }),
    Object.freeze({ key: "estilo_luta", label: "Estilo de Luta (Stand, Hamon, Spin)", type: "string" })
  ]),
  SLV: Object.freeze([
    Object.freeze({ key: "classe_cacador", label: "Classe de Caçador (Mago, Assassino)", type: "string" }),
    Object.freeze({ key: "rank_cacador", label: "Rank (S-Rank, Monarca, Nacional)", type: "string" }),
    Object.freeze({ key: "monarca_titulo", label: "Título de Monarca / Sombra", type: "string" })
  ]),
  CPK: Object.freeze([
    Object.freeze({ key: "cyberware", label: "Implantes Cyberware Principais", type: "string" }),
    Object.freeze({ key: "classe_nightcity", label: "Classe (Solo, Netrunner, Techie)", type: "string" }),
    Object.freeze({ key: "distrito", label: "Afiliação de Gangue / Corporação", type: "string" })
  ]),
  ZLD: Object.freeze([
    Object.freeze({ key: "raca_hyrule", label: "Raça de Hyrule (Hylian, Goron, Zora)", type: "string" }),
    Object.freeze({ key: "artefato_triforce", label: "Fragmento da Triforce", type: "string" }),
    Object.freeze({ key: "reino_origem", label: "Era / Reino de Origem", type: "string" })
  ]),
  LOL: Object.freeze([
    Object.freeze({ key: "regiao_runeterra", label: "Região de Runeterra (Ionia, Noxus)", type: "string" }),
    Object.freeze({ key: "recurso_magia", label: "Recurso (Mana, Energia, Fúria)", type: "string" }),
    Object.freeze({ key: "funcao_rota", label: "Função / Rota (Mid, Top, Jungle)", type: "string" })
  ]),
  GOW: Object.freeze([
    Object.freeze({ key: "panteao", label: "Panteão (Grego, Nórdico)", type: "string" }),
    Object.freeze({ key: "arma_principal", label: "Arma Emblemática", type: "string" }),
    Object.freeze({ key: "reino_norse", label: "Reino do Yggdrasil", type: "string" })
  ]),
  DMC: Object.freeze([
    Object.freeze({ key: "devil_trigger", label: "Forma Devil Trigger", type: "string" }),
    Object.freeze({ key: "estilo_estilizado", label: "Estilo (Swordmaster, Gunslinger)", type: "string" }),
    Object.freeze({ key: "arma_demoníaca", label: "Arma Demoníaca Principal", type: "string" })
  ]),
  BRS: Object.freeze([
    Object.freeze({ key: "bando_afiliacao", label: "Afiliação (Bando do Falcão, Apóstolo)", type: "string" }),
    Object.freeze({ key: "marca_sacrificio", label: "Marca do Sacrifício / Behelit", type: "string" }),
    Object.freeze({ key: "equipamento_maldito", label: "Equipamento / Armadura Berserker", type: "string" })
  ]),
  CDZ: Object.freeze([
    Object.freeze({ key: "constelacao", label: "Constelação Guardiã", type: "string" }),
    Object.freeze({ key: "armadura_nivel", label: "Nível da Armadura (Bronze, Ouro, Divina)", type: "string" }),
    Object.freeze({ key: "cosmo_tipo", label: "Tipo de Cosmo / Sétimo Sentido", type: "string" })
  ]),
  CSM: Object.freeze([
    Object.freeze({ key: "demonio_contrato", label: "Demônio do Contrato / Híbrido", type: "string" }),
    Object.freeze({ key: "divisao_publica", label: "Divisão de Segurança Pública", type: "string" }),
    Object.freeze({ key: "sacrificio_requerido", label: "Preço do Contrato", type: "string" })
  ]),
  CLR: Object.freeze([
    Object.freeze({ key: "corpo_lanterna", label: "Tropa dos Lanternas (Verde, Vermelho)", type: "string" }),
    Object.freeze({ key: "entidade_emocional", label: "Entidade Emocional", type: "string" }),
    Object.freeze({ key: "setor_espacial", label: "Setor Espacial", type: "string" })
  ]),
  DKS: Object.freeze([
    Object.freeze({ key: "pacto_covenant", label: "Pacto / Covenant", type: "string" }),
    Object.freeze({ key: "alma_boss", label: "Lord Soul / Alma Especial", type: "string" }),
    Object.freeze({ key: "fogueira_origem", label: "Local de Origem", type: "string" })
  ]),
  FTL: Object.freeze([
    Object.freeze({ key: "magia_fairytail", label: "Tipo de Magia (Dragon Slayer, Maker)", type: "string" }),
    Object.freeze({ key: "membro_guilda", label: "Guilda (Fairy Tail, Sabertooth)", type: "string" }),
    Object.freeze({ key: "classe_s", label: "Mago Classe S", type: "string" })
  ]),
  FST: Object.freeze([
    Object.freeze({ key: "classe_servo", label: "Classe de Servo (Saber, Archer, Caster)", type: "string" }),
    Object.freeze({ key: "fantasma_nobre", label: "Noble Phantasm", type: "string" }),
    Object.freeze({ key: "mestre_faccao", label: "Guerra do Santo Graal / Facção", type: "string" })
  ]),
  GCH: Object.freeze([
    Object.freeze({ key: "visão_elemento", label: "Visão Elemental (Anemo, Geo, Electro)", type: "string" }),
    Object.freeze({ key: "nacao_teyvat", label: "Nação de Teyvat (Mondstadt, Liyue)", type: "string" }),
    Object.freeze({ key: "constelacao_genshin", label: "Constelação", type: "string" })
  ]),
  GNS: Object.freeze([
    Object.freeze({ key: "elemento_teyvat", label: "Elemento Teyvat", type: "string" }),
    Object.freeze({ key: "regiao_genshin", label: "Região de Origem", type: "string" }),
    Object.freeze({ key: "arma_tipo", label: "Tipo de Arma (Espada, Catalisador)", type: "string" })
  ]),
  GOH: Object.freeze([
    Object.freeze({ key: "charyeok", label: "Poder Emprestado / Charyeok", type: "string" }),
    Object.freeze({ key: "arte_marcial", label: "Estilo Marcial (Taekwondo Re-Renewable)", type: "string" }),
    Object.freeze({ key: "status_deus", label: "Status (Deus, Humano, Demônio)", type: "string" })
  ]),
  HLS: Object.freeze([
    Object.freeze({ key: "restricao_nivel", label: "Nível de Liberação do Selo Alucard", type: "string" }),
    Object.freeze({ key: "organizacao_vampiro", label: "Organização (Hellsing, Iscariotes)", type: "string" }),
    Object.freeze({ key: "tipo_vampiro", label: "Vampiro Verdadeiro / Ghoul", type: "string" })
  ]),
  INV: Object.freeze([
    Object.freeze({ key: "raca_viltrumita", label: "Raça (Viltrumita, Humano, Híbrido)", type: "string" }),
    Object.freeze({ key: "equipe_invincible", label: "Guardiões do Globo / Facção", type: "string" }),
    Object.freeze({ key: "nivel_ameaca", label: "Nível de Ameaça Planetária", type: "string" })
  ]),
  KJ8: Object.freeze([
    Object.freeze({ key: "kaiju_numero", label: "Identificador Kaiju (Kaiju No. 8)", type: "string" }),
    Object.freeze({ key: "fortitude_nivel", label: "Nível de Fortitude", type: "string" }),
    Object.freeze({ key: "divisao_defesa", label: "Divisão das Forças de Defesa", type: "string" })
  ]),
  KNG: Object.freeze([
    Object.freeze({ key: "estatuto_nobre", label: "Estatuto Social / Reinos", type: "string" }),
    Object.freeze({ key: "exercito_unidade", label: "Unidade Militar", type: "string" }),
    Object.freeze({ key: "estrategia_nivel", label: "Grau Estratégico", type: "string" })
  ]),
  KNS: Object.freeze([
    Object.freeze({ key: "estilo_espada", label: "Estilo de Kenjutsu", type: "string" }),
    Object.freeze({ key: "fase_historica", label: "Fase Histórica / Era Meiji", type: "string" }),
    Object.freeze({ key: "afiliacao_samurai", label: "Grupo / Hitokiri", type: "string" })
  ]),
  MOB: Object.freeze([
    Object.freeze({ key: "percentual_estresse", label: "Progresso do Estresse (100% / ???%)", type: "string" }),
    Object.freeze({ key: "tecnica_esper", label: "Poder Esper (Telecinese, Exorcismo)", type: "string" }),
    Object.freeze({ key: "organizacao_claw", label: "Organização Garra / Consulta Spirit", type: "string" })
  ]),
  MLB: Object.freeze([
    Object.freeze({ key: "kwami", label: "Kwami Guardião", type: "string" }),
    Object.freeze({ key: "miraculous_item", label: "Objeto Miraculous", type: "string" }),
    Object.freeze({ key: "poder_conceito", label: "Conceito (Criação, Destruição)", type: "string" })
  ]),
  MKB: Object.freeze([
    Object.freeze({ key: "estilo_kombat", label: "Estilo Fatal / Reino (Earthrealm, Outworld)", type: "string" }),
    Object.freeze({ key: "variacao_luta", label: "Variação de Combate", type: "string" }),
    Object.freeze({ key: "faccao_mk", label: "Lin Kuei, Shirai Ryu, Special Forces", type: "string" })
  ]),
  MRX: Object.freeze([
    Object.freeze({ key: "piloto_eva", label: "Piloto Evangelion / Unidade EVA", type: "string" }),
    Object.freeze({ key: "campo_at", label: "Intensidade do Campo A.T.", type: "string" }),
    Object.freeze({ key: "anjo_ordem", label: "Número do Anjo / NERV", type: "string" })
  ]),
  NNT: Object.freeze([
    Object.freeze({ key: "pecado_mandamento", label: "Pecado Capital / 10 Mandamentos", type: "string" }),
    Object.freeze({ key: "tesouro_sagrado", label: "Tesouro Sagrado", type: "string" }),
    Object.freeze({ key: "clan_nnt", label: "Clã (Demoníaco, das Fadas, dos Gigantes)", type: "string" })
  ]),
  OPM: Object.freeze([
    Object.freeze({ key: "classe_associacao", label: "Classe de Herói (S-Class, A-Class)", type: "string" }),
    Object.freeze({ key: "rank_opm", label: "Rank Numérico na Associação", type: "string" }),
    Object.freeze({ key: "nivel_ameaca_opm", label: "Nível de Ameaça (God, Dragon, Demon)", type: "string" })
  ]),
  BH6: Object.freeze([
    Object.freeze({ key: "armadura_tech", label: "Especialidade Tecnológica", type: "string" }),
    Object.freeze({ key: "papel_big6", label: "Membro Big Hero 6 / San Fransokyo", type: "string" }),
    Object.freeze({ key: "modulo_combate", label: "Módulo Microbot / Chip", type: "string" })
  ]),
  SNV: Object.freeze([
    Object.freeze({ key: "pantheon_deus", label: "Lado (Deus vs Humano)", type: "string" }),
    Object.freeze({ key: "volund_valkyria", label: "Völundr / Valquíria Parceira", type: "string" }),
    Object.freeze({ key: "tecnica_divina", label: "Técnica Definitiva", type: "string" })
  ]),
  RSE: Object.freeze([
    Object.freeze({ key: "virus_agente", label: "Patógeno (T-Virus, Plaga, Mold)", type: "string" }),
    Object.freeze({ key: "organizacao_bioweapon", label: "Umbrella / BSAA / Tricell", type: "string" }),
    Object.freeze({ key: "mutacao_estagio", label: "Estágio de Mutação", type: "string" })
  ]),
  RRK: Object.freeze([
    Object.freeze({ key: "estilo_sakabatou", label: "Toten Ryu / Hiten Mitsurugi", type: "string" }),
    Object.freeze({ key: "afiliacao_bakumatsu", label: "Ishin Shishi / Shinsengumi", type: "string" }),
    Object.freeze({ key: "tecnica_secreta", label: "Técnica Secreta", type: "string" })
  ]),
  SOC: Object.freeze([
    Object.freeze({ key: "arma_soul", label: "Soul Edge / Soul Calibur", type: "string" }),
    Object.freeze({ key: "estilo_espada_soc", label: "Estilo de Esgrima Marcial", type: "string" }),
    Object.freeze({ key: "origem_nacao", label: "Nação / Império de Origem", type: "string" })
  ]),
  SKG: Object.freeze([
    Object.freeze({ key: "oversoul_tipo", label: "Tipo de Over Soul", type: "string" }),
    Object.freeze({ key: "espirito_guardiao", label: "Espírito Guardião (Amidamaru, etc)", type: "string" }),
    Object.freeze({ key: "furyoku_nivel", label: "Nível de Furyoku", type: "string" })
  ]),
  SNC: Object.freeze([
    Object.freeze({ key: "transformacao_chaos", label: "Forma Chaos Super", type: "string" }),
    Object.freeze({ key: "esmeralda_caos", label: "Conexão com Esmeraldas do Caos", type: "string" }),
    Object.freeze({ key: "velocidade_mach", label: "Velocidade Máxima Requerida", type: "string" })
  ]),
  SU: Object.freeze([
    Object.freeze({ key: "pedra_gem", label: "Pedra Gem (Quartz, Fusion)", type: "string" }),
    Object.freeze({ key: "arma_gem", label: "Arma Invocada", type: "string" }),
    Object.freeze({ key: "local_gem", label: "Posição da Gem no Corpo", type: "string" })
  ]),
  STF: Object.freeze([
    Object.freeze({ key: "estilo_satsui", label: "Estilo de Combate (Ansatsuken, Psycho Power)", type: "string" }),
    Object.freeze({ key: "afiliacao_shadaloo", label: "Shadaloo / Interpol / World Warrior", type: "string" }),
    Object.freeze({ key: "golpe_especial", label: "Super / Ultra Combo Signature", type: "string" })
  ]),
  MRO: Object.freeze([
    Object.freeze({ key: "power_up_item", label: "Power-up Emblemático (Super Mushroom, Star)", type: "string" }),
    Object.freeze({ key: "reino_cogumelo", label: "Mushroom Kingdom / Bowser Troop", type: "string" }),
    Object.freeze({ key: "papel_mario", label: "Papel (Herói, Vilão, Princesa)", type: "string" })
  ]),
  TKN: Object.freeze([
    Object.freeze({ key: "gene_demoníaco", label: "Devil Gene / Mishima Bloodline", type: "string" }),
    Object.freeze({ key: "estilo_tekken", label: "Estilo Marcial Autêntico", type: "string" }),
    Object.freeze({ key: "zaibatsu_afiliacao", label: "Mishima Zaibatsu / G Corp", type: "string" })
  ]),
  TBY: Object.freeze([
    Object.freeze({ key: "corpo_zero", label: "Setor / Facção de The Boys", type: "string" }),
    Object.freeze({ key: "composto_v", label: "Nível de Composto V", type: "string" }),
    Object.freeze({ key: "equipe_vought", label: "The Seven / Payback / The Boys", type: "string" })
  ]),
  TNY: Object.freeze([
    Object.freeze({ key: "faccao_cartoon", label: "Facção Toon / Desenho Animado", type: "string" }),
    Object.freeze({ key: "habilidade_fisica", label: "Física de Desenho Animado", type: "string" }),
    Object.freeze({ key: "ferramenta_toon", label: "Objeto Acme Signature", type: "string" })
  ]),
  WTC: Object.freeze([
    Object.freeze({ key: "escola_bruxo", label: "Escola de Bruxo (Lobo, Gato, Urso)", type: "string" }),
    Object.freeze({ key: "sinal_magico", label: "Sinal Mágico (Igni, Quen, Axii)", type: "string" }),
    Object.freeze({ key: "mutacao_elixir", label: "Mutação / Ervas Medicinais", type: "string" })
  ]),
  TKG: Object.freeze([
    Object.freeze({ key: "kagune_tipo", label: "Tipo de Kagune (Rinkaku, Ukaku, Koukaku)", type: "string" }),
    Object.freeze({ key: "kakuja_estagio", label: "Estágio Kakuja", type: "string" }),
    Object.freeze({ key: "distrito_tokyo", label: "Distrito de Tokyo / CCG", type: "string" })
  ]),
  TMR: Object.freeze([
    Object.freeze({ key: "artefato_reliquia", label: "Relíquia Arqueológica", type: "string" }),
    Object.freeze({ key: "expedicao_local", label: "Tumba / Templo de Origem", type: "string" }),
    Object.freeze({ key: "equipamento_survivor", label: "Equipamento de Sobrevivência", type: "string" })
  ]),
  TGA: Object.freeze([
    Object.freeze({ key: "mestre_yu_gi_oh", label: "Invocação Principal (Fusão, Synchro, Xyz)", type: "string" }),
    Object.freeze({ key: "atributo_tga", label: "Atributo Duelista (LIGHT, DARK, DIVINE)", type: "string" }),
    Object.freeze({ key: "deck_archetype", label: "Arquétipo de Deck", type: "string" })
  ]),
  UDT: Object.freeze([
    Object.freeze({ key: "alma_cor", label: "Cor de Alma / Determinação", type: "string" }),
    Object.freeze({ key: "rota_undertale", label: "Rota (Pacifista, Genocida, Neutra)", type: "string" }),
    Object.freeze({ key: "subterraneo_zona", label: "Região do Subterrâneo", type: "string" })
  ]),
  VGB: Object.freeze([
    Object.freeze({ key: "filosofia_samurai", label: "Caminho da Espada / Filosofia", type: "string" }),
    Object.freeze({ key: "duelo_famoso", label: "Duelo Histórico Emblemático", type: "string" }),
    Object.freeze({ key: "provincia_japan", label: "Província do Japão Feudal", type: "string" })
  ]),
  VLR: Object.freeze([
    Object.freeze({ key: "funcao_agente", label: "Função de Agente (Duelista, Controlador)", type: "string" }),
    Object.freeze({ key: "habilidade_assinatura", label: "Habilidade Assinatura / Ultimate", type: "string" }),
    Object.freeze({ key: "pais_origem_vlr", label: "País de Origem do Agente", type: "string" })
  ]),
  BAK: Object.freeze([
    Object.freeze({ key: "estilo_marcial_bak", label: "Arte Marcial Subterrânea", type: "string" }),
    Object.freeze({ key: "postura_demonio", label: "Musculatura das Costas do Demônio", type: "string" }),
    Object.freeze({ key: "arena_tokyo", label: "Arena Subterrânea / Torneio", type: "string" })
  ]),
  BEN: Object.freeze([
    Object.freeze({ key: "especie_omnitrix", label: "Alien do Omnitrix / Raça", type: "string" }),
    Object.freeze({ key: "poder_omnitrix", label: "Habilidade Extraterrestre", type: "string" }),
    Object.freeze({ key: "planeta_natal", label: "Planeta de Origem", type: "string" })
  ]),
  CAS: Object.freeze([
    Object.freeze({ key: "chicote_sagrado", label: "Arma Sagrada / Chicote Vampire Killer", type: "string" }),
    Object.freeze({ key: "magia_das_trevas", label: "Poder de Castlevania / Alucard", type: "string" }),
    Object.freeze({ key: "linhagem_belmont", label: "Linhagem (Belmont, Alucard, Dracula)", type: "string" })
  ]),
  DDD: Object.freeze([
    Object.freeze({ key: "paramount_war", label: "Nível de Poder DDD", type: "string" }),
    Object.freeze({ key: "faccao_ddd", label: "Facção no Dungeons & Dragons", type: "string" }),
    Object.freeze({ key: "reino_ddd", label: "Reino Fantástico", type: "string" })
  ]),
  MULTI: Object.freeze([
    Object.freeze({ key: "universo_origem", label: "Universo de Origem", type: "string" }),
    Object.freeze({ key: "conceito_multiverso", label: "Conceito Multiversal", type: "string" })
  ])
});

// Congela o objeto FRANCHISE_SCHEMAS para garantir imutabilidade estrita
Object.freeze(FRANCHISE_SCHEMAS);

/**
 * Resolve qualquer alias, prefixo COL-0X ou string de coleção para o código canônico V9 (3 letras).
 */
export function resolveSchemaCode(collectionId = "") {
  if (typeof collectionId !== "string" || !collectionId.trim()) {
    return "MULTI";
  }

  const clean = collectionId.trim().toUpperCase();

  if (FRANCHISE_SCHEMAS[clean]) {
    return clean;
  }

  if (ALIAS_TO_V9[clean]) {
    return ALIAS_TO_V9[clean];
  }

  // Tenta extrair a parte final após hífens se for COL-01-NRT
  const parts = clean.split("-");
  const lastPart = parts[parts.length - 1];
  if (FRANCHISE_SCHEMAS[lastPart]) {
    return lastPart;
  }
  if (ALIAS_TO_V9[lastPart]) {
    return ALIAS_TO_V9[lastPart];
  }

  // Busca por contendo na chave do alias
  for (const [alias, canonical] of Object.entries(ALIAS_TO_V9)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return canonical;
    }
  }

  return "MULTI";
}

/**
 * Retorna os campos específicos da franquia.
 */
export function getFranchiseSchema(collectionId = "") {
  const code = resolveSchemaCode(collectionId);
  return FRANCHISE_SCHEMAS[code] || FRANCHISE_SCHEMAS.MULTI;
}

/**
 * Retorna todos os campos (Universal + Franquia) para um dado código.
 */
export function getAllSchemaFields(collectionId = "") {
  const franchise = getFranchiseSchema(collectionId);
  return [...UNIVERSAL_SCHEMA, ...franchise];
}

/**
 * Retorna a lista de todos os 66 códigos de franquias registrados.
 */
export function listFranchiseSchemaCodes() {
  return Object.keys(FRANCHISE_SCHEMAS);
}

/**
 * Verifica se um código possui schema registrado de franquia.
 */
export function hasFranchiseSchema(collectionId = "") {
  const code = resolveSchemaCode(collectionId);
  return code !== "MULTI" || collectionId.toUpperCase().includes("MULTI");
}

/**
 * Valida um objeto input contra o Universal Schema + Franchise Schema.
 * Modo 'soft' (padrão): Não lança erros fatais se dados legados estiverem parciais; preenche defaults e gera warnings.
 * Modo 'strict': Exige campos obrigatórios rigorosamente.
 */
export function validateAgainstSchema(input = {}, options = { mode: "soft" }) {
  const mode = options?.mode || "soft";
  const errors = [];
  const warnings = [];

  if (!input || typeof input !== "object") {
    return {
      ok: false,
      data: null,
      errors: ["Payload inválido (não é um objeto)."],
      warnings: [],
      schema_code: "MULTI",
      universal_keys: UNIVERSAL_SCHEMA.map(f => f.key),
      franchise_keys: [],
      mode
    };
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    errors.push("Nome da carta é obrigatório.");
  }

  let collection_id = typeof input.collection_id === "string" ? input.collection_id.trim() : "";
  if (!collection_id) {
    collection_id = "MULTIVERSE";
    if (mode === "strict") {
      errors.push("Código de coleção (collection_id) é obrigatório no modo strict.");
    } else {
      warnings.push("Coleção ausente, atribuída automaticamente como MULTIVERSE.");
    }
  }

  const schema_code = resolveSchemaCode(collection_id);
  const franchiseFields = getFranchiseSchema(schema_code);
  const franchise_keys = franchiseFields.map(f => f.key);
  const universal_keys = UNIVERSAL_SCHEMA.map(f => f.key);

  const franchise_fields = {};

  // Preenche/valida campos específicos da franquia se presentes no input ou input.franchise_fields
  franchiseFields.forEach(field => {
    const key = field.key;
    let val = undefined;

    if (input.franchise_fields && input.franchise_fields[key] !== undefined) {
      val = input.franchise_fields[key];
    } else if (input[key] !== undefined) {
      val = input[key];
    }

    if (val !== undefined && val !== null && val !== "") {
      franchise_fields[key] = val;
    } else if (field.required) {
      if (mode === "strict") {
        errors.push(`Campo de franquia obrigatório ausente: "${field.label || key}"`);
      } else {
        warnings.push(`Campo específico da franquia (${schema_code}) "${key}" não foi fornecido.`);
      }
    }
  });

  const data = {
    ...input,
    name,
    collection_id,
    schema_code,
    franchise_fields,
    // Espalha franchise_fields no root para retrocompatibilidade com a UI existente
    ...franchise_fields
  };

  return {
    ok: errors.length === 0,
    data,
    errors,
    warnings,
    schema_code,
    universal_keys,
    franchise_keys,
    mode
  };
}

export default {
  UNIVERSAL_SCHEMA,
  FRANCHISE_SCHEMAS,
  ALIAS_TO_V9,
  resolveSchemaCode,
  getFranchiseSchema,
  getAllSchemaFields,
  listFranchiseSchemaCodes,
  hasFranchiseSchema,
  validateAgainstSchema
};
