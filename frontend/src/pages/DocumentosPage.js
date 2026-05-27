import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PageShell from '../components/PageShell';
import SocialPost from '../components/SocialPost';
import { useAuth } from '../context/AuthContext';
import { ChestIcon, HourglassIcon, OrnateStarIcon } from '../components/HistoricIcons';

const DocumentosPage = () => {
  const { user } = useAuth();
  const [relatos, setRelatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/archivados');
        // Filtrar nulls por si algún relato fue eliminado
        const list = (res.data || []).filter(Boolean).map(r => ({
          ...r,
          usuario_archivado: true,
          total_ecos: r.total_ecos || 0,
          total_comentarios: r.total_comentarios || 0,
          total_archivos: r.total_archivos || 0
        }));
        setRelatos(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageShell activeRail="biblioteca">
      <main className="archive-listing-page" data-testid="documentos-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <ChestIcon size={14} /> Mi Archivo Personal
            </div>
            <h1 className="listing-title">Documentos preservados</h1>
            <p className="listing-subtitle">
              Las crónicas que has guardado en tu cofre. Una colección curada
              de relatos para volver a consultarlos cuando lo desees.
            </p>
          </div>
          <span className="listing-stat-pill" data-testid="documentos-count">
            {relatos.length} preservados
          </span>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
            <p style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              Abriendo el cofre...
            </p>
          </div>
        ) : relatos.length === 0 ? (
          <div className="listing-empty">
            <ChestIcon size={48} style={{ color: 'var(--gold)' }} />
            <h3>Tu cofre está vacío</h3>
            <p>Cuando archives una crónica desde el feed o el detalle de un relato, aparecerá aquí
              esperando tu próxima visita.</p>
          </div>
        ) : (
          <div data-testid="documentos-list">
            {relatos.map(r => (
              <SocialPost
                key={r._id}
                relato={r}
                currentUserId={currentUserId}
                onDelete={(id) => setRelatos(rs => rs.filter(x => x._id !== id))}
              />
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default DocumentosPage;
