import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('chronos_token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        localStorage.removeItem('chronos_token');
        localStorage.removeItem('chronos_user');
      }
    }
    setLoading(false);
  };

  const login = async (correo, password) => {
    const response = await api.post('/auth/login', { correo, password });
    localStorage.setItem('chronos_token', response.data.token);
    localStorage.setItem('chronos_user', JSON.stringify(response.data.usuario));
    setUser(response.data.usuario);
    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/auth/registro', userData);
    localStorage.setItem('chronos_token', response.data.token);
    localStorage.setItem('chronos_user', JSON.stringify(response.data.usuario));
    setUser(response.data.usuario);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('chronos_token');
    localStorage.removeItem('chronos_user');
    setUser(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};