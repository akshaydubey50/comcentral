import type { ComponentProps } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  replace: vi.fn(),
  session: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/lib/api-client', () => ({ api: { session: mocks.session, signOut: mocks.signOut } }));
vi.mock('./welcome-content', () => ({
  WelcomeContent: () => <main><h1>Public home</h1><a href="/register">Create account</a><a href="/login">Sign in</a></main>,
}));
vi.mock('@mui/material', async (importOriginal) => {
  const material = await importOriginal<typeof import('@mui/material')>();
  return {
    ...material,
    Drawer: ({ variant, open, children }: ComponentProps<typeof material.Drawer>) => (
      variant === 'permanent' || open ? <aside>{children}</aside> : null
    ),
  };
});

import { AppShell } from './app-shell';

const user = { id: 'home-hr', name: 'Home HR', email: 'hr@example.test' };

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AppShell><h1>Organization pay overview</h1></AppShell>
    </QueryClientProvider>,
  );
}

describe('AppShell home access gate', () => {
  beforeEach(() => {
    mocks.pathname = '/';
    mocks.replace.mockReset();
    mocks.session.mockReset();
    mocks.signOut.mockReset();
  });

  it('renders the public home only after the root session is confirmed anonymous', async () => {
    mocks.session.mockResolvedValue({ user: null });
    renderShell();

    expect(await screen.findByRole('heading', { name: 'Public home' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Organization pay overview' })).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('keeps anonymous protected deep links on the login redirect path', async () => {
    mocks.pathname = '/employees';
    mocks.session.mockResolvedValue({ user: null });
    renderShell();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByRole('heading', { name: 'Public home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Organization pay overview' })).not.toBeInTheDocument();
  });

  it('keeps the authenticated dashboard at the root route', async () => {
    mocks.session.mockResolvedValue({ user });
    renderShell();

    expect(await screen.findByRole('heading', { name: 'Organization pay overview' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Public home' })).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('does not expose either root experience when the session check fails', async () => {
    mocks.session.mockRejectedValue(new Error('Temporarily unavailable'));
    renderShell();

    expect(await screen.findByText('We could not verify your session.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Public home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Organization pay overview' })).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
