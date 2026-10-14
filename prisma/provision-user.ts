import 'dotenv/config';

import { getProvisioningAuth } from '../src/server/auth';
import { getPrisma } from '../src/server/db/prisma';

async function main(): Promise<void> {
  const email = process.env.HR_EMAIL?.trim().toLowerCase();
  const name = process.env.HR_NAME?.trim();
  const password = process.env.HR_PASSWORD;

  if (!email || !name || !password) {
    throw new Error('HR_EMAIL, HR_NAME, and HR_PASSWORD are required');
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error('HR_PASSWORD must contain between 12 and 128 characters');
  }

  const prisma = getPrisma();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('An HR account with this email already exists; refusing to overwrite it');
    }

    const result = await getProvisioningAuth().api.signUpEmail({
      body: { email, name, password },
    });
    if (!result.user) throw new Error('Better Auth did not create the HR account');
    console.log(`Provisioned HR account ${result.user.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Provisioning failed');
  process.exitCode = 1;
});
