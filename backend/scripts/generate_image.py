"""
Genera una imagen histórica con Gemini Nano Banana (vía emergentintegrations).
Uso (desde Node.js child_process):
    python generate_image.py "<output_path>" "<prompt>" [estilo]

Output: imprime la ruta del archivo generado en stdout al terminar.
Errores: stderr con prefijo "ERROR:".
"""
import sys
import os
import base64
import asyncio
import uuid
from dotenv import load_dotenv

load_dotenv()

STYLE_PROMPTS = {
    'pergamino': (
        "in the style of an aged historical parchment painting, sepia tones, "
        "fine ink lines, warm golden lighting, classical brushwork, "
        "antique aesthetic, slight paper grain texture"
    ),
    'cinematic': (
        "epic cinematic historical scene, dramatic lighting, painterly, "
        "highly detailed, atmospheric"
    ),
    'realista': (
        "realistic painted historical depiction, detailed textures, "
        "natural lighting, museum quality"
    ),
}


async def main():
    if len(sys.argv) < 3:
        print('ERROR: usage: generate_image.py <output_path> <prompt> [estilo]', file=sys.stderr)
        sys.exit(2)

    output_path = sys.argv[1]
    prompt = sys.argv[2]
    estilo = sys.argv[3] if len(sys.argv) > 3 else 'pergamino'

    api_key = os.getenv('EMERGENT_LLM_KEY')
    if not api_key:
        print('ERROR: EMERGENT_LLM_KEY not configured', file=sys.stderr)
        sys.exit(3)

    style_hint = STYLE_PROMPTS.get(estilo, STYLE_PROMPTS['pergamino'])
    full_prompt = f"{prompt}. {style_hint}"

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    chat = LlmChat(
        api_key=api_key,
        session_id=f"chronos-img-{uuid.uuid4().hex[:10]}",
        system_message='You are an artist creating evocative historical illustrations.'
    )
    chat.with_model('gemini', 'gemini-3.1-flash-image-preview') \
        .with_params(modalities=['image', 'text'])

    msg = UserMessage(text=full_prompt)
    text, images = await chat.send_message_multimodal_response(msg)

    if not images:
        print('ERROR: no image returned', file=sys.stderr)
        sys.exit(4)

    image_bytes = base64.b64decode(images[0]['data'])
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(image_bytes)

    print(output_path)


if __name__ == '__main__':
    asyncio.run(main())
