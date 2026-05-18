import type { Policy } from "../api";

export const featuredPolicySlug = "local-vacation";

export type HomeDestination = {
  title: string;
  stars: string;
  color: string;
  to: string;
};

export const homeDestinations: HomeDestination[] = [
  { title: "제주", stars: "4.9", color: "#3BC9DB", to: "/trips/new?region=%EC%A0%9C%EC%A3%BC" },
  { title: "부산", stars: "4.8", color: "#4DABF7", to: "/trips/new?region=%EB%B6%80%EC%82%B0" },
  { title: "강원", stars: "4.7", color: "#69DB7C", to: "/trips/new?region=%EA%B0%95%EC%9B%90" },
];

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
