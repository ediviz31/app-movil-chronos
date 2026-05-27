"""Tests for the Misivas (DM) module."""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')

KEILIN = {"correo": "keilin@chronos.com", "password": "chronos123"}
LEGADO = {"correo": "legado@chronos.com", "password": "chronos123"}
ARQUEO = {"correo": "arqueo@chronos.com", "password": "chronos123"}


def _login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds)
    assert r.status_code == 200, f"Login failed for {creds['correo']}: {r.status_code} {r.text}"
    me = s.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200
    return s, me.json().get("_id")


@pytest.fixture(scope="module")
def keilin():
    return _login(KEILIN)


@pytest.fixture(scope="module")
def legado():
    return _login(LEGADO)


@pytest.fixture(scope="module")
def arqueo():
    return _login(ARQUEO)


# ---- abrir ----
class TestAbrir:
    def test_abrir_con_otro_usuario_crea_conversacion(self, keilin, legado):
        ks, _ = keilin
        _, legado_id = legado
        r = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "_id" in data
        assert "otro" in data
        assert str(data["otro"]["_id"]) == str(legado_id)
        assert "nombre" in data["otro"]
        assert "usuario" in data["otro"]

    def test_abrir_es_idempotente(self, keilin, legado):
        ks, _ = keilin
        _, legado_id = legado
        r1 = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        r2 = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["_id"] == r2.json()["_id"], "Conversación debe reutilizarse"

    def test_abrir_consigo_mismo_400(self, keilin):
        ks, kid = keilin
        r = ks.post(f"{BASE_URL}/api/misivas/abrir/{kid}")
        assert r.status_code == 400, r.text
        assert "error" in r.json()

    def test_abrir_user_inexistente_404(self, keilin):
        ks, _ = keilin
        # ID válido formato pero inexistente
        fake_id = "6a162ec924dbda262c899999"
        r = ks.post(f"{BASE_URL}/api/misivas/abrir/{fake_id}")
        assert r.status_code in (404, 500), r.text


# ---- lista + no leídas ----
class TestLista:
    def test_get_misivas_lista(self, keilin, legado):
        ks, _ = keilin
        _, legado_id = legado
        ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        r = ks.get(f"{BASE_URL}/api/misivas")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            assert "_id" in item
            assert "otro" in item
            assert "nombre" in item["otro"]
            assert "usuario" in item["otro"]
            assert "ultimo_mensaje_en" in item
            assert "ultimo_mensaje_resumen" in item
            assert "no_leido" in item

    def test_no_leidas_count(self, keilin):
        ks, _ = keilin
        r = ks.get(f"{BASE_URL}/api/misivas/no-leidas")
        assert r.status_code == 200, r.text
        assert "total" in r.json()
        assert isinstance(r.json()["total"], int)


# ---- mensajes flujo completo ----
class TestMensajes:
    def test_flujo_envio_y_no_leido(self, keilin, legado):
        ks, _ = keilin
        ls, legado_id = legado
        # Abrir
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]

        # Legado marca como leído primero para reset
        ls.post(f"{BASE_URL}/api/misivas/{conv_id}/leer")

        # Keilin envía mensaje
        contenido = "TEST_msg saludo desde keilin"
        r = ks.post(f"{BASE_URL}/api/misivas/{conv_id}/mensajes",
                    json={"contenido": contenido})
        assert r.status_code == 201, r.text
        msg = r.json()
        assert msg["contenido"] == contenido
        assert "_id" in msg
        assert "creado_en" in msg

        # GET historial keilin
        h = ks.get(f"{BASE_URL}/api/misivas/{conv_id}/mensajes")
        assert h.status_code == 200
        body = h.json()
        assert "mensajes" in body
        assert "otro" in body
        contenidos = [m["contenido"] for m in body["mensajes"]]
        assert contenido in contenidos
        # orden cronológico ascendente
        fechas = [m["creado_en"] for m in body["mensajes"]]
        assert fechas == sorted(fechas), "mensajes deben ir asc por creado_en"

        # Legado ve no_leido=true
        l_list = ls.get(f"{BASE_URL}/api/misivas").json()
        target = next((c for c in l_list if c["_id"] == conv_id), None)
        assert target is not None, "Legado debe ver la conversación"
        assert target["no_leido"] is True
        assert target["ultimo_mensaje_resumen"].startswith("TEST_msg")

        # Legado /no-leidas total >=1
        total_antes = ls.get(f"{BASE_URL}/api/misivas/no-leidas").json()["total"]
        assert total_antes >= 1

        # Legado marca leído
        mark = ls.post(f"{BASE_URL}/api/misivas/{conv_id}/leer")
        assert mark.status_code == 200

        # Tras leer: no_leido=false y count baja
        l_list2 = ls.get(f"{BASE_URL}/api/misivas").json()
        target2 = next((c for c in l_list2 if c["_id"] == conv_id), None)
        assert target2["no_leido"] is False
        total_despues = ls.get(f"{BASE_URL}/api/misivas/no-leidas").json()["total"]
        assert total_despues == total_antes - 1

    def test_yo_no_me_notifico_a_mi_mismo(self, keilin, legado):
        """El remitente nunca debe verse no_leido en su propia lista."""
        ks, _ = keilin
        _, legado_id = legado
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]
        ks.post(f"{BASE_URL}/api/misivas/{conv_id}/mensajes",
                json={"contenido": "TEST_self ping"})
        k_list = ks.get(f"{BASE_URL}/api/misivas").json()
        target = next((c for c in k_list if c["_id"] == conv_id), None)
        assert target is not None
        assert target["no_leido"] is False, "Mis propios mensajes no deben aparecer no_leido"

    def test_no_leidas_excluye_mis_mensajes(self, keilin, legado):
        ks, _ = keilin
        _, legado_id = legado
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]
        ks.post(f"{BASE_URL}/api/misivas/{conv_id}/mensajes",
                json={"contenido": "TEST_exclude"})
        # keilin envió, su propio total no_leidas no debe incluir esta conv
        total = ks.get(f"{BASE_URL}/api/misivas/no-leidas").json()["total"]
        # No podemos asegurar el valor exacto, pero verificamos que esta conv NO se cuenta:
        k_list = ks.get(f"{BASE_URL}/api/misivas").json()
        no_leidas_k = sum(1 for c in k_list if c["no_leido"])
        assert no_leidas_k == total

    def test_mensaje_vacio_400(self, keilin, legado):
        ks, _ = keilin
        _, legado_id = legado
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]
        r = ks.post(f"{BASE_URL}/api/misivas/{conv_id}/mensajes",
                    json={"contenido": "   "})
        assert r.status_code == 400, r.text

    def test_mensaje_muy_largo_400(self, keilin, legado):
        ks, _ = keilin
        _, legado_id = legado
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]
        r = ks.post(f"{BASE_URL}/api/misivas/{conv_id}/mensajes",
                    json={"contenido": "x" * 4001})
        assert r.status_code == 400, r.text


# ---- acceso ----
class TestAcceso:
    def test_no_participante_get_mensajes_403(self, keilin, legado, arqueo):
        ks, _ = keilin
        _, legado_id = legado
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]
        as_, _ = arqueo
        r = as_.get(f"{BASE_URL}/api/misivas/{conv_id}/mensajes")
        assert r.status_code == 403, r.text

    def test_no_participante_post_mensaje_403(self, keilin, legado, arqueo):
        ks, _ = keilin
        _, legado_id = legado
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]
        as_, _ = arqueo
        r = as_.post(f"{BASE_URL}/api/misivas/{conv_id}/mensajes",
                     json={"contenido": "TEST_intruder"})
        assert r.status_code == 403, r.text

    def test_no_participante_leer_403(self, keilin, legado, arqueo):
        ks, _ = keilin
        _, legado_id = legado
        ab = ks.post(f"{BASE_URL}/api/misivas/abrir/{legado_id}")
        conv_id = ab.json()["_id"]
        as_, _ = arqueo
        r = as_.post(f"{BASE_URL}/api/misivas/{conv_id}/leer")
        assert r.status_code == 403, r.text

    def test_id_inexistente(self, keilin):
        ks, _ = keilin
        fake = "6a162ec924dbda262c888888"
        r = ks.get(f"{BASE_URL}/api/misivas/{fake}/mensajes")
        assert r.status_code in (404, 500), r.text

    def test_sin_auth_401(self):
        r = requests.get(f"{BASE_URL}/api/misivas")
        assert r.status_code in (401, 403), r.text
