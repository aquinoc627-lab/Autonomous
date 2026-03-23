import subprocess
import asyncio
import urllib.request
import urllib.error
import urllib.parse
import json
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS, IFD
import uvicorn

app = FastAPI(
    title="Autonomous Cyber Suite API",
    description="Backend API for the Interactive Cyber Suite",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "message": "Autonomous API is running smoothly.",
        "active_modules": ["core"]
    }

@app.get("/api/osint/sherlock/{username}")
async def run_sherlock(username: str):
    results = []
    cmd = ["sherlock", username, "--print-found", "--timeout", "3"]
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        output = stdout.decode()
        for line in output.split('\n'):
            if "[+]" in line:
                parts = line.split(":")
                if len(parts) >= 3:
                    site = parts[0].replace("[+]", "").strip()
                    url = ":".join(parts[1:]).strip()
                    results.append({"site": site, "url": url})
        return {"target": username, "status": "success", "accounts_found": len(results), "results": results}
    except FileNotFoundError:
        return {"status": "error", "message": "Sherlock is not installed or not in PATH."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/breach/{email}")
async def check_breach(email: str, api_key: str = ""):
    if not api_key:
        return {"status": "error", "message": "HIBP API Key is required for email lookups."}
    url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{urllib.parse.quote(email)}?truncateResponse=false"
    headers = {"hibp-api-key": api_key, "user-agent": "Autonomous-Cyber-Suite"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return {"status": "success", "target": email, "found": len(data), "breaches": data}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"status": "success", "target": email, "found": 0, "breaches": []}
        elif e.code == 401:
            return {"status": "error", "message": "Invalid HIBP API Key."}
        elif e.code == 429:
            return {"status": "error", "message": "Rate limit exceeded."}
        else:
            return {"status": "error", "message": f"HTTP Error {e.code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_decimal_from_dms(dms, ref):
    """Converts GPS degrees, minutes, seconds to decimal degrees.

    Args:
        dms: A sequence of three numeric values representing degrees, minutes,
             and seconds (e.g., ``(51, 30, 0)``).
        ref: Cardinal direction reference string — ``'N'``, ``'S'``, ``'E'``,
             or ``'W'``.  Southern and western values are negated.

    Returns:
        float: Decimal-degree representation of the coordinate.
    """
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

@app.post("/api/forensics/image")
async def analyze_image(file: UploadFile = File(...)):
    """Extracts EXIF data and GPS coordinates from an uploaded image."""
    try:
        image = Image.open(file.file)
        exif = image.getexif()

        if not exif:
            return {"status": "success", "message": "No EXIF data found.", "metadata": {}, "gps": None}

        metadata = {}
        gps_info = {}

        for tag_id, value in exif.items():
            tag = TAGS.get(tag_id, tag_id)
            metadata[tag] = str(value)

        raw_gps = exif.get_ifd(IFD.GPSInfo)
        for key, value in raw_gps.items():
            sub_tag = GPSTAGS.get(key, key)
            gps_info[sub_tag] = value
                
        gps_coords = None
        if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
            lat = get_decimal_from_dms(gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N"))
            lon = get_decimal_from_dms(gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "E"))
            gps_coords = {"lat": lat, "lon": lon}
            
        return {
            "status": "success",
            "filename": file.filename,
            "metadata": metadata,
            "gps": gps_coords
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
