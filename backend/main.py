import subprocess
import asyncio
import urllib.request
import urllib.error
import urllib.parse
import json
import socket
import shodan
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
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
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

@app.post("/api/forensics/image")
async def analyze_image(file: UploadFile = File(...)):
    try:
        image = Image.open(file.file)
        exif_raw = image._getexif()
        if not exif_raw:
            return {"status": "success", "message": "No EXIF data found.", "metadata": {}, "gps": None}
        metadata = {}
        gps_info = {}
        for tag_id, value in exif_raw.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for key in value.keys():
                    sub_tag = GPSTAGS.get(key, key)
                    gps_info[sub_tag] = value[key]
            else:
                metadata[tag] = str(value)
        gps_coords = None
        if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
            lat = get_decimal_from_dms(gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N"))
            lon = get_decimal_from_dms(gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "E"))
            gps_coords = {"lat": lat, "lon": lon}
        return {"status": "success", "filename": file.filename, "metadata": metadata, "gps": gps_coords}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/infrastructure/{target}")
async def map_infrastructure(target: str, api_key: str = ""):
    if not api_key:
        return {"status": "error", "message": "Shodan API Key is required."}
    try:
        try:
            ip_address = socket.gethostbyname(target)
        except socket.gaierror:
            return {"status": "error", "message": f"Could not resolve target: {target}"}

        api = shodan.Shodan(api_key)
        try:
            host_data = api.host(ip_address)
            services = []
            for item in host_data.get('data', []):
                raw_banner = (item.get("data") or "").strip()
                banner = raw_banner[:100] + ("..." if len(raw_banner) > 100 else "")
                services.append({
                    "port": item.get("port"),
                    "protocol": item.get("transport"),
                    "product": item.get("product", "Unknown"),
                    "banner": banner
                })
            return {
                "status": "success",
                "target": target,
                "ip": ip_address,
                "os": host_data.get("os", "Unknown"),
                "isp": host_data.get("org", "Unknown"),
                "country": host_data.get("country_name", "Unknown"),
                "vulns": host_data.get("vulns", []),
                "services": services
            }
        except shodan.APIError as e:
            if "No information available" in str(e):
                return {"status": "success", "target": target, "ip": ip_address, "message": "No Shodan data found for this IP. It may not be publicly exposed."}
            return {"status": "error", "message": f"Shodan Error: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/archive/{domain}")
async def web_archive_discovery(domain: str, limit: int = 100):
    if limit < 1 or limit > 1000:
        return {"status": "error", "message": "limit must be between 1 and 1000."}
    parsed = urllib.parse.urlparse(domain if "://" in domain else "http://" + domain)
    clean_domain = parsed.hostname or domain.split("/")[0]
    url = f"http://web.archive.org/cdx/search/cdx?url=*.{clean_domain}/*&output=json&fl=original,timestamp,mimetype,statuscode&collapse=urlkey&limit={limit}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Autonomous-Cyber-Suite"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if not data or len(data) <= 1:
                return {"status": "success", "target": clean_domain, "found": 0, "urls": []}
            results = []
            for row in data[1:]:
                results.append({"url": row[0], "timestamp": row[1], "mimetype": row[2], "status": row[3]})
            return {"status": "success", "target": clean_domain, "found": len(results), "urls": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
