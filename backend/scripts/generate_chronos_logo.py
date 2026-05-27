"""
Generador de logo Chronos usando Gemini Nano Banana.
Se ejecuta UNA VEZ para crear los íconos PWA.
"""
import asyncio
import os
import base64
import sys
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from PIL import Image
from io import BytesIO

# Cargar .env del backend
load_dotenv('/app/backend/.env')

OUT_DIR = '/app/frontend/public/icons'
os.makedirs(OUT_DIR, exist_ok=True)

PROMPT = """Create a square app icon logo (1024x1024) for "Chronos", a historical archive social network.

Style: museum / archive / heraldic / neoclassical / vintage emblem.
- Centered ornamental golden hourglass (#d4b878) as the main subject, intricate filigree details
- Background: deep midnight navy (#0a1228), with subtle radial gradient (slightly lighter navy in the center)
- A thin gold double-line decorative frame near the edges with small ornamental corners (flame/fleur-de-lis style)
- Small star-burst or compass-rose detail above and below the hourglass
- NO text, NO letters, NO words anywhere in the image
- Symmetrical, elegant, professional, suitable for an app icon
- High contrast so it's visible at small sizes (192x192)
- Painterly metallic gold for the hourglass with soft glow
- Aged parchment texture barely visible
- The composition should breathe - leave some space around the hourglass for the rounded-corner mask of mobile OS

Return only one polished image."""

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("ERROR: EMERGENT_LLM_KEY no encontrada", file=sys.stderr)
        sys.exit(1)

    chat = LlmChat(
        api_key=api_key,
        session_id="chronos-logo-gen",
        system_message="You are a senior brand designer specialized in heraldic and neoclassical emblems."
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    print("Generando logo maestro con Gemini Nano Banana...", flush=True)
    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    print(f"Texto: {text[:80] if text else '(vacío)'}", flush=True)
    print(f"Imágenes generadas: {len(images) if images else 0}", flush=True)

    if not images:
        print("ERROR: No se generaron imágenes", file=sys.stderr)
        sys.exit(1)

    # Guardar la imagen maestra
    master_bytes = base64.b64decode(images[0]['data'])
    master_path = os.path.join(OUT_DIR, 'chronos-master.png')
    with open(master_path, 'wb') as f:
        f.write(master_bytes)
    print(f"Maestra guardada en {master_path}", flush=True)

    # Generar tamaños PWA estándar a partir del maestro
    master = Image.open(BytesIO(master_bytes)).convert('RGBA')
    # Asegurar cuadrado
    s = min(master.size)
    left = (master.size[0] - s) // 2
    top = (master.size[1] - s) // 2
    master = master.crop((left, top, left + s, top + s))

    sizes = {
        'icon-192.png': 192,
        'icon-256.png': 256,
        'icon-384.png': 384,
        'icon-512.png': 512,
        'apple-touch-icon.png': 180,
        'favicon-32.png': 32,
        'favicon-16.png': 16,
    }
    for name, size in sizes.items():
        resized = master.resize((size, size), Image.LANCZOS)
        path = os.path.join(OUT_DIR, name)
        resized.save(path, 'PNG', optimize=True)
        print(f"  -> {path} ({size}x{size})", flush=True)

    # favicon.ico multi-size
    ico_path = os.path.join(OUT_DIR, '..', 'favicon.ico')
    master.resize((32, 32), Image.LANCZOS).save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"  -> {ico_path}", flush=True)

    print("\n✅ Todos los íconos generados.", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
