# Pagination and employee action controls

User request: improve employee pagination controls/layout and add View/Edit/Delete icons.

- [x] Add Eye and Pencil icons to desktop/card actions, retaining readable labels and employee-specific accessible names.
- [x] Use Trash for Delete and preserve Restore/confirmation behavior.
- [x] Integrate a compact pagination footer into the records card: record range, page-size selector, numbered desktop pages, four compact mobile navigation icons.
- [x] Pass 6/6 focused pagination tests, preserving existing timeouts.
- [x] Verify live page-size reset, distinct page-two records and Eye/Pencil icons. Capture 1280px, 768px and 320px footer crops with no horizontal overflow.
- [x] Visually recheck the unobscured 320px footer, verify Trash2 on detail, and open/cancel Delete confirmation without employee writes.
- [ ] Include current pagination/action changes in the coordinator's combined checks and explicit-path commit.

Focused command: npm test -- src/components/employees/employee-pagination.test.tsx --maxWorkers=1 --no-file-parallelism. Result: 6/6; 163.09s total, including slow environment/module startup on this memory-constrained host; assertions completed in 6.495s. Filters, salaryStatus, contracts and backend behavior are preserved. Changing page size uses the existing navigation helper to reset page one.

Local development startup fix is c7a0dd2. The earlier read-only browser check opened View/Edit/Delete confirmation without employee writes. Earlier isolated copied-source typecheck/lint/build passed before current F10 and pagination changes. The owned disposable PostgreSQL container remains available. Git integration/push is coordinated by the dashboard thread; cross-session replies encountered a transport failure, so this file records the narrow ownership and actual evidence.

UI handoff complete: page size and page-two reads, Eye/Pencil/Trash, confirmation and responsive footer inspected on localhost:3000. No employee writes. Current config disables only the development indicator; its error portal remains. The final combined working-tree verification and commit/push remain with the integration coordinator. Re-stage the final next.config.ts, employee-table.tsx, UI handoff and appended documentation evidence before committing; they changed after the coordinator initially staged the slice.
