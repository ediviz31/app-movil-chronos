import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import RelatoDetail from './pages/RelatoDetail';
import CronicasPage from './pages/CronicasPage';
import LegadosPage from './pages/LegadosPage';
import DocumentosPage from './pages/DocumentosPage';
import EpocasPage from './pages/EpocasPage';
import EpocaDetailPage from './pages/EpocaDetailPage';
import AvisosPage from './pages/AvisosPage';
import EfemeridesPage from './pages/EfemeridesPage';
import MiLegado from './pages/MiLegado';
import ExplorarPage from './pages/ExplorarPage';
import TagPage from './pages/TagPage';
import MisivasPage from './pages/MisivasPage';
import { HourglassIcon } from './components/HistoricIcons';
import './styles/archive.css';
import './styles/social-refine.css';
import './styles/search.css';
import './styles/profile.css';
import './styles/pages.css';
import './styles/avisos.css';
import './styles/efemerides.css';
import './styles/legado.css';
import './styles/extras.css';
import './styles/misivas.css';

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-deep)' }}>
    <div style={{ textAlign: 'center', color: 'var(--gold)' }}>
      <div className="spin" style={{ display: 'inline-block' }}>
        <HourglassIcon size={48} />
      </div>
      <p style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-muted)' }}>
        Abriendo el archivo...
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/registro" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/cronicas" element={<ProtectedRoute><CronicasPage /></ProtectedRoute>} />
          <Route path="/legados" element={<ProtectedRoute><LegadosPage /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><DocumentosPage /></ProtectedRoute>} />
          <Route path="/epocas" element={<ProtectedRoute><EpocasPage /></ProtectedRoute>} />
          <Route path="/epocas/:nombre" element={<ProtectedRoute><EpocaDetailPage /></ProtectedRoute>} />
          <Route path="/avisos" element={<ProtectedRoute><AvisosPage /></ProtectedRoute>} />
          <Route path="/efemerides" element={<ProtectedRoute><EfemeridesPage /></ProtectedRoute>} />
          <Route path="/mi-legado" element={<ProtectedRoute><MiLegado /></ProtectedRoute>} />
          <Route path="/explorar" element={<ProtectedRoute><ExplorarPage /></ProtectedRoute>} />
          <Route path="/tags/:tag" element={<ProtectedRoute><TagPage /></ProtectedRoute>} />
          <Route path="/misivas" element={<ProtectedRoute><MisivasPage /></ProtectedRoute>} />
          <Route path="/misivas/abrir/:userIdToOpen" element={<ProtectedRoute><MisivasPage /></ProtectedRoute>} />
          <Route path="/misivas/:conversacionId" element={<ProtectedRoute><MisivasPage /></ProtectedRoute>} />
          <Route path="/relato/:id" element={<ProtectedRoute><RelatoDetail /></ProtectedRoute>} />
          <Route path="/perfil/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
