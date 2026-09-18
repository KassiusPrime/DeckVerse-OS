# DeckVerse Discord Bot

## Arquitetura oficial

O DeckVerse usa Discord Interactions via `/api/discord/interactions` na Vercel. Não é necessário manter `node index.js` rodando 24/7 para slash commands.

O registro local dos comandos é feito por:

```bash
npm run discord:register
```

O script carrega `.env` automaticamente e aceita:

- `DISCORD_BOT_TOKEN` ou `DISCORD_TOKEN`
- `DISCORD_APPLICATION_ID` ou `CLIENT_ID`
- `DISCORD_GUILD_ID` ou `GUILD_ID`

## Variáveis

Copie `.env.example` para `.env` e preencha as credenciais reais. Nunca versione `.env`.

Obrigatórias para registro:
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID` para registro imediato em uma guild específica

Obrigatórias para Interactions na Vercel:
- `DISCORD_PUBLIC_KEY`
- `DISCORD_TOKEN`/ `DISCORD_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A service-role key só pode existir no ambiente servidor. Nunca use prefixo `VITE_`.

## Fluxo local

```powershell
Copy-Item .env.example .env
npm install
npm run discord:register
```

Depois, para testar a aplicação web:

```powershell
npm run dev
```

## Gateway persistente

Não criar um segundo bot `index.js` apenas para slash commands. Uma variante Gateway só deve ser adicionada se o DeckVerse passar a precisar de eventos persistentes que não sejam adequados ao modelo Interactions.

## Segurança

Se um token do Discord já tiver sido exposto, revogue-o no Discord Developer Portal e gere outro. Não coloque tokens, Client Secret ou service-role key em commits, issues, logs ou arquivos públicos.
