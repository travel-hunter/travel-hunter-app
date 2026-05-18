import { ChevronLeft, Heart, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { appDataApi, type Policy, type PolicyCategory, type Trip } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { PolicyListCard } from "../components/cards";
import { Button, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, Tag, Toast } from "../components/ui";
import { getPolicyVisual } from "../data/displayConfig";
import { dday } from "../utils";
import { shareLinkWithFallback } from "../utils/share";

type TripSheetStatus = "closed" | "loading" | "empty" | "ready" | "submitting" | "error" | "success";

function policyTripErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Policy not found")) return "정책 정보를 찾을 수 없어요. 다시 확인해 주세요.";
  if (message.includes("Trip not found")) return "일정을 찾을 수 없어요. 다른 일정을 선택해 주세요.";
  return "일정에 혜택을 담지 못했어요. 잠시 후 다시 시도해 주세요.";
}

const allFilter = "전체";
const categoryFilters = [allFilter, "환급", "숙박", "캐시백"] as const;
const periodFilters = ["전체", "7일 이내", "30일 이내", "3개월 이내"] as const;
const amountFilters = ["전체", "금액 명시", "10만원 이상", "30만원 이상"] as const;
type PeriodFilter = (typeof periodFilters)[number];
type AmountFilter = (typeof amountFilters)[number];
const policyCategoryTabs: Array<{ label: string; value: (typeof categoryFilters)[number] }> = [
  { label: "전체", value: allFilter },
  { label: "할인", value: "숙박" },
  { label: "지원금", value: "환급" },
  { label: "적립", value: "캐시백" },
];
type DiscoveryPolicyCategory = Exclude<PolicyCategory, "추천">;
const discoveryCategoryFilters: DiscoveryPolicyCategory[] = ["환급", "숙박", "캐시백"];

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

function policyDeadlineTime(policy: Policy) {
  const time = new Date(policy.deadline).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function getRecommendedPolicies(policies: Policy[]) {
  return [...policies].sort((left, right) => right.match - left.match).slice(0, 3);
}

function getDeadlinePolicies(policies: Policy[]) {
  return [...policies].sort((left, right) => policyDeadlineTime(left) - policyDeadlineTime(right)).slice(0, 3);
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

function getPolicyPeriodLabel(policy: Policy) {
  return `2026.05.01 ~ ${policy.deadline.replace(/^~/, "")}`;
}

export function PolicyListPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>(allFilter);
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryFilters)[number]>(allFilter);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("전체");
  const [selectedAmount, setSelectedAmount] = useState<AmountFilter>("전체");
  const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
  const [isPeriodFilterOpen, setIsPeriodFilterOpen] = useState(false);
  const [isAmountFilterOpen, setIsAmountFilterOpen] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const { savedSlugs, addSavedSlug, removeSavedSlug } = useSession();
  const { data: policies, error, isLoading } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const regionFilters = useMemo(() => {
    const regions = policies?.map((policy) => policy.region) ?? [];
    return [allFilter, ...Array.from(new Set(regions))];
  }, [policies]);

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
    return policies.filter((policy) => {
      if (showSavedOnly && !savedSlugs.has(policy.slug)) return false;
      const matchesRegion = selectedRegion === allFilter || policy.region === selectedRegion;
      const matchesCategory = selectedCategory === allFilter || policy.category === selectedCategory;
      return matchesRegion && matchesCategory && matchesPeriod(policy, selectedPeriod) && matchesAmount(policy, selectedAmount);
    });
  }, [policies, selectedCategory, selectedRegion, selectedPeriod, selectedAmount, showSavedOnly, savedSlugs]);

  const hasActiveFilters =
    selectedRegion !== allFilter || selectedCategory !== allFilter || selectedPeriod !== "전체" || selectedAmount !== "전체" || showSavedOnly;

  const resetFilters = () => {
    setSelectedRegion(allFilter);
    setSelectedCategory(allFilter);
    setSelectedPeriod("전체");
    setSelectedAmount("전체");
    setShowSavedOnly(false);
    setIsRegionFilterOpen(false);
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

  return (
    <section className="screen with-tabs prototype-policy-list-screen">
      <div className="prototype-policy-titlebar">
        <h1>정책</h1>
        <button
          className={showSavedOnly ? "prototype-head-pill active" : "prototype-head-pill"}
          onClick={() => setShowSavedOnly((o) => !o)}
          type="button"
        >
          ♥ 즐겨찾기{showSavedOnly ? ` (${savedSlugs.size})` : ""}
        </button>
      </div>
      <div className="prototype-category-tabs" aria-label="정책 카테고리">
        {policyCategoryTabs.map((tab) => (
          <button className={selectedCategory === tab.value ? "prototype-category-tab active" : "prototype-category-tab"} key={tab.value} onClick={() => setSelectedCategory(tab.value)} type="button">
            {tab.label}
          </button>
        ))}
      </div>
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
        {isRegionFilterOpen && (
          <div className="prototype-region-options" aria-label="지역 필터">
            {regionFilters.map((region) => (
              <button className={selectedRegion === region ? "filter-chip active" : "filter-chip"} key={region} onClick={() => setSelectedRegion(region)} type="button">
                {region}
              </button>
            ))}
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
  const deadlinePolicies = getDeadlinePolicies(policies);
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
  const { addedPolicy, addPolicy, savedSlugs, addSavedSlug, removeSavedSlug } = useSession();
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
      addPolicy();
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
    navigate(`/trips/${selectedTrip.id}`);
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

  const applicationUrl = policy.applyUrl ?? policy.officialUrl ?? undefined;
  const visual = getPolicyVisual(policy);
  const isPolicySaved = savedSlugs.has(policy.slug);
  const savePrototypePolicy = async () => {
    if (!policy || isSavingPolicy) return;
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
            <button className="icon-btn" disabled={isSavingPolicy} onClick={savePrototypePolicy} type="button" aria-label="저장">
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
            <Tag>{policy.tag}</Tag>
            <Tag tone="warning">{dday(policy.deadline)} 마감</Tag>
          </div>
          <h1>{policy.title}</h1>
          <div className="meta">
            {policy.org} 주관 · {policy.region}
          </div>
        </div>

        <section className="section-block">
          <h3>💰 지원 내용</h3>
          <div className="highlight-box">
            <div className="price">{policy.amount}</div>
            <div className="meta">{getPolicyAmountDetail(policy)}</div>
          </div>
        </section>

        <section className="section-block">
          <h3>📅 신청 기간</h3>
          <div>{getPolicyPeriodLabel(policy)}</div>
          <div className="warning-text">{dday(policy.deadline)} · 서둘러 신청하세요</div>
        </section>

        <section className="section-block">
          <h3>👥 신청 대상</h3>
          <ul className="bullet-list">
            {policy.requirements.map((item) => (
              <li key={item}>
                <span className="bullet">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
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
        <Button variant="secondary" onClick={addToTrip}>
          {addedPolicy ? "일정에 담김" : "📅 내 일정에 담기"}
        </Button>
        {applicationUrl ? (
          <a className="btn primary" href={applicationUrl} rel="noreferrer" target="_blank">
            신청하러 가기
          </a>
        ) : (
          <Button variant="secondary" disabled>신청 준비 중</Button>
        )}
      </div>

      <TripSelectSheet
        error={sheetError}
        onClose={closeTripSheet}
        onSelectTrip={attachPolicyToTrip}
        onViewTrip={viewSelectedTrip}
        policySlug={policy.slug}
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
  policySlug,
  selectedTrip,
  status,
  trips,
}: {
  error: string;
  onClose: () => void;
  onSelectTrip: (trip: Trip) => void;
  onViewTrip: () => void;
  policySlug: string;
  selectedTrip: Trip | null;
  status: TripSheetStatus;
  trips: Trip[];
}) {
  if (status === "closed") return null;
  const isSubmitting = status === "submitting";

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
            action={<Link className="btn primary full" to={`/trips/new?policySlug=${encodeURIComponent(policySlug)}`}>새 일정 만들기</Link>}
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
            <Link className="btn line full" to={`/trips/new?policySlug=${encodeURIComponent(policySlug)}`}>
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
              <strong>선택한 일정에 혜택을 담았어요</strong>
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
