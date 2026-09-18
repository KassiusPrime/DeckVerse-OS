# DeckVerse-OS — Arquitetura alvo

## Regra principal
Frontend → Service → Use Case → Repository → Postgres RPC/Transaction.

A interface não contém regras críticas nem detalhes de persistência. No navegador, o Unit of Work não tenta executar BEGIN/COMMIT/ROLLBACK: a fronteira transacional real fica no Postgres, dentro de uma única RPC.

## Camadas
- features/: componentes e fluxos por domínio.
- services/: API pública consumida pela interface.
- useCases/: regras e invariantes de negócio.
- repositories/: acesso a dados e RPCs.
- architecture/: permissões, erros e limites arquiteturais.
- Supabase/Postgres: RLS, funções, constraints e transações.

## Domínios de migração
cards → marketplace → inventory → gacha → guilds → quests → battle → ranking → admin.

A migração é incremental. Código legado pode continuar funcionando até seu domínio ser migrado; novos fluxos devem seguir as camadas.

## Segurança
Permissões são capacidades, não verificações espalhadas de papel. A autorização definitiva continua no servidor/RPC/RLS; a verificação no frontend serve apenas para UX.

## Auditoria e economia
O banco atual já possui admin_audit_log e economy_ledger. Eles são tratados como os sistemas oficiais durante a migração, evitando tabelas paralelas desnecessárias.

## Atomicidade
Operações que alteram saldo, inventário, propriedade, marketplace, gacha, recompensas ou trocas devem ser uma única operação transacional no Postgres. Não usar chamadas independentes para simular transação.

## Estado atual
O primeiro domínio-piloto é o catálogo administrativo. Já existem Repository + Use Case + Service para pesquisa e edição de coleções, cartas e formas, usando as RPCs administrativas protegidas existentes. O centro administrativo aplica filtros de raridade e letra no servidor. Marketplace e Inventory já possuem camadas Repository + Use Case + Service; Inventory encapsula leitura do acervo, arte pessoal, concessão, remoção, transferência e equipamentos.

## Próximas migrações
1. Marketplace: compra/venda como use cases transacionais.
2. Inventory: transferência/concessão/remoção e equipamentos via Repository + Use Cases, com invariantes e atomicidade no servidor.
3. Gacha: abertura + débito + entrega + auditoria na mesma transação.
4. Guilds/quests/rewards: regras e recompensas server-side.
5. Battle/ranking: separar cálculo, apresentação e persistência.
6. Admin: migrar fluxos restantes para o mesmo padrão.

## Critério de aceite
Um domínio só é considerado migrado quando componentes não acessam Supabase diretamente; regras críticas estão no Use Case e/ou Postgres; Repository concentra persistência; autorização é validada no servidor; operações econômicas são atômicas; eventos relevantes são auditáveis; e testes cobrem sucesso, falhas e rollback.


## Infraestrutura central econômica — Fase 2026-09-18

Deck Credits é a moeda econômica oficial. Não substituir por "Gold".

A ordem obrigatória da fase central é:

1. Economy Engine
2. Integração Marketplace → Economy
3. Economy Ledger
4. Transaction IDs
5. Rollback tests
6. Economy Audit
7. Event Bus
8. Observabilidade
9. Feature Flags
10. Gacha

Gacha, Guilds, Quests, Rewards, Battle e Ranking permanecem bloqueados até a conclusão dessa cadeia.

### Economia

Toda movimentação de Deck Credits deve passar pelo Repository/Use Case e por RPC transacional no Postgres. As estruturas `economy_ledger` e `economy_transactions` coexistem:

- `economy_ledger`: histórico operacional/auditoria econômica.
- `economy_transactions`: reconstrução financeira, com `transaction_id`, saldo anterior/posterior e referência.

`transaction_id` é UUID e é reutilizável apenas para idempotência da mesma operação. A mesma operação pode possuir duas pernas em `economy_transactions` (por exemplo, transferência ou marketplace), usando o mesmo ID e participantes diferentes. Índices únicos por `transaction_id + player/profile` impedem duplicação.

### Marketplace

`buy_market_listing`, `create_market_listing` e `cancel_market_listing` continuam existindo e continuam transacionais. A compra usa agora o caminho transaction-aware `buy_market_listing_with_transaction`, mantendo `buy_market_listing` como wrapper compatível. O frontend não realiza débito, crédito ou transferência em chamadas separadas.

### Rollback

A fronteira transacional real é o Postgres. Erros em funções transacionais abortam a operação; testes live realizados em subtransações verificaram restauração de saldo, ausência de ledger/transação persistida e restauração de inventário/auditoria após falha forçada.

### Auditoria e observabilidade

Movimentações em `economy_transactions` geram automaticamente eventos em `economy_audit_events` e `economy_logs` por triggers. `admin_audit_log` alimenta `audit_logs`. Existem também `system_logs` e `error_logs`.

### Event Bus

O domínio usa `events/EventBus.js` para desacoplar eventos de compra, créditos e inventário de handlers de auditoria, economia, notificações e conquistas. Falhas de handlers são isoladas do resultado já confirmado pelo banco e retornadas como resultados `Promise.allSettled`.

### Feature Flags

Toda funcionalidade experimental deve ser controlada por `feature_flags`. Flags centrais já cadastradas:

- `economy_v2`
- `gacha_v2`
- `guild_wars`
- `auction_house`
- `season_pass`
- `event_system`

`economy_v2` está habilitada em produção; `gacha_v2` permanece desabilitada até a liberação formal da fase.

### Regra de atomicidade

A camada Unit Of Work no frontend não é uma transação PostgreSQL. Operações críticas devem concentrar a fronteira atômica no banco, normalmente através de uma única RPC. Não simular transações com várias chamadas independentes do navegador.
