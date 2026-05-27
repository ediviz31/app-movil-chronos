"""Tests for Open Graph card endpoints (/api/og/relato/:id and /api/og/relato/:id/imagen)."""
import os
import re
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://historia-connect.preview.emergentagent.com').rstrip('/')

# Relato seed conocido: César y el Rubicón
RELATO_ID = "6a162ecd24dbda262c859563"
ID_FORMATO_INVALIDO = "no-es-objectid"
ID_INEXISTENTE = "6a162ec924dbda262c000000"  # 24 hex, no existe en BD

UA_WHATSAPP = "WhatsApp/2.23.20.0 A"
UA_TWITTER = "Twitterbot/1.0"
UA_FACEBOOK = "facebookexternalhit/1.1"
UA_DISCORD = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
UA_TELEGRAM = "TelegramBot (like TwitterBot)"
UA_MOZILLA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


# ============== HTML endpoint ==============
class TestOgRelatoHtml:
    def test_sin_auth_devuelve_html_200(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_WHATSAPP})
        assert r.status_code == 200, r.text[:400]
        assert "text/html" in r.headers.get("Content-Type", "")

    def test_meta_og_basicas_presentes(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_WHATSAPP})
        body = r.text
        assert 'property="og:type" content="article"' in body
        assert 'property="og:title"' in body
        assert 'property="og:description"' in body
        assert 'property="og:url"' in body
        assert 'property="og:image"' in body
        assert 'property="og:image:width" content="1200"' in body
        assert 'property="og:image:height" content="630"' in body
        assert 'name="twitter:card" content="summary_large_image"' in body

    def test_og_image_apunta_a_endpoint_imagen(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_WHATSAPP})
        m = re.search(r'property="og:image"\s+content="([^"]+)"', r.text)
        assert m, "og:image no encontrada"
        assert m.group(1).endswith(f"/api/og/relato/{RELATO_ID}/imagen"), m.group(1)

    def test_og_url_apunta_a_app_react(self):
        # og:url debe ir a /relato/:id (la app React), NO a /api/og/...
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_WHATSAPP})
        m = re.search(r'property="og:url"\s+content="([^"]+)"', r.text)
        assert m
        url = m.group(1)
        assert url.endswith(f"/relato/{RELATO_ID}"), f"og:url debería ir a /relato/:id, fue {url}"
        assert "/api/og/" not in url

    @pytest.mark.parametrize("ua", [UA_WHATSAPP, UA_TWITTER, UA_FACEBOOK, UA_DISCORD, UA_TELEGRAM])
    def test_bot_no_incluye_meta_refresh(self, ua):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": ua})
        assert r.status_code == 200
        assert 'http-equiv="refresh"' not in r.text, f"Bot {ua} no debería recibir meta refresh"

    def test_humano_incluye_meta_refresh_a_app_react(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_MOZILLA})
        assert r.status_code == 200
        assert 'http-equiv="refresh"' in r.text, "Humano debería recibir meta refresh"
        m = re.search(r'http-equiv="refresh"\s+content="0;url=([^"]+)"', r.text)
        assert m, "meta refresh content no parseable"
        assert m.group(1).endswith(f"/relato/{RELATO_ID}"), m.group(1)

    def test_cache_control_html(self):
        # El ingress de preview reescribe Cache-Control con 'no-store, no-cache'.
        # Validamos contra el backend directo (localhost:8001) que el HANDLER fija max-age=600.
        r = requests.get(f"http://localhost:8001/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_WHATSAPP})
        cc = r.headers.get("Cache-Control", "")
        assert "max-age=600" in cc, cc

    def test_id_malformado_400(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{ID_FORMATO_INVALIDO}", headers={"User-Agent": UA_WHATSAPP})
        assert r.status_code == 400

    def test_id_inexistente_404(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{ID_INEXISTENTE}", headers={"User-Agent": UA_WHATSAPP})
        assert r.status_code == 404

    def test_escape_html_en_titulo_descripcion(self):
        # Verifica que no haya < > " sin escapar dentro de los content="..."
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_WHATSAPP})
        # Encuentra todos los content="..." de meta tags
        for m in re.finditer(r'<meta[^>]*content="([^"]*)"', r.text):
            val = m.group(1)
            # No deberían aparecer < o > sin escapar dentro del valor
            assert "<" not in val, f"< sin escapar en meta content: {val[:80]}"
            assert ">" not in val, f"> sin escapar en meta content: {val[:80]}"

    def test_no_requiere_autenticacion(self):
        # Llamada sin ninguna cookie/token
        s = requests.Session()  # sesión limpia
        r = s.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}", headers={"User-Agent": UA_WHATSAPP})
        assert r.status_code == 200, "Bots no autentican; endpoint debe ser público"


# ============== Imagen PNG endpoint ==============
class TestOgRelatoImagen:
    def test_devuelve_png_sin_auth(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}/imagen")
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("Content-Type") == "image/png"
        # PNG magic bytes
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", "No es un PNG válido"

    def test_dimensiones_1200x630(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}/imagen")
        assert r.status_code == 200
        # PNG IHDR: bytes 16-19 = width, 20-23 = height (big endian)
        width = int.from_bytes(r.content[16:20], 'big')
        height = int.from_bytes(r.content[20:24], 'big')
        assert width == 1200, f"width esperado 1200, fue {width}"
        assert height == 630, f"height esperado 630, fue {height}"

    def test_tamano_razonable(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{RELATO_ID}/imagen")
        size_kb = len(r.content) / 1024
        # Esperado ~50-100KB; permitimos rango más amplio 20-500KB
        assert 20 < size_kb < 500, f"Tamaño inesperado: {size_kb:.1f}KB"

    def test_cache_control_imagen(self):
        # Ingress preview reescribe Cache-Control; validamos contra backend directo.
        r = requests.get(f"http://localhost:8001/api/og/relato/{RELATO_ID}/imagen")
        cc = r.headers.get("Cache-Control", "")
        assert "max-age=3600" in cc, cc

    def test_id_malformado_400(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{ID_FORMATO_INVALIDO}/imagen")
        assert r.status_code == 400

    def test_id_inexistente_404(self):
        r = requests.get(f"{BASE_URL}/api/og/relato/{ID_INEXISTENTE}/imagen")
        assert r.status_code == 404
