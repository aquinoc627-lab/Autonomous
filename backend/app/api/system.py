from fastapi import APIRouter
import psutil

router = APIRouter()


@router.get("/stats")
async def get_system_stats():
    # interval=0.1 is required for the first CPU reading to be accurate
    return {
        "cpu": psutil.cpu_percent(interval=0.1),
        "ram": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage('/').percent,
        "status": "NOMINAL"
    }
