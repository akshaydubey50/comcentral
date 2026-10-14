import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';

import { applicationOrigin, ConfigurationError, requireEnvironment } from '@/server/config';
import { getPrisma } from '@/server/db/prisma';

export function createAuth(allowProvisioning = false) {
  const secret = requireEnvironment('BETTER_AUTH_SECRET');
  if (secret.length < 32) {
    throw new ConfigurationError('BETTER_AUTH_SECRET must contain at least 32 characters');
  }
  const baseURL = applicationOrigin();

  return betterAuth({
    appName: 'ACME Salary',
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    database: prismaAdapter(getPrisma(), { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowProvisioning,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production',
      defaultCookieAttributes: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
      database: { joins: true },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 15 * 60, max: 10 },
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;
const authCache: { production?: AuthInstance; provisioning?: AuthInstance } = {};

export function getAuth(): AuthInstance {
  authCache.production ??= createAuth(false);
  return authCache.production;
}

export function getProvisioningAuth(): AuthInstance {
  authCache.provisioning ??= createAuth(true);
  return authCache.provisioning;
}
