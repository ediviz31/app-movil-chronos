# Chronos — Red Social Histórica (PRD)

## Visión
PWA social/blog con estética histórica donde "cronistas" comparten relatos del pasado y de hoy. Auth con email, feed cronológico, dark + light pergamino, comments tipo TikTok ("Resonancias"), presencia en vivo, mapa de efemérides, reading mode, mensajería directa, **Cápsulas del Tiempo (stories históricas)**.

## Stack
- **Backend:** Node.js + Express + MongoDB (Mongoose). `server.js` monolítico + módulos en `routes/`
- **Frontend:** React (CRA), CSS custom themes (variables), Leaflet maps, PWA
- **Integraciones:** Emergent LLM Key (vía `emergentintegrations` Python) para imágenes (Nano Banana) y TTS (OpenAI)

## Cuenta de prueba
- Email: `vizcarrapulidoeddy@gmail.com` · Password: `chronos2026`
- (Backend espera body con `correo` + `password` en /api/auth/login)

---

## Fases COMPLETADAS

### Fase 1-13 (sesiones previas)
- Auth httpOnly, posts/relatos, ecos/comentarios, archivado, seguidores
- Notificaciones, mensajería directa, perfil, hashtags
- PWA install, push web (VAPID), iconos custom históricos
- Tema dark navy + gold, ornamentaciones SVG
- Mobile UX: topbar auto-hide, pull-to-refresh, swipe-to-open drawer, haptic feedback
- Anti-zoom mobile (touch-action, meta, JS)

### Fase 14-19 (sesión anterior)
- ✅ Light theme pergamino con switch automático por hora del día
- ✅ "Resonancias" — bottom sheet TikTok-style para comentarios
- ✅ Rename acciones: Avalar, Responder, Aportes, Eco, Seguir legado
- ✅ Eco animation (golden star burst)
- ✅ Presence System: 🔥 activo, escribiendo... (heartbeat polling)
- ✅ Reading Mode parchment con A-/A+
- ✅ Mapa interactivo Efemérides (Leaflet + Carto, 53 eventos con lat/lng)
- ✅ Video upload (multer 50MB) en `POST /api/relatos`
- ✅ Ruta `POST /api/relatos/:id/narrar` (TTS vía Python emergentintegrations) — backend listo

### Fase 20 (28-may-2026): Rediseño cards mobile
- ✅ Quitado patrón "edge-to-edge negativo" (`margin: 0 -14px`) en `.social-post`, `.feed-greeting`, `.social-composer`. Cards reales con border-radius 14px, borde dorado suave, sombra, padding lateral consistente.

### Fase 21 (28-may-2026): Cápsulas del Tiempo + Indicador histórico ⭐
**Testing agent: 13/13 backend + 100% frontend, sin issues.**

- ✅ **Indicador de tiempo histórico** en cada crónica: pill dorada "◆ siglo XV · Constantinopla" bajo el nombre del autor.
  - Campos opcionales `historia_anio` (number) + `historia_lugar` (string) en modelo `Publicacion`.
  - Helper `yearToCentury` (1453 → "siglo XV"; -44 → "siglo I a.C.").
  - Inputs nuevos en `CreateChronicleModal`.
- ✅ **Cápsulas del Tiempo** (stories históricas 24h):
  - Modelo `Capsula` con TTL index sobre `expira_en`.
  - Router modular `/app/backend/routes/capsulas.js` con GET, POST, /visto, DELETE.
  - 3 tipos:
    - `efemeride` — auto del sistema, 1 por día, usa `data/efemerides.js`
    - `cita` — auto del sistema, 1 por día, rotación de 30 citas en `data/citas.js`
    - `cronista` — creada por el usuario, vida 24h, texto + época + lugar + año + imagen opcional
  - Carrusel horizontal `CapsulasRail` en el feed (debajo del saludo)
  - Viewer fullscreen `CapsulaViewer` con barras de progreso estilo IG, tap zones (izq=atrás, der=adelante, centro=pausa), swipe-down para cerrar, soporte teclado (← → Esc), botón "Ver en el mapa" para efeméride con lat/lng.
  - Modal `CreateCapsulaModal` con texto (≤320 char), época, año, lugar, imagen.
  - Ambos modales usan `ReactDOM.createPortal(document.body)` para escapar de los ancestors con `transform` (PullToRefresh).
  - Estilos en `/app/frontend/src/styles/capsulas.css` (dark + light pergamino, mobile responsive).

---

## Pendiente / Backlog Priorizado

### P0 — Cerrar lo que ya está armado backend pero falta UI/test
- 🔧 **Video + TTS UI** (backend ya listo, falta UI):
  - Frontend: input "📹 Adjuntar video" en `CreateChronicleModal`
  - Frontend: `<video controls>` en `SocialPost` (ya existe en SocialPost línea 164-174) / `RelatoDetail`
  - Frontend: botón "🔊 Escuchar narración" + selector de voz en `RelatoDetail`
  - Backend: **instalar `python-dotenv`** en el venv que llama `generate_tts.py` (error actual: `ModuleNotFoundError: No module named 'dotenv'`)
  - E2E test

### P1 — Próximas features
- 🔔 Sonido de notificación más resonante + vibración 3-pulsos (`navigator.vibrate([100,50,100])`)
- 🤖 Moderación IA de crónicas + comentarios (Claude/Gemini vía Emergent LLM key)
- 🚩 Sistema de reportes comunitario + panel `/admin/moderacion`

### P2 — Backlog futuro
- 📧 Newsletter semanal con Resend
- 💳 Stripe + Plan Premium (árboles genealógicos extendidos, más voces TTS, más cápsulas/día)
- 🛠 Refactor `server.js` (~2430 líneas) → seguir migrando a routes/ modulares (como ya se hizo con `capsulas.js`)
- 🎯 API uniformizada (POST /relatos devuelve `{mensaje, relato}` vs GET devuelve documento plano)

---

## Architecture
```
/app/
├── backend/
│   ├── data/
│   │   ├── efemerides.js          # 53 eventos enriquecidos con lat/lng
│   │   └── citas.js               # 30 citas históricas (rotación diaria)
│   ├── models/
│   │   ├── Publicacion.js         # + video_path, audio_path, historia_anio, historia_lugar
│   │   └── Capsula.js             # tipo, usuario_id, texto, epoca, lugar, lat/lng, anio, imagen, autor, visto_por[], expira_en (TTL)
│   ├── routes/
│   │   └── capsulas.js            # /api/capsulas (GET, POST, /:id/visto, DELETE)
│   ├── scripts/generate_tts.py    # OpenAI TTS vía emergentintegrations (FALTA python-dotenv)
│   └── server.js                  # Monolito Express (>2400 líneas)
└── frontend/src/
    ├── components/
    │   ├── CapsulasRail.js        # carrusel horizontal de círculos dorados
    │   ├── CapsulaViewer.js       # fullscreen viewer (createPortal)
    │   ├── CreateCapsulaModal.js  # modal de creación (createPortal)
    │   ├── SocialPost.js          # + .social-post-historic-tag
    │   ├── CreateChronicleModal.js # + inputs historia_anio + historia_lugar
    │   └── ...
    ├── pages/Feed.js              # CapsulasRail integrado debajo del saludo
    ├── styles/capsulas.css        # rail + viewer + tema light + mobile
    └── utils/historicTime.js      # yearToCentury, buildHistoricTag
```

---

## Decisiones de diseño clave
- Mobile cards: padding lateral consistente, no edge-to-edge. Border-radius 14px + border `gold-soft` + sombra.
- Tema light = pergamino (cream/sepia/gold-deep). Switch automático según hora.
- Cápsulas: orden en el rail → 1) Tu cápsula (crear), 2) efemérides, 3) citas, 4) cronistas no vistas, 5) cronistas vistas. TTL 24h. Auto-creación idempotente del sistema (idempotente por marker [tipo-YYYY-MM-DD] que se limpia al devolver).
- Indicador histórico es opcional pero refuerza identidad temporal vs Twitter/Facebook genéricos.
- Toda interacción mobile activa `haptic.light()` o `haptic.medium()`.
- PWA: zoom completamente deshabilitado.
- **Patrón modals**: SIEMPRE usar `ReactDOM.createPortal(document.body)` para modals fullscreen porque `PullToRefresh` usa `transform` y rompe `position: fixed`.

---

## Endpoints API (resumen)
```
POST   /api/auth/login            body: { correo, password }  → cookie chronos_token httpOnly
POST   /api/auth/registro
POST   /api/auth/logout

GET    /api/relatos               ?vista=todos|siguiendo
POST   /api/relatos               multipart: titulo, categoria, contenido, imagen?, video?, historia_anio?, historia_lugar?
GET    /api/relatos/:id
PUT    /api/relatos/:id
DELETE /api/relatos/:id
POST   /api/relatos/:id/narrar    TTS — backend listo pero falta python-dotenv

GET    /api/capsulas              auto-genera efeméride + cita del día (idempotente)
POST   /api/capsulas              multipart: texto, epoca?, lugar?, anio?, imagen?
POST   /api/capsulas/:id/visto
DELETE /api/capsulas/:id

POST   /api/ecos/:publicacionId
POST   /api/comentarios
POST   /api/archivados/:publicacionId
POST   /api/presencia/heartbeat
GET    /api/presencia/activos
GET    /api/efemerides/mapa
... (auth, perfil, familiares, misivas, avisos)
```
