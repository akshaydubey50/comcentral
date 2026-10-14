import { z } from 'zod';

const registrationBodySchema = z.strictObject({
  name: z
    .string({ error: 'name must be a string' })
    .trim()
    .min(1, 'name is required')
    .max(160, 'name must be at most 160 characters'),
  email: z
    .string({ error: 'email must be a string' })
    .trim()
    .toLowerCase()
    .max(254, 'email must be at most 254 characters')
    .email('email must be valid'),
  password: z
    .string({ error: 'password must be a string' })
    .min(5, 'password must contain at least 5 characters')
    .max(128, 'password must contain at most 128 characters'),
});

export type RegistrationBody = z.infer<typeof registrationBodySchema>;

/** Allow only native signup fields and normalize identity values at the HTTP boundary. */
export function normalizeRegistrationBody(input: unknown): RegistrationBody {
  return registrationBodySchema.parse(input);
}
