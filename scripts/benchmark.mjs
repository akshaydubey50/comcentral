/** Bounded local workload benchmark; emits aggregate timings and app-process memory only. */
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { cpus } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Client } from 'pg';
import { parse } from 'csv-parse/sync';

import {
  BenchmarkSafetyError,
  isolatedBenchmarkTarget,
  summarizeSamples,
} from './benchmark-helpers.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const host = '127.0.0.1';
const requestCount = 10;
const requestConcurrency = 2;
const expectedEmployeeCount = 10_000;
const seedId = 'acme-synthetic-v1';
const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

class BenchmarkError extends Error {}

function databaseClient(databaseUrl, timeoutMs = 10_000) {
  return new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
    statement_timeout: timeoutMs,
  });
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new BenchmarkError(`${name} is required`);
  return value;
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolveListen);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : undefined;
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  if (!port) throw new BenchmarkError('Unable to reserve a loopback benchmark port');
  return port;
}

async function stopApp(app) {
  if (!app || app.child.exitCode !== null) return;
  app.child.kill('SIGTERM');
  const stopped = await Promise.race([app.exited.then(() => true), delay(5_000).then(() => false)]);
  if (stopped) return;
  app.child.kill('SIGKILL');
  const killed = await Promise.race([app.exited.then(() => true), delay(2_000).then(() => false)]);
  if (!killed) throw new BenchmarkError('Benchmark app did not stop within its cleanup deadline');
}

async function startApp(databaseUrl, authSecret) {
  const port = await availablePort();
  // NextRequest normalizes loopback IP URLs to localhost. Keep authenticated
  // request origins canonical while the listener remains IPv4-loopback only.
  const baseUrl = `http://localhost:${port}`;
  const nextBin = resolve(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const sampler = pathToFileURL(resolve(scriptDirectory, 'benchmark-helpers.mjs')).href;
  const child = spawn(process.execPath, ['--import', sampler, nextBin, 'start', '-H', host, '-p', String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      BETTER_AUTH_SECRET: authSecret,
      BETTER_AUTH_URL: baseUrl,
      NODE_ENV: 'production',
      COMCENTRAL_BENCHMARK_SAMPLE_PROCESS: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });
  child.stdout.resume();
  child.stderr.resume();
  const memory = [];
  child.on('message', (message) => {
    if (message?.type === 'comcentral-benchmark-memory' && message.pid === child.pid) {
      memory.push({ rssBytes: message.rssBytes, heapUsedBytes: message.heapUsedBytes });
    }
  });
  let exitResult;
  const exited = new Promise((resolveExit) => {
    child.once('exit', (code) => resolveExit({ code }));
    child.once('error', () => resolveExit({ code: 'spawn-error' }));
  });
  void exited.then((result) => { exitResult = result; });
  const app = { child, exited, baseUrl, memory };
  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || exitResult) {
        throw new BenchmarkError(`Benchmark app exited before readiness (code ${exitResult?.code ?? child.exitCode})`);
      }
      try {
        const response = await fetch(`${baseUrl}/api/ready`, { signal: AbortSignal.timeout(1_500) });
        if (response.status === 200 && (await response.json())?.status === 'ready') return app;
        if (response.status === 503) throw new BenchmarkError('Benchmark app readiness is unavailable');
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Benchmark app readiness')) throw error;
      }
      await delay(200);
    }
    throw new BenchmarkError('Benchmark app did not become ready within 30 seconds');
  } catch (error) {
    await stopApp(app);
    throw error;
  }
}

async function querySeedInvariant(databaseUrl) {
  const client = databaseClient(databaseUrl);
  try {
    await client.connect();
    const result = await client.query(
      `SELECT
        (SELECT count(*)::int FROM "employee") AS "employeeCount",
        (SELECT count(*)::int FROM "employee" WHERE "status" = 'ACTIVE') AS "activeCount",
        (SELECT count(*)::int FROM "employee" WHERE "seed_batch" = $1) AS "seededCount",
        (SELECT count(*)::int FROM "seed_marker" WHERE "id" = $1 AND "employee_count" = $2) AS "markerCount"`,
      [seedId, expectedEmployeeCount],
    );
    const row = result.rows[0];
    if (
      row?.employeeCount !== expectedEmployeeCount ||
      row?.activeCount !== expectedEmployeeCount ||
      row?.seededCount !== expectedEmployeeCount ||
      row?.markerCount !== 1
    ) {
      throw new BenchmarkError('Benchmark database must contain exactly the reviewed 10,000-employee seed');
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function signUpAccount(app, runId, index) {
  const email = `benchmark-${runId}-${index}@example.invalid`;
  const password = `Benchmark-${randomUUID()}-password`;
  const response = await fetch(`${app.baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: app.baseUrl },
    body: JSON.stringify({ name: `Benchmark User ${index + 1}`, email, password }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new BenchmarkError(`Benchmark account creation failed with status ${response.status}`);
  const payload = await response.json();
  const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  if (!payload?.user?.id || !cookie) throw new BenchmarkError('Benchmark account creation returned an invalid session');
  return { id: payload.user.id, cookie };
}

async function cleanupAccounts(databaseUrl, accounts) {
  if (accounts.length === 0) return;
  const client = databaseClient(databaseUrl);
  try {
    await client.connect();
    const ids = accounts.map((account) => account.id);
    const appKeys = ids.flatMap((id) => [
      `app|user|imports|${id}`,
      `app|user|insights|${id}`,
      `app|user|employee-export|${id}`,
    ]);
    await client.query('DELETE FROM "rate_limit" WHERE "key" = ANY($1::text[])', [appKeys]);
    await client.query('DELETE FROM "user" WHERE "id" = ANY($1::text[])', [ids]);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function measuredRequest(app, account, definition, validate = false) {
  const started = performance.now();
  try {
    const response = await fetch(`${app.baseUrl}${definition.path}`, {
      headers: { cookie: account.cookie },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, durationMs: performance.now() - started };
    }
    if (definition.kind === 'export') {
      const csv = new TextDecoder().decode(await response.arrayBuffer());
      if (validate) {
        const records = parse(csv, { columns: false, skip_empty_lines: true });
        if (records.length - 1 !== expectedEmployeeCount) {
          throw new BenchmarkError(`${definition.name} did not return the 10,000-employee population`);
        }
      }
    } else {
      const payload = await response.json();
      if (validate) {
        const count = definition.kind === 'list' ? payload?.pagination?.total : payload?.data?.headcount;
        if (count !== expectedEmployeeCount) throw new BenchmarkError(`${definition.name} did not return the 10,000-employee population`);
      }
    }
    return { ok: true, durationMs: performance.now() - started };
  } catch (error) {
    if (error instanceof BenchmarkError) throw error;
    return { ok: false, durationMs: performance.now() - started };
  }
}

async function measureWorkload(app, accounts, definition) {
  let accountCursor = 0;
  const nextAccount = () => accounts[accountCursor++ % accounts.length];
  const first = await measuredRequest(app, nextAccount(), definition, true);
  const warm = [];
  for (let index = 0; index < requestCount; index += 1) warm.push(await measuredRequest(app, nextAccount(), definition));
  const concurrent = [];
  for (let index = 0; index < requestCount; index += requestConcurrency) {
    concurrent.push(...await Promise.all(
      Array.from({ length: Math.min(requestConcurrency, requestCount - index) }, () => measuredRequest(app, nextAccount(), definition)),
    ));
  }
  return {
    name: definition.name,
    firstRequestAfterLocalAppStart: { ok: first.ok, durationMs: Math.round(first.durationMs * 100) / 100 },
    warmSequential: summarizeSamples(warm),
    concurrent: { concurrency: requestConcurrency, ...summarizeSamples(concurrent) },
  };
}

function memorySummary(samples) {
  const toMiB = (bytes) => Math.round((bytes / 1024 / 1024) * 100) / 100;
  if (samples.length === 0) return { samples: 0, peakRssMiB: null, peakHeapUsedMiB: null };
  return {
    samples: samples.length,
    peakRssMiB: toMiB(Math.max(...samples.map((sample) => sample.rssBytes))),
    peakHeapUsedMiB: toMiB(Math.max(...samples.map((sample) => sample.heapUsedBytes))),
  };
}

function importCsv(header, prefix) {
  const rows = Array.from({ length: expectedEmployeeCount }, (_, index) => {
    const sequence = String(index + 1).padStart(5, '0');
    return `${prefix}-${sequence},Import Employee ${sequence},${prefix.toLowerCase()}-${sequence}@example.invalid,US,Engineering,Engineer,FULL_TIME,2020-01-15,60000.00,USD`;
  });
  return [header.trim(), ...rows].join('\n');
}

async function importedEmployeeCount(databaseUrl, prefix) {
  const client = databaseClient(databaseUrl);
  try {
    await client.connect();
    const result = await client.query(
      'SELECT count(*)::int AS "count" FROM "employee" WHERE "employee_code" LIKE $1',
      [`${prefix}-%`],
    );
    return result.rows[0]?.count;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function measureImport(databaseUrl, authSecret, runId) {
  const app = await startApp(databaseUrl, authSecret);
  const accounts = [];
  const prefix = `BMI-${runId}`;
  try {
    accounts.push(await signUpAccount(app, `${runId}i`, 0));
    const account = accounts[0];
    const template = await fetch(`${app.baseUrl}/api/imports/template`, {
      headers: { cookie: account.cookie },
      signal: AbortSignal.timeout(30_000),
    });
    if (!template.ok) throw new BenchmarkError('Import template request failed');
    const csvText = importCsv(await template.text(), prefix);
    const previewStarted = performance.now();
    const previewResponse = await fetch(`${app.baseUrl}/api/imports/preview`, {
      method: 'POST',
      headers: { cookie: account.cookie, origin: app.baseUrl, 'content-type': 'application/json' },
      body: JSON.stringify({ csvText }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!previewResponse.ok) throw new BenchmarkError(`10,000-row preview failed with status ${previewResponse.status}`);
    const preview = (await previewResponse.json())?.data;
    const previewMs = performance.now() - previewStarted;
    if (!preview?.valid || preview.totalRows !== expectedEmployeeCount || !preview.previewHash) {
      throw new BenchmarkError('10,000-row preview returned an invalid aggregate result');
    }
    const commitStarted = performance.now();
    const commitResponse = await fetch(`${app.baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { cookie: account.cookie, origin: app.baseUrl, 'content-type': 'application/json' },
      body: JSON.stringify({ csvText, previewHash: preview.previewHash, confirmed: true }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!commitResponse.ok) throw new BenchmarkError(`10,000-row commit failed with status ${commitResponse.status}`);
    const committed = (await commitResponse.json())?.data?.imported;
    const commitMs = performance.now() - commitStarted;
    if (committed !== expectedEmployeeCount) {
      throw new BenchmarkError('10,000-row commit returned an invalid aggregate result');
    }
    if (await importedEmployeeCount(databaseUrl, prefix) !== expectedEmployeeCount) {
      throw new BenchmarkError('10,000-row import did not persist the expected aggregate count');
    }
    return {
      rows: expectedEmployeeCount,
      previewMs: Math.round(previewMs * 100) / 100,
      commitMs: Math.round(commitMs * 100) / 100,
      appProcessMemory: memorySummary(app.memory),
    };
  } finally {
    try {
      await stopApp(app);
    } finally {
      try {
        const client = databaseClient(databaseUrl, 60_000);
        try {
          await client.connect();
          await client.query('DELETE FROM "employee" WHERE "employee_code" LIKE $1', [`${prefix}-%`]);
        } finally {
          await client.end().catch(() => undefined);
        }
      } finally {
        await cleanupAccounts(databaseUrl, accounts);
      }
    }
  }
}

async function main() {
  const applicationDatabaseUrl = required('DATABASE_URL');
  const benchmarkDatabaseUrl = isolatedBenchmarkTarget({
    url: required('BENCHMARK_DATABASE_URL'),
    variableName: 'BENCHMARK_DATABASE_URL',
    confirmation: process.env.BENCHMARK_CONFIRM_ISOLATED,
    applicationUrls: [applicationDatabaseUrl, process.env.DIRECT_URL],
  });
  const importDatabaseUrl = isolatedBenchmarkTarget({
    url: required('BENCHMARK_IMPORT_DATABASE_URL'),
    variableName: 'BENCHMARK_IMPORT_DATABASE_URL',
    confirmation: process.env.BENCHMARK_IMPORT_CONFIRM,
    applicationUrls: [applicationDatabaseUrl, process.env.DIRECT_URL],
    distinctUrls: [benchmarkDatabaseUrl],
  });
  const authSecret = required('BENCHMARK_AUTH_SECRET');
  if (authSecret.length < 32) throw new BenchmarkError('BENCHMARK_AUTH_SECRET must contain at least 32 characters');
  try {
    await access(resolve(projectRoot, '.next', 'BUILD_ID'));
  } catch {
    throw new BenchmarkError('Production build is required before benchmarking');
  }
  await querySeedInvariant(benchmarkDatabaseUrl);
  const runId = randomUUID().replaceAll('-', '').slice(0, 10);
  const accounts = [];
  const app = await startApp(benchmarkDatabaseUrl, authSecret);
  let workload;
  try {
    for (let index = 0; index < 4; index += 1) accounts.push(await signUpAccount(app, runId, index));
    const definitions = [
      { name: 'employee-list', kind: 'list', path: '/api/employees?page=1&pageSize=25' },
      { name: 'native-insights', kind: 'insights', path: '/api/insights?currencyMode=NATIVE&groupBy=country' },
      { name: 'employee-export', kind: 'export', path: '/api/employees/export?status=ACTIVE' },
    ];
    workload = [];
    for (const definition of definitions) workload.push(await measureWorkload(app, accounts, definition));
  } finally {
    try {
      await stopApp(app);
    } finally {
      await cleanupAccounts(benchmarkDatabaseUrl, accounts);
    }
  }
  const largeImport = await measureImport(importDatabaseUrl, authSecret, runId);
  const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: projectRoot, encoding: 'utf8', windowsHide: true,
  }).stdout.trim() || 'unavailable';
  const dirty = spawnSync('git', ['status', '--porcelain'], {
    cwd: projectRoot, encoding: 'utf8', windowsHide: true,
  }).stdout.trim().length > 0;
  console.log(JSON.stringify({
    measuredAt: new Date().toISOString(), revision, workingTreeDirty: dirty,
    environment: {
      node: process.version, platform: process.platform, architecture: process.arch,
      logicalCpus: cpus().length, deployment: 'local built Next.js on loopback with local PostgreSQL',
    },
    dataset: { syntheticSeed: seedId, employeeCount: expectedEmployeeCount },
    methodology: {
      firstRequestLabel: 'first request after local app start; not a provider cold start',
      warmSequentialRequests: requestCount, concurrentRequests: requestCount,
      concurrency: requestConcurrency, transientAuthenticatedUsers: 4,
    },
    workload,
    appProcessMemory: memorySummary(app.memory),
    largeImport,
  }, null, 2));
}

main().catch((error) => {
  console.error(
    error instanceof BenchmarkError || error instanceof BenchmarkSafetyError
      ? error.message
      : 'Benchmark failed due to an unexpected local runtime or database error',
  );
  process.exitCode = 1;
});
