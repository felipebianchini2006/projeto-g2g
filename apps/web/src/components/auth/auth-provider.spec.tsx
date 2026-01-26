import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './auth-provider';
import { authApi } from '../../lib/auth-api';
import type { AuthSession } from '../../lib/auth-types';

vi.mock('../../lib/auth-api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    mfaVerify: vi.fn(),
  },
}));

const TestComponent = () => {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'anon'}</span>
      <button
        type="button"
        onClick={() => login({ email: 'user@email.com', password: 'password123' })}
      >
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
};

describe('AuthProvider', () => {
  it('logs in and logs out', async () => {
    const session: AuthSession = {
      user: {
        id: 'user-1',
        email: 'user@email.com',
        role: 'USER',
        adminPermissions: [],
        mfaEnabled: false,
        mfaLastVerifiedAt: null,
        mfaLastVerifiedIp: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: 'access-token',
    };

    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no session'));
    vi.mocked(authApi.login).mockResolvedValue(session);
    vi.mocked(authApi.logout).mockResolvedValue({ success: true });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId('email')).toHaveTextContent('anon');

    await user.click(screen.getByText('login'));
    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('user@email.com');
    });

    await user.click(screen.getByText('logout'));
    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('anon');
    });
  });
});
