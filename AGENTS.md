# ComCentral working agreement

Build the approved scope in docs/requirements.md. Use Next.js App Router, TypeScript, Material UI, PostgreSQL/Prisma 7 and Better Auth. Shared API types in src/shared/contracts.ts are the integration contract; coordinate changes before editing. Monetary values cross the API as decimal strings. Public HR registration with immediate authenticated access is approved; invitations, administrator approval, and email verification must not gate workspace access. No mock production data or silent FX fallback.

Run npm test, npm run typecheck, npm run lint and npm run build. Database tests require an isolated TEST_DATABASE_URL and must never target production. Do not expose .env files. Work in vertical slices with meaningful deterministic tests. Frontend owns src/components, src/lib/api-client.ts, src/app/(dashboard), src/app/login, src/app/register, src/app/globals.css. Backend owns prisma, prisma.config.ts, src/server, src/app/api, src/shared/validation.ts. Coordinator owns root configuration, contracts, integration, docs, CI, and Git. No nested delegation.

## Delivery and evidence

Use [docs/README.md](docs/README.md) to locate the maintained guide for each topic. Keep changing work status in tasks/todo.md and execution results in docs/validation.md; consolidate temporary handoffs when their active owner completes the work.

Read PROJECT_SPEC.md and the assigned task in tasks/todo.md. Implement one coherent slice, run its meaningful checks, review the diff and create the user-authorized incremental commit. Coordinate shared contracts and file ownership. Preserve unrelated changes and never use a broad staging command in a dirty tree.

Keep significant decisions and rejected alternatives in docs/architecture.md, AI contributions/corrections in docs/ai-use.md, and actual execution results in docs/validation.md. Link evidence to task IDs and commits. Distinguish implemented, locally verified and deployed states; do not duplicate changing status checklists in agent instruction files. CLAUDE.md points to this same agreement.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
