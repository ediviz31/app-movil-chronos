"""Chronos Phase 2 tests: Notifications (Avisos) + Edit Profile."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')

USER_A = {"correo": "keilin@chronos.com", "password": "chronos123"}     # recipient
USER_B = {"correo": "arqueo@chronos.com", "password": "chronos123"}     # actor
USER_C = {"correo": "legado@chronos.com", "password": "chronos123"}     # owner of relato (also possible actor)


def login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds)
    assert r.status_code == 200, f"login failed for {creds['correo']}: {r.text}"
    me = s.get(f"{BASE_URL}/api/auth/me").json()
    return s, me["_id"]


@pytest.fixture(scope="module")
def sess_a():
    s, uid = login(USER_A)
    return s, uid


@pytest.fixture(scope="module")
def sess_b():
    s, uid = login(USER_B)
    return s, uid


@pytest.fixture(scope="module")
def sess_c():
    s, uid = login(USER_C)
    return s, uid


@pytest.fixture(scope="module")
def relato_de_a(sess_a):
    """Crea (o reutiliza) un relato del usuario A para usar como objetivo."""
    s, uid = sess_a
    # Try to find an existing relato
    r = s.get(f"{BASE_URL}/api/usuarios/{uid}/relatos")
    if r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) > 0:
        return r.json()[0]["_id"]
    # Create one
    payload = {"titulo": "TEST_relato_phase2", "contenido": "Crónica de pruebas Phase 2 " * 6,
               "categoria": "Roma imperial"}
    r2 = s.post(f"{BASE_URL}/api/relatos", json=payload)
    assert r2.status_code in (200, 201), r2.text
    return r2.json().get("_id") or r2.json().get("relato", {}).get("_id")


# ---------- Avisos list endpoints ----------
class TestAvisosEndpoints:
    def test_list_avisos_authed(self, sess_a):
        s, _ = sess_a
        r = s.get(f"{BASE_URL}/api/avisos")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # If non-empty, must have populated actor_id and proper fields
        if data:
            first = data[0]
            assert "_id" in first
            assert "tipo" in first
            assert "leida" in first
            assert "creado_en" in first
            assert "actor_id" in first
            # actor_id must be populated (object) not raw ObjectId string
            assert isinstance(first["actor_id"], dict)
            assert "nombre" in first["actor_id"]

    def test_list_avisos_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/avisos")
        assert r.status_code in (401, 403)

    def test_count_no_leidos(self, sess_a):
        s, _ = sess_a
        r = s.get(f"{BASE_URL}/api/avisos/no-leidos/count")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert isinstance(data["total"], int)

    def test_marcar_leidos_all(self, sess_a):
        s, _ = sess_a
        r = s.post(f"{BASE_URL}/api/avisos/marcar-leidos")
        assert r.status_code == 200
        # verify count became 0
        r2 = s.get(f"{BASE_URL}/api/avisos/no-leidos/count")
        assert r2.json()["total"] == 0


# ---------- Eco creates aviso ----------
class TestEcoNotification:
    def test_eco_creates_aviso_for_relato_owner(self, sess_a, sess_b, relato_de_a):
        sa, uid_a = sess_a
        sb, uid_b = sess_b
        # Ensure user A has no unread
        sa.post(f"{BASE_URL}/api/avisos/marcar-leidos")
        count_before = sa.get(f"{BASE_URL}/api/avisos/no-leidos/count").json()["total"]

        # Toggle ECO (POST twice in case it was already given so we end with eco created)
        r1 = sb.post(f"{BASE_URL}/api/ecos/{relato_de_a}")
        assert r1.status_code == 200, r1.text
        accion1 = r1.json().get("accion")
        if accion1 == "eliminado":
            # Second toggle re-creates the eco
            r2 = sb.post(f"{BASE_URL}/api/ecos/{relato_de_a}")
            assert r2.status_code == 200
            accion = r2.json().get("accion")
        else:
            accion = accion1
        assert accion == "creado", f"Eco final action expected 'creado' got {accion}"

        # Verify A sees a new aviso of tipo='eco' with actor_id=B
        time.sleep(0.4)
        listed = sa.get(f"{BASE_URL}/api/avisos").json()
        eco_avisos = [a for a in listed if a["tipo"] == "eco"
                      and a["actor_id"]["_id"] == uid_b
                      and a.get("publicacion_id", {}).get("_id") == relato_de_a]
        assert len(eco_avisos) >= 1, "Expected at least one eco aviso for A"
        count_after = sa.get(f"{BASE_URL}/api/avisos/no-leidos/count").json()["total"]
        assert count_after >= count_before + 1

    def test_self_eco_does_not_create_aviso(self, sess_a, relato_de_a):
        sa, uid_a = sess_a
        sa.post(f"{BASE_URL}/api/avisos/marcar-leidos")
        # A toggles eco on its own relato (if needed reset to "created" state)
        r1 = sa.post(f"{BASE_URL}/api/ecos/{relato_de_a}")
        # toggle back
        sa.post(f"{BASE_URL}/api/ecos/{relato_de_a}")
        # No unread aviso should be created from self-action
        count = sa.get(f"{BASE_URL}/api/avisos/no-leidos/count").json()["total"]
        assert count == 0, f"Self-eco should not produce notif. Got count={count}"


# ---------- Comentario creates aviso ----------
class TestComentarioNotification:
    def test_root_comentario_creates_aviso(self, sess_a, sess_b, relato_de_a):
        sa, uid_a = sess_a
        sb, uid_b = sess_b
        sa.post(f"{BASE_URL}/api/avisos/marcar-leidos")

        r = sb.post(f"{BASE_URL}/api/comentarios", json={
            "publicacion_id": relato_de_a,
            "contenido": "TEST_phase2 comentario raíz"
        })
        assert r.status_code in (200, 201), r.text

        time.sleep(0.4)
        listed = sa.get(f"{BASE_URL}/api/avisos").json()
        com_avisos = [a for a in listed if a["tipo"] == "comentario"
                      and a["actor_id"]["_id"] == uid_b]
        assert len(com_avisos) >= 1

    def test_respuesta_notifies_parent_author_not_relato_owner(self, sess_a, sess_b, sess_c, relato_de_a):
        """User B comenta el relato de A. Luego C responde a B → aviso debe ir a B, no a A."""
        sa, uid_a = sess_a
        sb, uid_b = sess_b
        sc, uid_c = sess_c

        # B publica un comentario raíz (already crea aviso a A, igual)
        rc = sb.post(f"{BASE_URL}/api/comentarios", json={
            "publicacion_id": relato_de_a,
            "contenido": "TEST_phase2 comentario base B"
        })
        assert rc.status_code in (200, 201)
        parent_id = rc.json().get("_id") or rc.json().get("comentario", {}).get("_id")
        assert parent_id, f"Could not get parent comment id from {rc.text}"

        # Reset B's unread
        sb.post(f"{BASE_URL}/api/avisos/marcar-leidos")
        # Reset A's unread
        sa.post(f"{BASE_URL}/api/avisos/marcar-leidos")

        # C responde
        rr = sc.post(f"{BASE_URL}/api/comentarios", json={
            "publicacion_id": relato_de_a,
            "contenido": "TEST_phase2 respuesta de C",
            "parent_id": parent_id
        })
        assert rr.status_code in (200, 201), rr.text

        time.sleep(0.4)
        # B should have a 'respuesta' aviso from C
        listed_b = sb.get(f"{BASE_URL}/api/avisos").json()
        resp_for_b = [a for a in listed_b if a["tipo"] == "respuesta"
                      and a["actor_id"]["_id"] == uid_c]
        assert len(resp_for_b) >= 1, "B should receive 'respuesta' aviso from C"

        # A should NOT have a new 'respuesta' aviso from C
        listed_a = sa.get(f"{BASE_URL}/api/avisos").json()
        resp_for_a_from_c = [a for a in listed_a if a["tipo"] == "respuesta"
                             and a["actor_id"]["_id"] == uid_c]
        assert len(resp_for_a_from_c) == 0, "A should NOT receive 'respuesta' aviso from C"


# ---------- Seguir notification ----------
class TestSeguirNotification:
    def test_follow_creates_aviso(self, sess_a, sess_b):
        sa, uid_a = sess_a
        sb, uid_b = sess_b
        sa.post(f"{BASE_URL}/api/avisos/marcar-leidos")

        # Ensure clean follow state: toggle once, may give 'seguir' or 'deseguir'
        r1 = sb.post(f"{BASE_URL}/api/seguir/{uid_a}")
        assert r1.status_code == 200, r1.text
        accion1 = r1.json().get("accion")
        if accion1 == "deseguir":
            # follow again
            r2 = sb.post(f"{BASE_URL}/api/seguir/{uid_a}")
            assert r2.status_code == 200
            accion = r2.json().get("accion")
        else:
            accion = accion1
        assert accion == "seguir"

        time.sleep(0.4)
        listed = sa.get(f"{BASE_URL}/api/avisos").json()
        seguidor_avisos = [a for a in listed if a["tipo"] == "seguidor"
                           and a["actor_id"]["_id"] == uid_b]
        assert len(seguidor_avisos) >= 1


# ---------- Mark individual aviso as read ----------
class TestMarkAvisoRead:
    def test_marcar_un_aviso(self, sess_a, sess_b, relato_de_a):
        sa, uid_a = sess_a
        sb, uid_b = sess_b
        # Generate an unread aviso
        sb.post(f"{BASE_URL}/api/comentarios", json={
            "publicacion_id": relato_de_a,
            "contenido": "TEST_phase2 marcar leido"
        })
        time.sleep(0.3)
        listed = sa.get(f"{BASE_URL}/api/avisos").json()
        unread = [a for a in listed if not a["leida"]]
        if not unread:
            pytest.skip("No unread avisos to mark")
        target = unread[0]
        r = sa.post(f"{BASE_URL}/api/avisos/{target['_id']}/leido")
        assert r.status_code == 200, r.text
        # Re-fetch and verify it's now read
        listed2 = sa.get(f"{BASE_URL}/api/avisos").json()
        target2 = next((a for a in listed2 if a["_id"] == target["_id"]), None)
        assert target2 is not None
        assert target2["leida"] is True

    def test_marcar_invalid_id(self, sess_a):
        sa, _ = sess_a
        r = sa.post(f"{BASE_URL}/api/avisos/not-an-id/leido")
        assert r.status_code == 400


# ---------- PUT /api/usuarios/perfil ----------
class TestPerfilUpdate:
    def test_actualizar_perfil(self, sess_a):
        sa, uid_a = sess_a
        # Snapshot
        before = sa.get(f"{BASE_URL}/api/auth/me").json()
        new_bio = "TEST_phase2 bio actualizada"
        new_interes = "Mitología romana TEST"
        new_tema = "Roma imperial"
        new_nombre = before.get("nombre", "Keilin")  # keep nombre stable

        r = sa.put(f"{BASE_URL}/api/usuarios/perfil", json={
            "nombre": new_nombre,
            "bio": new_bio,
            "interes": new_interes,
            "tema_favorito": new_tema
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "mensaje" in data
        assert "usuario" in data
        u = data["usuario"]
        assert u["bio"] == new_bio
        assert u["interes"] == new_interes
        assert u["tema_favorito"] == new_tema
        assert "password" not in u

        # Persistence
        me = sa.get(f"{BASE_URL}/api/auth/me").json()
        assert me["bio"] == new_bio
        assert me["interes"] == new_interes
        assert me["tema_favorito"] == new_tema

    def test_perfil_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/usuarios/perfil", json={"nombre": "X"})
        assert r.status_code in (401, 403)
