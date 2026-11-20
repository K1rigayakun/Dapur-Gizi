"""Utilitas pemetaan nama field.

Batas API frontend memakai **camelCase** (INTEGRATION.md). Kolom PostgreSQL
memakai **snake_case**. Pemetaan dilakukan eksplisit pada lapisan service;
modul ini menyediakan bantuan untuk kasus generik.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

_CAMEL_BOUNDARY = re.compile(r"(?<!^)(?=[A-Z])")


def to_camel(snake: str) -> str:
    parts = snake.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def to_snake(camel: str) -> str:
    return _CAMEL_BOUNDARY.sub("_", camel).lower()


def camelize_row(row: Mapping[str, Any]) -> dict[str, Any]:
    return {to_camel(key): value for key, value in row.items()}


def camelize_rows(rows: list[Mapping[str, Any]]) -> list[dict[str, Any]]:
    return [camelize_row(row) for row in rows]


def snakeize_row(row: Mapping[str, Any]) -> dict[str, Any]:
    return {to_snake(key): value for key, value in row.items()}


def pick(row: Mapping[str, Any], mapping: Mapping[str, str]) -> dict[str, Any]:
    """Petakan ``{apiKey: db_column}``; hanya kolom yang ada pada row."""
    return {
        api_key: row[column]
        for api_key, column in mapping.items()
        if column in row
    }
