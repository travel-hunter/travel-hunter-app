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


def test_generate_course_returns_empty_for_zero_day_count() -> None:
    course = recommendations.generate_auto_course(
        region="제주",
        style="자연",
        start_date=date(2026, 8, 1),
        day_count=0,
    )

    assert course.places == []
    assert course.recommendations == []
