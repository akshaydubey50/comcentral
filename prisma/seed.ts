import 'dotenv/config';

import { createPrismaClient } from '../src/server/db/prisma';
import {
  requireSafeSeedDatabaseUrl,
  SeedSafetyError,
} from '../src/server/domain/seed-target';
import { seedSyntheticEmployees } from '../src/server/services/seed';

let cliPrisma: ReturnType<typeof createPrismaClient> | undefined;

async function main(): Promise<void> {
  const databaseUrl = requireSafeSeedDatabaseUrl(process.env);
  const prisma = createPrismaClient(databaseUrl);
  cliPrisma = prisma;
  const result = await seedSyntheticEmployees(prisma);
  console.log(
    result.status === 'created'
      ? 'Created exactly 10000 deterministic synthetic employees.'
      : 'Synthetic seed is already complete with exactly 10000 employees.',
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof SeedSafetyError
      ? error.message
      : 'Synthetic seed failed; verify marker and employee counts before retrying.',
  );
  process.exitCode = 1;
}).finally(async () => {
  await cliPrisma?.$disconnect();
});
