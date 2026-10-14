'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert, Button, CircularProgress, Link as MuiLink, Stack, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AuthLayout } from '@/components/auth-layout';
import { PasswordField } from '@/components/password-field';
import { ApiClientError, api } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionConfirmationError, setSessionConfirmationError] = useState<string | null>(null);
  const session = useQuery({ queryKey: ['session'], queryFn: api.session, retry: false });
  const signIn = useMutation({
    mutationFn: async () => { await api.signIn(email.trim().toLowerCase(), password); },
    onMutate: () => setSessionConfirmationError(null),
    onSuccess: async () => {
      try {
        await queryClient.cancelQueries({ queryKey: ['session'] });
        const confirmed = await api.session();
        if (!confirmed.user) {
          setSessionConfirmationError('Your sign-in did not establish a session. Please try again.');
          return;
        }
        queryClient.setQueryData(['session'], confirmed);
        router.replace('/');
      } catch {
        setSessionConfirmationError('We could not confirm your session. Please try again.');
      }
    },
  });

  useEffect(() => {
    if (session.data?.user) router.replace('/');
  }, [router, session.data?.user]);

  if (session.data?.user) {
    return <Typography role="status" sx={{ p: 4 }}>Opening your workspace…</Typography>;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn.isPending) signIn.mutate();
  }

  const message = sessionConfirmationError ?? (signIn.error instanceof ApiClientError && signIn.error.status === 401
    ? 'The email or password is not correct.'
    : signIn.error instanceof Error ? signIn.error.message : null);

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your HR account to manage compensation records."
      footer={<Typography variant="body2">New to ComCentral? <MuiLink component={Link} href="/register" fontWeight={700}>Create account</MuiLink></Typography>}
    >
      <Stack component="form" onSubmit={submit} spacing={2.25} aria-busy={signIn.isPending}>
        {message && <Alert severity="error" role="alert">{message}</Alert>}
        <TextField
          label="Work email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          fullWidth
          disabled={signIn.isPending}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          fullWidth
          disabled={signIn.isPending}
        />
        <Button type="submit" variant="contained" size="large" disabled={signIn.isPending}>
          {signIn.isPending ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Signing in…</> : 'Sign in'}
        </Button>
      </Stack>
    </AuthLayout>
  );
}
