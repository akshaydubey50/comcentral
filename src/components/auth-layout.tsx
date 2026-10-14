import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { Building2, LockKeyhole } from 'lucide-react';

/** Keeps account entry pages consistent across desktop and mobile layouts. */
export function AuthLayout({ title, description, children, footer }: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { md: 'minmax(360px, 520px) 1fr' }, bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2.5, sm: 5 } }}>
        <Box sx={{ width: '100%', maxWidth: 410 }}>
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 4 }}>
            <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 1.5, bgcolor: 'primary.main', color: 'white' }}>
              <Building2 size={21} aria-hidden />
            </Box>
            <Typography fontWeight={800} fontSize="1.05rem">ComCentral</Typography>
          </Stack>
          <Typography component="h1" variant="h1">{title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{description}</Typography>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, '&:last-child': { pb: { xs: 2.5, sm: 3.5 } } }}>
              {children}
            </CardContent>
          </Card>
          {footer && <Box sx={{ mt: 2, textAlign: 'center' }}>{footer}</Box>}
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
