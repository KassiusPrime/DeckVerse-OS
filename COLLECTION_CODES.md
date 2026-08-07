# 📦 DeckVerse OS — Tabela de Códigos de Coleções Canônicos e Aliases Legados

Este documento especifica a padronização e validação dos **60 Códigos de Coleção Canônicos** do DeckVerse OS, além da resolução automática de **Aliases Legados**.

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

O sistema resolve automaticamente códigos legados/curtos para seus equivalentes canônicos em todas as rotas de importação, Gacha e Data Quality Engine:

| Alias Legado | Código Canônico | Nome da Coleção / Franquia |
|---|---|---|
| `NAR` / `NRT` | `COL-01-NRT` | Naruto / Boruto |
| `OPC` / `OP` | `COL-01-OP` | One Piece |
| `DBZ` | `COL-01-DBZ` | Dragon Ball |
| `AOT` | `COL-01-AOT` | Attack on Titan |
| `JJK` | `COL-01-JJK` | Jujutsu Kaisen |
| `BLC` | `COL-01-BLC` | Bleach |
| `HXH` | `COL-01-HXH` | Hunter x Hunter |
| `SLV` | `COL-01-SLV` | Solo Leveling |
| `JJBA` | `COL-01-JJBA` | JoJo's Bizarre Adventure |
| `BSK` | `COL-01-BSK` | Berserk |
| `CYB` / `CP77` | `COL-02-CP77` | Cyberpunk 2077 / Edgerunners |
| `MVC` | `COL-03-MARVEL` | Marvel Universe / Capcom |
| `DC` | `COL-03-DC` | DC Comics Universe |
| `SW` | `COL-03-SW` | Star Wars |
| `MULTIVERSE` | `COL-00-MULTI` | Multiverso Geral |

---

## 📋 Lista dos 60 Códigos Canônicos

### 🎎 Anime & Mangá (`COL-01`)
1. `COL-01-NRT` — Naruto / Boruto
2. `COL-01-OP` — One Piece
3. `COL-01-DBZ` — Dragon Ball
4. `COL-01-AOT` — Attack on Titan
5. `COL-01-JJK` — Jujutsu Kaisen
6. `COL-01-BLC` — Bleach
7. `COL-01-HXH` — Hunter x Hunter
8. `COL-01-SLV` — Solo Leveling
9. `COL-01-JJBA` — JoJo's Bizarre Adventure
10. `COL-01-BSK` — Berserk
11. `COL-01-MHA` — My Hero Academia
12. `COL-01-DS` — Demon Slayer
13. `COL-01-FMA` — Fullmetal Alchemist
14. `COL-01-DN` — Death Note
15. `COL-01-OPM` — One Punch Man
16. `COL-01-TXG` — Tokyo Ghoul
17. `COL-01-EVA` — Evangelion
18. `COL-01-CG` — Code Geass
19. `COL-01-SAO` — Sword Art Online
20. `COL-01-FATE` — Fate Series

### 🎮 Gaming & Sci-Fi (`COL-02`)
21. `COL-02-CP77` — Cyberpunk 2077
22. `COL-02-FF` — Final Fantasy
23. `COL-02-ZELDA` — The Legend of Zelda
24. `COL-02-PKM` — Pokémon
25. `COL-02-EGD` — Elden Ring / Dark Souls
26. `COL-02-DMC` — Devil May Cry
27. `COL-02-GOW` — God of War
28. `COL-02-WIT` — The Witcher
29. `COL-02-HALO` — Halo
30. `COL-02-MGS` — Metal Gear Solid
31. `COL-02-RE` — Resident Evil
32. `COL-02-WOW` — World of Warcraft
33. `COL-02-LOL` — League of Legends
34. `COL-02-GEN` — Genshin Impact
35. `COL-02-HSR` — Honkai: Star Rail
36. `COL-02-ME` — Mass Effect
37. `COL-02-FO` — Fallout
38. `COL-02-SC` — StarCraft
39. `COL-02-DOTA` — Dota
40. `COL-02-OVER` — Overwatch

### 🌌 Comics & Pop Culture (`COL-03` & `COL-00`)
41. `COL-03-MARVEL` — Marvel Universe
42. `COL-03-DC` — DC Comics Universe
43. `COL-03-SW` — Star Wars
44. `COL-03-LOTR` — Lord of the Rings
45. `COL-03-HP` — Harry Potter
46. `COL-03-MATRIX` — Matrix
47. `COL-03-ST` — Stranger Things
48. `COL-03-DUNE` — Dune
49. `COL-03-TMNT` — Ninja Turtles
50. `COL-03-TF` — Transformers
51. `COL-03-BOYS` — The Boys
52. `COL-03-INV` — Invincible
53. `COL-03-PR` — Power Rangers
54. `COL-03-AVATAR` — Avatar: The Last Airbender
55. `COL-03-GOT` — Game of Thrones
56. `COL-03-DND` — Dungeons & Dragons
57. `COL-03-CPT` — Cthulhu Mythos
58. `COL-03-40K` — Warhammer 40k
59. `COL-03-SCP` — SCP Foundation
60. `COL-00-MULTI` — Multiverso Geral

---

## 🛠️ GitHub Actions Workflows

- **`.github/workflows/ci.yml`**: Executado em cada `push` e `pull_request` no branch `main`. Executa o `npm run validate:codes` e `npm run build`.
- **`.github/workflows/sync-status.yml`**: Valida a integridade dos códigos e publica um relatório de status no GitHub Step Summary.
