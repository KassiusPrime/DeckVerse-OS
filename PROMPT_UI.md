# PROMPT_UI.md — Especificações de Interface e Experiência do Usuário (UX/UI)

## 1. Diagnóstico de Atrito
- **Navegação**: A opção Home na BottomNav apontava para `/dashboard`, desalinhada do hub principal `/`.
- **Sobreposição de UI**: O Terminal Admin flutuante aparecia sobre o console administrativo `/adm`, causando conflito visual.
- **Hierarquia Visual em Coleções**: Padding excessivo causava barras de rolagem desnecessárias e perda de espaço útil no mobile.
- **Sub-abas de Filtro**: Falta de fixação (sticky) fazia o usuário perder a referência do filtro ao rolar a lista.

## 2. Objetivos de Comportamento
- Navegação fluida e previsível no ambiente mobile e desktop.
- Experiência limpa sem sobreposição de elementos interativos em telas administrativas.
- Apresentação clara do acervo com filtragem rápida entre Personagens, Objetos e Chefes.
- Feedback visual imediato para ações no console `/adm`.

## 3. Especificações por Tela

### Shell & BottomNav
- O botão **Home** deve redirecionar para `/` e permanecer destacado visualmente tanto em `/` quanto em `/dashboard`.
- Área de toque mínima de 44px para facilidade em dispositivos móveis.

### Terminal Admin (`AdminTerminal.jsx`)
- Deve verificar a rota atual e ocultar o acionador/overlay quando o usuário estiver em `/adm`, `/admin` ou `/architect`.

### Coleções (`Collections.jsx`)
- Remover paddings duplicados na visualização principal.
- Fixar o painel de sub-abas (Personagens / Objetos / Chefes) com `sticky top-0 z-10`.
- Destacar os chips de categorias/bancos (`COL-01` a `COL-06`) com alto contraste e estados ativos claros.

### Console ADM (`/adm`)
- Layout estilizado em console cibernético com sidebar expansível e navegação por seções.
- Suporte a comandos de manutenção: **Semente do Acervo (62 Universos)**, **Fundir Coleções Duplicadas**, **Reclassificar Cartas**, **Auditar Qualidade** e **Auto-Reparo de Imagens**.

## 4. Checklist de Aceite UI
- [x] Home ativa em `/` e `/dashboard`.
- [x] AdminTerminal oculto em `/adm`.
- [x] Sub-abas sticky em Coleções.
- [x] Chips de coleção legíveis com contraste adequado.
- [x] Ausência de overflow/padding duplo em telas mobile.
