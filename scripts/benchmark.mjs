/** Read-only request timing; prints aggregates, never employee rows or credentials. */
import 'dotenv/config';
import { performance } from 'node:perf_hooks';
const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!email || !password) throw new Error('Set E2E_EMAIL and E2E_PASSWORD.');
const auth = await fetch(base + '/api/auth/sign-in/email', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email, password }),
});
if (!auth.ok) throw new Error('Authentication failed: ' + auth.status);
const cookie = auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
if (!cookie) throw new Error('Authentication returned no session cookie.');
const results = [];
try {
  for (const path of ['/api/employees?page=1&pageSize=25', '/api/insights?currencyMode=NATIVE&groupBy=country']) {
    const samples = [];
    for (let index = 0; index < 11; index++) {
      const started = performance.now();
      const response = await fetch(base + path, { headers: { Cookie: cookie } });
      if (!response.ok) throw new Error('Request failed: ' + response.status);
      const payload = await response.json();
      samples.push({ ms: performance.now() - started, count: payload.pagination?.total ?? payload.data?.headcount });
    }
    const warm = samples.slice(1).map(value => value.ms).sort((a, b) => a - b);
    results.push({ path, employeeCount: samples[0].count, firstRequestMs: Math.round(samples[0].ms),
      warmMedianMs: Math.round((warm[4] + warm[5]) / 2), warmMaxMs: Math.round(warm[9]), samples: warm.length });
  }
  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2));
} finally {
  await fetch(base + '/api/auth/sign-out', { method: 'POST', headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' }, body: '{}' });
}
