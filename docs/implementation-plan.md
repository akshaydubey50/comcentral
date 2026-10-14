# Delivery plan

1. Requirements and shared contracts (coordinator).
2. Parallel frontend and backend: provisioned HR login + employee directory first; salary changes/history + archive second; CSV migration third; analytics/FX fourth. Workers report each verifiable slice.
3. Coordinator integrates, verifies unit/UI/database/browser journeys, records performance on the 10,000-employee seed.
4. Validate free-tier deployment with real database and authenticated access, capture demo, prepare repository submission.

Status: frontend and backend source implementation and coordinator review are complete; dependency-backed integration remains pending. Five focused native Node smoke checks and TypeScript syntax checks passed. npm installation, database verification, full test/build checks, deployment and video are still pending. See validation.md for evidence.
