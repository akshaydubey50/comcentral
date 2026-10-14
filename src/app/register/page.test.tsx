import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ replace: vi.fn(), signUp: vi.fn(), session: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...actual, api: { signUp: mocks.signUp, session: mocks.session } };
});

import { ApiClientError } from '@/lib/api-client';
import RegisterPage from './page';

const user = { id: 'new-hr', name: 'Ada HR', email: 'ada@example.test' };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><RegisterPage /></QueryClientProvider>);
  return client;
}

async function fillForm(overrides: Partial<Record<'name' | 'email' | 'password' | 'confirmation', string>> = {}) {
  await screen.findByRole('button', { name: 'Create account' });
  const values = { name: 'Ada HR', email: 'ada@example.test', password: 'a-secure-password', confirmation: 'a-secure-password', ...overrides };
  fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText(/^Work email/), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: values.password } });
  fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: values.confirmation } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.signUp.mockReset().mockResolvedValue(undefined);
    mocks.session.mockReset().mockResolvedValue({ user: null });
  });

  it('links existing account holders to login', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it.each([
    [{ name: '   ' }, 'Enter your full name.'],
    [{ name: 'a'.repeat(161) }, 'Use 160 characters or fewer.'],
    [{ email: 'invalid-email' }, 'Enter a valid work email.'],
    [{ email: `${'a'.repeat(243)}@example.test` }, 'Use an email address with 254 characters or fewer.'],
    [{ password: '1234', confirmation: '1234' }, 'Use 5 to 128 characters.'],
    [{ password: 'a'.repeat(129), confirmation: 'a'.repeat(129) }, 'Use 5 to 128 characters.'],
    [{ confirmation: 'different-password' }, 'Passwords must match.'],
  ])('rejects invalid input before sending credentials: %j', async (overrides, message) => {
    renderPage();
    await fillForm(overrides);
    submit();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('normalizes account details and opens the dashboard only after confirming the session', async () => {
    mocks.session.mockResolvedValueOnce({ user: null }).mockResolvedValue({ user });
    const client = renderPage();
    await fillForm({ name: '  Ada HR  ', email: 'ADA@EXAMPLE.TEST', password: ' spaced-password ', confirmation: ' spaced-password ' });
    submit();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'));
    expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith('Ada HR', 'ada@example.test', ' spaced-password ');
    expect(client.getQueryData(['session'])).toEqual({ user });
  });

  it('accepts a five-character password and toggles each field without submitting', async () => {
    renderPage();
    await fillForm({ password: 'abcde', confirmation: 'abcde' });
    const password = screen.getByLabelText(/^Password/);
    const confirmation = screen.getByLabelText(/^Confirm password/);
    expect(password).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show confirm password' }));
    expect(confirmation).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide confirm password' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(password).toHaveValue('abcde');
    expect(confirmation).toHaveValue('abcde');
    expect(mocks.signUp).not.toHaveBeenCalled();
    submit();
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith('Ada HR', 'ada@example.test', 'abcde'));
  });

  it('prevents repeated submission while account creation is pending', async () => {
    let finish!: () => void;
    mocks.signUp.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    renderPage();
    await fillForm();
    submit();
    expect(await screen.findByRole('button', { name: 'Creating account…' })).toBeDisabled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    finish();
    await screen.findByText('Your account was created. Sign in to open your workspace.');
  });

  it('shows duplicate-email guidance and preserves the entered account details', async () => {
    mocks.signUp.mockRejectedValue(new ApiClientError(422, { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'Duplicate' }));
    renderPage();
    await fillForm();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists. Sign in or use another email.');
    expect(screen.getByLabelText(/^Full name/)).toHaveValue('Ada HR');
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('explains unavailable registration without claiming that an account was created', async () => {
    mocks.signUp.mockRejectedValue(new ApiClientError(400, { code: 'EMAIL_PASSWORD_SIGN_UP_DISABLED', message: 'Disabled' }));
    renderPage();
    await fillForm();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Account creation is temporarily unavailable. Please try again later.');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('allows an explicit retry after a network failure', async () => {
    mocks.signUp.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(undefined);
    renderPage();
    await fillForm();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not create your account. Please try again.');
    submit();
    await screen.findByText('Your account was created. Sign in to open your workspace.');
    expect(mocks.signUp).toHaveBeenCalledTimes(2);
  });

  it.each(['missing', 'unavailable'])('does not resubmit a created account when the session is %s', async (state) => {
    mocks.session.mockResolvedValueOnce({ user: null });
    if (state === 'missing') mocks.session.mockResolvedValue({ user: null });
    else mocks.session.mockRejectedValue(new Error('Session unavailable'));
    renderPage();
    await fillForm();
    submit();
    expect(await screen.findByText('Your account was created. Sign in to open your workspace.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirects an already authenticated user without creating another account', async () => {
    mocks.session.mockResolvedValue({ user });
    renderPage();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'));
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });
});
