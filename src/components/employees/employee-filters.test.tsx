import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { DirectoryOptions, EmployeeFilters } from '@/shared/contracts';
import { EmployeeFilterBar } from './employee-filters';

const filters: EmployeeFilters = {
  country: 'GB', department: 'Engineering', jobRole: 'Analyst', employmentType: 'INTERN', status: 'ALL',
};

describe('EmployeeFilterBar', () => {
  it.each([
    undefined,
    { countries: [], departments: [], jobRoles: [], employmentTypes: [], currencies: [] } satisfies DirectoryOptions,
  ])('keeps applied selections visible when option choices are unavailable: %j', (options) => {
    render(<EmployeeFilterBar filters={filters} options={options} onChange={vi.fn()} onApply={vi.fn()} onClear={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('GB');
    expect(screen.getByRole('combobox', { name: 'Department' })).toHaveTextContent('Engineering');
    expect(screen.getByRole('combobox', { name: 'Job role' })).toHaveTextContent('Analyst');
    expect(screen.getByRole('combobox', { name: 'Employment type' })).toHaveTextContent('Intern');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('All');
  });
});
