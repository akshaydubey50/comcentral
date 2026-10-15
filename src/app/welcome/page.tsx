import type { Metadata } from 'next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import {
  Building2,
  ChartNoAxesCombined,
  FileCheck2,
  History,
  SearchCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Welcome to ComCentral',
  description: 'Learn how ComCentral supports employee records, salary history, CSV migration, and pay reporting.',
};

const capabilities = [
  {
    icon: <SearchCheck aria-hidden />,
    title: 'Keep the directory useful',
    description: 'Create, update, archive, restore, filter, and export employee records from one workspace.',
  },
  {
    icon: <FileCheck2 aria-hidden />,
    title: 'Review CSV migrations',
    description: 'Validate a CSV, inspect row-level issues, and confirm the reviewed file before records are imported.',
  },
  {
    icon: <ChartNoAxesCombined aria-hidden />,
    title: 'Understand current pay',
    description: 'Compare headcount, pay ranges, and tenure groups in native currencies, with dated approximate USD reporting when FX data is available.',
  },
] as const;

export default function WelcomePage() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Box sx={{
        position: 'relative',
        color: 'white',
        bgcolor: '#083f3d',
        backgroundImage: 'radial-gradient(circle at 85% 5%, rgba(115, 190, 180, .24), transparent 30%), radial-gradient(circle at 8% 90%, rgba(214, 151, 97, .18), transparent 26%)',
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 3, md: 4 } }}>
          <Stack component="header" direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={1.25}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 1.5, bgcolor: 'white', color: 'primary.dark' }}>
                <Building2 size={22} aria-hidden />
              </Box>
              <Box>
                <Typography fontWeight={800} lineHeight={1.1}>ComCentral</Typography>
                <Typography variant="caption" sx={{ color: '#c5dad7' }}>HR workspace</Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: '#c5dad7' }}>
              Employee records and pay context
            </Typography>
          </Stack>

          <Box sx={{ maxWidth: 760, py: { xs: 8, sm: 10, md: 13 } }}>
            <Chip label="Built for day-to-day HR operations" sx={{ mb: 2.5, color: 'white', bgcolor: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)' }} />
            <Typography component="h1" sx={{ fontSize: 'clamp(2.4rem, 7vw, 4.8rem)', lineHeight: .98, fontWeight: 760, letterSpacing: '-.055em', maxWidth: 720 }}>
              HR records and pay context in one workspace.
            </Typography>
            <Typography sx={{ mt: 3, maxWidth: 650, color: '#d9e8e5', fontSize: { xs: '1.05rem', sm: '1.2rem' }, lineHeight: 1.65 }}>
              Maintain employee details, review salary history, migrate records from CSV, and examine current compensation without losing the underlying figures.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'center' } }}>
              <Button component="a" href="/register" variant="contained" size="large" sx={{ bgcolor: 'white', color: 'primary.dark', '&:hover': { bgcolor: '#edf6f4' } }}>
                Create account
              </Button>
              <Button component="a" href="/login" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.55)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.08)' } }}>
                Sign in
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Stack spacing={1} sx={{ maxWidth: 650, mb: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="primary.main" fontWeight={800}>What you can do</Typography>
          <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, lineHeight: 1.15, fontWeight: 740, letterSpacing: '-.035em' }}>
            Practical tools for employee and compensation work
          </Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {capabilities.map((capability) => (
            <Card key={capability.title} component="article" sx={{ height: '100%', bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 1.5, bgcolor: 'primary.light', color: 'primary.dark', mb: 2.5 }}>
                  {capability.icon}
                </Box>
                <Typography component="h3" variant="h2">{capability.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.7 }}>{capability.description}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2.5} sx={{ mt: { xs: 6, md: 8 }, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <History size={20} aria-hidden />
            <Typography color="text.secondary">Salary changes retain their reason and history for later review.</Typography>
          </Stack>
          <Button component="a" href="/login" variant="text">Open your workspace</Button>
        </Stack>
      </Container>
    </Box>
  );
}
