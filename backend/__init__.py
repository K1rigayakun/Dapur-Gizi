"""DapurGizi Backend Package.

Provides the standard response envelope helper used by all Eel-exposed
functions across backend modules.
"""

from typing import Any


def create_response(
    success: bool,
    data: Any = None,
    error: str | None = None,
) -> dict[str, Any]:
    """Build a standardized Eel response dictionary.

    Contract format:
    {
        "success": bool,
        "data": Any | None,
        "error": str | None
    }
    """
    return {
        "success": bool(success),
        "data": data,
        "error": error,
    }
