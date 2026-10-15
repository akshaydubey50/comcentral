# How AI contributed to ComCentral

This record explains what the user requested, what Codex and its agents contributed, what review changed, and where to inspect the result. It summarizes work rather than reconstructing prompts or quoting private conversations.

The user made product and scope decisions. A Codex coordinator split work into bounded tasks, coordinated shared contracts, reviewed agent output, and integrated changes. Frontend, backend, review, deployment, and documentation agents worked within assigned ownership. Generated output remained provisional until source review or execution supported it.

Significant decisions belong in [architecture.md](architecture.md). Current execution results belong in [validation.md](validation.md). Remaining work belongs in [tasks/todo.md](../tasks/todo.md). The latest recorded runtime continuous integration run still failed its browser job, so earlier successful slices do not make the current revision release-qualified.

## Phase 1: Establish access and data integrity

### Public HR registration and session handoff

**Request:** Add public HR registration with immediate access to the shared workspace. Use a 5-character public password minimum and no invitation, approval, or email-verification gate.

**AI contribution:** Backend and frontend agents implemented transactional signup, normalized validation, registration and login forms, independent password visibility controls, and session confirmation before workspace navigation.

**Review/correction:** The user chose the 5-128 public policy. Agent review found that login could redirect before the browser confirmed the session. The separate provisioning script kept its 12-128 policy because it is an optional private operator path.

**Outcome/checkable source:** Commits `f6ff9be` and `d29c4fd`; [API contract](api-contract.md#authentication-and-public-exceptions); `src/server/registration.ts`; `prisma/provision-user.ts`.

### Versioned salary changes and preserved history

**Request:** Keep salary changes auditable, reject stale edits, retain history after archive, and preserve an editor's unsaved work during background refreshes.

**AI contribution:** Agents implemented atomic salary and history writes, optimistic version checks, required reasons, history display, and explicit conflict recovery in the salary dialog.

**Review/correction:** Agent review added a missing salary read-version guard, retained the opening salary version, and stopped background refetches from erasing a draft. The approved scope keeps archive as a reversible status change rather than record deletion.

**Outcome/checkable source:** Backend commit `cda9ae7`, UI commit `f8012cb`, conflict-recovery commit `cfb0646`, and test-stabilization commit `568d808`; [architecture decisions](architecture.md); [employee API contract](api-contract.md#shared-employee-and-money-semantics).

### Pending salary through CSV import

**Request:** Import the supplied CSV shape without inventing salary data. Support source identifiers, approved aliases and values, and a 10,000-row limit.

**AI contribution:** Agents inspected field structure without exposing employee rows, wrote failing parser and persistence cases, added nullable imported salary, and carried pending status through list, export, reporting, and first-salary assignment.

**Review/correction:** The user approved source `id` mapping, pending salary, France, Brazil, BRL, and interns. The user rejected a proposed higher row limit. Agent review corrected file-selection races and browser locators without weakening assertions.

**Outcome/checkable source:** Commit `1b4e1a5`; [CSV guide](csv-data-guide.md); [import contract](api-contract.md#csv-import-contract); [historical checkpoint](validation.md#verified-historical-feature-checkpoints).

### Exact reporting and dated FX conversion

**Request:** Keep native salary authoritative, provide dated approximate USD reporting, and return no converted totals when rates are unusable.

**AI contribution:** Backend agents implemented exact decimal calculations, immutable dated rate snapshots, checksum verification, completeness and age checks, and conversion that preserves the native records.

**Review/correction:** Agent review reproduced acceptance of a checksum-mismatched stored snapshot and added read-time verification. Product review kept pending employees in headcount while excluding them from pay summaries, bands, tenure statistics, and outlier cohorts.

**Outcome/checkable source:** Commit `f828883`, with pending-pay integration in `1b4e1a5`; [reporting and FX rules](analytics-rules.md); `src/server/domain/fx.ts`; `src/server/domain/analytics.ts`.

### Safe seed, benchmark, and test targets

**Request:** Prevent destructive seed and verification tools from using production or unrelated application databases.

**AI contribution:** Agents added parsed connection checks, suffix and acknowledgement requirements, separate test-target guards, and refusal paths for unsafe seed and benchmark targets.

**Review/correction:** PostgreSQL URL review exposed query-parameter overrides and encoded-host cases that name-only checks missed. The correction validates the connection each tool actually consumes and still treats the guard as a final check, not proof of ownership.

**Outcome/checkable source:** Commit `a217afe`; `src/server/domain/seed-target.ts`; `tests/integration/test-database.ts`; `scripts/benchmark-helpers.mjs`.

## Phase 2: Verify browser behavior and workload

### Public welcome routing

**Request:** Make the signed-out root a useful product introduction with working registration and login paths while keeping signed-in navigation direct.

**AI contribution:** A frontend agent created the session-aware welcome flow and original connected-record presentation. The coordinator integrated it with root routing and the existing authentication contract.

**Review/correction:** A built-browser run caught a Server Component serialization error that unit tests and compilation missed. Agent review replaced function-valued account links with native links instead of converting the page into a client component.

**Outcome/checkable source:** Commit `3873b7c`, followed by the root presentation in `2a7e3d4`; [browser evidence](validation.md#verified-historical-feature-checkpoints).

### Directory filters, pagination, and actions

**Request:** Make combined filters work, complete page navigation, preserve URL state, and keep employee actions usable across screen sizes.

**AI contribution:** Frontend and backend agents traced browser state through shared validation, API queries, database filters, and list rendering. They added complete navigation, filter persistence, stale-page recovery, and responsive action presentation.

**Review/correction:** Backend review confirmed that combined server filters already used AND semantics. Frontend review found missing controls, false empty states after result-count changes, and blank selected values. Later integration retained numeric page-size callers and pending-salary filters.

**Outcome/checkable source:** Commits `2140367`, `cf3da2b`, and `856c0a5`; [current release assessment](validation.md#current-release-assessment); [task board](../tasks/todo.md).

### Measured 10,000-employee workload

**Request:** Measure the approved workload before adding streaming export or custom reporting queries.

**AI contribution:** The performance agent added guarded local benchmark tooling for seeded reads, reporting, export, and a 10,000-row import. It recorded aggregate timing and memory data without employee rows or connection details.

**Review/correction:** Review kept export and reporting rewrites conditional because the measured baseline did not justify changing established ordering, rounding, and failure behavior. The record excludes provider cold starts, hosted latency, and a capacity guarantee.

**Outcome/checkable source:** Benchmark tooling in commit `331801b`; clean measured baseline `2a7e3d4`; [performance method and limits](performance.md).

### F10 readiness and F11 dashboard direction

**Request:** Explain how much filtered data has recorded pay, link reviewers to matching employees, and improve dashboard presentation without creating salary recommendations.

**AI contribution:** Agents added full-population readiness and `PENDING` and `RECORDED` filtering across directory, reports, and export. They later implemented the approved Recharts presentation with compact summaries, exact-data disclosures, native-currency selection, grouped pay ranges, distributions, and tenure views.

**Review/correction:** Independent agent review caught coverage rounding that could display 100% with pending salaries and corrected shared filter guidance. The user approved the F11 direction and Recharts. Later review restored population statistics, handled all-pending charts, clarified native and approximate-USD copy, and added group-count labels. The source is implemented and deployed; recorded deployed UI checks used intercepted deterministic API responses, so final real-API browser release acceptance remains open.

**Outcome/checkable source:** F10 implementation `cf3da2b`; F11 implementation `8030c13`, responsive correction `9015a75`, and evidence update `6fb3eee`; [dashboard implementation record](dashboard-ui-implementation.md); [current validation](validation.md#f11-published-react-dashboard-2026-10-15). The recorded core CI gates passed, but its broader browser stage failed.

## Phase 3: Correct delivery and documentation claims

### Deployment identity and release boundary

**Request:** Deploy through the user's own Vercel and GitHub ownership, preserve the synthetic dataset, and verify hosted behavior without exposing credentials.

**AI contribution:** The deployment agent created the owned project, applied the forward migration, rotated the application database credential, revoked the old credential, and recorded hosted smoke observations for `cadc103`.

**Review/correction:** The user identified `ankit85` as another person's account and stopped further work under that identity. The correction moved deployment work to the user's project. Agent review keeps the hosted smoke separate from the failed `cadc103` browser job and open persistence acceptance.

**Outcome/checkable source:** [Deployment observations](validation.md#deployment-and-operational-evidence-boundary) and [D01/V02 work](../tasks/todo.md#priority-delivery-acceptance). The current runtime gate is still failed.

### Branded real-404 recovery

**Request:** Add a polished unknown-route page that preserves real 404 status, works at nested URLs, and provides accessible recovery links.

**AI contribution:** The coordinator checked the installed Next.js routing guidance, implemented the root boundary and scoped styles, and added public browser cases for status, URL preservation, keyboard access, and responsive widths.

**Review/correction:** Concurrent dashboard edits blocked the shared type and build gates. The agent verified the exact F12 files on a committed baseline and kept those results separate from the failing shared workspace. This did not change authentication, APIs, or employee data.

**Outcome/checkable source:** Commit `abf502b`; [F12 execution record](validation.md#f12-branded-404-verification-2026-10-15); [F12 task](../tasks/todo.md#f12-branded-404-and-unknown-route-recovery).

### PayScope-informed documentation structure

**Request:** Compare the project documentation with PayScope, retain only useful project records, and make AI contribution and correction evidence readable.

**AI contribution:** The documentation review used PayScope's pinned [AI prompts record](https://github.com/meganathan-tech24/PayScope/blob/f6da3bb170eee144fddf312529e83533bfe6fba5/docs/ai-prompts.md) as a structural reference. This page adopts labeled request, contribution, review, and outcome sections without copying its prose, claims, prompts, or code.

**Review/correction:** The user chose which project documents and historical artifacts to remove. Agent review source-checked the retained claims, removed exhaustive model-routing detail, and avoided reconstructed prompts or unverified manual-review claims.

**Outcome/checkable source:** The maintained responsibilities are listed in [the documentation index](README.md). Decisions remain in [architecture.md](architecture.md), execution in [validation.md](validation.md), and current work in [tasks/todo.md](../tasks/todo.md).

## Evidence limits

Source inspection, intercepted browser responses, isolated PostgreSQL checks, production-build browser checks, and hosted HTTPS observations establish different facts. This record does not combine them into a stronger claim.

A commit proves what changed, not that the current revision passes every gate. Use the validation ledger for dates, environments, failures, and limitations. Use the task board for unresolved release, deployment, scheduled FX, recovery, and video work.
