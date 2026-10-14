import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildSeedEmployee } from '../../src/server/domain/seed-data';
import { createPrismaClient } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import {
  seedSyntheticEmployees,
  SYNTHETIC_SEED_EMPLOYEE_COUNT,
  SYNTHETIC_SEED_ID,
} from '../../src/server/services/seed';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const WRITER_EMPLOYEE_CODE = 'SEED-WRITER-RACE';
const UNRELATED_MARKER_ID = 'unrelated-synthetic-data';
const FAILURE_TRIGGER = 'comcentral_seed_failure_test';
const FAILURE_FUNCTION = 'comcentral_seed_failure_test';

let prisma: PrismaClient;
let competingPrisma: PrismaClient;
let clientsInitialized = false;
let ownsFixtures = false;

function databaseName(databaseUrl: string): string {
  try {
    return decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''));
  } catch {
    throw new Error('Seed integration database URL is invalid');
  }
}

async function removeOwnedFixtures(): Promise<void> {
  await prisma.employee.deleteMany({
    where: {
      OR: [
        { seedBatch: SYNTHETIC_SEED_ID },
        { employeeCode: WRITER_EMPLOYEE_CODE },
      ],
    },
  });
  await prisma.seedMarker.deleteMany({
    where: { id: { in: [SYNTHETIC_SEED_ID, UNRELATED_MARKER_ID] } },
  });
}

function requireIsolatedSeedTestDatabaseUrl(): string {
  const seedTestDatabaseUrl = process.env.SEED_TEST_DATABASE_URL?.trim();
  if (!seedTestDatabaseUrl) {
    throw new Error('SEED_TEST_DATABASE_URL is required for seed integration tests');
  }

  vi.stubEnv('TEST_DATABASE_URL', seedTestDatabaseUrl);
  try {
    return requireIsolatedTestDatabaseUrl();
  } finally {
    vi.unstubAllEnvs();
  }
}

describe.sequential('synthetic seed transaction', () => {
  beforeAll(async () => {
    const testDatabaseUrl = requireIsolatedSeedTestDatabaseUrl();
    if (!databaseName(testDatabaseUrl).toLowerCase().endsWith('_test')) {
      throw new Error('Seed integration tests require a dedicated database ending in _test');
    }

    prisma = createPrismaClient(testDatabaseUrl);
    competingPrisma = createPrismaClient(testDatabaseUrl);
    clientsInitialized = true;

    const [employeeCount, markerCount] = await Promise.all([
      prisma.employee.count(),
      prisma.seedMarker.count(),
    ]);
    if (employeeCount !== 0 || markerCount !== 0) {
      throw new Error('Seed integration database must start empty');
    }
    ownsFixtures = true;
  });

  afterEach(async () => {
    if (!ownsFixtures) return;
    await removeOwnedFixtures();
  });

  afterAll(async () => {
    if (!clientsInitialized) return;
    await Promise.all([prisma.$disconnect(), competingPrisma.$disconnect()]);
  });

  it('serializes concurrent first runs and remains exactly idempotent', async () => {
    const results = await Promise.all([
      seedSyntheticEmployees(prisma),
      seedSyntheticEmployees(competingPrisma),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'already-complete',
      'created',
    ]);
    expect(results.every((result) => (
      result.employeeCount === SYNTHETIC_SEED_EMPLOYEE_COUNT
    ))).toBe(true);
    expect(await prisma.employee.count()).toBe(SYNTHETIC_SEED_EMPLOYEE_COUNT);
    expect(await prisma.employee.count({ where: { seedBatch: SYNTHETIC_SEED_ID } })).toBe(
      SYNTHETIC_SEED_EMPLOYEE_COUNT,
    );
    await expect(prisma.seedMarker.findUnique({ where: { id: SYNTHETIC_SEED_ID } })).resolves
      .toMatchObject({ employeeCount: SYNTHETIC_SEED_EMPLOYEE_COUNT });

    const expectedFirst = buildSeedEmployee(0);
    const expectedLast = buildSeedEmployee(SYNTHETIC_SEED_EMPLOYEE_COUNT - 1);
    await expect(prisma.employee.findUnique({
      where: { employeeCode: expectedFirst.employeeCode },
    })).resolves.toMatchObject({
      name: expectedFirst.name,
      email: expectedFirst.email,
      country: expectedFirst.country,
      seedBatch: SYNTHETIC_SEED_ID,
    });
    await expect(prisma.employee.findUnique({
      where: { employeeCode: expectedLast.employeeCode },
    })).resolves.toMatchObject({
      name: expectedLast.name,
      email: expectedLast.email,
      country: expectedLast.country,
      seedBatch: SYNTHETIC_SEED_ID,
    });

    await expect(seedSyntheticEmployees(prisma)).resolves.toEqual({
      status: 'already-complete',
      employeeCount: SYNTHETIC_SEED_EMPLOYEE_COUNT,
    });
    expect(await prisma.employee.count()).toBe(SYNTHETIC_SEED_EMPLOYEE_COUNT);
  }, 120_000);

  it('rolls back the marker and earlier batches when a later insert fails', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION "${FAILURE_FUNCTION}"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.employee_code = 'SEED-00501' THEN
          RAISE EXCEPTION 'forced synthetic seed test failure';
        END IF;
        RETURN NEW;
      END;
      $$
    `);

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER "${FAILURE_TRIGGER}"
        BEFORE INSERT ON "employee"
        FOR EACH ROW EXECUTE FUNCTION "${FAILURE_FUNCTION}"()
      `);
      try {
        await expect(seedSyntheticEmployees(prisma)).rejects.toThrow();
        expect(await prisma.employee.count()).toBe(0);
        expect(await prisma.seedMarker.count({ where: { id: SYNTHETIC_SEED_ID } })).toBe(0);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${FAILURE_TRIGGER}" ON "employee"`,
        );
      }
    } finally {
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${FAILURE_FUNCTION}"()`);
    }
  }, 120_000);

  it('waits for a concurrent writer and then refuses its populated result without deletion', async () => {
    let releaseWriter = () => {};
    let reportWriterReady = () => {};
    const writerCanCommit = new Promise<void>((resolve) => {
      releaseWriter = resolve;
    });
    const writerReady = new Promise<void>((resolve) => {
      reportWriterReady = resolve;
    });

    const writer = competingPrisma.$transaction(async (tx) => {
      await tx.employee.create({
        data: {
          employeeCode: WRITER_EMPLOYEE_CODE,
          name: 'Concurrent Writer',
          email: 'concurrent-seed-writer@example.invalid',
          country: 'US',
          department: 'Operations',
          jobRole: 'Specialist',
          employmentType: 'FULL_TIME',
          joiningDate: new Date('2020-01-01T00:00:00.000Z'),
          salary: '75000.00',
          currency: 'USD',
        },
      });
      reportWriterReady();
      await writerCanCommit;
    }, { isolationLevel: 'Serializable', timeout: 120_000 });

    await writerReady;
    const seed = seedSyntheticEmployees(prisma);
    releaseWriter();
    await writer;

    await expect(seed).rejects.toThrow(
      'Employee data already exists without the dedicated seed marker; refusing to seed.',
    );
    expect(await prisma.employee.count()).toBe(1);
    expect(await prisma.employee.findUnique({
      where: { employeeCode: WRITER_EMPLOYEE_CODE },
    })).not.toBeNull();
    expect(await prisma.seedMarker.count({ where: { id: SYNTHETIC_SEED_ID } })).toBe(0);
  }, 120_000);

  it('refuses an unrelated seed marker without deleting it', async () => {
    await prisma.seedMarker.create({
      data: { id: UNRELATED_MARKER_ID, employeeCount: 1 },
    });

    await expect(seedSyntheticEmployees(prisma)).rejects.toThrow(
      'Unrelated seed marker data already exists; refusing to seed.',
    );
    expect(await prisma.employee.count()).toBe(0);
    await expect(prisma.seedMarker.findUnique({
      where: { id: UNRELATED_MARKER_ID },
    })).resolves.toMatchObject({ employeeCount: 1 });
    expect(await prisma.seedMarker.count({ where: { id: SYNTHETIC_SEED_ID } })).toBe(0);
  });
});
