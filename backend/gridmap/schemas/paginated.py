from dataclasses import dataclass
from typing import Generic, List, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

M = TypeVar("M")


class PaginatedResponse(BaseModel, Generic[M]):
    count: int = Field(description="Number of items returned in the response")
    items: List[M] = Field(
        description="List of items returned in the response following given criteria"
    )


@dataclass
class PaginationQueryParams:
    limit: int = Query(100, ge=0)
    offset: int = Query(0, ge=0)
