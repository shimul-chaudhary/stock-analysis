import os
from google import genai
from google.genai import types

_base_url = os.environ.get("AI_INTEGRATIONS_GEMINI_BASE_URL")
_api_key = os.environ.get("AI_INTEGRATIONS_GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")

client = genai.Client(
    api_key=_api_key,
    http_options=types.HttpOptions(base_url=_base_url) if _base_url else None,
)


async def generate_json(prompt: str) -> str:
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=8192,
            response_mime_type="application/json",
        ),
    )
    return response.text or "{}"
