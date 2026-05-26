import React from 'react';

// Colección de iconos SVG personalizados para Chronos
// Estilo: línea fina, ornamental, evocando grabados históricos

const iconBase = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export const IconQuill = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M20 4c-2 2-4 5-6 9s-3 5-6 7l-3-3c2-3 3-4 7-6s7-4 9-6z"/>
    <path d="M5 17l3-3"/>
    <path d="M3 19l4-4"/>
  </svg>
);

export const IconScroll = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M8 21h12a2 2 0 002-2v-2H10"/>
    <path d="M19 17V5a2 2 0 00-2-2H4"/>
    <path d="M2 5v14c0 1.1.9 2 2 2"/>
    <path d="M7 8h8M7 12h8"/>
  </svg>
);

export const IconColumn = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M5 22V8M19 22V8"/>
    <path d="M3 8h18l-1-3H4z"/>
    <path d="M5 22h14"/>
    <path d="M8 11v8M16 11v8"/>
  </svg>
);

export const IconCompass = (props) => (
  <svg {...iconBase} {...props}>
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

export const IconAmphora = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M9 3h6"/>
    <path d="M9 3v3c0 1-2 2-2 5v6c0 3 2 5 5 5s5-2 5-5V11c0-3-2-4-2-5V3"/>
    <path d="M7 9c-2 0-2 2 0 2M17 9c2 0 2 2 0 2"/>
  </svg>
);

export const IconShield = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M12 2L4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5l-8-3z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

export const IconBookOpen = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M2 4h6a4 4 0 014 4v12a3 3 0 00-3-3H2z"/>
    <path d="M22 4h-6a4 4 0 00-4 4v12a3 3 0 013-3h7z"/>
  </svg>
);

export const IconEcho = (props) => (
  <svg {...iconBase} {...props}>
    <circle cx="12" cy="12" r="2"/>
    <path d="M12 6a6 6 0 016 6"/>
    <path d="M12 2a10 10 0 0110 10"/>
    <path d="M12 18a6 6 0 006-6"/>
    <path d="M12 22a10 10 0 0010-10"/>
  </svg>
);

export const IconBookmark = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </svg>
);

export const IconChat = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
);

export const IconSearch = (props) => (
  <svg {...iconBase} {...props}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const IconHome = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const IconUsers = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

export const IconBell = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

export const IconStar = (props) => (
  <svg {...iconBase} {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const IconEye = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export const IconArchive = (props) => (
  <svg {...iconBase} {...props}>
    <rect x="2" y="3" width="20" height="5" rx="1"/>
    <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);

export const IconDelete = (props) => (
  <svg {...iconBase} {...props}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

export const IconCrown = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M2 7l5 5 5-8 5 8 5-5v11H2z"/>
    <path d="M2 18h20"/>
    <circle cx="2" cy="7" r="1" fill="currentColor"/>
    <circle cx="22" cy="7" r="1" fill="currentColor"/>
    <circle cx="12" cy="4" r="1" fill="currentColor"/>
  </svg>
);

export const IconHashtag = (props) => (
  <svg {...iconBase} {...props}>
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);

export const IconLogout = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export const IconImage = (props) => (
  <svg {...iconBase} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

export const IconPyramid = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M12 2L2 22h20L12 2z"/>
    <path d="M12 2v20"/>
    <path d="M12 12L4.5 22"/>
    <path d="M12 12l7.5 10"/>
  </svg>
);

export const IconCastle = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M3 21V8l3 1V5l3 1V3l3 1V3l3-1v3l3-1v3l3-1v14z"/>
    <line x1="3" y1="21" x2="21" y2="21"/>
    <rect x="10" y="14" width="4" height="7"/>
  </svg>
);

// Ornamento decorativo
export const Ornament = ({ className = '' }) => (
  <svg className={className} width="100" height="20" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="1">
    <line x1="0" y1="10" x2="35" y2="10" />
    <circle cx="40" cy="10" r="3" fill="currentColor" />
    <path d="M45 10 Q50 5 55 10 Q50 15 45 10" />
    <circle cx="60" cy="10" r="3" fill="currentColor" />
    <line x1="65" y1="10" x2="100" y2="10" />
  </svg>
);

// Letra capital decorada
export const DropCap = ({ letter, className = '' }) => (
  <span className={`drop-cap ${className}`}>{letter}</span>
);
