import type { PrismaClient } from '@/server/generated/prisma/client';
import { buildSeedEmployee } from '@/server/domain/seed-data';
import { SeedSafetyError } from '@/server/domain/seed-target';

export const SYNTHETIC_SEED_ID = 'acme-synthetic-v1';
export const SYNTHETIC_SEED_EMPLOYEE_COUNT = 10_000;

type SeedResult = {
  status: 'created' | 'already-complete';
  employeeCount: number;
};

/** Seeds the deterministic demo population after locking and checking the whole employee set. */
export async function seedSyntheticEmployees(prisma: PrismaClient): Promise<SeedResult> {
  const rows = Array.from({ length: SYNTHETIC_SEED_EMPLOYEE_COUNT }, (_, index) => {
    const employee = buildSeedEmployee(index);
    return {
      ...employee,
      joiningDate: new Date(`${employee.joiningDate}T00:00:00.000Z`),
      seedBatch: SYNTHETIC_SEED_ID,
    };
  });

  return prisma.$transaction(
    async (tx) => {
      // LOCK cannot be sent as a PostgreSQL prepared statement. This SQL is a fixed
      // application constant and contains no target, environment, or user input.
      await tx.$executeRawUnsafe(
        'LOCK TABLE "employee", "seed_marker" IN SHARE ROW EXCLUSIVE MODE',
      );

      const [marker, employeeCount, markerCount] = await Promise.all([
        tx.seedMarker.findUnique({ where: { id: SYNTHETIC_SEED_ID } }),
        tx.employee.count(),
        tx.seedMarker.count(),
      ]);

      if (marker) {
        const markedCount = await tx.employee.count({
          where: { seedBatch: SYNTHETIC_SEED_ID },
        });
        if (
          marker.employeeCount === SYNTHETIC_SEED_EMPLOYEE_COUNT &&
          markerCount === 1 &&
          markedCount === SYNTHETIC_SEED_EMPLOYEE_COUNT &&
          employeeCount === SYNTHETIC_SEED_EMPLOYEE_COUNT
        ) {
          return {
            status: 'already-complete',
            employeeCount: SYNTHETIC_SEED_EMPLOYEE_COUNT,
          };
        }
        throw new SeedSafetyError(
          'Seed marker exists but its employee set is inconsistent; refusing to modify data.',
        );
      }

      if (markerCount !== 0) {
        throw new SeedSafetyError(
          'Unrelated seed marker data already exists; refusing to seed.',
        );
      }
      if (employeeCount !== 0) {
        throw new SeedSafetyError(
          'Employee data already exists without the dedicated seed marker; refusing to seed.',
        );
      }

      await tx.seedMarker.create({
        data: {
          id: SYNTHETIC_SEED_ID,
          employeeCount: SYNTHETIC_SEED_EMPLOYEE_COUNT,
        },
      });
      for (let offset = 0; offset < rows.length; offset += 500) {
        await tx.employee.createMany({ data: rows.slice(offset, offset + 500) });
      }

      const [finalEmployeeCount, finalMarkedCount, finalMarkerCount] = await Promise.all([
        tx.employee.count(),
        tx.employee.count({ where: { seedBatch: SYNTHETIC_SEED_ID } }),
        tx.seedMarker.count(),
      ]);
      if (
        finalEmployeeCount !== SYNTHETIC_SEED_EMPLOYEE_COUNT ||
        finalMarkedCount !== SYNTHETIC_SEED_EMPLOYEE_COUNT ||
        finalMarkerCount !== 1
      ) {
        throw new SeedSafetyError(
          'Synthetic employee count is inconsistent; refusing to commit seed data.',
        );
      }

      return {
        status: 'created',
        employeeCount: SYNTHETIC_SEED_EMPLOYEE_COUNT,
      };
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 120_000,
      timeout: 120_000,
    },
  );
}
