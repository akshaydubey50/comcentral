type BrowserTestEnvironment = Readonly<Record<string, string | undefined>>;

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
// pg treats these exact keys as authority replacements (or a nested URL).
// TLS, schema, and options parameters do not select a different target.
const targetOverrideParameters = new Set(['host', 'port', 'connectionString']);

function rejectsTargetOverrides(target: URL): boolean {
  return [...target.searchParams.keys()].some((key) => targetOverrideParameters.has(key));
}

/** Real browser writes are supported only by a locally started app with a local test database. */
export function requireLocalBrowserTestTarget(environment: BrowserTestEnvironment = process.env): void {
  try {
    const app = new URL(environment.E2E_BASE_URL || 'http://localhost:3000');
    if (!['http:', 'https:'].includes(app.protocol) || !loopbackHosts.has(app.hostname) || app.username || app.password) throw new Error();
    const database = new URL(environment.DATABASE_URL || '');
    for (const raw of [environment.DATABASE_URL, environment.DIRECT_URL].filter(Boolean)) {
      const target = new URL(raw!);
      if (!['postgres:', 'postgresql:'].includes(target.protocol) || !loopbackHosts.has(target.hostname) || !decodeURIComponent(target.pathname).endsWith('_test') || rejectsTargetOverrides(target)) throw new Error();
      if (target.pathname !== database.pathname || (target.port || '5432') !== (database.port || '5432')) throw new Error();
    }
  } catch {
    // Do not include connection strings or credentials in a failed preflight.
    throw new Error('Real browser tests require a loopback app and matching local PostgreSQL databases named *_test; start the app with this test configuration first.');
  }
}
