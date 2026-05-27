"""
Tests para Web Push (PWA) — endpoints /api/push/*
- public-key (sin auth)
- suscribir / desuscribir (auth, validación, idempotencia)
- enviarPushAUsuario en background NO bloquea (POST /api/ecos rápido y crea aviso)
- POST /api/misivas/:id/mensajes dispara push en background sin retardo
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

KEILIN = {"correo": "keilin@chronos.com", "password": "chronos123"}
LEGADO = {"correo": "legado@chronos.com", "password": "chronos123"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login fail {creds['correo']}: {r.status_code} {r.text[:200]}"
    return s


# ---------- public-key ----------
class TestPublicKey:
    def test_returns_key_no_auth(self):
        r = requests.get(f"{API}/push/public-key", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "key" in data
        assert isinstance(data["key"], str)
        assert len(data["key"]) > 20  # base64url VAPID ~ 87 chars


# ---------- suscribir / desuscribir ----------
class TestSuscripcion:
    def test_suscribir_sin_cookie_401(self):
        payload = {
            "endpoint": f"https://fcm.googleapis.com/fcm/send/test-{uuid.uuid4()}",
            "keys": {"p256dh": "BNc-fake-p256dh-key", "auth": "fake-auth"}
        }
        r = requests.post(f"{API}/push/suscribir", json=payload, timeout=10)
        assert r.status_code == 401

    def test_suscribir_sin_endpoint_400(self):
        s = _login(KEILIN)
        r = s.post(f"{API}/push/suscribir",
                   json={"keys": {"p256dh": "x", "auth": "y"}}, timeout=10)
        assert r.status_code == 400

    def test_suscribir_sin_keys_400(self):
        s = _login(KEILIN)
        r = s.post(f"{API}/push/suscribir",
                   json={"endpoint": f"https://fcm.googleapis.com/fcm/send/{uuid.uuid4()}"},
                   timeout=10)
        assert r.status_code == 400

    def test_suscribir_idempotente_y_desuscribir(self):
        s = _login(KEILIN)
        endpoint = f"https://fcm.googleapis.com/fcm/send/test-{uuid.uuid4()}"
        payload = {"endpoint": endpoint,
                   "keys": {"p256dh": "BNc-fake-p256dh", "auth": "fake-auth"}}

        r1 = s.post(f"{API}/push/suscribir", json=payload, timeout=10)
        assert r1.status_code in (200, 201), f"primera suscripción: {r1.status_code} {r1.text}"

        # idempotencia: mismo endpoint, no debe crashear, no debe duplicar
        r2 = s.post(f"{API}/push/suscribir", json=payload, timeout=10)
        assert r2.status_code in (200, 201)

        # desuscribir
        r3 = s.post(f"{API}/push/desuscribir", json={"endpoint": endpoint}, timeout=10)
        assert r3.status_code in (200, 204)


# ---------- aviso/push en background no bloquea ----------
class TestPushBackgroundNoBloquea:
    """
    Cuando un usuario da eco a un relato de OTRO, se crea Notificacion y se dispara push.
    El push debe ir en setImmediate; la respuesta del POST debe ser rápida (<2s con margen),
    aun cuando enviarPushAUsuario haga IO contra el push server (con subs fake).
    """

    def _ensure_fake_sub_para_keilin(self):
        s = _login(KEILIN)
        endpoint = f"https://fcm.googleapis.com/fcm/send/fake-bg-{uuid.uuid4()}"
        s.post(f"{API}/push/suscribir",
               json={"endpoint": endpoint,
                     "keys": {"p256dh": "BNc-fake-p256dh", "auth": "fake-auth"}},
               timeout=10)
        return endpoint

    def test_eco_responde_rapido_y_crea_aviso(self):
        # asegurar que legado tenga sub fake (para que enviarPushAUsuario tenga algo que intentar)
        sl_setup = _login(LEGADO)
        endpoint_fake = f"https://fcm.googleapis.com/fcm/send/fake-bg-{uuid.uuid4()}"
        sl_setup.post(f"{API}/push/suscribir",
                      json={"endpoint": endpoint_fake,
                            "keys": {"p256dh": "BNc-fake-p256dh", "auth": "fake-auth"}},
                      timeout=10)

        # buscar un relato de legado en el feed
        sk = _login(KEILIN)
        feed = sk.get(f"{API}/relatos?limit=50", timeout=15)
        assert feed.status_code == 200, f"feed: {feed.status_code} {feed.text[:200]}"
        body = feed.json()
        items = body if isinstance(body, list) else body.get("relatos", body.get("items", []))
        legado_id = "6a162ec924dbda262c859553"
        def _autor_id(p):
            a = p.get("autor") or p.get("autor_id") or p.get("usuario_id")
            if isinstance(a, dict): return a.get("_id") or a.get("id")
            return a
        relatos_legado = [p for p in items if _autor_id(p) == legado_id]
        if not relatos_legado:
            pytest.skip(f"No hay publicaciones de legado en feed (items={len(items)})")
        relato_id = relatos_legado[0].get("_id") or relatos_legado[0].get("id")

        # quita eco previo si existiera (para forzar creación → aviso)
        sk.delete(f"{API}/ecos/{relato_id}", timeout=10)

        t0 = time.time()
        r = sk.post(f"{API}/ecos/{relato_id}", timeout=10)
        dt = time.time() - t0
        assert r.status_code in (200, 201), f"eco failed: {r.status_code} {r.text}"
        assert dt < 2.0, f"POST /ecos demasiado lento ({dt:.2f}s) — push parece bloqueante"

        # Verificar que se creó un aviso para legado
        time.sleep(0.5)
        avisos = sl_setup.get(f"{API}/avisos", timeout=10)
        assert avisos.status_code == 200
        lista = avisos.json() if isinstance(avisos.json(), list) else avisos.json().get("avisos", [])
        tipos = [a.get("tipo") for a in lista]
        assert "eco" in tipos, f"No se creó aviso de eco. avisos={lista[:5]}"

        # limpieza: borrar sub fake
        sl_setup.post(f"{API}/push/desuscribir", json={"endpoint": endpoint_fake}, timeout=10)

    def test_misiva_mensaje_no_bloquea(self):
        # crear/usar conversación entre keilin y legado
        sk = _login(KEILIN)
        legado_id = "6a162ec924dbda262c859553"
        conv = sk.post(f"{API}/misivas/iniciar", json={"destinatario_id": legado_id}, timeout=10)
        if conv.status_code not in (200, 201):
            # tal vez ya existe; intentar listar
            lista = sk.get(f"{API}/misivas", timeout=10).json()
            convs = lista if isinstance(lista, list) else lista.get("conversaciones", [])
            if not convs:
                pytest.skip(f"No se pudo iniciar conversación: {conv.status_code} {conv.text}")
            conv_id = convs[0].get("_id") or convs[0].get("id")
        else:
            conv_id = conv.json().get("_id") or conv.json().get("id") or conv.json().get("conversacion", {}).get("_id")
        assert conv_id, "sin conv_id"

        t0 = time.time()
        r = sk.post(f"{API}/misivas/{conv_id}/mensajes",
                    json={"contenido": f"hola push-test {uuid.uuid4()}"}, timeout=10)
        dt = time.time() - t0
        assert r.status_code in (200, 201), f"mensaje failed: {r.status_code} {r.text}"
        assert dt < 2.0, f"POST mensaje demasiado lento ({dt:.2f}s)"


# ---------- /push/test (silencioso) ----------
class TestPushTest:
    def test_push_test_no_crashea(self):
        s = _login(KEILIN)
        r = s.post(f"{API}/push/test", timeout=15)
        # El endpoint puede responder 200 aun cuando las subs sean fake (errores silenciados)
        assert r.status_code in (200, 204), f"/push/test status {r.status_code}"
