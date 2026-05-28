"""
Backend tests iteration_20 (Chronos):
  - GET /api/capsulas/archivo/:usuarioId  ("Mi Pasado en Cápsulas")
    * Cápsulas tipo='cronista' del usuario con expira_en <= now
    * Populado con usuario_id (nombre, usuario, avatar)
    * Ordenadas por creado_en desc, limit 120
    * Devuelve [] si no hay archivo
  - GET /api/capsulas sigue filtrando solo cápsulas activas (expira_en > now)
  - POST /api/relatos/:id/narrar (TTS vía python emergentintegrations)
    * Voces válidas: onyx|echo|fable|sage|shimmer|nova|alloy
    * 1ª llamada: cached=false, audio_path retornado
    * 2ª llamada misma voz: cached=true, mismo audio_path
  - POST /api/relatos acepta video (50MB max) y devuelve video_path
"""
import os
import time
import datetime as dt
import pytest
import requests
from bson import ObjectId
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/chronos')

EMAIL = 'vizcarrapulidoeddy@gmail.com'
PASSWORD = 'chronos2026'


@pytest.fixture(scope='module')
def mongo_db():
    client = MongoClient(MONGO_URL)
    # DB name extracted from MONGO_URL path
    db_name = MONGO_URL.rsplit('/', 1)[-1].split('?')[0] or 'chronos'
    return client[db_name]


@pytest.fixture(scope='module')
def auth_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={'correo': EMAIL, 'password': PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    assert 'chronos_token' in s.cookies
    return s


@pytest.fixture(scope='module')
def me_id(auth_session):
    r = auth_session.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200, r.text
    uid = r.json().get('_id') or r.json().get('id')
    assert uid
    return uid


# -------- GET /api/capsulas/archivo/:usuarioId --------
class TestArchivoCapsulas:
    """Cápsulas vencidas se preservan como archivo permanente del cronista."""

    def test_archivo_invalid_id_returns_400(self, auth_session):
        r = auth_session.get(f"{API}/capsulas/archivo/not-a-valid-id", timeout=15)
        assert r.status_code == 400, r.text

    def test_archivo_returns_list_for_valid_user(self, auth_session, me_id):
        r = auth_session.get(f"{API}/capsulas/archivo/{me_id}", timeout=15)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_archivo_returns_empty_for_unknown_user(self, auth_session):
        fake_id = '0' * 24
        r = auth_session.get(f"{API}/capsulas/archivo/{fake_id}", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json() == []

    def test_expired_cronista_capsule_appears_in_archivo(self, auth_session, me_id, mongo_db):
        """Crear cápsula, forzar expira_en al pasado, verificar archivo y ausencia en /capsulas."""
        # Create
        payload = {
            'texto': 'TEST_iter20 cápsula archivada',
            'anio': '1789',
            'lugar': 'París',
            'epoca': 'Revolución',
        }
        r = auth_session.post(f"{API}/capsulas", data=payload, timeout=15)
        assert r.status_code == 201, r.text
        cap = r.json()
        cid = cap['_id']

        try:
            # Force expira_en to past via mongo
            past = dt.datetime.utcnow() - dt.timedelta(hours=1)
            res = mongo_db.capsulas.update_one(
                {'_id': ObjectId(cid)},
                {'$set': {'expira_en': past}}
            )
            assert res.modified_count == 1, "could not update capsula in mongo"

            # 1. Should NOT appear in /api/capsulas (active list)
            lst = requests.get(f"{API}/capsulas", timeout=15).json()
            active_ids = [c['_id'] for c in lst]
            assert cid not in active_ids, "expired capsule leaked into active list"

            # 2. Should appear in /api/capsulas/archivo/:usuarioId
            arch = auth_session.get(f"{API}/capsulas/archivo/{me_id}", timeout=15).json()
            ids = [c['_id'] for c in arch]
            assert cid in ids, f"expired capsule {cid} not in archivo. n={len(arch)}"

            # Validate shape: populated usuario_id, ordered, archivada flag
            mine = next(c for c in arch if c['_id'] == cid)
            assert mine.get('tipo') == 'cronista'
            assert mine.get('texto') == 'TEST_iter20 cápsula archivada'
            assert mine.get('anio') == 1789
            assert mine.get('lugar') == 'París'
            assert mine.get('archivada') is True
            usuario = mine.get('usuario_id')
            assert isinstance(usuario, dict), f"usuario_id not populated: {usuario}"
            assert 'nombre' in usuario or 'usuario' in usuario

            # 3. Limit 120 max
            assert len(arch) <= 120
        finally:
            # Cleanup
            mongo_db.capsulas.delete_one({'_id': ObjectId(cid)})


# -------- POST /api/relatos with video field --------
class TestRelatoConVideo:
    relato_id = None

    def test_create_relato_without_video_still_ok(self, auth_session):
        """Compatibilidad: crear relato sin video sigue funcionando."""
        payload = {
            'titulo': 'TEST_iter20 relato narración',
            'contenido': 'Este es un relato de prueba para la narración TTS. ' * 4,
            'categoria': 'Antigüedad',
        }
        r = auth_session.post(f"{API}/relatos", data=payload, timeout=20)
        assert r.status_code in (200, 201), r.text
        rel = r.json().get('relato', r.json())
        assert rel.get('video_path') in (None, ''), f"video_path inesperado: {rel.get('video_path')}"
        TestRelatoConVideo.relato_id = rel['_id']

    def test_create_relato_with_video_returns_video_path(self, auth_session):
        # Pequeño "video" sintético (header MP4 minimal) — solo para validar el path no la decodificación
        fake_mp4 = (
            b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom'
            + b'\x00' * 1024
        )
        files = {
            'video': ('test.mp4', fake_mp4, 'video/mp4'),
        }
        data = {
            'titulo': 'TEST_iter20 relato con video',
            'contenido': 'Relato con video adjunto para verificar persistencia de video_path.',
            'categoria': 'Edad Moderna',
        }
        r = auth_session.post(f"{API}/relatos", data=data, files=files, timeout=30)
        assert r.status_code in (200, 201), f"create with video failed: {r.status_code} {r.text}"
        rel = r.json().get('relato', r.json())
        vp = rel.get('video_path')
        assert vp and vp.startswith('/api/uploads/videos/'), f"video_path no válido: {vp}"
        # Cleanup
        auth_session.delete(f"{API}/relatos/{rel['_id']}", timeout=15)


# -------- POST /api/relatos/:id/narrar --------
class TestNarrarTTS:
    audio_path_first = None

    def test_narrar_genera_audio_y_segunda_llamada_cached(self, auth_session):
        rid = TestRelatoConVideo.relato_id
        assert rid, "depends on TestRelatoConVideo.test_create_relato_without_video_still_ok"

        # 1st call: should generate (cached=false). TTS puede tardar varios segundos.
        r1 = auth_session.post(
            f"{API}/relatos/{rid}/narrar",
            json={'voz': 'onyx'},
            timeout=120
        )
        assert r1.status_code == 200, f"narrar #1 falló: {r1.status_code} {r1.text}"
        b1 = r1.json()
        assert b1.get('voz') == 'onyx'
        assert b1.get('cached') is False
        ap1 = b1.get('audio_path')
        assert ap1 and ap1.startswith('/api/uploads/audio/'), f"audio_path inválido: {ap1}"
        TestNarrarTTS.audio_path_first = ap1

        # Verify the audio file is reachable
        head = requests.head(f"{BASE_URL}{ap1}", timeout=15, allow_redirects=True)
        assert head.status_code == 200, f"audio not served: {head.status_code}"

        # 2nd call same voice: should be cached=true and same path
        r2 = auth_session.post(
            f"{API}/relatos/{rid}/narrar",
            json={'voz': 'onyx'},
            timeout=60
        )
        assert r2.status_code == 200, r2.text
        b2 = r2.json()
        assert b2.get('cached') is True, f"second call should be cached. body={b2}"
        assert b2.get('audio_path') == ap1, "cached audio_path should match"
        assert b2.get('voz') == 'onyx'

    def test_narrar_invalid_voice_falls_back_to_onyx(self, auth_session):
        """Voz inválida cae a default 'onyx' (cached)."""
        rid = TestRelatoConVideo.relato_id
        assert rid
        r = auth_session.post(
            f"{API}/relatos/{rid}/narrar",
            json={'voz': 'invalid_voice_xx'},
            timeout=60
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get('voz') == 'onyx'

    def test_narrar_bad_id_returns_400(self, auth_session):
        r = auth_session.post(f"{API}/relatos/not-an-id/narrar", json={'voz': 'onyx'}, timeout=10)
        assert r.status_code == 400, r.text

    def test_narrar_404_for_missing_relato(self, auth_session):
        r = auth_session.post(f"{API}/relatos/{'0'*24}/narrar", json={'voz': 'onyx'}, timeout=10)
        assert r.status_code == 404, r.text

    def test_narrar_requires_auth(self):
        r = requests.post(f"{API}/relatos/{'0'*24}/narrar", json={'voz': 'onyx'}, timeout=10)
        assert r.status_code in (401, 403), r.text

    def test_cleanup_relato(self, auth_session):
        rid = TestRelatoConVideo.relato_id
        if rid:
            auth_session.delete(f"{API}/relatos/{rid}", timeout=15)
