# Existing native wallet integration for the new 60 games

The new namespace registers game evaluators on the **already initialized** native `LibraryService` instance. It does not construct a financial service, database connection, schema, house wallet, player wallet, migration or recovery scheduler. The existing player session, canonical accounts, shared wallet transaction, reservation transfers, double-entry ledger, request receipts and recovery methods remain authoritative.

The exact 14 existing routes in `client/existing-wallet-routes.mjs` are excluded. All 60 new IDs are derived from that exclusion; the installer throws if the counts change. The production installer defaults to closed. Free DEMO storage is a separate existing `LocalDemoWallet` namespace and is never used by this account integration.

## Initialized host and transport

The retained native bootstrap supplies `app.existingLibraryDependencies` with `service`, `verifyNative`, `readNativeBody`, `engineSecret` and `resolveSessionUser`. `NATIVE60_HOST_CONTRACT` publishes this dependency contract without infrastructure identifiers or deployed-runtime fingerprints. Exact host pins remain in a separately supplied private deployment input. The installer receives the initialized objects; it does not copy the production financial classes.

| Route | Authentication | Behavior |
| --- | --- | --- |
| `GET /v2/independent74/health` | Public | Current 60 public definitions, exact versions, per-game acceptance and closed-gate reasons; hashed database/schema/trigger fingerprints and aggregate readiness booleans |
| `GET /v2/independent74/state?game_id=…` | Existing native signature and canonical session resolver | Existing wallet balance, current model and public accepted round |
| `GET /v2/independent74/history?game_id=…` | Same existing authentication | Existing immutable round history, with private state and revealed seeds removed from this facade |
| `POST /v2/independent74/action` | Same existing authentication | Retained request, round, version, stake and action contract |

New player routes accept only an authenticated `@session:<sha256>` subject. Browser-supplied player IDs and `@system` are rejected. The Player Worker keeps its existing machine-session guard and signs this same transport; no second wallet or secret is introduced.

Money remains an exact decimal string. `stake` is the full effective debit, including a selected paid feature or ANTE. Per-game policy is explicit, versioned and supplied by the trusted operator. The policy helper's initial maximum is 20 ETB for explicitly reviewed IDs; it supplies no funding proof and enables nothing. Existing house capacity and account limits are checked by the retained service for every accepted liability.

## Shared admission and carry

The native facade scopes new starts with `AsyncLocalStorage`. After retained receipt replay and the existing active-round check, its additive `otherActive` hook locks the canonical player and house wallets in the same sorted order used by the protected engine. It checks unresolved protected free spins and bonus picks before invoking the existing guard. Old service calls outside this scope delegate to the original guard. Starting a new60 ID through an old generic route cannot bypass this context requirement.

The reciprocal protected patch adds a pure read check at three existing admission points: originals spin, protected spin and gamble/bonus action. Each call follows authentication, sorted wallet locks and receipt replay. Disabled observation mode is a no-op for those requests. Enabling that guard requires observed matching database identity and successful rollback of its bounded read-only probe. The code does not change monetary helpers or old game calculations.

Charging Wilds carry is restored from `sw_native_library.rounds.state.mathState` for the exact authenticated player, game, model version, derived base stake and ANTE. The read occurs under the same admission locks. It joins canonical `sw_rebuild.rounds.settled_order`, so equal timestamps cannot restore an older accepted bucket. Input and output carry persist with the same round and ledger transaction. Request replay does not advance the counter; a rejected debit or transaction rollback preserves the prior carry. The browser never sends trusted carry.

Only the new namespace's read projection uses canonical settlement order for settled history. The retained service still performs reconciliation, financial operations and balance reads. Original financial method references are unchanged. New registry versions delegate recovery of already registered older evaluators to the retained registry.

## Chicken connection lease

Chicken Highway r4 publishes an authenticated presence-lease capability. The client sends the existing `sync` action with empty input while its current active game is visible. Accepted START, GO and sync actions use the server clock to renew the lease; state/history reads and request-receipt replays do not. The published Help defines disconnection as more than eight seconds, so a lease expires at the last accepted contact plus 8,001 milliseconds. Expiry collects the last confirmed earned award through the existing settlement method; it cannot make another bet or revive the round. This applies to manual and automatically issued actions alike. The lease measures accepted server contact, so hiding or closing the tab can also stop renewal; it does not claim to inspect the device's physical network connection.

The native path uses the retained `LibraryService` expiry column, timer scheduling and recovery. The independent DEMO objects use their existing transactional storage and alarm API. The alarm deadline and accepted state commit together. The conditional class hook delegates the original alarm whenever the independent ledger is absent; an independent object with a held slot or unknown older model is never reinterpreted as an expired Chicken round. Duplicate alarm delivery shares the same active-to-settled payout gate as ordinary requests.

The source rule is recorded in `reports/current74-evidence-nonslots/ind74_official_chickenhighway-rendered-rules.json`. Cloudflare's [alarm API](https://developers.cloudflare.com/durable-objects/api/alarms/) guarantees at-least-once delivery, so the handler is idempotent and allows transaction failures to trigger retries. Infrastructure recovery can delay the ledger update; the stored deadline still prevents a late action from extending risk beyond the accepted lease.

## Release gates and evidence

All gates are closed unless the trusted installer receives:

1. A genuine bounded audit proof bound to the **same `service.sql` object**, with required columns, keys, active-round uniqueness, reserve references and existing funded reserves verified. A JSON object claiming success cannot replace that proof.
2. Matching observed hashes from the real protected and native pools.
3. The reciprocal protected guard actually enabled and observed, with rollback and shared-database identity confirmed.
4. A review of the canonical trigger semantics. Fingerprints are reported without returning trigger bodies; a fingerprint alone does not perform that review.
5. Explicit reviewed policies for exact current model versions, stake ceilings and payout ceilings, plus the operator's release switch.

A model's explicit `releaseReview.realMoneyAdmissionBlocked` flag overrides all of those permissions. The public catalog and build manifest enumerate the current rejected models. MH20 r4 (`198600 / 163840`), Multi Hot Ways r4 (`4080 / 2560`) and Dragon's Code r4 (`474480 / 163840`) are examples with independently chosen weights whose pre-flooring analytic returns exceed the stake. Burn Wilds r5 is blocked pending review of the complete expanding-Wild return and maximum coupling. Book of Bonanza r4's observed regular-symbol prizes under its independent weights imply a base-only return lower bound of `1686961645158400 / 1094032426497921`, above the stake before counting Book substitutions or bonuses. The policy helper rejects these IDs, and the native namespace refuses their new stakes even with otherwise valid SQL proofs and explicit reviewed policies. Their five technical rounds run through separate disposable retained-ledger fixtures; this does not enable their production namespaces or establish provider probabilities. Provider maximum/multiplier relationships also remain unverified where the model's review codes say so.

Public health contains no balances, account rows, session values, secrets, raw schema rows or trigger function bodies. The read-only audit internally retains bounded metadata for review; the public response exposes hashes and aggregate booleans only. The carrier's fallback keeps the previous application if installation fails.

The local SQL evidence runs the hash-pinned retained `LibraryService` and `SharedWallet` against disposable PGlite. It verifies five successive accepted and settled rounds for each60, exact first/second and subsequent balance arithmetic, receipt replay, funded active reserves, canonical history and conservation. Dedicated tests cover Charging bucket restoration, same-timestamp ordering, concurrent duplicate requests, account-cap rejection and injected transaction rollback. PGlite serializes one connection, so this evidence does **not** prove multiple-process PostgreSQL lock scheduling or that production is connected to the same database.

The separate DEMO suite also runs five settled rounds for each60 in a serialized storage fixture. Its credits are explicitly `DEMO`. Settled older versions retain readable summaries without being re-evaluated under new rules. Unknown old active awards remain explicit `PREVIOUS_MODEL_RECOVERY_REQUIRED`, with fresh debits blocked until an exact trusted prior-version adapter is available; they are not discarded or recalculated.

## Build and offline preparation

```sh
node server/build-native60-registration.mjs
node server/prepare-native60-registration.mjs PRIVATE_VERIFIED_NATIVE_SOURCE PRIVATE_CLOSED_CANDIDATE PRIVATE_VERIFIED_PINS_JSON
node --test server/tests/native60-carrier.test.mjs server/tests/protected60-admission.test.mjs server/tests/native60-registration.test.mjs server/tests/demo74-worker.test.mjs
```

`server/artifacts/native60-registration-installer.mjs` and its manifest contain the current game math and additive integration, with source hashes and external imports enumerated. They contain no financial implementation or database bootstrap. The protected observation candidate is prepared separately from the exact verified protected source by `prepare-protected60-admission.mjs`; its inverse must restore the original bytes.

Private deployment pins use the `private-native60-deployment-pins-v1` input format and supply the previously verified `hostProvenance.bootstrapSha256`. Preparation fails closed if that pin is absent, malformed or does not match the supplied source. It never derives an expected pin from the candidate being checked. Private carriers, their manifests, exact host identifiers and runtime fingerprints must stay outside a public source checkpoint. Public evidence may retain authored-source hashes and isolated test results, with private deployment metadata explicitly omitted. Metadata redaction does not authorize SQL access or alter the existing admission gates.

Protected preparation also requires explicit private inputs: `prepareProtected60Admission` requires the independently verified `expectedSourceSha256`; `prepareProtected60ObservationCarrier` requires both `expectedCarrierSha256` and `expectedRuntimeSha256`. No published fallback pin is accepted. Its retained schema and transaction-prefix fixtures publish their own content hashes without the private host, deployment or whole-runtime identifiers. The private protected pin record uses `private-protected60-deployment-pins-v1` outside this repository. Missing or mismatched pins prevent preparation, while the original source-preservation, read-only guard, disabled release and SQL-proof checks remain intact.

The public checkpoint intentionally omits the generated native installer itself. Run the builder above to reproduce it locally from the published source and compare the sanitized manifest. This omission does not change the tested source or make the private deployment pins public.

A tool reporting that an update was accepted is not deployment verification. Verify the live carrier/source, deployment and health independently. No production wager is part of these tests. A later model upgrade must retain exact older adapters needed by accepted active rounds; changing a version string does not by itself provide recovery. Public provider rules and observed controls inform these independent models, but private provider probabilities, shared-session behavior and 100% provider parity are not established.

The current Worker candidate is an offline build against retained baseline inputs. Its generated-wrapper smoke uses isolated legacy stubs and does not load or verify the current live Worker source. A later live deployment change does not update those inputs or authorize replacing the existing expected-version check. Current live compatibility must be established separately before any deployment.
