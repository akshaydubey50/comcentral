import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signIn: vi.fn().mockResolvedValue({}),
  session: vi.fn().mockResolvedValue({ user: null }),
}));

const user = { id: 'hr', name: 'HR User', email: 'hr@acme.test' };

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error { status = 0; },
  api: { signIn: mocks.signIn, session: mocks.session },
}));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.session.mockReset().mockResolvedValue({ user: null });
    mocks.signIn.mockReset().mockResolvedValue({});
  });
  it('submits HR credentials and enters the workspace only after confirming the session', async () => {
    mocks.session.mockResolvedValueOnce({ user: null }).mockResolvedValueOnce({ user });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><LoginPage /></QueryClientProvider>);

    await waitFor(() => expect(mocks.session).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: '  HR@ACME.TEST  ' } });
    const password = screen.getByLabelText(/^password/i);
    fireEvent.change(password, { target: { value: 'abcde' } });
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(mocks.signIn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveValue('abcde');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith('hr@acme.test', 'abcde'));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'));
    expect(client.getQueryData(['session'])).toEqual({ user });
  });

  it('stays on login when sign-in creates no session and allows a retry', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><LoginPage /></QueryClientProvider>);
    await waitFor(() => expect(mocks.session).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'hr@acme.test' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'abcde' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your sign-in did not establish a session. Please try again.',
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^password/i)).toHaveValue('abcde');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');

    mocks.session.mockResolvedValueOnce({ user });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'));
    expect(mocks.signIn).toHaveBeenCalledTimes(2);
  });

  it('shows retryable feedback when session confirmation fails', async () => {
    mocks.session
      .mockResolvedValueOnce({ user: null })
      .mockRejectedValueOnce(new Error('Session endpoint unavailable'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><LoginPage /></QueryClientProvider>);
    await waitFor(() => expect(mocks.session).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'hr@acme.test' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'abcde' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not confirm your session. Please try again.',
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('offers a registration link for new users', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LoginPage /></QueryClientProvider>);
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');
    expect(screen.queryByText(/Public registration is unavailable/)).not.toBeInTheDocument();
  });
});
