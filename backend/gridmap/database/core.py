from typing import Any, TypeVar

from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import JSON


class Base(AsyncAttrs, DeclarativeBase):
    """Base database model."""

    type_annotation_map = {dict[str, Any]: JSON}

    def to_dict(self):
        d = {field.name: getattr(self, field.name) for field in self.__table__.c}
        if "id" in d:
            d["id"] = str(d["id"])
        return d


BaseModelType = TypeVar("BaseModelType", bound="Base")
