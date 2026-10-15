import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import type { Employee } from '@/shared/contracts';
import { EmployeeTable } from './employee-table';

const employee: Employee = {
  id: 'employee-1', employeeCode: 'ACME-001', name: 'Ada Lovelace', email: 'ada@acme.test',
  country: 'GB', department: 'Engineering', jobRole: 'Analyst', employmentType: 'FULL_TIME',
  joiningDate: '2020-01-02', salary: '125000.00', currency: 'GBP', status: 'ACTIVE', version: 7,
  createdAt: '2020-01-02T00:00:00.000Z', updatedAt: '2026-10-14T00:00:00.000Z',
};

describe('EmployeeTable actions', () => {
  it('keeps all 25 page records inside a named keyboard-focusable scroll region', () => {
    const employees = Array.from({ length: 25 }, (_, index) => ({
      ...employee, id: 'employee-' + index, employeeCode: 'PAGE-' + index, name: 'Employee ' + index,
    }));
    render(<EmployeeTable employees={employees} sortBy="salary" sortOrder="desc" onSort={vi.fn()} onEdit={vi.fn()} editDisabled={false} editUnavailableReason="" />);

    const region = screen.getByRole('region', { name: 'Employee directory scroll area' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table', { name: 'Employee directory' })).toBeInTheDocument();
    expect(within(region).getAllByRole('row')).toHaveLength(26);
    expect(within(region).getByRole('link', { name: 'View employee details for Employee 24' })).toBeInTheDocument();
    expect(within(region).getByRole('columnheader', { name: 'Annual salary' })).toHaveAttribute('aria-sort', 'descending');
  });

  it('keeps View and Edit discoverable in each employee row', () => {
    const onEdit = vi.fn();
    render(
      <EmployeeTable
        employees={[employee]}
        sortBy="name"
        sortOrder="asc"
        onSort={vi.fn()}
        onEdit={onEdit}
        editDisabled={false}
        editUnavailableReason=""
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View employee details for Ada Lovelace' }))
      .toHaveAttribute('href', '/employees/employee-1');
    fireEvent.click(screen.getByRole('button', { name: 'Edit employee details for Ada Lovelace' }));
    expect(onEdit).toHaveBeenCalledWith(employee);
  });
});
