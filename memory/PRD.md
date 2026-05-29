# Chronos — Red Social Histórica (PRD)

## 🚀 Estado del proyecto (Feb 2026)
**EN PRODUCCIÓN** — https://historia-connect.emergent.host

### Sesión actual: Migración a Emergent Object Store COMPLETA ✅
**Todas las subidas (imagen, video, audio, IA, TTS) ahora persisten entre re-deploys.**

#### Fase 26 (29-may-2026): Feed pulido — Video custom + Header limpio + Bóveda + Metraje recuperado ⭐
- ✅ **ChronosVideoPlayer integrado en SocialPost** — los videos en el feed ahora usan el reproductor custom dorado (controles propios, play central ornamental, barra dorada, fullscreen).
- ✅ **Header de los posts rediseñado** — autor en línea propia limpia, abajo una fila de chips (categoría + indicador histórico ◆) sin amontonamiento.
- ✅ **Bóveda en el feed** — nuevo componente `FragmentosRail` con tiles verticales tipo Reels que aparecen entre el boletín semanal y el composer. Hover en desktop reproduce preview, click → `/fragmentos`.
- ✅ **"Metraje recuperado"** — sello cinematográfico sobre el video del Fragmento (rediseño completo del badge): tipografía de máquina (Courier), papel envejecido con grano, esquinas tipo dossier desclasificado, leve rotación de -1.4°, animación sutil de parpadeo de proyección, código de referencia "ARCH · A4F92E". Lejos del look de museo, más cerca de "fragmento perdido recuperado de una bóveda".
- ✅ Soporte de `?nuevo=1` y `?focus=<id>` en `/fragmentos` (deep linking desde el rail del feed).
- ✅ `SW_VERSION` → `v20-fragmentos-feed`.

#### Fase 25 (29-may-2026): Object Store completo
- ✅ `POST /api/ia/imagen` → genera con Python a `/tmp/`, sube a Object Store, devuelve `/api/files/chronos/uploads/ia-imagenes/...`
- ✅ `POST /api/relatos/:id/narrar` → idéntico flujo, carpeta `audio/`
- ✅ `imageHelpers.js` reconoce paths `/api/files/...`
- ✅ `SW_VERSION` bumped a `chronos-v19-objstore-complete`
- ✅ Backend reinicia sin errores, Object Store inicializado.
- Estado del bug "404 Not Found uploads en producción": **RESUELTO**

#### Mejoras aplicadas:
- ✅ Auth en producción funcionando (fix `dbName` + `sameSite: 'none'`)
- ✅ Cápsulas duplicadas: agrupadas por usuario con badge de cantidad
- ✅ Layout misivas: más cómodo (padding +60%, cartas más anchas)
- ✅ Pantalla en blanco al enviar misiva: protegida (Array defensive)
- ✅ "Buenas noches" a las 4pm: rango de saludos corregido
- ✅ "Generar imagen con IA": rediseñado (botones más grandes, loader mágico, bottom-sheet móvil)
- ✅ Crónicas: límite video 50→100MB
- ✅ Cápsulas/Stories: ahora aceptan video (≤60MB) con visor que autoplaya
- ✅ Barra "Antorcha" animada con llama crepitante durante subida
- ✅ Sonidos custom: antorcha encendiéndose + campana al completar
- ✅ **Fragmentos del Tiempo** (NUEVO): Reels históricos permanentes
  - Modelo + 6 endpoints (`/api/fragmentos`)
  - Página `/fragmentos` con filtros (Historia local, Personajes, Lugares, Documentos)
  - FragmentoCard con video autoplay (IntersectionObserver), avalar, archivar, difundir
  - CreateFragmentoModal con barra antorcha
  - Agregado al SideRail mobile bar (5 ítems: Inicio, Explorar, Fragmentos, Biblioteca, Mi legado)

## Visión
PWA social/blog con estética histórica donde "cronistas" comparten relatos del pasado y de hoy. Auth con email, feed cronológico, dark + light pergamino, comments en pergamino desplegado ("Resonancias"), presencia en vivo, mapa de efemérides, reading mode, mensajería directa, **Cápsulas del Tiempo (stories históricas)**, **Mi Pasado en Cápsulas**, **Visitas Virtuales 360°**.

## Stack
- **Backend:** Node.js + Express + MongoDB (Mongoose). `server.js` monolítico + módulos en `routes/`
- **Frontend:** React (CRA), CSS custom themes (variables), Leaflet maps, PWA
- **Integraciones:** Emergent LLM Key (vía `emergentintegrations` Python) para imágenes (Nano Banana) y TTS (OpenAI), AirPano (visitas 360°, abre en nueva pestaña)

## Cuenta de prueba
- Email: `vizcarrapulidoeddy@gmail.com` · Password: `chronos2026`
- (Backend espera body con `correo` + `password` en /api/auth/login)

---

## Fases COMPLETADAS

### Fase 1-13 (sesiones previas)
- Auth httpOnly, posts/relatos, ecos/comentarios, archivado, seguidores, notificaciones, mensajería directa, perfil, hashtags
- PWA install, push web (VAPID), iconos custom históricos, tema dark navy + gold
- Mobile UX: topbar auto-hide, pull-to-refresh, swipe-to-open drawer, haptic feedback, anti-zoom

### Fase 14-19 (sesión anterior)
- Light theme pergamino con switch automático
- Resonancias bottom-sheet, Eco animation
- Presence System (🔥 activo, escribiendo…)
- Reading Mode, Mapa interactivo Leaflet
- Video upload (50MB) + ruta TTS

### Fase 20 (28-may-2026): Cards mobile rediseñadas
- Padding lateral consistente, border-radius 14px, sombra suave.

### Fase 21 (28-may-2026): Cápsulas del Tiempo + Indicador histórico ⭐
- Cápsulas (tipo cronista/efeméride/cita) con TTL 24h, viewer fullscreen tipo IG, modal de creación.
- Indicador histórico "◆ siglo XV · Constantinopla" en cada relato.
- Helper `yearToCentury`.

### Fase 22 (28-may-2026): Mi Pasado + Cierre Video/TTS + Sonidos resonantes
- "Mi Pasado en Cápsulas": cápsulas vencidas se preservan en perfil (grid pergamino).
- Removido TTL index del modelo Capsula.
- Input de video en CreateChronicleModal con validación 50MB.
- Volúmenes de notificación 2.2x más fuertes + eco a octava abajo en cuerno.
- Patrón haptic.notify cambiado a `[80, 60, 120, 60, 80]`.
- `python-dotenv` instalado: TTS funcional al 100%.

### Fase 23 (28-may-2026): Pergamino para Resonancias + En línea visible
- CommentsSheet rediseñado completamente como **PERGAMINO desplegado**:
  - Rodillos dorados arriba/abajo con SVG ornamental
  - Papel envejecido (gradiente cream/sepia + grano fractal + manchas de tinta)
  - Ornamentos en las 4 esquinas
  - Cada comentario aparece desde arriba con pluma dorada lateral
  - Tinta sepia, tipografía display italic
  - Form sticky con "Sellar resonancia" como botón send
  - createPortal a document.body para escapar de PullToRefresh
- Indicador "en línea":
  - Dot verde pulsante en cada comentario (excluyendo el propio usuario)
  - Sección "Cronistas activos ahora" en sidebar (grid 3 cols, polling cada 45s)
  - Animación `pergamino-pulse` reutilizable

### Fase 24 (28-may-2026): Visitas Virtuales 360° 🌐
- Catálogo curado de **30 lugares emblemáticos** (`/app/backend/data/visitas_virtuales.js`).
- Backend: rutas modulares `/api/visitas` (`/`, `/sugerir`, `/:slug`).
- Algoritmo `buscarVisita`: match por alias normalizado > parcial > cercanía geográfica <60km.
- Frontend:
  - Hook `useVisitaVirtual({lugar, lat, lng})` con cache en memoria.
  - Componente `VisitaVirtualButton` con 3 variantes (pill, icon, card).
  - Integración en 4 sitios:
    1. **Cápsula efeméride viewer**: botón "🌐 Visitar en 360°" junto a "Ver en el mapa".
    2. **SocialPost**: icono globo dorado circular junto al indicador histórico.
    3. **Mapa Efemérides**: popup de cada marker con visita disponible muestra "Visitar en 360°".
    4. **Página `/visitas`**: catálogo navegable con filtros por época, grid responsive, thumbnails con sepia.
- AirPano envía `X-Frame-Options: DENY` → siempre `window.open(_blank, noopener, noreferrer)`.
- Botón "Visitas 360°" añadido a `/efemerides`.
- **Testing 17/17 backend + 100% frontend** (iteration_22.json).

---

## Pendiente / Backlog Priorizado

### P1 — Próximas features
- 🤖 Moderación IA de crónicas + comentarios (Claude/Gemini)
- 🚩 Sistema de reportes comunitario + panel `/admin/moderacion`
- 🎬 Reproductor `<video controls>` en `RelatoDetail` (backend ya lo soporta, falta UI)
- 🔊 Botón "Escuchar narración" + selector de voz en `RelatoDetail` (backend listo, falta UI)

### P2 — Backlog futuro
- 📧 Newsletter semanal con Resend
- 💳 Stripe + Plan Premium (más voces TTS, cápsulas extras, árboles genealógicos)
- 🛠 Refactor `server.js` (~2440 líneas) → routes/ modulares
- 🌍 Más visitas virtuales (próxima tanda: 30 más cubriendo África subsahariana, Oceanía, América andina)
- 📱 Generar APK Android nativo desde la PWA

---

## Architecture
```
/app/
├── backend/
│   ├── data/
│   │   ├── efemerides.js          # 53 eventos con lat/lng
│   │   ├── citas.js               # 30 citas históricas (rotación diaria)
│   │   └── visitas_virtuales.js   # 30 visitas 360° + buscarVisita
│   ├── models/
│   │   ├── Publicacion.js         # + video_path, audio_path, historia_anio, historia_lugar
│   │   └── Capsula.js             # tipo, usuario_id, texto, epoca, lugar, lat/lng, anio, imagen, autor, visto_por[], expira_en
│   ├── routes/
│   │   ├── capsulas.js            # /api/capsulas (GET, POST, /visto, DELETE, /archivo)
│   │   └── visitas.js             # /api/visitas (/, /sugerir, /:slug)
│   ├── scripts/generate_tts.py    # OpenAI TTS vía emergentintegrations
│   └── server.js                  # Monolito Express
└── frontend/src/
    ├── components/
    │   ├── CapsulasRail.js, CapsulaViewer.js, CreateCapsulaModal.js
    │   ├── ArchivoCapsulas.js     # Mi Pasado en perfil
    │   ├── VisitaVirtualButton.js # 3 variantes (pill, icon, card)
    │   ├── ActivosAhora.js        # cronistas en línea (sidebar)
    │   ├── CommentsSheet.js       # PERGAMINO desplegado
    │   ├── SocialPost.js, PresenceBadge.js
    │   └── ...
    ├── hooks/
    │   └── useVisitaVirtual.js    # con cache en memoria
    ├── pages/
    │   ├── Visitas.js             # catálogo /visitas
    │   ├── Feed.js, MapaEfemerides.js, Profile.js, RelatoDetail.js
    │   └── ...
    ├── styles/
    │   ├── capsulas.css, visitas.css, comments-sheet.css (pergamino)
    │   ├── presence.css (cronistas activos)
    │   └── mobile-app.css, theme-light.css, ...
    └── utils/
        ├── historicTime.js (yearToCentury)
        ├── haptic.js (notify pattern fuerte)
        └── chronosSound.js (volúmenes 2.2x)
```

---

## Endpoints API (resumen)
```
POST   /api/auth/login            body: { correo, password }
GET    /api/relatos               + multipart con video/historia_anio/historia_lugar
POST   /api/relatos/:id/narrar    TTS funcional
GET    /api/capsulas              auto-genera efeméride + cita del día
POST   /api/capsulas              multipart
GET    /api/capsulas/archivo/:usuarioId  cápsulas vencidas
GET    /api/visitas               catálogo 30 items
GET    /api/visitas/sugerir       ?lugar=&lat=&lng=
GET    /api/visitas/:slug
GET    /api/presencia/activos     cronistas en línea (excluye al solicitante)
POST   /api/presencia/heartbeat
GET    /api/efemerides/mapa
... (ecos, comentarios, archivados, misivas, avisos, perfil, familiares)
```
