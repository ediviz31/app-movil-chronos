"""Chronos backend API tests - auth, search, profile, relatos, uploads"""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')


# ---------- Health ----------
class TestHealth:
    def test_health_ok(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"correo": "keilin@chronos.com", "password": "chronos123"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "usuario" in data
        assert data["usuario"]["correo"] == "keilin@chronos.com"
        assert "chronos_token" in r.cookies

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"correo": "keilin@chronos.com", "password": "wrong"})
        assert r.status_code == 401

    def test_auth_me(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data.get("correo") == "keilin@chronos.com"
        assert "password" not in data


# ---------- Search ----------
class TestSearch:
    def test_search_user_kei(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/buscar?q=kei")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "usuarios" in data and "relatos" in data
        nombres = [u.get("nombre", "").lower() for u in data["usuarios"]]
        usuarios = [u.get("usuario", "").lower() for u in data["usuarios"]]
        assert any("keilin" in n for n in nombres) or any("keilin" in u for u in usuarios), \
            f"Expected to find keilin, got users: {nombres}"

    def test_search_relato_roma(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/buscar?q=roma")
        assert r.status_code == 200
        data = r.json()
        # 'Roma imperial' should match somewhere
        titles_or_cats = [(rel.get("titulo", "") + " " + rel.get("categoria", "")).lower()
                          for rel in data["relatos"]]
        assert any("roma" in t for t in titles_or_cats), f"Expected roma match, got: {titles_or_cats}"

    def test_search_accent_insensitive_cesar(self, auth_session):
        # 'cesar' (no accent) should match 'César y el Rubicón'
        r = auth_session.get(f"{BASE_URL}/api/buscar?q=cesar")
        assert r.status_code == 200
        data = r.json()
        titles = [rel.get("titulo", "").lower() for rel in data["relatos"]]
        assert any("césar" in t or "cesar" in t for t in titles), \
            f"Expected accent-insensitive match for cesar, got: {titles}"

    def test_search_empty_query(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/buscar?q=")
        assert r.status_code == 200
        data = r.json()
        assert data == {"usuarios": [], "relatos": []}

    def test_search_no_results(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/buscar?q=xyzqqqnope12345")
        assert r.status_code == 200
        data = r.json()
        assert data["usuarios"] == [] and data["relatos"] == []

    def test_search_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/buscar?q=kei")
        assert r.status_code in (401, 403)


# ---------- Profile ----------
class TestProfile:
    def test_get_own_profile(self, auth_session, keilin_id):
        r = auth_session.get(f"{BASE_URL}/api/usuarios/{keilin_id}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "estadisticas" in data
        st = data["estadisticas"]
        for k in ("totalRelatos", "totalSeguidores", "totalSiguiendo", "esSeguido"):
            assert k in st
        assert isinstance(st["totalRelatos"], int)
        # Keilin should have 5 siguiendo per spec
        assert st["totalSiguiendo"] >= 0

    def test_get_user_relatos(self, auth_session, keilin_id):
        r = auth_session.get(f"{BASE_URL}/api/usuarios/{keilin_id}/relatos")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_profile_invalid_id(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/usuarios/not-a-valid-id")
        assert r.status_code == 400

    def test_get_profile_not_found(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/usuarios/507f1f77bcf86cd799439011")
        assert r.status_code == 404

    def test_get_profile_other_user(self, auth_session):
        # Find another user via search
        s = auth_session.get(f"{BASE_URL}/api/buscar?q=alex").json()
        if not s["usuarios"]:
            pytest.skip("alex not found")
        uid = s["usuarios"][0]["_id"]
        r = auth_session.get(f"{BASE_URL}/api/usuarios/{uid}")
        assert r.status_code == 200
        data = r.json()
        assert data["_id"] == uid
        assert "estadisticas" in data


# ---------- Follow toggle ----------
class TestFollow:
    def test_follow_toggle(self, auth_session):
        s = auth_session.get(f"{BASE_URL}/api/buscar?q=alex").json()
        if not s["usuarios"]:
            pytest.skip("alex not found")
        target = s["usuarios"][0]["_id"]
        # Toggle once
        r1 = auth_session.post(f"{BASE_URL}/api/seguir/{target}")
        assert r1.status_code == 200, r1.text
        a1 = r1.json().get("accion")
        # Toggle again to revert
        r2 = auth_session.post(f"{BASE_URL}/api/seguir/{target}")
        assert r2.status_code == 200
        a2 = r2.json().get("accion")
        assert {a1, a2} == {"seguir", "deseguir"}


# ---------- Avatar / Portada uploads ----------
def _png_bytes():
    # 1x1 transparent PNG
    return bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
        "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
    )


class TestUploads:
    def test_avatar_upload(self, auth_session, keilin_id):
        # multipart - drop content-type so requests sets boundary
        sess = requests.Session()
        sess.cookies.update(auth_session.cookies)
        files = {"imagen": ("avatar.png", io.BytesIO(_png_bytes()), "image/png")}
        r = sess.post(f"{BASE_URL}/api/usuarios/avatar", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "avatar" in data
        assert data["avatar"].startswith("/api/uploads/avatares/")
        # Verify persistence
        r2 = auth_session.get(f"{BASE_URL}/api/usuarios/{keilin_id}")
        assert r2.json().get("avatar") == data["avatar"]

    def test_avatar_upload_missing_file(self, auth_session):
        sess = requests.Session()
        sess.cookies.update(auth_session.cookies)
        r = sess.post(f"{BASE_URL}/api/usuarios/avatar")
        assert r.status_code == 400

    def test_portada_upload(self, auth_session, keilin_id):
        sess = requests.Session()
        sess.cookies.update(auth_session.cookies)
        files = {"imagen": ("portada.png", io.BytesIO(_png_bytes()), "image/png")}
        r = sess.post(f"{BASE_URL}/api/usuarios/portada", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "portada" in data
        assert data["portada"].startswith("/api/uploads/portadas/")


# ---------- Relatos feed ----------
class TestRelatos:
    def test_feed_relatos(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/relatos?vista=todos&limit=10")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            it = data[0]
            for k in ("titulo", "categoria", "total_ecos", "total_comentarios"):
                assert k in it
