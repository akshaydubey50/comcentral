# Vercel deployment progress

Updated 2026-10-15. Tasks: V02/D01/D02. **Priority correction: the initial deployment was made under the existing CLI identity `ankit85`, which the user says is another person's account. Do not continue deployment/configuration changes under that identity. Authenticate the user's own Vercel account through their GitHub and deploy there.** The old deployment uses `0000e67df46166461c75d1cc75cdb03eb79e6792`. The user authorizes pushing and deploying newer changes if stable. Another session is still editing; validate a fixed committed snapshot and preserve unfinished working-tree changes.

- [x] Authenticate through the user's GitHub `akshaydubey50`; verify OWNER access to `akshaydubey50s-projects` (`team_9mqKvto9iek9CpenWAv9PoEX`).
- [x] Create ComCentral (`prj_zinRtRYoAfG0KVxDQ1fQ7rbfQeSk`) in the correct team and connect GitHub `akshaydubey50/comcentral` (repo ID `1418884086`). Correct dashboard: `https://vercel.com/akshaydubey50s-projects/comcentral`.
- [x] Install global Vercel CLI 64.2.0, replace the stale CLI wrapper, select the verified own login as default, and register/authorize the shared Vercel MCP endpoint.
- [ ] Complete official Codex plugin installation and verify MCP documentation/team tools after loading them into the active session.
- [ ] Configure separate preview/demo environments in the correct account and verify deployment there.
- [ ] Resolve the previous account's deployment and stored project secrets with appropriate account access.

- [x] Confirm published GitHub revision and scope.
- [x] Create an isolated checkout of the published revision.
- [x] Independently review authentication, Prisma and cron compatibility.
- [x] Configure Vercel Next.js preset, Node 24, `npm ci`, and `npm run build`.
- [x] Configure Singapore functions and separate preview/production secrets.
- [x] Verify target migrations and preserve the 10,000 synthetic demo employees.
- [x] Provision the private HR account required by this revision; hosted login verification remains part of preview acceptance.
- [ ] Run unit tests, TypeScript, lint and production build.
- [ ] Run isolated database integration and built-browser checks.
- [ ] Deploy and verify preview login, salary history, CSV and reports.
- [x] Deploy initial production to `https://comcentral.vercel.app` (`0000e67`, Vercel READY).
- [x] Verify initial hosted HR login/logout and session revocation, 10,000 employees, native reports, complete CSV export, secure cookies and unauthorized cron rejection.
- [ ] Review and validate the newer committed release candidate, including migrations and real browser journeys.
- [ ] Push the verified candidate to GitHub without unfinished edits.
- [ ] Apply required forward migrations to preview/demo and deploy the verified newer revision.
- [ ] Verify the updated homepage, public registration, salary-pending CSV behavior and persistent demo records.
- [ ] Verify live FX refresh and authenticated daily cron configuration.
- [ ] Verify data persistence after redeployment.
- [ ] Record deployed URL/revision/results and stop owned test infrastructure.

The first actual scheduled invocation is a separate D02 follow-up. Manual refresh and configured scheduling must not be described as proof of a scheduled run. Use [the deployment runbook](deployment.md) for procedures and [validation.md](validation.md) for current execution results.
