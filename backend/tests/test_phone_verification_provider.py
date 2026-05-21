import httpx
import pytest

from app.core.config import Settings
from app.services.phone_verification_provider import (
    DevPhoneVerificationProvider,
    PhoneVerificationProviderError,
    SolapiSmsPhoneVerificationProvider,
    build_phone_verification_provider,
)


def make_settings(**overrides) -> Settings:
    values = {
        "phone_verification_provider": "solapi",
        "solapi_base_url": "https://api.solapi.test",
        "solapi_api_key": "test-api-key",
        "solapi_api_secret": "test-api-secret",
        "solapi_from_number": "0212345678",
        "solapi_timeout_seconds": 3,
    }
    values.update(overrides)
    return Settings(**values)


def response(status_code: int, payload: dict) -> httpx.Response:
    return httpx.Response(
        status_code,
        json=payload,
        request=httpx.Request("POST", "https://api.solapi.test/messages"),
    )


def test_build_phone_verification_provider_defaults_to_dev() -> None:
    provider = build_phone_verification_provider(Settings(phone_verification_provider="dev"))

    assert isinstance(provider, DevPhoneVerificationProvider)


def test_build_phone_verification_provider_selects_solapi_sms() -> None:
    provider = build_phone_verification_provider(make_settings())

    assert isinstance(provider, SolapiSmsPhoneVerificationProvider)


def test_solapi_sms_provider_posts_verification_code_message() -> None:
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
                        "messageId": "MSG-OTP-1",
                        "statusCode": "2000",
                        "statusMessage": "accepted",
                    }
                ],
            },
        )

    provider = SolapiSmsPhoneVerificationProvider(settings_obj=make_settings(), http_post=fake_post)

    provider.send_verification_code(phone_number="01012345678", code="123456")

    assert calls[0]["url"] == "https://api.solapi.test/messages/v4/send-many/detail"
    assert calls[0]["headers"]["Authorization"].startswith("HMAC-SHA256 ")
    assert calls[0]["timeout"] == 3
    assert calls[0]["json"]["messages"] == [
        {
            "to": "01012345678",
            "from": "0212345678",
            "type": "SMS",
            "country": "82",
            "text": "Travel Hunter verification code: 123456. Enter it within 5 minutes.",
        }
    ]
    assert calls[0]["json"]["strict"] is False
    assert calls[0]["json"]["allowDuplicates"] is False
    assert calls[0]["json"]["showMessageList"] is True


def test_solapi_sms_provider_rejects_invalid_mobile_number() -> None:
    provider = SolapiSmsPhoneVerificationProvider(
        settings_obj=make_settings(),
        http_post=lambda *args, **kwargs: response(200, {}),
    )

    with pytest.raises(PhoneVerificationProviderError, match="Invalid Korean mobile phone number"):
        provider.send_verification_code(phone_number="0212345678", code="123456")


def test_solapi_sms_provider_maps_http_errors_to_provider_error() -> None:
    def fake_post(*args, **kwargs):
        raise httpx.TimeoutException("timed out")

    provider = SolapiSmsPhoneVerificationProvider(settings_obj=make_settings(), http_post=fake_post)

    with pytest.raises(PhoneVerificationProviderError, match="timed out"):
        provider.send_verification_code(phone_number="01012345678", code="123456")


def test_solapi_sms_provider_maps_failed_message_list_to_provider_error() -> None:
    provider = SolapiSmsPhoneVerificationProvider(
        settings_obj=make_settings(),
        http_post=lambda *args, **kwargs: response(
            200,
            {
                "failedMessageList": [
                    {
                        "messageId": "MSG-FAILED",
                        "statusCode": "3040",
                        "statusMessage": "unregistered sender",
                    }
                ],
                "messageList": [],
            },
        ),
    )

    with pytest.raises(PhoneVerificationProviderError, match="unregistered sender"):
        provider.send_verification_code(phone_number="01012345678", code="123456")
