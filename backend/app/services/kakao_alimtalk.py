import hashlib
import hmac
import secrets
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol

import httpx

from app.core.config import Settings, settings
from app.services.notification_delivery import NotificationDeliveryTarget

SOLAPI_SEND_PATH = "/messages/v4/send-many/detail"


class KakaoAlimTalkConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class KakaoAlimTalkResult:
    success: bool
    providerMessageId: str | None = None
    errorMessage: str | None = None


class KakaoAlimTalkProvider(Protocol):
    def send_deadline_notification(
        self,
        target: NotificationDeliveryTarget,
    ) -> KakaoAlimTalkResult:
        ...


def normalize_korean_mobile_number(value: str | None) -> str | None:
    if not value:
        return None
    digits = "".join(char for char in value if char.isdigit())
    if digits.startswith("82") and len(digits) == 12 and digits[2:4] == "10":
        digits = "0" + digits[2:]
    if len(digits) == 11 and digits.startswith("010"):
        return digits
    return None


def create_solapi_authorization_header(
    *,
    api_key: str,
    api_secret: str,
    date_time: str | None = None,
    salt: str | None = None,
) -> str:
    request_date = date_time or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    request_salt = salt or secrets.token_hex(16)
    signature = hmac.new(
        api_secret.encode("utf-8"),
        f"{request_date}{request_salt}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return (
        "HMAC-SHA256 "
        f"apiKey={api_key}, date={request_date}, salt={request_salt}, "
        f"signature={signature}"
    )


def template_id_for_lead_day(settings_obj: Settings, lead_day: int) -> str:
    if lead_day == 7:
        return settings_obj.solapi_template_id_d7
    if lead_day == 1:
        return settings_obj.solapi_template_id_d1
    raise ValueError(f"Unsupported notification lead day: {lead_day}")


def policy_url_for_target(
    target: NotificationDeliveryTarget,
    *,
    public_base_url: str,
) -> str:
    if not public_base_url or not target.policySlug:
        return ""
    return f"{public_base_url.rstrip('/')}/policies/{target.policySlug}"


def build_deadline_message_text(target: NotificationDeliveryTarget) -> str:
    return (
        f"{target.userName}님, 저장한 정책 '{target.policyTitle}'의 신청 마감이 "
        f"{target.leadDay}일 남았어요. 마감일: {target.targetDeadlineDate.isoformat()}"
    )


def build_solapi_deadline_message(
    target: NotificationDeliveryTarget,
    *,
    to_number: str,
    settings_obj: Settings,
) -> dict[str, Any]:
    template_id = template_id_for_lead_day(settings_obj, target.leadDay)
    variables = {
        "#{사용자명}": target.userName,
        "#{정책명}": target.policyTitle,
        "#{마감일}": target.targetDeadlineDate.isoformat(),
        "#{남은일수}": str(target.leadDay),
        "#{정책URL}": policy_url_for_target(
            target,
            public_base_url=settings_obj.travel_hunter_public_base_url,
        ),
    }
    message: dict[str, Any] = {
        "to": to_number,
        "type": "ATA",
        "country": "82",
        "text": build_deadline_message_text(target),
        "customFields": {
            "deliveryId": str(target.deliveryId),
            "userId": str(target.userId),
            "policyId": str(target.policyId),
        },
        "kakaoOptions": {
            "pfId": settings_obj.solapi_pf_id,
            "templateId": template_id,
            "disableSms": settings_obj.solapi_disable_sms,
            "variables": variables,
        },
    }
    if settings_obj.solapi_from_number:
        message["from"] = settings_obj.solapi_from_number
    return message


class SolapiAlimTalkClient:
    def __init__(
        self,
        *,
        settings_obj: Settings = settings,
        http_post: Callable[..., httpx.Response] = httpx.post,
    ) -> None:
        validate_solapi_settings(settings_obj)
        self.settings = settings_obj
        self.http_post = http_post

    def send_deadline_notification(
        self,
        target: NotificationDeliveryTarget,
    ) -> KakaoAlimTalkResult:
        to_number = normalize_korean_mobile_number(target.phoneNumber)
        if to_number is None:
            return KakaoAlimTalkResult(
                success=False,
                errorMessage="Invalid Korean mobile phone number.",
            )

        payload = {
            "messages": [
                build_solapi_deadline_message(
                    target,
                    to_number=to_number,
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
            return KakaoAlimTalkResult(success=False, errorMessage=str(exc))

        return parse_solapi_send_response(response.json())


def parse_solapi_send_response(payload: dict[str, Any]) -> KakaoAlimTalkResult:
    failed_messages = payload.get("failedMessageList") or []
    if failed_messages:
        first_failed = failed_messages[0]
        return KakaoAlimTalkResult(
            success=False,
            providerMessageId=first_failed.get("messageId"),
            errorMessage=first_failed.get("statusMessage")
            or first_failed.get("statusCode")
            or "SOLAPI message registration failed.",
        )

    messages = payload.get("messageList") or []
    if not messages:
        return KakaoAlimTalkResult(
            success=False,
            errorMessage="SOLAPI response did not include messageList.",
        )

    first_message = messages[0]
    if str(first_message.get("statusCode")) == "2000":
        return KakaoAlimTalkResult(
            success=True,
            providerMessageId=first_message.get("messageId"),
        )

    return KakaoAlimTalkResult(
        success=False,
        providerMessageId=first_message.get("messageId"),
        errorMessage=first_message.get("statusMessage")
        or first_message.get("statusCode")
        or "SOLAPI message was not accepted.",
    )


def validate_solapi_settings(settings_obj: Settings = settings) -> None:
    missing = [
        name
        for name, value in {
            "SOLAPI_API_KEY": settings_obj.solapi_api_key,
            "SOLAPI_API_SECRET": settings_obj.solapi_api_secret,
            "SOLAPI_PF_ID": settings_obj.solapi_pf_id,
            "SOLAPI_TEMPLATE_ID_D7": settings_obj.solapi_template_id_d7,
            "SOLAPI_TEMPLATE_ID_D1": settings_obj.solapi_template_id_d1,
        }.items()
        if not value
    ]
    if missing:
        raise KakaoAlimTalkConfigurationError(
            f"Missing SOLAPI settings: {', '.join(missing)}"
        )
    if settings_obj.solapi_timeout_seconds <= 0:
        raise KakaoAlimTalkConfigurationError(
            "SOLAPI_TIMEOUT_SECONDS must be greater than 0."
        )


def build_kakao_provider(settings_obj: Settings = settings) -> KakaoAlimTalkProvider | None:
    if not settings_obj.kakao_alimtalk_enabled:
        return None
    return SolapiAlimTalkClient(settings_obj=settings_obj)
