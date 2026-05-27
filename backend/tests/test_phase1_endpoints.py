"""Phase 1 new endpoints: epocas, relato detail, comentarios with replies."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')


# ---------- Epocas ----------
class TestEpocas:
    def test_list_epocas(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/epocas")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list), f"Expected list got: {type(data)}"
        if data:
            item = data[0]
            assert "categoria" in item
            assert "total" in item
            assert isinstance(item["categoria"], str)
            assert isinstance(item["total"], int)
            assert item["total"] > 0

    def test_list_epocas_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/epocas")
        assert r.status_code in (401, 403)

    def test_relatos_by_epoca(self, auth_session):
        # Pick the first epoca and fetch its relatos
        r = auth_session.get(f"{BASE_URL}/api/epocas")
        epocas = r.json()
        if not epocas:
            pytest.skip("No epocas in DB")
        nombre = epocas[0]["categoria"]
        # URL-encoded automatically by requests
        r2 = auth_session.get(f"{BASE_URL}/api/epocas/{nombre}/relatos")
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "categoria" in data
        assert "total" in data
        assert "relatos" in data
        assert data["categoria"] == nombre
        assert isinstance(data["relatos"], list)
        assert data["total"] == len(data["relatos"])
        if data["relatos"]:
            rel = data["relatos"][0]
            assert rel.get("categoria") == nombre
            # stats populated
            for k in ("total_ecos", "total_comentarios", "total_archivos",
                     "usuario_dio_eco", "usuario_archivado"):
                assert k in rel, f"missing {k} in relato"

    def test_relatos_by_unknown_epoca(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/epocas/EpocaInexistenteXYZ/relatos")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 0
        assert data["relatos"] == []


# ---------- Relato detail ----------
class TestRelatoDetail:
    def test_invalid_objectid_returns_400(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/relatos/not-an-id")
        assert r.status_code == 400

    def test_not_found_returns_404(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/relatos/507f1f77bcf86cd799439011")
        assert r.status_code == 404

    def test_valid_relato_returns_full_data(self, auth_session):
        # Fetch feed to get a real relato id
        feed = auth_session.get(f"{BASE_URL}/api/relatos?vista=todos&limit=10").json()
        if not feed:
            pytest.skip("No relatos in feed")
        rid = feed[0]["_id"]
        r = auth_session.get(f"{BASE_URL}/api/relatos/{rid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["_id"] == rid
        assert "titulo" in data
        assert "categoria" in data
        assert "contenido" in data
        assert "usuario_id" in data
        # usuario_id should be populated (object), not just string
        assert isinstance(data["usuario_id"], dict), \
            f"Expected populated usuario_id object, got: {type(data['usuario_id'])}"
        assert "nombre" in data["usuario_id"]
        assert "usuario" in data["usuario_id"]
        # Stats
        for k in ("total_ecos", "total_comentarios", "total_archivos",
                  "usuario_dio_eco", "usuario_archivado"):
            assert k in data
        assert isinstance(data["total_ecos"], int)
        assert isinstance(data["usuario_dio_eco"], bool)


# ---------- Comentarios with replies ----------
class TestComentarios:
    def test_get_comentarios_empty_or_array(self, auth_session):
        feed = auth_session.get(f"{BASE_URL}/api/relatos?vista=todos&limit=5").json()
        if not feed:
            pytest.skip("No relatos")
        rid = feed[0]["_id"]
        r = auth_session.get(f"{BASE_URL}/api/comentarios/{rid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # Each parent comment should have 'respuestas' array
        for c in data:
            assert "respuestas" in c
            assert isinstance(c["respuestas"], list)
            assert c.get("parent_id") in (None, "null") or c.get("parent_id") is None

    def test_create_comment_and_reply_chain(self, auth_session):
        feed = auth_session.get(f"{BASE_URL}/api/relatos?vista=todos&limit=5").json()
        if not feed:
            pytest.skip("No relatos")
        rid = feed[0]["_id"]

        # 1. Create parent comment
        payload = {"publicacion_id": rid, "contenido": "TEST_parent_comment Phase1 testing"}
        r = auth_session.post(f"{BASE_URL}/api/comentarios", json=payload)
        assert r.status_code == 201, r.text
        body = r.json()
        assert "comentario" in body
        parent = body["comentario"]
        parent_id = parent["_id"]
        assert parent.get("parent_id") in (None,)
        # Populated user
        assert isinstance(parent.get("usuario_id"), dict)
        assert "nombre" in parent["usuario_id"]

        # 2. Create reply with parent_id
        reply_payload = {
            "publicacion_id": rid,
            "contenido": "TEST_reply_to_parent",
            "parent_id": parent_id
        }
        r2 = auth_session.post(f"{BASE_URL}/api/comentarios", json=reply_payload)
        assert r2.status_code == 201, r2.text
        reply = r2.json()["comentario"]
        assert reply.get("parent_id") == parent_id

        # 3. GET comentarios - parent should now contain the reply nested
        r3 = auth_session.get(f"{BASE_URL}/api/comentarios/{rid}")
        assert r3.status_code == 200
        all_comments = r3.json()
        # Find the parent we just made
        match = next((c for c in all_comments if c["_id"] == parent_id), None)
        assert match is not None, "Parent comment not found in list"
        # The reply should be in respuestas[]
        reply_ids = [r["_id"] for r in match["respuestas"]]
        assert reply["_id"] in reply_ids, \
            f"Reply {reply['_id']} not nested under parent. Got: {reply_ids}"
        # Reply should have populated usuario_id
        nested = next(r for r in match["respuestas"] if r["_id"] == reply["_id"])
        assert isinstance(nested.get("usuario_id"), dict)

    def test_comment_validation_empty_content(self, auth_session):
        feed = auth_session.get(f"{BASE_URL}/api/relatos?vista=todos&limit=1").json()
        if not feed:
            pytest.skip("No relatos")
        rid = feed[0]["_id"]
        r = auth_session.post(f"{BASE_URL}/api/comentarios",
                              json={"publicacion_id": rid, "contenido": "   "})
        assert r.status_code == 400

    def test_comment_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/comentarios",
                          json={"publicacion_id": "x", "contenido": "y"})
        assert r.status_code in (401, 403)
