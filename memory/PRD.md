# Chronos — Red Social Histórica (PRD)

## Visión
PWA social/blog con estética histórica donde "cronistas" comparten relatos del pasado y de hoy. Auth con email, feed cronológico, dark + light pergamino, comments tipo TikTok ("Resonancias"), presencia en vivo, mapa de efemérides, reading mode, mensajería directa.

## Stack
- **Backend:** Node.js + Express + MongoDB (Mongoose) en `server.js` monolítico (~2400 líneas)
- **Frontend:** React (CRA), CSS custom themes (variables), Leaflet maps, PWA
- **Integraciones:** Emergent LLM Key (vía `emergentintegrations` Python) para imágenes (Nano Banana) y TTS (OpenAI)

## Cuenta de prueba
- Email: `vizcarrapulidoeddy@gmail.com`
- Password: `chronos2026`

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

### Fase 20 (esta sesión, 28-may-2026)
- ✅ **Rediseño de cards mobile**: quitado el patrón "edge-to-edge negativo" (`margin: 0 -14px`) en `.social-post`, `.feed-greeting` y `.social-composer`. Ahora son cards reales con:
  - `border-radius: 14px`
  - `border: 1px solid var(--gold-soft)`
  - `padding lateral consistente` desde el container `.main-area`
  - `box-shadow` sutil para profundidad
  - `margin-bottom: 14px` entre cards
- ✅ Compatibilidad con tema pergamino: el composer usa `var(--bg-card)` (sin `!important`) para que el tema light/dark lo controle correctamente.
- ✅ Verificado en mobile 393×852 en ambos temas.

## Pendiente / Backlog Priorizado

### P0 — Cerrar lo que ya está armado backend pero falta UI/test
- 🔧 **Video + TTS UI**: el endpoint y multer están listos pero falta:
  - Frontend: input "📹 Adjuntar video" en `CreateChronicleModal`
  - Frontend: `<video controls>` en `SocialPost` / `RelatoDetail`
  - Frontend: botón "🔊 Escuchar narración" + selector de voz en `RelatoDetail`
  - Backend: instalar `python-dotenv` en el venv que llama `generate_tts.py` (error actual: `ModuleNotFoundError: No module named 'dotenv'`)
  - E2E test con testing_agent_v3_fork

### P1 — Próximas features
- Sonido de notificación más resonante + vibración 3-pulsos (`navigator.vibrate([100,50,100])`)
- Stories "Cápsulas del Tiempo" estilo Instagram pero histórico (carrusel circular dorado + efeméride / cita / micro-crónica 24h)
- Moderación IA de crónicas + comentarios (Claude/Gemini vía Emergent LLM key)
- Sistema de reportes comunitario + panel `/admin/moderacion`

### P2 — Backlog futuro
- Newsletter semanal con Resend
- Stripe + Plan Premium (árboles genealógicos extendidos, más voces TTS, etc.)
- Refactor de `server.js` (2414 líneas) → routes/, models/, controllers/ modular

## Architecture
```
/app/
├── backend/
│   ├── data/efemerides.js          # 53 eventos enriquecidos con lat/lng
│   ├── models/                      # User, Publicacion (con video_path/audio_path), Eco, Comentario...
│   ├── scripts/generate_tts.py      # OpenAI TTS vía emergentintegrations
│   └── server.js                    # Monolito Express (>2400 líneas)
└── frontend/src/
    ├── components/                  # SocialPost, CommentsSheet, PresenceBadge, TopbarArchive, SearchBar
    ├── context/                     # AuthContext, ThemeContext, PresenceContext
    ├── pages/                       # Feed, RelatoDetail, MapaEfemerides, Profile
    ├── styles/                      # mobile-app.css ★, theme-light.css, social-refine.css, archive.css
    └── utils/                       # haptic, useScrollDirection
```

## Decisiones de diseño clave
- Mobile cards: **padding lateral consistente** (no edge-to-edge). Border-radius 14px + border `gold-soft` + sombra suave.
- Tema light = pergamino (cream/sepia/gold-deep). Switch automático según hora.
- Toda interacción importante en mobile activa `haptic.light()` o `haptic.medium()`.
- PWA: zoom completamente deshabilitado (gesturestart, touch-action, meta).
