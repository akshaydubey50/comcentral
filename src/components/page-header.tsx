import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} gap={2}>
      <Box>
        {eyebrow && <Typography variant="overline" color="primary.main" fontWeight={750}>{eyebrow}</Typography>}
        <Typography component="h1" variant="h1">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>{description}</Typography>
      </Box>
      {actions && <Stack direction="row" gap={1} flexWrap="wrap">{actions}</Stack>}
    </Stack>
  );
}
