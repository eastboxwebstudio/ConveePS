import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { apiGetMe, apiLogin, apiLogout } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, passcode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function checkAuth() {
    try {
      const data = await apiGetMe();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function login(username: string, passcode: string) {
    const data = await apiLogin(username, passcode);
    setUser(data.user);
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  async function refreshUser() {
    await checkAuth();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
