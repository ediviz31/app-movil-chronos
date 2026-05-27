# Chronos - Red Social Histórica

## Problema original
Migración de proyecto PHP/MySQL a stack moderno (React + Node.js + MongoDB) para crear una red social temática histórica llamada **Chronos**. Funcionalidad social estándar (feed, posts, comentarios, likes/ecos, seguir) con estética muy personalizada tipo "archivo histórico / museo" (NO típico social network).

## Stack
- Frontend: React 18 + React Router v6, axios, custom CSS
- Backend: Node.js + Express, JWT (httpOnly cookies), Multer (uploads), bcrypt
- DB: MongoDB con Mongoose
- Auth: cookie `chronos_token` httpOnly + sameSite=lax + secure=true

## Estética
- Paleta: dark navy (`#0A1428`, `#0F1A33`) + dorado (`#D4B878`) + texto crema (`#F0EBE1`)
- Tipografía: Cormorant Garamond (display), Marcellus (elegant), Inter (body)
- Iconos: SVG custom en `HistoricIcons.js` (NO usar FontAwesome/emojis)
- Layout actual: rail vertical IZQ (90px) | feed centro (flex) | sidebar efemerides DER (340px, sticky)

## Funcionalidades implementadas

### ✅ MVP base (sesión anterior)
- Auth (registro/login/me/logout) con cookies httpOnly
- Crear/listar/eliminar relatos con upload de imagen (Multer)
- Comentarios anidados (parent_id)
- Ecos (likes) toggle
- Archivados (guardados) toggle
- Seguir usuarios + sugeridos
- Feed con vista "todos" / "siguiendo"

### ✅ Sesión actual (27 Feb 2026)
- **Topbar refinado**: logo CHRONOS visible (hourglass + "Archivo Vivo"), nav central distribuido con 4 SVG icons (Para ti, Crónicas, Legados, Documentos), acciones a la derecha
- **Layout invertido**: SideRail icons IZQ (sticky), Feed centro, ArchiveSidebar (efemerides) DER (sticky, scroll independiente)
- **Búsqueda avanzada** (`GET /api/buscar?q=`): dropdown estilo Facebook con:
  - Filtrado por nombre/usuario/bio (cronistas) y título/contenido/categoría (relatos)
  - Acento-insensible y case-insensible
  - Avatars + highlight de coincidencias (<mark>)
  - Búsquedas recientes en localStorage
  - Debounce 250ms
- **Página de Perfil** (`/perfil/:id`):
  - Cover/portada (placeholder elegante si no hay)
  - Avatar grande con + badge para editar (sólo perfil propio)
  - Bio, badges (tema_favorito + interes), stats (Crónicas/Seguidores/Siguiendo)
  - Tabs Crónicas/Seguidores con empty states
  - Botón "Seguir"/"Siguiendo" toggle (perfil ajeno) o "Nueva crónica" (propio)
- **Avatar/Portada upload**: `POST /api/usuarios/avatar` y `POST /api/usuarios/portada` (multer factory por carpeta)
- **Navegación entre perfiles**: click en avatar topbar/rail/autor del post → /perfil/:id

## API Endpoints actuales

### Auth
- `POST /api/auth/registro`
- `POST /api/auth/login` `{correo, password}`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Relatos
- `GET /api/relatos?vista=todos|siguiendo`
- `POST /api/relatos` (multipart `imagen`)
- `GET /api/relatos/:id`
- `PUT/DELETE /api/relatos/:id`

### Interacciones
- `POST /api/ecos/:publicacionId` (toggle)
- `POST /api/archivados/:publicacionId` (toggle)
- `GET /api/comentarios/:publicacionId`
- `POST /api/comentarios`
- `POST /api/seguir/:usuarioId` (toggle)
- `GET /api/seguidores/:usuarioId`
- `GET /api/siguiendo/:usuarioId`

### Usuarios
- `GET /api/usuarios/sugeridos`
- `GET /api/usuarios/:id` (con estadísticas)
- `GET /api/usuarios/:id/relatos`
- `PUT /api/usuarios/perfil`
- `POST /api/usuarios/avatar` (multipart `imagen`)
- `POST /api/usuarios/portada` (multipart `imagen`)

### Exploración
- `GET /api/buscar?q=&tipo=todo|usuarios|relatos&limit=`
- `GET /api/rutas/populares`
- `GET /api/estadisticas/me`

## Backlog / Roadmap

### P1 - Próximas
- 📜 Página de detalle del relato `/relato/:id` (comentarios completos, ecos, share link)
- 📝 Editar perfil (modal con campos nombre/bio/interes/tema_favorito)
- 🔔 Sistema de notificaciones real (nuevo seguidor, nuevo eco, nuevo comentario)
- 📅 Página de Efemérides reales (no mock) con calendario histórico
- 🏛️ Página por época (/epocas/:nombre) listando relatos por categoría

### P2 - Mejoras
- Mensajería directa entre cronistas
- Hashtags / tags en relatos
- Trending real basado en ecos+comentarios+archivados (24h/7d)
- Filtro por época/categoría en feed
- Vista de archivados (mis guardados)

### P3 - Backlog
- Modo claro (paleta papel/sepia)
- Export de crónicas a PDF (pergamino)
- Compartir relato con preview Open Graph custom
- Reacciones múltiples (no sólo eco)
- Líneas de tiempo colaborativas
- API pública / RSS

### Refactor pendiente
- `server.js` ~860 líneas — partir en `routes/auth.js`, `routes/relatos.js`, `routes/usuarios.js`, `routes/buscar.js`
- Consolidar CSS: `archive.css`, `social-refine.css`, `historic-refinements.css`, `profile.css`, `search.css` → revisar duplicados
- CORS_ORIGINS=* + credentials=true debe pasar a host específico antes de prod

## Modelos de datos

### User
```js
{ nombre, usuario (lowercase), correo, password (bcrypt),
  bio, interes, tema_favorito, avatar, portada, rol,
  perfil_completo, codigo_legado_aceptado, creado_en, actualizado_en }
```

### Publicacion
```js
{ usuario_id (ref User), titulo, categoria, contenido, imagen, creado_en }
```

### Eco, Archivado
```js
{ publicacion_id, usuario_id, creado_en }
```

### Comentario
```js
{ publicacion_id, usuario_id, contenido, parent_id (null o ref Comentario), creado_en }
```

### Seguidor
```js
{ seguidor_id, seguido_id, creado_en }
```

## Credenciales de prueba
Ver `/app/memory/test_credentials.md`

## Tests
- pytest backend: `/app/backend/tests/backend_test.py` + `conftest.py`
- Última corrida: `/app/test_reports/iteration_1.json` — 18/18 backend OK, 100% frontend
