"""
Tests para el endpoint de visitas (lecturas) de relatos.
- POST /api/relatos/:id/visita
- GET /api/relatos/:id (devuelve campo `visitas`)
Anti-flooding: 30 min por (userId|ip):relatoId
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://historia-connect.preview.emergentagent.com").rstrip("/")
RELATO_ID = "6a162ecd24dbda262c859563"  # César y el Rubicón (autor: legado)
AUTOR_CORREO = "legado@chronos.com"
OTRO_CORREO = "keilin@chronos.com"  # no es autor
PASSWORD = "chronos123"


def _login(correo, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"correo": correo, "password": password},
               timeout=15)
    assert r.status_code == 200, f"login failed for {correo}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def autor_session():
    return _login(AUTOR_CORREO, PASSWORD)


@pytest.fixture(scope="module")
def otro_session():
    return _login(OTRO_CORREO, PASSWORD)


def _fake_ip():
    # IP simulada para que cada test anon sea único en el cache
    return f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"


# --- GET /api/relatos/:id incluye visitas ---
def test_get_relato_incluye_campo_visitas():
    r = requests.get(f"{BASE_URL}/api/relatos/{RELATO_ID}", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "visitas" in data, f"GET relato no devolvió campo 'visitas': keys={list(data.keys())}"
    assert isinstance(data["visitas"], int)


# --- POST /api/relatos/:id/visita: anon primera vez contado=true ---
def test_visita_anon_primera_vez_contado_true():
    ip = _fake_ip()
    before = requests.get(f"{BASE_URL}/api/relatos/{RELATO_ID}", timeout=15).json()["visitas"]
    r = requests.post(f"{BASE_URL}/api/relatos/{RELATO_ID}/visita",
                      headers={"x-forwarded-for": ip}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["contado"] is True, f"esperado contado=true, got {data}"
    assert data["visitas"] == before + 1, f"esperado {before+1}, got {data['visitas']}"


# --- POST: misma IP repite inmediatamente → contado=false razon=reciente ---
def test_visita_anon_misma_ip_repite_no_cuenta():
    ip = _fake_ip()
    r1 = requests.post(f"{BASE_URL}/api/relatos/{RELATO_ID}/visita",
                       headers={"x-forwarded-for": ip}, timeout=15)
    assert r1.status_code == 200
    assert r1.json()["contado"] is True

    r2 = requests.post(f"{BASE_URL}/api/relatos/{RELATO_ID}/visita",
                       headers={"x-forwarded-for": ip}, timeout=15)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["contado"] is False
    assert d2.get("razon") == "reciente", f"esperaba razon=reciente, got {d2}"
    assert d2["visitas"] == r1.json()["visitas"], "el contador no debe subir en repetición"


# --- POST: autor logueado NO cuenta ---
def test_visita_autor_no_cuenta(autor_session):
    before = requests.get(f"{BASE_URL}/api/relatos/{RELATO_ID}", timeout=15).json()["visitas"]
    r = autor_session.post(f"{BASE_URL}/api/relatos/{RELATO_ID}/visita",
                           headers={"x-forwarded-for": _fake_ip()}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["contado"] is False
    assert d.get("razon") == "autor"
    after = requests.get(f"{BASE_URL}/api/relatos/{RELATO_ID}", timeout=15).json()["visitas"]
    assert after == before, f"contador no debe cambiar para autor: before={before} after={after}"


# --- POST: usuario logueado distinto al autor cuenta como visita propia ---
def test_visita_usuario_no_autor_cuenta(otro_session):
    # primer login del otro usuario en este test: dado que el cache key es userId,
    # debería contar (al menos la primera vez por TTL en este run). Si en runs
    # previos ya contó, el segundo intento devolverá contado=false con razon=reciente.
    r = otro_session.post(f"{BASE_URL}/api/relatos/{RELATO_ID}/visita",
                          headers={"x-forwarded-for": _fake_ip()}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "visitas" in d
    # acepta cualquiera de los dos estados; lo importante: no es 'autor'
    assert d.get("razon") != "autor", f"otro usuario no debe ser tratado como autor: {d}"


# --- POST: dos sesiones distintas suman 1 cada una ---
def test_dos_sesiones_distintas_suman_cada_una(otro_session):
    # sesión 1: anon con ip A
    ip_a = _fake_ip()
    before = requests.get(f"{BASE_URL}/api/relatos/{RELATO_ID}", timeout=15).json()["visitas"]
    r_a = requests.post(f"{BASE_URL}/api/relatos/{RELATO_ID}/visita",
                        headers={"x-forwarded-for": ip_a}, timeout=15)
    assert r_a.status_code == 200
    assert r_a.json()["contado"] is True

    # sesión 2: anon con ip B (otro id)
    ip_b = _fake_ip()
    r_b = requests.post(f"{BASE_URL}/api/relatos/{RELATO_ID}/visita",
                        headers={"x-forwarded-for": ip_b}, timeout=15)
    assert r_b.status_code == 200
    assert r_b.json()["contado"] is True

    after = requests.get(f"{BASE_URL}/api/relatos/{RELATO_ID}", timeout=15).json()["visitas"]
    assert after >= before + 2, f"esperaba al menos +2, before={before} after={after}"


# --- POST: ID inválido → 400 ---
def test_visita_id_invalido_400():
    r = requests.post(f"{BASE_URL}/api/relatos/no-es-un-objectid/visita",
                      headers={"x-forwarded-for": _fake_ip()}, timeout=15)
    assert r.status_code == 400, f"esperado 400, got {r.status_code}: {r.text}"


# --- POST: ID inexistente (formato válido) → 404 ---
def test_visita_id_inexistente_404():
    # ObjectId válido pero inexistente
    fake_id = "abcdef0123456789abcdef01"
    r = requests.post(f"{BASE_URL}/api/relatos/{fake_id}/visita",
                      headers={"x-forwarded-for": _fake_ip()}, timeout=15)
    assert r.status_code == 404, f"esperado 404, got {r.status_code}: {r.text}"
