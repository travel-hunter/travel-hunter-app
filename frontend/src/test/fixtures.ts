import type { Policy, TravelAreaRecommendationResponse, Trip, User } from "../api";

export const testEmail = "test.user@example.com";
export const testPassword = "password123";
export const examplePolicySlug = "dgtour-\uC601\uAD11-8";
export const examplePolicyPath = `/policies/${encodeURIComponent(examplePolicySlug)}`;
export const examplePolicyTitle =
  "\uC601\uAD11 \uB514\uC9C0\uD138\uAD00\uAD11\uC8FC\uBBFC\uC99D \uD61C\uD0DD";
export const examplePolicyDetail: Policy = {
  id: examplePolicySlug,
  slug: examplePolicySlug,
  label: "MY",
  tag: "지역할인",
  title: examplePolicyTitle,
  org: "한국관광공사",
  region: "경남",
  deadline: "2026-12-31",
  amount: "디지털관광주민증 혜택",
  summary: "디지털관광주민증 소지자 대상 영광 지역 방문 혜택을 제공합니다.",
  match: 75,
  category: "지역할인",
  requirements: ["디지털관광주민증 발급자", "영광 방문"],
  documents: ["디지털관광주민증"],
  officialUrl: "https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
  applyUrl: null,
  sourceType: "external",
};

export function testIsoDateFromToday(daysFromToday: number) {
  const date = new Date(Date.now() + daysFromToday * 86_400_000);
  return date.toISOString().slice(0, 10);
}

export function getPreviewTrip(): Trip {
  return {
    id: "21",
    title: "부산 여행 1",
    status: "confirmed",
    revision: 1,
    dates: "2026.06.12 - 06.13",
    people: ["여행자"],
    participantCount: 1,
    expectedSaving: "0원",
    linkedPolicies: [],
    recommendedPolicies: [],
    days: {
      1: [{ id: "101", time: "09:00", label: "도착", meta: "오전" }],
      2: [{ id: "102", time: "10:00", label: "일정", meta: "점심" }],
    },
    currentUserRole: "owner",
  };
}

export function getGangwonTravelAreaResponse(): TravelAreaRecommendationResponse {
  return {
    mode: "sido",
    sido: "강원",
    query: null,
    emptyReason: null,
    items: [
      {
        travelAreaId: "gangwon-sokcho-goseong-yangyang",
        travelAreaName: "속초·고성·양양",
        sido: "강원",
        includedCities: ["속초", "고성", "양양"],
        summary: "바다와 설악산, 감성 카페를 함께 즐기는 동해 북부 권역",
        tags: ["바다", "산", "카페", "2박3일"],
        reason: "강원 지역 혜택과 속초·고성·양양 여행 동선이 잘 맞아요.",
        policyCount: 5,
        localPolicyCount: 4,
        nationwidePolicyCount: 1,
        endingSoonCount: 1,
        estimatedValueKrw: 120000,
        score: 95,
      },
      {
        travelAreaId: "gangwon-gangneung-donghae-samcheok",
        travelAreaName: "강릉·동해·삼척",
        sido: "강원",
        includedCities: ["강릉", "동해", "삼척"],
        summary: "해변과 커피, 드라이브를 함께 즐기는 동해 중부 권역",
        tags: ["바다", "커피", "드라이브"],
        reason: "강릉 중심 동해안 여행에 적합해요.",
        policyCount: 3,
        localPolicyCount: 2,
        nationwidePolicyCount: 1,
        endingSoonCount: 0,
        estimatedValueKrw: 80000,
        score: 88,
      },
    ],
  };
}

export function getSokchoTravelAreaResponse(): TravelAreaRecommendationResponse {
  const response = getGangwonTravelAreaResponse();
  return {
    ...response,
    mode: "search",
    sido: null,
    query: "속초",
    items: [response.items[0]],
  };
}

export function getBusanTravelAreaResponse(): TravelAreaRecommendationResponse {
  return {
    mode: "sido",
    sido: "부산",
    query: null,
    emptyReason: null,
    items: [
      {
        travelAreaId: "busan-all",
        travelAreaName: "부산 전체",
        sido: "부산",
        includedCities: ["부산"],
        summary: "바다와 도시, 미식을 함께 즐기는 부산 대표 권역",
        tags: ["바다", "도시", "맛집"],
        reason: "부산 대표 여행권역으로 바로 일정을 만들 수 있어요.",
        policyCount: 4,
        localPolicyCount: 3,
        nationwidePolicyCount: 1,
        endingSoonCount: 0,
        estimatedValueKrw: 90000,
        score: 92,
      },
    ],
  };
}

export function getJejuTravelAreaResponse(): TravelAreaRecommendationResponse {
  return {
    mode: "sido",
    sido: "제주",
    query: null,
    emptyReason: null,
    items: [
      {
        travelAreaId: "jeju-all",
        travelAreaName: "제주 전체",
        sido: "제주",
        includedCities: ["제주", "서귀포"],
        summary: "제주 전역의 자연, 맛집, 체험을 함께 둘러보는 대표 여행권역",
        tags: ["자연", "맛집", "체험"],
        reason: "기본 프로필 지역에 맞춰 바로 일정을 만들 수 있어요.",
        policyCount: 4,
        localPolicyCount: 3,
        nationwidePolicyCount: 1,
        endingSoonCount: 1,
        estimatedValueKrw: 110000,
        score: 94,
      },
    ],
  };
}

export function getGyeongjuTravelAreaResponse(): TravelAreaRecommendationResponse {
  return {
    mode: "search",
    sido: null,
    query: "경주",
    emptyReason: null,
    items: [
      {
        travelAreaId: "gyeongbuk-gyeongju",
        travelAreaName: "경주",
        sido: "경북",
        includedCities: ["경주"],
        summary: "역사와 전통, 산책 코스를 함께 즐기는 경주 대표 권역",
        tags: ["역사", "전통", "산책"],
        reason: "경주 검색어와 정확히 맞는 여행권역이에요.",
        policyCount: 3,
        localPolicyCount: 2,
        nationwidePolicyCount: 1,
        endingSoonCount: 0,
        estimatedValueKrw: 70000,
        score: 90,
      },
    ],
  };
}

export function getGangneungTravelAreaResponse(): TravelAreaRecommendationResponse {
  return {
    mode: "search",
    sido: null,
    query: "강릉",
    emptyReason: null,
    items: [
      {
        travelAreaId: "gangwon-gangneung-donghae-samcheok",
        travelAreaName: "강릉·동해·삼척",
        sido: "강원",
        includedCities: ["강릉", "동해", "삼척"],
        summary: "해변과 커피, 드라이브를 함께 즐기는 동해 중부 권역",
        tags: ["바다", "커피", "드라이브"],
        reason: "강릉 검색어와 맞는 동해안 여행권역이에요.",
        policyCount: 3,
        localPolicyCount: 2,
        nationwidePolicyCount: 1,
        endingSoonCount: 0,
        estimatedValueKrw: 80000,
        score: 88,
      },
    ],
  };
}

export function getPreviewUser(): User {
  return {
    id: "preview-user-id",
    nickname: "여행러",
    email: "preview.user@example.com",
    role: "user",
    birthDate: null,
    gender: "미지정",
    region: "부산",
    homeRegion: "부산",
    residenceArea: "강서구",
    preferredRegions: null,
    persona: "family",
    savedAmount: 0,
    onboardingCompleted: true,
    socialAccounts: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
