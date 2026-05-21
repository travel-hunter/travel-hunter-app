import app.models  # noqa: F401
from app.db.base import Base


def test_current_schema_tables_are_registered() -> None:
    expected_tables = {
        "users",
        "auth_refresh_tokens",
        "password_reset_tokens",
        "social_accounts",
        "policies",
        "policy_documents",
        "external_source_records",
        "phone_verification_codes",
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


def test_current_schema_decision_columns_are_registered() -> None:
    users = Base.metadata.tables["users"]
    policies = Base.metadata.tables["policies"]
    trip_invites = Base.metadata.tables["trip_invites"]
    user_notification_settings = Base.metadata.tables["user_notification_settings"]
    notification_deliveries = Base.metadata.tables["notification_deliveries"]
    password_reset_tokens = Base.metadata.tables["password_reset_tokens"]
    phone_verification_codes = Base.metadata.tables["phone_verification_codes"]
    external_source_records = Base.metadata.tables["external_source_records"]

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
    assert "user_id" in phone_verification_codes.c
    assert "phone_number" in phone_verification_codes.c
    assert "code_hash" in phone_verification_codes.c
    assert "expires_at" in phone_verification_codes.c
    assert "attempt_count" in phone_verification_codes.c
    assert "verified_at" in phone_verification_codes.c
    expected_external_source_columns = {
        "source_name",
        "source_type",
        "source_url",
        "source_category",
        "external_id",
        "canonical_key",
        "detail_url",
        "collected_page_url",
        "title",
        "organizer_text",
        "organizers",
        "region",
        "city",
        "is_nationwide",
        "status_text",
        "status",
        "start_date",
        "end_date",
        "benefit_text",
        "benefit_value_text",
        "extracted_amount_krw",
        "extracted_discount_percent",
        "benefit_value_type",
        "tags",
        "contact_text",
        "inferred_travel_styles",
        "confidence",
        "field_completeness",
        "raw_list_text",
        "raw_detail_text",
        "raw_payload",
        "last_fetched_at",
        "last_verified_at",
        "freshness_status",
        "created_at",
        "updated_at",
    }
    assert expected_external_source_columns.issubset(set(external_source_records.c.keys()))
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
