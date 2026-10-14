import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signIn: vi.fn().mockResolvedValue({}),
  session: vi.fn().mockResolvedValue({ user: null }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error { status = 0; },
  api: { signIn: mocks.signIn, session: mocks.session },
}));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    mocks.session.mockResolvedValue({ user: null });
    mocks.signIn.mockResolvedValue({});
  });
  it('submits provisioned HR credentials and enters the workspace', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><LoginPage /></QueryClientProvider>);

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'hr@acme.test' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'correct-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith('hr@acme.test', 'correct-password'));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'));
  });
});
