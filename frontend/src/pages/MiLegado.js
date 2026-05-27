import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PageShell from '../components/PageShell';
import AddFamiliarModal from '../components/AddFamiliarModal';
import FamiliarDetailModal from '../components/FamiliarDetailModal';
import {
  HourglassIcon, PlusOrnateIcon, CommunitiesIcon, FeatherIcon,
  CalendarIcon, ChestIcon, ArrowRightIcon, OrnateStarIcon, TempleIcon
} from '../components/HistoricIcons';
import TimelineView from '../components/TimelineView';
import { PARENTESCO_POSICION, getParentescoLabel, formatFechaCorta } from '../utils/parentescoMap';

// Calcula posición {x, y} en el SVG dado el parentesco, considerando duplicados.
// Si varios miembros comparten el mismo parentesco, los distribuye horizontalmente
// (fan-out) para que no se superpongan visualmente.
const calculateLayout = (familiares) => {
  const NODE_W = 140;
  const NODE_H = 160;
  const COL_W = 170;
  const ROW_H = 200;
  const CENTER_X = 600;
  const CENTER_Y = 40;

  // Agrupar por parentesco para conocer el total antes de posicionar
  const grupos = {};
  for (const f of familiares) {
    const key = f.parentesco;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(f);
  }

  const items = [];
  for (const key of Object.keys(grupos)) {
    const grupo = grupos[key];
    const pos = PARENTESCO_POSICION[key] || PARENTESCO_POSICION.otro;
    const n = grupo.length;
    // Fan-out: el grupo se centra en pos.col, separación de 1.2 columnas entre miembros
    const spread = 130; // px de separación
    const start = -((n - 1) * spread) / 2;
    grupo.forEach((f, idx) => {
      const x = CENTER_X + (pos.col * COL_W) + start + idx * spread;
      const y = CENTER_Y + (pos.row * ROW_H);
      items.push({ ...f, _x: x, _y: y, _w: NODE_W, _h: NODE_H, _pos: pos });
    });
  }
  return items;
};

const TreeNode = ({ familiar, onClick }) => {
  const inicial = (familiar.nombre[0] || '?').toUpperCase();
  const fechaCorta = formatFechaCorta(familiar.fecha_nacimiento);
  const fotoUrl = familiar.foto
    ? (familiar.foto.startsWith('http') ? familiar.foto : process.env.REACT_APP_BACKEND_URL + familiar.foto)
    : null;
  return (
    <g
      className="tree-node"
      transform={`translate(${familiar._x - familiar._w/2}, ${familiar._y})`}
      onClick={() => onClick(familiar)}
      style={{ cursor: 'pointer' }}
      data-testid={`tree-node-${familiar._id}`}
    >
      {/* Cameo dorado */}
      <circle cx={familiar._w/2} cy={50} r={42} className="cameo-ring" />
      <circle cx={familiar._w/2} cy={50} r={38} className="cameo-bg" />
      {fotoUrl ? (
        <>
          <defs>
            <clipPath id={`clip-${familiar._id}`}>
              <circle cx={familiar._w/2} cy={50} r={36} />
            </clipPath>
          </defs>
          <image
            href={fotoUrl}
            x={familiar._w/2 - 36} y={14}
            width={72} height={72}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-${familiar._id})`}
            style={{ filter: 'sepia(0.3) contrast(1.05)' }}
          />
        </>
      ) : (
        <text x={familiar._w/2} y={60} textAnchor="middle" className="cameo-initial">
          {inicial}
        </text>
      )}
      {/* Nombre */}
      <text x={familiar._w/2} y={112} textAnchor="middle" className="tree-name">
        {familiar.nombre.slice(0, 16)}
      </text>
      {familiar.apellido && (
        <text x={familiar._w/2} y={128} textAnchor="middle" className="tree-surname">
          {familiar.apellido.slice(0, 18)}
        </text>
      )}
      {fechaCorta && (
        <text x={familiar._w/2} y={146} textAnchor="middle" className="tree-date">
          {fechaCorta}
        </text>
      )}
    </g>
  );
};

const MiLegado = () => {
  const { user } = useAuth();
  const [familiares, setFamiliares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'timeline'
  const importInputRef = useRef(null);

  const fetchFamiliares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/familiares/mios');
      setFamiliares(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFamiliares(); }, [fetchFamiliares]);

  const handleSaved = (saved) => {
    setFamiliares(prev => {
      const exists = prev.find(p => p._id === saved._id);
      if (exists) return prev.map(p => p._id === saved._id ? saved : p);
      return [...prev, saved];
    });
    setEditing(null);
  };

  const handleDelete = (id) => {
    setFamiliares(prev => prev.filter(f => f._id !== id));
  };

  const handleImportGedcom = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const text = ev.target.result;
        try {
          const res = await api.post('/familiares/importar-gedcom', { gedcom: text });
          alert(`${res.data.total} familiares importados con éxito`);
          await fetchFamiliares();
          setImportOpen(false);
        } catch (err) {
          alert(err.response?.data?.error || 'Error al importar');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setImporting(false);
      alert('Error al leer el archivo');
    }
  };

  const items = calculateLayout(familiares);
  const nombreRoot = user?.nombre || 'Tú';

  // Posicion del root: row=3 (después de padres en row=2)
  const ROOT_X = 600, ROOT_Y = 40 + 3 * 200; // = 640

  return (
    <PageShell activeRail="">
      <main className="archive-listing-page mi-legado-page" data-testid="mi-legado-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <CommunitiesIcon size={14} /> Mi Legado Familiar
            </div>
            <h1 className="listing-title">Árbol del legado</h1>
            <p className="listing-subtitle">
              Tu propio archivo familiar. Cada antepasado es un cronista cuyas historias
              merecen ser preservadas junto a las grandes épocas del mundo.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="profile-action-btn secondary"
              onClick={() => setImportOpen(true)}
              data-testid="import-gedcom-btn"
            >
              <ChestIcon size={14} /> Importar GEDCOM
            </button>
            <button
              className="profile-action-btn primary"
              onClick={() => { setEditing(null); setAddOpen(true); }}
              data-testid="add-familiar-btn"
            >
              <PlusOrnateIcon size={14} /> Agregar familiar
            </button>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
            <p style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              Consultando el archivo familiar...
            </p>
          </div>
        ) : familiares.length === 0 ? (
          <div className="listing-empty">
            <CommunitiesIcon size={48} style={{ color: 'var(--gold)' }} />
            <h3>Tu árbol está esperando</h3>
            <p>
              Agrega a tus padres, abuelos, hijos o cualquier familiar para empezar a
              construir tu legado. También puedes importar un archivo GEDCOM si ya tienes
              un árbol en Ancestry, MyHeritage o FamilySearch.
            </p>
            <button
              className="empty-archive-btn"
              onClick={() => setAddOpen(true)}
              data-testid="empty-add-familiar-btn"
            >
              <PlusOrnateIcon size={14} /> Agregar primer familiar
            </button>
          </div>
        ) : (
          <>
            {/* Toggle vista: árbol / línea cronológica */}
            <div className="archive-tabs" style={{ marginBottom: 18 }} data-testid="legado-view-toggle">
              <button
                className={`archive-tab ${viewMode === 'tree' ? 'active' : ''}`}
                onClick={() => setViewMode('tree')}
                data-testid="view-tree-btn"
              >
                <CommunitiesIcon size={12} style={{ marginRight: 4 }} /> Árbol
              </button>
              <button
                className={`archive-tab ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => setViewMode('timeline')}
                data-testid="view-timeline-btn"
              >
                <CalendarIcon size={12} style={{ marginRight: 4 }} /> Línea cronológica
              </button>
            </div>

            {viewMode === 'timeline' ? (
              <TimelineView
                familiares={familiares}
                currentUser={user}
                onSelectFamiliar={setSelected}
              />
            ) : (
              <div className="tree-canvas-wrap" data-testid="tree-canvas">
            <svg viewBox="0 0 1200 1280" className="tree-canvas" preserveAspectRatio="xMidYMin meet">
              {/* Líneas de conexión sutiles */}
              {items.map(f => (
                <line
                  key={`line-${f._id}`}
                  x1={f._x} y1={f._y + 50}
                  x2={ROOT_X} y2={ROOT_Y + 50}
                  className="tree-link"
                />
              ))}

              {/* Nodo ROOT (el cronista) */}
              <g transform={`translate(${ROOT_X - 70}, ${ROOT_Y})`}>
                <circle cx={70} cy={50} r={48} className="cameo-ring root" />
                <circle cx={70} cy={50} r={44} className="cameo-bg root" />
                <text x={70} y={62} textAnchor="middle" className="cameo-initial root">
                  {(nombreRoot[0] || 'T').toUpperCase()}
                </text>
                <text x={70} y={116} textAnchor="middle" className="tree-name root">
                  {nombreRoot}
                </text>
                <text x={70} y={134} textAnchor="middle" className="tree-surname">
                  (tú · raíz del árbol)
                </text>
              </g>

              {/* Todos los nodos familiares */}
              {items.map(f => (
                <TreeNode key={f._id} familiar={f} onClick={setSelected} />
              ))}
            </svg>

            {/* Indicador de capas */}
            <div className="tree-legend">
              <div className="tree-legend-item">
                <span className="tree-legend-dot"></span>
                {familiares.length} familiar{familiares.length !== 1 ? 'es' : ''} en tu legado
              </div>
              <div className="tree-legend-hint">Haz clic en cualquier cameo para ver detalles</div>
            </div>
          </div>
            )}
          </>
        )}
      </main>

      {/* Modales */}
      <AddFamiliarModal
        isOpen={addOpen || !!editing}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        onSaved={handleSaved}
        editing={editing}
      />

      {selected && (
        <FamiliarDetailModal
          familiar={selected}
          onClose={() => setSelected(null)}
          onEdit={(f) => { setSelected(null); setEditing(f); }}
          onDelete={handleDelete}
          onUpdated={(f) => {
            setSelected(f);
            setFamiliares(prev => prev.map(x => x._id === f._id ? f : x));
          }}
        />
      )}

      {/* Modal de importación GEDCOM */}
      {importOpen && (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} data-testid="gedcom-modal">
            <div className="modal-head">
              <h2><ChestIcon size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Importar árbol GEDCOM</h2>
              <button className="modal-close" onClick={() => setImportOpen(false)}>×</button>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
              GEDCOM (.ged) es el formato estándar de genealogía. Exporta tu árbol desde
              Ancestry, MyHeritage, FamilySearch o Geneanet y sube el archivo aquí.
              Detectaremos automáticamente padres, abuelos, hermanos, hijos y cónyuge.
            </p>
            <input
              ref={importInputRef}
              type="file"
              accept=".ged,.gedcom,text/plain"
              style={{ display: 'none' }}
              onChange={(e) => handleImportGedcom(e.target.files[0])}
              data-testid="gedcom-file-input"
            />
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              data-testid="gedcom-select-btn"
            >
              {importing ? 'Importando...' : 'Seleccionar archivo .ged'}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default MiLegado;
