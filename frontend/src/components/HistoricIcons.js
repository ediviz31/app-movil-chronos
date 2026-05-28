import React from 'react';

const baseIcon = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

// Ojo histórico (inspirado en Ojo de Horus) — para contador de lecturas
export const EyeScrollIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    {/* Ojo almendrado */}
    <path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z"/>
    <circle cx="12" cy="12" r="3"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    {/* Pestaña inferior diagonal estilo Horus */}
    <path d="M14 16 L17 19"/>
    <path d="M15 18 Q17 19 18 17"/>
  </svg>
);


// Reloj de arena ornamental
export const HourglassIcon = ({ size = 32, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 40" {...baseIcon} {...props}>
    <path d="M6 4 L26 4 M6 36 L26 36" strokeWidth="1.5"/>
    <path d="M8 4 L8 8 Q8 12 12 14 L20 18 Q24 20 24 24 L24 36"/>
    <path d="M24 4 L24 8 Q24 12 20 14 L12 18 Q8 20 8 24 L8 36"/>
    <path d="M10 4 Q16 6 22 4" strokeWidth="0.5" opacity="0.6"/>
    <path d="M10 36 Q16 38 22 36" strokeWidth="0.5" opacity="0.6"/>
    {/* Arena */}
    <path d="M10 6 L22 6 L20 12 Q16 15 12 12 Z" fill="currentColor" opacity="0.4" stroke="none"/>
    <path d="M11 34 L21 34 L19 28 Q16 26 13 28 Z" fill="currentColor" opacity="0.3" stroke="none"/>
    {/* Detalles ornamentales */}
    <circle cx="16" cy="2" r="0.8" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="38" r="0.8" fill="currentColor" stroke="none"/>
  </svg>
);

// Estrella ornamental (estrella de 4 puntas con detalles)
export const OrnateStarIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M16 2 L18 14 L30 16 L18 18 L16 30 L14 18 L2 16 L14 14 Z"/>
    <path d="M16 8 L17 15 L24 16 L17 17 L16 24 L15 17 L8 16 L15 15 Z" strokeWidth="0.8" opacity="0.6"/>
    <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
    {/* Diagonales finas */}
    <line x1="6" y1="6" x2="11" y2="11" strokeWidth="0.5" opacity="0.4"/>
    <line x1="26" y1="6" x2="21" y2="11" strokeWidth="0.5" opacity="0.4"/>
    <line x1="6" y1="26" x2="11" y2="21" strokeWidth="0.5" opacity="0.4"/>
    <line x1="26" y1="26" x2="21" y2="21" strokeWidth="0.5" opacity="0.4"/>
  </svg>
);

// Brújula con mapa
export const CompassMapIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <circle cx="16" cy="16" r="13"/>
    <circle cx="16" cy="16" r="10" strokeWidth="0.5" opacity="0.5"/>
    <path d="M16 4 L18 14 L16 16 L14 14 Z" fill="currentColor"/>
    <path d="M16 28 L14 18 L16 16 L18 18 Z" opacity="0.4" fill="currentColor"/>
    <line x1="3" y1="16" x2="6" y2="16" strokeWidth="0.8"/>
    <line x1="26" y1="16" x2="29" y2="16" strokeWidth="0.8"/>
    <line x1="16" y1="3" x2="16" y2="6" strokeWidth="0.8"/>
    <line x1="16" y1="26" x2="16" y2="29" strokeWidth="0.8"/>
    <text x="16" y="9" textAnchor="middle" fontSize="3" fill="currentColor" stroke="none">N</text>
  </svg>
);

// Templo / Columnas
export const TempleIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M2 12 L16 4 L30 12 L30 14 L2 14 Z"/>
    <path d="M4 14 L4 26 M10 14 L10 26 M16 14 L16 26 M22 14 L22 26 M28 14 L28 26"/>
    <path d="M2 26 L30 26 L30 28 L2 28 Z"/>
    <path d="M2 28 L30 28"/>
    {/* Detalles del frontón */}
    <path d="M14 8 L16 6 L18 8" strokeWidth="0.6" opacity="0.6"/>
    {/* Capiteles */}
    <line x1="3" y1="15" x2="5" y2="15" strokeWidth="0.5"/>
    <line x1="9" y1="15" x2="11" y2="15" strokeWidth="0.5"/>
    <line x1="15" y1="15" x2="17" y2="15" strokeWidth="0.5"/>
    <line x1="21" y1="15" x2="23" y2="15" strokeWidth="0.5"/>
    <line x1="27" y1="15" x2="29" y2="15" strokeWidth="0.5"/>
  </svg>
);

// Mapa enrollado
export const MapIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M6 6 L26 8 L26 26 L6 24 Z"/>
    <path d="M12 7 L12 25 M20 7.5 L20 25.5" strokeWidth="0.5" opacity="0.5"/>
    <path d="M8 10 Q12 12 16 11 Q20 10 22 13" strokeWidth="0.6" opacity="0.6"/>
    <path d="M9 16 Q14 18 18 16 Q22 14 24 17" strokeWidth="0.6" opacity="0.6"/>
    <circle cx="14" cy="14" r="0.8" fill="currentColor" stroke="none"/>
    <circle cx="22" cy="18" r="0.8" fill="currentColor" stroke="none"/>
    <path d="M14 14 Q18 16 22 18" strokeWidth="0.5" strokeDasharray="1 1"/>
  </svg>
);

// Pluma escribiendo
export const FeatherIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M26 4 Q22 8 18 14 Q14 20 10 24"/>
    <path d="M24 4 Q18 6 14 12 Q10 18 8 24 L4 28"/>
    <path d="M22 7 Q18 9 16 13"/>
    <path d="M20 11 Q17 13 14 16"/>
    <path d="M17 15 Q15 17 13 19"/>
    <path d="M4 28 L8 28" strokeWidth="0.8"/>
    <circle cx="26" cy="4" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

// Libro/Crónica
export const ChronicleIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M4 6 L4 28 Q4 26 16 26 Q28 26 28 28 L28 6 Q28 8 16 8 Q4 8 4 6 Z"/>
    <path d="M16 8 L16 26" strokeWidth="0.8"/>
    <path d="M7 12 L13 12 M7 15 L13 15 M7 18 L11 18" strokeWidth="0.5" opacity="0.7"/>
    <path d="M19 12 L25 12 M19 15 L25 15 M19 18 L23 18" strokeWidth="0.5" opacity="0.7"/>
    {/* Adorno central */}
    <circle cx="16" cy="17" r="0.6" fill="currentColor" stroke="none"/>
  </svg>
);

// Eco (ondas)
export const EchoIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <line x1="2" y1="12" x2="4" y2="12"/>
    <line x1="7" y1="9" x2="7" y2="15" strokeWidth="1.5"/>
    <line x1="10" y1="6" x2="10" y2="18" strokeWidth="1.5"/>
    <line x1="14" y1="3" x2="14" y2="21" strokeWidth="1.5"/>
    <line x1="17" y1="9" x2="17" y2="15" strokeWidth="1.5"/>
    <line x1="20" y1="11" x2="20" y2="13" strokeWidth="1.5"/>
    <line x1="22" y1="12" x2="24" y2="12"/>
  </svg>
);

// Valorar (estrella simple)
export const ValueIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// Difundir
export const ShareIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <path d="M4 12 L12 4 L12 8 Q20 8 20 18 Q16 14 12 14 L12 18 Z"/>
  </svg>
);

// Preservar (marca de libro)
export const PreserveIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </svg>
);

// Sello / sigilo redondo
export const SealIcon = ({ size = 80, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" {...baseIcon} {...props}>
    <circle cx="40" cy="40" r="38" strokeWidth="1"/>
    <circle cx="40" cy="40" r="34" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5"/>
    <circle cx="40" cy="40" r="28" strokeWidth="0.8"/>
    <circle cx="40" cy="40" r="22" strokeWidth="0.3" opacity="0.3"/>
    {/* Texto curvo arriba (FUENTES) */}
    <path id="topText" d="M 12 40 A 28 28 0 0 1 68 40" fill="none" />
    <text fontSize="5" letterSpacing="3" fill="currentColor" stroke="none" fontFamily="serif">
      <textPath href="#topText" startOffset="20%">FUENTES</textPath>
    </text>
    {/* Pluma central */}
    <g transform="translate(40, 40)">
      <path d="M-3 -8 Q-6 -5 -3 5 L-3 8 L3 8 L3 5 Q6 -5 3 -8 Z" fill="currentColor" opacity="0.3"/>
      <path d="M0 -8 L0 8" strokeWidth="0.8"/>
      <path d="M-3 -6 L0 -6 M-3 -3 L0 -3 M-3 0 L0 0 M-3 3 L0 3" strokeWidth="0.4"/>
    </g>
    {/* Estrellas decorativas */}
    <text x="40" y="20" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">✦</text>
    <text x="40" y="68" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">✦</text>
    {/* Número */}
    <text x="40" y="74" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" fontFamily="serif" fontWeight="600">12</text>
  </svg>
);

// Cinta / banner
export const RibbonBookmark = ({ size = 40, ...props }) => (
  <svg width={size} height={size * 1.5} viewBox="0 0 40 60" {...baseIcon} {...props}>
    <path d="M5 0 L35 0 L35 50 L20 42 L5 50 Z" fill="currentColor" opacity="0.15" stroke="currentColor"/>
    <path d="M20 20 L18 23 L20 26 L22 23 Z" fill="currentColor" stroke="none"/>
  </svg>
);

// Llama / Trending
export const FlameIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <path d="M12 2 Q10 6 8 8 Q4 12 4 16 Q4 20 8 22 Q12 24 16 22 Q20 20 20 16 Q20 12 16 8 Q14 10 14 12 Q14 8 12 2 Z"/>
    <path d="M10 16 Q10 14 12 12 Q14 14 14 16 Q14 18 12 19 Q10 18 10 16 Z" fill="currentColor" opacity="0.4"/>
  </svg>
);

// Calendario antiguo
export const CalendarIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <rect x="4" y="6" width="24" height="22" rx="1"/>
    <line x1="4" y1="12" x2="28" y2="12"/>
    <line x1="10" y1="3" x2="10" y2="9"/>
    <line x1="22" y1="3" x2="22" y2="9"/>
    <circle cx="10" cy="18" r="1" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none"/>
    <circle cx="22" cy="18" r="1" fill="currentColor" stroke="none"/>
    <circle cx="10" cy="23" r="1" fill="currentColor" stroke="none" opacity="0.5"/>
    <circle cx="16" cy="23" r="1" fill="currentColor" stroke="none"/>
    <circle cx="22" cy="23" r="1" fill="currentColor" stroke="none" opacity="0.5"/>
  </svg>
);

// Documento / Pergamino
export const ScrollIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M6 6 Q6 4 8 4 L24 4 Q26 4 26 6 L26 26 Q26 28 24 28 L8 28 Q6 28 6 26 Z"/>
    <line x1="10" y1="10" x2="22" y2="10" strokeWidth="0.6"/>
    <line x1="10" y1="14" x2="22" y2="14" strokeWidth="0.6"/>
    <line x1="10" y1="18" x2="20" y2="18" strokeWidth="0.6"/>
    <line x1="10" y1="22" x2="18" y2="22" strokeWidth="0.6"/>
    {/* Sello */}
    <circle cx="22" cy="22" r="2" strokeWidth="0.5"/>
  </svg>
);

// Bibliotheca
export const LibraryIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <rect x="4" y="6" width="3" height="22"/>
    <rect x="9" y="6" width="3" height="22"/>
    <rect x="14" y="8" width="3" height="20"/>
    <rect x="19" y="6" width="3" height="22"/>
    <rect x="24" y="10" width="3" height="18"/>
    <line x1="2" y1="28" x2="30" y2="28" strokeWidth="1.2"/>
    {/* Decoración encima */}
    <circle cx="5.5" cy="8" r="0.4" fill="currentColor"/>
    <circle cx="10.5" cy="8" r="0.4" fill="currentColor"/>
    <circle cx="20.5" cy="8" r="0.4" fill="currentColor"/>
  </svg>
);

// Comunidades (3 columnas)
export const CommunitiesIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <circle cx="16" cy="10" r="4"/>
    <circle cx="8" cy="20" r="3"/>
    <circle cx="24" cy="20" r="3"/>
    <path d="M10 28 Q16 26 22 28" strokeWidth="0.8"/>
  </svg>
);

// Cita decorativa
export const QuoteOrnament = ({ className = '', ...props }) => (
  <svg width="60" height="20" viewBox="0 0 60 20" {...baseIcon} className={className} {...props}>
    <line x1="0" y1="10" x2="22" y2="10" strokeWidth="0.6"/>
    <path d="M22 10 L26 6 L30 10 L26 14 Z" fill="currentColor" stroke="none"/>
    <line x1="32" y1="10" x2="60" y2="10" strokeWidth="0.6"/>
  </svg>
);

// Ornamento divider con flor de lis
export const FleurDivider = (props) => (
  <svg width="200" height="24" viewBox="0 0 200 24" {...baseIcon} {...props}>
    <line x1="0" y1="12" x2="80" y2="12" strokeWidth="0.5" opacity="0.6"/>
    <g transform="translate(100, 12)">
      <path d="M0 -8 Q-3 -5 -3 0 Q-3 5 0 8 Q3 5 3 0 Q3 -5 0 -8 Z" fill="currentColor" opacity="0.6"/>
      <circle cx="0" cy="0" r="1.5" fill="currentColor" stroke="none"/>
      <line x1="-8" y1="0" x2="-5" y2="0" strokeWidth="0.6"/>
      <line x1="5" y1="0" x2="8" y2="0" strokeWidth="0.6"/>
    </g>
    <line x1="120" y1="12" x2="200" y2="12" strokeWidth="0.5" opacity="0.6"/>
  </svg>
);

// Casa / Inicio
export const HomeIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M4 14 L16 4 L28 14 L28 26 Q28 28 26 28 L20 28 L20 20 L12 20 L12 28 L6 28 Q4 28 4 26 Z"/>
    {/* Detalles ornamentales */}
    <path d="M14 6 L18 6" strokeWidth="0.5" opacity="0.5"/>
  </svg>
);

// Notificaciones / Campana
export const BellIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    <path d="M16 4 Q10 4 10 12 Q10 18 6 22 L26 22 Q22 18 22 12 Q22 4 16 4 Z"/>
    <circle cx="16" cy="4" r="1" fill="currentColor" stroke="none"/>
    <path d="M13 25 Q16 28 19 25"/>
  </svg>
);

// Buscar
export const SearchIcon = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <circle cx="11" cy="11" r="7"/>
    <line x1="16" y1="16" x2="20" y2="20"/>
  </svg>
);

// Menú móvil (tres líneas con ornamento de barra dorada)
export const MenuIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <line x1="4" y1="7" x2="20" y2="7"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="17" x2="20" y2="17"/>
    <circle cx="4" cy="12" r="0.8" fill="currentColor" stroke="none"/>
    <circle cx="20" cy="12" r="0.8" fill="currentColor" stroke="none"/>
  </svg>
);


// Más / Plus ornamental
export const PlusOrnateIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <line x1="12" y1="4" x2="12" y2="20"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="4" r="0.6" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="20" r="0.6" fill="currentColor" stroke="none"/>
    <circle cx="4" cy="12" r="0.6" fill="currentColor" stroke="none"/>
    <circle cx="20" cy="12" r="0.6" fill="currentColor" stroke="none"/>
  </svg>
);

// Flecha
export const ArrowRightIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <line x1="4" y1="12" x2="18" y2="12"/>
    <polyline points="13 7 18 12 13 17"/>
  </svg>
);

// Cerrar
export const CloseIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <line x1="6" y1="6" x2="18" y2="18"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  </svg>
);

// Cerrar sesión
export const LogoutIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseIcon} {...props}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ============================================================
// ICONOGRAFÍA OFICIAL DE CHRONOS
// Conceptos exclusivos para la red social histórica
// ============================================================

// ECO — Moneda romana con laurel (perfil emperador en cameo)
export const CoinLaurelIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Anillo exterior con laureles */}
    <circle cx="16" cy="16" r="14" strokeWidth="1.4"/>
    <circle cx="16" cy="16" r="11.5" strokeWidth="0.5" opacity="0.5"/>
    {/* Hojas de laurel - lado izquierdo */}
    <path d="M5 12 Q3 14 4 17 M5 12 Q7 13 7 15" strokeWidth="0.6" opacity="0.7"/>
    <path d="M4 17 Q3 19 5 21 M4 17 Q6 18 6.5 20" strokeWidth="0.6" opacity="0.7"/>
    <path d="M5 21 Q5 23 7 24 M5 21 Q7 22 8 23" strokeWidth="0.6" opacity="0.7"/>
    {/* Hojas de laurel - lado derecho */}
    <path d="M27 12 Q29 14 28 17 M27 12 Q25 13 25 15" strokeWidth="0.6" opacity="0.7"/>
    <path d="M28 17 Q29 19 27 21 M28 17 Q26 18 25.5 20" strokeWidth="0.6" opacity="0.7"/>
    <path d="M27 21 Q27 23 25 24 M27 21 Q25 22 24 23" strokeWidth="0.6" opacity="0.7"/>
    {/* Lazo central inferior del laurel */}
    <path d="M14 25 L16 27 L18 25" strokeWidth="0.8"/>
    {/* Perfil del emperador (cameo) */}
    <path d="M11 11 Q11 7 14 7 Q17 7 17 11 L17 13 Q17 14 18 14 L18 15 L17 15 L17 17 Q17 18 16 18.5 L13 19 Q11.5 19 11 18 L11 17 Q11 16 12 16 Q12 13 11 13 Z"
          fill="currentColor" stroke="none" opacity="0.85"/>
    {/* Detalles del cabello del emperador (corona de laurel) */}
    <path d="M12 9 Q14 8 17 9" strokeWidth="0.5" opacity="0.9"/>
    <circle cx="20" cy="16" r="0.5" fill="currentColor" stroke="none" opacity="0.6"/>
  </svg>
);

// COMENTAR — Pergamino desplegado con escritura
export const ParchmentIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Rodillo superior */}
    <ellipse cx="16" cy="6" rx="11" ry="2.4" strokeWidth="1.2"/>
    <ellipse cx="16" cy="6" rx="11" ry="2.4" fill="currentColor" opacity="0.15" stroke="none"/>
    {/* Rodillo inferior */}
    <ellipse cx="16" cy="26" rx="11" ry="2.4" strokeWidth="1.2"/>
    <ellipse cx="16" cy="26" rx="11" ry="2.4" fill="currentColor" opacity="0.15" stroke="none"/>
    {/* Cuerpo del pergamino */}
    <path d="M5 6 L5 26 M27 6 L27 26"/>
    {/* Líneas de texto */}
    <line x1="9" y1="11" x2="23" y2="11" strokeWidth="0.5" opacity="0.7"/>
    <line x1="9" y1="14" x2="22" y2="14" strokeWidth="0.5" opacity="0.7"/>
    <line x1="9" y1="17" x2="24" y2="17" strokeWidth="0.5" opacity="0.7"/>
    <line x1="9" y1="20" x2="20" y2="20" strokeWidth="0.5" opacity="0.7"/>
    <line x1="9" y1="23" x2="23" y2="23" strokeWidth="0.5" opacity="0.7"/>
    {/* Manijas de los rodillos */}
    <circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="27" cy="6" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="5" cy="26" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="27" cy="26" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

// COMPARTIR — Paloma con pergamino sellado
export const DoveScrollIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Cuerpo de la paloma */}
    <path d="M8 18 Q8 14 13 13 Q18 12 22 14 Q25 16 24 19 Q23 22 20 22 L12 22 Q8 22 8 18 Z"
          fill="currentColor" opacity="0.2" strokeWidth="1.2"/>
    {/* Ala desplegada */}
    <path d="M12 13 Q9 9 6 8 Q8 11 8 14 Q10 13 12 13 Z" strokeWidth="1.1"/>
    <path d="M9 11 L10 13 M7 10 L9 12" strokeWidth="0.5" opacity="0.6"/>
    {/* Cabeza */}
    <circle cx="23" cy="14" r="2.6" fill="currentColor" opacity="0.2" strokeWidth="1.1"/>
    {/* Pico */}
    <path d="M25 14 L27 14 L25.5 15 Z" fill="currentColor"/>
    {/* Ojo */}
    <circle cx="23.5" cy="13.5" r="0.5" fill="currentColor" stroke="none"/>
    {/* Cola */}
    <path d="M8 19 L4 21 L6 22 L8 21 Z" strokeWidth="0.8"/>
    {/* Pergamino que lleva en el pico */}
    <path d="M26 16 Q28 17 28 19 Q28 21 26 22 L24 22" strokeWidth="0.9"/>
    <line x1="25" y1="18" x2="27" y2="18" strokeWidth="0.4" opacity="0.7"/>
    <line x1="25" y1="20" x2="27" y2="20" strokeWidth="0.4" opacity="0.7"/>
    {/* Sello rojo del pergamino */}
    <circle cx="26.5" cy="22.5" r="1" fill="currentColor" stroke="none"/>
    {/* Cinta del sello */}
    <path d="M26 23 L25 25 M27 23 L28 25" strokeWidth="0.6"/>
    {/* Patas (sutiles) */}
    <line x1="15" y1="22" x2="14" y2="25" strokeWidth="0.5"/>
    <line x1="18" y1="22" x2="18" y2="25" strokeWidth="0.5"/>
  </svg>
);

// ARCHIVAR — Cofre de madera con herrajes dorados y cerradura
export const ChestIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Tapa curva del cofre */}
    <path d="M5 14 Q5 8 16 8 Q27 8 27 14 L27 16 L5 16 Z"
          fill="currentColor" opacity="0.15" strokeWidth="1.3"/>
    {/* Banda de hierro superior horizontal de la tapa */}
    <path d="M5 13 Q5 12 16 12 Q27 12 27 13" strokeWidth="0.8"/>
    {/* Cuerpo del cofre */}
    <rect x="5" y="16" width="22" height="10" rx="0.5" strokeWidth="1.3"/>
    <rect x="5" y="16" width="22" height="10" rx="0.5" fill="currentColor" opacity="0.1" stroke="none"/>
    {/* Bandas verticales de herraje */}
    <line x1="11" y1="9" x2="11" y2="26" strokeWidth="0.7" opacity="0.8"/>
    <line x1="21" y1="9" x2="21" y2="26" strokeWidth="0.7" opacity="0.8"/>
    {/* Banda horizontal de unión */}
    <line x1="5" y1="16" x2="27" y2="16" strokeWidth="1"/>
    {/* Cerradura central */}
    <rect x="14.5" y="14" width="3" height="5" rx="0.4" fill="currentColor" stroke="currentColor"/>
    <circle cx="16" cy="16" r="0.4" fill="#0F1A33" stroke="none"/>
    {/* Patas */}
    <line x1="7" y1="26" x2="7" y2="28" strokeWidth="1.5"/>
    <line x1="25" y1="26" x2="25" y2="28" strokeWidth="1.5"/>
    {/* Remaches decorativos en bandas */}
    <circle cx="11" cy="10" r="0.5" fill="currentColor" stroke="none"/>
    <circle cx="11" cy="22" r="0.5" fill="currentColor" stroke="none"/>
    <circle cx="21" cy="10" r="0.5" fill="currentColor" stroke="none"/>
    <circle cx="21" cy="22" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

// EXPLORAR — Catalejo / Telescopio de bronce sobre trípode
export const TelescopeIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Tubo principal del catalejo (diagonal) */}
    <path d="M5 22 L20 9 Q22 7 24 9 L24 11 Q22 13 22 13 L7 24 Q5 24 5 22 Z"
          fill="currentColor" opacity="0.18" strokeWidth="1.2"/>
    {/* Anillos del catalejo */}
    <line x1="9" y1="20" x2="11" y2="22" strokeWidth="0.8"/>
    <line x1="13" y1="16" x2="15" y2="18" strokeWidth="0.8"/>
    <line x1="17" y1="12" x2="19" y2="14" strokeWidth="0.8"/>
    {/* Lente delantero (más grande) */}
    <circle cx="22" cy="10" r="2" strokeWidth="1"/>
    <circle cx="22" cy="10" r="1.2" strokeWidth="0.5" opacity="0.7"/>
    {/* Trípode */}
    <line x1="9" y1="22" x2="6" y2="29" strokeWidth="1.1"/>
    <line x1="9" y1="22" x2="12" y2="29" strokeWidth="1.1"/>
    <line x1="9" y1="22" x2="9" y2="29" strokeWidth="1.1" opacity="0.6"/>
    {/* Base del trípode */}
    <line x1="5" y1="29" x2="13" y2="29" strokeWidth="0.8" opacity="0.6"/>
    {/* Detalle ornamental en el tubo */}
    <path d="M11 18 L13 20" strokeWidth="0.4" opacity="0.7"/>
    <path d="M15 14 L17 16" strokeWidth="0.4" opacity="0.7"/>
    {/* Pequeña estrella vista (decorativa, frente al lente) */}
    <path d="M27 5 L27.5 6.5 L29 7 L27.5 7.5 L27 9 L26.5 7.5 L25 7 L26.5 6.5 Z"
          fill="currentColor" stroke="none" opacity="0.6"/>
  </svg>
);

// AVISOS — Cuerno / Trompeta de heraldo con estandarte
export const HornHeraldIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Cuerno principal - forma curva tipo trompeta de heraldo */}
    <path d="M4 16 Q4 12 8 11 Q14 10 20 12 L26 8 L28 9 L24 14 Q22 16 16 17 L8 18 Q4 18 4 16 Z"
          fill="currentColor" opacity="0.2" strokeWidth="1.2"/>
    {/* Boca del cuerno (extremo amplio) */}
    <ellipse cx="26" cy="9" rx="2" ry="1.4" strokeWidth="1" transform="rotate(-25 26 9)"/>
    {/* Boquilla */}
    <circle cx="5" cy="17" r="1.6" strokeWidth="1"/>
    {/* Anillos decorativos en el cuerno */}
    <line x1="10" y1="13" x2="11" y2="16" strokeWidth="0.6"/>
    <line x1="15" y1="12.5" x2="16" y2="16" strokeWidth="0.6"/>
    <line x1="20" y1="12" x2="21" y2="15" strokeWidth="0.6"/>
    {/* Estandarte / banderín colgando */}
    <path d="M13 17 L13 27 L17 26 L21 27 L21 17"
          fill="currentColor" opacity="0.25" strokeWidth="1"/>
    {/* Detalle del estandarte: cruz o emblema */}
    <line x1="17" y1="19" x2="17" y2="24" strokeWidth="0.6"/>
    <line x1="15" y1="21.5" x2="19" y2="21.5" strokeWidth="0.6"/>
    {/* Borla / tassel del estandarte */}
    <line x1="13" y1="17" x2="12" y2="18" strokeWidth="0.5"/>
    <line x1="21" y1="17" x2="22" y2="18" strokeWidth="0.5"/>
    {/* Cordón decorativo */}
    <path d="M5 15 Q3 13 5 11" strokeWidth="0.5" opacity="0.6"/>
  </svg>
);

// EDITAR — Pluma de escribir + tintero
export const QuillInkIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Tintero base ornamental */}
    <path d="M14 22 Q14 20 16 20 L22 20 Q24 20 24 22 L24 26 Q24 28 22 28 L16 28 Q14 28 14 26 Z"
          fill="currentColor" opacity="0.25" strokeWidth="1.2"/>
    {/* Cuello del tintero */}
    <path d="M17 20 L17 18 L21 18 L21 20" strokeWidth="1"/>
    {/* Apertura del tintero (tinta visible) */}
    <ellipse cx="19" cy="18" rx="2" ry="0.5" fill="currentColor" stroke="none"/>
    {/* Patas decorativas del tintero */}
    <path d="M15 28 L14 29 M23 28 L24 29" strokeWidth="0.6"/>
    {/* Detalle dorado del tintero */}
    <line x1="14" y1="23" x2="24" y2="23" strokeWidth="0.5" opacity="0.6"/>
    <line x1="14" y1="26" x2="24" y2="26" strokeWidth="0.5" opacity="0.6"/>
    {/* Pluma - asta diagonal */}
    <path d="M6 6 L14 18" strokeWidth="1.4"/>
    {/* Pluma - vexilo (las barbas) */}
    <path d="M6 6 Q4 8 5 11 Q7 9 9 9 Q7 11 8 14 Q10 12 12 12 Q10 14 11 17 L14 18 Z"
          fill="currentColor" opacity="0.3" strokeWidth="0.8"/>
    {/* Detalles de las barbas */}
    <path d="M7 9 L8 11 M9 11 L10 13 M11 13 L12 15" strokeWidth="0.4" opacity="0.7"/>
    {/* Punta de la pluma metálica */}
    <path d="M14 18 L16 19 L14.5 19.5 Z" fill="currentColor" stroke="none"/>
    {/* Pequeña gota de tinta */}
    <circle cx="17" cy="20.5" r="0.4" fill="currentColor" stroke="none" opacity="0.7"/>
    {/* Gotitas en el aire */}
    <circle cx="15" cy="21" r="0.3" fill="currentColor" stroke="none" opacity="0.5"/>
    <circle cx="18.5" cy="22" r="0.25" fill="currentColor" stroke="none" opacity="0.4"/>
  </svg>
);

// ELIMINAR — Tablilla de piedra rota con daga
export const TabletDaggerIcon = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" {...baseIcon} {...props}>
    {/* Tablilla de piedra */}
    <path d="M6 9 L20 9 Q22 9 22 11 L22 24 Q22 26 20 26 L8 26 Q6 26 6 24 Z"
          fill="currentColor" opacity="0.15" strokeWidth="1.2"/>
    {/* Líneas de escritura cuneiforme/grabado */}
    <line x1="9" y1="13" x2="14" y2="13" strokeWidth="0.4" opacity="0.7"/>
    <line x1="9" y1="16" x2="17" y2="16" strokeWidth="0.4" opacity="0.7"/>
    <line x1="9" y1="19" x2="13" y2="19" strokeWidth="0.4" opacity="0.7"/>
    <line x1="9" y1="22" x2="16" y2="22" strokeWidth="0.4" opacity="0.7"/>
    {/* Grieta / ruptura diagonal en la tablilla */}
    <path d="M13 9 L19 17 L15 21 L22 26" strokeWidth="0.7" strokeDasharray="1.5 1"/>
    {/* Fragmento desprendido (pequeño triángulo abajo) */}
    <path d="M19 24 L22 22 L23 25 Z" fill="currentColor" opacity="0.35" stroke="none"/>
    {/* Daga / cuchillo cruzando */}
    {/* Hoja */}
    <path d="M18 4 L24 10 L23 11 L17 5 Z" fill="currentColor" opacity="0.4" strokeWidth="0.8"/>
    {/* Empuñadura */}
    <path d="M24 10 L27 13 L26 14 L23 11 Z" strokeWidth="0.8"/>
    {/* Guarda */}
    <line x1="22" y1="9" x2="25" y2="12" strokeWidth="1.2"/>
    {/* Pomo */}
    <circle cx="27.2" cy="13.2" r="0.8" fill="currentColor" stroke="none"/>
    {/* Pequeñas piedras desprendidas */}
    <circle cx="24" cy="25" r="0.4" fill="currentColor" stroke="none" opacity="0.6"/>
    <circle cx="25" cy="27" r="0.3" fill="currentColor" stroke="none" opacity="0.5"/>
  </svg>
);

/* ─── Sol y Luna para toggle de tema ─── */
export const SunIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
       stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Centro radiante */}
    <circle cx="16" cy="16" r="5" />
    <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none" opacity="0.4" />
    {/* 8 rayos: 4 cortos diagonales + 4 largos cardinales */}
    <line x1="16" y1="3" x2="16" y2="7" />
    <line x1="16" y1="25" x2="16" y2="29" />
    <line x1="3" y1="16" x2="7" y2="16" />
    <line x1="25" y1="16" x2="29" y2="16" />
    <line x1="6.5" y1="6.5" x2="9.5" y2="9.5" />
    <line x1="22.5" y1="22.5" x2="25.5" y2="25.5" />
    <line x1="25.5" y1="6.5" x2="22.5" y2="9.5" />
    <line x1="9.5" y1="22.5" x2="6.5" y2="25.5" />
  </svg>
);

export const MoonIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
       stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Luna creciente con estrella ornamental */}
    <path d="M22 21 a10 10 0 1 1 -7-17 a8 8 0 0 0 7 17 Z" />
    {/* Estrella pequeña al lado */}
    <path d="M24 9 L25 11 L27 11.5 L25 12 L24 14 L23 12 L21 11.5 L23 11 Z"
          fill="currentColor" stroke="none" opacity="0.6" />
  </svg>
);

/* Auto: pequeño sol+luna combinados */
export const AutoThemeIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
       stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="16" cy="16" r="8" />
    <path d="M16 8 A8 8 0 0 1 16 24 Z" fill="currentColor" stroke="none" opacity="0.55" />
    <line x1="16" y1="2" x2="16" y2="5" />
    <line x1="16" y1="27" x2="16" y2="30" />
    <line x1="2" y1="16" x2="5" y2="16" />
    <line x1="27" y1="16" x2="30" y2="16" />
  </svg>
);



/* ─── Antorcha encendida: indicador de presencia "activo ahora" ─── */
export const TorchActiveIcon = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...props}>
    {/* Mango */}
    <rect x="13" y="18" width="6" height="11" rx="1.2"
          fill="#8B6E1F" stroke="#5C4416" strokeWidth="0.5" />
    {/* Anillo dorado del mango */}
    <rect x="11.5" y="17" width="9" height="2.5" rx="0.8"
          fill="#D4B878" stroke="#8B6E1F" strokeWidth="0.5" />
    {/* Llama exterior */}
    <path d="M16 3 C 12 6, 10 11, 11 14 C 11.5 16, 14 17, 16 17 C 18 17, 20.5 16, 21 14 C 22 11, 20 6, 16 3 Z"
          fill="#FFA94D" />
    {/* Llama interior */}
    <path d="M16 7 C 14 9, 13 12, 14 14 C 14.5 15, 15.5 15.5, 16 15.5 C 16.5 15.5, 17.5 15, 18 14 C 19 12, 18 9, 16 7 Z"
          fill="#FFD66E" />
    {/* Núcleo brillante */}
    <ellipse cx="16" cy="12.5" rx="1.2" ry="2.5" fill="#FFF3C8" />
  </svg>
);
