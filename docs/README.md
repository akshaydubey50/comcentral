# ComCentral documentation

These are the maintained project documents. Scope, decisions, operating instructions, current work and execution evidence have separate owners so changing status is recorded once.

## Start here

- [Project README](../README.md): portable local setup, optional demo data, development and verification commands.
- [One-page requirements](requirements.md) and [PDF](requirements.pdf): approved problem, first-release scope and exclusions.
- [Product and engineering specification](../PROJECT_SPEC.md): detailed acceptance boundaries; a requirement is not a completion claim.
- [Reviewer guide](reviewer-guide.md): five-minute reading path, implementation entry points and compact demo scenario.
- Six-minute demo walkthrough (`docs/demo-walkthrough-6min.md`; active owner handoff): recording rehearsal, conditional narration and synthetic sample-asset instructions. The recorded video remains pending.

## Design and contracts

- [Architecture and decisions](architecture.md): current system boundaries, dated decisions and rejected alternatives.
- [API contract](api-contract.md): HTTP, authentication, money, employee, import, filter and request-limit behavior.
- [Reporting and FX rules](analytics-rules.md): exact statistics, tenure, outlier, pending-salary and conversion semantics.
- [CSV data guide](csv-data-guide.md): portable template, aliases, limits, preview and atomic-import workflow.

## Operations and evidence

- [Deployment and operations](deployment.md): account boundary, environment isolation, release procedure, scheduling, monitoring and recovery.
- [Active Vercel deployment handoff](vercel-deployment-checklist.md): temporary owner-specific progress and cleanup notes for the current deployment session. Validation remains the execution ledger and the task board remains the work owner.
- [Performance](performance.md): workload method, dated measurements, budgets and optimization triggers.
- [Validation evidence](validation.md): canonical dated execution results and their revision/environment limits.
- [AI-use record](ai-use.md): substantive AI contributions, corrections, checks and unresolved uncertainty.
- [Task board](../tasks/todo.md): the sole current implementation and delivery work list.

## Contributor entry points

- [AGENTS.md](../AGENTS.md): working agreement, ownership, evidence and quality gates.
- [CLAUDE.md](../CLAUDE.md): short pointer to the same agreement.

## Historical context

- [Documentation history, 2026-10-15](archive/2026-10-15-documentation-history.md): superseded designs and handoffs retained for traceability. It is not current product guidance or execution status.

## Maintenance rules

- Change the document that owns the subject instead of copying guidance or status into several files.
- Record current work once in [tasks/todo.md](../tasks/todo.md) and execution results once in [validation.md](validation.md).
- Attach a date, commit or source revision, environment and limitations to every execution claim.
- Archive only superseded material with unique historical value; do not use the archive as current guidance.
- Check links and checker behavior after documentation changes:

```powershell
node scripts/check-docs.mjs
node --test scripts/check-docs.test.mjs
```
