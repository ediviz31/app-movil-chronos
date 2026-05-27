"""
Tests para lectura pública de relatos y comentarios (Chronos).
- GET /api/relatos/:id sin cookie → 200 con campos públicos + es_publico=true
- GET /api/relatos/:id con cookie → es_publico=false + estado personal
- GET /api/comentarios/:id sin cookie → 200
- ID malformado → 400; ID inexistente → 404
- POST /api/ecos, /api/comentarios, /api/archivados sin cookie → 401 (gating intacto)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')
RELATO_ID = '6a162ecd24dbda262c859563'  # César y el Rubicón
CORREO = 'keilin@chronos.com'
PASSWORD = 'chronos123'


@pytest.fixture(scope='module')
def auth_session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    r = s.post(f'{BASE_URL}/api/auth/login', json={'correo': CORREO, 'password': PASSWORD}, timeout=15)
    assert r.status_code == 200, f'Login falló: {r.status_code} {r.text}'
    return s


@pytest.fixture(scope='module')
def anon_session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


# ---------------- LECTURA PÚBLICA ----------------

class TestPublicRelatoRead:
    def test_get_relato_sin_cookie_devuelve_200(self, anon_session):
        r = anon_session.get(f'{BASE_URL}/api/relatos/{RELATO_ID}', timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        # Campos requeridos según spec
        for field in ('titulo', 'contenido', 'usuario_id', 'total_ecos',
                      'total_comentarios', 'total_archivos',
                      'usuario_dio_eco', 'usuario_archivado', 'es_publico'):
            assert field in data, f'Falta campo {field}'
        assert data['es_publico'] is True
        assert data['usuario_dio_eco'] is False
        assert data['usuario_archivado'] is False
        assert isinstance(data['total_ecos'], int)
        assert isinstance(data['total_comentarios'], int)
        # contenido no vacío
        assert data['titulo'] and data['contenido']

    def test_get_relato_con_cookie_es_publico_false(self, auth_session):
        r = auth_session.get(f'{BASE_URL}/api/relatos/{RELATO_ID}', timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data['es_publico'] is False
        assert 'usuario_dio_eco' in data
        assert 'usuario_archivado' in data
        assert isinstance(data['usuario_dio_eco'], bool)

    def test_get_relato_id_malformado_400(self, anon_session):
        r = anon_session.get(f'{BASE_URL}/api/relatos/not-a-valid-id', timeout=15)
        assert r.status_code == 400, r.text

    def test_get_relato_id_inexistente_404(self, anon_session):
        # ObjectId válido pero no en DB
        r = anon_session.get(f'{BASE_URL}/api/relatos/6a162ecd24dbda262c859999', timeout=15)
        assert r.status_code == 404, r.text


class TestPublicComentariosRead:
    def test_get_comentarios_sin_cookie_devuelve_200(self, anon_session):
        r = anon_session.get(f'{BASE_URL}/api/comentarios/{RELATO_ID}', timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)


# ---------------- GATING DE ESCRITURA INTACTO ----------------

class TestWriteEndpointsRequireAuth:
    def test_post_eco_sin_cookie_401(self, anon_session):
        r = anon_session.post(f'{BASE_URL}/api/ecos/{RELATO_ID}', timeout=15)
        assert r.status_code == 401, f'Esperado 401, recibido {r.status_code}: {r.text}'

    def test_post_archivado_sin_cookie_401(self, anon_session):
        r = anon_session.post(f'{BASE_URL}/api/archivados/{RELATO_ID}', timeout=15)
        assert r.status_code == 401, f'Esperado 401, recibido {r.status_code}: {r.text}'

    def test_post_comentario_sin_cookie_401(self, anon_session):
        r = anon_session.post(
            f'{BASE_URL}/api/comentarios',
            json={'publicacion_id': RELATO_ID, 'contenido': 'test anon'},
            timeout=15,
        )
        assert r.status_code == 401, f'Esperado 401, recibido {r.status_code}: {r.text}'


# ---------------- OG REDIRECT ----------------

class TestOGRedirect:
    def test_og_relato_sigue_funcionando(self, anon_session):
        r = anon_session.get(f'{BASE_URL}/api/og/relato/{RELATO_ID}', timeout=15, allow_redirects=False)
        # Debe responder 200 con meta refresh (HTML) o 30x redirect
        assert r.status_code in (200, 301, 302, 303, 307, 308), f'OG status: {r.status_code}'


# ---------------- REGRESIÓN: gating original ----------------

class TestAuthenticatedWriteStillWorks:
    def test_post_eco_con_cookie_funciona(self, auth_session):
        # Idempotent: toggle two times to restore state
        r1 = auth_session.post(f'{BASE_URL}/api/ecos/{RELATO_ID}', timeout=15)
        assert r1.status_code in (200, 201), r1.text
        r2 = auth_session.post(f'{BASE_URL}/api/ecos/{RELATO_ID}', timeout=15)
        assert r2.status_code in (200, 201), r2.text
