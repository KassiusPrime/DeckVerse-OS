# DECKVERSE OS — ESTRUTURA COMPLETA DO MULTIVERSO

## 1. Estrutura de Navegação & UX

### Casca Global
- **Navbar (Desktop & Mobile):** Fundo 100% opaco em tom neutro escuro com alto contraste. Botão de menu hamburguer mobile com drawer opaco sem vazamento de transparência.
- **BottomNav (Mobile apenas):** Links rápidos para `Coleções`, `Inventário`, `Home`, `Arena` e `Gacha`.
- **Terminal Flutuante (`>_`):** Visível em páginas públicas do jogador e oculto em páginas administrativas (`/adm`, `/admin`, `/architect`).

---

## 2. Mapa de Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Hub do Jogador com CTAs principais (Coleções, Gacha, Arena) e Live Drops reais. |
| `/collections` | Catálogo do Multiverso com filtro por Banco (COL-01 a COL-06), busca e ordenação numeral/alfabética/progresso. |
| `/card/:id` | Detalhes da Carta, Lore, Stats, Habilidades e Opções de Upgrade. |
| `/inventory` | Roster do jogador (cartas possuídas). |
| `/gacha` | Invocação e abertura de pacotes com taxas e sistema de Pity. |
| `/arena` | Combates PVE e PvP do DeckVerse. |
| `/battles` | Histórico e logs de batalhas. |
| `/synergy` | Montagem de Esquadrão e Análise de Sinergias. |
| `/upgrade` | Laboratório de melhoria de cartas. |
| `/market` / `/trade` | Mercado de troca de cartas entre jogadores. |
| `/guilds` / `/quests` | Guildas, Missões diárias e Recompensas. |
| `/ranking` / `/leaderboard` | Classificação geral de Caçadores. |
| `/lore` | Arquivo de histórias e crônicas do Multiverso. |
| `/fandom` | Utilitário de importação e consulta Fandom. |
| `/adm` | Painel do Arquiteto (Acesso restrito ao Administrador) para gerenciamento e edição direta. |
| `/admin` | Importação em lote e ferramentas de manutenção do acervo. |

---

## 3. Bancos de Coleções do Multiverso (62 Universos)

### COL-01 — ANIMES, MANGÁS, LIGHT NOVELS & WEBTOONS (B1)
1. **COL-01-AOT** — Attack on Titan (Shingeki no Kyojin)
2. **COL-01-BER** — Berserk
3. **COL-01-BCL** — Black Clover
4. **COL-01-BLC** — Bleach
5. **COL-01-CSM** — Chainsaw Man
6. **COL-01-DS** — Demon Slayer (Kimetsu no Yaiba)
7. **COL-01-DBZ** — Dragon Ball Z / Super
8. **COL-01-FATE** — Fate Series (Fate/stay night, Grand Order)
9. **COL-01-FMA** — Fullmetal Alchemist
10. **COL-01-HXH** — Hunter x Hunter
11. **COL-01-JOJO** — JoJo's Bizarre Adventure
12. **COL-01-JJK** — Jujutsu Kaisen
13. **COL-01-MHA** — My Hero Academia (Boku no Hero)
14. **COL-01-NRT** — Naruto / Shippuden
15. **COL-01-OP** — One Piece
16. **COL-01-OPM** — One Punch Man
17. **COL-01-SS** — Saint Seiya (Os Cavaleiros do Zodíaco)
18. **COL-01-SL** — Solo Leveling
19. **COL-01-TG** — Tokyo Ghoul
20. **COL-01-TOG** — Tower of God
21. **COL-01-VS** — Vinland Saga
22. **COL-01-YYH** — Yu Yu Hakusho

### COL-02 — JOGOS (B2)
23. **COL-02-BB** — Bloodborne
24. **COL-02-CP77** — Cyberpunk 2077
25. **COL-02-DS** — Dark Souls
26. **COL-02-DMC** — Devil May Cry
27. **COL-02-ER** — Elden Ring
28. **COL-02-FF** — Final Fantasy
29. **COL-02-GOW** — God of War
30. **COL-02-LOL** — League of Legends
31. **COL-02-MK** — Mortal Kombat
32. **COL-02-SKR** — The Elder Scrolls V: Skyrim
33. **COL-02-TLOU** — The Last of Us
34. **COL-02-ZLD** — The Legend of Zelda
35. **COL-02-[#WITCHER]** — The Witcher

### COL-03 — CINEMA & FRANQUIAS (B3)
36. **COL-03-DC** — DC Universe
37. **COL-03-DUNE** — Dune (Duna)
38. **COL-03-GOT** — Game of Thrones
39. **COL-03-[#HP]** — Harry Potter / Wizarding World
40. **COL-03-LOTR** — Lord of the Rings (O Senhor dos Anéis)
41. **COL-03-[#SW]** — Star Wars
42. **COL-03-BOYS** — The Boys
43. **COL-03-MARVEL** — X-Men / Marvel Universe

### COL-04 — SÉRIES & ANIMAÇÃO OCIDENTAL (B4)
44. **COL-04-ARC** — Arcane
45. **COL-04-ATLA** — Avatar: The Last Airbender
46. **COL-04-[#BEN10]** — Ben 10
47. **COL-04-[#CASTLEVANIA]** — Castlevania (Animated)
48. **COL-04-[#HAZBIN]** — Hazbin Hotel
49. **COL-04-[#AT]** — Adventure Time (Hora de Aventura)
50. **COL-04-[#INV]** — Invincible
51. **COL-04-[#STATIC]** — Static Shock (Super-Choque)
52. **COL-04-[#YJ]** — Young Justice (Justiça Jovem)

### COL-05 — MITOLOGIAS (B5)
53. **COL-05-EGY** — Mitologia Egípcia
54. **COL-05-GRK** — Mitologia Grega
55. **COL-05-JPN** — Mitologia Japonesa (Shinto)
56. **COL-05-[#POLYNESIAN]** — Mitologia Maori & Polinésia
57. **COL-05-[#MESO]** — Mitologia Mesopotâmica
58. **COL-05-[#NORSE]** — Mitologia Nórdica

### COL-06 — HISTÓRICOS & REALIDADE (B6)
59. **COL-06-[#ANTIQUITY]** — Antiguidade Clássica
60. **COL-06-[#REVOLUTIONS]** — Era das Revoluções
61. **COL-06-[#ART]** — Mestres da Arte & Ciência
62. **COL-06-[#FEUDAL]** — Japão Feudal & Samurai

---

## 4. Hierarquia de Entidades

```
Banco (COL-01 ... COL-06)
 └── Coleção / Universo (Code ex: COL-01-AOT)
      ├── Metadados (Fandom, Tags, 4 Seres Mais Fortes)
      ├── Personagens  → Card (entity_type = character)
      ├── Objetos      → Item (entity_type = item)
      └── Chefes       → Boss (+ card is_boss)
```
