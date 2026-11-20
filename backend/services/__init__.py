"""Paket service domain DapurGizi.

Kepemilikan:
- ``budget``, ``dashboard``, ``identity`` : Gabriel (platform & integrasi).
- ``beneficiaries``, ``menus``, ``nutrition``, ``production`` : Wiliam.
- ``distribution``, ``food_safety``, ``reports`` : Visel.

Service milik Wiliam/Visel dimuat secara lazy oleh
``backend.core.container.ServiceRegistry`` dan tidak diduplikasi di sini.
"""
