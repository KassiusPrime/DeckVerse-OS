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
