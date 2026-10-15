import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import type { Employee } from '@/shared/contracts';
import { EmployeeCards } from './employee-cards';

const employees: Employee[] = [
  {
    id: 'employee-1',
    employeeCode: 'ACME-001',
    name: 'Ada Lovelace',
    email: 'ada@acme.test',
    country: 'GB',
    department: 'Engineering',
    jobRole: 'Principal Engineer',
    employmentType: 'FULL_TIME',
    joiningDate: '2020-01-02',
    salary: '125000.00',
    currency: 'GBP',
    status: 'ACTIVE',
    version: 7,
    createdAt: '2020-01-02T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'employee-2',
    employeeCode: 'ACME-002',
    name: 'Grace Hopper',
    email: 'grace.hopper.with.a.long.address@acme.test',
    country: 'US',
    department: 'Research',
    jobRole: 'Engineering Fellow',
    employmentType: 'CONTRACT',
    joiningDate: '2021-05-06',
    salary: '150000.00',
    currency: 'USD',
    status: 'ARCHIVED',
    version: 3,
    createdAt: '2021-05-06T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  },
];

describe('EmployeeCards', () => {
  it('shows the desktop-directory fields, native salary, status, and accessible detail links', () => {
    render(
      <EmployeeCards
        employees={employees}
        sortBy="name"
        sortOrder="asc"
        onSort={vi.fn()}
      />,
    );

    expect(screen.getByRole('list', { name: 'Employee directory cards' })).toBeInTheDocument();
    const activeCard = within(screen.getByRole('article', { name: 'Ada Lovelace' }));
    expect(activeCard.getByText(/ACME-001 · ada@acme\.test/)).toBeInTheDocument();
    expect(activeCard.getByText('Engineering')).toBeInTheDocument();
    expect(activeCard.getByText('Principal Engineer')).toBeInTheDocument();
    expect(activeCard.getByText('Full time')).toBeInTheDocument();
    expect(activeCard.getByText('02 Jan 2020')).toBeInTheDocument();
    expect(activeCard.getByText('GBP 125,000.00')).toBeInTheDocument();
    expect(activeCard.getByText('14 Oct 2026')).toBeInTheDocument();
    expect(activeCard.getByText('Active')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Grace Hopper' })).getByText('Archived'))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View employee details for Ada Lovelace' }))
      .toHaveAttribute('href', '/employees/employee-1');
  });

  it('routes mobile sort field and direction changes through the existing callback', async () => {
    const onSort = vi.fn();
    render(
      <EmployeeCards
        employees={employees}
        sortBy="name"
        sortOrder="asc"
        onSort={onSort}
      />,
    );

    fireEvent.mouseDown(screen.getByLabelText('Sort employees'));
    fireEvent.click(await screen.findByRole('option', { name: 'Annual salary' }));
    expect(onSort).toHaveBeenCalledWith('salary');

    fireEvent.click(screen.getByRole('button', { name: 'Change sort direction to descending' }));
    expect(onSort).toHaveBeenCalledWith('name');
  });
});
