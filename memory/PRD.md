# Chronos - Red Social de Historia

## Problema Original
El usuario tenía una red social de historia ("Chronos") en PHP+MySQL con buen avance funcional pero diseño genérico. Tenía un mockup de diseño elegante que no podía implementar. Decidió migrar a stack moderno (Opción 2).

## Arquitectura

### Stack Tecnológico
- **Backend:** Node.js + Express + MongoDB (puerto 8001)
- **Frontend:** React 19 + React Router 7 + Axios (puerto 3000)
- **Autenticación:** JWT en cookies httpOnly (seguro contra XSS)
- **Base de datos:** MongoDB (chronos DB)

### Estructura del Proyecto
```
/app/
├── backend/
│   ├── server.js                # API principal
│   ├── seed.js                  # Datos de prueba
│   ├── models/                  # User, Publicacion, Eco, Comentario, Archivado, Seguidor
│   ├── middleware/              # auth, upload
│   └── uploads/                 # Imágenes subidas
├── frontend/
│   └── src/
│       ├── App.js               # Router principal
│       ├── App.css              # Diseño premium (1400+ líneas)
│       ├── context/AuthContext.js
│       ├── services/api.js
│       ├── pages/               # Login, Register, Feed
│       └── components/          # Topbar, Sidebar, Rightbar, Post, CreateRelatoModal
```

## Funcionalidades Implementadas

### Autenticación
- ✅ Registro de usuarios
- ✅ Login con JWT en cookies httpOnly
- ✅ Logout que limpia cookies
- ✅ Rutas protegidas con `ProtectedRoute`

### Feed/Relatos
- ✅ Crear relato (título, categoría, contenido, imagen)
- ✅ Ver feed con paginación
- ✅ Vista "Todos" y "Siguiendo"
- ✅ Editar y eliminar propios relatos
- ✅ Mostrar imágenes prominentes

### Interacciones Sociales
- ✅ Dar "Eco" (like) a relatos
- ✅ Comentarios con respuestas anidadas
- ✅ Archivar/guardar relatos
- ✅ Seguir/dejar de seguir usuarios

### Perfiles
- ✅ Perfil con estadísticas (relatos, seguidores, siguiendo)
- ✅ Avatar y portada
- ✅ Bio, intereses, tema favorito

### Diseño Premium
- ✅ Tema oscuro elegante (#0D0F12 fondo)
- ✅ Dorados antiguos (#C6A75E, #D4B878)
- ✅ Tipografía Georgia para títulos
- ✅ Animaciones y transiciones suaves
- ✅ Responsive design
- ✅ Iconos Remixicon
- ✅ Tarjetas de post con imagen prominente
- ✅ Sidebar izquierdo con perfil
- ✅ Sidebar derecho con tendencias

## Credenciales de Prueba
- **Email:** keilin@chronos.com
- **Password:** chronos123
- Otros usuarios: arqueo@, legado@, cronica@, memoria@, rutas@chronos.com (mismo password)

## Correcciones de Calidad Aplicadas
- ✅ Tokens en cookies httpOnly (seguridad XSS)
- ✅ Hooks con dependencias correctas (useCallback)
- ✅ Funciones < 50 líneas (extraídas helpers)
- ✅ Constantes HTTP_STATUS (sin magic numbers)
- ✅ SameSite strict (protección CSRF)

## Estado: ✅ FUNCIONANDO

Frontend: https://historia-connect.preview.emergentagent.com
Backend: http://localhost:8001/api

## Backlog Futuro
- [ ] Página de detalle de relato (vista completa con comentarios)
- [ ] Página de perfil de usuario
- [ ] Página de exploración
- [ ] Notificaciones en tiempo real
- [ ] Búsqueda funcional
- [ ] Edición de perfil con upload de avatar/portada
- [ ] Sistema de moderación/reportes
- [ ] Comunidades
- [ ] Comentarios funcionales en feed
