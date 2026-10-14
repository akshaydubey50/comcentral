'use client';

import { Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { Search, SlidersHorizontal, X } from 'lucide-react';

import type { DirectoryOptions, EmployeeFilters } from '@/shared/contracts';
import { formatEmploymentType } from '@/lib/formatters';

export function EmployeeFilterBar({
  filters,
  options,
  onChange,
  onApply,
  onClear,
}: {
  filters: EmployeeFilters;
  options?: DirectoryOptions;
  onChange: (next: EmployeeFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <Stack component="form" onSubmit={(event) => { event.preventDefault(); onApply(); }} gap={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25}>
        <TextField
          label="Search employees"
          placeholder="Name, code, or email"
          value={filters.q ?? ''}
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
          InputProps={{ startAdornment: <Search size={18} aria-hidden style={{ marginRight: 8 }} /> }}
          sx={{ flex: '1 1 280px' }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select labelId="status-filter-label" label="Status" value={filters.status ?? 'ACTIVE'} onChange={(event) => onChange({ ...filters, status: event.target.value as EmployeeFilters['status'] })}>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="ARCHIVED">Archived</MenuItem>
            <MenuItem value="ALL">All</MenuItem>
          </Select>
        </FormControl>
        <Button type="submit" variant="contained" startIcon={<SlidersHorizontal size={18} />}>Apply filters</Button>
        <Button onClick={onClear} startIcon={<X size={18} />}>Clear</Button>
      </Stack>
      <Stack direction="row" gap={1.25} flexWrap="wrap">
        <FormControl sx={{ minWidth: 150, flex: { xs: '1 1 140px', md: '0 0 180px' } }}>
          <InputLabel id="country-filter-label">Country</InputLabel>
          <Select labelId="country-filter-label" label="Country" value={filters.country ?? ''} onChange={(event) => onChange({ ...filters, country: event.target.value || undefined })}>
            <MenuItem value="">All countries</MenuItem>
            {options?.countries.map((country) => <MenuItem key={country.code} value={country.code}>{country.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160, flex: { xs: '1 1 150px', md: '0 0 200px' } }}>
          <InputLabel id="department-filter-label">Department</InputLabel>
          <Select labelId="department-filter-label" label="Department" value={filters.department ?? ''} onChange={(event) => onChange({ ...filters, department: event.target.value || undefined })}>
            <MenuItem value="">All departments</MenuItem>
            {options?.departments.map((department) => <MenuItem key={department} value={department}>{department}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160, flex: { xs: '1 1 150px', md: '0 0 200px' } }}>
          <InputLabel id="role-filter-label">Job role</InputLabel>
          <Select labelId="role-filter-label" label="Job role" value={filters.jobRole ?? ''} onChange={(event) => onChange({ ...filters, jobRole: event.target.value || undefined })}>
            <MenuItem value="">All roles</MenuItem>
            {options?.jobRoles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160, flex: { xs: '1 1 150px', md: '0 0 190px' } }}>
          <InputLabel id="type-filter-label">Employment type</InputLabel>
          <Select labelId="type-filter-label" label="Employment type" value={filters.employmentType ?? ''} onChange={(event) => onChange({ ...filters, employmentType: event.target.value as EmployeeFilters['employmentType'] || undefined })}>
            <MenuItem value="">All types</MenuItem>
            {options?.employmentTypes.map((type) => <MenuItem key={type} value={type}>{formatEmploymentType(type)}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );
}
