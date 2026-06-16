from collections.abc import Callable
from typing import Any, Protocol

import httpx

from app.core.config import Settings, settings
from app.services.kakao_alimtalk import (
    SOLAPI_SEND_PATH,
    create_solapi_authorization_header,
    normalize_korean_mobile_number,
)


class PhoneVerificationProviderError(RuntimeError):
    pass


class PhoneVerificationProvider(Protocol):
    def send_verification_code(self, *, phone_number: str, code: str) -> None:
        """Send an OTP code to the normalized phone number."""


class DevPhoneVerificationProvider:
    def __init__(self) -> None:
        self.sent_messages: list[tuple[str, str]] = []

    def send_verification_code(self, *, phone_number: str, code: str) -> None:
        self.sent_messages.append((phone_number, code))


dev_phone_verification_provider = DevPhoneVerificationProvider()


class SolapiSmsPhoneVerificationProvider:
    def __init__(
        self,
        *,
        settings_obj: Settings = settings,
        http_post: Callable[..., httpx.Response] = httpx.post,
    ) -> None:
        validate_solapi_sms_settings(settings_obj)
        self.settings = settings_obj
        self.http_post = http_post

    def send_verification_code(self, *, phone_number: str, code: str) -> None:
        to_number = normalize_korean_mobile_number(phone_number)
        if to_number is None:
            raise PhoneVerificationProviderError("Invalid Korean mobile phone number.")

        payload = {
            "messages": [
                build_solapi_sms_verification_message(
                    phone_number=to_number,
                    code=code,
                    settings_obj=self.settings,
                )
            ],
            "strict": False,
            "allowDuplicates": False,
            "showMessageList": True,
        }
        headers = {
            "Authorization": create_solapi_authorization_header(
                api_key=self.settings.solapi_api_key,
                api_secret=self.settings.solapi_api_secret,
            ),
            "Content-Type": "application/json",
        }

        try:
            response = self.http_post(
                f"{self.settings.solapi_base_url.rstrip('/')}{SOLAPI_SEND_PATH}",
                headers=headers,
                json=payload,
                timeout=self.settings.solapi_timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise PhoneVerificationProviderError(str(exc)) from exc

        assert_solapi_sms_send_success(response.json())


def build_solapi_sms_verification_message(
    *,
    phone_number: str,
    code: str,
    settings_obj: Settings,
) -> dict[str, Any]:
    return {
        "to": phone_number,
        "from": settings_obj.solapi_from_number,
        "type": "SMS",
        "country": "82",
        "text": f"Travel Hunter verification code: {code}. Enter it within 5 minutes.",
    }


def assert_solapi_sms_send_success(payload: dict[str, Any]) -> None:
    failed_messages = payload.get("failedMessageList") or []
    if failed_messages:
        first_failed = failed_messages[0]
        raise PhoneVerificationProviderError(
            first_failed.get("statusMessage")
            or first_failed.get("statusCode")
            or "SOLAPI SMS registration failed."
        )

    messages = payload.get("messageList") or []
    if not messages:
        raise PhoneVerificationProviderError("SOLAPI response did not include messageList.")

    first_message = messages[0]
    if str(first_message.get("statusCode")) != "2000":
        raise PhoneVerificationProviderError(
            first_message.get("statusMessage")
            or first_message.get("statusCode")
            or "SOLAPI SMS was not accepted."
        )


def validate_solapi_sms_settings(settings_obj: Settings) -> None:
    missing = [
        name
        for name, value in {
            "SOLAPI_API_KEY": settings_obj.solapi_api_key,
            "SOLAPI_API_SECRET": settings_obj.solapi_api_secret,
            "SOLAPI_FROM_NUMBER": settings_obj.solapi_from_number,
        }.items()
        if not value
    ]
    if missing:
        raise PhoneVerificationProviderError(
            f"Missing SOLAPI SMS settings: {', '.join(missing)}"
        )
    if settings_obj.solapi_timeout_seconds <= 0:
        raise PhoneVerificationProviderError("SOLAPI_TIMEOUT_SECONDS must be greater than 0.")


def build_phone_verification_provider(
    settings_obj: Settings = settings,
) -> PhoneVerificationProvider:
    provider_name = settings_obj.phone_verification_provider.strip().lower()
    if provider_name in {"", "dev"}:
        return dev_phone_verification_provider
    if provider_name == "solapi":
        return SolapiSmsPhoneVerificationProvider(settings_obj=settings_obj)
    raise PhoneVerificationProviderError(
        f"Unsupported phone verification provider: {settings_obj.phone_verification_provider}"
    )
