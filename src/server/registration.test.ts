import { describe, expect, it } from 'vitest';

import { normalizeRegistrationBody } from '@/server/registration';

describe('normalizeRegistrationBody', () => {
  it('normalizes identity fields without changing the password', () => {
    expect(
      normalizeRegistrationBody({
        name: '  Ada HR  ',
        email: '  ADA@EXAMPLE.TEST  ',
        password: ' spaced-password ',
      }),
    ).toEqual({
      name: 'Ada HR',
      email: 'ada@example.test',
      password: ' spaced-password ',
    });
  });

  it.each([
    ['missing name', { email: 'ada@example.test', password: 'secure-password' }],
    ['blank name', { name: '   ', email: 'ada@example.test', password: 'secure-password' }],
    [
      'overlong name',
      { name: 'a'.repeat(161), email: 'ada@example.test', password: 'secure-password' },
    ],
    ['invalid email', { name: 'Ada HR', email: 'not-an-email', password: 'secure-password' }],
    [
      'overlong email',
      { name: 'Ada HR', email: `${'a'.repeat(243)}@example.test`, password: 'secure-password' },
    ],
    ['short password', { name: 'Ada HR', email: 'ada@example.test', password: '1234' }],
    [
      'overlong password',
      { name: 'Ada HR', email: 'ada@example.test', password: 'a'.repeat(129) },
    ],
  ])('rejects %s', (_case, body) => {
    expect(() => normalizeRegistrationBody(body)).toThrow();
  });

  it.each(['role', 'isAdmin', 'image', 'callbackURL', 'rememberMe', 'confirmation'])(
    'rejects the unexpected %s field',
    (field) => {
      expect(() =>
        normalizeRegistrationBody({
          name: 'Ada HR',
          email: 'ada@example.test',
          password: 'secure-password',
          [field]: field === 'rememberMe' || field === 'isAdmin' ? true : 'unexpected',
        }),
      ).toThrow();
    },
  );

  it.each([5, 128])('accepts a password at the %i-character boundary', (length) => {
    const body = { name: 'Ada HR', email: 'ada@example.test', password: 'a'.repeat(length) };
    expect(normalizeRegistrationBody(body)).toEqual(body);
  });
});
