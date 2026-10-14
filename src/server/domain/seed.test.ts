import { describe, expect, it } from 'vitest';

import { buildSeedEmployee } from './seed-data';

describe('deterministic employee seed', () => {
  it('creates stable valid boundary records', () => {
    expect(buildSeedEmployee(0)).toEqual(buildSeedEmployee(0));
    expect(buildSeedEmployee(0).employeeCode).toBe('SEED-00001');
    expect(buildSeedEmployee(9_999).employeeCode).toBe('SEED-10000');
  });
});
