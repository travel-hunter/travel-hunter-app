import app.models  # noqa: F401
from app.db.base import Base


def test_erd_v0_3_tables_are_registered() -> None:
    expected_tables = {
        "users",
        "auth_refresh_tokens",
        "password_reset_tokens",
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
        "user_notification_settings",
        "notification_deliveries",
        "recommendations",
    }

    assert expected_tables.issubset(set(Base.metadata.tables))


def test_erd_v0_3_decision_columns_are_registered() -> None:
    users = Base.metadata.tables["users"]
    policies = Base.metadata.tables["policies"]
    trip_invites = Base.metadata.tables["trip_invites"]
    user_notification_settings = Base.metadata.tables["user_notification_settings"]
    notification_deliveries = Base.metadata.tables["notification_deliveries"]
    password_reset_tokens = Base.metadata.tables["password_reset_tokens"]

    assert "preferred_regions" in users.c
    assert "gender" in users.c
    assert "phone_number" in users.c
    assert "phone_verified_at" in users.c
    assert "travel_style" in users.c
    assert "travel_budget" in users.c
    user_saved_policies = Base.metadata.tables["user_saved_policies"]
    assert "saved_at" in user_saved_policies.c
    assert "slug" in policies.c
    assert "apply_url" in policies.c
    assert "invite_token" in trip_invites.c
    assert "role" in trip_invites.c
    assert "deadline_enabled" in user_notification_settings.c
    assert "token_hash" in password_reset_tokens.c
    assert "expires_at" in password_reset_tokens.c
    assert "used_at" in password_reset_tokens.c
    assert "lead_day" in notification_deliveries.c
    assert "target_deadline_date" in notification_deliveries.c
    assert "status" in notification_deliveries.c
    notification_unique_columns = {
        column.name
        for constraint in notification_deliveries.constraints
        if constraint.__class__.__name__ == "UniqueConstraint"
        for column in constraint.columns
    }
    assert {
        "user_id",
        "policy_id",
        "channel",
        "lead_day",
        "target_deadline_date",
    }.issubset(notification_unique_columns)
    assert "trips_days" not in Base.metadata.tables
    assert "trips_members" not in Base.metadata.tables
    assert "trips_policies" not in Base.metadata.tables
