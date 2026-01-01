from dataclasses import dataclass
from sqlalchemy.orm import Session


@dataclass
class RecipeAgentDeps:
    """Dependencies injected into recipe agent tools via RunContext"""

    db: Session  # SYNC Session - database.py uses create_engine(), not create_async_engine()
    user_id: int
