'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Stack, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, Pencil, RotateCcw, WalletCards } from 'lucide-react';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { ApiClientError, api } from '@/lib/api-client';
import { formatCurrency, formatDate, formatEmploymentType } from '@/lib/formatters';
import { EmployeeFormDialog } from './employee-form-dialog';
import { SalaryChangeDialog } from './salary-change-dialog';
import { SalaryHistoryTable } from './salary-history-table';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={650} sx={{ mt: 0.25 }}>{children}</Typography>
    </Box>
  );
}

export function EmployeeDetails({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const employee = useQuery({ queryKey: ['employee', id], queryFn: () => api.employee(id), retry: false });
  const history = useQuery({ queryKey: ['salary-history', id], queryFn: () => api.salaryHistory(id), enabled: employee.isSuccess, retry: false });
  const options = useQuery({ queryKey: ['directory-options'], queryFn: api.options });
  const statusChange = useMutation({
    mutationFn: () => {
      if (!employee.data) throw new Error('Employee is unavailable.');
      return api.setArchived(employee.data.id, employee.data.version, employee.data.status === 'ACTIVE');
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['employee', id], saved);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['insights'] });
      setStatusOpen(false);
    },
  });

  if (employee.isLoading) return <LoadingState label="Loading employee" />;
  if (employee.isError) {
    const missing = employee.error instanceof ApiClientError && employee.error.status === 404;
    return missing
      ? <EmptyState title="Employee not found" description="The record may have been removed or the link is no longer valid." action={<Button component={Link} href="/employees">Return to directory</Button>} />
      : <ErrorState message="The employee record is unavailable." onRetry={() => employee.refetch()} />;
  }
  if (!employee.data) return null;

  const record = employee.data;
  const archived = record.status === 'ARCHIVED';
  const conflict = statusChange.error instanceof ApiClientError && statusChange.error.status === 409;

  return (
    <Stack spacing={3}>
      <Box>
        <Button component={Link} href="/employees" startIcon={<ArrowLeft size={18} />} sx={{ mb: 1.5 }}>Employee directory</Button>
        <PageHeader
          eyebrow={record.employeeCode}
          title={record.name}
          description={record.jobRole + ' · ' + record.department}
          actions={
            <>
              <Button variant="outlined" startIcon={<Pencil size={18} />} onClick={() => setEditOpen(true)}>Edit details</Button>
              <Button variant="contained" startIcon={<WalletCards size={18} />} onClick={() => setSalaryOpen(true)} disabled={archived}>Change salary</Button>
            </>
          }
        />
      </Box>
      {archived && <Alert severity="warning">This employee is archived. Restore the record before making a salary change.</Alert>}
      {statusChange.isError && <Alert severity="error" role="alert">{conflict ? 'This employee changed since the page loaded. Refresh the record before trying again.' : statusChange.error.message}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(290px, .8fr)' }, gap: 3 }}>
        <Card>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Typography component="h2" variant="h2">Employment details</Typography>
              <Chip label={archived ? 'Archived' : 'Active'} color={archived ? 'default' : 'success'} variant="outlined" />
            </Stack>
            <Divider sx={{ my: 2.5 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
              <Detail label="Work email">{record.email}</Detail>
              <Detail label="Country">{options.data?.countries.find((country) => country.code === record.country)?.name ?? record.country}</Detail>
              <Detail label="Department">{record.department}</Detail>
              <Detail label="Job role">{record.jobRole}</Detail>
              <Detail label="Employment type">{formatEmploymentType(record.employmentType)}</Detail>
              <Detail label="Joining date">{formatDate(record.joiningDate)}</Detail>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#eef6f3' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography component="h2" variant="h3" color="text.secondary">Current annual base salary</Typography>
            <Typography sx={{ fontSize: 'clamp(1.65rem, 3vw, 2.15rem)', fontWeight: 800, mt: 1, letterSpacing: '-.035em', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(record.salary, record.currency)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Gross contractual commitment. Payroll, bonus, tax, and deductions are outside this view.</Typography>
            <Divider sx={{ my: 2.5 }} />
            <Button
              color={archived ? 'primary' : 'error'}
              variant="text"
              startIcon={archived ? <RotateCcw size={18} /> : <Archive size={18} />}
              onClick={() => setStatusOpen(true)}
            >
              {archived ? 'Restore employee' : 'Archive employee'}
            </Button>
          </CardContent>
        </Card>
      </Box>
      <Box>
        <Typography component="h2" variant="h2" sx={{ mb: 1.5 }}>Salary history</Typography>
        <Card sx={{ overflow: 'hidden' }}>
          <SalaryHistoryTable history={history.data} loading={history.isLoading} error={history.isError} onRetry={() => history.refetch()} />
        </Card>
      </Box>
      <EmployeeFormDialog open={editOpen} employee={record} options={options.data} onClose={() => setEditOpen(false)} />
      <SalaryChangeDialog open={salaryOpen} employee={record} onClose={() => setSalaryOpen(false)} />
      <Dialog open={statusOpen} onClose={() => !statusChange.isPending && setStatusOpen(false)} aria-labelledby="employee-status-title">
        <DialogTitle id="employee-status-title">{archived ? 'Restore employee?' : 'Archive employee?'}</DialogTitle>
        <DialogContent>
          <Typography>{archived ? 'The employee will return to the active directory and reporting.' : 'The employee will leave active reports, while their record and salary history remain available.'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)} disabled={statusChange.isPending}>Cancel</Button>
          <Button variant="contained" color={archived ? 'primary' : 'error'} onClick={() => statusChange.mutate()} disabled={statusChange.isPending}>
            {statusChange.isPending ? 'Saving…' : archived ? 'Restore' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
