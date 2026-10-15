'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar, Avatar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Skeleton, Stack, Toolbar, Tooltip, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Building2, LogOut, Menu, Upload, Users, X } from 'lucide-react';

import { api } from '@/lib/api-client';
import { ErrorState } from './feedback';
import { WelcomeContent } from './welcome-content';

const drawerWidth = 248;
const navigation = [
  { href: '/', label: 'Overview', icon: BarChart3 },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/imports', label: 'CSV migration', icon: Upload },
];

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#083f3d', color: 'white' }}>
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ px: 2.5, height: 72 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 1.5, bgcolor: '#d8ebe8', color: '#083f3d' }}>
          <Building2 size={20} aria-hidden />
        </Box>
        <Box>
          <Typography fontWeight={800} lineHeight={1.05}>ComCentral</Typography>
          <Typography variant="caption" sx={{ color: '#b9d2cf' }}>HR workspace</Typography>
        </Box>
      </Stack>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.12)' }} />
      <List component="nav" aria-label="Primary navigation" sx={{ px: 1.25, py: 2 }}>
        {navigation.map(({ href, label, icon: Icon }) => {
          const selected = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={selected}
              onClick={onNavigate}
              sx={{
                minHeight: 46, borderRadius: 1.5, mb: 0.5, color: '#e9f4f1',
                '&.Mui-selected': { bgcolor: '#d8ebe8', color: '#073d3a', '&:hover': { bgcolor: '#d8ebe8' } },
                '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Icon size={19} aria-hidden /></ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontWeight: selected ? 750 : 550, fontSize: 14 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: 'auto', px: 2.5, pb: 2.5 }}>
        <Typography variant="caption" sx={{ color: '#9fc0bc' }}>Annual base compensation</Typography>
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ['session'], queryFn: api.session, retry: false });
  const signOut = useMutation({
    mutationFn: api.signOut,
    onSuccess: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });

  useEffect(() => {
    // Failed checks need a retry; only confirmed anonymous access to protected routes redirects.
    if (session.isSuccess && !session.data.user && pathname !== '/') router.replace('/login');
  }, [pathname, router, session.data?.user, session.isSuccess]);

  if (session.isLoading) {
    return <Stack sx={{ p: 4 }} spacing={2} aria-label="Loading workspace"><Skeleton width={180} height={42} /><Skeleton variant="rounded" height={420} /></Stack>;
  }
  if (session.isError) {
    return <Box sx={{ maxWidth: 680, mx: 'auto', mt: 8, px: 2 }}><ErrorState message="We could not verify your session." onRetry={() => session.refetch()} /></Box>;
  }
  if (!session.data?.user) {
    if (pathname === '/') return <WelcomeContent />;
    return <Typography role="status" sx={{ p: 4 }}>Taking you to sign in…</Typography>;
  }

  const user = session.data.user;
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Button className="skip-link" href="#main-content">Skip to content</Button>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, border: 0 } }}>
        <Navigation pathname={pathname} />
      </Drawer>
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}>
        <Box sx={{ position: 'absolute', zIndex: 1, right: 4, top: 8 }}>
          <IconButton aria-label="Close navigation" onClick={() => setMobileOpen(false)} sx={{ color: 'white' }}><X /></IconButton>
        </Box>
        <Navigation pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,253,249,.94)', backdropFilter: 'blur(10px)' }}>
          <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 } }}>
            <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }}><Menu /></IconButton>
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" alignItems="center" gap={1.25}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.light', color: 'primary.dark', fontSize: 14, fontWeight: 800 }}>
                {user.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={700} lineHeight={1.1}>{user.name}</Typography>
                <Typography variant="caption" color="text.secondary">HR manager</Typography>
              </Box>
              <Tooltip title="Sign out">
                <span><IconButton aria-label="Sign out" onClick={() => signOut.mutate()} disabled={signOut.isPending}><LogOut size={19} /></IconButton></span>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>
        {signOut.isError && <Box role="alert" sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}><ErrorState message="Sign out failed. Your session is still active." onRetry={() => signOut.mutate()} /></Box>}
        <Box component="main" id="main-content" tabIndex={-1} sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1600, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
