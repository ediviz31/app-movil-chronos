import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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

  // Extraer la función checkAuth para poder incluirla en dependencias
  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []); // Sin dependencias porque no usa variables externas

  useEffect(() => {
    checkAuth();
  }, [checkAuth]); // Ahora incluye checkAuth en las dependencias

  const login = async (correo, password) => {
    const response = await api.post('/auth/login', { correo, password });
    setUser(response.data.usuario);
    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/auth/registro', userData);
    setUser(response.data.usuario);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
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