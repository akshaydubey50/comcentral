import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  session: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/employees',
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/lib/api-client', () => ({ api: { session: mocks.session, signOut: mocks.signOut } }));

// Session recovery owns the content gate and cache lifecycle, not MUI's drawer
// portals/transitions. Real drawer focus and responsive behavior run in Playwright.
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

const user = { id: 'hr-1', name: 'Test HR', email: 'hr@example.test' };

function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><AppShell><h1>Employee workspace</h1></AppShell></QueryClientProvider>);
  return client;
}

describe('AppShell session recovery', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.session.mockReset();
    mocks.signOut.mockReset();
  });

  it('keeps a failed session check retryable instead of redirecting to login', async () => {
    mocks.session.mockRejectedValueOnce(new Error('Temporarily unavailable')).mockResolvedValueOnce({ user });
    renderWorkspace();

    expect(await screen.findByText('We could not verify your session.')).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Employee workspace', { selector: 'h1' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    // The test-owned heading confirms content access without rescanning both MUI drawers.
    expect(await screen.findByText('Employee workspace', { selector: 'h1' })).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirects to login when the server confirms there is no session', async () => {
    mocks.session.mockResolvedValue({ user: null });
    renderWorkspace();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Employee workspace', { selector: 'h1' })).not.toBeInTheDocument();
  });

  it('retains the workspace on sign-out failure and clears cached data after retry succeeds', async () => {
    mocks.session.mockResolvedValue({ user });
    mocks.signOut.mockRejectedValueOnce(new Error('Temporarily unavailable')).mockResolvedValueOnce({});
    const client = renderWorkspace();
    client.setQueryData(['employee', 'private-record'], { name: 'Cached employee' });
    await screen.findByText('Employee workspace', { selector: 'h1' });

    fireEvent.click(screen.getByLabelText('Sign out', { selector: 'button' }));
    expect(await screen.findByText('Sign out failed. Your session is still active.')).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(client.getQueryData(['employee', 'private-record'])).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(client.getQueryData(['employee', 'private-record'])).toBeUndefined();
  });
});
