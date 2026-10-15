'use client';

import Link from 'next/link';
import {
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography,
} from '@mui/material';

import type { Employee, EmployeeSort } from '@/shared/contracts';
import { formatCurrency, formatDate, formatEmploymentType } from '@/lib/formatters';

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
}: {
  employees: Employee[];
  sortBy: EmployeeSort;
  sortOrder: 'asc' | 'desc';
  onSort: (key: EmployeeSort) => void;
}) {
  return (
    <TableContainer className="data-table-wrap" sx={{ display: { xs: 'none', md: 'block' } }}>
      <Table aria-label="Employee directory" sx={{ minWidth: 980 }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align}>
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
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 650 }}>{formatCurrency(employee.salary, employee.currency)}</TableCell>
              <TableCell>{formatDate(employee.updatedAt)}</TableCell>
              <TableCell><Chip size="small" label={employee.status === 'ACTIVE' ? 'Active' : 'Archived'} color={employee.status === 'ACTIVE' ? 'success' : 'default'} variant="outlined" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
