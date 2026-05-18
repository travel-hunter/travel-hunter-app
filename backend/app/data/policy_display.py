"""Display-only policy metadata.

This keeps demo/presentation labels out of service logic. Operational policy
facts still come from the database.
"""

DISPLAY_OVERRIDES = {
    "local-vacation": {"label": "TH", "tag": "최대 30만원", "match": 98},
    "sokcho-stay": {"label": "SC", "tag": "50% 할인", "match": 86},
    "busan-cashback": {"label": "BS", "tag": "5% 캐시백", "match": 79},
}

SUPPORTED_CATEGORIES = {"추천", "환급", "숙박", "캐시백"}
