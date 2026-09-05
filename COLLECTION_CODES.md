# DeckVerse OS — Códigos de Coleções Canônicos

**Revisão:** 2026-09-05

Este documento acompanha o registro canônico em `lib/collectionCodes.js`.

## Regras vigentes

- `COL-01-DB` é o código canônico único de **Dragon Ball**.
- `COL-01-DBZ` existe somente como alias legado e deve resolver para `COL-01-DB`.
- A franquia Dragon Ball engloba Dragon Ball clássico, Z/Kai, GT, Super, DAIMA e filmes/OVAs consagrados.
- Pokémon e Digimon estão explicitamente fora do catálogo DeckVerse e não devem ser criados por automação, import ou fallback.
- DC e Marvel permanecem universos-mãe absolutos: `COL-03-DC` e `COL-03-MARVEL`.
- Os filenames de mídia usam prefixos curtos (`COL-DB_`, `COL-RE_`, etc.); os IDs lógicos continuam no padrão `COL-XX-SIGLA`.

## Aliases críticos

| Entrada | Resolve para | Observação |
|---|---|---|
| `COL-01-DBZ` | `COL-01-DB` | legado |
| `DBZ` | `COL-01-DB` | legado |
| `DB` | `COL-01-DB` | canônico |
| `DRAGONBALL` / `DRAGON_BALL` | `COL-01-DB` | canônico |
| `DAIMA` | `COL-01-DB` | franquia Dragon Ball |
| `COL-01-BSK` | `COL-01-BER` | legado Berserk |
| `COL-01-JJBA` | `COL-01-JOJO` | legado JoJo |
| `COL-01-SLV` | `COL-01-SL` | legado Solo Leveling |
| `COL-01-TXG` | `COL-01-TG` | legado Tokyo Ghoul |
| `COL-02-EGD` | `COL-02-ER` | legado Elden Ring |
| `COL-02-ZELDA` | `COL-02-ZLD` | legado Zelda |
| `COL-02-WIT` | `COL-02-WITCHER` | legado Witcher |
| `COL-03-INV` | `COL-04-INV` | legado Invencível |
| `COL-03-AVATAR` | `COL-04-ATLA` | legado Avatar |

## Coleções adicionais aprovadas nesta revisão

| Código lógico | Coleção | Prefixo de mídia |
|---|---|---|
| `COL-01-YGO` | Yu-Gi-Oh! | `COL-YGO_` |
| `COL-02-MH` | Monster Hunter | `COL-MH_` |
| `COL-02-RE` | Resident Evil | `COL-RE_` |
| `COL-02-SONIC` | Sonic the Hedgehog | `COL-SONIC_` |
| `COL-02-SF` | Street Fighter | `COL-SF_` |
| `COL-03-TF` | Transformers | `COL-TF_` |

## Famílias de códigos registradas

### Anime, mangá, LN e webtoons (`COL-01`)

`AOT`, `BER`, `BCL`, `BLC`, `CSM`, `DS`, `DB`, `FATE`, `FMA`, `HXH`, `JOJO`, `JJK`, `MHA`, `NRT`, `OP`, `OPM`, `SS`, `SL`, `TG`, `TOG`, `VS`, `YYH`, `DN`, `EVA`, `CG`, `SAO`, `YGO`.

### Games & Cyberpunk (`COL-02`)

`BB`, `CP77`, `DS`, `DMC`, `ER`, `FF`, `GOW`, `LOL`, `MK`, `SKR`, `TLOU`, `ZLD`, `WITCHER`, `HALO`, `MGS`, `RE`, `WOW`, `GEN`, `HSR`, `ME`, `FO`, `SC`, `DOTA`, `OVER`, `SONIC`, `SF`, `MH`.

### Comics, Sci-Fi & Pop Culture (`COL-03`)

`DC`, `DUNE`, `GOT`, `HP`, `LOTR`, `SW`, `BOYS`, `MARVEL`, `MATRIX`, `ST`, `TMNT`, `TF`, `PR`, `DND`, `CPT`, `40K`, `SCP`.

### Animações, cartoons & séries (`COL-04`)

`ARC`, `ATLA`, `BEN10`, `CASTLEVANIA`, `HAZBIN`, `AT`, `INV`.

### Mitologia & Lore (`COL-05`)

`EGY`, `GRK`, `JPN`, `POLYNESIAN`, `MESO`, `NORSE`.

### História & Real World (`COL-06`)

`ANTIQUITY`, `REVOLUTIONS`, `ART`, `FEUDAL`.

### Multiverso (`COL-00`)

`MULTI`.

## Validação

```bash
npm run validate:codes
npm run ci
```

A fonte executável é `lib/collectionCodes.js`; este arquivo é documentação humana e não deve divergir do resolver.
