import type { ReactNode } from 'react';
import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { CircleAlert, Inbox } from 'lucide-react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <Stack aria-busy="true" aria-label={label} spacing={1.5}>
      <Skeleton variant="rounded" height={52} />
      <Skeleton variant="rounded" height={52} />
      <Skeleton variant="rounded" height={52} />
    </Stack>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" icon={<CircleAlert size={20} />} action={onRetry ? <Button color="inherit" onClick={onRetry}>Retry</Button> : undefined}>
      {message}
    </Alert>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Box role="status" sx={{ textAlign: 'center', py: { xs: 6, md: 9 }, px: 2 }}>
      <Inbox size={32} aria-hidden color="#75817f" />
      <Typography variant="h3" sx={{ mt: 1.5 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 460, mx: 'auto' }}>{description}</Typography>
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
