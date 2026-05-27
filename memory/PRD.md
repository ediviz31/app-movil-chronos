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

## Rutas Frontend
- `/` Feed
- `/cronicas`, `/legados`, `/documentos`
- `/epocas`, `/epocas/:nombre`
- `/efemerides`
- `/avisos`
- `/mi-legado` ← NUEVO
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

### Preferencias
- `PUT /api/usuarios/preferencias` con `{sonido_aviso, arbol_publico}`

### Resto: ver iteraciones anteriores

## Backlog / Roadmap

### P1 - Próximas
- 📱 **Mobile responsive completo** (preparar para Capacitor/PWA)
- 🔍 Página `/explorar` curada (mix de búsqueda + descubrimiento)
- 📊 Trending real últimos 7 días
- 💬 Mensajería directa entre cronistas
- 🏷️ Hashtags / tags en relatos

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
- `/app/backend/tests/test_*.py` (pytest, 5+ archivos)
- `test_phase4_legado.py` — 22 tests del árbol
- Iteraciones: `/app/test_reports/iteration_{1..6}.json` — todas 100% (iter5 detectó 3 críticos + 2 minor, iter6 confirmó fix)

## Credenciales
Ver `/app/memory/test_credentials.md`
