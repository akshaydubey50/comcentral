import { PrismaPg } from '@prisma/adapter-pg';

import { ConfigurationError } from '@/server/config';
import { PrismaClient } from '@/server/generated/prisma/client';

const globalDatabase = globalThis as unknown as { acmePrisma?: PrismaClient };

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    // Keep each serverless instance bounded while allowing short concurrent transactions.
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export function getPrisma(): PrismaClient {
  if (globalDatabase.acmePrisma) return globalDatabase.acmePrisma;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new ConfigurationError('DATABASE_URL is not configured');

  const client = createPrismaClient(databaseUrl);
  globalDatabase.acmePrisma = client;
  return client;
}
