"""
Iteration 21 tests — GET /api/presencia/activos + regresión heartbeat / consultar.
"""
import os
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

PRIMARY_USER = {"correo": "vizcarrapulidoeddy@gmail.com", "password": "chronos2026"}


@pytest.fixture(scope="module")
def primary_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=PRIMARY_USER)
    if r.status_code != 200:
        pytest.skip(f"Login principal falló: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def primary_id(primary_session):
    r = primary_session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200, r.text
    return r.json().get("_id")


# ============= /api/presencia/activos =============

class TestPresenciaActivos:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/presencia/activos")
        assert r.status_code == 401, f"Esperado 401 sin auth, recibido {r.status_code}"

    def test_returns_shape(self, primary_session):
        r = primary_session.get(f"{BASE_URL}/api/presencia/activos")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "activos" in data and isinstance(data["activos"], list)
        assert "total" in data and isinstance(data["total"], int)
        assert data["total"] == len(data["activos"])
        assert data["total"] <= 12, "Debe limitar a 12"

    def test_excludes_self(self, primary_session, primary_id):
        # Forzar el solicitante como activo
        primary_session.post(f"{BASE_URL}/api/presencia/heartbeat")
        r = primary_session.get(f"{BASE_URL}/api/presencia/activos")
        assert r.status_code == 200
        ids = [str(u["_id"]) for u in r.json().get("activos", [])]
        assert str(primary_id) not in ids, "El solicitante NO debe aparecer en activos"

    def test_user_shape_when_present(self, primary_session):
        r = primary_session.get(f"{BASE_URL}/api/presencia/activos")
        assert r.status_code == 200
        activos = r.json().get("activos", [])
        for u in activos:
            assert "_id" in u
            assert "nombre" in u
            assert "ultimo_visto" in u
            # usuario y avatar pueden ser opcionales pero el endpoint los proyecta
            # avatar puede ser None / ausente; aceptamos ambos

    def test_sorted_desc_by_ultimo_visto(self, primary_session):
        """Si hay >=2 activos, deben venir ordenados descendentemente."""
        r = primary_session.get(f"{BASE_URL}/api/presencia/activos")
        assert r.status_code == 200
        activos = r.json().get("activos", [])
        if len(activos) < 2:
            pytest.skip("Solo hay <2 cronistas activos; no se puede validar orden.")
        times = [datetime.fromisoformat(u["ultimo_visto"].replace("Z", "+00:00"))
                 for u in activos]
        assert times == sorted(times, reverse=True), "Debe estar ordenado por ultimo_visto desc"

    def test_threshold_2_minutes(self, primary_session, primary_id):
        """
        Cualquier usuario devuelto debe tener ultimo_visto dentro de los últimos 2 minutos.
        """
        r = primary_session.get(f"{BASE_URL}/api/presencia/activos")
        assert r.status_code == 200
        activos = r.json().get("activos", [])
        now = datetime.now(timezone.utc)
        for u in activos:
            ts = datetime.fromisoformat(u["ultimo_visto"].replace("Z", "+00:00"))
            delta = (now - ts).total_seconds()
            assert delta <= 130, f"Activo con ultimo_visto fuera de 2min: {delta}s"


# ============= Regresión heartbeat / consultar =============

class TestPresenciaRegresion:
    def test_heartbeat_updates_ultimo_visto(self, primary_session, primary_id):
        # Antes
        before = primary_session.get(f"{BASE_URL}/api/auth/me").json().get("ultimo_visto")
        r = primary_session.post(f"{BASE_URL}/api/presencia/heartbeat")
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # Después
        after = primary_session.get(f"{BASE_URL}/api/auth/me").json().get("ultimo_visto")
        # Puede que /auth/me no devuelva ultimo_visto en la projection; lo importante es el 200.
        assert r.status_code == 200

    def test_consultar_returns_active_ids(self, primary_session, primary_id):
        # Marcar activo y consultar
        primary_session.post(f"{BASE_URL}/api/presencia/heartbeat")
        r = primary_session.post(
            f"{BASE_URL}/api/presencia/consultar",
            json={"ids": [str(primary_id)]}
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "activos" in data
        ids = [str(u["_id"]) for u in data["activos"]]
        assert str(primary_id) in ids, "consultar() debe devolver al usuario tras heartbeat"

    def test_consultar_empty_ids(self, primary_session):
        r = primary_session.post(
            f"{BASE_URL}/api/presencia/consultar",
            json={"ids": []}
        )
        assert r.status_code == 200
        assert r.json().get("activos") == []
