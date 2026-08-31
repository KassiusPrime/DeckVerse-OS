# DeckVerse — Backlog pós-infraestrutura

Este backlog só deve ser executado **depois** da conclusão e validação das etapas ativas de infraestrutura: Supabase/banco, autenticação Discord, bot/Interactions, Vercel e CI de produção.

## 1. UI pública — cards de coleção

- Remover da interface pública os códigos técnicos de coleção, como `COL-01-JJK`, `COL-02-LOL` e equivalentes.
- A remoção precisa abranger os dois pontos já identificados na UI:
  - tag/pílula superior do card;
  - texto translúcido/marca-d'água no fundo do card.
- O jogador comum deve ver apenas nome da coleção, entidades, raridade/arte e informações úteis do jogo.
- IDs/códigos técnicos podem continuar existindo internamente quando necessários à integridade, migração, auditoria ou administração.

## 2. Normalização de identificadores

- Eliminar índices numéricos sequenciais redundantes dos identificadores públicos/canônicos.
- Exemplo conceitual: `AOT-01-*` deve migrar para o namespace canônico `AOT`.
- Fazer a mudança como migração controlada, preservando referências de cartas, formas, mídia, rosters, gacha e auditoria.
- Não quebrar FKs nem apagar dados para atingir a nova nomenclatura.

## 3. Acervo e pacotes ZIP

- Retomar o cronograma original a partir de **Bloodborne**, ponto em que a produção do catálogo foi pausada.
- Concluir todas as coleções pendentes.
- Corrigir inconsistências estruturais identificadas nas versões anteriores.
- Validar nomes, classificação de entidade, formas, itens, bosses, raridade, referências de mídia e integridade dos arquivos.
- Produzir um lote adicional de novas coleções para expansão do catálogo.
- Ao final, gerar um `.ZIP` consolidado com todas as coleções faltantes e as novas expansões, já normalizadas e auditadas.

## 4. Discord — registro de comandos e operação do bot

### Arquitetura principal do DeckVerse

O fluxo principal permanece baseado em **Discord Interactions + Vercel Functions**, portanto:

- registrar os comandos de barra usando o script já existente `scripts/registerDiscordCommands.mjs` / `npm run discord:register`;
- manter `/api/discord/interactions` como endpoint de Interactions na Vercel;
- não exigir um processo `node index.js` 24/7 apenas para os slash commands;
- manter `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no servidor.

### Compatibilidade com o fluxo terminal solicitado

Ao encerrar a infraestrutura, também documentar/suportar o fluxo terminal solicitado para uma variante persistente do bot, se ela for necessária:

1. Criar diretório Node.js dedicado e instalar `discord.js`, `@supabase/supabase-js` e `dotenv`.
2. Usar `.env` local, nunca versionado, com variáveis equivalentes a:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Permitir aliases para as variáveis já usadas pelo projeto (`DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID`) ou documentar claramente a conversão.
4. Registrar comandos de guilda/global via script equivalente a `deploy-commands.js`.
5. Somente se forem adicionados eventos de Gateway/comandos por mensagem ou outras funções que exigem conexão persistente, iniciar o processo com `node index.js`/`bot.js` em um host apropriado para processos long-running.

## Regras de segurança

- Nunca commitar `.env`, bot token, Discord Client Secret ou Supabase service-role key.
- Nunca expor service-role em variáveis `VITE_*` ou código do navegador.
- Não reduzir RLS para facilitar importações ou scripts administrativos.
- Comandos e operações econômicas devem continuar server-authoritative e auditáveis.
