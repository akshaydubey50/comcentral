# Approved dashboard design direction

The user selected **Use this overall direction** after reviewing the combined dashboard/pagination preview on 2026-10-15. The HTML/CSS preview is [dashboard-pagination.html](design-previews/dashboard-pagination.html). It uses labelled sample values; approval covers the layout direction, not a claim that all charts are already integrated with production data.

User direction, 2026-10-15: use the PayScope comparison to improve ComCentral's dashboard and interview demonstration, while selecting impactful improvements rather than copying the reference. The structure below is a design direction; it is not a claim that all screens are implemented or verified.

## Screen purpose

Help an HR manager understand the current filtered workforce, recognize missing compensation data, compare recorded pay and open the records behind a concern. The primary action in the first slice is **Review pending salaries**. All values originate from the authenticated application; no demonstration values are embedded in production components.

## First implemented slice: F10

Retain the current dashboard header, applied filters, native/approximate-USD controls and reporting-date context. Add a Data readiness section before the detailed reporting:

- **Salary coverage:** recorded salaries divided by matching headcount, an accessible progress indicator, exact counts, pending exclusions and links to matching/recorded/pending employees.
- **Outlier coverage:** evaluated versus total cohorts, evaluated employee counts, below-minimum and zero-spread exclusions, peer definition and a link to the existing outlier review.
- **Currency reporting:** actual FX freshness, dated provider provenance when available, and an explicit distinction between native reporting and unavailable USD conversion.

Links use the applied filter state, reset employee pagination and retain archive status. Salary status is visible in the destination filter bar, retained by export and removed by Clear. The readiness section uses the complete Insights response and remains usable when filter choices or FX are unavailable.

Use the established teal palette, MUI typography, cards and spacing. Three panels sit alongside one another at desktop widths and stack on phones. Text labels communicate status independently of color. Navigation targets are at least 44px high; exact counts remain readable without hover. Partial salary coverage must never round to 100%.

## Subsequent proposed presentation slices

1. A compact summary row for matching employees, recorded annual commitments in the selected currency, comparable group medians and review flags. Cross-currency salary rankings are never combined without a valid dated conversion.
2. A full-width P25-to-P75 pay comparison with a median marker and independently understandable labels.
3. Distribution and tenure charts side by side on wide screens, stacked on phones; retain exact accessible tables beneath expandable controls.
4. A clearer outlier review with phone cards and evidence about peer groups and statistical fences.

These presentation changes reuse existing report calculations where possible. Independent workforce headcount, including pending salaries, must not be inferred from salary-only groups.

## Later product candidates

A preview-only, single-currency budget simulator would show current/proposed annual commitments, added cost, affected employees and exclusions, calculated deterministically on the server. Saved report snapshots would preserve filters, reporting time and FX identity. Neither candidate is implemented by F10; applying bulk salary changes needs its own approved design.

## Verification boundary

Test empty/all-pending/mixed populations, partial-coverage rounding, unavailable/cached FX and outlier exclusions. Verify URL/filter/export consistency, keyboard operation and 320/768/1280px layouts. Record actual results in validation.md and completion in tasks/todo.md. A full visual mockup and later chart layout remain to be finalized.
