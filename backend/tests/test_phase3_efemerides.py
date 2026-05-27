"""Phase 3: Efemérides calendar endpoints tests."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')


# ---- /api/efemerides/hoy ----
def test_efemerides_hoy_requires_auth():
    r = requests.get(f"{BASE_URL}/api/efemerides/hoy")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


def test_efemerides_hoy_authed(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/hoy")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "es_hoy" in data
    assert "eventos" in data
    assert isinstance(data["eventos"], list)
    assert "dia" in data and "mes" in data
    assert isinstance(data["dia"], int) and isinstance(data["mes"], int)
    # If not today, must include distancia_dias
    if data["es_hoy"] is False:
        assert "distancia_dias" in data
        assert isinstance(data["distancia_dias"], int)
    # eventos elements have anio + evento + epoca (only if eventos non-empty)
    if data["eventos"]:
        ev = data["eventos"][0]
        assert "anio" in ev and "evento" in ev and "epoca" in ev


# ---- /api/efemerides/fecha/:fecha ----
def test_efemerides_fecha_julio_cesar(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/fecha/03-15")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["fecha"] == "03-15"
    assert data["mes"] == 3 and data["dia"] == 15
    assert len(data["eventos"]) >= 1
    cesar = data["eventos"][0]
    assert cesar["anio"] == -44
    assert cesar["epoca"] == "Roma imperial"
    assert "César" in cesar["evento"] or "Julio César" in cesar["evento"]


def test_efemerides_fecha_colon(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/fecha/10-12")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["fecha"] == "10-12"
    assert len(data["eventos"]) >= 1
    colon = data["eventos"][0]
    assert colon["anio"] == 1492
    assert colon["epoca"] == "Edad Moderna"
    assert "Colón" in colon["evento"]


def test_efemerides_fecha_empty_day(auth_session):
    # Pick a date guaranteed not in dataset: 01-02
    r = auth_session.get(f"{BASE_URL}/api/efemerides/fecha/01-02")
    assert r.status_code == 200
    data = r.json()
    assert data["eventos"] == []


def test_efemerides_fecha_invalid_format_returns_400(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/fecha/INVALID")
    assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"


def test_efemerides_fecha_invalid_format_3digits(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/fecha/3-15")
    assert r.status_code == 400


def test_efemerides_fecha_requires_auth():
    r = requests.get(f"{BASE_URL}/api/efemerides/fecha/03-15")
    assert r.status_code == 401


# ---- /api/efemerides/calendario/:year/:month ----
def test_efemerides_calendario_marzo_2026(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/calendario/2026/3")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["year"] == 2026
    assert data["month"] == 3
    assert "dias" in data
    assert len(data["dias"]) == 31
    # day 15 must have event (Julio César)
    d15 = next((d for d in data["dias"] if d["dia"] == 15), None)
    assert d15 is not None
    assert d15["fecha"] == "03-15"
    assert len(d15["eventos"]) >= 1
    assert d15["eventos"][0]["anio"] == -44
    # day 2 must be empty
    d2 = next((d for d in data["dias"] if d["dia"] == 2), None)
    assert d2 is not None
    assert d2["eventos"] == []


def test_efemerides_calendario_invalid_month(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/calendario/2026/13")
    assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"


def test_efemerides_calendario_zero_month(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/efemerides/calendario/2026/0")
    assert r.status_code == 400


def test_efemerides_calendario_february_2024_leap(auth_session):
    # 2024 is leap; Feb should have 29 days
    r = auth_session.get(f"{BASE_URL}/api/efemerides/calendario/2024/2")
    assert r.status_code == 200
    data = r.json()
    assert len(data["dias"]) == 29


def test_efemerides_calendario_requires_auth():
    r = requests.get(f"{BASE_URL}/api/efemerides/calendario/2026/3")
    assert r.status_code == 401
