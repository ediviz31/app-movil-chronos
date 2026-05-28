# Chronos - Red Social Histórica (PRD)

## Problema original
Migración de proyecto PHP/MySQL a stack moderno (React + Node.js + MongoDB) para crear **Chronos**, una red social temática histórica. Funcionalidad social estándar + estética muy personalizada tipo "archivo histórico / museo" + **valor diferenciador**: vincular cronistas con sus antepasados (árbol genealógico integrado con épocas históricas).

## Stack
- Frontend: React 18 + React Router v6, axios, custom CSS, **Web Audio API** para sonidos
- Backend: Node.js + Express, JWT (httpOnly cookies), Multer (uploads), bcrypt
- DB: MongoDB con Mongoose
- Auth: cookie `chronos_token` httpOnly, sameSite=lax, secure=true

## Estética
- Paleta: dark navy + dorado + crema
- Tipografía: Cormorant Garamond, Marcellus, Inter
- Iconografía oficial Chronos: 8 SVG vectoriales custom (moneda+laurel, pergamino, paloma+pergamino, cofre, catalejo, cuerno, pluma+tintero, tablilla+daga)
- Layout: rail íconos IZQ (90px sticky) | feed centro | sidebar efemérides DER (340px sticky sin scroll visible)

## Fases completadas

### MVP base (auth + relatos + interacciones)
Auth httpOnly cookies, CRUD de relatos, comentarios anidados, ecos, archivados, seguir.

### Fase 0 — Búsqueda + Perfil + Topbar
Búsqueda avanzada Facebook-style con avatares y highlight, página de perfil con cover/avatar editable, topbar refinado.

### Fase 1 — Páginas + Detalle de relato + Iconografía oficial
8 íconos SVG vectoriales, páginas `/cronicas` `/legados` `/documentos` `/epocas` `/epocas/:nombre`, `/relato/:id` con drop-cap + comentarios + respuestas anidadas, `PageShell` reutilizable.

### Fase 2 — Avisos con sonido + Editar perfil
Modelo Notificacion integrado con ecos/comentarios/respuestas/seguidores, página `/avisos` con badge pulsante + polling 25s, sonido sintetizado, EditProfileModal.

### Fase 3 — Calendario histórico real
Dataset curado de ~55 efemérides reales, página `/efemerides` con calendario navegable, ArchiveSidebar usa datos reales.

### Fase 4 — Árbol Genealógico + Sonidos custom configurables ⭐
**Mi Legado Familiar** (`/mi-legado`):
- Modelo `MiembroFamiliar` con 25 tipos de parentesco (bisabuelos por línea, etc.)
- Árbol SVG visual con cameos dorados, posicionamiento automático por generación, fan-out horizontal para hermanos
- CRUD completo + upload de foto + validación de owner
- **Anécdotas inline** por familiar (historias cortas)
- **GEDCOM Import**: parser básico que importa de Ancestry/MyHeritage/FamilySearch
- **Capa de valor Chronos**: muestra época histórica del familiar + efemérides del día de su nacimiento

**Sonidos custom configurables** (Web Audio API, sin archivos externos):
- Cuerno de heraldo (G3→C4 + chime)
- Lira griega (arpegio C-E-G-C tipo cuerda pulsada)
- Campana de monasterio (B3 con parciales armónicos)
- Silencio total

**Preferencias del cronista**:
- Selector de sonido con preview al clic
- Toggle de privacidad del árbol (privado/público)

### Fase 5 — Explorar + Hashtags + Timeline (Bloque 2)
**Hashtags auto-extraídos**:
- Modelo `Publicacion.extractTags(text)` con regex Unicode (`\p{L}\p{N}_`) — soporta acentos y minimiza a 2-30 chars
- POST/PUT `/api/relatos` re-extrae tags al crear o cambiar título/contenido
- Componente `<HashtagText>` parsea contenido de relatos y convierte `#palabra` en spans clickeables → navega a `/tags/:tag`

**Página Explorar** (`/explorar`):
- 4 secciones: trending semanal (por score = ecos+comentarios 7d), cronistas para seguir, hashtags populares, épocas con más actividad
- Endpoint único `GET /api/explorar` (combinado)
- Entrada en SideRail con `TelescopeIcon`

**Página Tag** (`/tags/:tag`):
- Lista de relatos con un hashtag dado, header con back, total de relatos, render con `SocialPost`

**Vista Línea cronológica del árbol** (`/mi-legado`):
- Toggle Árbol ↔ Línea cronológica (componente `TimelineView`)
- Eje vertical = años, izquierda = familiares, derecha = ~19 hitos universales (1492 Colón → 2020 COVID)
- Espina dorsal dorada con marcas de décadas, cameo "Hoy" del usuario al final
- Empty state mejorado: línea + hitos + cameo TÚ siempre visibles, hint "agrega fechas..." como overlay si no hay familiares con `fecha_nacimiento`

**Mobile responsive sweep (Bloque 3 base)**:
- Media queries `@max-width: 1100px` (sidebar oculta, rail comprimido) y `@max-width: 700px` (rail bottom nav, topbar simplificada, timeline compactada)

### Fase 6 — Boletín del archivo (Weekly Highlight)
- Componente `<WeeklyHighlight>` en el Feed (entre saludo y composer)
- Reutiliza `GET /api/explorar` (sin endpoint nuevo)
- 3 secciones: relato más resonante, cronista para seguir, 3 hashtags populares + CTA "Visitar el archivo de la semana"
- Diseño: sello dorado (laurel), divisor flor de lis, paleta histórica existente
- Empty state: silent hide si la API falla o no hay datos; secciones individuales también se ocultan independientemente
- Mobile responsive: a ≤700px se reorganiza a 1 columna

### Fase 7 — Misivas (Mensajería directa estilo carta) 💌
**Modelos backend:**
- `Conversacion`: participantes [2] (normalizados ordenando IDs), ultimo_mensaje_en, ultimo_mensaje_resumen, ultimo_remitente_id, leido_por (Map<userId, Date>)
- `Mensaje`: conversacion_id, remitente_id, contenido (1-4000 chars)

**API endpoints (`/api/misivas`):**
- `POST /abrir/:userId` — abre o reutiliza conversación 1-on-1 (idempotente)
- `GET /` — lista de conversaciones con `{otro, ultimo_mensaje_en, ultimo_mensaje_resumen, no_leido}`
- `GET /no-leidas` — count para badge en topbar
- `GET /:conversacionId/mensajes` — historial cronológico
- `POST /:conversacionId/mensajes` — enviar
- `POST /:conversacionId/leer` — marcar leído

**Frontend (`/misivas`, `/misivas/abrir/:userId`, `/misivas/:conversacionId`):**
- Layout 2 columnas: lista de hilos (izq) + hilo activo (der)
- Cada mensaje renderiza como **carta de pergamino**: esquinas ornamentadas, sello dorado, alineación izquierda/derecha según remitente
- Polling 10s en el hilo activo + lista
- Optimistic append al enviar
- Atajos: Ctrl/Cmd+Enter envía
- Mobile responsive a ≤900px (sidebar arriba, hilo abajo, botón "back")

**Integraciones UI:**
- `<MisivasBadge>` en topbar con polling 20s
- Botón "Enviar misiva" en perfil ajeno
- Entrada "Misivas" en SideRail (DoveScrollIcon)

### Fase 8 — Compartir crónica por misiva 📜→💌
**Backend:**
- `GET /api/misivas/contactos-sugeridos` — devuelve cronistas que sigo + me siguen, dedup, sin yo mismo

**Frontend:**
- `<ShareChronicleModal>` reemplaza el comportamiento anterior del botón "Compartir" (que solo copiaba al portapapeles)
- Dos vías: copiar enlace o seleccionar un cronista (lista sugeridos + búsqueda con debounce 250ms)
- Al seleccionar destinatario → `/misivas/abrir/:userId?compartir=<relatoId>`
- `MisivasPage` propaga el `?compartir` al redirigir a `/misivas/:convId?compartir=<relatoId>`
- Composer se pre-rellena con plantilla editable: `título + autor + fragmento (180 chars) + enlace`
- Usuario puede editar antes de enviar (preserva intimidad, no spam automático)

### Fase 9 — Open Graph cards para viralidad externa 🌐
**Backend:**
- `GET /api/og/relato/:id` (público, sin auth) — HTML con meta tags `og:*` y `twitter:*` completas; detección de bots por User-Agent para servir o no el meta refresh hacia `/relato/:id`
- `GET /api/og/relato/:id/imagen` (público) — PNG dinámico 1200×630 generado vía `@resvg/resvg-js` con título, autor, época, fragmento (100 chars), reloj de arena monograma y marco ornamentado dorado
- Cache-Control 600s (HTML) / 3600s (imagen)
- Detecta: WhatsApp, FacebookExternalHit, Twitterbot, Discord, Telegram, Slackbot, SkypeURIPreview + patrones genéricos (bot|crawl|spider|preview|embed)

**Frontend:**
- `ShareChronicleModal` y `MisivasPage` ahora usan `/api/og/relato/:id` como enlace público — al pegar en WhatsApp/Twitter/Discord aparece la preview elegante (vista previa con título + autor + época + sello dorado)

### Fase 10 — Lectura pública de relatos 🔓 (funnel de adquisición)
**Backend:**
- Nuevo middleware `authOptional.js` — adjunta `req.user` si hay cookie válida, si no continúa como anónimo
- `GET /api/relatos/:id` ahora usa `authOptional`; devuelve `es_publico` flag y `usuario_dio_eco/usuario_archivado=false` para anónimos
- `GET /api/comentarios/:publicacionId` ahora usa `authOptional`
- Acciones de escritura (POST ecos/comentarios/archivados) SIGUEN requiriendo auth estricto (401 sin cookie)

**Frontend:**
- `/relato/:id` ya NO está en `ProtectedRoute` — es público
- `<PublicShell>` (nuevo) — topbar minimal con branding + "Entrar / Únete a Chronos"
- `RelatoDetail` usa Shell condicional: `PageShell` si autenticado, `PublicShell` si anónimo
- `<RelatoJoinCTA>` banner dorado ornamentado entre contenido y comentarios
- Comentarios solo en lectura para anónimos; en lugar del composer aparece "Únete a Chronos para comentar"
- Cada acción de escritura (eco, comentar, archivar, responder) verifica `isAuthenticated`; si no, redirige a `/registro?redirect=/relato/:id`
- `Login.js` y `Register.js` leen query `?redirect` y honran la URL de destino tras autenticarse
- `PublicRoute` reactivo (con `useSearchParams`) hace el redirect declarativamente cuando `isAuthenticated` cambia, evitando race conditions
- Interceptor de `api.js` actualizado: no redirige a `/login` desde rutas públicas (login/registro/relato/) ni para checks pasivos `/auth/me`
- `AuthContext.checkAuth` suprime `console.error` para 401 esperado en anónimos

### Fase 11 — Contador de lecturas 👁️
**Backend:**
- Campo `visitas: Number, default: 0` en modelo `Publicacion`
- `POST /api/relatos/:id/visita` (auth opcional) — incrementa atómicamente con anti-flooding
- Cache en memoria con TTL 30min, clave `${userId|ip}:${relatoId}` → evita refrescos infladores
- Excepción: el autor NO infla sus propias lecturas (respuesta `contado=false razon='autor'`)
- `app.set('trust proxy', true)` para que `x-forwarded-for` funcione tras el ingress

**Frontend:**
- `RelatoDetail` dispara POST visita al montar (fire-and-forget)
- Badge `EyeScrollIcon + "N lecturas"` (singular/plural en español) en el kicker del relato
- Solo se muestra cuando `visitas > 0`
- Nuevo icono `EyeScrollIcon` (inspirado en Ojo de Horus) en `HistoricIcons`

### Fase 12 — PWA + Web Push notifications 📱🔔
**Branding visual generado con IA:**
- Logo/ícono de la app generado con **Gemini Nano Banana** (`@gemini-3.1-flash-image-preview`)
- Reloj de arena dorado ornamentado sobre fondo dark navy, sin texto, estilo heráldico
- Genera con `python /app/backend/scripts/generate_chronos_logo.py`
- Sale a `/app/frontend/public/icons/{icon-192,256,384,512.png, apple-touch-icon.png, favicon-16/32.png}` + `favicon.ico`

**PWA básica:**
- `manifest.json` con name "Chronos · Archivo vivo de la historia", theme_color `#0a1228`, display standalone, shortcuts (Crear crónica · Misivas · Mi Legado)
- `sw.js` service worker: cache-first para assets estáticos, network-first para navegaciones, /api/** sin cache
- Meta tags PWA en `index.html`: apple-mobile-web-app-capable, apple-touch-icon, theme-color, etc.
- Registro del SW desde `/src/index.js` vía `registerServiceWorker()`

**Web Push (VAPID self-hosted):**
- Librería `web-push` npm + VAPID keys en `/app/backend/.env`
- Nuevo modelo `PushSubscription` (endpoint único, keys{p256dh,auth}, user_agent)
- Endpoints `/api/push/{public-key, suscribir, desuscribir, test}`
- `enviarPushAUsuario(userId, payload)` integrado en `crearAviso()` y `POST /api/misivas/:id/mensajes` — dispara en `setImmediate` (no bloquea respuesta)
- Limpia subscripciones expiradas automáticamente (410/404)

**UX opt-in:**
- `PushOptInBanner` aparece tras 25s para usuarios autenticados con permiso `default` y sin subscripción
- Botones "Activar avisos" / cierre (X) — el dismiss persiste en `localStorage chronos_push_dismissed_v1`
- Robusto contra re-renders del contexto (ref-based, timer no se resetea)

**Service Worker push handler:**
- Evento `push`: muestra notificación con icon, badge, tag, url, vibrate
- Evento `notificationclick`: enfoca ventana existente o abre nueva en la URL específica

### Fase 13 — UX móvil nativo 📱✨
**Diseño app-like en móvil (≤900px):**
- Bottom tab bar (4 items principales: Inicio · Explorar · Misivas · Mi Legado + ☰Más en topbar) con indicador dorado superior tipo iOS
- Topbar minimal (logo + Crear · Avisos · Misivas · Buscar · ☰Más)
- `<MobileMoreDrawer>` — drawer lateral derecho con:
  - Avatar del usuario clickeable hacia su perfil
  - Búsqueda inline con debounce 250ms y resultados (cronistas + crónicas)
  - Secciones secundarias (Épocas, Efemérides, Crónicas, Biblioteca, Legados)
  - Cerrar sesión
- Modals tipo "sheet" (suben desde abajo, asa superior, border-radius solo arriba)
- Touch feedback (scale 0.98 + opacity active state) en todo elemento interactivo
- Safe-area insets (`env(safe-area-inset-top/bottom)`) para iPhones con notch
- Items mínimos 44px (touch target), inputs 16px (evita auto-zoom iOS)
- Cards edge-to-edge en móvil
- **Overflow horizontal anulado** globalmente + targeted en `.explorar-grid`, `.tree-canvas` (scroll horizontal contenido), `.explore-section`, `.profile-*`, `.archive-listing-page`, `.epocas-grid`, `.cronistas-grid`
- Badge "Made with Emergent" oculto en móvil vía `visibility: hidden` (workaround del inline `display:!important`)
- Scrollbars ocultos en móvil (más nativo)
- Tipografías escaladas (h1 32px → 26px → 22px @≤480px)
- Animación slide-in del drawer + sheet-up de modales (cubic-bezier nativo)
- `activeRail` corregido en `MiLegado` y demás páginas con tab en mobile

### Fase 13 — Native Mobile UX overhaul 📱✨ (Feb 28, 2026)
**Renovación completa de PWA mobile para sentir como app nativa, basada en mockups del usuario:**

**Layout & sticky:**
- `MobileSubBar` (nuevo): position:fixed bajo el topbar (top:56px), contiene SearchBar pill full-width + 4 tabs (Para ti, Crónicas, Legados, Documentos)
- Topbar mobile rediseñado: logo CHRONOS **centrado**, avatar circular dorado a la derecha (click abre el drawer)
- `main-area` padding-top:128px en mobile para compensar topbar+subbar fijos
- Fix crítico: `overflow-x: hidden` → `overflow-x: clip` en body/archive-layout (no rompe `position:sticky` en iOS)
- Grid layout mobile: `grid-template-rows: 56px 1fr` (sin reservar fila para bottom-nav, que es position:fixed)
- Cards centradas con padding simétrico (antes lean-left por padding 28px/48px asimétrico en social-refine.css)

**Bottom nav (5 items, como Twitter/Instagram):**
- Inicio · Explorar · Crónicas · Biblioteca · Mi legado
- Sin gap inferior, indicador activo dorado tipo iOS

**Drawer móvil:**
- Renderizado via `createPortal` a `document.body` (evita containing-block por backdrop-filter del topbar)
- Fondo opaco azul oscuro (no transparente)
- Búsqueda inline real (resultados de `/api/buscar`)
- Lista: Misivas, Avisos, Épocas, Efemérides, Legados + Cerrar sesión

**Gestos táctiles nativos:**
- 🤚 **Swipe-to-open** desde borde izquierdo (primeros 24px → dx>60px abre drawer)
- 🤚 **Swipe-to-close** sobre el drawer abierto (desliza a la derecha → cierra)
- 🔄 **Pull-to-refresh** estilo Twitter/iOS en `/` (HourglassIcon rota, resistencia, threshold 70px)

**Refinamiento visual:**
- Hashtags inline como **pills doradas** con borde
- WeeklyHighlight ("Boletín del archivo") centrado con marco doble dorado
- SALA CHRONOS card con borde dorado + kicker + título italic "Buen día/tarde/noche"
- Composer iconos dorados visibles (Imagen / Época / Relato + botón PUBLICAR)
- Modales tipo bottom-sheet con asa superior, scrollbar dorado dentro (no amarillo del browser)
- Topbar mobile esconde botones secundarios (crear, hamburguesa, badges) — todo se accede vía drawer

**Archivos clave:**
- `/app/frontend/src/components/MobileSubBar.js` (nuevo)
- `/app/frontend/src/components/PullToRefresh.js` (nuevo)
- `/app/frontend/src/components/MobileMoreDrawer.js` (refactor: createPortal + swipe-to-close)
- `/app/frontend/src/components/TopbarArchive.js` (logo centrado, swipe-to-open, avatar abre drawer)
- `/app/frontend/src/components/SideRail.js` (5 items mobile)
- `/app/frontend/src/components/PageShell.js` (incluye MobileSubBar)
- `/app/frontend/src/pages/Feed.js` (PullToRefresh wrapper)
- `/app/frontend/src/styles/mobile-app.css` (1000+ líneas; grid-aware, sticky-safe)

**Testing:** `iteration_17.json` — todos los casos PASS (Mobile 390x844 + Desktop 1920x800).

## Rutas Frontend (actualizadas)
- `/` Feed (con `<WeeklyHighlight>` semanal)
- `/explorar` ← Fase 5
- `/tags/:tag` ← Fase 5
- `/misivas` · `/misivas/abrir/:userId` · `/misivas/:conversacionId` ← Fase 7
- `/cronicas`, `/legados`, `/documentos`
- `/epocas`, `/epocas/:nombre`
- `/efemerides`
- `/avisos`
- `/mi-legado` (con toggle vista árbol/timeline)
- `/relato/:id`, `/perfil/:id`
- `/login`, `/registro`

## API Endpoints clave

### Familiares (Fase 4)
- `GET /api/familiares/mios`
- `GET /api/familiares/usuario/:userId` (respeta privacidad)
- `POST /api/familiares`, `PUT /api/familiares/:id`, `DELETE /api/familiares/:id`
- `POST /api/familiares/:id/foto` (multipart)
- `POST/DELETE /api/familiares/:id/historias`
- `POST /api/familiares/importar-gedcom`

### Explorar / Tags (Fase 5)
- `GET /api/explorar` → `{trending, tags_populares, cronistas, epocas}`
- `GET /api/trending` → `{dias:7, relatos:[...]}`
- `GET /api/tags/populares`
- `GET /api/tags/:tag/relatos` → `{tag, total, relatos}`

### Misivas (Fase 7 + 8)
- `POST /api/misivas/abrir/:userId`
- `GET /api/misivas`
- `GET /api/misivas/no-leidas`
- `GET /api/misivas/contactos-sugeridos` (Fase 8 — para "Compartir crónica")
- `GET /api/misivas/:conversacionId/mensajes`
- `POST /api/misivas/:conversacionId/mensajes`
- `POST /api/misivas/:conversacionId/leer`

### Open Graph (Fase 9 — sin auth, públicos)
- `GET /api/og/relato/:id` → HTML con meta og:*/twitter:* + redirect humanos
- `GET /api/og/relato/:id/imagen` → PNG 1200×630 dinámico

### Preferencias
- `PUT /api/usuarios/preferencias` con `{sonido_aviso, arbol_publico}`

### Resto: ver iteraciones anteriores

## Backlog / Roadmap

### P1 - Próximas (en orden secuencial)
- 🛡️ **Moderación de contenido con IA** (Claude Sonnet 4.5 / Gemini 3) — preservar el tono histórico del archivo: bloquear memes, ofensas, contenido fuera de contexto
- 🚩 Sistema de reportes comunitario + panel admin
- 🏛️ Detalle de Época funcional (relatos por era histórica)
- 📨 Newsletter semanal con Resend
- 🎥 Videos de exploradores históricos (Fase A MVP)
- 💳 Stripe + Plan Cronista Premium

### P2 - Mejoras
- 🔗 **FamilySearch API OAuth** (sincronización con árbol externo más grande del mundo)
- 📤 Export GEDCOM del árbol Chronos
- 📦 Export crónicas a PDF (estilo pergamino)
- 🌗 Modo claro (paleta papel/sepia)
- 🌍 i18n (inglés)
- 📅 Ampliar dataset efemérides a 365 días cubiertos

### P3 - Backlog
- 📱 Empaquetado app móvil (Capacitor/PWA)
- 🤝 Líneas de tiempo colaborativas
- 💬 Reacciones múltiples
- 📜 API pública / RSS
- 👨‍👩‍👧 Compartir árbol con familiares por correo
- 🌳 Vista cronológica del árbol (línea de tiempo)

### Deuda técnica (sugerencias del testing agent)
- **🔴 server.js ~1390 líneas → URGENTE partir en `routes/`** (familiares, preferencias, comentarios, usuarios, relatos, efemerides, buscar, auth, avisos)
- Helper `isOwner(doc, req)` para regla DRY de validación de propietario
- Lista de parentescos duplicada en 3 lugares (modelo, server, parentescoMap.js) → extraer a constants compartido
- Consolidar CSS: archive.css, social-refine.css, historic-refinements.css
- CORS_ORIGINS específico antes de producción

## Tests
- `/app/backend/tests/test_*.py` (pytest, 6 archivos)
- `test_phase4_legado.py` — 22 tests del árbol
- Iteraciones: `/app/test_reports/iteration_{1..11}.json` — todas 100%
- `test_phase5_explorar.py` — 12 tests
- `test_misivas.py` — 16 tests (DM 1-on-1)
- `test_share_chronicle.py` — 8 tests (compartir crónica por misiva)
- `test_og_cards.py` — 21 tests (Open Graph cards)

## Credenciales
Ver `/app/memory/test_credentials.md`
