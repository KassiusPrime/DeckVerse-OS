# DeckVerse OS — Catálogo Completo

> **Fonte de verdade:** Supabase (`collections`, `cards`, `card_forms`). Este documento foi regenerado a partir das coleções ativas do banco em 2026-09-09.

## Escopo

Cada coleção ativa é documentada com:
- **Personagens:** `cards.entity_type = character` e `is_active = true`.
- **Formas / Evoluções:** `card_forms.is_active = true`, associadas ao personagem-base por `card_forms.card_id`.
- **Itens:** `cards.entity_type = item` e `is_active = true`.

Coleções inativas e as categorias **Mitologia/Mitologias, História/Historia e Vida Real** ficam fora do catálogo.

## Coleções ativas

As 60 coleções ativas atualmente no Supabase são:

1. Adventure Time (`COL-04-AT`)
2. Arcane (`COL-04-ARC`)
3. Attack on Titan (`COL-01-AOT`)
4. Avatar: The Last Airbender (`COL-04-ATLA`)
5. Ben 10 (`COL-04-BEN10`)
6. Berserk (`COL-01-BER`)
7. Black Clover (`COL-01-BCL`)
8. Bleach (`COL-01-BLC`)
9. Bloodborne (`COL-02-BB`)
10. Castlevania (`COL-04-CASTLEVANIA`)
11. Chainsaw Man (`COL-01-CSM`)
12. Cyberpunk 2077 (`COL-02-CP77`)
13. Dark Souls (`COL-02-DS`)
14. DC Universe (`COL-03-DC`)
15. Demon Slayer (`COL-01-DS`)
16. Devil May Cry (`COL-02-DMC`)
17. Dragon Ball (`COL-01-DB`)
18. Dune (`COL-03-DUNE`)
19. Elden Ring (`COL-02-ER`)
20. Fate Series (`COL-01-FATE`)
21. Final Fantasy (`COL-02-FF`)
22. Fullmetal Alchemist (`COL-01-FMA`)
23. Game of Thrones (`COL-03-GOT`)
24. God of War (`COL-02-GOW`)
25. Harry Potter (`COL-03-HP`)
26. Hazbin Hotel (`COL-04-HAZBIN`)
27. Hunter x Hunter (`COL-01-HXH`)
28. Invencível (`COL-04-INV`)
29. JoJo Bizarre Adventure (`COL-01-JOJO`)
30. Jujutsu Kaisen (`COL-01-JJK`)
31. Lady Death Universe (`COL-03-LD`)
32. League of Legends (`COL-02-LOL`)
33. Lord of the Rings (`COL-03-LOTR`)
34. Marvel Comics Universe (`COL-03-MARVEL`)
35. Monster Hunter (`COL-02-MH`)
36. Mortal Kombat (`COL-02-MK`)
37. My Hero Academia (`COL-01-MHA`)
38. Naruto (`COL-01-NRT`)
39. One Piece (`COL-01-OP`)
40. One Punch Man (`COL-01-OPM`)
41. Record of Ragnarok (`COL-01-ROR`)
42. Resident Evil (`COL-02-RE`)
43. Saint Seiya (`COL-01-SS`)
44. Seven Deadly Sins (`COL-01-SDS`)
45. Skyrim (`COL-02-SKR`)
46. Solo Leveling (`COL-01-SL`)
47. Sonic the Hedgehog (`COL-02-SONIC`)
48. Star Wars (`COL-03-SW`)
49. Street Fighter (`COL-02-SF`)
50. The Boys (`COL-03-BOYS`)
51. The Last of Us (`COL-02-TLOU`)
52. The Legend of Zelda (`COL-02-ZLD`)
53. The Witcher (`COL-02-WITCHER`)
54. Tokyo Ghoul (`COL-01-TG`)
55. Tower of God (`COL-01-TOG`)
56. Transformers (`COL-03-TF`)
57. Vampirella Universe (`COL-03-VAMP`)
58. Vinland Saga (`COL-01-VS`)
59. Yu Yu Hakusho (`COL-01-YYH`)
60. Yu-Gi-Oh! (`COL-01-YGO`)

## Inventário nominal

O inventário nominal completo é gerado diretamente pelo Supabase para evitar que esta documentação se torne uma segunda fonte de verdade manual. A consulta de geração usa os registros ativos das três estruturas acima e produz, por coleção, as seções **Personagens**, **Formas / Evoluções** e **Itens**.

### Totais confirmados no banco

- **60** coleções ativas.
- **3.125** personagens ativos.
- **668** bosses ativos no catálogo (mantidos no banco, embora fora do escopo nominal solicitado nesta versão).
- **172** itens ativos.
- Formas/evoluções: registros ativos em `card_forms`, associados aos respectivos cards-base.

### Formas atualmente presentes

As formas são registros de `card_forms`, não personagens duplicados. Entre os conjuntos confirmados no banco estão:

- **Black Clover:** Black Asta, Dark Elf, Devil Union, Dwarf Form, Nero Bird Form, Saint Valkyrie Armor, Spirit Dive, Valkyrie Armor.
- **Bleach:** Bankai, Final Getsuga Tensho, Full Hollow, Mature Bankai, Resurreccion, Segunda Etapa, Thunder God Form, True Bankai, True Shikai, Vollstandig.
- **Dragon Ball:** Beast, Berserk Super Saiyan, Buuhan, Buutenks, Great Ape, Golden, Perfect, Super Saiyan, Super Saiyan 2/3/4, Super Saiyan Blue, Super Saiyan God, Ultra Ego, Ultra Instinct e outras.
- **Naruto:** Baryon Mode, Bijuu Mode, Curse Mark Stage 2, Eight Branches, Eighth Gate, Gyuki Transformation, Kurama Chakra Mode, Sage Mode, Six Paths Sage Mode, Ten Tails Jinchuriki, Version 2.
- **One Piece:** Allosaurus, Buddha, Gear 2, Gear 4 Boundman, Gear 4 Snakeman, Gear 5, Giraffe Hybrid, Heavy Point, Kung Fu Point, Monster Point, Okuchi No Makami, Phoenix.
- **Resident Evil:** G1, G2, G3, G4, G5, Mutamycete Awakened, Mutated e Uroboros.
- **Sonic the Hedgehog:** Burning Blaze, Classic, Darkspine, Excalibur, Hyper Sonic, Neo Metal Sonic, Perfect Chaos, Super, Super Shadow, Super Silver, Super Sonic, Super Sonic 2, Werehog.
- **Street Fighter:** Doll Unit Zero, Evil Ryu, Oni, Power Of Nothingness, Psycho Power Overload, Shin Akuma.
- **Transformers:** Dragon, Galvatron, Goldbug, Optimal Optimus, Powermaster, Rodimus Prime, Transmetal.
- **Yu-Gi-Oh!:** Antinomy, Berserk, Supreme King, Zexal, Zexal II, Zexal III.

## Regra de manutenção

Este arquivo deve ser regenerado sempre que houver alteração estrutural ou grande atualização de catálogo. **Não usar este Markdown como fonte de verdade para alimentar o aplicativo**: o Supabase continua sendo a autoridade.

Última extração: **2026-09-09**.
