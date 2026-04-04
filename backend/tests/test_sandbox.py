import pytest
import asyncio
from app.core.sandbox import CodeSandbox

@pytest.mark.asyncio
async def test_execute_shell_basic():
    """Test basic whitelisted shell command execution."""
    result = await CodeSandbox.execute_shell("echo 'Hello World'")
    assert result.exit_code == 0
    assert "Hello World" in result.stdout
    assert result.stderr == ""

@pytest.mark.asyncio
async def test_execute_shell_whitelist():
    """Test that non-whitelisted commands are blocked."""
    result = await CodeSandbox.execute_shell("rm -rf /")
    assert result.exit_code == 1
    assert "Security Error: Command 'rm' is not in the safe whitelist." in result.stderr

@pytest.mark.asyncio
async def test_execute_shell_injection_and():
    """Test command injection with '&&' is blocked."""
    result = await CodeSandbox.execute_shell("ls && echo 'Vulnerable'")
    assert result.exit_code != 0
    # The command 'ls' should try to access a file named '&&' and 'echo' and 'Vulnerable'
    assert "&&" in result.stderr
    assert "Vulnerable" not in result.stdout

@pytest.mark.asyncio
async def test_execute_shell_injection_backticks():
    """Test command injection with backticks is blocked."""
    result = await CodeSandbox.execute_shell("ls `echo Vulnerable2`")
    assert result.exit_code != 0
    assert "`echo" in result.stderr
    assert "Vulnerable2" not in result.stdout

@pytest.mark.asyncio
async def test_execute_shell_injection_semicolon():
    """Test command injection with ';' is blocked."""
    result = await CodeSandbox.execute_shell("ls; whoami")
    assert result.exit_code != 0
    assert ";" in result.stderr

@pytest.mark.asyncio
async def test_execute_python_basic():
    """Test basic python code execution."""
    result = await CodeSandbox.execute_python("print('Hello from Python')")
    assert result.exit_code == 0
    assert "Hello from Python" in result.stdout

@pytest.mark.asyncio
async def test_execute_python_forbidden_keywords():
    """Test that forbidden keywords are blocked in python execution."""
    result = await CodeSandbox.execute_python("import os; os.system('ls')")
    assert result.exit_code == 1
    assert "Security Error: Forbidden code detected." in result.stderr
