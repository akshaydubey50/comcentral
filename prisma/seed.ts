import 'dotenv/config';

import { buildSeedEmployee } from '../src/server/domain/seed-data';
import { getPrisma } from '../src/server/db/prisma';

const SEED_ID = 'acme-synthetic-v1';
const TARGET_COUNT = 10_000;

let cliPrisma: ReturnType<typeof getPrisma> | undefined;

async function main(): Promise<void> {
  const prisma = getPrisma();
  cliPrisma = prisma;
  const [marker, employeeCount] = await Promise.all([
    prisma.seedMarker.findUnique({ where: { id: SEED_ID } }),
    prisma.employee.count(),
  ]);

  if (marker) {
    const markedCount = await prisma.employee.count({ where: { seedBatch: SEED_ID } });
    if (
      marker.employeeCount === TARGET_COUNT &&
      markedCount === TARGET_COUNT &&
      employeeCount === TARGET_COUNT
    ) {
      console.log('Synthetic seed is already complete with exactly 10000 employees.');
      return;
    }
    throw new Error('Seed marker exists but its employee set is inconsistent; refusing to modify data.');
  }
  if (employeeCount !== 0) {
    throw new Error('Employee data already exists without the dedicated seed marker; refusing to seed.');
  }

  const rows = Array.from({ length: TARGET_COUNT }, (_, index) => {
    const employee = buildSeedEmployee(index);
    return {
      ...employee,
      joiningDate: new Date(employee.joiningDate + 'T00:00:00.000Z'),
      seedBatch: SEED_ID,
    };
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.seedMarker.create({
        data: { id: SEED_ID, employeeCount: TARGET_COUNT },
      });
      for (let offset = 0; offset < rows.length; offset += 500) {
        await tx.employee.createMany({ data: rows.slice(offset, offset + 500) });
      }
    },
    { isolationLevel: 'Serializable', timeout: 120_000 },
  );
  console.log('Created exactly 10000 deterministic synthetic employees.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
}).finally(async () => {
  await cliPrisma?.$disconnect();
});
