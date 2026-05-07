import hashlib
import hmac
from datetime import date

import httpx
import pytest

from app.core.config import Settings
from app.services.kakao_alimtalk import (
    SOLAPI_SEND_PATH,
    SolapiAlimTalkClient,
    build_solapi_deadline_message,
    create_solapi_authorization_header,
    normalize_korean_mobile_number,
    parse_solapi_send_response,
    template_id_for_lead_day,
)
from app.services.notification_delivery import NotificationDeliveryTarget


def make_settings(**overrides) -> Settings:
    values = {
        "kakao_alimtalk_enabled": True,
        "solapi_base_url": "https://api.solapi.test",
        "solapi_api_key": "test-api-key",
        "solapi_api_secret": "test-api-secret",
        "solapi_pf_id": "KA01PF123456",
        "solapi_template_id_d7": "TPL-D7",
        "solapi_template_id_d1": "TPL-D1",
        "solapi_from_number": "0212345678",
        "solapi_disable_sms": True,
        "solapi_timeout_seconds": 3,
        "travel_hunter_public_base_url": "https://travel.example",
    }
    values.update(overrides)
    return Settings(**values)


def make_target(*, lead_day: int = 7, phone_number: str | None = "010-1234-5678"):
    return NotificationDeliveryTarget(
        deliveryId=77,
        userId=7,
        userName="테스트 사용자",
        policyId=11,
        policyTitle="지역사랑 휴가지원",
        policySlug="local-vacation",
        phoneNumber=phone_number,
        leadDay=lead_day,
        targetDeadlineDate=date(2026, 5, 14),
        channel="kakao_alimtalk",
        deliveryStatus="pending",
    )


def response(status_code: int, payload: dict) -> httpx.Response:
    return httpx.Response(
        status_code,
        json=payload,
        request=httpx.Request("POST", "https://api.solapi.test/messages"),
    )


def test_solapi_authorization_header_uses_hmac_sha256_signature() -> None:
    header = create_solapi_authorization_header(
        api_key="api-key",
        api_secret="secret",
        date_time="2026-05-07T00:00:00Z",
        salt="fixed-salt",
    )
    expected_signature = hmac.new(
        b"secret",
        b"2026-05-07T00:00:00Zfixed-salt",
        hashlib.sha256,
    ).hexdigest()

    assert header == (
        "HMAC-SHA256 apiKey=api-key, date=2026-05-07T00:00:00Z, "
        f"salt=fixed-salt, signature={expected_signature}"
    )


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("010-1234-5678", "01012345678"),
        ("+82 10 1234 5678", "01012345678"),
        ("821012345678", "01012345678"),
        ("0212345678", None),
        ("0101234567", None),
        (None, None),
    ],
)
def test_normalize_korean_mobile_number(raw, expected) -> None:
    assert normalize_korean_mobile_number(raw) == expected


def test_template_id_for_lead_day_selects_d7_and_d1() -> None:
    settings = make_settings()

    assert template_id_for_lead_day(settings, 7) == "TPL-D7"
    assert template_id_for_lead_day(settings, 1) == "TPL-D1"

    with pytest.raises(ValueError):
        template_id_for_lead_day(settings, 3)


def test_solapi_deadline_message_contains_ata_kakao_options_and_variables() -> None:
    settings = make_settings()
    message = build_solapi_deadline_message(
        make_target(lead_day=7),
        to_number="01012345678",
        settings_obj=settings,
    )

    assert message["to"] == "01012345678"
    assert message["from"] == "0212345678"
    assert message["type"] == "ATA"
    assert message["country"] == "82"
    assert message["kakaoOptions"]["pfId"] == "KA01PF123456"
    assert message["kakaoOptions"]["templateId"] == "TPL-D7"
    assert message["kakaoOptions"]["disableSms"] is True
    assert message["kakaoOptions"]["variables"] == {
        "#{사용자명}": "테스트 사용자",
        "#{정책명}": "지역사랑 휴가지원",
        "#{마감일}": "2026-05-14",
        "#{남은일수}": "7",
        "#{정책URL}": "https://travel.example/policies/local-vacation",
    }


def test_client_posts_send_many_detail_and_marks_success() -> None:
    calls: list[dict] = []

    def fake_post(url, *, headers, json, timeout):
        calls.append(
            {
                "url": url,
                "headers": headers,
                "json": json,
                "timeout": timeout,
            }
        )
        return response(
            200,
            {
                "failedMessageList": [],
                "messageList": [
                    {
                        "messageId": "MSG-1",
                        "statusCode": "2000",
                        "statusMessage": "정상 접수",
                    }
                ],
            },
        )

    client = SolapiAlimTalkClient(settings_obj=make_settings(), http_post=fake_post)

    result = client.send_deadline_notification(make_target())

    assert result.success is True
    assert result.providerMessageId == "MSG-1"
    assert calls[0]["url"] == f"https://api.solapi.test{SOLAPI_SEND_PATH}"
    assert calls[0]["headers"]["Authorization"].startswith("HMAC-SHA256 ")
    assert calls[0]["json"]["messages"][0]["type"] == "ATA"
    assert calls[0]["timeout"] == 3


def test_client_maps_failed_message_list_to_failure() -> None:
    client = SolapiAlimTalkClient(
        settings_obj=make_settings(),
        http_post=lambda *args, **kwargs: response(
            200,
            {
                "failedMessageList": [
                    {
                        "messageId": "MSG-FAILED",
                        "statusCode": "3040",
                        "statusMessage": "등록되지 않은 발신번호입니다.",
                    }
                ],
                "messageList": [],
            },
        ),
    )

    result = client.send_deadline_notification(make_target())

    assert result.success is False
    assert result.providerMessageId == "MSG-FAILED"
    assert result.errorMessage == "등록되지 않은 발신번호입니다."


def test_client_maps_timeout_to_failure() -> None:
    def fake_post(*args, **kwargs):
        raise httpx.TimeoutException("timed out")

    client = SolapiAlimTalkClient(settings_obj=make_settings(), http_post=fake_post)

    result = client.send_deadline_notification(make_target())

    assert result.success is False
    assert "timed out" in result.errorMessage


def test_parse_response_requires_message_list_success_status() -> None:
    result = parse_solapi_send_response(
        {
            "failedMessageList": [],
            "messageList": [
                {
                    "messageId": "MSG-2",
                    "statusCode": "4000",
                    "statusMessage": "접수 실패",
                }
            ],
        }
    )

    assert result.success is False
    assert result.providerMessageId == "MSG-2"
    assert result.errorMessage == "접수 실패"
