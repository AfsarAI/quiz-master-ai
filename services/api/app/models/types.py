import json
from sqlalchemy import TypeDecorator, Text
try:
    from pgvector.sqlalchemy import Vector as PgVector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

class FlexibleVector(TypeDecorator):
    """
    Type decorator that uses pgvector's Vector in PostgreSQL,
    and falls back to JSON-serialized floats in SQLite.
    """
    impl = Text
    cache_ok = True

    def __init__(self, dim: int = 1536):
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return dialect.type_descriptor(PgVector(self.dim))
        else:
            return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return value
        if isinstance(value, (list, tuple)):
            return json.dumps(list(value))
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return value
        return value
