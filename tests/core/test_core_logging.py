from backend.core.logging_setup import mask_sensitive


def test_nik_is_masked():
    assert "1271042105160001" not in mask_sensitive("NIK 1271042105160001 didaftarkan")


def test_password_is_masked():
    assert "rahasia123" not in mask_sensitive("login password=rahasia123 gagal")


def test_jwt_is_masked():
    token = "eyJhbGciOi.eyJzdWIiOiIx.abcDEF123"
    assert token not in mask_sensitive(f"token {token}")