import { ItineraryPlace, Policy, Recommendation, Trip, User } from "../api/types";

// Development fallback data only. Production screens should read policy/trip
// state through the backend API instead of treating this file as source data.
export const user: User = {
  id: "1",
  nickname: "테스트 사용자",
  email: "test.user@example.com",
  birthDate: "1997-04-12",
  gender: null,
  region: "제주",
  homeRegion: "서울 마포",
  residenceArea: "서울 마포",
  preferredRegions: "제주,부산,강원",
  persona: "혜택을 꼼꼼히 챙기는 29세 직장인",
  savedAmount: 120000,
  onboardingCompleted: true,
  socialAccounts: [],
  createdAt: "2026-05-04T00:00:00Z",
  updatedAt: "2026-05-04T00:00:00Z",
};

export const policies: Policy[] = [];

export const itinerary: Trip = {
  id: "1",
  status: "confirmed",
  title: "제주 3일 여행",
  dates: "2026.06.15 - 06.17",
  people: ["테스트 사용자", "민서", "현우"],
  expectedSaving: "12만원",
  linkedPolicies: [],
  recommendedPolicies: [],
  currentUserRole: "owner",
  days: {
    1: [
      { time: "09:00", label: "성산 일출봉", meta: "자연 · 관광지" },
      { time: "12:30", label: "해녀의 집", meta: "해산물 · 별점 4.7" },
      { time: "15:00", label: "우도 코스", meta: "반나절 동선 · 사진 명소" },
    ],
    2: [
      { time: "10:00", label: "오설록 티뮤지엄", meta: "카페 · 실내" },
      { time: "13:00", label: "협재 해변", meta: "해변 · 산책" },
      { time: "18:30", label: "동문시장", meta: "로컬 맛집 · 야시장" },
    ],
    3: [
      { time: "09:30", label: "사려니숲길", meta: "숲길 · 자연" },
      { time: "13:00", label: "공항 근처 브런치", meta: "이동 18분" },
      { time: "15:00", label: "렌터카 반납", meta: "체크리스트 완료" },
    ],
  } satisfies Record<number, ItineraryPlace[]>,
};

export const recommendations: Recommendation[] = [
  {
    label: "CA",
    title: "월정리 바다 카페",
    meta: "Day 2 오후에 적합 · 이동 18분",
    reason: "비 오는 날에도 머물기 좋고 사진 만족도가 높습니다.",
  },
  {
    label: "FO",
    title: "고기국수 로컬 맛집",
    meta: "Day 1 점심 대체 후보",
    reason: "예산을 줄이면서 제주 대표 메뉴를 경험할 수 있습니다.",
  },
  {
    label: "SP",
    title: "사려니숲길 짧은 코스",
    meta: "Day 3 오전 추천",
    reason: "공항 이동 전 부담 없는 산책 동선입니다.",
  },
];

export const regions = ["제주", "부산", "강원", "전국"] as const;
export const travelStyles = ["휴식", "맛집", "체험", "자연", "사진"] as const;
export const budgets = ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"] as const;

export function getPolicy(policySlug?: string) {
  return policies.find((policy) => policy.slug === policySlug || policy.id === policySlug);
}
