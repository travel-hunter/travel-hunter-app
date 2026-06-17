import { ChevronLeft, Heart, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { appDataApi, type LinkedTripPolicy, type Policy, type PolicyCategory, type Trip } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { PolicyListCard } from "../components/cards";
import { Button, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, SurfaceCard, Tag, Toast } from "../components/ui";
import { getDeadlinePolicies, getPolicyVisual } from "../data/displayConfig";
import { dday } from "../utils";
import { canUsePolicyActions } from "../utils/policyCapabilities";
import { shareLinkWithFallback } from "../utils/share";

type TripSheetStatus = "closed" | "loading" | "empty" | "ready" | "submitting" | "error" | "success";

function policyTripErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Policy not found")) return "정책 정보를 찾을 수 없어요. 다시 확인해 주세요.";
  if (message.includes("Trip not found")) return "일정을 찾을 수 없어요. 다른 일정을 선택해 주세요.";
  return "일정에 혜택을 담지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function getPolicyTripRegionQuery(policy: Pick<Policy, "region" | "title">): string | null {
  const bracketedRegion = /^\s*\[([^\]]+)\]/.exec(policy.title)?.[1]?.trim();
  if (bracketedRegion) return bracketedRegion;
  const region = policy.region.trim();
  return region && region !== "전국" ? region : null;
}

function getPolicyTripCreatePath(policySlug: string, regionQuery: string | null): string {
  const searchParams = new URLSearchParams({ policySlug });
  if (regionQuery) searchParams.set("region", regionQuery);
  return `/trips/new?${searchParams.toString()}`;
}

const allFilter = "전체";
const categoryFilters = [allFilter, "교통", "숙박", "여행상품", "지역할인", "이벤트", "기타"] as const;
const periodFilters = ["전체", "7일 이내", "30일 이내", "3개월 이내"] as const;
const amountFilters = ["전체", "금액 명시", "10만원 이상", "30만원 이상"] as const;
const primaryRegionLimit = 6;
type PeriodFilter = (typeof periodFilters)[number];
type AmountFilter = (typeof amountFilters)[number];
type CategoryFilter = (typeof categoryFilters)[number];
const policyCategoryTabs: Array<{ label: string; value: (typeof categoryFilters)[number] }> = [
  { label: "전체", value: allFilter },
  { label: "교통", value: "교통" },
  { label: "숙박", value: "숙박" },
  { label: "여행상품", value: "여행상품" },
  { label: "지역할인", value: "지역할인" },
  { label: "이벤트", value: "이벤트" },
  { label: "기타", value: "기타" },
];
type DiscoveryPolicyCategory = PolicyCategory;
const discoveryCategoryFilters: DiscoveryPolicyCategory[] = ["교통", "숙박", "여행상품", "지역할인", "이벤트", "기타"];

function isCategoryFilter(value: string | null): value is CategoryFilter {
  return categoryFilters.includes(value as CategoryFilter);
}

function addUniqueRegion(regions: string[], region: string | null | undefined) {
  if (region && !regions.includes(region)) regions.push(region);
}

function getPrimaryRegions(policies: Policy[] | null | undefined, profileRegion: string | null | undefined, selectedRegion: string) {
  const counts = new Map<string, number>();
  for (const policy of policies ?? []) {
    counts.set(policy.region, (counts.get(policy.region) ?? 0) + 1);
  }

  const availableRegions = Array.from(counts.keys());
  const primaryRegions = [allFilter];
  if (availableRegions.includes("전국")) addUniqueRegion(primaryRegions, "전국");
  if (profileRegion && availableRegions.includes(profileRegion)) addUniqueRegion(primaryRegions, profileRegion);
  if (selectedRegion !== allFilter && availableRegions.includes(selectedRegion)) addUniqueRegion(primaryRegions, selectedRegion);

  const rankedRegions = availableRegions
    .filter((region) => region !== "전국")
    .sort((left, right) => {
      const countDifference = (counts.get(right) ?? 0) - (counts.get(left) ?? 0);
      if (countDifference !== 0) return countDifference;
      return left.localeCompare(right, "ko");
    });

  for (const region of rankedRegions) {
    if (primaryRegions.length >= primaryRegionLimit) break;
    addUniqueRegion(primaryRegions, region);
  }

  return primaryRegions;
}

function daysUntilDeadline(deadline: string): number {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function parseManWon(amount: string): number | null {
  const m = amount.match(/(\d+)\s*만원/);
  return m ? parseInt(m[1], 10) : null;
}

function matchesPeriod(policy: Policy, filter: PeriodFilter): boolean {
  if (filter === "전체") return true;
  if (!policy.deadline) return false;
  const days = daysUntilDeadline(policy.deadline);
  if (filter === "7일 이내") return days >= 0 && days <= 7;
  if (filter === "30일 이내") return days >= 0 && days <= 30;
  if (filter === "3개월 이내") return days >= 0 && days <= 90;
  return true;
}

function matchesAmount(policy: Policy, filter: AmountFilter): boolean {
  if (filter === "전체") return true;
  const won = parseManWon(policy.amount ?? "");
  if (filter === "금액 명시") return won !== null || (policy.amount ?? "").includes("%");
  if (filter === "10만원 이상") return won !== null && won >= 10;
  if (filter === "30만원 이상") return won !== null && won >= 30;
  return true;
}

function normalizedSearchText(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function matchesPolicySearch(policy: Policy, searchTerm: string) {
  const query = normalizedSearchText(searchTerm);
  if (!query) return true;
  const haystack = [
    policy.title,
    policy.org,
    policy.region,
    policy.category,
    policy.amount,
    policy.summary,
    policy.tag,
    ...policy.requirements,
    ...policy.documents,
  ].join(" ").toLocaleLowerCase("ko-KR");
  return haystack.includes(query);
}

function getBenefitClarityScore(policy: Policy) {
  if (isGenericBenefitAmount(policy.amount)) return -20;
  const amountText = policy.amount ?? "";
  let score = 20;
  if (/%|할인|무료|캐시백|환급|지원/.test(amountText)) score += 18;
  if (/원|만원|\d/.test(amountText)) score += 16;
  if (amountText.length >= 10) score += 8;
  return score;
}

function getDeadlinePriorityScore(policy: Policy) {
  if (!policy.deadline) return 0;
  const days = daysUntilDeadline(policy.deadline);
  if (days < 0) return -100;
  if (days <= 7) return 85;
  if (days <= 30) return 65;
  if (days <= 90) return 35;
  return 8;
}

function getPolicyListPriorityScore(policy: Policy) {
  return getDeadlinePriorityScore(policy) + getBenefitClarityScore(policy) + Math.round(policy.match / 10);
}

function sortPoliciesForList(policies: Policy[], shouldDiversifyCategory: boolean) {
  const candidates = [...policies].sort((left, right) => {
    const scoreDifference = getPolicyListPriorityScore(right) - getPolicyListPriorityScore(left);
    if (scoreDifference !== 0) return scoreDifference;
    const deadlineDifference = daysUntilDeadline(left.deadline) - daysUntilDeadline(right.deadline);
    if (deadlineDifference !== 0) return deadlineDifference;
    return left.title.localeCompare(right.title, "ko");
  });
  if (!shouldDiversifyCategory) return candidates;

  const sorted: Policy[] = [];
  const categoryCounts = new Map<PolicyCategory, number>();
  while (candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    candidates.forEach((policy, index) => {
      const diversityPenalty = (categoryCounts.get(policy.category) ?? 0) * 32;
      const score = getPolicyListPriorityScore(policy) - diversityPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    const [selectedPolicy] = candidates.splice(bestIndex, 1);
    sorted.push(selectedPolicy);
    categoryCounts.set(selectedPolicy.category, (categoryCounts.get(selectedPolicy.category) ?? 0) + 1);
  }
  return sorted;
}

function getRecommendedPolicies(policies: Policy[]) {
  return [...policies].sort((left, right) => right.match - left.match).slice(0, 3);
}

function getCategoryHighlights(policies: Policy[]) {
  return discoveryCategoryFilters
    .map((category) => ({
      category,
      policy: policies.filter((policy) => policy.category === category).sort((left, right) => right.match - left.match)[0],
    }))
    .filter((item): item is { category: DiscoveryPolicyCategory; policy: Policy } => Boolean(item.policy));
}

function getPolicyAmountDetail(policy: Policy) {
  if (policy.summary) return policy.summary;
  return `${policy.amount} 혜택을 받을 수 있는지 공식 안내에서 최종 확인해 주세요.`;
}

function isGenericBenefitAmount(amount: string | null | undefined) {
  const normalized = normalizeBenefitText(amount ?? "");
  return normalized === "" || normalized === "혜택 제공" || normalized === "확인 필요" || normalized === "정책 확인";
}

function getPolicyAmountLabel(policy: Policy) {
  if (!isGenericBenefitAmount(policy.amount)) return policy.amount;
  if (policy.title.includes("디지털관광주민증")) return "디지털관광주민증 혜택";
  return `${policy.category} 혜택`;
}

type PolicyBenefitSection = {
  title: string;
  items: string[];
};

type PolicyRequirementSection = {
  title: string;
  items: Array<{
    label: string;
    description: string;
  }>;
};

function normalizeBenefitText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function splitBenefitSummary(summary: string) {
  return normalizeBenefitText(summary)
    .replace(/\s*·\s*/g, "\n")
    .replace(/\s*(※)/g, "\n$1")
    .replace(/\s+(\d+\.\s*)/g, "\n$1")
    .split("\n")
    .flatMap(splitTrailingPeriodText)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTrailingPeriodText(item: string) {
  const match = item.match(/^(.+?)\s+((?:\d{2}|\d{4})년\s+\d{1,2}월.+)$/);
  if (!match) return [item];
  return [match[1], match[2]];
}

function isExplicitPeriodBenefitItem(item: string) {
  return /^기간[:：]|^(?:\d{2}|\d{4})년\s+\d{1,2}월|^\d{1,2}월\d{0,2}일/.test(item);
}

function isPeriodBenefitItem(item: string) {
  return /기간|매주|주말|평일|사전예약|이용일|예약/.test(item);
}

function isConditionBenefitItem(item: string) {
  return /제시|캡쳐|캡처|조건|대상|확인|필요|결제|사용 완료|참여자/.test(item);
}

function isNoticeBenefitItem(item: string) {
  if (item.startsWith("※") && !/제시|캡쳐|캡처/.test(item)) return true;
  return /^(유의|제외|중복|한정|문의)/.test(item);
}

function isDiscountBenefitItem(item: string) {
  return /할인|지원|무료|캐시백|환급|정상가|실구매가|원|%|포인트/.test(item);
}

function pushLimited(target: string[], item: string) {
  if (!target.includes(item) && target.length < 5) target.push(item);
}

function getPolicyBenefitSections(policy: Policy): PolicyBenefitSection[] {
  const benefitItems: string[] = [];
  const periodItems: string[] = [];
  const conditionItems: string[] = [];
  const noticeItems: string[] = [];

  for (const item of splitBenefitSummary(getPolicyAmountDetail(policy))) {
    if (isGenericBenefitAmount(policy.amount) && /혜택(?:을)?\s*(?:제공|제공합니다)/.test(item)) {
      pushLimited(benefitItems, item);
    } else if (isExplicitPeriodBenefitItem(item)) {
      pushLimited(periodItems, item);
    } else if (isNoticeBenefitItem(item)) {
      pushLimited(noticeItems, item);
    } else if (isConditionBenefitItem(item)) {
      pushLimited(conditionItems, item);
    } else if (isPeriodBenefitItem(item)) {
      pushLimited(periodItems, item);
    } else if (isDiscountBenefitItem(item)) {
      pushLimited(benefitItems, item);
    } else {
      pushLimited(noticeItems, item);
    }
  }

  if (benefitItems.length === 0) {
    const fallbackItem = isGenericBenefitAmount(policy.amount)
      ? normalizeBenefitText(policy.summary || getPolicyAmountLabel(policy))
      : `${policy.amount} 혜택`;
    pushLimited(benefitItems, fallbackItem);
  }

  return [
    { title: "핵심 혜택", items: benefitItems },
    { title: "운영 기간", items: periodItems },
    { title: "이용 조건", items: conditionItems },
    { title: "유의사항", items: noticeItems },
  ].filter((section) => section.items.length > 0);
}

function requirementDescription(item: string, policy: Policy) {
  if (/디지털관광주민증|방문/.test(item)) return `${policy.region} 방문 또는 디지털관광주민증 발급 대상에 해당하는지 확인하세요.`;
  if (/제휴\s*카드|카드/.test(item)) return "제휴 카드로 결제한 건에 한해 혜택이 적용됩니다.";
  const paymentRegion = item.match(/^(.+?)\s*결제/);
  if (paymentRegion) return `${paymentRegion[1].trim()} 지역 결제 또는 대상 가맹점 이용 건을 기준으로 적용됩니다.`;
  if (/월|한도/.test(item)) return "월별 할인/캐시백 한도 내에서 혜택이 적용됩니다.";
  if (/온라인|예약/.test(item)) return "온라인 예약 또는 결제 완료 후 혜택 적용 여부를 확인하세요.";
  if (/사용\s*완료|이용\s*완료/.test(item)) return "예약/구매 후 실제 사용 완료 건을 기준으로 혜택이 인정될 수 있습니다.";
  if (/공식|공고|안내|확인/.test(item)) return "공식 안내에서 세부 조건과 최신 공지를 확인하세요.";
  if (/캡처|캡쳐|제시|증빙|서류/.test(item)) return "현장 또는 신청 단계에서 요구하는 증빙을 준비하세요.";
  if (/국내|여행자|시민|주민|거주|청년|가족|관광객|만\s*\d|세/.test(item)) return `${policy.region} 여행 또는 이용 대상에 해당하는지 확인하세요.`;
  return "상세 기준은 공식 안내에서 최종 확인하세요.";
}

function classifyRequirement(item: string) {
  if (/디지털관광주민증|방문/.test(item)) return "target";
  if (/공식|공고|안내|확인|캡처|캡쳐|제시|증빙|서류|문의|필요/.test(item)) return "notice";
  if (/카드|결제|한도|예약|쿠폰|가맹점|이용|사용|구매|온라인|오프라인|탑승|입장|월/.test(item)) return "usage";
  if (/국내|여행자|시민|주민|거주|청년|가족|관광객|대상|만\s*\d|세/.test(item)) return "target";
  return "notice";
}

function pushRequirement(target: PolicyRequirementSection["items"], item: string, policy: Policy) {
  if (target.some((existing) => existing.label === item)) return;
  target.push({ label: item, description: requirementDescription(item, policy) });
}

function getPolicyRequirementSections(policy: Policy): PolicyRequirementSection[] {
  const targetItems: PolicyRequirementSection["items"] = [];
  const usageItems: PolicyRequirementSection["items"] = [];
  const noticeItems: PolicyRequirementSection["items"] = [];

  for (const item of policy.requirements) {
    const category = classifyRequirement(item);
    if (category === "target") {
      pushRequirement(targetItems, item, policy);
    } else if (category === "usage") {
      pushRequirement(usageItems, item, policy);
    } else {
      pushRequirement(noticeItems, item, policy);
    }
  }

  return [
    { title: "신청 대상", items: targetItems },
    { title: "혜택 적용 조건", items: usageItems },
    { title: "확인 필요 사항", items: noticeItems },
  ].filter((section) => section.items.length > 0);
}

function getPolicyPeriodLabel(policy: Policy) {
  return `2026.05.01 ~ ${policy.deadline.replace(/^~/, "")}`;
}

function getPolicyDisplayTag(policy: Policy) {
  if (policy.tag === "공식 수집" || policy.tag === "내부 정책" || policy.tag === "external") return policy.category;
  return policy.tag;
}

type PolicyApplicationCta =
  | { kind: "apply"; label: string; url: string }
  | { kind: "official"; label: string; url: string }
  | { kind: "unavailable"; label: string; disabledNotice: string };

function getPolicyApplicationCta(policy: Policy): PolicyApplicationCta {
  if (policy.applyUrl) return { kind: "apply", label: "신청하러 가기", url: policy.applyUrl };
  if (policy.officialUrl) return { kind: "official", label: "혜택 안내 보기", url: policy.officialUrl };
  return {
    kind: "unavailable",
    label: "신청 링크 준비 중",
    disabledNotice: "공식 신청 연결은 준비 중입니다.",
  };
}

function getPolicyControlsHelpText(policy: Policy) {
  if (policy.actionStatus === "infoOnly") {
    return "이 혜택은 공식 원문 확인만 가능해요. 저장하거나 일정에 담으려면 정규화된 정책으로 승격되어야 합니다.";
  }
  return "이 혜택은 안내 페이지에서 확인한 뒤 일정에 반영해 주세요.";
}

export function PolicyListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRegion, setSelectedRegion] = useState<string>(allFilter);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("전체");
  const [selectedAmount, setSelectedAmount] = useState<AmountFilter>("전체");
  const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
  const [isAllRegionOpen, setIsAllRegionOpen] = useState(false);
  const [isPeriodFilterOpen, setIsPeriodFilterOpen] = useState(false);
  const [isAmountFilterOpen, setIsAmountFilterOpen] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(() => searchParams.get("saved") === "1");
  const [searchTerm, setSearchTerm] = useState("");
  const { profile, savedSlugs, addSavedSlug, removeSavedSlug } = useSession();
  const { data: policies, error, isLoading } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const categoryParam = searchParams.get("category");
  const selectedCategory = isCategoryFilter(categoryParam) ? categoryParam : allFilter;
  const regionFilters = useMemo(() => {
    const regions = policies?.map((policy) => policy.region) ?? [];
    return [allFilter, ...Array.from(new Set(regions)).sort((left, right) => left.localeCompare(right, "ko"))];
  }, [policies]);
  const primaryRegionFilters = useMemo(() => getPrimaryRegions(policies, profile.region, selectedRegion), [policies, profile.region, selectedRegion]);
  const secondaryRegionFilters = useMemo(
    () => regionFilters.filter((region) => !primaryRegionFilters.includes(region)),
    [primaryRegionFilters, regionFilters],
  );

  const handleToggleSave = async (policy: Policy) => {
    const slug = policy.slug;
    if (savedSlugs.has(slug)) {
      await appDataApi.removeSavedPolicy(slug);
      removeSavedSlug(slug);
    } else {
      await appDataApi.savePolicy(slug);
      addSavedSlug(slug);
    }
  };

  const visiblePolicies = useMemo(() => {
    if (!policies) return [];
    const filteredPolicies = policies.filter((policy) => {
      if (showSavedOnly && !savedSlugs.has(policy.slug)) return false;
      const matchesRegion = selectedRegion === allFilter || policy.region === selectedRegion;
      const matchesCategory = selectedCategory === allFilter || policy.category === selectedCategory;
      return matchesRegion && matchesCategory && matchesPeriod(policy, selectedPeriod) && matchesAmount(policy, selectedAmount) && matchesPolicySearch(policy, searchTerm);
    });
    return sortPoliciesForList(filteredPolicies, selectedCategory === allFilter);
  }, [policies, selectedCategory, selectedRegion, selectedPeriod, selectedAmount, searchTerm, showSavedOnly, savedSlugs]);

  const hasActiveFilters =
    selectedRegion !== allFilter || selectedCategory !== allFilter || selectedPeriod !== "전체" || selectedAmount !== "전체" || showSavedOnly || normalizedSearchText(searchTerm) !== "";

  const setSelectedCategory = (category: CategoryFilter) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (category === allFilter) {
        next.delete("category");
      } else {
        next.set("category", category);
      }
      return next;
    });
  };
  useEffect(() => {
    setShowSavedOnly(searchParams.get("saved") === "1");
  }, [searchParams]);

  const setSavedOnlyFilter = (enabled: boolean) => {
    setShowSavedOnly(enabled);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (enabled) {
        next.set("saved", "1");
      } else {
        next.delete("saved");
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedRegion(allFilter);
    setSelectedPeriod("전체");
    setSelectedAmount("전체");
    setSearchTerm("");
    setShowSavedOnly(false);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("category");
      next.delete("saved");
      return next;
    });    setIsRegionFilterOpen(false);
    setIsAllRegionOpen(false);
    setIsPeriodFilterOpen(false);
    setIsAmountFilterOpen(false);
  };

  const handleRegionToggle = () => {
    setIsRegionFilterOpen((o) => !o);
    setIsPeriodFilterOpen(false);
    setIsAmountFilterOpen(false);
  };
  const handlePeriodToggle = () => {
    setIsPeriodFilterOpen((o) => !o);
    setIsRegionFilterOpen(false);
    setIsAmountFilterOpen(false);
  };
  const handleAmountToggle = () => {
    setIsAmountFilterOpen((o) => !o);
    setIsRegionFilterOpen(false);
    setIsPeriodFilterOpen(false);
  };
  const handleSelectRegion = (region: string) => {
    setSelectedRegion(region);
  };

  return (
    <section className="screen with-tabs prototype-policy-list-screen">
      <div className="prototype-policy-toolbar">
        <div className="prototype-policy-titlebar">
          <div className="prototype-category-tabs" aria-label="정책 카테고리">
            {policyCategoryTabs.map((tab) => (
              <button className={selectedCategory === tab.value ? "prototype-category-tab active" : "prototype-category-tab"} key={tab.value} onClick={() => setSelectedCategory(tab.value)} type="button">
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <button
          className={showSavedOnly ? "prototype-head-pill active" : "prototype-head-pill"}
          onClick={() => setSavedOnlyFilter(!showSavedOnly)}
          type="button"
        >
          ♥ 즐겨찾기{showSavedOnly ? ` (${savedSlugs.size})` : ""}
        </button>
        <label className="prototype-policy-search-row" htmlFor="policy-list-search">
          <span>검색</span>
          <input
            id="policy-list-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="정책명, 지역, 혜택으로 검색"
            type="search"
            value={searchTerm}
          />
        </label>
        <div className="prototype-policy-filter-shell">
          <div className="prototype-policy-filter-row" aria-label="정책 필터">
            <button className={selectedRegion !== allFilter ? "prototype-filter-pill active" : "prototype-filter-pill"} onClick={handleRegionToggle} type="button">
              🌎 지역{selectedRegion !== allFilter ? ` · ${selectedRegion}` : ""}
            </button>
            <button className={selectedPeriod !== "전체" ? "prototype-filter-pill active" : "prototype-filter-pill"} onClick={handlePeriodToggle} type="button">
              🗓 기간{selectedPeriod !== "전체" ? ` · ${selectedPeriod}` : ""}
            </button>
            <button className={selectedAmount !== "전체" ? "prototype-filter-pill active" : "prototype-filter-pill"} onClick={handleAmountToggle} type="button">
              💰 금액{selectedAmount !== "전체" ? ` · ${selectedAmount}` : ""}
            </button>
          </div>
        </div>
        {(isRegionFilterOpen || isPeriodFilterOpen || isAmountFilterOpen || hasActiveFilters) && (
          <div className="prototype-policy-filter-panels">
            {isRegionFilterOpen && (
              <div className="prototype-region-options prototype-region-picker" role="group" aria-label="지역 필터">
                <div className="prototype-region-options-label">주요 지역</div>
                <div className="prototype-region-chip-row">
                  {primaryRegionFilters.map((region) => (
                    <button className={selectedRegion === region ? "filter-chip active" : "filter-chip"} key={region} onClick={() => handleSelectRegion(region)} type="button">
                      {region}
                    </button>
                  ))}
                </div>
                {secondaryRegionFilters.length > 0 && (
                  <>
                    <button className="prototype-region-expand" onClick={() => setIsAllRegionOpen((open) => !open)} type="button" aria-expanded={isAllRegionOpen}>
                      {isAllRegionOpen ? "전체 지역 닫기" : "전체 지역 보기"}
                    </button>
                    {isAllRegionOpen && (
                      <div className="prototype-region-chip-row all-regions" aria-label="전체 지역 목록">
                        {secondaryRegionFilters.map((region) => (
                          <button className={selectedRegion === region ? "filter-chip active" : "filter-chip"} key={region} onClick={() => handleSelectRegion(region)} type="button">
                            {region}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {isPeriodFilterOpen && (
              <div className="prototype-region-options" aria-label="기간 필터">
                {periodFilters.map((period) => (
                  <button className={selectedPeriod === period ? "filter-chip active" : "filter-chip"} key={period} onClick={() => { setSelectedPeriod(period); setIsPeriodFilterOpen(false); }} type="button">
                    {period}
                  </button>
                ))}
              </div>
            )}
            {isAmountFilterOpen && (
              <div className="prototype-region-options" aria-label="금액 필터">
                {amountFilters.map((amount) => (
                  <button className={selectedAmount === amount ? "filter-chip active" : "filter-chip"} key={amount} onClick={() => { setSelectedAmount(amount); setIsAmountFilterOpen(false); }} type="button">
                    {amount}
                  </button>
                ))}
              </div>
            )}
            {hasActiveFilters && (
              <Button variant="line" full onClick={resetFilters}>
                초기화
              </Button>
            )}
          </div>
        )}
      </div>
      {!isLoading && !error && policies && (
        <div className="prototype-policy-result-row" aria-live="polite">
          전체 {policies.length}개 중 {visiblePolicies.length}개 표시
        </div>
      )}
      {isLoading && <LoadingState label="정책을 불러오는 중입니다" />}
      {error && <ErrorState message={error} action={<LinkButton to="/home" variant="line">홈으로 가기</LinkButton>} />}
      {!isLoading && !error && visiblePolicies.length === 0 && (
        <EmptyState
          eyebrow="정책 탐색"
          title={hasActiveFilters ? "검색 조건에 맞는 정책이 없어요" : "등록된 정책이 아직 없어요"}
          body={hasActiveFilters ? "검색어를 줄이거나 지역과 카테고리를 다시 선택해보세요." : "새로운 여행 혜택이 등록되면 이곳에서 확인할 수 있어요."}
          action={hasActiveFilters ? <Button onClick={resetFilters}>전체 보기</Button> : <LinkButton to="/home" variant="line">홈으로 가기</LinkButton>}
        />
      )}
      {!isLoading && !error && visiblePolicies.length > 0 && (
        <div className="list">
          {visiblePolicies.map((policy) => (
            <PolicyListCard key={policy.id} policy={policy} isSaved={savedSlugs.has(policy.slug)} onToggleSave={handleToggleSave} />
          ))}
        </div>
      )}
    </section>
  );
}

function PolicyPreviewList({ policies }: { policies: Policy[] }) {
  return (
    <div className="policy-preview-list">
      {policies.map((policy) => (
        <Link className="policy-preview-row" key={policy.id} to={`/policies/${policy.slug}`}>
          <div>
            <strong>{policy.title}</strong>
            <span className="meta">
              {policy.region} · {policy.amount}
            </span>
          </div>
          <Tag tone="warning">{dday(policy.deadline)}</Tag>
        </Link>
      ))}
    </div>
  );
}

function PolicyDiscoveryBlocks({ policies, onSelectCategory }: { policies: Policy[]; onSelectCategory: (category: DiscoveryPolicyCategory) => void }) {
  const recommendedPolicies = getRecommendedPolicies(policies);
  const deadlinePolicies = getDeadlinePolicies(policies, 3);
  const categoryHighlights = getCategoryHighlights(policies);

  return (
    <section className="policy-discovery" aria-labelledby="policy-discovery-title">
      <div className="section-title-row">
        <div>
          <p className="state-eyebrow">빠른 탐색</p>
          <h3 id="policy-discovery-title">정책 탐색 바로가기</h3>
        </div>
        <span className="meta">추천, 마감, 유형별로 먼저 살펴보세요</span>
      </div>
      <div className="policy-discovery-grid">
        <article className="policy-discovery-panel">
          <Tag tone="primary">추천</Tag>
          <h4>매칭 높은 정책</h4>
          <PolicyPreviewList policies={recommendedPolicies} />
        </article>
        <article className="policy-discovery-panel">
          <Tag tone="warning">마감</Tag>
          <h4>마감 임박</h4>
          <PolicyPreviewList policies={deadlinePolicies} />
        </article>
        <article className="policy-discovery-panel">
          <Tag tone="gray">유형</Tag>
          <h4>혜택 유형별 보기</h4>
          <div className="policy-category-grid">
            {categoryHighlights.map(({ category, policy }) => (
              <button className="policy-category-button" key={category} onClick={() => onSelectCategory(category)} type="button">
                <span>{category} 모아보기</span>
                <small>
                  {policy.title} · 매칭 {policy.match}%
                </small>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function PolicyDetailPage() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const { addPolicy, isPolicyAdded, savedSlugs, addSavedSlug, removeSavedSlug } = useSession();
  const { data: policyData, error, isLoading } = useAsyncResource(() => appDataApi.getPolicy(policyId), [policyId]);
  const policy = policyData as Policy;
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetStatus, setSheetStatus] = useState<TripSheetStatus>("closed");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [sheetError, setSheetError] = useState("");
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  const addToTrip = async () => {
    if (!policy) return;
    setNotice(null);
    setSheetError("");
    setSelectedTrip(null);
    setSheetStatus("loading");
    try {
      const availableTrips = await appDataApi.listTrips();
      setTrips(availableTrips);
      setSheetStatus(availableTrips.length > 0 ? "ready" : "empty");
    } catch {
      setSheetError("일정 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSheetStatus("error");
    }
  };

  const attachPolicyToTrip = async (trip: Trip) => {
    if (!policy) return;
    setSelectedTrip(trip);
    setSheetError("");
    setSheetStatus("submitting");
    try {
      await appDataApi.addPolicyToTrip(trip.id, policy.slug);
      setSheetStatus("success");
      setNotice("선택한 일정에 혜택을 담았어요.");
      addPolicy(policy.slug);
    } catch (attachError) {
      setSheetError(policyTripErrorMessage(attachError));
      setSheetStatus("error");
    }
  };

  const closeTripSheet = () => {
    if (sheetStatus === "submitting") return;
    setSheetStatus("closed");
  };

  const viewSelectedTrip = () => {
    if (!selectedTrip) return;
    const linkedPolicy: LinkedTripPolicy = {
      slug: policy.slug,
      title: policy.title,
      amount: policy.amount,
      region: policy.region,
      category: policy.category,
      tag: policy.tag,
    };
    navigate(`/trips/${selectedTrip.id}`, { state: { linkedPolicy } });
  };

  if (isLoading) {
    return (
      <section className="screen detail prototype-policy-detail-screen">
        <div className="detail-body">
          <LoadingState label="정책 상세를 불러오는 중입니다" />
        </div>
      </section>
    );
  }

  if (error || !policy) {
    return (
      <section className="screen detail prototype-policy-detail-screen">
        <div className="detail-body">
          <ErrorState message={error ?? "정책 정보를 찾지 못했어요."} action={<LinkButton to="/policies" variant="line">정책 목록으로</LinkButton>} />
        </div>
      </section>
    );
  }

  const applicationCta = getPolicyApplicationCta(policy);
  const visual = getPolicyVisual(policy);
  const benefitSections = getPolicyBenefitSections(policy);
  const requirementSections = getPolicyRequirementSections(policy);
  const canUsePolicyControls = canUsePolicyActions(policy);
  const policyControlsHelpId = "policy-detail-controls-help";
  const policyApplicationHelpId = "policy-detail-application-help";
  const policyControlsHelpText = getPolicyControlsHelpText(policy);
  const isPolicySaved = savedSlugs.has(policy.slug);
  const isPolicyInTrip = isPolicyAdded(policy.slug);
  const savePrototypePolicy = async () => {
    if (!policy || isSavingPolicy || !canUsePolicyControls) return;
    setIsSavingPolicy(true);
    try {
      if (isPolicySaved) {
        await appDataApi.removeSavedPolicy(policy.slug);
        removeSavedSlug(policy.slug);
        setNotice("관심 정책에서 해제했어요.");
      } else {
        await appDataApi.savePolicy(policy.slug);
        addSavedSlug(policy.slug);
        setNotice("관심 정책으로 저장했어요.");
      }
    } catch {
      setNotice(isPolicySaved ? "정책 저장을 해제하지 못했어요. 잠시 후 다시 시도해 주세요." : "정책을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingPolicy(false);
    }
  };
  const sharePrototypePolicyLink = async () => {
    const policyUrl = `${window.location.origin}/policies/${policy.slug}`;
    try {
      const method = await shareLinkWithFallback({
        title: policy.title,
        text: `${policy.title} 정책을 트래블헌터에서 확인해 보세요.`,
        url: policyUrl,
      });
      setNotice(method === "share" ? "정책 링크를 공유했어요." : "정책 링크를 복사했어요.");
    } catch {
      setNotice("정책 링크를 공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <section className="screen detail prototype-policy-detail-screen">
      <div className="hero" style={{ background: `linear-gradient(145deg, ${visual.from}, ${visual.to})` }}>
        <div className="overlay-nav">
          <IconButton label="뒤로" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
          </IconButton>
          <div className="row">
            <button
              aria-describedby={!canUsePolicyControls ? policyControlsHelpId : undefined}
              aria-label="저장"
              className="icon-btn"
              disabled={isSavingPolicy || !canUsePolicyControls}
              onClick={savePrototypePolicy}
              type="button"
            >
              <Heart size={18} fill={isPolicySaved ? "currentColor" : "none"} />
            </button>
            <IconButton label="공유" onClick={sharePrototypePolicyLink}>
              <Share2 size={18} />
            </IconButton>
          </div>
        </div>
        <div className="hero-label" aria-hidden="true">{visual.emoji}</div>
      </div>

      <div className="detail-body">
        <div className="title-block">
          <div className="row">
            <Tag>{getPolicyDisplayTag(policy)}</Tag>
            <Tag tone="warning">{dday(policy.deadline)} 마감</Tag>
          </div>
          <h1>{policy.title}</h1>
          <div className="meta">
            {policy.org} 주관 · {policy.region}
          </div>
        </div>

        <section
          className="section-block"
          aria-label="지원 내용"
          role="region"
        >
          <h3>💰 지원 내용</h3>
          <div className="highlight-box">
            <div className="price">{getPolicyAmountLabel(policy)}</div>
            <div className="policy-benefit-grid">
              {benefitSections.map((section) => (
                <SurfaceCard tone={section.title.includes("혜택") ? "benefit" : "default"} className="policy-benefit-group" key={section.title}>
                  <div className="policy-benefit-title">{section.title}</div>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </SurfaceCard>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block">
          <h3>📅 신청 기간</h3>
          <div>{getPolicyPeriodLabel(policy)}</div>
          <div className="warning-text">{dday(policy.deadline)} · 서둘러 신청하세요</div>
        </section>

        <section className="section-block">
          <div className="policy-requirement-grid">
            {requirementSections.map((section) => (
              <SurfaceCard tone={section.title.includes("확인") ? "draft" : "default"} className="policy-requirement-group" key={section.title}>
                <h3>{section.title === "신청 대상" ? "👥 " : section.title === "혜택 적용 조건" ? "💳 " : "🔎 "}{section.title}</h3>
                <ul className="bullet-list policy-requirement-list">
                  {section.items.map((item) => (
                    <li key={item.label}>
                      <span className="bullet">✓</span>
                      <span>
                        <strong>{item.label}</strong>
                        <em>{item.description}</em>
                      </span>
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className="section-block">
          <h3>📄 필요 서류</h3>
          <div className="check-list">
            {policy.documents.map((document) => (
              <div className="check-item" key={document}>
                <span className="policy-doc-icon" aria-hidden="true">📄</span>
                <span>{document}</span>
              </div>
            ))}
          </div>
        </section>

        {notice && <Toast>{notice}</Toast>}
      </div>

      <div className="sticky-cta">
        {!canUsePolicyControls && (
          <p className="helper-text" id={policyControlsHelpId}>
            {policyControlsHelpText}
          </p>
        )}
        {applicationCta.kind === "unavailable" && (
          <p className="helper-text" id={policyApplicationHelpId}>
            {applicationCta.disabledNotice}
          </p>
        )}
        <button
          aria-describedby={!canUsePolicyControls ? policyControlsHelpId : undefined}
          className="btn secondary"
          disabled={!canUsePolicyControls}
          onClick={canUsePolicyControls ? addToTrip : undefined}
          type="button"
        >
          {isPolicyInTrip ? "일정에 담김" : "📅 내 일정에 담기"}
        </button>
        {applicationCta.kind !== "unavailable" ? (
          <a className={applicationCta.kind === "apply" ? "btn primary" : "btn secondary"} href={applicationCta.url} rel="noreferrer" target="_blank">
            {applicationCta.label}
          </a>
        ) : (
          <button
            aria-describedby={policyApplicationHelpId}
            className="btn secondary"
            disabled
            title={applicationCta.disabledNotice}
            type="button"
          >
            {applicationCta.label}
          </button>
        )}
      </div>

      <TripSelectSheet
        error={sheetError}
        onClose={closeTripSheet}
        onSelectTrip={attachPolicyToTrip}
        onViewTrip={viewSelectedTrip}
        policyRegionQuery={getPolicyTripRegionQuery(policy)}
        policySlug={policy.slug}
        policyTitle={policy.title}
        selectedTrip={selectedTrip}
        status={sheetStatus}
        trips={trips}
      />
    </section>
  );

}

function TripSelectSheet({
  error,
  onClose,
  onSelectTrip,
  onViewTrip,
  policyRegionQuery,
  policySlug,
  policyTitle,
  selectedTrip,
  status,
  trips,
}: {
  error: string;
  onClose: () => void;
  onSelectTrip: (trip: Trip) => void;
  onViewTrip: () => void;
  policyRegionQuery: string | null;
  policySlug: string;
  policyTitle: string;
  selectedTrip: Trip | null;
  status: TripSheetStatus;
  trips: Trip[];
}) {
  if (status === "closed") return null;
  const isSubmitting = status === "submitting";
  const newTripPath = getPolicyTripCreatePath(policySlug, policyRegionQuery);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="trip-select-sheet" role="dialog" aria-modal="true" aria-label="일정 선택" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <Tag tone="primary">일정 담기</Tag>
            <h2>혜택을 담을 일정을 선택하세요</h2>
            <p className="meta">선택한 일정에서 정책 혜택과 예상 절감액을 함께 확인할 수 있어요.</p>
          </div>
          <button className="icon-btn" disabled={isSubmitting} onClick={onClose} type="button" aria-label="닫기">
            ×
          </button>
        </div>

        {status === "loading" && <LoadingState label="일정 목록을 불러오는 중입니다" />}

        {status === "empty" && (
          <EmptyState
            title="아직 담을 일정이 없어요"
            body="먼저 여행 일정을 만들면 이 혜택을 바로 연결할 수 있어요."
            action={<Link className="btn primary full" to={newTripPath}>새 일정 만들기</Link>}
          />
        )}

        {(status === "ready" || status === "submitting") && (
          <div className="trip-select-list">
            {trips.map((trip) => (
              <button className="trip-select-row" disabled={isSubmitting} key={trip.id} onClick={() => onSelectTrip(trip)} type="button">
                <div>
                  <strong>{trip.title}</strong>
                  <div className="meta">
                    {trip.dates} · {trip.people.length}명 · 예상 절감 {trip.expectedSaving}
                  </div>
                </div>
                <span className="btn sm secondary">{selectedTrip?.id === trip.id && isSubmitting ? "담는 중" : "선택"}</span>
              </button>
            ))}
            <Link className="btn line full" to={newTripPath}>
              새 일정에 담기
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="sheet-actions">
            <ErrorState message={error} />
            {trips.length > 0 && (
              <div className="trip-select-list">
                {trips.map((trip) => (
                  <button className="trip-select-row" key={trip.id} onClick={() => onSelectTrip(trip)} type="button">
                    <div>
                      <strong>{trip.title}</strong>
                      <div className="meta">{trip.dates}</div>
                    </div>
                    <span className="btn sm secondary">다시 선택</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {status === "success" && (
          <div className="sheet-actions">
            <div className="state-panel">
              <strong>{policyTitle}을 {selectedTrip?.title ?? "선택한 일정"}에 담았어요</strong>
              <p>{selectedTrip?.title ?? "선택한 일정"}에서 연결된 정책을 확인할 수 있어요.</p>
            </div>
            <Button full onClick={onViewTrip}>
              일정에서 보기
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
