# Estrutura do Projeto DeckVerse OS

```
DeckVerse-OS/
├── components/                  # Componentes reaproveitáveis de UI
├── database/                    # Módulos de banco e esquemas locais
├── pages/                       # Telas principais (CollectionImporter, Admin, Arena, Market, etc.)
├── services/
│   ├── ai/
│   │   ├── autoCorrectionService.js # Auto-correção de entidades
│   │   ├── dataQualityEngine.js     # Auditoria e reparo automático de imagens/dados
│   │   └── enrichmentService.js     # Enriquecimento estruturado via Gemini 2.5
│   ├── collections/
│   │   ├── collectionService.js     # Estatísticas e sincronização de coleções
│   │   └── teamRosters.js           # Presets de equipes (Marvel, DC, Anime)
│   ├── fandom/
│   │   └── fandomClient.js          # API Fandom MediaWiki + Cache LRU
│   ├── images/
│   │   └── imageResolver.js         # Resolver multi-tier de imagens (Fandom -> Superhero -> Jikan -> Wikimedia -> AI)
│   └── sync/
│       └── backgroundSyncService.js # Motor de sincronização autônoma em background
├── App.jsx                      # Rotas e provedores globais
├── base44Client.js              # Camada de persistência em localStorage
├── constants.js                 # Constantes de raridades, raridade power, roles e elementos
├── index.css                    # Estilos globais e temas Tailwind
├── metadata.json                # Metadados do app AI Studio
└── package.json                 # Dependências e scripts
```
