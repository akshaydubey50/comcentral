# ComCentral working agreement

Build the approved scope in docs/requirements.md. Use Next.js App Router, TypeScript, Material UI, PostgreSQL/Prisma 7 and Better Auth. Shared API types in src/shared/contracts.ts are the integration contract; coordinate changes before editing. Monetary values cross the API as decimal strings. No public registration, mock production data, or silent FX fallback.

Run npm test, npm run typecheck, npm run lint and npm run build. Database tests require an isolated TEST_DATABASE_URL and must never target production. Do not expose .env files. Work in vertical slices with meaningful deterministic tests. Frontend owns src/components, src/lib/api-client.ts, src/app/(dashboard), src/app/login, src/app/globals.css. Backend owns prisma, prisma.config.ts, src/server, src/app/api, src/shared/validation.ts. Coordinator owns root configuration, contracts, integration, docs, CI, and Git. No nested delegation.
