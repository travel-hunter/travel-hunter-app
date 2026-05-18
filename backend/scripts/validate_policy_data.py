"""
정책 JSON 데이터의 최소 품질을 검증한다.

실행:
    cd backend
    python scripts/validate_policy_data.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

DEFAULT_POLICY_DATA_PATH = Path(__file__).parent.parent / "app" / "data" / "dgtourcard_policies.json"
REQUIRED_FIELDS = {
    "slug",
    "title",
    "org",
    "region",
    "deadline",
    "amount",
    "summary",
    "category",
    "requirements",
    "documents",
    "officialUrl",
}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MOJIBAKE_MARKERS = ("�", "諛", "愿", "쨌", "媛", "吏", "遺")


def validate_policy_data(path: Path = DEFAULT_POLICY_DATA_PATH) -> list[str]:
    errors: list[str] = []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        return [f"{path} 파일을 읽을 수 없습니다: {error}"]
    except json.JSONDecodeError as error:
        return [f"{path} JSON 형식이 올바르지 않습니다: {error}"]

    if not isinstance(payload, list):
        return ["정책 데이터는 list 형태여야 합니다."]

    seen_slugs: set[str] = set()
    for index, policy in enumerate(payload, start=1):
        if not isinstance(policy, dict):
            errors.append(f"{index}번째 항목은 object여야 합니다.")
            continue

        missing = sorted(REQUIRED_FIELDS - set(policy))
        if missing:
            errors.append(f"{index}번째 항목 필수 필드 누락: {', '.join(missing)}")

        slug = str(policy.get("slug", "")).strip()
        if not slug:
            errors.append(f"{index}번째 항목 slug가 비어 있습니다.")
        elif slug in seen_slugs:
            errors.append(f"중복 slug: {slug}")
        seen_slugs.add(slug)

        deadline = str(policy.get("deadline", "")).strip()
        if deadline and not DATE_RE.match(deadline):
            errors.append(f"{slug or index} deadline 형식이 YYYY-MM-DD가 아닙니다: {deadline}")

        for field in ("title", "org", "region", "amount", "summary"):
            value = str(policy.get(field, ""))
            if any(marker in value for marker in MOJIBAKE_MARKERS):
                errors.append(f"{slug or index} {field}에 인코딩 깨짐 의심 문자가 있습니다.")

        for field in ("requirements", "documents"):
            value = policy.get(field)
            if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
                errors.append(f"{slug or index} {field}는 문자열 list여야 합니다.")

    return errors


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="정책 JSON 데이터 품질을 검증합니다.")
    parser.add_argument("--path", type=Path, default=DEFAULT_POLICY_DATA_PATH)
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    errors = validate_policy_data(args.path)
    if errors:
        print("정책 데이터 검증 실패:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        raise SystemExit(1)
    print(f"정책 데이터 검증 통과: {args.path}")


if __name__ == "__main__":
    main()
