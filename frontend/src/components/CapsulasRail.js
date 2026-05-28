/**
 * Carrusel horizontal de Cápsulas del Tiempo (stories históricas).
 * Aparece arriba del feed. Click → CapsulaViewer fullscreen.
 */
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl, getImageUrl } from '../utils/imageHelpers';
import CapsulaViewer from './CapsulaViewer';
import CreateCapsulaModal from './CreateCapsulaModal';
import { HourglassIcon, PlusOrnateIcon, ChronicleIcon } from './HistoricIcons';

const CapsulasRail = () => {
  const { user } = useAuth();
  const [capsulas, setCapsulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchCapsulas = useCallback(async () => {
    try {
      const res = await api.get('/capsulas');
      setCapsulas(res.data || []);
    } catch (e) {
      console.error('Error fetching capsulas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCapsulas(); }, [fetchCapsulas]);

  const handleOpen = (idx) => setViewerIndex(idx);
  const handleClose = () => setViewerIndex(null);

  const handleCreated = (nueva) => {
    setCapsulas(prev => {
      // Insertar después de efemeride+cita (mantener orden del sistema)
      const sys = prev.filter(c => c.tipo !== 'cronista');
      const cronistas = prev.filter(c => c.tipo === 'cronista');
      return [...sys, nueva, ...cronistas];
    });
    setCreateOpen(false);
  };

  const handleMarkVisto = async (id) => {
    setCapsulas(prev => prev.map(c => c._id === id ? { ...c, visto: true } : c));
    try { await api.post(`/capsulas/${id}/visto`); } catch (_) {}
  };

  if (loading) return null;

  // Cápsulas propias y de otros
  const userId = user?._id || user?.id;
  const misCapsulas = capsulas.filter(c => c.tipo === 'cronista' && String(c.usuario_id?._id) === String(userId));
  const otrasCapsulas = capsulas.filter(c => !(c.tipo === 'cronista' && String(c.usuario_id?._id) === String(userId)));

  // Render: "Tu cápsula" (crear) primero, luego sistema, luego cronistas
  const renderCircle = (c, idx) => {
    const isSystem = c.tipo === 'efemeride' || c.tipo === 'cita';
    const author = c.usuario_id;
    const isMine = !isSystem && String(author?._id) === String(userId);
    // Si la cápsula del cronista tiene imagen propia, mostrarla en el círculo
    // (más visual que el avatar). Si no, fallback al avatar del cronista.
    const capsulaImage = !isSystem && c.imagen ? getImageUrl(c.imagen) : null;
    const avatarSrc = isSystem ? null : (capsulaImage || getAvatarUrl(author));

    const Icon = c.tipo === 'efemeride' ? HourglassIcon : ChronicleIcon;
    const ringClass = `capsule-ring capsule-${c.tipo} ${isMine ? 'capsule-mine' : ''} ${c.visto ? 'is-visto' : ''}`;

    let label;
    if (c.tipo === 'efemeride') label = (c.anio !== null && c.anio !== undefined ? c.anio : 'Hoy');
    else if (c.tipo === 'cita') label = (c.autor ? c.autor.split(' ').slice(-1)[0] : 'Cita');
    else if (isMine) label = 'Tú';
    else label = (author?.nombre?.split(' ')[0] || '—');

    return (
      <button
        key={c._id}
        className="capsule-item"
        onClick={() => handleOpen(idx)}
        data-testid={`capsule-${c.tipo}-${c._id}`}
        type="button"
      >
        <span className={ringClass}>
          <span className="capsule-circle">
            {isSystem ? (
              <Icon size={26} style={{ color: 'var(--gold-bright)' }} />
            ) : (
              <img src={avatarSrc} alt={author?.nombre} />
            )}
          </span>
        </span>
        <span className="capsule-label">{label}</span>
      </button>
    );
  };

  // Si tengo cápsulas propias, agrupo todas detrás del botón "Tú (N)" para no saturar el rail
  const hasMisCapsulas = misCapsulas.length > 0;
  const misCapsulaIdx = capsulas.findIndex(c =>
    c.tipo === 'cronista' && String(c.usuario_id?._id) === String(userId)
  );

  return (
    <>
      <div className="capsules-rail" data-testid="capsules-rail">
        <div className="capsules-rail-inner">
          {/* Botón crear (siempre primero, solo si hay sesión) */}
          {user && (
            <button
              className="capsule-item capsule-create"
              onClick={() => setCreateOpen(true)}
              data-testid="capsule-create-btn"
              type="button"
            >
              <span className="capsule-ring capsule-ring-create">
                <span className="capsule-circle">
                  <PlusOrnateIcon size={28} style={{ color: 'var(--gold)' }} />
                </span>
              </span>
              <span className="capsule-label">
                {hasMisCapsulas ? '+ Otra' : 'Tu cápsula'}
              </span>
            </button>
          )}

          {/* Agrupador "Tú (N)" para mis cápsulas: muestra la primera + badge */}
          {hasMisCapsulas && (
            <button
              key="mis-capsulas"
              className="capsule-item capsule-mine-group"
              onClick={() => handleOpen(misCapsulaIdx)}
              data-testid="capsule-mine-group"
              type="button"
            >
              <span className={`capsule-ring capsule-cronista capsule-mine`}>
                <span className="capsule-circle">
                  <img
                    src={
                      misCapsulas[0].imagen
                        ? getImageUrl(misCapsulas[0].imagen)
                        : getAvatarUrl(user)
                    }
                    alt="Mis cápsulas"
                  />
                </span>
                {misCapsulas.length > 1 && (
                  <span className="capsule-mine-count" data-testid="capsule-mine-count">
                    {misCapsulas.length}
                  </span>
                )}
              </span>
              <span className="capsule-label">Tú</span>
            </button>
          )}

          {/* Resto de cápsulas (sistema + otros cronistas) */}
          {otrasCapsulas.map((c) => renderCircle(c, capsulas.indexOf(c)))}
        </div>
      </div>

      {viewerIndex !== null && (
        <CapsulaViewer
          capsulas={capsulas}
          startIndex={viewerIndex}
          onClose={handleClose}
          onMarkVisto={handleMarkVisto}
        />
      )}

      <CreateCapsulaModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
};

export default CapsulasRail;
