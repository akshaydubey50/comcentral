'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert, Box, Button, Card, CardContent, Chip, Stack, Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';

import { api, downloadBlob } from '@/lib/api-client';
import { parseEmployeeQuery } from '@/lib/query-state';
import type { Employee, EmployeeFilters, EmployeeQuery, EmployeeSort } from '@/shared/contracts';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { EmployeeFilterBar } from './employee-filters';
import { EmployeeFormDialog } from './employee-form-dialog';
import { EmployeeCards } from './employee-cards';
import { EmployeeTable } from './employee-table';
import { EmployeePagination } from './employee-pagination';

const defaultFilters: EmployeeFilters = { status: 'ACTIVE' };

/** Filter drafts must not carry a captured page, page size, or sort order. */
function filterValues(query: EmployeeFilters): EmployeeFilters {
  const filters: EmployeeQuery = { ...query };
  for (const key of ['page', 'pageSize', 'sortBy', 'sortOrder'] as const) delete filters[key];
  return filters;
}

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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const query = useMemo<EmployeeQuery>(() => parseEmployeeQuery(search), [search]);
  const [draftFilters, setDraftFilters] = useState<EmployeeFilters>(() => filterValues(query));


  const employees = useQuery({
    queryKey: ['employees', query],
    queryFn: () => api.employees(query),
  });
  const options = useQuery({ queryKey: ['directory-options'], queryFn: api.options });
  const exportRows = useMutation({
    mutationFn: () => api.exportEmployees({
      q: query.q, country: query.country, department: query.department, jobRole: query.jobRole,
      employmentType: query.employmentType, status: query.status, salaryStatus: query.salaryStatus,
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
    navigate(filterValues(draftFilters));
  }

  function clearFilters() {
    setDraftFilters(defaultFilters);
    navigate({ q: undefined, country: undefined, department: undefined, jobRole: undefined, employmentType: undefined, salaryStatus: undefined, status: 'ACTIVE' });
  }

  function sortBy(key: EmployeeSort) {
    navigate({ sortBy: key, sortOrder: query.sortBy === key && query.sortOrder === 'asc' ? 'desc' : 'asc' });
  }

  function openCreate() {
    setEditingEmployee(null);
    setCreateOpen(true);
  }

  function openEdit(employee: Employee) {
    setCreateOpen(false);
    setEditingEmployee(employee);
  }

  const activeFilterCount = ['q', 'country', 'department', 'jobRole', 'employmentType', 'salaryStatus']
    .filter((key) => Boolean(query[key as keyof EmployeeQuery])).length
    + (query.status && query.status !== 'ACTIVE' ? 1 : 0);
  const canCreateEmployee = Boolean(options.data?.countries.length);
  const canEditEmployee = Boolean(options.data?.countries.length);
  const editUnavailableReason = options.isError
    ? 'Editing is unavailable until filter choices are reloaded.'
    : 'Editing is available after filter choices load.';
  const pagination = employees.data?.pagination;
  const pageUnavailable = Boolean(pagination && pagination.total > 0 && pagination.page > pagination.totalPages);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="People operations"
        title="Employee directory"
        description="Use View to open a record or Edit to update its details. Delete is available on the employee page; deleted records can be restored from the Archived view."
        actions={
          <>
            <Button variant="outlined" startIcon={<Download size={18} />} onClick={() => exportRows.mutate()} disabled={exportRows.isPending}>
              {exportRows.isPending ? 'Preparing…' : 'Export matching'}
            </Button>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate} disabled={!canCreateEmployee}>Add employee</Button>
          </>
        }
      />
      {(options.isError || exportRows.isError) && (
        <Alert
          severity="error"
          role="alert"
          action={options.isError ? (
            <Button color="inherit" onClick={() => options.refetch()} disabled={options.isFetching}>
              {options.isFetching ? 'Retrying…' : 'Retry filter choices'}
            </Button>
          ) : undefined}
        >
          {options.isError
            ? options.data
              ? 'Filter choices could not be refreshed. Previously loaded choices remain available and may be incomplete.'
              : 'Filter choices could not be loaded. Adding and editing employees are unavailable until you retry.'
            : 'The employee export could not be prepared. Please try again.'}
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
          {activeFilterCount > 0 && <Chip size="small" label={activeFilterCount + (activeFilterCount === 1 ? ' filter' : ' filters')} />}
        </Stack>
        {employees.data && <Typography color="text.secondary" variant="body2">{employees.data.pagination.total.toLocaleString()} matching records</Typography>}
      </Stack>
      <Card sx={{ overflow: 'hidden' }}>
        {employees.isLoading ? <Box sx={{ p: 2.5 }}><LoadingState label="Loading employees" /></Box> :
          employees.isError ? <Box sx={{ p: 2.5 }}><ErrorState message="The employee directory is unavailable." onRetry={() => employees.refetch()} /></Box> :
          employees.data?.data.length === 0 ? (
            pageUnavailable ? <EmptyState
              title="This page is no longer available"
              description="Matching employees still exist, but the requested page is outside the current results. Return to the first page without changing your filters."
              action={<Button variant="contained" onClick={() => navigate({ page: 1 }, false)} sx={{ minHeight: 44 }}>Go to first page</Button>}
            /> : <EmptyState
              title="No employees found"
              description={activeFilterCount ? 'Change or clear the filters to widen your search.' : 'Add the first employee or migrate records from a CSV file.'}
              action={<Button variant="contained" onClick={openCreate} disabled={!canCreateEmployee}>Add employee</Button>}
            />
          ) : employees.data && (
            <>
              {!canEditEmployee && <Typography role="status" variant="body2" color="text.secondary" sx={{ px: 2.5, pt: 2 }}>{editUnavailableReason}</Typography>}
              <EmployeeCards employees={employees.data.data} sortBy={query.sortBy!} sortOrder={query.sortOrder!} onSort={sortBy} onEdit={openEdit} editDisabled={!canEditEmployee} editUnavailableReason={editUnavailableReason} />
              <EmployeeTable employees={employees.data.data} sortBy={query.sortBy!} sortOrder={query.sortOrder!} onSort={sortBy} onEdit={openEdit} editDisabled={!canEditEmployee} editUnavailableReason={editUnavailableReason} />
            </>
          )}
        {employees.isSuccess && pagination && (
          <EmployeePagination
            pagination={pagination}
            visibleCount={employees.data.data.length}
            busy={employees.isFetching}
            onPageChange={(page) => navigate({ page }, false)}
            onPageSizeChange={(pageSize) => navigate({ pageSize })}
          />
        )}
      </Card>
      <EmployeeFormDialog open={createOpen} options={options.data} onClose={() => setCreateOpen(false)} />
      <EmployeeFormDialog open={editingEmployee !== null} employee={editingEmployee ?? undefined} options={options.data} onClose={() => setEditingEmployee(null)} />
    </Stack>
  );
}
