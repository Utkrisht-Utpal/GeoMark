import { useState, useEffect } from 'react';
import type { User, AuthState } from './types';
import { Login } from './components/Login';
import { StudentPortal } from './components/StudentPortal';
import { WardenDashboard } from './components/WardenDashboard';
import { api } from './services/api';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const savedToken = localStorage.getItem('geomark_token');
      const savedUser = localStorage.getItem('geomark_user');
      if (savedToken && savedUser) {
        return {
          token: savedToken,
          user: JSON.parse(savedUser) as User,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved session:', e);
    }
    return { token: null, user: null };
  });

  const handleLoginSuccess = (token: string, user: User) => {
    try {
      localStorage.setItem('geomark_token', token);
      localStorage.setItem('geomark_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
    setAuthState({ token, user });
  };

  const handleLogout = async () => {
    if (authState.token) {
      try {
        await api.logout(authState.token);
      } catch (e) {
        console.warn('Logout notification error:', e);
      }
    }
    try {
      localStorage.removeItem('geomark_token');
      localStorage.removeItem('geomark_user');
    } catch {}
    setAuthState({ token: null, user: null });
  };

  // Re-verify session on mount
  useEffect(() => {
    if (authState.token) {
      api.getMe(authState.token).catch(() => {
        // Token expired or invalidated
        handleLogout();
      });
    }
  }, []);

  if (!authState.token || !authState.user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (authState.user.role === 'WARDEN') {
    return (
      <WardenDashboard
        token={authState.token}
        user={authState.user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <StudentPortal
      token={authState.token}
      user={authState.user}
      onLogout={handleLogout}
    />
  );
}
