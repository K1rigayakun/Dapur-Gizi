"""Logging aplikasi dengan penyamaran data sensitif."""

import logging
import re

_PATTERNS = [
    # Token JWT (diawali eyJ)
    (re.compile(r"eyJ[\w-]+\.[\w-]+\.[\w-]+"), "[TOKEN]"),
    # password=..., token: ..., secret=..., api_key=...
    (
        re.compile(r"(?i)(password|passwd|token|apikey|api_key|secret)(\"?\s*[:=]\s*\"?)[^\s\",}]+"),
        r"\1\2[DISAMARKAN]",
    ),
    # Deret 10-16 digit (NIK/NISN)
    (re.compile(r"\b\d{10,16}\b"), "[ID-DISAMARKAN]"),
]


def mask_sensitive(text: str) -> str:
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = mask_sensitive(record.getMessage())
        record.args = ()
        return True


def get_logger(name: str = "dapurgizi") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:  # cegah handler ganda
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        )
        handler.addFilter(SensitiveDataFilter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger