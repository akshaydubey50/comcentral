'use client';

import Link from 'next/link';
import {
  Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Typography,
} from '@mui/material';
import { Eye, Pencil } from 'lucide-react';

import type { Employee, EmployeeSort } from '@/shared/contracts';
import { formatSalary, formatDate, formatEmploymentType } from '@/lib/formatters';

const columns: { key: EmployeeSort | 'department' | 'jobRole' | 'status'; label: string; sortable?: boolean; align?: 'right' }[] = [
  { key: 'employeeCode', label: 'Employee', sortable: true },
  { key: 'department', label: 'Department' },
  { key: 'jobRole', label: 'Role' },
  { key: 'joiningDate', label: 'Joined', sortable: true },
  { key: 'salary', label: 'Annual salary', sortable: true, align: 'right' },
  { key: 'updatedAt', label: 'Updated', sortable: true },
  { key: 'status', label: 'Status' },
];

export function EmployeeTable({
  employees,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  editDisabled,
  editUnavailableReason,
}: {
  employees: Employee[];
  sortBy: EmployeeSort;
  sortOrder: 'asc' | 'desc';
  onSort: (key: EmployeeSort) => void;
  onEdit: (employee: Employee) => void;
  editDisabled: boolean;
  editUnavailableReason: string;
}) {
  return (
    <TableContainer
      className="data-table-wrap"
      role="region"
      aria-label="Employee directory scroll area"
      tabIndex={0}
      sx={{
        display: { xs: 'none', md: 'block' },
        maxHeight: 'min(65vh, 40rem)',
        overflow: 'auto',
        scrollbarGutter: 'stable',
        // Keep focused row controls clear of the fixed header and action column.
        scrollPadding: '4rem 12rem 1rem 1rem',
        '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: '-3px' },
      }}
    >
      <Table stickyHeader aria-label="Employee directory" sx={{ minWidth: 1120 }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align} sortDirection={column.sortable && sortBy === column.key ? sortOrder : false}>
                {column.sortable ? (
                  <TableSortLabel
                    active={sortBy === column.key}
                    direction={sortBy === column.key ? sortOrder : 'asc'}
                    onClick={() => onSort(column.key as EmployeeSort)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : column.label}
              </TableCell>
            ))}
            <TableCell align="right" sx={{ position: 'sticky', right: 0, zIndex: 3, bgcolor: '#f7f8f5', boxShadow: '-8px 0 12px -12px rgba(23,35,34,.7)' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} hover>
              <TableCell>
                <Typography component={Link} href={'/employees/' + employee.id} fontWeight={750} color="primary.main" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  {employee.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">{employee.employeeCode} · {employee.email}</Typography>
              </TableCell>
              <TableCell>{employee.department}</TableCell>
              <TableCell>
                {employee.jobRole}
                <Typography variant="caption" display="block" color="text.secondary">{formatEmploymentType(employee.employmentType)}</Typography>
              </TableCell>
              <TableCell>{formatDate(employee.joiningDate)}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 650 }}>{formatSalary(employee.salary, employee.currency)}</TableCell>
              <TableCell>{formatDate(employee.updatedAt)}</TableCell>
              <TableCell><Chip size="small" label={employee.status === 'ACTIVE' ? 'Active' : 'Archived'} color={employee.status === 'ACTIVE' ? 'success' : 'default'} variant="outlined" /></TableCell>
              <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', boxShadow: '-8px 0 12px -12px rgba(23,35,34,.7)' }}>
                <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                  <Button component={Link} href={'/employees/' + employee.id} size="small" startIcon={<Eye size={16} aria-hidden />} aria-label={`View employee details for ${employee.name}`}>View</Button>
                  <Button size="small" startIcon={<Pencil size={16} aria-hidden />} onClick={() => onEdit(employee)} disabled={editDisabled} title={editDisabled ? editUnavailableReason : undefined} aria-label={`Edit employee details for ${employee.name}`}>Edit</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
