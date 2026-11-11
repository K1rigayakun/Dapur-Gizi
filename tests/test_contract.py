"""Unit tests for the DapurGizi foundation response contract."""

from backend import create_response
from main import get_app_status


def test_create_response_success() -> None:
    """Verify standard success response structure."""
    result = create_response(success=True, data={"items": []}, error=None)
    assert set(result.keys()) == {"success", "data", "error"}
    assert result["success"] is True
    assert result["data"] == {"items": []}
    assert result["error"] is None


def test_create_response_error() -> None:
    """Verify standard error response structure."""
    result = create_response(success=False, data=None, error="Validation failed")
    assert set(result.keys()) == {"success", "data", "error"}
    assert result["success"] is False
    assert result["data"] is None
    assert result["error"] == "Validation failed"


def test_get_app_status_contract() -> None:
    """Verify main shell status endpoint adheres to the integration contract."""
    status = get_app_status()
    assert status["success"] is True
    assert status["error"] is None
    assert isinstance(status["data"], dict)
    assert status["data"]["app_name"] == "DapurGizi"
    assert status["data"]["status"] == "ready"
