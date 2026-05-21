# Itinerary Auto Course Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate editable day-by-day starter courses when users create new trips.

**Architecture:** Add a deterministic backend recommendation provider that reads a region/style catalog and returns generated day/time/place candidates. Wire it into `create_trip()` so generated places are saved as normal `trip_places` and mirrored into `recommendations.result`. Keep the existing API shape and frontend `AppDataApi` boundary while synchronizing profile option values and contract artifacts.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Pytest, React, TypeScript, Vitest, React Testing Library.

---

## File Structure

- Create `backend/app/data/itinerary_catalog.py`: product-owned starter catalog with 100 entries across 4 regions and 5 place preference styles.
- Create `backend/app/services/itinerary_recommendations.py`: focused provider module that selects catalog entries, assigns day/time slots, and maps recommendations.
- Create `backend/tests/test_itinerary_recommendations.py`: unit tests for catalog selection, fallback, partial generation, empty generation, and recommendation mapping.
- Modify `backend/app/services/trips.py`: replace `seed.TRIP["days"]` place copying with generated course insertion and recommendation persistence.
- Modify `backend/tests/test_trip_db_service.py`: capture generated places/recommendations in create-trip tests and verify integration.
- Modify `backend/app/data/seed.py`: add `체험` to profile option styles.
- Modify `frontend/src/data/seedData.ts`: add `체험` to frontend profile option styles.
- Modify `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`: expose place preference style selection on `/trips/new`.
- Modify `frontend/src/App.test.tsx`: assert `체험` appears and create-trip sends the selected style.
- Modify `docs/mvp-api-contract.md`: update profile-options and create-trip examples to place preference styles.
- Modify `.agent/evals/api-contract-golden.json`: add or update `/api/profile-options` contract example with `체험`.
- Modify `CHECKLIST.md`: record validation commands and any remaining risks after implementation.

---

### Task 1: Catalog Provider Unit Tests

**Files:**
- Create: `backend/tests/test_itinerary_recommendations.py`
- Later create: `backend/app/data/itinerary_catalog.py`
- Later create: `backend/app/services/itinerary_recommendations.py`

- [ ] **Step 1: Write failing tests for the recommendation provider**

Create `backend/tests/test_itinerary_recommendations.py` with:

```python
from datetime import date

from app.services import itinerary_recommendations as recommendations


def test_generate_course_prefers_region_and_style() -> None:
    course = recommendations.generate_auto_course(
        region="제주",
        style="자연",
        start_date=date(2026, 7, 12),
        day_count=2,
    )

    assert len(course.places) == 6
    assert [place.day_number for place in course.places] == [1, 1, 1, 2, 2, 2]
    assert [place.time for place in course.places[:3]] == ["10:00", "14:00", "18:00"]
    assert all(place.region == "제주" for place in course.places)
    assert course.places[0].style == "자연"
    assert course.recommendations[0] == {
        "label": course.places[0].label,
        "title": course.places[0].title,
        "meta": f"Day 1 · 10:00 · {course.places[0].meta}",
        "reason": course.places[0].reason,
    }


def test_generate_course_falls_back_to_same_region_other_styles(monkeypatch) -> None:
    catalog = [
        recommendations.CatalogPlace("제주", "자연", "NA", "제주 자연 1", "자연 · 제주", "자연 취향에 맞습니다."),
        recommendations.CatalogPlace("제주", "맛집", "FO", "제주 맛집 1", "맛집 · 제주", "맛집 취향에 맞습니다."),
        recommendations.CatalogPlace("부산", "자연", "BN", "부산 자연 1", "자연 · 부산", "부산 자연 후보입니다."),
    ]
    monkeypatch.setattr(recommendations, "CATALOG", catalog)

    course = recommendations.generate_auto_course(
        region="제주",
        style="자연",
        start_date=date(2026, 7, 12),
        day_count=1,
    )

    assert [place.title for place in course.places] == ["제주 자연 1", "제주 맛집 1"]
    assert all(place.region == "제주" for place in course.places)


def test_generate_course_returns_partial_course_when_candidates_are_insufficient(monkeypatch) -> None:
    catalog = [
        recommendations.CatalogPlace("강원", "휴식", "RS", "강원 휴식 1", "휴식 · 강원", "쉬어가기 좋습니다."),
        recommendations.CatalogPlace("강원", "사진", "PH", "강원 사진 1", "사진 · 강원", "사진 찍기 좋습니다."),
    ]
    monkeypatch.setattr(recommendations, "CATALOG", catalog)

    course = recommendations.generate_auto_course(
        region="강원",
        style="휴식",
        start_date=date(2026, 8, 1),
        day_count=2,
    )

    assert len(course.places) == 2
    assert [(place.day_number, place.time) for place in course.places] == [(1, "10:00"), (1, "14:00")]
    assert len(course.recommendations) == 2


def test_generate_course_returns_empty_for_unknown_region(monkeypatch) -> None:
    catalog = [
        recommendations.CatalogPlace("제주", "자연", "NA", "제주 자연 1", "자연 · 제주", "자연 취향에 맞습니다."),
    ]
    monkeypatch.setattr(recommendations, "CATALOG", catalog)

    course = recommendations.generate_auto_course(
        region="경주",
        style="자연",
        start_date=date(2026, 8, 1),
        day_count=3,
    )

    assert course.places == []
    assert course.recommendations == []


def test_generate_course_limits_day_count_to_non_negative_work() -> None:
    course = recommendations.generate_auto_course(
        region="제주",
        style="자연",
        start_date=date(2026, 8, 1),
        day_count=0,
    )

    assert course.places == []
    assert course.recommendations == []
```

- [ ] **Step 2: Run provider tests and verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_itinerary_recommendations.py -q
```

Expected: FAIL because `app.services.itinerary_recommendations` does not exist.

---

### Task 2: Catalog And Provider Implementation

**Files:**
- Create: `backend/app/data/itinerary_catalog.py`
- Create: `backend/app/services/itinerary_recommendations.py`
- Test: `backend/tests/test_itinerary_recommendations.py`

- [ ] **Step 1: Create the catalog module**

Create `backend/app/data/itinerary_catalog.py` with:

```python
from __future__ import annotations

from typing import TypedDict


class ItineraryCatalogEntry(TypedDict):
    region: str
    style: str
    label: str
    title: str
    meta: str
    reasonSeed: str


def _entry(region: str, style: str, label: str, title: str, meta: str, reason: str) -> ItineraryCatalogEntry:
    return {
        "region": region,
        "style": style,
        "label": label,
        "title": title,
        "meta": meta,
        "reasonSeed": reason,
    }


ITINERARY_PLACE_CATALOG: list[ItineraryCatalogEntry] = [
    _entry("제주", "휴식", "RS", "협재 해변 산책", "휴식 · 제주 서부", "여유롭게 걷기 좋아 첫날 부담을 줄여줍니다."),
    _entry("제주", "휴식", "RS", "오설록 티뮤지엄", "휴식 · 실내", "차분한 실내 코스로 날씨 영향을 덜 받습니다."),
    _entry("제주", "휴식", "RS", "함덕 서우봉 해변", "휴식 · 해변", "바다를 보며 쉬기 좋은 대표 휴식 코스입니다."),
    _entry("제주", "휴식", "RS", "비자림 산책로", "휴식 · 숲길", "짧은 산책과 그늘이 있어 회복형 일정에 맞습니다."),
    _entry("제주", "휴식", "RS", "월정리 카페 거리", "휴식 · 카페", "이동 중 쉬어가기 좋은 카페 밀집 구간입니다."),
    _entry("제주", "맛집", "FO", "동문시장 야시장", "맛집 · 로컬", "저녁 시간대에 다양한 로컬 메뉴를 고르기 좋습니다."),
    _entry("제주", "맛집", "FO", "고기국수 거리", "맛집 · 향토음식", "제주 대표 메뉴를 부담 없이 경험할 수 있습니다."),
    _entry("제주", "맛집", "FO", "해녀의 집", "맛집 · 해산물", "지역색이 강한 해산물 식사 후보입니다."),
    _entry("제주", "맛집", "FO", "흑돼지 구이 거리", "맛집 · 저녁", "저녁 식사 만족도가 높은 대표 메뉴입니다."),
    _entry("제주", "맛집", "FO", "서귀포 매일올레시장", "맛집 · 시장", "간식과 식사를 함께 해결하기 좋습니다."),
    _entry("제주", "체험", "EX", "제주 민속촌", "체험 · 문화", "지역 문화를 직접 살펴볼 수 있는 체험형 코스입니다."),
    _entry("제주", "체험", "EX", "감귤 체험 농장", "체험 · 농장", "계절감 있는 제주 체험 일정에 어울립니다."),
    _entry("제주", "체험", "EX", "해녀 체험관", "체험 · 로컬", "제주 고유 문화를 이해하기 좋은 후보입니다."),
    _entry("제주", "체험", "EX", "도예 공방 체험", "체험 · 공방", "비가 와도 진행 가능한 실내 체험입니다."),
    _entry("제주", "체험", "EX", "승마 체험장", "체험 · 액티비티", "활동적인 여행 취향에 맞는 일정입니다."),
    _entry("제주", "자연", "NA", "성산 일출봉", "자연 · 제주 동부", "자연 취향과 제주 여행에 맞는 대표 코스입니다."),
    _entry("제주", "자연", "NA", "사려니숲길", "자연 · 숲길", "숲길 산책을 중심으로 동선을 안정적으로 잡을 수 있습니다."),
    _entry("제주", "자연", "NA", "천지연폭포", "자연 · 폭포", "짧은 방문으로 자연 경관을 보기 좋습니다."),
    _entry("제주", "자연", "NA", "우도 반나절 코스", "자연 · 섬", "제주다운 해안 풍경을 넓게 볼 수 있습니다."),
    _entry("제주", "자연", "NA", "한라산 어리목", "자연 · 산책", "가벼운 산책부터 등산 취향까지 맞출 수 있습니다."),
    _entry("제주", "사진", "PH", "섭지코지", "사진 · 해안", "해안선과 들판이 함께 보여 사진 만족도가 높습니다."),
    _entry("제주", "사진", "PH", "용눈이오름", "사진 · 오름", "능선 풍경이 좋아 오후 사진 코스로 적합합니다."),
    _entry("제주", "사진", "PH", "카멜리아힐", "사진 · 정원", "계절 꽃과 정원 배경을 담기 좋습니다."),
    _entry("제주", "사진", "PH", "이호테우 말등대", "사진 · 랜드마크", "짧은 방문으로 상징적인 사진을 남기기 좋습니다."),
    _entry("제주", "사진", "PH", "새별오름", "사진 · 일몰", "일몰 시간대 후보로 배치하기 좋습니다."),
    _entry("부산", "휴식", "RS", "광안리 해변 산책", "휴식 · 해변", "도심 접근성이 좋아 가볍게 쉬기 좋습니다."),
    _entry("부산", "휴식", "RS", "송정 해변 카페", "휴식 · 카페", "바다를 보며 쉬는 일정에 맞습니다."),
    _entry("부산", "휴식", "RS", "민락수변공원", "휴식 · 야경", "저녁 산책과 휴식 코스로 적합합니다."),
    _entry("부산", "휴식", "RS", "해운대 블루라인파크", "휴식 · 전망", "무리 없는 이동으로 바다 전망을 즐길 수 있습니다."),
    _entry("부산", "휴식", "RS", "온천천 카페 거리", "휴식 · 산책", "도심 속 쉬어가는 동선에 적합합니다."),
    _entry("부산", "맛집", "FO", "자갈치시장", "맛집 · 해산물", "부산 해산물 식사를 대표하는 후보입니다."),
    _entry("부산", "맛집", "FO", "부평깡통시장", "맛집 · 시장", "간식과 식사를 함께 고르기 좋습니다."),
    _entry("부산", "맛집", "FO", "돼지국밥 거리", "맛집 · 향토음식", "부산 대표 메뉴를 일정에 넣기 좋습니다."),
    _entry("부산", "맛집", "FO", "해리단길 맛집", "맛집 · 골목", "젊은 여행자 취향의 식사 후보입니다."),
    _entry("부산", "맛집", "FO", "기장 해산물 식당", "맛집 · 바다", "바다 동선과 식사를 연결하기 좋습니다."),
    _entry("부산", "체험", "EX", "영화의전당", "체험 · 문화", "도시 문화 체험 일정에 어울립니다."),
    _entry("부산", "체험", "EX", "부산시민공원 공방", "체험 · 공방", "가벼운 실내 체험 후보입니다."),
    _entry("부산", "체험", "EX", "태종대 다누비열차", "체험 · 이동", "경관과 체험 요소를 함께 제공합니다."),
    _entry("부산", "체험", "EX", "송도해상케이블카", "체험 · 액티비티", "부산 바다를 입체적으로 경험할 수 있습니다."),
    _entry("부산", "체험", "EX", "요트 투어", "체험 · 해양", "특별한 저녁 체험 후보로 적합합니다."),
    _entry("부산", "자연", "NA", "태종대", "자연 · 해안", "해안 절경을 중심으로 부산 자연을 볼 수 있습니다."),
    _entry("부산", "자연", "NA", "동백섬", "자연 · 산책", "짧은 도보 동선으로 자연을 즐기기 좋습니다."),
    _entry("부산", "자연", "NA", "오륙도 스카이워크", "자연 · 전망", "바다 전망과 짧은 체험을 함께 제공합니다."),
    _entry("부산", "자연", "NA", "금정산성", "자연 · 산", "활동적인 자연 코스 후보입니다."),
    _entry("부산", "자연", "NA", "을숙도 생태공원", "자연 · 생태", "조용한 자연 관찰 일정에 맞습니다."),
    _entry("부산", "사진", "PH", "감천문화마을", "사진 · 마을", "색감 있는 골목 사진을 남기기 좋습니다."),
    _entry("부산", "사진", "PH", "흰여울문화마을", "사진 · 해안마을", "바다와 마을 풍경이 함께 잡힙니다."),
    _entry("부산", "사진", "PH", "더베이101", "사진 · 야경", "야경 사진 후보로 적합합니다."),
    _entry("부산", "사진", "PH", "청사포 다릿돌전망대", "사진 · 전망", "바다 전망 사진을 찍기 좋습니다."),
    _entry("부산", "사진", "PH", "죽성성당", "사진 · 랜드마크", "짧은 이동으로 인상적인 배경을 얻을 수 있습니다."),
    _entry("강원", "휴식", "RS", "경포호 산책", "휴식 · 호수", "잔잔한 산책 중심의 휴식 코스입니다."),
    _entry("강원", "휴식", "RS", "속초 해변 카페", "휴식 · 카페", "바다를 보며 쉬기 좋은 후보입니다."),
    _entry("강원", "휴식", "RS", "평창 허브나라", "휴식 · 정원", "가벼운 산책과 휴식에 어울립니다."),
    _entry("강원", "휴식", "RS", "양양 서피비치 라운지", "휴식 · 해변", "해변 중심 휴식 일정에 맞습니다."),
    _entry("강원", "휴식", "RS", "춘천 의암호 산책", "휴식 · 호수", "도심 접근성과 휴식성을 함께 갖췄습니다."),
    _entry("강원", "맛집", "FO", "속초 중앙시장", "맛집 · 시장", "강원 먹거리 탐색에 적합합니다."),
    _entry("강원", "맛집", "FO", "강릉 초당순두부", "맛집 · 향토음식", "지역 대표 메뉴를 넣기 좋습니다."),
    _entry("강원", "맛집", "FO", "춘천 닭갈비 골목", "맛집 · 향토음식", "식사 만족도가 높은 대표 코스입니다."),
    _entry("강원", "맛집", "FO", "주문진 회센터", "맛집 · 해산물", "해안 동선과 식사를 연결하기 좋습니다."),
    _entry("강원", "맛집", "FO", "봉평 메밀 음식 거리", "맛집 · 로컬", "강원 지역색이 뚜렷한 식사 후보입니다."),
    _entry("강원", "체험", "EX", "레일바이크", "체험 · 액티비티", "풍경과 활동을 함께 즐길 수 있습니다."),
    _entry("강원", "체험", "EX", "양떼목장 먹이주기", "체험 · 목장", "가족과 친구 여행 모두에 맞는 체험입니다."),
    _entry("강원", "체험", "EX", "서핑 입문 클래스", "체험 · 해양", "활동적인 강원 해변 일정에 적합합니다."),
    _entry("강원", "체험", "EX", "커피 로스팅 체험", "체험 · 실내", "강릉 커피 동선과 연결하기 좋습니다."),
    _entry("강원", "체험", "EX", "짚라인 체험", "체험 · 액티비티", "짧고 강한 체험형 후보입니다."),
    _entry("강원", "자연", "NA", "설악산 권금성", "자연 · 산", "강원 자연 경관을 대표하는 코스입니다."),
    _entry("강원", "자연", "NA", "정동진 해변", "자연 · 바다", "바다 풍경 중심 일정에 적합합니다."),
    _entry("강원", "자연", "NA", "오대산 월정사 전나무숲", "자연 · 숲길", "조용한 자연 산책에 맞습니다."),
    _entry("강원", "자연", "NA", "대관령 하늘목장", "자연 · 초지", "넓은 풍경을 즐기기 좋은 후보입니다."),
    _entry("강원", "자연", "NA", "남이섬 숲길", "자연 · 산책", "걷기 쉬운 자연 코스로 배치하기 좋습니다."),
    _entry("강원", "사진", "PH", "안목해변 커피거리", "사진 · 바다", "바다와 카페 배경을 함께 담기 좋습니다."),
    _entry("강원", "사진", "PH", "하슬라아트월드", "사진 · 전시", "실내외 사진 포인트가 많습니다."),
    _entry("강원", "사진", "PH", "묵호 논골담길", "사진 · 마을", "골목과 바다를 함께 담기 좋습니다."),
    _entry("강원", "사진", "PH", "대관령 양떼목장", "사진 · 목장", "넓은 초지 배경 사진에 적합합니다."),
    _entry("강원", "사진", "PH", "영금정", "사진 · 일출", "일출과 해안 풍경 후보로 좋습니다."),
    _entry("전국", "휴식", "RS", "로컬 북카페", "휴식 · 실내", "날씨와 지역에 크게 흔들리지 않는 휴식 후보입니다."),
    _entry("전국", "휴식", "RS", "도심 공원 산책", "휴식 · 공원", "이동 부담이 적은 회복형 일정입니다."),
    _entry("전국", "휴식", "RS", "전망 좋은 카페", "휴식 · 전망", "중간 휴식 시간에 배치하기 좋습니다."),
    _entry("전국", "휴식", "RS", "온천 또는 스파", "휴식 · 회복", "여행 피로를 줄이는 코스입니다."),
    _entry("전국", "휴식", "RS", "숙소 근처 산책", "휴식 · 근거리", "늦은 시간에도 부담 없이 넣을 수 있습니다."),
    _entry("전국", "맛집", "FO", "지역 대표 시장", "맛집 · 시장", "지역 먹거리를 폭넓게 고르기 좋습니다."),
    _entry("전국", "맛집", "FO", "향토 음식점", "맛집 · 로컬", "지역성을 살린 식사 후보입니다."),
    _entry("전국", "맛집", "FO", "브런치 카페", "맛집 · 브런치", "여유 있는 오전 식사에 적합합니다."),
    _entry("전국", "맛집", "FO", "야시장 또는 포장마차 거리", "맛집 · 저녁", "저녁 시간대 선택지로 좋습니다."),
    _entry("전국", "맛집", "FO", "디저트 카페", "맛집 · 디저트", "식사 사이 가벼운 코스로 배치하기 좋습니다."),
    _entry("전국", "체험", "EX", "지역 공방 체험", "체험 · 공방", "지역마다 대체 가능한 실내 체험입니다."),
    _entry("전국", "체험", "EX", "전통문화 체험관", "체험 · 문화", "지역 문화를 이해하기 좋은 후보입니다."),
    _entry("전국", "체험", "EX", "로컬 투어 프로그램", "체험 · 투어", "처음 방문하는 지역에서 활용하기 좋습니다."),
    _entry("전국", "체험", "EX", "계절 축제", "체험 · 축제", "일정 시기에 맞으면 만족도가 높습니다."),
    _entry("전국", "체험", "EX", "박물관 체험 전시", "체험 · 실내", "비 오는 날 대체 코스로 좋습니다."),
    _entry("전국", "자연", "NA", "대표 해변 또는 강변", "자연 · 물가", "지역 자연 풍경을 쉽게 담을 수 있습니다."),
    _entry("전국", "자연", "NA", "근교 숲길", "자연 · 숲", "짧은 산책 중심의 자연 코스입니다."),
    _entry("전국", "자연", "NA", "전망대", "자연 · 전망", "지역 전체를 조망하기 좋습니다."),
    _entry("전국", "자연", "NA", "수목원", "자연 · 정원", "계절과 상관없이 안정적인 자연 후보입니다."),
    _entry("전국", "자연", "NA", "호수 산책로", "자연 · 산책", "이동 부담이 적고 일정에 넣기 쉽습니다."),
    _entry("전국", "사진", "PH", "지역 랜드마크", "사진 · 랜드마크", "여행 인증 사진을 남기기 좋습니다."),
    _entry("전국", "사진", "PH", "벽화마을", "사진 · 골목", "색감 있는 사진 후보입니다."),
    _entry("전국", "사진", "PH", "야경 명소", "사진 · 야경", "저녁 시간대 사진 코스로 적합합니다."),
    _entry("전국", "사진", "PH", "전통 거리", "사진 · 거리", "지역 분위기를 담기 좋습니다."),
    _entry("전국", "사진", "PH", "계절 꽃 명소", "사진 · 계절", "시즌이 맞으면 사진 만족도가 높습니다."),
]
```

- [ ] **Step 2: Create the provider module**

Create `backend/app/services/itinerary_recommendations.py` with:

```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from app.data.itinerary_catalog import ITINERARY_PLACE_CATALOG


TIME_SLOTS = ("10:00", "14:00", "18:00")


@dataclass(frozen=True)
class CatalogPlace:
    region: str
    style: str
    label: str
    title: str
    meta: str
    reason: str


@dataclass(frozen=True)
class GeneratedPlace:
    day_number: int
    date: date
    time: str
    order_num: int
    region: str
    style: str
    label: str
    title: str
    meta: str
    reason: str


@dataclass(frozen=True)
class GeneratedCourse:
    places: list[GeneratedPlace]
    recommendations: list[dict[str, str]]


def _load_catalog() -> list[CatalogPlace]:
    return [
        CatalogPlace(
            region=str(item["region"]),
            style=str(item["style"]),
            label=str(item["label"]),
            title=str(item["title"]),
            meta=str(item["meta"]),
            reason=str(item["reasonSeed"]),
        )
        for item in ITINERARY_PLACE_CATALOG
    ]


CATALOG = _load_catalog()


def _select_candidates(region: str, style: str, requested_count: int) -> list[CatalogPlace]:
    if requested_count <= 0:
        return []
    region_matches = [item for item in CATALOG if item.region == region]
    if not region_matches:
        return []

    preferred = [item for item in region_matches if item.style == style]
    fallback = [item for item in region_matches if item.style != style]
    selected: list[CatalogPlace] = []
    seen_titles: set[str] = set()
    for item in [*preferred, *fallback]:
        if item.title in seen_titles:
            continue
        selected.append(item)
        seen_titles.add(item.title)
        if len(selected) >= requested_count:
            break
    return selected


def generate_auto_course(
    *,
    region: str,
    style: str,
    start_date: date,
    day_count: int,
) -> GeneratedCourse:
    requested_count = max(day_count, 0) * len(TIME_SLOTS)
    candidates = _select_candidates(region, style, requested_count)
    places: list[GeneratedPlace] = []
    recommendations: list[dict[str, str]] = []

    for index, candidate in enumerate(candidates):
        day_number = (index // len(TIME_SLOTS)) + 1
        slot_index = index % len(TIME_SLOTS)
        visit_time = TIME_SLOTS[slot_index]
        generated = GeneratedPlace(
            day_number=day_number,
            date=start_date + timedelta(days=day_number - 1),
            time=visit_time,
            order_num=slot_index + 1,
            region=candidate.region,
            style=candidate.style,
            label=candidate.label,
            title=candidate.title,
            meta=candidate.meta,
            reason=candidate.reason,
        )
        places.append(generated)
        recommendations.append(
            {
                "label": generated.label,
                "title": generated.title,
                "meta": f"Day {generated.day_number} · {generated.time} · {generated.meta}",
                "reason": generated.reason,
            }
        )

    return GeneratedCourse(places=places, recommendations=recommendations)
```

- [ ] **Step 3: Run provider tests**

Run:

```bash
cd backend
python -m pytest tests/test_itinerary_recommendations.py -q
```

Expected: PASS.

- [ ] **Step 4: Commit provider module**

```bash
git add backend/app/data/itinerary_catalog.py backend/app/services/itinerary_recommendations.py backend/tests/test_itinerary_recommendations.py
git commit -m "feat: add itinerary recommendation provider"
```

---

### Task 3: Trip Creation Integration

**Files:**
- Modify: `backend/app/services/trips.py`
- Modify: `backend/tests/test_trip_db_service.py`
- Test: `backend/tests/test_trip_db_service.py`

- [ ] **Step 1: Extend create-trip test stubs**

In `backend/tests/test_trip_db_service.py`, update `install_create_trip_stubs()` so it captures places and recommendations:

```python
def install_create_trip_stubs(monkeypatch, *, policy: Policy | None = None):
    captured: dict[str, object] = {"trip_days": [], "trip_places": [], "recommendations": []}
    created_trip = make_trip()
    created_trip.id = 11

    def create_trip_stub(db, **kwargs):
        captured["create_trip"] = kwargs
        created_trip.status = kwargs["status"]
        return created_trip

    def add_trip_day_stub(_db, *, trip_id, day_number, date_value):
        captured["trip_days"].append(
            {
                "trip_id": trip_id,
                "day_number": day_number,
                "date_value": date_value,
            }
        )
        return TripDay(id=day_number, trip_id=trip_id, day_number=day_number, date=date_value)

    def add_trip_place_stub(_db, **kwargs):
        captured["trip_places"].append(kwargs)

    def add_recommendation_stub(_db, **kwargs):
        captured["recommendations"].append(kwargs)

    monkeypatch.setattr(trip_service.trip_repository, "create_trip", create_trip_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_member", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_day", add_trip_day_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_place", add_trip_place_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_recommendation", add_recommendation_stub)
    monkeypatch.setattr(trip_service, "_ensure_invite", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: created_trip,
    )
    monkeypatch.setattr(trip_service.policy_repository, "get_policy_by_slug", lambda *_args, **_kwargs: policy)

    def add_trip_policy_stub(_db, **kwargs):
        captured["add_trip_policy"] = kwargs

    monkeypatch.setattr(trip_service.trip_repository, "add_trip_policy", add_trip_policy_stub)
    return captured
```

- [ ] **Step 2: Add failing integration tests**

Append these tests near the existing create-trip tests:

```python
def test_create_trip_generates_catalog_places_and_recommendations(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="제주", style="자연", durationDays=2),
    )

    assert len(captured["trip_days"]) == 2
    assert len(captured["trip_places"]) == 6
    assert [place["visit_time"].strftime("%H:%M") for place in captured["trip_places"][:3]] == ["10:00", "14:00", "18:00"]
    assert captured["trip_places"][0]["place_name"] == "성산 일출봉"
    assert captured["trip_places"][0]["order_num"] == 1
    assert captured["trip_places"][0]["memo"] == "자연 · 제주 동부"
    assert captured["recommendations"][0]["query"] == "제주 2일 여행 recommendations"
    assert captured["recommendations"][0]["result"][0]["title"] == "성산 일출봉"
    assert captured["recommendations"][0]["result"][0]["meta"].startswith("Day 1 · 10:00")
    assert fake_db.commits == 1


def test_create_trip_persists_empty_recommendations_when_catalog_has_no_region(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="경주", style="자연", durationDays=2),
    )

    assert len(captured["trip_days"]) == 2
    assert captured["trip_places"] == []
    assert captured["recommendations"][0]["result"] == []
    assert fake_db.commits == 1
```

- [ ] **Step 3: Run integration tests and verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_trip_db_service.py::test_create_trip_generates_catalog_places_and_recommendations tests/test_trip_db_service.py::test_create_trip_persists_empty_recommendations_when_catalog_has_no_region -q
```

Expected: FAIL because `create_trip()` still copies `seed.TRIP["days"]`.

- [ ] **Step 4: Wire provider into `create_trip()`**

In `backend/app/services/trips.py`, add the import:

```python
from app.services import itinerary_recommendations
```

Replace the current trip-day loop and recommendation insertion inside `create_trip()` with:

```python
    generated_course = itinerary_recommendations.generate_auto_course(
        region=region,
        style=str(payload.get("style") or seed.PROFILE["style"]),
        start_date=start_date,
        day_count=duration_days,
    )
    generated_places_by_day: dict[int, list[itinerary_recommendations.GeneratedPlace]] = {}
    for generated_place in generated_course.places:
        generated_places_by_day.setdefault(generated_place.day_number, []).append(generated_place)

    for day_number in range(1, duration_days + 1):
        trip_day = trip_repository.add_trip_day(
            db,
            trip_id=trip.id,
            day_number=day_number,
            date_value=start_date + timedelta(days=day_number - 1),
        )
        for generated_place in generated_places_by_day.get(day_number, []):
            trip_repository.add_trip_place(
                db,
                trip_day_id=trip_day.id,
                place_name=generated_place.title,
                visit_time=_parse_time(generated_place.time),
                order_num=generated_place.order_num,
                memo=generated_place.meta,
            )

    trip_repository.add_recommendation(
        db,
        user_id=user.id,
        trip_id=trip.id,
        query=f"{title} recommendations",
        result=generated_course.recommendations,
    )
```

- [ ] **Step 5: Run targeted backend tests**

Run:

```bash
cd backend
python -m pytest tests/test_itinerary_recommendations.py tests/test_trip_db_service.py::test_create_trip_generates_catalog_places_and_recommendations tests/test_trip_db_service.py::test_create_trip_persists_empty_recommendations_when_catalog_has_no_region tests/test_trip_db_service.py::test_create_trip_uses_duration_days_for_date_range_and_days tests/test_trip_db_service.py::test_create_trip_uses_request_date_range_for_dates_and_days -q
```

Expected: PASS.

- [ ] **Step 6: Commit trip creation integration**

```bash
git add backend/app/services/trips.py backend/tests/test_trip_db_service.py
git commit -m "feat: generate trip courses on creation"
```

---

### Task 4: Profile Options, Contract, And Eval Sync

**Files:**
- Modify: `backend/app/data/seed.py`
- Modify: `frontend/src/data/seedData.ts`
- Modify: `docs/mvp-api-contract.md`
- Modify: `.agent/evals/api-contract-golden.json`
- Test: `backend/tests/test_trip_db_routes.py` or existing profile route tests if present

- [ ] **Step 1: Update backend profile options**

In `backend/app/data/seed.py`, change:

```python
    "travelStyles": ["휴식", "맛집", "자연", "사진"],
```

to:

```python
    "travelStyles": ["휴식", "맛집", "체험", "자연", "사진"],
```

- [ ] **Step 2: Update frontend seed options**

In `frontend/src/data/seedData.ts`, change:

```ts
export const travelStyles = ["휴식", "맛집", "자연", "사진"] as const;
```

to:

```ts
export const travelStyles = ["휴식", "맛집", "체험", "자연", "사진"] as const;
```

- [ ] **Step 3: Update API contract docs**

In `docs/mvp-api-contract.md`, update the `GET /profile-options` example to:

```json
{
  "regions": ["제주", "부산", "강원", "전국"],
  "travelStyles": ["휴식", "맛집", "체험", "자연", "사진"],
  "budgets": ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"]
}
```

In the `POST /trips` example, use a place preference style:

```json
{
  "title": "제주 여행",
  "region": "제주",
  "style": "자연",
  "description": "제주 자연 중심 여행",
  "policySlug": "dgtourcard-2026",
  "durationDays": 3,
  "startDate": "2026-07-12",
  "endDate": "2026-07-14"
}
```

- [ ] **Step 4: Update API contract eval**

If `.agent/evals/api-contract-golden.json` does not contain `/api/profile-options`, add this endpoint object under `endpoints`:

```json
{
  "method": "GET",
  "path": "/api/profile-options",
  "status": 200,
  "requiredFields": {
    "regions": "array",
    "travelStyles": "array",
    "budgets": "array"
  },
  "example": {
    "regions": ["제주", "부산", "강원", "전국"],
    "travelStyles": ["휴식", "맛집", "체험", "자연", "사진"],
    "budgets": ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"]
  }
}
```

If the endpoint already exists, replace its `example.travelStyles` with `["휴식", "맛집", "체험", "자연", "사진"]`.

- [ ] **Step 5: Run JSON and backend checks**

Run:

```bash
cd backend
python -m pytest tests/test_trip_db_routes.py::test_db_recommendation_and_invite_routes -q
cd ..
python -m json.tool .agent/evals/api-contract-golden.json > NUL
```

Expected: pytest PASS and JSON command exits 0.

- [ ] **Step 6: Commit contract sync**

```bash
git add backend/app/data/seed.py frontend/src/data/seedData.ts docs/mvp-api-contract.md .agent/evals/api-contract-golden.json
git commit -m "chore: sync trip style contract options"
```

---

### Task 5: Frontend Trip Creation Style Selection

**Files:**
- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add failing frontend test for `체험` selection**

In `frontend/src/App.test.tsx`, update `uses selected region and dates when creating a trip` so after selecting `부산`, it also selects `체험` and expects that payload:

```ts
      await user.click(screen.getByRole("button", { name: /부산/ }));
      await user.click(screen.getByRole("button", { name: "체험" }));
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-create:local-vacation")).toContain("부산"));
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-create:local-vacation")).toContain("체험"));
```

Replace the `style: expect.any(String),` assertion with:

```ts
            style: "체험",
```

- [ ] **Step 2: Run the frontend test and verify it fails**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "uses selected region and dates when creating a trip"
```

Expected: FAIL because `/trips/new` does not render a `체험` style button yet.

- [ ] **Step 3: Add style option UI to trip creation**

In `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`, add this module-level constant after `durationOptions`:

```ts
const profileOptions = appDataApi.getProfileOptions();
```

Inside the `step === 1` panel, after the region grid, add:

```tsx
            <div className="prototype-style-choice">
              <span className="meta">어떤 코스를 선호하나요?</span>
              <div className="prototype-region-grid" aria-label="장소 취향 선택">
                {profileOptions.travelStyles.map((style) => (
                  <button className={profile.style === style ? "active" : ""} key={style} onClick={() => updateProfile("style", style)} type="button">
                    <strong>{style}</strong>
                  </button>
                ))}
              </div>
            </div>
```

Keep the existing draft save effect unchanged because it already stores `profile.style`.

- [ ] **Step 4: Run the targeted frontend test**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "uses selected region and dates when creating a trip"
```

Expected: PASS.

- [ ] **Step 5: Commit frontend style selection**

```bash
git add frontend/src/pages/itinerary/ItineraryCreatePage.tsx frontend/src/App.test.tsx
git commit -m "feat: select trip course preference"
```

---

### Task 6: Final Verification And Checklist

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run backend validation**

Run:

```bash
cd backend
python -m pytest
```

Expected: PASS.

- [ ] **Step 2: Run frontend validation**

Run:

```bash
cd frontend
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 3: Run optional release-shape checks if time allows**

Run:

```bash
cd frontend
npm run build
cd ..
docker compose -f compose.yaml config
```

Expected: PASS. If Docker is unavailable, record the blocker in `CHECKLIST.md`.

- [ ] **Step 4: Update `CHECKLIST.md`**

Append this bullet to the validation/history section:

```markdown
- 2026-05-21 itinerary auto course generation: added catalog-backed day-by-day trip course generation, synced place preference styles and API contract evals, and verified backend/frontend tests. Remaining risk: catalog quality is starter data and external AI/place search remains out of scope.
```

If a command could not run, use this exact shape instead:

```markdown
- 2026-05-21 itinerary auto course generation: implementation completed, but `<command>` could not run because `<blocker>`. Remaining risk: unverified command plus starter catalog quality.
```

- [ ] **Step 5: Commit checklist update**

```bash
git add CHECKLIST.md
git commit -m "docs: record itinerary course validation"
```

---

## Self-Review Checklist

- Spec coverage: Tasks cover catalog, provider boundary, create-trip integration, trip place persistence, recommendation persistence, empty-result behavior, style options, contract docs, evals, frontend tests, backend tests, and validation.
- API shape: No new endpoint and no `Recommendation` field changes.
- Route policy: No trip slug is introduced; numeric trip ids remain unchanged.
- Data policy: Catalog lives under `backend/app/data`; no runtime mock mode is introduced.
- Frontend boundary: `/trips/new` still calls `AppDataApi.createTrip()`.
- DB policy: No schema change or Alembic migration is required.
