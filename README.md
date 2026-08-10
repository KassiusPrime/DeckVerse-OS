# ⚡ DeckVerse OS — v9.2 REVISADO (Multiverse Trading Card & Lore System)

> **DeckVerse OS** é o sistema operacional canônico do ecossistema DeckVerse, integrando gerenciamento de coleções multiversais, lore interativa, gacha, batalhas de cartas, raids contra chefes e painel administrativo centralizado.

---

## 🚀 Principais Destaques da Versão 9.2

- **Estatuto Canônico de Coleções (95 Códigos Canônicos)**: Padronização total com suporte a 134 aliases legados sem quebrar registros salvos.
- **Engine de Desduplicação Multidimensional**:
  - Unificação de cartas e coleções com preservação de imagens, mídias e loras completas.
  - Preservação estrita de formas e transformações de personagens (ex: Goku Base vs Super Saiyan 4).
- **Elemento Opcional**: Exibição e filtragem flexível de "Elemento" apenas quando pertinente à franquia (sem invenções artificiais).
- **Acessibilidade & Responsividade**: Layout responsivo sem scroll horizontal, otimizado para telas de 320px a 1920px+.
- **Auditoria Automática**: Novo comando `npm run audit:catalog` para validação de integridade do catálogo e mapeamento de aliases em CI/CD.

---

## 🛠️ Comandos e Scripts do Sistema

```bash
# Executar servidor de desenvolvimento
npm run dev

# Compilar projeto para produção
npm run build

# Executar auditoria completa do catálogo e códigos canônicos
npm run audit:catalog

# Validar códigos e aliases legados
npm run validate:codes

# Verificar lint de código
npm run lint
```

---

## 🏗️ Arquitetura do Sistema

- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion.
- **Armazenamento**: Cliente `deckverseClient` unificado com suporte a cache local resiliente e fallback instantâneo.
- **Histórico**: Arquitetura legada Base44 removida no DeckVerse OS v10.
- **Classificação**: Modelo Hierárquico: `Universo` -> `Franchise` -> `Character` -> `CharacterVersion` -> `Card`.
- **Painel Admin**: Console administrativo com controle de tarefas, fusão de duplicatas e auditoria de qualidade.
