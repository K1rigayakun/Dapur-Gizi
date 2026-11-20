import pytest

from backend.core.config import load_settings
from backend.core.errors import ConfigError
from backend.database.client import create_supabase_client


def test_missing_credentials_raise_config_error():
    with pytest.raises(ConfigError):
        create_supabase_client(load_settings({}))