'use client';

import Link from 'next/link';
import {
  Box, Button, Card, CardContent, Chip, FormControl, InputLabel, MenuItem, Select,
  Stack, Typography,
} from '@mui/material';
import { ArrowDown, ArrowUp, Eye, Pencil } from 'lucide-react';

import { formatSalary, formatDate, formatEmploymentType } from '@/lib/formatters';
import type { Employee, EmployeeSort } from '@/shared/contracts';

const mobileSortOptions: Array<{ value: EmployeeSort; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'employeeCode', label: 'Employee code' },
  { value: 'joiningDate', label: 'Joining date' },
  { value: 'salary', label: 'Annual salary' },
  { value: 'updatedAt', label: 'Last updated' },
];

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
      <Box
        component="dd"
        sx={{ m: 0, mt: 0.25, fontWeight: 650, overflowWrap: 'anywhere' }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Compact employee records for phone and tablet widths. */
export function EmployeeCards({
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
  const nextSortOrder = sortOrder === 'asc' ? 'descending' : 'ascending';

  return (
    <Box sx={{ display: { xs: 'block', md: 'none' }, minWidth: 0, p: 1.5 }}>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1.5 }}>
        <FormControl fullWidth sx={{ minWidth: 0, flex: 1, '& .MuiInputBase-root': { minHeight: 44 } }}>
          <InputLabel id="employee-card-sort-label">Sort employees</InputLabel>
          <Select
            labelId="employee-card-sort-label"
            label="Sort employees"
            value={sortBy}
            onChange={(event) => onSort(event.target.value as EmployeeSort)}
          >
            {mobileSortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          aria-label={`Change sort direction to ${nextSortOrder}`}
          startIcon={sortOrder === 'asc' ? <ArrowUp size={18} aria-hidden /> : <ArrowDown size={18} aria-hidden />}
          onClick={() => onSort(sortBy)}
          sx={{ minHeight: 44, minWidth: 126, whiteSpace: 'nowrap' }}
        >
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </Stack>
      <Box
        component="ul"
        aria-label="Employee directory cards"
        sx={{ display: 'grid', gap: 1.5, listStyle: 'none', m: 0, p: 0 }}
      >
        {employees.map((employee) => {
          const archived = employee.status === 'ARCHIVED';
          return (
            <Box component="li" key={employee.id} sx={{ minWidth: 0 }}>
              <Card component="article" variant="outlined" aria-label={employee.name}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography component="h3" variant="h3" sx={{ overflowWrap: 'anywhere' }}>
                          {employee.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
                          {employee.employeeCode} · {employee.email}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={archived ? 'Archived' : 'Active'}
                        color={archived ? 'default' : 'success'}
                        variant="outlined"
                      />
                    </Stack>
                    <Box
                      component="dl"
                      sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, m: 0 }}
                    >
                      <Detail label="Department">{employee.department}</Detail>
                      <Detail label="Role">
                        {employee.jobRole}
                        <Typography component="span" variant="caption" color="text.secondary" display="block">
                          {formatEmploymentType(employee.employmentType)}
                        </Typography>
                      </Detail>
                      <Detail label="Joined">{formatDate(employee.joiningDate)}</Detail>
                      <Detail label="Annual salary">
                        <Typography component="span" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {formatSalary(employee.salary, employee.currency)}
                        </Typography>
                      </Detail>
                      <Detail label="Updated">{formatDate(employee.updatedAt)}</Detail>
                    </Box>
                    <Stack direction="row" gap={1}>
                      <Button
                        component={Link}
                        href={'/employees/' + employee.id}
                        variant="outlined"
                        startIcon={<Eye size={18} aria-hidden />}
                        aria-label={`View employee details for ${employee.name}`}
                        fullWidth
                        sx={{ minHeight: 44 }}
                      >
                        View
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Pencil size={17} aria-hidden />}
                        aria-label={`Edit employee details for ${employee.name}`}
                        onClick={() => onEdit(employee)}
                        disabled={editDisabled}
                        title={editDisabled ? editUnavailableReason : undefined}
                        fullWidth
                        sx={{ minHeight: 44 }}
                      >
                        Edit
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
