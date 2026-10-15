import assert from 'node:assert/strict';
import test from 'node:test';

import { isolatedBenchmarkTarget, summarizeSamples } from './benchmark-helpers.mjs';

test('isolatedBenchmarkTarget accepts an acknowledged loopback test database', () => {
  const url = 'postgresql://benchmark:private@127.0.0.1:5439/comcentral_benchmark_test?sslmode=require&schema=public&options=-c%20search_path%3Dpublic';
  assert.equal(isolatedBenchmarkTarget({
    url,
    variableName: 'BENCHMARK_DATABASE_URL',
    confirmation: 'YES',
  }), url);
  const encodedAuthorityUrl =
    'postgresql://benchmark:private@%6cocalhost:5439/comcentral_benchmark_test';
  assert.equal(isolatedBenchmarkTarget({
    url: encodedAuthorityUrl,
    variableName: 'BENCHMARK_DATABASE_URL',
    confirmation: 'YES',
  }), encodedAuthorityUrl);
});

test('isolatedBenchmarkTarget rejects parser target overrides including encoded and duplicate keys', () => {
  const urls = [
    'postgresql://benchmark:private@127.0.0.1/comcentral_test?host=remote.example',
    'postgresql://benchmark:private@127.0.0.1/comcentral_test?%68ost=remote.example',
    'postgresql://benchmark:private@127.0.0.1/comcentral_test?host=&host=remote.example',
    'postgresql://benchmark:private@127.0.0.1/comcentral_test?port=6432',
    'postgresql://benchmark:private@127.0.0.1/comcentral_test?%70ort=6432',
    'postgresql://benchmark:private@127.0.0.1/comcentral_test?connectionString=postgresql%3A%2F%2Fremote.example%2Fproduction',
  ];
  for (const url of urls) {
    assert.throws(
      () => isolatedBenchmarkTarget({
        url,
        variableName: 'BENCHMARK_DATABASE_URL',
        confirmation: 'YES',
      }),
      /must not override its target through URL parameters/,
    );
  }
});

test('isolatedBenchmarkTarget rejects unsafe or reused targets without exposing credentials', () => {
  const secretUrl = 'postgresql://benchmark:private-secret@database.example/comcentral_test';
  const cases = [
    { url: secretUrl, confirmation: 'YES' },
    { url: 'postgresql://benchmark:private-secret@127.0.0.1/comcentral', confirmation: 'YES' },
    { url: 'postgresql://benchmark:private-secret@127.0.0.1/comcentral_test', confirmation: 'no' },
    {
      url: 'postgresql://benchmark:private-secret@localhost/comcentral_test',
      confirmation: 'YES',
      applicationUrls: ['postgresql://app:different-secret@127.0.0.1/comcentral_test'],
    },
    {
      url: 'postgresql://benchmark:private-secret@localhost/comcentral_test',
      confirmation: 'YES',
      applicationUrls: ['postgresql://app:different-secret@%6cocalhost/comcentral_test'],
    },
  ];
  for (const input of cases) {
    assert.throws(
      () => isolatedBenchmarkTarget({ variableName: 'BENCHMARK_DATABASE_URL', ...input }),
      (error) => error instanceof Error && !error.message.includes('private-secret'),
    );
  }
});

test('summarizeSamples calculates deterministic nearest-rank aggregates and error rate', () => {
  const samples = Array.from({ length: 20 }, (_, index) => ({ ok: true, durationMs: index + 1 }));
  samples.push({ ok: false, durationMs: 100 });

  assert.deepEqual(summarizeSamples(samples), {
    samples: 21,
    successes: 20,
    errors: 1,
    errorRate: 0.05,
    p50Ms: 10,
    p95Ms: 19,
    maxMs: 20,
  });
  assert.deepEqual(summarizeSamples([]), {
    samples: 0,
    successes: 0,
    errors: 0,
    errorRate: 0,
    p50Ms: null,
    p95Ms: null,
    maxMs: null,
  });
});
