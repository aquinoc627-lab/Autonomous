"""
Autonomous — Secure Code Execution Sandbox

Provides a restricted environment for agents to execute Python code and shell commands.
Includes resource limits, input sanitization, and audit logging.
"""

import asyncio
import logging
import os
import shlex
import tempfile
from typing import Any, Dict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sandbox Configuration
# ---------------------------------------------------------------------------
SANDBOX_TIMEOUT = 10  # seconds
MAX_OUTPUT_SIZE = 1024 * 100  # 100 KB
FORBIDDEN_KEYWORDS = [
    "rm -rf", "mkfs", "dd if=", "shutdown", "reboot",
    "os.system", "subprocess.call", "eval(", "exec("
]


class SandboxResult:
    def __init__(self, stdout: str, stderr: str, exit_code: int, duration: float):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.duration = duration

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "duration": self.duration,
            "success": self.exit_code == 0
        }


class CodeSandbox:
    """
    A secure environment for executing code and commands.
    """

    @staticmethod
    def sanitize_input(content: str) -> bool:
        """
        Check for forbidden keywords in the input.
        """
        for keyword in FORBIDDEN_KEYWORDS:
            if keyword in content:
                logger.warning(f"Security Alert: Forbidden keyword '{keyword}' detected in input.")
                return False
        return True

    @classmethod
    async def execute_python(cls, code: str) -> SandboxResult:
        """
        Execute Python code in a temporary file and return the result.
        """
        if not cls.sanitize_input(code):
            return SandboxResult("", "Security Error: Forbidden code detected.", 1, 0.0)

        with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as tmp:
            tmp.write(code)
            tmp_path = tmp.name

        start_time = asyncio.get_event_loop().time()
        try:
            process = await asyncio.create_subprocess_exec(
                "python3", tmp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=SANDBOX_TIMEOUT)
                exit_code = process.returncode or 0
            except asyncio.TimeoutError:
                process.kill()
                stdout, stderr = b"", b"Execution Timeout: Code took too long to run."
                exit_code = -1

            duration = asyncio.get_event_loop().time() - start_time
            return SandboxResult(
                stdout.decode()[:MAX_OUTPUT_SIZE],
                stderr.decode()[:MAX_OUTPUT_SIZE],
                exit_code,
                duration
            )

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    @classmethod
    async def execute_shell(cls, command: str) -> SandboxResult:
        """
        Execute a shell command and return the result.
        """
        if not cls.sanitize_input(command):
            return SandboxResult("", "Security Error: Forbidden command detected.", 1, 0.0)

        # Only allow a whitelist of safe commands
        safe_commands = ["ls", "cat", "grep", "find", "echo", "pwd", "whoami", "date", "uptime"]
        cmd_parts = shlex.split(command)
        if not cmd_parts or cmd_parts[0] not in safe_commands:
            return SandboxResult("", f"Security Error: Command '{cmd_parts[0] if cmd_parts else ''}' is not in the safe whitelist.", 1, 0.0)

        start_time = asyncio.get_event_loop().time()
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd_parts,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=SANDBOX_TIMEOUT)
                exit_code = process.returncode or 0
            except asyncio.TimeoutError:
                process.kill()
                stdout, stderr = b"", b"Execution Timeout: Command took too long to run."
                exit_code = -1

            duration = asyncio.get_event_loop().time() - start_time
            return SandboxResult(
                stdout.decode()[:MAX_OUTPUT_SIZE],
                stderr.decode()[:MAX_OUTPUT_SIZE],
                exit_code,
                duration
            )
        except Exception as e:
            return SandboxResult("", str(e), 1, 0.0)
