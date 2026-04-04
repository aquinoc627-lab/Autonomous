import pytest
from app.core.command_engine import _sanitize_value, CommandGenerationError

def test_sanitize_value_happy_paths():
    """Test that safe strings pass through unchanged."""
    safe_values = [
        "",
        "hello",
        "12345",
        "valid-hostname.com",
        "underscore_name",
        "spaces are usually fine",
        "path/with/slashes",
        "user@domain.com",
        "192.168.1.1/24",
    ]
    for val in safe_values:
        assert _sanitize_value(val, "test_param") == val


def test_sanitize_value_dangerous_chars():
    """Test that individual dangerous characters trigger the exception."""
    # [;&|`$(){}!<>]
    dangerous_chars = [
        ";", "&", "|", "`", "$", "(", ")", "{", "}", "!", "<", ">"
    ]
    for char in dangerous_chars:
        with pytest.raises(CommandGenerationError) as exc_info:
            _sanitize_value(f"test{char}test", "test_param")
        assert "contains forbidden characters" in str(exc_info.value)


def test_sanitize_value_complex_injections():
    """Test realistic injection attack vectors."""
    injections = [
        "rm -rf /;",
        "$(whoami)",
        "test&echo 1",
        "`cat /etc/passwd`",
        "value|nc -e /bin/sh",
        "192.168.1.1; ls -la",
        "some_value && rm -rf *",
        "value > out.txt",
        "value < in.txt",
    ]
    for vector in injections:
        with pytest.raises(CommandGenerationError):
            _sanitize_value(vector, "target_ip")
