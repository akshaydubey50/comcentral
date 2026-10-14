# Public registration integration

The user approved public registration with immediate access to the existing shared HR workspace. No invitation, administrator approval, email verification, or role selection gates access.

## Frontend implementation

- `/login` links to `/register`; `/register` links back to `/login`.
- Passwords use 5-128 characters following the user decision on 2026-10-14. Login, registration, and confirmation fields have independent, keyboard-accessible show/hide controls and remain hidden initially.
- The registration form validates name, work email, a 5-128 character password, and matching confirmation. It trims name/email and lowercases email; it preserves the password exactly.
- `api.signUp(name, email, password)` posts JSON `{name, email, password}` to `/api/auth/sign-up/email`, using same-origin cookies. Confirmation is not sent. Returned token data is discarded.
- After a successful signup response, the frontend clears password fields and checks `GET /api/session`. An authenticated response seeds the shared session cache and redirects to `/`. Already signed-in visitors also go to `/`.
- If account creation succeeds but the session is missing or unavailable, the form is replaced with a sign-in recovery link. It never automatically repeats account creation.
- Validation, duplicate-email, disabled-signup, rate-limit, and network errors remain on the form with actionable messages.

## Backend integration

The backend now enables public signup with automatic sign-in, transactional credential/session creation, strict normalized input validation, and database-backed signup throttling. Private provisioning remains session-free. The integration implements the following agreed behavior:

1. Enable public email/password signup on the auth instance used by `/api/auth/[...all]`.
2. Enable automatic sign-in and issue the authenticated session cookie on successful registration. Do not require email verification.
3. Keep the current password policy aligned with the frontend, enforce input validation and unique normalized emails, and preserve origin checks and signup rate limiting.
4. Verify duplicate-email responses. Installed Better Auth 1.7.7 returns `422` with code `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` when automatic sign-in is enabled. With `autoSignIn: false`, it can instead return a synthetic successful response for duplicate accounts; that setting does not satisfy this approved flow.
5. Verify `GET /api/session` reports the newly created HR account and existing business-data routes continue requiring a valid session.

The frontend uses the existing Better Auth request shape and `HrUser` session shape; no shared contract changes were needed. The behavior was checked against the installed source and [Better Auth's email/password documentation](https://better-auth.com/docs/authentication/email-password).

## Integration acceptance

In an isolated test database, follow login -> Create account -> submit valid details -> authenticated dashboard. Verify duplicate/invalid submissions, logout/login, protected routes, and rate limiting. Frontend browser fixtures do not prove real account persistence or cookie issuance.

Frontend browser coverage lives in `tests/e2e/registration.spec.ts`. With a running app and the configured Playwright browser installed, run `npm run test:e2e -- tests/e2e/registration.spec.ts`; all API requests in those journeys are intercepted and no real accounts are created.

Real PostgreSQL coverage lives in `tests/integration/registration.integration.test.ts`, including normalized/concurrent duplicates, injected account/session failures, safe error logging, cookie-based protected access, login/logout, provisioning and throttling. `tests/e2e/registration-live.spec.ts` exercises the actual form against an isolated application database and requires the explicit `E2E_ALLOW_REGISTRATION=true` opt-in. CI enables it only against its disposable PostgreSQL service. Sensitive browser traces/screenshots are disabled for this live registration journey.
