import React from 'react';

const baseIcon = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

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
