"""Promote and repair public policies from collected external source records.

Run after deploy when normalization rules change:
    cd backend
    python scripts/normalize_external_policies.py
"""

from __future__ import annotations

from app.db.session import get_session_factory
from app.services.policy_normalization import promote_external_benefits_to_policies


def main() -> int:
    session_factory = get_session_factory()
    with session_factory() as db:
        result = promote_external_benefits_to_policies(db)
        db.commit()
    print(f"promoted_or_repaired={result.promoted_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
