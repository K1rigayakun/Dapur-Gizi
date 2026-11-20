# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec untuk DapurGizi.

CATATAN STATUS:
Konfigurasi ini disiapkan pada TASK 9, tetapi **belum diverifikasi dengan
build penuh** pada sesi ini. Jalankan dan periksa manual sebelum mengklaim
EXE production-ready:

    pyinstaller --clean --noconfirm DapurGizi.spec

Aturan keamanan:
- `.env` TIDAK dibundel. Konfigurasi dibaca dari environment/berkas di sisi
  pengguna atau dari mekanisme distribusi yang disetujui operator.
- `SUPABASE_SERVICE_ROLE_KEY` tidak boleh ada di EXE.
"""

from PyInstaller.utils.hooks import collect_submodules

hiddenimports = (
    collect_submodules("eel")
    + collect_submodules("bottle")
    + collect_submodules("gevent")
    + [
        "backend",
        "backend.auth",
        "backend.core",
        "backend.database",
        "backend.handlers",
        "backend.services",
        "dotenv",
        "supabase",
    ]
)

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=[],
    datas=[("web", "web")],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["pytest", "tkinter"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="DapurGizi",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
)
