from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import os
import subprocess
import asyncio
import urllib.request
import urllib.error
import urllib.parse
import json
import socket
import re
import shodan
import requests
from urllib.parse import urlparse
import urllib3
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

# Suppress insecure request warnings for targets without valid SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

app = FastAPI(
    title="Autonomous Cyber Suite API",
    description="Backend API for the Interactive Cyber Suite",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
# Enable CORS so the JS frontend can make requests to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
async def get_status():
    """Health check endpoint to verify the backend is running."""
    return {
        "status": "online",
        "message": "Autonomous API is running smoothly.",
        "active_modules": ["core"]
    }

@app.get("/api/osint/sherlock/{username}")
async def run_sherlock(username: str):
    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        return {"status": "error", "message": "Invalid username. Only alphanumeric characters, underscores, and dashes are allowed."}

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

    def _do_hibp_request():
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())

    try:
        data = await asyncio.to_thread(_do_hibp_request)
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
    if ref.upper() in ['S', 'W']:
        decimal = -decimal
    return decimal

@app.post("/api/forensics/image")
async def analyze_image(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        if len(file_bytes) > MAX_UPLOAD_SIZE:
            return {"status": "error", "message": "File too large. Maximum upload size is 10MB."}
        await file.seek(0)

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
            host_data = await asyncio.to_thread(api.host, ip_address)
            services = []
            for item in host_data.get('data', []):
                services.append({
                    "port": item.get("port"),
                    "protocol": item.get("transport"),
                    "product": item.get("product", "Unknown"),
                    "banner": item.get("data", "").strip()[:100] + "..."
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
    clean_domain = domain.replace("http://", "").replace("https://", "").split("/")[0]
    url = f"http://web.archive.org/cdx/search/cdx?url=*.{clean_domain}/*&output=json&fl=original,timestamp,mimetype,statuscode&collapse=urlkey&limit={limit}"

    def _do_archive_request():
        req = urllib.request.Request(url, headers={"User-Agent": "Autonomous-Cyber-Suite"})
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())

    try:
        data = await asyncio.to_thread(_do_archive_request)
        if not data or len(data) <= 1:
            return {"status": "success", "target": clean_domain, "found": 0, "urls": []}
        results = []
        for row in data[1:]:
            results.append({"url": row[0], "timestamp": row[1], "mimetype": row[2], "status": row[3]})
        return {"status": "success", "target": clean_domain, "found": len(results), "urls": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/validate")
async def validate_target(target_url: str):
    if not target_url.startswith(("http://", "https://")):
        target_url = "http://" + target_url

    # Parse and validate the target URL before making any requests (SSRF prevention)
    parsed = urlparse(target_url)
    hostname = parsed.hostname or ""
    if not hostname:
        return {"status": "error", "message": "Invalid target URL: missing hostname."}

    # Only allow http/https schemes
    if parsed.scheme not in ("http", "https"):
        return {"status": "error", "message": "Only http and https URLs are supported."}

    # Resolve the hostname and block requests to private/loopback addresses
    try:
        resolved_ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(resolved_ip)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved:
            return {"status": "error", "message": "Scanning private or internal IP addresses is not permitted."}
    except socket.gaierror:
        return {"status": "error", "message": f"Could not resolve host: {hostname}"}
    except ValueError:
        return {"status": "error", "message": "Invalid target URL."}

    # Build a sanitized URL from only the validated components
    safe_netloc = parsed.netloc
    safe_path = parsed.path or "/"
    safe_url = f"{parsed.scheme}://{safe_netloc}{safe_path}"
    base_url = f"{parsed.scheme}://{safe_netloc}"

    results = {
        "target": safe_url,
        "server_info": "Unknown",
        "missing_headers": [],
        "present_headers": {},
        "sensitive_files": []
    }
    
    try:
        resp = await asyncio.to_thread(requests.get, safe_url, timeout=5, verify=False)
        lower_headers = {k.lower(): v for k, v in resp.headers.items()}

        results["server_info"] = resp.headers.get("Server", "Unknown")

        security_headers = {
            "strict-transport-security": "Protects against MITM attacks (HSTS)",
            "x-frame-options": "Protects against Clickjacking",
            "x-content-type-options": "Protects against MIME sniffing",
            "content-security-policy": "Protects against XSS and data injection",
            "x-xss-protection": "Deprecated — may introduce vulnerabilities; recommend removing or setting to '0'"
        }

        for header, desc in security_headers.items():
            if header in lower_headers:
                results["present_headers"][header] = lower_headers[header]
            else:
                results["missing_headers"].append({"header": header, "risk": desc})

        files_to_check = ["/robots.txt", "/sitemap.xml", "/.git/HEAD", "/.env", "/.DS_Store"]
        
        for f in files_to_check:
            try:
                file_resp = await asyncio.to_thread(requests.get, base_url + f, timeout=3, verify=False)
                content_type = file_resp.headers.get("content-type", "").lower()
                # Flag the file as exposed if the server returns 200 and the response
                # does not appear to be a generic HTML error/redirect page.
                if file_resp.status_code == 200 and "text/html" not in content_type:
                    results["sensitive_files"].append(f)
                elif file_resp.status_code == 200 and f in ("/robots.txt", "/sitemap.xml"):
                    # These files may be served as text/html on some platforms; include them.
                    results["sensitive_files"].append(f)
            except Exception:
                continue
                
        return {"status": "success", "data": results}

    except requests.exceptions.RequestException as e:
        return {"status": "error", "message": f"Could not connect to target: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
