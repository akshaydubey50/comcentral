'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert, Box, Button, Card, CardContent, Chip, Pagination, Stack, Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';

import { api, downloadBlob } from '@/lib/api-client';
import type { EmployeeFilters, EmployeeQuery, EmployeeSort } from '@/shared/contracts';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { EmployeeFilterBar } from './employee-filters';
import { EmployeeFormDialog } from './employee-form-dialog';
import { EmployeeTable } from './employee-table';

const defaultFilters: EmployeeFilters = { status: 'ACTIVE' };

export function EmployeeDirectory() {
  const search = useSearchParams();
  // URL navigation starts a new filter draft, including browser Back/Forward.
  return <EmployeeDirectoryContent key={search.toString()} />;
}

function EmployeeDirectoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const query = useMemo<EmployeeQuery>(() => ({
    q: search.get('q') || undefined,
    country: search.get('country') || undefined,
    department: search.get('department') || undefined,
    jobRole: search.get('jobRole') || undefined,
    employmentType: (search.get('employmentType') as EmployeeQuery['employmentType']) || undefined,
    status: (search.get('status') as EmployeeQuery['status']) || 'ACTIVE',
    page: Math.max(1, Number(search.get('page') || 1)),
    pageSize: Math.min(100, Math.max(10, Number(search.get('pageSize') || 25))),
    sortBy: (search.get('sortBy') as EmployeeSort) || 'name',
    sortOrder: search.get('sortOrder') === 'desc' ? 'desc' : 'asc',
  }), [search]);
  const [draftFilters, setDraftFilters] = useState<EmployeeFilters>(query);


  const employees = useQuery({
    queryKey: ['employees', query],
    queryFn: () => api.employees(query),
    placeholderData: (previous) => previous,
  });
  const options = useQuery({ queryKey: ['directory-options'], queryFn: api.options });
  const exportRows = useMutation({
    mutationFn: () => api.exportEmployees({
      q: query.q, country: query.country, department: query.department, jobRole: query.jobRole,
      employmentType: query.employmentType, status: query.status,
    }),
    onSuccess: (blob) => downloadBlob(blob, 'acme-employees.csv'),
  });

  function navigate(changes: Partial<EmployeeQuery>, resetPage = true) {
    const next = { ...query, ...changes, ...(resetPage ? { page: 1 } : {}) };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    router.push(pathname + '?' + params.toString());
  }

  function applyFilters() {
    navigate(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(defaultFilters);
    navigate({ q: undefined, country: undefined, department: undefined, jobRole: undefined, employmentType: undefined, status: 'ACTIVE' });
  }

  function sortBy(key: EmployeeSort) {
    navigate({ sortBy: key, sortOrder: query.sortBy === key && query.sortOrder === 'asc' ? 'desc' : 'asc' });
  }

  const activeFilterCount = ['q', 'country', 'department', 'jobRole', 'employmentType']
    .filter((key) => Boolean(query[key as keyof EmployeeQuery])).length;

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="People operations"
        title="Employee directory"
        description="Find employee records, maintain employment details, and export the complete filtered directory."
        actions={
          <>
            <Button variant="outlined" startIcon={<Download size={18} />} onClick={() => exportRows.mutate()} disabled={exportRows.isPending}>
              {exportRows.isPending ? 'Preparing…' : 'Export matching'}
            </Button>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Add employee</Button>
          </>
        }
      />
      {(options.isError || exportRows.isError) && (
        <Alert severity="error" role="alert">
          {options.isError ? 'Some filter choices could not be loaded. You can retry the page.' : 'The employee export could not be prepared. Please try again.'}
        </Alert>
      )}
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <EmployeeFilterBar
            filters={draftFilters}
            options={options.data}
            onChange={setDraftFilters}
            onApply={applyFilters}
            onClear={clearFilters}
          />
        </CardContent>
      </Card>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography variant="h2">Employees</Typography>
          {activeFilterCount > 0 && <Chip size="small" label={activeFilterCount + ' filters'} />}
        </Stack>
        {employees.data && <Typography color="text.secondary" variant="body2">{employees.data.pagination.total.toLocaleString()} matching records</Typography>}
      </Stack>
      <Card sx={{ overflow: 'hidden' }}>
        {employees.isLoading ? <Box sx={{ p: 2.5 }}><LoadingState label="Loading employees" /></Box> :
          employees.isError ? <Box sx={{ p: 2.5 }}><ErrorState message="The employee directory is unavailable." onRetry={() => employees.refetch()} /></Box> :
          employees.data?.data.length === 0 ? (
            <EmptyState
              title="No employees found"
              description={activeFilterCount ? 'Change or clear the filters to widen your search.' : 'Add the first employee or migrate records from a CSV file.'}
              action={<Button variant="contained" onClick={() => setCreateOpen(true)}>Add employee</Button>}
            />
          ) : employees.data && (
            <EmployeeTable employees={employees.data.data} sortBy={query.sortBy!} sortOrder={query.sortOrder!} onSort={sortBy} />
          )}
      </Card>
      {employees.data && employees.data.pagination.totalPages > 1 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" gap={2}>
          <Typography variant="body2" color="text.secondary">Page {employees.data.pagination.page} of {employees.data.pagination.totalPages}</Typography>
          <Pagination count={employees.data.pagination.totalPages} page={employees.data.pagination.page} onChange={(_, page) => navigate({ page }, false)} color="primary" />
        </Stack>
      )}
      <EmployeeFormDialog open={createOpen} options={options.data} onClose={() => setCreateOpen(false)} />
    </Stack>
  );
}
