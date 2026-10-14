export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new ConfigurationError(`${name} is not configured`);
  return value;
}

export function applicationOrigin(): string {
  const configured = requireEnvironment('BETTER_AUTH_URL');
  try {
    return new URL(configured).origin;
  } catch {
    throw new ConfigurationError('BETTER_AUTH_URL must be an absolute URL');
  }
}
