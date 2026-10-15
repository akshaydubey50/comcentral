import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, betterAuth } from 'better-auth';

import { applicationOrigin, ConfigurationError, requireEnvironment } from '@/server/config';
import { getPrisma } from '@/server/db/prisma';
import { logAuthEvent } from '@/server/request-logging';

type AuthMode = 'public' | 'provisioning';

export function createAuth(mode: AuthMode = 'public') {
  const secret = requireEnvironment('BETTER_AUTH_SECRET');
  if (secret.length < 32) {
    throw new ConfigurationError('BETTER_AUTH_SECRET must contain at least 32 characters');
  }
  const baseURL = applicationOrigin();

  return betterAuth({
    appName: 'ComCentral',
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    database: prismaAdapter(getPrisma(), { provider: 'postgresql', transaction: true }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 5,
      maxPasswordLength: 128,
      // The provisioning script creates credentials only; browser registration creates a session.
      autoSignIn: mode === 'public',
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
        '/sign-up/email': { window: 15 * 60, max: 5 },
      },
    },
    onAPIError: {
      onError(error) {
        if (error instanceof APIError) return;

        logAuthEvent('auth_internal_error');
        // Throwing a sanitized API error prevents better-call from logging the original exception.
        throw APIError.from('INTERNAL_SERVER_ERROR', {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'The authentication request could not be completed',
        });
      },
    },
    logger: {
      level: 'warn',
      // Better Auth includes supplied email addresses in some info messages. Keep auth logs PII-free.
      log(level) {
        if (level === 'error') logAuthEvent('auth_internal_error');
        else if (level === 'warn') logAuthEvent('auth_warning');
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;
const authCache: { production?: AuthInstance; provisioning?: AuthInstance } = {};

export function getAuth(): AuthInstance {
  authCache.production ??= createAuth('public');
  return authCache.production;
}

export function getProvisioningAuth(): AuthInstance {
  authCache.provisioning ??= createAuth('provisioning');
  return authCache.provisioning;
}
