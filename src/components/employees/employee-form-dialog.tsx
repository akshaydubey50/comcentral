'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  InputLabel, MenuItem, Select, Stack, TextField,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiClientError, api } from '@/lib/api-client';
import { CURRENCY_PRECISION, formatEmploymentType } from '@/lib/formatters';
import {
  CURRENCIES, EMPLOYMENT_TYPES, type DirectoryOptions, type Employee, type EmployeeInput, type EmployeeUpdate,
} from '@/shared/contracts';

function employeeToInput(employee: Employee): EmployeeInput {
  return {
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    country: employee.country,
    department: employee.department,
    jobRole: employee.jobRole,
    employmentType: employee.employmentType,
    joiningDate: employee.joiningDate,
    salary: employee.salary ?? '',
    currency: employee.currency,
  };
}

const blankEmployee: EmployeeInput = {
  employeeCode: '', name: '', email: '', country: '', department: '', jobRole: '',
  employmentType: 'FULL_TIME', joiningDate: '', salary: '', currency: 'USD',
};

type EmployeeFormDialogProps = {
  open: boolean;
  employee?: Employee;
  options?: DirectoryOptions;
  onClose: () => void;
  onSaved?: (employee: Employee) => void;
};

export function EmployeeFormDialog(props: EmployeeFormDialogProps) {
  // Reopening starts fresh; background refetches must preserve an open draft.
  return props.open ? <EmployeeFormContent key={props.employee?.id ?? 'new'} {...props} /> : null;
}

function EmployeeFormContent({ open, employee, options, onClose, onSaved }: EmployeeFormDialogProps) {
  const queryClient = useQueryClient();
  const [initial] = useState<EmployeeInput>(() => employee ? employeeToInput(employee) : blankEmployee);
  const [form, setForm] = useState<EmployeeInput>(initial);
  const [baseline, setBaseline] = useState<EmployeeInput>(initial);
  const [version, setVersion] = useState(employee?.version);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);


  const save = useMutation({
    mutationFn: async () => {
      if (employee) {
        const update: EmployeeUpdate = {
          employeeCode: form.employeeCode,
          name: form.name,
          email: form.email,
          country: form.country,
          department: form.department,
          jobRole: form.jobRole,
          employmentType: form.employmentType,
          joiningDate: form.joiningDate,
          version: version ?? employee.version,
        };
        return api.updateEmployee(employee.id, update);
      }
      return api.createEmployee(form);
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['employee', saved.id], saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['directory-options'] }),
        queryClient.invalidateQueries({ queryKey: ['insights'] }),
      ]);
      onSaved?.(saved);
      onClose();
    },
  });
  const reloadLatest = useMutation({
    mutationFn: () => {
      if (!employee) throw new Error('Only existing employees can be reloaded.');
      return api.employee(employee.id);
    },
    onSuccess: (latest) => {
      const latestInput = employeeToInput(latest);
      queryClient.setQueryData(['employee', latest.id], latest);
      setForm(latestInput);
      setBaseline(latestInput);
      setVersion(latest.version);
      save.reset();
    },
  });

  const versionConflict = save.error instanceof ApiClientError && save.error.code === 'VERSION_CONFLICT';
  const duplicateEmployee = save.error instanceof ApiClientError && save.error.code === 'DUPLICATE_EMPLOYEE';
  const busy = save.isPending || reloadLatest.isPending;
  const errorMessage = duplicateEmployee
    ? 'An employee already uses this code or work email. Use a unique value and try again.'
    : save.error instanceof Error ? save.error.message : null;

  function close() {
    if (busy) return;
    if (!dirty || window.confirm('Discard your unsaved employee changes?')) onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || versionConflict) return;
    save.mutate();
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md" aria-labelledby="employee-form-title">
      <Stack component="form" onSubmit={submit}>
        <DialogTitle id="employee-form-title">{employee ? 'Edit employee details' : 'Add employee'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            {versionConflict && (
              <Alert
                severity="error"
                role="alert"
                action={<Button color="inherit" onClick={() => reloadLatest.mutate()} disabled={reloadLatest.isPending}>{reloadLatest.isPending ? 'Reloading…' : 'Reload latest'}</Button>}
              >
                This employee changed after you opened the form. Reload the latest record before editing again.
              </Alert>
            )}
            {reloadLatest.isError && <Alert severity="error" role="alert">The latest employee record could not be loaded. Close the form and try again.</Alert>}
            {!versionConflict && errorMessage && <Alert severity="error" role="alert">{errorMessage}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Employee code" value={form.employeeCode} onChange={(event) => setForm({ ...form, employeeCode: event.target.value })} required fullWidth inputProps={{ maxLength: 40 }} />
              <TextField label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required fullWidth inputProps={{ maxLength: 160 }} />
            </Stack>
            <TextField label="Work email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel id="employee-country-label">Country</InputLabel>
                <Select labelId="employee-country-label" label="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}>
                  {options?.countries.map((country) => <MenuItem key={country.code} value={country.code}>{country.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel id="employee-type-label">Employment type</InputLabel>
                <Select labelId="employee-type-label" label="Employment type" value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value as EmployeeInput['employmentType'] })}>
                  {EMPLOYMENT_TYPES.map((type) => <MenuItem key={type} value={type}>{formatEmploymentType(type)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete freeSolo fullWidth options={options?.departments ?? []} value={form.department} onInputChange={(_, value) => setForm({ ...form, department: value })} renderInput={(params) => <TextField {...params} label="Department" required inputProps={{ ...params.inputProps, maxLength: 100 }} />} />
              <Autocomplete freeSolo fullWidth options={options?.jobRoles ?? []} value={form.jobRole} onInputChange={(_, value) => setForm({ ...form, jobRole: value })} renderInput={(params) => <TextField {...params} label="Job role" required inputProps={{ ...params.inputProps, maxLength: 100 }} />} />
            </Stack>
            <TextField label="Joining date" type="date" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} required fullWidth InputLabelProps={{ shrink: true }} inputProps={{ max: new Date().toISOString().slice(0, 10) }} />
            {!employee && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Annual base salary" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} required fullWidth inputMode="decimal" placeholder={CURRENCY_PRECISION[form.currency] === 0 ? '5000000' : '75000.00'} helperText={'Use ' + CURRENCY_PRECISION[form.currency] + ' decimal places for ' + form.currency} />
                <FormControl sx={{ minWidth: 150 }} required>
                  <InputLabel id="employee-currency-label">Currency</InputLabel>
                  <Select labelId="employee-currency-label" label="Currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as EmployeeInput['currency'] })}>
                    {(options?.currencies ?? CURRENCIES).map((currency) => <MenuItem key={currency} value={currency}>{currency}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || versionConflict}>{save.isPending ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
