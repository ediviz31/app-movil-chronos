"""
Genera audio TTS de una crónica usando OpenAI TTS vía Emergent LLM key.
Uso: python3 generate_tts.py <output_path> <voice>
Stdin: el texto a narrar (UTF-8)
"""
import os
import sys
import asyncio
from dotenv import load_dotenv

# load .env from backend dir
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from emergentintegrations.llm.openai import OpenAITextToSpeech


async def main():
    if len(sys.argv) < 3:
        print("Uso: generate_tts.py <output_path> <voice>", file=sys.stderr)
        sys.exit(1)

    output_path = sys.argv[1]
    voice = sys.argv[2]  # onyx | echo | sage | etc.

    # Leer texto desde stdin (binario UTF-8)
    text = sys.stdin.buffer.read().decode('utf-8').strip()
    if not text:
        print("Texto vacío", file=sys.stderr)
        sys.exit(1)

    # OpenAI TTS limit: 4096 caracteres
    if len(text) > 4090:
        text = text[:4090].rsplit('.', 1)[0] + '.'

    api_key = os.getenv('EMERGENT_LLM_KEY') or os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Falta EMERGENT_LLM_KEY", file=sys.stderr)
        sys.exit(1)

    tts = OpenAITextToSpeech(api_key=api_key)
    audio_bytes = await tts.generate_speech(
        text=text,
        model="tts-1",
        voice=voice,
        response_format="mp3"
    )
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(audio_bytes)

    print(f"OK {output_path} {len(audio_bytes)} bytes")


if __name__ == '__main__':
    asyncio.run(main())
