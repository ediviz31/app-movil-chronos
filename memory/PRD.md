# Chronos - Red Social Histórica

## Problema original
Migración de proyecto PHP/MySQL a stack moderno (React + Node.js + MongoDB) para crear una red social temática histórica llamada **Chronos**. Funcionalidad social estándar (feed, posts, comentarios, ecos, seguir) con estética muy personalizada tipo "archivo histórico / museo" (NO típico social network).

## Stack
- Frontend: React 18 + React Router v6, axios, custom CSS, Web Audio API
- Backend: Node.js + Express, JWT (httpOnly cookies), Multer (uploads), bcrypt
- DB: MongoDB con Mongoose
- Auth: cookie `chronos_token` httpOnly + sameSite=lax + secure=true

## Estética
- Paleta: dark navy + dorado + texto crema
- Tipografía: Cormorant Garamond (display), Marcellus (elegant), Inter (body)
- Iconos: SVG custom de iconografía oficial Chronos en `HistoricIcons.js`:
  - **CoinLaurelIcon** (Eco) — moneda romana con laurel
  - **ParchmentIcon** (Comentar) — pergamino desplegado
  - **DoveScrollIcon** (Compartir) — paloma con pergamino sellado
  - **ChestIcon** (Archivar) — cofre con cerradura dorada
  - **TelescopeIcon** (Explorar) — catalejo sobre trípode
  - **HornHeraldIcon** (Avisos) — cuerno de heraldo con estandarte
  - **QuillInkIcon** (Editar) — pluma + tintero
  - **TabletDaggerIcon** (Eliminar) — tablilla rota con daga
- Layout: rail íconos IZQ (90px sticky) | feed centro | sidebar efemérides DER (340px sticky)

## Funcionalidades implementadas

### MVP base
- Auth (registro/login/me/logout) con cookies httpOnly
- Crear/listar/eliminar relatos con upload de imagen (Multer)
- Comentarios anidados (parent_id) con respuestas
- Ecos (likes) y Archivados (guardados) con toggle
- Seguir usuarios + sugeridos

### Sesión 27 Feb 2026 - Topbar + Búsqueda + Perfil
- Topbar refinado con logo CHRONOS y nav central distribuido
- Layout invertido (rail IZQ, sidebar efemérides DER sticky)
- **Búsqueda avanzada** (`/api/buscar`): tipo Facebook, acento-insensible, avatares, highlight, recientes localStorage
- **Página de Perfil** (`/perfil/:id`) con cover, avatar editable, badges, stats, tabs
- **Avatar/Portada upload** (multipart)

### Sesión 27 Feb 2026 (parte 2) - Fase 1, 2 y 3
**Fase 1 — Páginas + Detalle relato + Iconografía oficial**
- 8 íconos SVG vectoriales custom referenciando el arte oficial
- `/cronicas` - todas las crónicas con filtros (Recientes/Resonantes)
- `/legados` - grid de cronistas con tarjetas + follow
- `/documentos` - mis archivados (cofre personal)
- `/epocas` - grid de épocas con conteo
- `/epocas/:nombre` - detalle de época con sus relatos
- `/relato/:id` - detalle completo con drop-cap, autor clickeable, 4 acciones grandes, **comentarios + respuestas anidadas con composer**
- `PageShell` reutilizable + FAB flotante para crear crónica

**Fase 2 — Avisos con sonido custom + Editar perfil**
- Modelo `Notificacion` (tipos: eco, comentario, respuesta, seguidor, archivo)
- Sistema instrumentado: ecos, comentarios, respuestas y seguir crean avisos
- `/api/avisos`, `/api/avisos/no-leidos/count`, `/api/avisos/marcar-leidos`, `/api/avisos/:id/leido`
- `/avisos` - página con tabs (Todos/No leídos), auto-mark-as-read tras 1.5s
- **AvisosBadge** en topbar con badge rojo pulsante + polling cada 25s + refresh al volver de tab
- **Sonido custom de Chronos** (`utils/chronosSound.js`): cuerno de heraldo G3→C4 + chime E5 sintetizado con Web Audio API (no archivos externos)
- Botón "Probar sonido" en /avisos
- `EditProfileModal` con nombre/bio/interes/tema_favorito (select)
- PUT /api/usuarios/perfil con validación de longitud + trim

**Fase 3 — Calendario histórico real**
- Dataset curado de ~55 efemérides históricas reales (Julio César, Constantinopla, Bastilla, Pearl Harbor, etc.)
- `/api/efemerides/hoy` con fallback a fecha más cercana
- `/api/efemerides/fecha/:MM-DD`
- `/api/efemerides/calendario/:year/:month`
- `/efemerides` - **calendario navegable** mes a mes con puntos dorados en días con evento + panel de eventos del día seleccionado
- ArchiveSidebar usa efemérides REALES (no mock) con tag "Fecha cercana" si aplica
- Épocas del sidebar clickeables → /epocas/:nombre

## API Endpoints

### Auth
- `POST /api/auth/registro`, `/login` `{correo, password}`, `/logout`, `GET /me`

### Relatos
- `GET /api/relatos?vista=todos|siguiendo` | `POST` (multipart `imagen`) | `GET/PUT/DELETE /:id`

### Interacciones
- `POST /api/ecos/:publicacionId` (toggle, **crea aviso**)
- `POST /api/archivados/:publicacionId` (toggle)
- `GET /api/comentarios/:publicacionId` (con respuestas anidadas)
- `POST /api/comentarios` con parent_id (**crea aviso al autor o al padre**)
- `POST /api/seguir/:usuarioId` (toggle, **crea aviso**)
- `GET /api/seguidores/:id`, `/api/siguiendo/:id`, `/api/archivados`

### Usuarios
- `GET /api/usuarios/sugeridos`, `/:id`, `/:id/relatos`
- `PUT /api/usuarios/perfil` (con validación)
- `POST /api/usuarios/avatar`, `/portada` (multipart)

### Exploración / Búsqueda
- `GET /api/buscar?q=&tipo=todo|usuarios|relatos&limit=` (acento-insensible)
- `GET /api/rutas/populares`
- `GET /api/epocas`
- `GET /api/epocas/:nombre/relatos`

### Avisos (Fase 2)
- `GET /api/avisos`
- `GET /api/avisos/no-leidos/count`
- `POST /api/avisos/marcar-leidos`
- `POST /api/avisos/:id/leido`

### Efemérides (Fase 3)
- `GET /api/efemerides/hoy`
- `GET /api/efemerides/fecha/:MM-DD`
- `GET /api/efemerides/calendario/:year/:month`

## Rutas Frontend
- `/` Feed principal
- `/cronicas` Lista de crónicas con filtros
- `/legados` Grid de cronistas
- `/documentos` Mi archivo personal
- `/epocas` Grid de épocas
- `/epocas/:nombre` Detalle de época
- `/relato/:id` Detalle de relato con comentarios
- `/perfil/:id` Perfil de usuario
- `/avisos` Notificaciones
- `/efemerides` Calendario histórico
- `/login`, `/registro`

## Backlog / Roadmap

### P1 - Próximas
- 📱 Mobile responsive completo (algunas vistas necesitan refinamiento)
- 🔍 Página de Explorar (`/explorar`) que combine búsqueda + descubrimiento curado
- 📊 Trending real basado en ecos+comentarios+archivados últimos 7 días
- 🏛️ Mensajería directa entre cronistas
- 🏷️ Hashtags / tags en relatos con búsqueda

### P2 - Mejoras
- 📦 Export de crónicas a PDF (estilo pergamino)
- 🌗 Modo claro (paleta papel/sepia)
- 📤 Open Graph custom para shares
- 🔔 Sonido configurable (volumen/silencio) en preferencias
- 📅 Más efemérides curadas (objetivo: 365 días cubiertos)
- 🌍 Internacionalización (i18n)

### P3 - Backlog
- 📱 Empaquetado como app móvil con Capacitor/PWA
- 🤝 Líneas de tiempo colaborativas
- 💬 Reacciones múltiples (no sólo eco)
- 📜 API pública / RSS
- 🎵 Variantes de sonido por tipo de aviso

### Refactor crítico
- **`server.js` 1122 líneas** → URGENTE partir en `routes/` (avisos, comentarios, usuarios, relatos, efemerides, buscar, auth)
- Consolidar CSS: archive.css, social-refine.css, historic-refinements.css duplicados
- Extraer `formatAnio` y `formatRel` a `utils/dateHelpers.js` (DRY)
- CORS_ORIGINS=* → host específico antes de prod
- Dataset efemérides ampliar a 200+ eventos

## Tests
- `/app/backend/tests/test_*.py` (pytest, 4 archivos)
- Iteraciones: `/app/test_reports/iteration_{1..4}.json` — todas 100%

## Credenciales
Ver `/app/memory/test_credentials.md`
