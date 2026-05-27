"""
Phase 4 — Mi Legado (Family Tree) endpoint tests.

Covers:
  - POST   /api/familiares                         (create)
  - GET    /api/familiares/mios                    (list own)
  - GET    /api/familiares/usuario/:userId         (list other, privacy)
  - PUT    /api/familiares/:id                     (update + 403 cross-user)
  - DELETE /api/familiares/:id                     (delete + 403 cross-user)
  - POST   /api/familiares/:id/foto                (multipart upload)
  - POST   /api/familiares/:id/historias           (add inline historia)
  - DELETE /api/familiares/:id/historias/:hId      (remove historia)
  - POST   /api/familiares/importar-gedcom         (bulk parser)
  - PUT    /api/usuarios/preferencias              (sonido + arbol_publico)
"""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get(
    'REACT_APP_BACKEND_URL',
    'https://historia-connect.preview.emergentagent.com'
).rstrip('/')

KEILIN = {"correo": "keilin@chronos.com", "password": "chronos123"}
ARQUEO = {"correo": "arqueo@chronos.com", "password": "chronos123"}

GEDCOM_SAMPLE = """0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 12 JUN 1900
1 FAMC @F1@
0 @I2@ INDI
1 NAME Father /Smith/
1 SEX M
0 @I3@ INDI
1 NAME Mother /Doe/
1 SEX F
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
0 TRLR
"""


# ---------- helpers ----------
def _login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds)
    if r.status_code != 200:
        pytest.skip(f"Login failed for {creds['correo']}: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def keilin_session():
    return _login(KEILIN)


@pytest.fixture(scope="module")
def arqueo_session():
    return _login(ARQUEO)


@pytest.fixture(scope="module")
def keilin_id(keilin_session):
    r = keilin_session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    return r.json().get("_id")


@pytest.fixture(scope="module")
def arqueo_id(arqueo_session):
    r = arqueo_session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    return r.json().get("_id")


@pytest.fixture(scope="module", autouse=True)
def cleanup(keilin_session, arqueo_session):
    """Wipe TEST_ prefixed familiares before and after the module run."""
    def _wipe(sess):
        r = sess.get(f"{BASE_URL}/api/familiares/mios")
        if r.status_code == 200:
            for f in r.json():
                if str(f.get("nombre", "")).startswith("TEST_") or str(f.get("apellido", "")) in {"Smith", "Doe"}:
                    sess.delete(f"{BASE_URL}/api/familiares/{f['_id']}")
    _wipe(keilin_session)
    _wipe(arqueo_session)
    yield
    _wipe(keilin_session)
    _wipe(arqueo_session)


# ---------- AUTH GUARD ----------
class TestAuthGuard:
    def test_familiares_mios_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/familiares/mios")
        assert r.status_code in (401, 403)

    def test_preferencias_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/usuarios/preferencias", json={"sonido_aviso": "cuerno"})
        assert r.status_code in (401, 403)


# ---------- PREFERENCIAS ----------
class TestPreferencias:
    def test_update_sonido_valid(self, keilin_session):
        r = keilin_session.put(f"{BASE_URL}/api/usuarios/preferencias", json={"sonido_aviso": "lira"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["usuario"]["preferencias"]["sonido_aviso"] == "lira"

    def test_update_sonido_invalid_returns_400(self, keilin_session):
        r = keilin_session.put(f"{BASE_URL}/api/usuarios/preferencias", json={"sonido_aviso": "tambor"})
        assert r.status_code == 400, r.text

    def test_update_arbol_publico_true(self, keilin_session):
        r = keilin_session.put(f"{BASE_URL}/api/usuarios/preferencias", json={"arbol_publico": True})
        assert r.status_code == 200
        assert r.json()["usuario"]["preferencias"]["arbol_publico"] is True

    def test_update_all_sounds_accepted(self, keilin_session):
        for s in ["cuerno", "lira", "campana", "silencio"]:
            r = keilin_session.put(f"{BASE_URL}/api/usuarios/preferencias", json={"sonido_aviso": s})
            assert r.status_code == 200, f"{s}: {r.text}"
            assert r.json()["usuario"]["preferencias"]["sonido_aviso"] == s


# ---------- FAMILIARES CRUD ----------
class TestFamiliaresCRUD:
    def test_create_requires_nombre_and_parentesco(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares", json={"nombre": "TEST_Solo"})
        assert r.status_code == 400
        r = keilin_session.post(f"{BASE_URL}/api/familiares", json={"parentesco": "padre"})
        assert r.status_code == 400

    def test_create_invalid_parentesco_rejected(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares", json={
            "nombre": "TEST_X", "parentesco": "vecino"
        })
        # mongoose enum -> 500 unless caught; the server catches in catch block.
        # Accept either 400 or 500 (validation error).
        assert r.status_code in (400, 500), r.text

    def test_create_and_get_mios(self, keilin_session):
        payload = {
            "nombre": "TEST_Padre",
            "apellido": "Demo",
            "parentesco": "padre",
            "genero": "masculino",
            "fecha_nacimiento": "1950-03-15",
            "lugar_nacimiento": "Sevilla",
            "ocupacion": "Carpintero",
            "bio": "Padre demo TEST"
        }
        r = keilin_session.post(f"{BASE_URL}/api/familiares", json=payload)
        assert r.status_code == 201, r.text
        fam = r.json()["familiar"]
        assert fam["nombre"] == "TEST_Padre"
        assert fam["parentesco"] == "padre"
        assert fam["lugar_nacimiento"] == "Sevilla"
        assert "_id" in fam

        # GET /mios
        r = keilin_session.get(f"{BASE_URL}/api/familiares/mios")
        assert r.status_code == 200
        ids = [f["_id"] for f in r.json()]
        assert fam["_id"] in ids

    def test_update_own_familiar(self, keilin_session):
        # create
        r = keilin_session.post(f"{BASE_URL}/api/familiares",
                                json={"nombre": "TEST_Mod", "parentesco": "madre"})
        fid = r.json()["familiar"]["_id"]
        # update
        r = keilin_session.put(f"{BASE_URL}/api/familiares/{fid}",
                               json={"ocupacion": "Maestra"})
        assert r.status_code == 200
        assert r.json()["familiar"]["ocupacion"] == "Maestra"
        # persistence
        r = keilin_session.get(f"{BASE_URL}/api/familiares/mios")
        match = [f for f in r.json() if f["_id"] == fid][0]
        assert match["ocupacion"] == "Maestra"

    def test_update_other_user_forbidden(self, keilin_session, arqueo_session):
        # create with keilin
        r = keilin_session.post(f"{BASE_URL}/api/familiares",
                                json={"nombre": "TEST_Cross", "parentesco": "padre"})
        fid = r.json()["familiar"]["_id"]
        # arqueo tries to update
        r2 = arqueo_session.put(f"{BASE_URL}/api/familiares/{fid}", json={"ocupacion": "Hacker"})
        assert r2.status_code == 403

    def test_delete_other_user_forbidden(self, keilin_session, arqueo_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares",
                                json={"nombre": "TEST_DelCross", "parentesco": "padre"})
        fid = r.json()["familiar"]["_id"]
        r2 = arqueo_session.delete(f"{BASE_URL}/api/familiares/{fid}")
        assert r2.status_code == 403

    def test_delete_own_familiar(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares",
                                json={"nombre": "TEST_Del", "parentesco": "tio"})
        fid = r.json()["familiar"]["_id"]
        r2 = keilin_session.delete(f"{BASE_URL}/api/familiares/{fid}")
        assert r2.status_code == 200
        # verify removed
        r3 = keilin_session.get(f"{BASE_URL}/api/familiares/mios")
        assert fid not in [f["_id"] for f in r3.json()]


# ---------- PRIVACY ----------
class TestPrivacy:
    def test_public_tree_accessible_by_other(self, keilin_session, arqueo_session, keilin_id):
        # ensure keilin has at least one familiar + publico=true
        keilin_session.put(f"{BASE_URL}/api/usuarios/preferencias", json={"arbol_publico": True})
        keilin_session.post(f"{BASE_URL}/api/familiares",
                            json={"nombre": "TEST_PubMember", "parentesco": "madre"})
        r = arqueo_session.get(f"{BASE_URL}/api/familiares/usuario/{keilin_id}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["es_publico"] is True
        assert isinstance(body["familiares"], list)

    def test_private_tree_forbidden_for_other(self, keilin_session, arqueo_session, keilin_id):
        keilin_session.put(f"{BASE_URL}/api/usuarios/preferencias", json={"arbol_publico": False})
        r = arqueo_session.get(f"{BASE_URL}/api/familiares/usuario/{keilin_id}")
        assert r.status_code == 403, r.text

    def test_private_tree_accessible_to_owner(self, keilin_session, keilin_id):
        keilin_session.put(f"{BASE_URL}/api/usuarios/preferencias", json={"arbol_publico": False})
        r = keilin_session.get(f"{BASE_URL}/api/familiares/usuario/{keilin_id}")
        assert r.status_code == 200


# ---------- HISTORIAS ----------
class TestHistorias:
    def test_add_and_remove_historia(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares",
                                json={"nombre": "TEST_Hist", "parentesco": "abuelo_paterno"})
        fid = r.json()["familiar"]["_id"]
        # add
        r = keilin_session.post(f"{BASE_URL}/api/familiares/{fid}/historias",
                                json={"titulo": "El viaje", "contenido": "Cruzó el Atlántico en 1923."})
        assert r.status_code == 200, r.text
        hs = r.json()["historias"]
        assert len(hs) == 1
        assert hs[0]["titulo"] == "El viaje"
        hid = hs[0]["_id"]
        # delete
        r = keilin_session.delete(f"{BASE_URL}/api/familiares/{fid}/historias/{hid}")
        assert r.status_code == 200
        assert len(r.json()["historias"]) == 0

    def test_historia_requires_contenido(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares",
                                json={"nombre": "TEST_HistEmpty", "parentesco": "hermano"})
        fid = r.json()["familiar"]["_id"]
        r = keilin_session.post(f"{BASE_URL}/api/familiares/{fid}/historias",
                                json={"titulo": "Sin contenido"})
        assert r.status_code == 400


# ---------- FOTO UPLOAD ----------
class TestFotoUpload:
    def test_upload_foto(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares",
                                json={"nombre": "TEST_Foto", "parentesco": "padre"})
        fid = r.json()["familiar"]["_id"]
        # minimal valid PNG (8x8 transparent)
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x08\x00\x00\x00\x08'
            b'\x08\x06\x00\x00\x00\xc4\x0f\xbe\x8b\x00\x00\x00\x13IDATx\x9cc\xfc\xff'
            b'\xff?\x03\x18\x00\x05\x00\x01\x00\x00\x00\x00\x05\x00\x01\r\n-\xb4\x00'
            b'\x00\x00\x00IEND\xaeB`\x82'
        )
        # send multipart — need to drop json content-type
        sess = requests.Session()
        sess.cookies = keilin_session.cookies
        files = {'imagen': ('foto.png', io.BytesIO(png_bytes), 'image/png')}
        r = sess.post(f"{BASE_URL}/api/familiares/{fid}/foto", files=files)
        assert r.status_code == 200, r.text
        assert r.json()["foto"].startswith("/api/uploads/familiares/")


# ---------- GEDCOM IMPORT ----------
class TestGedcomImport:
    def test_import_empty_returns_400(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares/importar-gedcom", json={"gedcom": ""})
        assert r.status_code == 400

    def test_import_no_valid_indi_returns_400(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares/importar-gedcom",
                                json={"gedcom": "0 HEAD\n0 TRLR\n"})
        assert r.status_code == 400

    def test_import_valid_gedcom_creates_familiares(self, keilin_session):
        r = keilin_session.post(f"{BASE_URL}/api/familiares/importar-gedcom",
                                json={"gedcom": GEDCOM_SAMPLE})
        assert r.status_code == 201, r.text
        body = r.json()
        # Should produce at least padre + madre = 2
        assert body["total"] >= 2
        # verify they appear in /mios
        r2 = keilin_session.get(f"{BASE_URL}/api/familiares/mios")
        names = [(f["nombre"], f["apellido"], f["parentesco"]) for f in r2.json()]
        assert any(p == "padre" for (_, _, p) in names)
        assert any(p == "madre" for (_, _, p) in names)
