export class BenchmarkSafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BenchmarkSafetyError';
  }
}

function normalizedHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1').replace(/\.$/, '');
  if (
    host === 'localhost' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    /^127(?:\.\d{1,3}){3}$/.test(host)
  ) return 'loopback';
  return host;
}

function databaseIdentity(raw, variableName) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new BenchmarkSafetyError(`${variableName} must be a valid PostgreSQL URL`);
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new BenchmarkSafetyError(`${variableName} must use PostgreSQL`);
  }
  let databaseName;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    throw new BenchmarkSafetyError(`${variableName} must include a valid database name`);
  }
  if (!parsed.hostname || !databaseName) {
    throw new BenchmarkSafetyError(`${variableName} must include a host and database name`);
  }
  return {
    host: normalizedHost(parsed.hostname),
    port: parsed.port || '5432',
    databaseName,
  };
}

function sameTarget(left, right) {
  return left.host === right.host && left.port === right.port && left.databaseName === right.databaseName;
}

/** Require a separately acknowledged loopback *_test database without exposing its URL. */
export function isolatedBenchmarkTarget({
  url,
  variableName,
  confirmation,
  applicationUrls = [],
  distinctUrls = [],
}) {
  if (confirmation !== 'YES') {
    throw new BenchmarkSafetyError(`${variableName} requires its explicit isolation confirmation`);
  }
  if (!url?.trim()) throw new BenchmarkSafetyError(`${variableName} is required`);
  const target = databaseIdentity(url.trim(), variableName);
  if (target.host !== 'loopback') {
    throw new BenchmarkSafetyError(`${variableName} must target a loopback database`);
  }
  if (!target.databaseName.toLowerCase().endsWith('_test')) {
    throw new BenchmarkSafetyError(`${variableName} database name must end in _test`);
  }
  for (const candidate of [...applicationUrls, ...distinctUrls]) {
    if (!candidate?.trim()) continue;
    if (sameTarget(target, databaseIdentity(candidate.trim(), 'comparison database URL'))) {
      throw new BenchmarkSafetyError(`${variableName} must not target an application or reused benchmark database`);
    }
  }
  return url.trim();
}

const rounded = (value) => Math.round(value * 100) / 100;

function percentile(sorted, fraction) {
  if (sorted.length === 0) return null;
  return rounded(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]);
}

/** Summarize only successful request latency plus aggregate error counts. */
export function summarizeSamples(samples) {
  const successful = samples.filter((sample) => sample.ok).map((sample) => sample.durationMs)
    .sort((left, right) => left - right);
  const errorCount = samples.length - successful.length;
  return {
    samples: samples.length,
    successes: successful.length,
    errors: errorCount,
    errorRate: samples.length === 0 ? 0 : rounded(errorCount / samples.length),
    p50Ms: percentile(successful, 0.5),
    p95Ms: percentile(successful, 0.95),
    maxMs: successful.length === 0 ? null : rounded(successful.at(-1)),
  };
}

if (process.env.COMCENTRAL_BENCHMARK_SAMPLE_PROCESS === 'true' && typeof process.send === 'function') {
  const reportMemory = () => {
    const memory = process.memoryUsage();
    process.send?.({
      type: 'comcentral-benchmark-memory',
      pid: process.pid,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
    });
  };
  reportMemory();
  setInterval(reportMemory, 100).unref();
}

