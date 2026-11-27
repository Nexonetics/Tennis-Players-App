import asyncio
import hashlib
import ipaddress
import os
from urllib.parse import urljoin, urlsplit

import httpx
from fastapi import FastAPI, Response, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from mangum import Mangum

from app.api.endpoints import players, tt_players, football_national_teams, basketball_national_teams, basketball_clubs, college_basketball
from app.db.session import engine, Base
import app.models  # Import models to ensure they are registered with Base metadata

ON_LAMBDA = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

# Creating tables costs database round trips on every Lambda cold start, and the tables
# already exist in Neon, so the Lambda deployment sets AUTO_CREATE_TABLES=0.
if os.getenv("AUTO_CREATE_TABLES", "1") == "1":
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not automatically create database tables on startup: {e}")

# Lambda's filesystem is read-only except /tmp.
CACHE_DIR = os.getenv("IMAGE_CACHE_DIR") or ("/tmp/images" if ON_LAMBDA else "static/images")
os.makedirs(CACHE_DIR, exist_ok=True)

# Lambda responses are capped at 6 MB after base64 encoding, so images must stay under ~4.5 MB.
MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_REDIRECTS = 3
ALLOWED_CONTENT_TYPES = ("image/", "application/octet-stream")
PROXY_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}

app = FastAPI(
    title="Sports Data API",
    description="Backend API for searching and viewing sports data.",
    version="1.0.0"
)


async def _assert_public_http_url(url: str) -> None:
    """Allow only http(s) URLs whose host resolves to public addresses, so the proxy
    can't be pointed at localhost, private networks, or cloud metadata/runtime endpoints."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise HTTPException(status_code=400, detail="Only http(s) image URLs are allowed")
    port = parts.port or (443 if parts.scheme == "https" else 80)
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(parts.hostname, port)
    except OSError:
        raise HTTPException(status_code=400, detail="Image host could not be resolved")
    if not infos or any(not ipaddress.ip_address(info[4][0]).is_global for info in infos):
        raise HTTPException(status_code=400, detail="Image host is not allowed")


async def _fetch_image(client: httpx.AsyncClient, url: str) -> tuple[bytes, str]:
    target = url
    for _ in range(MAX_REDIRECTS + 1):
        # Redirects are followed by hand so every hop is re-checked.
        await _assert_public_http_url(target)
        async with client.stream("GET", target, headers=PROXY_HEADERS) as response:
            if response.is_redirect:
                target = urljoin(target, response.headers.get("location", ""))
                continue
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Source returned {response.status_code}")
            content_type = response.headers.get("Content-Type", "image/jpeg")
            if not content_type.lower().startswith(ALLOWED_CONTENT_TYPES):
                raise HTTPException(status_code=415, detail="Source is not an image")
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body.extend(chunk)
                if len(body) > MAX_IMAGE_BYTES:
                    raise HTTPException(status_code=413, detail="Image is too large")
            return bytes(body), content_type
    raise HTTPException(status_code=502, detail="Too many redirects")


@app.get("/proxy-image")
async def proxy_image(url: str):
    url = url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Generate a unique filename based on the URL
    url_hash = hashlib.md5(url.encode()).hexdigest()
    # Extract extension if possible, default to jpg
    lower = url.lower()
    ext = ".jpg"
    if ".png" in lower: ext = ".png"
    elif ".svg" in lower: ext = ".svg"
    elif ".webp" in lower: ext = ".webp"

    cache_path = os.path.join(CACHE_DIR, f"{url_hash}{ext}")

    # Return cached image if it exists
    if os.path.exists(cache_path):
        return FileResponse(cache_path)

    async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
        try:
            content, content_type = await _fetch_image(client, url)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Proxy error: {e}")

    try:
        with open(cache_path, "wb") as f:
            f.write(content)
    except OSError as e:
        print(f"Warning: could not cache image {url_hash}: {e}")

    return Response(content=content, media_type=content_type)


# Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routes
app.include_router(players.router, prefix="/players", tags=["Players"])
app.include_router(tt_players.router, prefix="/tt-players", tags=["Table Tennis"])
app.include_router(football_national_teams.router, prefix="/football-national-teams", tags=["Football National Teams"])
app.include_router(basketball_national_teams.router, prefix="/basketball-national-teams", tags=["Basketball National Teams"])
app.include_router(basketball_clubs.router, prefix="/basketball-clubs", tags=["Basketball Clubs"])
app.include_router(college_basketball.router, prefix="/college-basketball", tags=["College Basketball"])

# Scraping runs in GitHub Actions (.github/workflows/daily_scrape.yml), not in the API:
# Lambda freezes once a response is sent, so it can't host background scraper processes.


@app.get("/")
def read_root():
    return {"message": "Welcome to the Tennis Player Search API"}


# AWS Lambda entry point (backend/deploy_lambda.sh deploys it as app.main.handler).
handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
