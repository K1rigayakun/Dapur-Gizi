import pytest

from backend.core.config import load_settings
from backend.core.errors import ConfigError


def test_default_values():
    s = load_settings({})
    assert s.app_env == "development"
    assert s.app_port == 8000
    assert s.supabase_url is None


def test_invalid_env_rejected():
    with pytest.raises(ConfigError):
        load_settings({"APP_ENV": "staging"})


def test_non_numeric_port_rejected():
    with pytest.raises(ConfigError):
        load_settings({"APP_PORT": "abc"})


def test_placeholder_treated_as_missing():
    s = load_settings({"SUPABASE_URL": "https://your-project-id.supabase.co",
                       "SUPABASE_ANON_KEY": "your-supabase-anon-key-placeholder"})
    with pytest.raises(ConfigError):
        s.require_supabase()


def test_real_values_accepted():
    s = load_settings({"SUPABASE_URL": "https://abc.supabase.co", "SUPABASE_ANON_KEY": "kunci-test"})
    assert s.require_supabase() == ("https://abc.supabase.co", "kunci-test")