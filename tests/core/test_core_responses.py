from backend.core.responses import GENERIC_ERROR, safe_handler


@safe_handler
def _ok():
    return {"a": 1}


@safe_handler
def _bad_payload():
    raise ValueError("Nama wajib diisi.")


@safe_handler
def _missing():
    raise LookupError("Menu tidak ditemukan.")


@safe_handler
def _denied():
    raise PermissionError("Peran Anda tidak berwenang.")


@safe_handler
def _db_down():
    raise RuntimeError("koneksi putus, password=rahasia")


def test_success_envelope():
    assert _ok() == {"success": True, "data": {"a": 1}, "error": None}


def test_value_error_becomes_failure():
    r = _bad_payload()
    assert r == {"success": False, "data": None, "error": "Nama wajib diisi."}


def test_lookup_and_permission():
    assert _missing()["error"] == "Menu tidak ditemukan."
    assert _denied()["success"] is False


def test_unexpected_error_is_not_leaked():
    r = _db_down()
    assert r["success"] is False
    assert r["error"] == GENERIC_ERROR
    assert "rahasia" not in r["error"]