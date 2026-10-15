import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const host = '127.0.0.1';
const startupTimeoutMs = 30_000;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the production smoke test`);
  return value;
}

function validateRuntimeConfiguration() {
  const databaseUrl = requiredEnvironment('DATABASE_URL');
  try {
    const parsed = new URL(databaseUrl);
    if (
      !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      !parsed.hostname ||
      !parsed.pathname ||
      parsed.pathname === '/'
    ) {
      throw new Error('invalid database URL');
    }
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL with a database name');
  }

  if (requiredEnvironment('BETTER_AUTH_SECRET').length < 32) {
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  }
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
  if (!port) throw new Error('Unable to reserve a local port for the production smoke test');
  return port;
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForReadiness(child, exited, endpoint) {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const result = await exited;
      throw new Error(`Production server exited before readiness (code ${result.code ?? 'none'})`);
    }
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(1_500) });
      if (response.status === 503) {
        throw new Error('Readiness is unavailable; verify runtime configuration and database availability');
      }
      if (response.status === 200) {
        const body = await response.json();
        if (body?.status === 'ready' && Object.keys(body).length === 1) return;
        throw new Error('Readiness returned an unexpected response');
      }
      await response.body?.cancel();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Readiness ')) throw error;
    }
    await Promise.race([delay(200), exited]);
  }
  throw new Error('Production server did not become ready within 30 seconds');
}

async function stopServer(child, exited) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const stopped = await Promise.race([exited.then(() => true), delay(5_000).then(() => false)]);
  if (stopped) return;
  child.kill('SIGKILL');
  const killed = await Promise.race([exited.then(() => true), delay(2_000).then(() => false)]);
  if (!killed) throw new Error('Production server did not stop cleanly');
}

async function main() {
  validateRuntimeConfiguration();
  await access(resolve('.next', 'BUILD_ID'));

  const port = await availablePort();
  const baseUrl = `http://${host}:${port}`;
  const nextBin = resolve('node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(process.execPath, [nextBin, 'start', '-H', host, '-p', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, BETTER_AUTH_URL: baseUrl, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.resume();
  child.stderr.resume();
  const exited = new Promise((resolveExit) => {
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
    child.once('error', () => resolveExit({ code: 'spawn-error', signal: null }));
  });

  let failure;
  try {
    await waitForReadiness(child, exited, `${baseUrl}/api/ready`);
  } catch (error) {
    failure = error;
  } finally {
    try {
      await stopServer(child, exited);
    } catch (error) {
      failure ??= error;
    }
  }
  if (failure) throw failure;
  console.info('Production start smoke passed');
}

main().catch((error) => {
  const message = error instanceof Error && error.code === 'ENOENT'
    ? 'Production build is missing; run the build before the smoke test'
    : error instanceof Error ? error.message : 'Production smoke failed';
  console.error(message);
  process.exitCode = 1;
});
