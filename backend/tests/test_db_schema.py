import app.models  # noqa: F401
from app.db.base import Base


def test_erd_v0_3_tables_are_registered() -> None:
    expected_tables = {
        "users",
        "auth_refresh_tokens",
        "social_accounts",
        "policies",
        "policy_documents",
        "trips",
        "trip_days",
        "trip_places",
        "trip_members",
        "trip_policies",
        "trip_invites",
        "user_saved_policies",
        "recommendations",
    }

    assert expected_tables.issubset(set(Base.metadata.tables))


def test_erd_v0_3_decision_columns_are_registered() -> None:
    users = Base.metadata.tables["users"]
    policies = Base.metadata.tables["policies"]
    trip_invites = Base.metadata.tables["trip_invites"]

    assert "preferred_regions" in users.c
    assert "gender" in users.c
    assert "travel_style" in users.c
    assert "travel_budget" in users.c
    user_saved_policies = Base.metadata.tables["user_saved_policies"]
    assert "saved_at" in user_saved_policies.c
    assert "slug" in policies.c
    assert "apply_url" in policies.c
    assert "invite_token" in trip_invites.c
    assert "role" in trip_invites.c
    assert "trips_days" not in Base.metadata.tables
    assert "trips_members" not in Base.metadata.tables
    assert "trips_policies" not in Base.metadata.tables
