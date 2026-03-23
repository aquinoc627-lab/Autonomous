import subprocess
import asyncio
import re
import urllib.request
import urllib.error
import urllib.parse
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    """
    Runs Sherlock against a target username and returns discovered accounts.
    """
    # Validate username: only allow alphanumeric characters, hyphens, underscores, and dots
    if not re.match(r'^[\w.\-]{1,64}$', username):
        raise HTTPException(status_code=400, detail="Invalid username. Only alphanumeric characters, hyphens, underscores, and dots are allowed.")

    results = []
    
    # Run sherlock via subprocess. We use --print-found to only get successful hits.
    cmd = ["sherlock", username, "--print-found", "--timeout", "3"]
    
    try:
        # Run the process asynchronously
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        output = stdout.decode()
        
        # Parse the output
        for line in output.split('\n'):
            if "[+]" in line:
                parts = line.split(":")
                if len(parts) >= 3:
                    site = parts[0].replace("[+]", "").strip()
                    url = ":".join(parts[1:]).strip()
                    results.append({"site": site, "url": url})
                    
        return {
            "target": username,
            "status": "success",
            "accounts_found": len(results),
            "results": results
        }
        
    except FileNotFoundError:
        return {"status": "error", "message": "Sherlock is not installed or not in PATH."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/breach/{email}")
async def check_breach(email: str, api_key: str = ""):
    """
    Checks HaveIBeenPwned for breaches associated with an email.
    Requires an HIBP API key passed as a query parameter.
    """
    if not api_key:
        return {"status": "error", "message": "HIBP API Key is required for email lookups."}
    
    # HIBP v3 API endpoint
    url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{urllib.parse.quote(email)}?truncateResponse=false"
    
    headers = {
        "hibp-api-key": api_key,
        "user-agent": "Autonomous-Cyber-Suite"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return {"status": "success", "target": email, "found": len(data), "breaches": data}
            
    except urllib.error.HTTPError as e:
        if e.code == 404:
            # 404 means no breaches found (which is good!)
            return {"status": "success", "target": email, "found": 0, "breaches": []}
        elif e.code == 401:
            return {"status": "error", "message": "Invalid HIBP API Key."}
        elif e.code == 429:
            return {"status": "error", "message": "Rate limit exceeded."}
        else:
            return {"status": "error", "message": f"HTTP Error {e.code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
