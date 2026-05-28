"""
Iteration 22 — Backend tests for Visitas Virtuales 360°
- GET /api/visitas (catálogo + filtro por época)
- GET /api/visitas/sugerir (matching por nombre, alias, coords, fallback)
- GET /api/visitas/:slug (ficha + 404)
- Regresión: capsulas / relatos / presencia/activos
"""
import os
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://historia-connect.preview.emergentagent.com").rstrip("/")
EMAIL = "vizcarrapulidoeddy@gmail.com"
PASSWORD = "chronos2026"


# ---------------- Catálogo ----------------
class TestVisitasCatalogo:
    def test_get_visitas_total_30(self):
        r = requests.get(f"{BASE_URL}/api/visitas", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 30, f"esperaba total=30, got {data['total']}"
        assert isinstance(data["items"], list)
        assert len(data["items"]) == 30

    def test_get_visitas_estructura_item(self):
        r = requests.get(f"{BASE_URL}/api/visitas", timeout=15)
        item = r.json()["items"][0]
        for field in ["slug", "lugar", "aliases", "epoca", "anio_aprox",
                      "lat", "lng", "descripcion", "thumbnail", "url", "fuente"]:
            assert field in item, f"falta campo {field} en item: {item.keys()}"
        assert isinstance(item["aliases"], list)
        assert isinstance(item["lat"], (int, float))
        assert isinstance(item["lng"], (int, float))

    def test_get_visitas_filtro_roma_imperial(self):
        r = requests.get(f"{BASE_URL}/api/visitas",
                         params={"epoca": "Roma imperial"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        for v in data["items"]:
            assert v["epoca"] == "Roma imperial", \
                f"filtro roto: epoca={v['epoca']} en {v['slug']}"
        slugs = {v["slug"] for v in data["items"]}
        # coliseo-romano y foro-romano deben estar
        assert "coliseo-romano" in slugs
        assert "foro-romano" in slugs

    def test_get_visitas_filtro_inexistente_vacio(self):
        r = requests.get(f"{BASE_URL}/api/visitas",
                         params={"epoca": "Marte Imperial"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["total"] == 0
        assert r.json()["items"] == []


# ---------------- Sugerir ----------------
class TestVisitasSugerir:
    def test_sugerir_alias_constantinopla(self):
        r = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                         params={"lugar": "Constantinopla"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["disponible"] is True
        assert data["visita"]["slug"] == "hagia-sofia"

    def test_sugerir_alias_estambul(self):
        r = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                         params={"lugar": "Estambul"}, timeout=15)
        data = r.json()
        assert data["disponible"] is True
        assert data["visita"]["slug"] == "hagia-sofia"

    def test_sugerir_coliseo_exacto(self):
        r = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                         params={"lugar": "Coliseo Romano"}, timeout=15)
        data = r.json()
        assert data["disponible"] is True
        assert data["visita"]["slug"] == "coliseo-romano"

    def test_sugerir_geografico_roma(self):
        # Sin nombre, solo coords cercanas al Coliseo
        r = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                         params={"lat": 41.89, "lng": 12.49}, timeout=15)
        data = r.json()
        assert data["disponible"] is True
        # acepta coliseo o foro-romano (ambos <60km de Roma); el más cercano
        # geográficamente es coliseo
        assert data["visita"]["slug"] in ("coliseo-romano", "foro-romano")

    def test_sugerir_geografico_hagia_sofia(self):
        r = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                         params={"lat": 41.0086, "lng": 28.9802}, timeout=15)
        data = r.json()
        assert data["disponible"] is True
        assert data["visita"]["slug"] == "hagia-sofia"

    def test_sugerir_no_disponible(self):
        r = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                         params={"lugar": "Lugar Inexistente",
                                 "lat": 0, "lng": 0}, timeout=15)
        data = r.json()
        assert data["disponible"] is False

    def test_sugerir_case_insensitive_y_tildes(self):
        # PERSEPOLIS mayúsculas
        r1 = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                          params={"lugar": "PERSEPOLIS"}, timeout=15)
        assert r1.json()["disponible"] is True
        assert r1.json()["visita"]["slug"] == "persepolis"

        # persépolis con tilde
        r2 = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                          params={"lugar": "persépolis"}, timeout=15)
        assert r2.json()["disponible"] is True
        assert r2.json()["visita"]["slug"] == "persepolis"

        # persepolis lowercase
        r3 = requests.get(f"{BASE_URL}/api/visitas/sugerir",
                          params={"lugar": "persepolis"}, timeout=15)
        assert r3.json()["disponible"] is True
        assert r3.json()["visita"]["slug"] == "persepolis"


# ---------------- Ficha individual ----------------
class TestVisitaFicha:
    def test_get_slug_existe(self):
        r = requests.get(f"{BASE_URL}/api/visitas/coliseo-romano", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == "coliseo-romano"
        assert data["lugar"] == "Coliseo Romano"
        assert data["url"].startswith("https://")

    def test_get_slug_404(self):
        r = requests.get(f"{BASE_URL}/api/visitas/no-existe", timeout=15)
        assert r.status_code == 404


# ---------------- Regresión ----------------
class TestRegresion:
    def test_capsulas_ok(self):
        r = requests.get(f"{BASE_URL}/api/capsulas", timeout=15)
        assert r.status_code == 200

    def test_relatos_ok(self):
        # /api/relatos requires auth, use session
        s = requests.Session()
        login = s.post(f"{BASE_URL}/api/auth/login",
                       json={"correo": EMAIL, "password": PASSWORD}, timeout=15)
        if login.status_code != 200:
            pytest.skip(f"login failed {login.status_code}")
        r = s.get(f"{BASE_URL}/api/relatos", timeout=15)
        assert r.status_code == 200

    def test_presencia_activos_requiere_auth(self):
        # sin token debe ser 401
        r = requests.get(f"{BASE_URL}/api/presencia/activos", timeout=15)
        assert r.status_code in (401, 403), \
            f"esperaba 401/403 sin token, got {r.status_code}"

    def test_presencia_activos_con_auth(self):
        s = requests.Session()
        login = s.post(f"{BASE_URL}/api/auth/login",
                       json={"correo": EMAIL, "password": PASSWORD}, timeout=15)
        if login.status_code != 200:
            pytest.skip(f"login failed {login.status_code}")
        r = s.get(f"{BASE_URL}/api/presencia/activos", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "activos" in data or "total" in data or isinstance(data, list)
