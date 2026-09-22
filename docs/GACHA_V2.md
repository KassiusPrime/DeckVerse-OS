# DeckVerse-OS — Gacha v2

## Architecture

Gacha v2 follows the central DeckVerse transaction boundary:

```
Frontend
→ Service
→ OpenPackUseCase
→ PackRepository
→ open_gacha_pack RPC
→ PostgreSQL transaction
```

The RPC performs the critical state change atomically:

- validates `gacha_v2` Feature Flag
- locks the player profile with `FOR UPDATE`
- validates batch size and Deck Credits balance
- debits Deck Credits
- writes `economy_transactions`
- writes `economy_ledger`
- writes `economy_audit_events`
- generates cards into the roster
- updates pity
- writes `gacha_rolls`
- returns the complete pack result

The browser never mutates the economy or roster directly.

## Transaction identity

Every opening receives a UUID `transaction_id` in `OpenPackUseCase`.

`gacha_rolls.transaction_id` has a unique index. Repeating the same transaction returns the original result with `idempotent=true`.

## Event Bus

After a successful RPC commit, `PackService` publishes `PACK_OPENED` through the existing Event Bus. The event contains the transaction result and a `PackAuditService` summary.

Critical financial/card audit is written inside the database transaction; Event Bus handlers are secondary effects and therefore cannot create a partially committed economic operation.

## Currency

Gacha v2 uses the canonical DeckVerse currency:

```
Deck Credits
```

The legacy `astral_shards` / `ether_cores` Gacha RPC remains present for compatibility but is not used by the Gacha v2 UI or Discord flow.

## Validation

The real Supabase project was tested with a temporary isolated player while `gacha_v2` was temporarily enabled and returned to disabled afterward.

Validated:

- valid opening: PASS
- Deck Credits debit: PASS
- economy transaction: PASS
- economy ledger: PASS
- card generation: PASS
- audit events: PASS
- replay with the same `transaction_id`: PASS
- forced rollback: PASS
- ten concurrent openings against the same player: PASS
- no negative balance
- no duplicate transaction processing

Cleanup completed:

- temporary Auth user removed
- temporary profile removed
- temporary roster rows removed
- test Gacha rows removed
- test economy transaction rows removed
- test ledger rows removed
- test audit/economy log rows removed
- `gacha_v2` restored to `false`

## Release gate

`gacha_v2` remains disabled until the code/CI validation of the new application layer is complete. Database-level transactional validation has passed.
