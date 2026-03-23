from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="Autonomous Cyber Suite API",
    description="Backend API for the Interactive Cyber Suite",
    version="1.0.0"
)

# Enable CORS so the JS frontend can make requests to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (update for production)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/api/status")
async def get_status():
    """Health check endpoint to verify the backend is running."""
    return {
        "status": "online",
        "message": "Autonomous API is running smoothly.",
        "active_modules": ["core"]
    }

if __name__ == "__main__":
    # Run the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
