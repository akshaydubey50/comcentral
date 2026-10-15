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
    icon: <History aria-hidden />,
    title: 'Keep salary decisions traceable',
    description: 'Record each salary change with its reason, previous amount, new amount, author, and date. Revisit the history on the employee record.',
  },
  {
    icon: <ChartNoAxesCombined aria-hidden />,
    title: 'Understand current pay',
    description: 'Compare headcount, pay ranges, and tenure groups in native currencies, with dated approximate USD reporting when FX data is available.',
  },
] as const;

const steps = [
  { title: 'Create your HR account', description: 'Register with your name, work email, and password to open the workspace immediately.' },
  { title: 'Bring your employee records', description: 'Add employees individually or download the CSV template, validate your file, and confirm the import.' },
  { title: 'Maintain and understand pay', description: 'Find employees, record salary changes, and explore reports for the population you select.' },
] as const;

/** Public product content shared by the anonymous home and the permanent welcome route. */
export function WelcomeContent() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Button component="a" className="skip-link" href="#home-content">Skip to content</Button>
      <Box sx={{
        position: 'relative',
        color: 'white',
        bgcolor: 'primary.dark',
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
            <Stack component="nav" aria-label="Home navigation" direction="row" gap={{ xs: .5, sm: 1 }}>
              <Button component="a" href="#features" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Features</Button>
              <Button component="a" href="#how-it-works" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>How it works</Button>
              <Button component="a" href="/login" color="inherit" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,.55)' }}>Sign in</Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
      <Box component="main" id="home-content" tabIndex={-1}>
        <Box sx={{ bgcolor: 'primary.dark', color: 'white' }}>
          <Container maxWidth="lg">
          <Box component="section" aria-labelledby="home-title" sx={{ maxWidth: 820, py: { xs: 6, sm: 8, md: 10 } }}>
            <Chip label="Built for day-to-day HR operations" sx={{ mb: 2.5, color: 'white', bgcolor: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)' }} />
            <Typography component="h1" id="home-title" sx={{ fontSize: 'clamp(2.4rem, 7vw, 4.8rem)', lineHeight: 1.05, fontWeight: 760, letterSpacing: '-.055em', maxWidth: 820 }}>
              HR records and pay context in one workspace.
            </Typography>
            <Typography sx={{ mt: 3, maxWidth: 650, color: '#d9e8e5', fontSize: { xs: '1.05rem', sm: '1.2rem' }, lineHeight: 1.65 }}>
              Maintain employee details, review salary history, migrate records from CSV, and examine current compensation without losing the underlying figures.
            </Typography>
            <Stack component="nav" aria-label="Get started" direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'center' } }}>
              <Button component="a" href="/register" variant="contained" size="large" sx={{ bgcolor: 'white', color: 'primary.dark', '&:hover': { bgcolor: '#edf6f4' } }}>
                Create account
              </Button>
              <Button component="a" href="/login" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'rgba(255,255,255,.55)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.08)' } }}>
                Sign in
              </Button>
            </Stack>
            <Typography variant="body2" sx={{ mt: 2, color: '#d9e8e5' }}>Create an HR account for immediate access to the shared workspace.</Typography>
          </Box>
          </Container>
        </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box component="section" id="features" aria-labelledby="features-title" sx={{ scrollMarginTop: 24 }}>
        <Stack spacing={1} sx={{ maxWidth: 650, mb: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="primary.main" fontWeight={800}>What you can do</Typography>
          <Typography component="h2" id="features-title" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, lineHeight: 1.15, fontWeight: 740, letterSpacing: '-.035em' }}>
            Practical tools for employee and compensation work
          </Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
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
        </Box>

        <Box component="section" id="how-it-works" aria-labelledby="workflow-title" sx={{ mt: { xs: 6, md: 8 }, scrollMarginTop: 24 }}>
          <Typography variant="overline" color="primary.main" fontWeight={800}>How it works</Typography>
          <Typography component="h2" id="workflow-title" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 740, letterSpacing: '-.035em' }}>From spreadsheet to daily HR work</Typography>
          <Box component="ol" sx={{ listStyle: 'none', p: 0, mt: 3, mb: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 3, md: 4 } }}>
            {steps.map((step, index) => (
              <Box component="li" key={step.title} sx={{ borderTop: '2px solid', borderColor: 'primary.main', pt: 2 }}>
                <Typography aria-hidden variant="overline" color="primary.main" fontWeight={800}>0{index + 1}</Typography>
                <Typography component="h3" variant="h2" sx={{ mt: .5 }}>{step.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>{step.description}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box component="section" aria-labelledby="access-title" sx={{ mt: { xs: 6, md: 8 }, p: { xs: 3, sm: 4 }, borderRadius: 2, bgcolor: 'primary.light' }}>
          <Typography component="h2" id="access-title" variant="h2">One shared HR workspace</Typography>
          <Typography sx={{ mt: 1, maxWidth: 760, lineHeight: 1.7 }}>Every registered HR account can view and manage the same organization&apos;s employee and salary records. Registration opens the workspace immediately, with no invitation or approval step.</Typography>
          <Button component="a" href="/register" variant="contained" sx={{ mt: 2.5 }}>Get started with ComCentral</Button>
        </Box>
      </Container>
      </Box>
      <Container component="footer" maxWidth="lg" sx={{ pb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2} sx={{ pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">ComCentral · Employee records and annual base pay</Typography>
          <Button component="a" href="/login" variant="text">Open your workspace</Button>
        </Stack>
      </Container>
    </Box>
  );
}
