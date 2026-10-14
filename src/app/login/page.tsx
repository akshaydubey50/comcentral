'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, LockKeyhole } from 'lucide-react';

import { ApiClientError, api } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const session = useQuery({ queryKey: ['session'], queryFn: api.session, retry: false });
  const signIn = useMutation({
    mutationFn: () => api.signIn(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      router.replace('/');
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
    signIn.mutate();
  }

  const message = signIn.error instanceof ApiClientError && signIn.error.status === 401
    ? 'The email or password is not correct.'
    : signIn.error instanceof Error ? signIn.error.message : null;

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { md: 'minmax(360px, 520px) 1fr' }, bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2.5, sm: 5 } }}>
        <Box sx={{ width: '100%', maxWidth: 410 }}>
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 5 }}>
            <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 1.5, bgcolor: 'primary.main', color: 'white' }}>
              <Building2 size={21} aria-hidden />
            </Box>
            <Typography fontWeight={800} fontSize="1.05rem">ComCentral</Typography>
          </Stack>
          <Typography component="h1" variant="h1">Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3.5 }}>Sign in with your provisioned HR account to manage compensation records.</Typography>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, '&:last-child': { pb: { xs: 2.5, sm: 3.5 } } }}>
              <Stack component="form" onSubmit={submit} spacing={2.25}>
                {message && <Alert severity="error" role="alert">{message}</Alert>}
                <TextField
                  label="Work email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  fullWidth
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={signIn.isPending}>
                  {signIn.isPending ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Signing in…</> : 'Sign in'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Accounts are created by an administrator. Public registration is unavailable.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'relative', overflow: 'hidden', bgcolor: '#083f3d', color: 'white', p: 7, alignItems: 'flex-end' }}>
        <Box sx={{ position: 'absolute', width: 420, height: 420, border: '1px solid rgba(255,255,255,.13)', borderRadius: '50%', right: -80, top: -100 }} />
        <Box sx={{ position: 'absolute', width: 230, height: 230, border: '1px solid rgba(255,255,255,.10)', borderRadius: '50%', right: 190, top: 80 }} />
        <Box sx={{ maxWidth: 560, position: 'relative' }}>
          <LockKeyhole size={28} aria-hidden />
          <Typography variant="h2" sx={{ mt: 2, fontSize: '1.8rem', color: 'white' }}>One dependable place for salary decisions.</Typography>
          <Typography sx={{ mt: 1.5, color: '#c5dad7', fontSize: '1.05rem', lineHeight: 1.7 }}>
            Maintain accurate employee records, inspect every pay change, and understand current annual commitments across the organization.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
