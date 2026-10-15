import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import WelcomePage, { metadata } from './page';

describe('WelcomePage', () => {
  it('describes implemented capabilities without requiring application data', () => {
    render(<WelcomePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'HR records and pay context in one workspace.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Keep the directory useful' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Review CSV migrations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Understand current pay' })).toBeInTheDocument();
    expect(screen.getByText(/dated approximate USD reporting when FX data is available/)).toBeInTheDocument();
  });

  it('links directly to registration and sign in while keeping a dedicated route title', () => {
    render(<WelcomePage />);

    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Open your workspace' })).toHaveAttribute('href', '/login');
    expect(metadata.title).toBe('Welcome to ComCentral');
  });
});
