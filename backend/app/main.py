import httpx
import os
import hashlib
from fastapi import FastAPI, Response, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import players, tt_players, football_national_teams, basketball_national_teams, basketball_clubs, auth, users, chat
from app.db.session import engine, Base
import app.models  # Import models to ensure they are registered with Base metadata
import uvicorn

# Create database tables
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not automatically create database tables on startup: {e}")



# Ensure cache directory exists
CACHE_DIR = "static/images"
os.makedirs(CACHE_DIR, exist_ok=True)

app = FastAPI(
    title="Sports Data API",
    description="Backend API for searching and viewing sports data.",
    version="1.0.0"
)

@app.get("/proxy-image")
async def proxy_image(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    # Generate a unique filename based on the URL
    url_hash = hashlib.md5(url.encode()).hexdigest()
    # Extract extension if possible, default to jpg
    ext = ".jpg"
    if ".png" in url.lower(): ext = ".png"
    elif ".svg" in url.lower(): ext = ".svg"
    elif ".webp" in url.lower(): ext = ".webp"
    
    cache_path = os.path.join(CACHE_DIR, f"{url_hash}{ext}")
    
    # Return cached image if it exists
    if os.path.exists(cache_path):
        return FileResponse(cache_path)

    async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
        try:
            url = url.strip()
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            }
            
            try:
                response = await client.get(url, headers=headers, follow_redirects=True)
            except Exception:
                response = await client.get(url, follow_redirects=True)
            
            if response.status_code == 200:
                # Save to cache
                with open(cache_path, "wb") as f:
                    f.write(response.content)
                
                content_type = response.headers.get("Content-Type", "image/jpeg")
                return Response(content=response.content, media_type=content_type)
            else:
                raise HTTPException(status_code=response.status_code, detail=f"Source returned {response.status_code}")
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")


from fastapi.middleware.gzip import GZipMiddleware

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
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(players.router, prefix="/players", tags=["Players"])
app.include_router(tt_players.router, prefix="/tt-players", tags=["Table Tennis"])
app.include_router(football_national_teams.router, prefix="/football-national-teams", tags=["Football National Teams"])
app.include_router(basketball_national_teams.router, prefix="/basketball-national-teams", tags=["Basketball National Teams"])
app.include_router(basketball_clubs.router, prefix="/basketball-clubs", tags=["Basketball Clubs"])



@app.post("/trigger", tags=["Admin"])
def trigger_scraper():
    import subprocess
    import os
    try:
        # Run scraper as a background process to avoid blocking API
        scraper_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scraper", "main_scraper.py"))
        subprocess.Popen(["python3", scraper_path])
        return {"message": "Scraper triggered in background"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/trigger-tt", tags=["Admin"])
def trigger_tt_scraper():
    import subprocess
    import os
    try:
        scraper_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scraper", "main_scraper.py"))
        subprocess.Popen(["python3", scraper_path, "--tt-only"])
        return {"message": "TT Scraper triggered in background"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/trigger-football-teams", tags=["Admin"])
def trigger_football_team_scraper():
    import subprocess
    import os
    try:
        scraper_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scraper", "main_scraper.py"))
        subprocess.Popen(["python3", scraper_path, "--football-only"])
        return {"message": "Football National Team Scraper triggered in background"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/trigger-basketball-clubs", tags=["Admin"])
def trigger_basketball_scraper():
    import subprocess
    import os
    try:
        scraper_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scraper", "main_scraper.py"))
        subprocess.Popen(["python3", scraper_path, "--basketball-only"])
        return {"message": "Basketball Club Scraper triggered in background"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Tennis Player Search API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
