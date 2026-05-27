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

### Preferencias
- `PUT /api/usuarios/preferencias` con `{sonido_aviso, arbol_publico}`

### Resto: ver iteraciones anteriores

## Backlog / Roadmap

### P1 - Próximas
- 🏛️ Detalle de Época funcional (relatos por era histórica)
- 📨 Newsletter semanal por email con Resend (reutilizando WeeklyHighlight)
- 🔗 Compartir relato a redes externas (Open Graph cards)
- 📱 Probar el responsive en Capacitor/PWA real

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
- Iteraciones: `/app/test_reports/iteration_{1..10}.json` — todas 100%
- `test_phase5_explorar.py` — 12 tests
- `test_misivas.py` — 16 tests (DM 1-on-1)
- `test_share_chronicle.py` — 8 tests (compartir crónica por misiva)

## Credenciales
Ver `/app/memory/test_credentials.md`
