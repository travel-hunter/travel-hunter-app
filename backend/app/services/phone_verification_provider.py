from typing import Protocol


class PhoneVerificationProvider(Protocol):
    def send_verification_code(self, *, phone_number: str, code: str) -> None:
        """Send an OTP code to the normalized phone number."""


class DevPhoneVerificationProvider:
    def __init__(self) -> None:
        self.sent_messages: list[tuple[str, str]] = []

    def send_verification_code(self, *, phone_number: str, code: str) -> None:
        self.sent_messages.append((phone_number, code))


dev_phone_verification_provider = DevPhoneVerificationProvider()
