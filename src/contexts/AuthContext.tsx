import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import { authService } from '../services/auth';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await authService.getToken();
        if (token) {
          const userData = await authService.me();
          setUser(userData);
        }
      } catch {
        // Silenciosamente limpa o token e mostra a tela de login
        // Nao mostra erro ao usuario pois ele ainda nao tentou fazer login
        await authService.setToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({
        email,
        password,
      });

      if (!response || !response.token) {
        throw new Error('Nao foi possivel fazer login. Tente novamente.');
      }

      await authService.setToken(response.token);
      setUser(response.user);
    } catch (error: any) {
      if (
        error.response?.status === 403 &&
        error.response?.data?.error?.includes('período de teste expirou')
      ) {
        throw new Error('Periodo de teste expirado');
      }
      if (error.response?.status === 401) {
        throw new Error('Email ou senha incorretos');
      }
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error.message) {
        throw error;
      }
      throw new Error('Nao foi possivel fazer login. Tente novamente.');
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
