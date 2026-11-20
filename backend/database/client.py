"""Pembuat klien Supabase (hanya memakai anon key)."""

from supabase import Client, create_client

from backend.core.config import Settings


def create_supabase_client(settings: Settings) -> Client:
    url, key = settings.require_supabase()  # ConfigError bila belum diisi
    return create_client(url, key)