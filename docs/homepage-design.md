# Public homepage design (FR-11 / F09)

The homepage helps an HR visitor understand ComCentral and choose Create account or Sign in. It explains the implemented product before asking the visitor to register. The PayScope comparison identified public product presentation as an improvement; ComCentral uses its own content, components and visual style.

## Layout and content

1. **Header:** ComCentral identity, Features and How it works anchors, and Sign in. On narrow screens, keep identity and Sign in; the sections remain in the normal reading order.
2. **Introduction:** a single clear heading about employee records and pay context, a short description, prominent Create account and secondary Sign in actions. Explain immediate shared-workspace access.
3. **Capabilities:** employee maintenance and filtered export; CSV validation and confirmation; salary changes with reason/author/date/history; native-currency pay and tenure reporting with conditional dated USD conversion.
4. **Workflow:** create an HR account, add or import employee records, then maintain pay and inspect reports. Three ordered steps describe actual actions without presenting a fabricated dashboard.
5. **Access explanation:** all HR accounts share the same organization's records. Registration requires no invitation or approval. A final registration action follows this explanation.
6. **Footer:** product identity and workspace entry for returning users.

Use the existing teal, warm background, typography and Material UI controls. Feature content is two columns from tablet width and one column on phones; workflow steps become three columns on desktop. Keep readable body text, 44px action targets, semantic heading/landmark order, a keyboard skip link and visible focus. Verify at 320, 768 and 1280px.

## Routing and states

The existing AppShell resolves the session. Confirmed anonymous `/` shows the shared welcome presentation; authenticated `/` retains the overview. Anonymous protected deep links redirect to login. Loading and failed session checks keep their existing loading/retry states, rather than incorrectly treating a failed request as anonymous. `/welcome` remains a public Server Component entry that does not fetch application data or require a session.

Registration and login keep their existing session-confirmed redirect to `/`. Business-data APIs still enforce authorization independently of the page presentation. Native anchor-backed Material UI actions remain serializable when the presentation is rendered from `/welcome`.

## Alternatives and boundaries

Moving the overview to `/dashboard` would change existing bookmarks, links and post-login redirects without a user benefit here. Keeping the introduction only at `/welcome` made the normal entry unclear. Reusing the presentation at anonymous `/` addresses that issue with the existing session state and without another routing system.

Do not add invented customer counts, fabricated salary charts, testimonials, pricing, paid tiers, or claims of completed operational verification. Do not describe payroll, multi-organization isolation or AI salary recommendations as implemented features. Delivery evidence remains in [validation.md](validation.md), and the original reference findings remain in [payscope-comparison.md](payscope-comparison.md).
