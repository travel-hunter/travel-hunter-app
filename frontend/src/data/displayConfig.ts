import type { Policy, RegionRecommendation } from "../api";

type PolicyMoodSource = {
  category?: string;
  title?: string;
  tag?: string;
  amount?: string;
};

type PolicyMoodKind = "traffic" | "stay" | "product" | "localDiscount" | "event" | "etc";

function getPolicyMoodKind(policy: PolicyMoodSource): PolicyMoodKind {
  switch (policy.category) {
    case "교통":
      return "traffic";
    case "숙박":
      return "stay";
    case "여행상품":
      return "product";
    case "지역할인":
      return "localDiscount";
    case "이벤트":
      return "event";
    case "기타":
      return "etc";
    default:
      break;
  }

  const text = `${policy.category ?? ""} ${policy.title ?? ""} ${policy.tag ?? ""} ${policy.amount ?? ""}`;
  if (text.includes("교통") || text.includes("KTX") || text.includes("기차") || text.includes("버스") || text.includes("셔틀") || text.includes("항공")) return "traffic";
  if (text.includes("숙박") || text.includes("숙소") || text.includes("호텔")) return "stay";
  if (text.includes("여행상품") || text.includes("패키지") || text.includes("관광상품") || text.includes("투어")) return "product";
  if (text.includes("지역할인") || text.includes("할인") || text.includes("캐시백") || text.includes("상품권") || text.includes("쿠폰")) return "localDiscount";
  if (text.includes("이벤트") || text.includes("행사") || text.includes("프로모션")) return "event";
  return "etc";
}

export function getPolicyMoodIcon(policy: PolicyMoodSource): string {
  switch (getPolicyMoodKind(policy)) {
    case "traffic":
      return "🚌";
    case "stay":
      return "🛏️";
    case "product":
      return "🗺️";
    case "localDiscount":
      return "💸";
    case "event":
      return "🎊";
    case "etc":
      return "📌";
  }
}

export function getPolicyMoodTone(policy: PolicyMoodSource): "blue" | "rose" | "peach" | "mint" | "sky" {
  switch (getPolicyMoodKind(policy)) {
    case "traffic":
      return "blue";
    case "stay":
      return "rose";
    case "product":
    case "event":
      return "peach";
    case "localDiscount":
      return "mint";
    case "etc":
      return "sky";
  }
}

export const featuredPolicySlug = "";

export type HomeDestination = {
  title: string;
  badge: string;
  color: string;
  to: string;
};

type DestinationCandidate = Omit<HomeDestination, "badge" | "to"> & {
  regionQuery: string;
};

const destinationCandidates: DestinationCandidate[] = [
  { title: "제주", regionQuery: "제주", color: "#3BC9DB" },
  { title: "부산", regionQuery: "부산", color: "#4DABF7" },
  { title: "강원", regionQuery: "강원", color: "#69DB7C" },
  { title: "속초", regionQuery: "속초", color: "#74C0FC" },
  { title: "경주", regionQuery: "경주", color: "#FFD43B" },
  { title: "서울", regionQuery: "서울", color: "#FF8787" },
  { title: "전남", regionQuery: "전남", color: "#38D9A9" },
  { title: "경북", regionQuery: "경북", color: "#B197FC" },
  { title: "강릉", regionQuery: "강릉", color: "#66D9E8" },
];

const fallbackDestinations = destinationCandidates.slice(0, 3);
const fallbackDestinationColors = destinationCandidates.map((candidate) => candidate.color);

function destinationToLink(region: string): string {
  return `/trips/new?region=${encodeURIComponent(region)}`;
}

function destinationColorForRegion(region: string, index: number): string {
  const candidate = destinationCandidates.find(
    (item) =>
      item.title === region ||
      item.regionQuery === region ||
      region.includes(item.regionQuery) ||
      item.title.includes(region),
  );
  return candidate?.color ?? fallbackDestinationColors[index % fallbackDestinationColors.length] ?? "#4DABF7";
}

function policyDeadlineTime(policy: Pick<Policy, "deadline">): number {
  const time = new Date(policy.deadline).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function matchesDestination(policy: Policy, candidate: DestinationCandidate): boolean {
  if (policy.region === "전국") return false;
  return policy.region.includes(candidate.regionQuery) || policy.title.includes(candidate.regionQuery);
}

export function buildHomeDestinations(
  policies: Policy[] | null | undefined,
  max = 3,
): HomeDestination[] {
  const policyList = policies ?? [];
  const rankedDestinations = destinationCandidates
    .map((candidate) => {
      const matches = policyList.filter((policy) => matchesDestination(policy, candidate));
      const closestDeadline = matches.reduce(
        (closest, policy) => Math.min(closest, policyDeadlineTime(policy)),
        Number.MAX_SAFE_INTEGER,
      );
      return {
        ...candidate,
        matchCount: matches.length,
        closestDeadline,
      };
    })
    .filter((candidate) => candidate.matchCount > 0)
    .sort((left, right) => right.matchCount - left.matchCount || left.closestDeadline - right.closestDeadline)
    .map<HomeDestination>((candidate) => ({
      title: candidate.title,
      badge: candidate.closestDeadline === Number.MAX_SAFE_INTEGER ? `혜택 ${candidate.matchCount}개` : `혜택 ${candidate.matchCount}개`,
      color: candidate.color,
      to: destinationToLink(candidate.regionQuery),
    }));

  const destinations = [...rankedDestinations];
  for (const fallback of fallbackDestinations) {
    if (destinations.length >= max) break;
    if (destinations.some((destination) => destination.title === fallback.title)) continue;
    destinations.push({
      title: fallback.title,
      badge: "추천",
      color: fallback.color,
      to: destinationToLink(fallback.regionQuery),
    });
  }

  return destinations.slice(0, max);
}

export function buildHomeDestinationsFromRegionRecommendations(
  recommendations: RegionRecommendation[] | null | undefined,
  max = 3,
): HomeDestination[] {
  return (recommendations ?? []).slice(0, max).map((recommendation, index) => ({
    title: recommendation.region,
    badge:
      recommendation.endingSoonCount > 0
        ? `마감 임박 ${recommendation.endingSoonCount}개`
        : `혜택 ${recommendation.policyCount}개`,
    color: destinationColorForRegion(recommendation.region, index),
    to: destinationToLink(recommendation.region),
  }));
}

export function getDeadlinePolicies(
  policies: Policy[] | null | undefined,
  limit: number,
): Policy[] {
  return [...(policies ?? [])]
    .sort((left, right) => policyDeadlineTime(left) - policyDeadlineTime(right))
    .slice(0, limit);
}

const homePolicyIcons: Record<string, string> = {};

export function getFeaturedPolicy(policies: Policy[] | null | undefined): Policy | undefined {
  return policies?.find((policy) => policy.slug === featuredPolicySlug) ?? policies?.[0];
}

export function getHomePolicyIcon(policy: Policy): string {
  return homePolicyIcons[policy.slug] ?? "💸";
}

export type PolicyVisual = {
  emoji: string;
  from: string;
  to: string;
};

const policyVisuals: Record<string, PolicyVisual> = {
  "nongchon-stay": { emoji: "🗺️", from: "#d9f7f2", to: "#80dccd" },
  "rail-youth": { emoji: "🚌", from: "#dff0ff", to: "#8ac7ff" },
  "hotel-sale": { emoji: "🛏️", from: "#fff1ed", to: "#ffb4a6" },
  default: { emoji: "📌", from: "#fff1bd", to: "#ffcf66" },
};

export function getPolicyVisual(policy: Pick<Policy, "slug"> & PolicyMoodSource): PolicyVisual {
  const visual = policyVisuals[policy.slug];
  if (visual) return visual;
  const tone = getPolicyMoodTone(policy);
  const emoji = getPolicyMoodIcon(policy);
  if (tone === "blue") return { emoji, from: "#eef6ff", to: "#9bd1ff" };
  if (tone === "rose") return { emoji, from: "#fff1ed", to: "#ffb4a6" };
  if (tone === "peach") return { emoji, from: "#fff4e8", to: "#ffc97d" };
  if (tone === "mint") return { emoji, from: "#eefcf6", to: "#99e5c4" };
  return { emoji, from: "#f2f7ff", to: "#b9d4ff" };
}

export const tripCreateRegions = ["제주", "부산", "강원", "경주", "서울", "전남", "경북", "강릉"] as const;

export type TripCreatePrimaryRegion = {
  label: string;
  value: string;
  emoji: string;
  description: string;
};

export const tripCreatePrimaryRegions: TripCreatePrimaryRegion[] = [
  { label: "제주", value: "제주", emoji: "🏝️", description: "섬, 바다, 자연" },
  { label: "부산", value: "부산", emoji: "🌉", description: "바다, 도시, 맛집" },
  { label: "서울", value: "서울", emoji: "🏙️", description: "도시, 전시, 미식" },
  { label: "강원", value: "강원", emoji: "🏔️", description: "바다, 산, 드라이브" },
  { label: "전남", value: "전남", emoji: "🌊", description: "섬, 바다, 정원" },
  { label: "경남", value: "경남", emoji: "🛥️", description: "남해, 섬, 드라이브" },
  { label: "경북", value: "경북", emoji: "🏞️", description: "역사, 바다, 전통" },
  { label: "전북", value: "전북", emoji: "🍲", description: "한옥, 미식, 역사" },
  { label: "충남", value: "충남", emoji: "🌅", description: "서해, 역사, 온천" },
  { label: "충북", value: "충북", emoji: "🌿", description: "호수, 산, 힐링" },
  { label: "경기", value: "경기", emoji: "🚲", description: "근교, 자연, 가족" },
  { label: "인천", value: "인천", emoji: "⛴️", description: "섬, 항구, 강화" },
];

export const tripCreatePrimaryRegionValues = tripCreatePrimaryRegions.map((region) => region.value);

export const tripRegionEmoji: Record<string, string> = {
  제주: "🏝️",
  부산: "🌉",
  강원: "🏔️",
  경주: "🏛️",
  서울: "🏙️",
  전남: "🌊",
  경남: "🛥️",
  경북: "🏞️",
  전북: "🍲",
  충남: "🌅",
  충북: "🌿",
  경기: "🚲",
  인천: "⛴️",
  강릉: "🌊",
  전국: "✈️",
};

export function getTripRegionEmojiFromTitle(title: string): string {
  const region = tripCreateRegions.find((item) => title.includes(item));
  return region ? tripRegionEmoji[region] : "🧳";
}
