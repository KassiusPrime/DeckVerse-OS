# DeckVerse OS — Catálogo Completo

Este documento é a especificação do catálogo completo por coleção: **personagens, formas/evoluções, itens e chefes**. A fonte de verdade é o banco Supabase.

## Coleções ativas

As 60 coleções ativas são as mesmas do catálogo anterior, com seus códigos preservados. O inventário de cada coleção deve ser separado em `character`, `item`, `boss` e `card_forms`.

### Estrutura por coleção

```md
### Nome da coleção
**Código:** `COL-...`
**Categoria:** ...

#### Personagens
- todos os cards ativos com `entity_type = character`

#### Formas / Evoluções
- `card_forms.name` — personagem-base (`cards.name`)

#### Itens
- todos os cards ativos com `entity_type = item`

#### Chefes
- todos os cards ativos com `entity_type = boss`
```

## Inventário confirmado

O banco foi consultado para as coleções ativas e confirmou a existência de personagens, itens, chefes e formas. Exemplos de formas atualmente cadastradas incluem:

- Ben 10: formas de Ben Tennyson, Gwen Tennyson e Kevin Levin.
- Black Clover: Devil Union, Black Asta, Valkyrie Armor, Saint Valkyrie Armor, Dark Elf, Nero Bird Form e Spirit Dive.
- Bleach: True Bankai, True Shikai, Final Getsuga Tensho, Bankai, Full Hollow, Resurreccion, Segunda Etapa, Vollstandig e outras.
- Dragon Ball: formas de Broly, Cell, Frieza, Future Trunks, Gogeta, Goku Black, Gotenks, Kale, Kefla, Majin Buu, Piccolo, Gohan, Goku, Vegeta e Vegito.
- Naruto: Sage Mode, Bijuu Mode, Kurama Chakra Mode, Baryon Mode, Six Paths Sage Mode, Ten Tails Jinchuriki, Eighth Gate e outras.
- One Piece: Giraffe Hybrid, Phoenix, Gear 2, Gear 4 Boundman, Gear 4 Snakeman, Gear 5, Buddha, Kung Fu Point, Monster Point, Heavy Point, Allosaurus e Okuchi No Makami.
- Resident Evil: Uroboros, Mutated, Mutamycete Awakened e G1–G5.
- Sonic the Hedgehog: Burning Blaze, Perfect Chaos, Neo Metal Sonic, Super Shadow, Super Silver, Classic, Darkspine, Excalibur, Hyper Sonic, Super Sonic, Super Sonic 2, Werehog e Super.
- Street Fighter: Oni, Shin Akuma, Psycho Power Overload, Evil Ryu, Power Of Nothingness e Doll Unit Zero.
- Transformers: Goldbug, Transmetal, Rodimus Prime, Galvatron, Dragon, Optimal Optimus e Powermaster.
- Yu-Gi-Oh!: Antinomy, Supreme King, Zexal, Zexal II, Zexal III e Berserk.

## Totais

- 60 coleções ativas.
- 3.125 personagens ativos confirmados.
- Itens, chefes e formas são registros ativos do banco e devem permanecer associados às respectivas coleções.

## Exclusões

Não fazem parte deste catálogo: coleções inativas, Mitologia/Mitologias, História/Historia e Vida Real.

> Para um inventário nominal 100% completo, cada registro deve ser extraído diretamente das tabelas `cards` e `card_forms`; este arquivo não substitui o banco como fonte de verdade.
