# PROMPT_CORRECAO.md — Guia Canônico de Correção do DeckVerse OS

## 1. Princípios Fundamentais
- **Local-First**: Persistência via `localStorage` com abstrações no `base44Client.js` e `core/entityRepository.js`.
- **Sem CDN / Serviços Pagos Exclusivos**: Fallbacks locais determinísticos para todas as requisições de mídia e IA.
- **Camadas Claras**: `UI -> AdminController -> Services (Import/Quality/AIRouter/Queue) -> Repositories -> Data`.
- **Coleções Únicas**: Mapeamento unificado por código canônico (ex: `COL-01` a `COL-06`) com fusão automática de duplicatas por nome/idioma.
- **Separadores de Entidades**: Separação estrita em sub-abas de Personagens, Objetos/Itens e Chefes (Bosses).
- **IA Multi-Modelo com Fallback**: Gemini 2.5 Flash como primário com fallback gracioso em caso de quota excedida (429/404) para evitar falhas em tempo de execução.

## 2. Estrutura de Pastas Obrigatória
```
/
├── core/
│   ├── adminController.js
│   ├── entityRepository.js
│   ├── importService.js
│   ├── jobQueue.js
│   ├── qualityService.js
│   └── aiRouter.js
├── database/
├── services/
│   └── ai/
├── Admin.jsx
├── AdminTerminal.jsx
├── Collections.jsx
├── BottomNav.jsx
├── PROMPT_CORRECAO.md
└── PROMPT_UI.md
```

## 3. Comportamento Esperado da UI
- **Home**: Acessível em `/` e `/dashboard`.
- **Terminal Admin**: Oculto automaticamente em rotas `/adm`, `/admin` e `/architect`.
- **Coleções**: Sub-abas sticky, chips legíveis, visualização organizada por Personagens, Objetos e Chefes.
- **Console ADM (/adm)**: Painel completo com semente do acervo (62 universos/coleções), auditoria de dados, fusão de coleções duplicadas e reclassificação.

## 4. Checklist de Correção em 10 Passos
1. [x] Estruturar camada `core/` com Repositories, Services, Controller e AI Router.
2. [x] Implementar rota `/adm` com autenticação e suporte a override.
3. [x] Configurar tratamento de quota 429 com fallback local nas chamadas da API Gemini.
4. [x] Assegurar suporte às 62 coleções nos bancos COL-01 a COL-06.
5. [x] Integrar semente de acervo e opção de unificação de coleções duplicadas.
6. [x] Ajustar `BottomNav.jsx` para apontar o botão Home para `/`.
7. [x] Ocultar o overlay do `AdminTerminal.jsx` em rotas administrativas (`/adm`, `/admin`, `/architect`).
8. [x] Otimizar layout em `Collections.jsx` com remoção de padding duplo e sub-abas fixas.
9. [x] Implementar visualização separada de Personagens, Objetos e Chefes nas Coleções.
10. [x] Garantir compilação limpa sem erros de linter ou build.

## 5. Frase de Aceite
> Bancos COL-01…06 com 62 universos; metadados do acervo; personagens/itens/bosses separados por aba e coleção; import revisável sem duplicar coleções; ADM edita/exclui e roda jobs; canônicos + imagens oficiais; sem CDN pago.
