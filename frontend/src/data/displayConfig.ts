import type { Policy, RegionRecommendation } from "../api";

export const featuredPolicySlug = "local-vacation";

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

const homePolicyIcons: Record<string, string> = {
  "local-vacation": "💴",
  "sokcho-stay": "🏖️",
  "busan-cashback": "🎁",
};

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
  "local-vacation": { emoji: "🏖️", from: "#ffe0e0", to: "#ff8a7a" },
  "nongchon-stay": { emoji: "🌂", from: "#d9f7f2", to: "#80dccd" },
  "rail-youth": { emoji: "🚆", from: "#dff0ff", to: "#8ac7ff" },
  "hotel-sale": { emoji: "🏨", from: "#f5ddff", to: "#d39cff" },
  default: { emoji: "🎁", from: "#fff1bd", to: "#ffcf66" },
};

export function getPolicyVisual(policy: Pick<Policy, "slug">): PolicyVisual {
  return policyVisuals[policy.slug] ?? policyVisuals.default;
}

export const tripCreateRegions = ["제주", "부산", "강원", "경주", "서울", "전남", "경북", "강릉"] as const;

export const tripRegionEmoji: Record<string, string> = {
  제주: "🏝️",
  부산: "🌉",
  강원: "🏔️",
  경주: "🏛️",
  서울: "🏙️",
  전남: "🌊",
  경북: "🏞️",
  강릉: "🌊",
  전국: "✈️",
};

export function getTripRegionEmojiFromTitle(title: string): string {
  const region = tripCreateRegions.find((item) => title.includes(item));
  return region ? tripRegionEmoji[region] : "🧳";
}
