"""Tests for the 'Compartir crónica por misiva' feature.

- GET /api/misivas/contactos-sugeridos (new endpoint)
- GET /api/relatos/:id  (used for composer pre-fill)
- GET /api/buscar?q=&tipo=usuarios (used by the share modal search)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    'REACT_APP_BACKEND_URL',
    'https://historia-connect.preview.emergentagent.com',
).rstrip('/')

KEILIN = {"correo": "keilin@chronos.com", "password": "chronos123"}
LEGADO = {"correo": "legado@chronos.com", "password": "chronos123"}
RELATO_ID = "6a162ecd24dbda262c859563"  # 'César y el Rubicón...'


def _login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    me = s.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200
    return s, me.json().get("_id")


@pytest.fixture(scope="module")
def keilin():
    return _login(KEILIN)


@pytest.fixture(scope="module")
def legado():
    return _login(LEGADO)


# ===== GET /api/misivas/contactos-sugeridos =====
class TestContactosSugeridos:
    def test_returns_200_array(self, keilin):
        s, _ = keilin
        r = s.get(f"{BASE_URL}/api/misivas/contactos-sugeridos")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)

    def test_items_have_required_fields(self, keilin):
        s, _ = keilin
        r = s.get(f"{BASE_URL}/api/misivas/contactos-sugeridos")
        data = r.json()
        assert len(data) > 0, "keilin sigue a varios usuarios - debería tener sugeridos"
        for item in data:
            assert "_id" in item
            assert "nombre" in item
            assert "usuario" in item
            # avatar/tema_favorito/bio son opcionales pero al menos las claves
            # esperadas deben coexistir o ser None

    def test_excludes_self(self, keilin):
        s, kid = keilin
        r = s.get(f"{BASE_URL}/api/misivas/contactos-sugeridos")
        ids = [str(u["_id"]) for u in r.json()]
        assert str(kid) not in ids, "El propio usuario no debe aparecer"

    def test_deduplicated(self, keilin):
        s, _ = keilin
        r = s.get(f"{BASE_URL}/api/misivas/contactos-sugeridos")
        ids = [str(u["_id"]) for u in r.json()]
        assert len(ids) == len(set(ids)), "Items deben estar deduplicados"

    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/misivas/contactos-sugeridos")
        assert r.status_code in (401, 403), r.text


# ===== GET /api/relatos/:id (composer pre-fill) =====
class TestRelatoFetch:
    def test_get_relato_by_id(self, keilin):
        s, _ = keilin
        r = s.get(f"{BASE_URL}/api/relatos/{RELATO_ID}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "_id" in data
        assert "titulo" in data
        # contenido + usuario_id usados para la plantilla
        assert "contenido" in data or "texto" in data or "cuerpo" in data
        assert "usuario_id" in data


# ===== GET /api/buscar?tipo=usuarios (búsqueda del modal) =====
class TestBuscarUsuarios:
    def test_search_returns_usuarios(self, keilin):
        s, _ = keilin
        r = s.get(f"{BASE_URL}/api/buscar?q=le&tipo=usuarios&limit=10")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "usuarios" in data
        assert isinstance(data["usuarios"], list)

    def test_search_min_chars_or_empty(self, keilin):
        s, _ = keilin
        # 1 char - aceptable que devuelva poco/nada, pero no 500
        r = s.get(f"{BASE_URL}/api/buscar?q=a&tipo=usuarios&limit=10")
        assert r.status_code in (200, 400), r.text
