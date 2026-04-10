from pydantic import BaseModel
from fastapi import APIRouter
import logging
import subprocess
import shlex

router = APIRouter()
logger = logging.getLogger(__name__)


class CommandRequest(BaseModel):
    command: str


@router.post("/execute")
async def execute_command(request: CommandRequest):
    try:
        # Split command for safety, but allow basic arguments
        args = shlex.split(request.command)

        # Execute the command and capture output
        process = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=10  # Prevent hanging processes
        )

        return {
            "stdout": process.stdout,
            "stderr": process.stderr,
            "returncode": process.returncode
        }
    except Exception as e:
        logger.error("Terminal command execution failed: %s", e)
        return {"stdout": "", "stderr": "Command execution failed.", "returncode": 1}
