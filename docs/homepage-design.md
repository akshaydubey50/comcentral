# Public homepage design (FR-11 / F09)

The homepage helps an HR visitor understand ComCentral and choose Create account or Sign in. It explains the implemented product before asking the visitor to register. The PayScope comparison identified public product presentation as an improvement; ComCentral uses its own content, components and visual style.

## Layout and content

1. **Header:** linked ComCentral identity, Features and How it works anchors, and Sign in. All links stay visible on phones; navigation wraps below the identity.
2. **Introduction:** "Know your people. Understand their pay." pairs a direct sans-serif heading with an italic serif phrase. Create account leads to registration; Explore the workspace scrolls to capabilities. A connected-record illustration links employee directory, salary history and pay insights to their explanatory sections. It uses concepts, not fabricated application data.
3. **Capabilities:** four numbered editorial rows explain employee maintenance and filtered export; CSV validation and confirmation; salary changes with reason/author/date/history; native-currency pay and tenure reporting with conditional dated USD conversion.
4. **Workflow:** create an HR account, add or import employee records, then maintain pay and inspect reports. Three ordered steps describe actual actions without presenting a fabricated dashboard.
5. **Access explanation:** all HR accounts share the same organization's records. Registration requires no invitation or approval. A final registration action follows this explanation.
6. **Footer:** product identity and workspace entry for returning users.

Use the existing teal and warm paper palette with restrained copper accents, dotted record paper, connecting lines and an offset paper shadow. These details express ComCentral's record/history/reporting workflow. The desktop hero has two columns; tablet and phone layouts stack it. Feature rows align number, heading and explanation on desktop, with explanations below headings on phones. Workflow steps become three columns on desktop. Scoped CSS keeps presentation separate from application theme and interaction logic; Material UI retains the account controls.

Keep readable body text, 44px action targets, semantic heading/landmark order, a keyboard skip link and visible focus. Honor the existing reduced-motion preference. Verify at 320, 768 and 1280px. The custom layout and copy were authored for ComCentral; the PayScope comparison informed feature analysis, not a copied page or asset.

## Link contract

| Control | Destination |
|---|---|
| Skip to content | `#home-content`, focusing the main landmark |
| ComCentral identity | `/`, preserving session-aware home behavior |
| Features / Explore the workspace | `#features` |
| How it works | `#how-it-works` |
| Employee directory / Salary history / Pay insights | `#directory` / `#salary-history` / `#reporting` |
| Create account / Get started with ComCentral | `/register` |
| Sign in / Open your workspace | `/login`; an existing authenticated session returns to `/` |

Browser acceptance follows every control to its destination and checks the resulting heading or section, rather than treating an href assertion alone as successful navigation.

## Routing and states

The existing AppShell resolves the session. Confirmed anonymous `/` shows the shared welcome presentation; authenticated `/` retains the overview. Anonymous protected deep links redirect to login. Loading and failed session checks keep their existing loading/retry states, rather than incorrectly treating a failed request as anonymous. `/welcome` remains a public Server Component entry that does not fetch application data or require a session.

Registration and login keep their existing session-confirmed redirect to `/`. Business-data APIs still enforce authorization independently of the page presentation. Native anchor-backed Material UI actions remain serializable when the presentation is rendered from `/welcome`.

## Alternatives and boundaries

Moving the overview to `/dashboard` would change existing bookmarks, links and post-login redirects without a user benefit here. Keeping the introduction only at `/welcome` made the normal entry unclear. Reusing the presentation at anonymous `/` addresses that issue with the existing session state and without another routing system.

Do not add invented customer counts, fabricated salary charts, testimonials, pricing, paid tiers, or claims of completed operational verification. Do not describe payroll, multi-organization isolation or AI salary recommendations as implemented features. Delivery evidence remains in [validation.md](validation.md), and the original reference findings remain in [payscope-comparison.md](payscope-comparison.md).
