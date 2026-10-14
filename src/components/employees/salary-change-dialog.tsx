'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel,
  MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiClientError, api } from '@/lib/api-client';
import { CURRENCY_PRECISION, formatCurrency } from '@/lib/formatters';
import { CURRENCIES, type Currency, type Employee } from '@/shared/contracts';

type SalaryChangeDialogProps = {
  employee: Employee;
  open: boolean;
  onClose: () => void;
};

export function SalaryChangeDialog(props: SalaryChangeDialogProps) {
  return props.open ? <SalaryChangeContent key={props.employee.id} {...props} /> : null;
}

function SalaryChangeContent({ employee: currentEmployee, open, onClose }: SalaryChangeDialogProps) {
  // Keep the salary and version the HR manager actually opened together.
  const [employee, setEmployee] = useState(currentEmployee);
  const queryClient = useQueryClient();
  const [salary, setSalary] = useState(employee.salary);
  const [currency, setCurrency] = useState<Currency>(employee.currency);
  const [reason, setReason] = useState('');
  const [reloadNotice, setReloadNotice] = useState(false);


  const change = useMutation({
    mutationFn: () => api.changeSalary(employee.id, { salary, currency, reason, version: employee.version }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(['employee', employee.id], saved);
      await queryClient.invalidateQueries({ queryKey: ['salary-history', employee.id] });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['insights'] });
      onClose();
    },
  });
  const reloadLatest = useMutation({
    mutationFn: () => api.employee(employee.id),
    onSuccess: async (latest) => {
      queryClient.setQueryData(['employee', latest.id], latest);
      setEmployee(latest);
      setSalary(latest.salary);
      setCurrency(latest.currency);
      setReason('');
      setReloadNotice(true);
      await queryClient.invalidateQueries({ queryKey: ['salary-history', employee.id] });
      change.reset();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    change.mutate();
  }

  const conflict = change.error instanceof ApiClientError && change.error.status === 409;

  return (
    <Dialog open={open} onClose={change.isPending || reloadLatest.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="salary-change-title">
      <Stack component="form" onSubmit={submit}>
        <DialogTitle id="salary-change-title">Change annual salary</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            <Typography color="text.secondary">
              Current base salary: <strong>{formatCurrency(employee.salary, employee.currency)}</strong>. The change applies immediately and will be recorded in salary history.
            </Typography>
            {conflict && (
              <Alert
                severity="error"
                role="alert"
                action={
                  <Button
                    color="inherit"
                    onClick={() => reloadLatest.mutate()}
                    disabled={reloadLatest.isPending}
                  >
                    {reloadLatest.isPending ? 'Reloading…' : 'Reload latest'}
                  </Button>
                }
              >
                This record changed after you opened it. Reload the latest record to review it before submitting again.
              </Alert>
            )}
            {change.isError && !conflict && <Alert severity="error" role="alert">{change.error.message}</Alert>}
            {reloadLatest.isError && <Alert severity="error" role="alert">The latest employee record could not be loaded. Your draft is still available.</Alert>}
            {reloadNotice && <Alert severity="info" role="status">The latest employee was loaded. Salary and reason were reset so you can review the new record before submitting.</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                autoFocus
                label="New annual base salary"
                value={salary}
                onChange={(event) => setSalary(event.target.value)}
                required
                fullWidth
                inputMode="decimal"
                helperText={'Use ' + CURRENCY_PRECISION[currency] + ' decimal places for ' + currency}
              />
              <FormControl sx={{ minWidth: 140 }} required>
                <InputLabel id="salary-currency-label">Currency</InputLabel>
                <Select labelId="salary-currency-label" label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
                  {CURRENCIES.map((code) => <MenuItem key={code} value={code}>{code}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Reason for change"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              multiline
              minRows={3}
              inputProps={{ maxLength: 500 }}
              helperText="This explanation becomes part of the permanent audit record."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={change.isPending || reloadLatest.isPending}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={change.isPending || reloadLatest.isPending || conflict || employee.status === 'ARCHIVED'}>{change.isPending ? 'Applying…' : 'Apply salary change'}</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
