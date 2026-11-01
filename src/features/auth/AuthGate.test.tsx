import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './state';
import type { AuthState } from './state';
import { AuthGate } from './AuthGate';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } }),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const base: AuthState = {
  user: null,
  profile: null,
  loading: false,
  error: null,
  demo: false,
  recovery: false,
  finishRecovery: vi.fn(),
  retry: vi.fn(),
};
function open(patch: Partial<AuthState> = {}) {
  render(
    <AuthContext.Provider value={{ ...base, ...patch }}>
      <AuthGate>
        <p>Private catalog</p>
      </AuthGate>
    </AuthContext.Provider>,
  );
}

describe('private reading room entrance', () => {
  it('offers sign-in without public signup and keeps invalid credentials outside', async () => {
    const user = userEvent.setup();
    open();
    expect(screen.queryByText('Private catalog')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /sign up|create account/i }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Email address'), 'reader@example.com');
    await user.type(screen.getByLabelText('Password'), 'a-test-password');
    await user.click(screen.getByRole('button', { name: 'Enter your reading room' }));
    expect(supabase!.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'reader@example.com',
      password: 'a-test-password',
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t sign you in.');
    expect(screen.queryByText('Private catalog')).not.toBeInTheDocument();
  });

  it('keeps a signed-in account outside until the owner approves membership', () => {
    open({ user: { id: 'pending-reader' } as User });
    expect(
      screen.getByRole('heading', { name: 'Your invitation is waiting.' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Private catalog')).not.toBeInTheDocument();
  });

  it('opens the catalog only for an approved membership', () => {
    open({
      user: { id: 'approved-reader' } as User,
      profile: {
        user_id: 'approved-reader',
        role: 'reader',
        invited: true,
        display_name: 'Reader',
        created_at: '2026-01-01T00:00:00Z',
      },
    });
    expect(screen.getByText('Private catalog')).toBeInTheDocument();
  });
});
