# Synthetic seed safety

The seed command creates exactly 10,000 deterministic synthetic employees. It does not supply production data. Before opening a connection it requires `COMCENTRAL_SEED_TARGET=demo` or `test`, a database ending in the corresponding `_demo` or `_test` suffix, and `COMCENTRAL_SEED_DATABASE_ACK` matching that database name exactly. `NODE_ENV=production` is refused. These explicit operator checks supplement database access controls; naming a database does not establish its provenance.

For a dedicated database named `comcentral_demo`, configure its URL privately and run:

```bash
COMCENTRAL_SEED_TARGET=demo COMCENTRAL_SEED_DATABASE_ACK=comcentral_demo npm run db:seed
```

The service locks the employee and seed-marker tables before reading preconditions inside one serializable transaction. It refuses unrelated employees/markers, inserts in batches, and verifies exact counts before committing. A later-batch failure rolls back both the marker and all rows. Concurrent first runs serialize; an unchanged repeat reports completion. A writer that commits first makes the seed refuse the populated target. Normal demo imports may run after the seed commits; a later repeat then refuses the changed population rather than deleting anything.

Seed integration tests use a dedicated, migrated, initially empty `SEED_TEST_DATABASE_URL`, distinct from the application and ordinary integration databases. Cleanup removes only test-owned fixtures. The suite must not share its empty-target requirement with salary/import fixtures.

Verified 2026-10-14: 10 offline guard cases and 4 PostgreSQL cases passed: concurrent first/repeat runs with exactly 10,000 rows, injected later-batch rollback, writer-first refusal, and preservation of an unrelated seed marker. No real employee database was seeded. CLI errors expose known refusal messages or a generic failure, never raw database exceptions.
