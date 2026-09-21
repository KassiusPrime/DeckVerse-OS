# DeckVerse-OS — Marketplace Transactional Validation

Date: 2026-09-21
Environment: Supabase project `rrujnjraonckjdtpsfol`
Scope: controlled database validation of the transactional Marketplace RPC.

## Results

### 1. Rollback after forced failure — PASS

Controlled scenario:

```
Marketplace purchase
→ buyer debit
→ seller credit
→ inventory transfer
→ marketplace state update
→ economy transaction/ledger writes
→ forced exception
→ transaction rollback
```

The test used a temporary `app_private` test wrapper which called the real `public.buy_market_listing_with_transaction` and raised an exception immediately afterward. The wrapper itself was rolled back and did not remain in the database.

Post-rollback state verified:

- buyer balance restored to 5000 Deck Credits
- seller balance restored to 5000 Deck Credits
- seller card copies restored
- buyer ownership absent
- listing remained active
- `economy_transactions` rows for the test transaction: 0
- `economy_ledger` rows for the test transaction: 0
- `economy_audit_events` rows for the test transaction: 0
- `economy_logs` rows for the test transaction: 0

### 2. Transaction replay / idempotency — PASS

The same real Marketplace RPC was invoked twice with the same `transaction_id` inside one database transaction.

Observed:

- first invocation: `idempotent=false`
- second invocation: `idempotent=true`
- second invocation returned the same economic result
- the forced rollback removed all test state afterward

This validates replay protection at the RPC level.

### 3. Concurrent purchases against the same listing — PASS

Ten independent database calls were launched concurrently against the same listing, with a short synchronization delay before the purchase call.

Observed final behavior:

- one effective purchase
- remaining attempts failed safely with `LISTING_NOT_ACTIVE`
- no duplicate ownership transfer
- no negative balance
- no second sale of the listing

The successful test state was subsequently reverted manually to the exact pre-test state.

## Cleanup verification

After all tests:

- temporary buyer profile removed
- temporary Auth user removed
- temporary Marketplace listing removed
- seller card quantity restored
- seller balance restored
- buyer balance restored
- test economy transactions removed
- test economy ledger rows removed
- test audit/economy log rows removed
- no test listing remains

## Gate decision

Marketplace transactional validation is now empirically validated for:

```
Rollback
Concurrency
Replay / idempotency
```

The Marketplace infrastructure gate can therefore be considered **closed for these three validation dimensions**.

## Security note

The production Marketplace RPCs were also verified to have:

- `anon` EXECUTE: false
- `authenticated` EXECUTE: true
- `SECURITY DEFINER`: true
- `auth.uid()` enforcement in the RPC

No production security-advisor findings were modified as part of this validation.

## Next architectural gate

The next permitted domain is:

```
GACHA v2
```

subject to the existing `gacha_v2` Feature Flag remaining disabled until the Gacha implementation and its own transactional tests are complete.
