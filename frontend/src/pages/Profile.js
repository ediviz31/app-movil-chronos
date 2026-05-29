import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getAvatarUrl, getImageUrl } from '../utils/imageHelpers';
import TopbarArchive from '../components/TopbarArchive';
import MobileSubBar from '../components/MobileSubBar';
import SideRail from '../components/SideRail';
import SocialPost from '../components/SocialPost';
import CreateChronicleModal from '../components/CreateChronicleModal';
import EditProfileModal from '../components/EditProfileModal';
import ArchivoCapsulas from '../components/ArchivoCapsulas';
import {
  HourglassIcon, FeatherIcon, OrnateStarIcon, ChronicleIcon,
  CommunitiesIcon, CalendarIcon, PlusOrnateIcon, ArrowRightIcon,
  QuillInkIcon, ScrollIcon
} from '../components/HistoricIcons';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, logout, updateUser } = useAuth();
  const avatarInputRef = useRef(null);
  const portadaInputRef = useRef(null);

  const [perfil, setPerfil] = useState(null);
  const [relatos, setRelatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortada, setUploadingPortada] = useState(false);
  const [activeTab, setActiveTab] = useState('relatos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isMyProfile = perfil && currentUser && (perfil._id === (currentUser._id || currentUser.id));

  const fetchPerfil = useCallback(async () => {
    setLoading(true);
    try {
      const [perfilRes, relatosRes] = await Promise.all([
        api.get(`/usuarios/${id}`),
        api.get(`/usuarios/${id}/relatos`)
      ]);
      setPerfil(perfilRes.data);
      setRelatos(relatosRes.data);
    } catch (err) {
      console.error('Error cargando perfil:', err);
      if (err.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchPerfil(); }, [fetchPerfil]);

  const toggleFollow = async () => {
    if (followLoading || isMyProfile) return;
    setFollowLoading(true);
    try {
      await api.post(`/seguir/${perfil._id}`);
      setPerfil(p => ({
        ...p,
        estadisticas: {
          ...p.estadisticas,
          esSeguido: !p.estadisticas.esSeguido,
          totalSeguidores: p.estadisticas.esSeguido
            ? p.estadisticas.totalSeguidores - 1
            : p.estadisticas.totalSeguidores + 1
        }
      }));
    } catch (err) {
      console.error('Error follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isMyProfile) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const res = await api.post('/usuarios/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPerfil(p => ({ ...p, avatar: res.data.avatar }));
      updateUser && updateUser({ avatar: res.data.avatar });
    } catch (err) {
      console.error('Error subiendo avatar:', err);
      alert('Error al subir avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePortadaChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isMyProfile) return;
    setUploadingPortada(true);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const res = await api.post('/usuarios/portada', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPerfil(p => ({ ...p, portada: res.data.portada }));
      updateUser && updateUser({ portada: res.data.portada });
    } catch (err) {
      console.error('Error subiendo portada:', err);
      alert('Error al subir portada');
    } finally {
      setUploadingPortada(false);
    }
  };

  const handleNewRelato = (nuevo) => {
    setRelatos([{ ...nuevo, total_ecos: 0, total_comentarios: 0, total_archivos: 0, usuario_dio_eco: false, usuario_archivado: false }, ...relatos]);
  };

  const handleDeleteRelato = (rid) => setRelatos(relatos.filter(r => r._id !== rid));

  if (loading) {
    return (
      <div className="archive-layout">
        <TopbarArchive onCreate={() => setModalOpen(true)} />
        <MobileSubBar />
        <SideRail activeItem="" onLogout={logout} />
        <div className="main-area">
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
            <p style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              Abriendo el legado...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!perfil) return null;

  const stats = perfil.estadisticas || { totalRelatos: 0, totalSeguidores: 0, totalSiguiendo: 0, esSeguido: false };
  // Solo considerar portada válida si fue subida por el usuario
  const hasPortada = perfil.portada && (
    perfil.portada.startsWith('/uploads') ||
    perfil.portada.startsWith('/api/uploads') ||
    perfil.portada.startsWith('/api/files/') ||
    perfil.portada.startsWith('http')
  );
  const portadaUrl = hasPortada ? getImageUrl(perfil.portada) : null;

  return (
    <div className="archive-layout">
      <TopbarArchive onCreate={() => setModalOpen(true)} />
      <MobileSubBar />
      <SideRail activeItem="" onLogout={logout} />

      <div className="main-area profile-main">
        <main className="profile-page" data-testid="profile-page">
          {/* PORTADA */}
          <div className="profile-cover" data-testid="profile-cover">
            {portadaUrl ? (
              <img src={portadaUrl} alt="Portada" />
            ) : (
              <div className="profile-cover-placeholder">
                <div className="profile-cover-pattern"></div>
                <span className="profile-cover-empty">
                  {isMyProfile ? 'Añade una portada que represente tu legado' : ''}
                </span>
              </div>
            )}
            {isMyProfile && (
              <>
                <button
                  className="profile-cover-edit-btn"
                  onClick={() => portadaInputRef.current?.click()}
                  disabled={uploadingPortada}
                  data-testid="upload-portada-btn"
                >
                  <CalendarIcon size={14} />
                  {uploadingPortada ? 'Subiendo...' : 'Cambiar portada'}
                </button>
                <input
                  ref={portadaInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePortadaChange}
                  data-testid="portada-input"
                />
              </>
            )}
          </div>

          {/* IDENTIDAD */}
          <div className="profile-identity">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar" data-testid="profile-avatar">
                <img src={getAvatarUrl(perfil)} alt={perfil.nombre} />
              </div>
              {isMyProfile && (
                <>
                  <button
                    className="profile-avatar-edit"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    data-testid="upload-avatar-btn"
                    title="Cambiar avatar"
                  >
                    <PlusOrnateIcon size={14} />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                    data-testid="avatar-input"
                  />
                </>
              )}
            </div>

            <div className="profile-meta">
              <div className="profile-meta-head">
                <div>
                  <h1 className="profile-name" data-testid="profile-name">{perfil.nombre}</h1>
                  <div className="profile-handle">@{perfil.usuario}</div>
                </div>
                <div className="profile-actions">
                  {isMyProfile ? (
                    <>
                      <button
                        className="profile-action-btn secondary"
                        onClick={() => setEditOpen(true)}
                        data-testid="profile-edit-btn"
                      >
                        <QuillInkIcon size={14} /> Editar legado
                      </button>
                      <button
                        className="profile-action-btn primary"
                        onClick={() => setModalOpen(true)}
                        data-testid="profile-create-btn"
                      >
                        <FeatherIcon size={14} /> Nueva crónica
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`/misivas/abrir/${perfil._id}`)}
                        className="profile-action-btn secondary"
                        data-testid="profile-misiva-btn"
                      >
                        <ScrollIcon size={14} /> Enviar misiva
                      </button>
                      <button
                        onClick={toggleFollow}
                        disabled={followLoading}
                        className={`profile-action-btn ${stats.esSeguido ? 'secondary' : 'primary'}`}
                        data-testid="profile-follow-btn"
                      >
                        {followLoading ? 'Sellando…' : (stats.esSeguido ? '✓ Siguiendo' : 'Seguir legado')}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {perfil.bio && (
                <p className="profile-bio" data-testid="profile-bio">{perfil.bio}</p>
              )}

              <div className="profile-badges">
                {perfil.tema_favorito && (
                  <span className="profile-badge">
                    <OrnateStarIcon size={11} /> {perfil.tema_favorito}
                  </span>
                )}
                {perfil.interes && (
                  <span className="profile-badge">
                    <ChronicleIcon size={11} /> {perfil.interes}
                  </span>
                )}
              </div>

              <div className="profile-stats" data-testid="profile-stats">
                <div className="profile-stat">
                  <span className="profile-stat-num">{stats.totalRelatos}</span>
                  <span className="profile-stat-label">Crónicas</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-num">{stats.totalSeguidores}</span>
                  <span className="profile-stat-label">Seguidores</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-num">{stats.totalSiguiendo}</span>
                  <span className="profile-stat-label">Siguiendo</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="profile-tabs" data-testid="profile-tabs">
            <button
              className={`profile-tab ${activeTab === 'relatos' ? 'active' : ''}`}
              onClick={() => setActiveTab('relatos')}
              data-testid="tab-relatos"
            >
              <FeatherIcon size={14} /> Crónicas
            </button>
            <button
              className={`profile-tab ${activeTab === 'pasado' ? 'active' : ''}`}
              onClick={() => setActiveTab('pasado')}
              data-testid="tab-pasado"
            >
              <HourglassIcon size={14} /> Mi Pasado
            </button>
            <button
              className={`profile-tab ${activeTab === 'seguidores' ? 'active' : ''}`}
              onClick={() => setActiveTab('seguidores')}
              data-testid="tab-seguidores"
            >
              <CommunitiesIcon size={14} /> Seguidores
            </button>
          </div>

          {/* CONTENT */}
          {activeTab === 'relatos' && (
            <div data-testid="profile-relatos">
              {relatos.length === 0 ? (
                <div className="empty-archive" style={{ marginTop: 20 }}>
                  <FeatherIcon size={42} style={{ color: 'var(--gold)', margin: '0 auto' }} />
                  <h3>{isMyProfile ? 'Aún no has escrito crónicas' : 'Sin crónicas aún'}</h3>
                  <p>{isMyProfile ? 'Comparte tu primer relato y abre tu archivo personal.' : 'Este cronista aún no ha compartido relatos.'}</p>
                  {isMyProfile && (
                    <button className="empty-archive-btn" onClick={() => setModalOpen(true)} data-testid="empty-create-btn">
                      <FeatherIcon size={14} /> Crear crónica
                    </button>
                  )}
                </div>
              ) : (
                relatos.map(r => (
                  <SocialPost
                    key={r._id}
                    relato={r}
                    currentUserId={currentUser?._id || currentUser?.id}
                    onDelete={handleDeleteRelato}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'pasado' && (
            <div data-testid="profile-pasado" style={{ marginTop: 16 }}>
              <ArchivoCapsulas usuarioId={perfil._id} esMiPerfil={isMyProfile} />
            </div>
          )}

          {activeTab === 'seguidores' && (
            <div className="empty-archive" style={{ marginTop: 20 }} data-testid="profile-followers">
              <CommunitiesIcon size={42} style={{ color: 'var(--gold)', margin: '0 auto' }} />
              <h3>Lista de seguidores</h3>
              <p>{stats.totalSeguidores} cronista{stats.totalSeguidores !== 1 ? 's' : ''} sigue{stats.totalSeguidores !== 1 ? 'n' : ''} este legado.</p>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('relatos'); }}
                className="sidebar-link"
              >
                Volver a crónicas <ArrowRightIcon size={12} />
              </a>
            </div>
          )}
        </main>
      </div>

      <CreateChronicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleNewRelato}
      />

      <EditProfileModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(u) => setPerfil(p => ({ ...p, ...u }))}
      />
    </div>
  );
};

export default Profile;
