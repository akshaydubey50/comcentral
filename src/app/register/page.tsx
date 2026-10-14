'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, CircularProgress, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AuthLayout } from '@/components/auth-layout';
import { PasswordField } from '@/components/password-field';
import { ApiClientError, api } from '@/lib/api-client';

type Fields = { name: string; email: string; password: string; confirmation: string };
type FieldErrors = Partial<Record<keyof Fields, string>>;

function registrationError(error: Error): string {
  if (error instanceof ApiClientError) {
    if (['USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'].includes(error.code)) {
      return 'An account with this email already exists. Sign in or use another email.';
    }
    if (error.code === 'EMAIL_PASSWORD_SIGN_UP_DISABLED') {
      return 'Account creation is temporarily unavailable. Please try again later.';
    }
    if (error.status === 429) return 'Too many attempts. Please wait before trying again.';
    if (error.code === 'PASSWORD_TOO_SHORT' || error.code === 'PASSWORD_TOO_LONG') return 'Use a password with 5 to 128 characters.';
    if (error.code === 'INVALID_EMAIL') return 'Enter a valid work email.';
  }
  return 'We could not create your account. Please try again.';
}

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Fields>({ name: '', email: '', password: '', confirmation: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [accountCreated, setAccountCreated] = useState(false);
  const session = useQuery({ queryKey: ['session'], queryFn: api.session, retry: false });
  const signUp = useMutation({
    mutationFn: () => api.signUp(fields.name.trim(), fields.email.trim().toLowerCase(), fields.password),
    onSuccess: async () => {
      // Account creation must not be repeated if only the session check fails.
      setAccountCreated(true);
      setFields((current) => ({ ...current, password: '', confirmation: '' }));
      await queryClient.cancelQueries({ queryKey: ['session'] });
      try {
        const confirmed = await api.session();
        if (confirmed.user) {
          queryClient.setQueryData(['session'], confirmed);
          router.replace('/');
        }
      } catch {
        // Keep the successful account creation visible with a sign-in recovery link.
      }
    },
  });

  useEffect(() => {
    if (session.data?.user) router.replace('/');
  }, [router, session.data?.user]);

  function update(field: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signUp.isPending || accountCreated) return;
    const nextErrors: FieldErrors = {};
    if (!fields.name.trim()) nextErrors.name = 'Enter your full name.';
    else if (fields.name.trim().length > 160) nextErrors.name = 'Use 160 characters or fewer.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) nextErrors.email = 'Enter a valid work email.';
    else if (fields.email.trim().length > 254) nextErrors.email = 'Use an email address with 254 characters or fewer.';
    if (fields.password.length < 5 || fields.password.length > 128) nextErrors.password = 'Use 5 to 128 characters.';
    if (fields.password !== fields.confirmation) nextErrors.confirmation = 'Passwords must match.';
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      event.currentTarget.querySelector<HTMLInputElement>('[name="' + firstError + '"]')?.focus();
      return;
    }
    signUp.mutate();
  }

  if (session.data?.user) return <Typography role="status" sx={{ p: 4 }}>Opening your workspace…</Typography>;

  return (
    <AuthLayout
      title="Create your account"
      description="Join ComCentral to manage employee records and compensation in one place."
      footer={!accountCreated && <Typography variant="body2">Already have an account? <MuiLink component={Link} href="/login" fontWeight={700}>Sign in</MuiLink></Typography>}
    >
      {session.isPending ? (
        <Typography role="status">Checking your session…</Typography>
      ) : accountCreated ? (
        <Stack spacing={2}>
          {signUp.isPending ? <Typography role="status">Opening your workspace…</Typography> : (
            <>
              <Alert severity="success" role="status">Your account was created. Sign in to open your workspace.</Alert>
              <Button component={Link} href="/login" variant="contained">Sign in</Button>
            </>
          )}
        </Stack>
      ) : (
        <Stack component="form" noValidate onSubmit={submit} spacing={2.25} aria-busy={signUp.isPending}>
          {signUp.isError && <Alert severity="error" role="alert">{registrationError(signUp.error)}</Alert>}
          {session.isError && <Alert severity="warning" action={<Button color="inherit" onClick={() => session.refetch()} disabled={session.isFetching}>Retry</Button>}>We could not check your current session.</Alert>}
          <TextField name="name" label="Full name" value={fields.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" required fullWidth disabled={signUp.isPending} error={Boolean(errors.name)} helperText={errors.name} />
          <TextField name="email" label="Work email" type="email" value={fields.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" required fullWidth disabled={signUp.isPending} error={Boolean(errors.email)} helperText={errors.email} />
          <PasswordField name="password" label="Password" value={fields.password} onChange={(event) => update('password', event.target.value)} autoComplete="new-password" required fullWidth disabled={signUp.isPending} error={Boolean(errors.password)} helperText={errors.password || 'Use 5 to 128 characters.'} />
          <PasswordField name="confirmation" label="Confirm password" value={fields.confirmation} onChange={(event) => update('confirmation', event.target.value)} autoComplete="new-password" required fullWidth disabled={signUp.isPending} error={Boolean(errors.confirmation)} helperText={errors.confirmation} />
          <Button type="submit" variant="contained" size="large" disabled={signUp.isPending}>
            {signUp.isPending ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Creating account…</> : 'Create account'}
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}
