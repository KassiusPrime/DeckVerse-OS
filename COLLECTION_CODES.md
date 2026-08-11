# 📦 DeckVerse OS — Tabela de Códigos de Coleções Canônicos e Aliases Legados

Este documento especifica a padronização e validação dos **86 Códigos de Coleção Canônicos** do DeckVerse OS, além da resolução automática de **Aliases Legados**.

---

## 🚀 Como Executar a Validação Local

Você pode rodar o validador de códigos de coleção no ambiente local com o comando:

```bash
npm run validate:codes
```

Para rodar a suíte completa de CI (Validação de Códigos + Build):

```bash
npm run ci
```

---

## 🎯 Aliases Legados & Resolução Canônica

O sistema resolve automaticamente códigos legados/curtos e aliases full-code para seus equivalentes canônicos:

### 🔄 Aliases de Código Completo Legado (`LEGACY_FULL_CODE_ALIASES`)

| Alias Legado Full-Code | Código Canônico | Nome da Franquia |
|---|---|---|
| `COL-01-SLV` | `COL-01-SL` | Solo Leveling |
| `COL-01-BER` | `COL-01-BSK` | Berserk |
| `COL-01-JOJO` | `COL-01-JJBA` | JoJo's Bizarre Adventure |
| `COL-02-ZELDA` | `COL-02-ZLD` | The Legend of Zelda |
| `COL-02-CP77` | `COL-02-CP` | Cyberpunk 2077 |
| `COL-03-SW` | `COL-03-SWR` | Star Wars |
| `COL-03-MARVEL` | `COL-03-MAR` | Marvel Universe |

### 🔀 Aliases Curtos / Prefixos (`SHORT_ALIASES`)

| Alias Curto | Código Canônico | Nome da Coleção |
|---|---|---|
| `NAR` / `NRT` | `COL-01-NRT` | Naruto / Boruto |
| `OPC` / `OP` | `COL-01-OP` | One Piece |
| `DBZ` | `COL-01-DBZ` | Dragon Ball Z |
| `AOT` | `COL-01-AOT` | Attack on Titan |
| `JJK` | `COL-01-JJK` | Jujutsu Kaisen |
| `BLC` | `COL-01-BLC` | Bleach |
| `HXH` | `COL-01-HXH` | Hunter x Hunter |
| `SLV` / `SL` | `COL-01-SL` | Solo Leveling |
| `JJBA` / `JOJO` | `COL-01-JJBA` | JoJo's Bizarre Adventure |
| `BSK` / `BER` | `COL-01-BSK` | Berserk |
| `CYB` / `CP77` / `CP` | `COL-02-CP` | Cyberpunk 2077 |
| `MVC` / `MAR` / `MARVEL` | `COL-03-MAR` | Marvel Universe |
| `DC` | `COL-03-DC` | DC Comics Universe |
| `SW` / `SWR` | `COL-03-SWR` | Star Wars |
| `MULTIVERSE` | `COL-00-MULTI` | Multiverso Geral |

---

## 📋 Lista dos 86 Códigos Canônicos

### 🎎 Anime, Mangá & Webtoons (`COL-01`)
1. `COL-01-AOT` — Attack on Titan
2. `COL-01-BCL` — Black Clover
3. `COL-01-BLC` — Bleach
4. `COL-01-BSK` — Berserk
5. `COL-01-CG` — Code Geass
6. `COL-01-CSM` — Chainsaw Man
7. `COL-01-DBZ` — Dragon Ball Z
8. `COL-01-DN` — Death Note
9. `COL-01-DS` — Demon Slayer
10. `COL-01-EVA` — Neon Genesis Evangelion
11. `COL-01-FATE` — Fate Series
12. `COL-01-FMA` — Fullmetal Alchemist
13. `COL-01-HXH` — Hunter x Hunter
14. `COL-01-JJBA` — JoJo's Bizarre Adventure
15. `COL-01-JJK` — Jujutsu Kaisen
16. `COL-01-MHA` — My Hero Academia
17. `COL-01-NRT` — Naruto / Boruto
18. `COL-01-OP` — One Piece
19. `COL-01-OPM` — One Punch Man
20. `COL-01-SAO` — Sword Art Online
21. `COL-01-SL` — Solo Leveling
22. `COL-01-SS` — Saint Seiya
23. `COL-01-TG` — Tokyo Ghoul
24. `COL-01-TOG` — Tower of God
25. `COL-01-TXG` — Tokyo Ghoul (Alt)
26. `COL-01-VS` — Vinland Saga
27. `COL-01-YYH` — Yu Yu Hakusho

### 🎮 Jogos & Sci-Fi (`COL-02`)
28. `COL-02-BB` — Bloodborne
29. `COL-02-CP` — Cyberpunk 2077
30. `COL-02-DMC` — Devil May Cry
31. `COL-02-DOTA` — Dota 2
32. `COL-02-DS` — Dark Souls
33. `COL-02-EGD` — Elden Ring / Dark Souls
34. `COL-02-ER` — Elden Ring
35. `COL-02-FF` — Final Fantasy
36. `COL-02-FO` — Fallout
37. `COL-02-GEN` — Genshin Impact
38. `COL-02-GOW` — God of War
39. `COL-02-HALO` — Halo
40. `COL-02-HSR` — Honkai: Star Rail
41. `COL-02-LOL` — League of Legends
42. `COL-02-ME` — Mass Effect
43. `COL-02-MGS` — Metal Gear Solid
44. `COL-02-MK` — Mortal Kombat
45. `COL-02-OVER` — Overwatch
46. `COL-02-PKM` — Pokémon
47. `COL-02-RE` — Resident Evil
48. `COL-02-SC` — StarCraft
49. `COL-02-SKR` — The Elder Scrolls V: Skyrim
50. `COL-02-TLOU` — The Last of Us
51. `COL-02-WIT` — The Witcher
52. `COL-02-WOW` — World of Warcraft
53. `COL-02-ZLD` — The Legend of Zelda

### 🌌 Cinema, HQs & Pop Culture (`COL-03`)
54. `COL-03-40K` — Warhammer 40,000
55. `COL-03-AVATAR` — Avatar (Cinema)
56. `COL-03-BOYS` — The Boys
57. `COL-03-CPT` — Cthulhu Mythos
58. `COL-03-DC` — DC Comics Universe
59. `COL-03-DND` — Dungeons & Dragons
60. `COL-03-DUNE` — Dune
61. `COL-03-GOT` — Game of Thrones
62. `COL-03-HP` — Harry Potter
63. `COL-03-INV` — Invincible
64. `COL-03-LOTR` — Lord of the Rings
65. `COL-03-MAR` — Marvel Comics Universe
66. `COL-03-MATRIX` — The Matrix
67. `COL-03-PR` — Power Rangers
68. `COL-03-SCP` — SCP Foundation
69. `COL-03-ST` — Stranger Things
70. `COL-03-SWR` — Star Wars
71. `COL-03-TF` — Transformers
72. `COL-03-TMNT` — Teenage Mutant Ninja Turtles

### 📺 Animações Ocid. & Séries (`COL-04`)
73. `COL-04-ARC` — Arcane
74. `COL-04-AT` — Hora de Aventura
75. `COL-04-ATLA` — Avatar: O Último Mestre do Ar
76. `COL-04-BEN10` — Ben 10
77. `COL-04-CASTLEVANIA` — Castlevania
78. `COL-04-HAZBIN` — Hazbin Hotel
79. `COL-04-INV` — Invencível (Animação)

### 🏛️ Mitologias (`COL-05`)
80. `COL-05-EGY` — Mitologia Egípcia
81. `COL-05-GRK` — Mitologia Grega
82. `COL-05-JPN` — Mitologia Japonesa
83. `COL-05-MESO` — Mitologia Mesopotâmica
84. `COL-05-NORSE` — Mitologia Nórdica
85. `COL-05-POLYNESIAN` — Mitologia Maori & Polinésia

### 📜 Históricos & Realidade (`COL-06`)
86. `COL-06-ANTIQUITY` — Antiguidade Clássica
87. `COL-06-ART` — Mestres da Arte & Ciência
88. `COL-06-FEUDAL` — Japão Feudal & Samurai
89. `COL-06-REVOLUTIONS` — Era das Revoluções

### 🌀 Multiverso (`COL-00`)
90. `COL-00-MULTI` — Multiverso DeckVerse
