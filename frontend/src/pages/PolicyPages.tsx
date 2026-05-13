import { ChevronLeft, Heart, Search, Share2, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { appDataApi, type Policy, type PolicyCategory, type Profile, type Trip } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { PolicyListCard } from "../components/cards";
import { Button, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, Tag, Toast, TopBar } from "../components/ui";
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
type DiscoveryPolicyCategory = Exclude<PolicyCategory, "추천">;
const discoveryCategoryFilters: DiscoveryPolicyCategory[] = ["환급", "숙박", "캐시백"];

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function isNationwidePolicy(region: string) {
  return region === "전국" || region.includes("전국");
}

function isRegionAligned(policyRegion: string, profileRegion: string | null) {
  if (isNationwidePolicy(policyRegion)) return true;
  if (!profileRegion) return false;
  return policyRegion === profileRegion || policyRegion.includes(profileRegion) || profileRegion.includes(policyRegion);
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

function buildPolicyFaqs(policy: Policy) {
  const requirements = policy.requirements.length > 0 ? policy.requirements.join(", ") : "공식 안내의 신청 대상 조건";
  const documents = policy.documents.length > 0 ? policy.documents.join(", ") : "공식 안내에서 요구하는 제출 서류";

  return [
    {
      id: "target",
      question: "누가 신청할 수 있나요?",
      answer: `${requirements} 조건을 먼저 확인해 주세요. 실제 신청 가능 여부는 공식 안내에서 최종 확인이 필요해요.`,
    },
    {
      id: "deadline",
      question: "언제까지 신청해야 하나요?",
      answer: `신청 마감일은 ${policy.deadline}이고 현재 기준 ${dday(policy.deadline)} 상태입니다. 마감 전 예산 소진 여부도 함께 확인해 주세요.`,
    },
    {
      id: "documents",
      question: "어떤 서류가 필요한가요?",
      answer: `${documents} 준비가 필요할 수 있어요. 정책별 접수처에서 원본, 사본, 파일 형식을 다시 확인해 주세요.`,
    },
    {
      id: "trip",
      question: "일정에 담으면 무엇이 좋아지나요?",
      answer: "여행 일정에서 연결된 혜택과 예상 절감액을 함께 확인하고, 마감 알림 기준으로 다시 챙길 수 있어요.",
    },
  ];
}

export function PolicyListPage() {
  const [query, setQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>(allFilter);
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryFilters)[number]>(allFilter);
  const { data: policies, error, isLoading } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const regionFilters = useMemo(() => {
    const regions = policies?.map((policy) => policy.region) ?? [];
    return [allFilter, ...Array.from(new Set(regions))];
  }, [policies]);

  const visiblePolicies = useMemo(() => {
    if (!policies) return [];
    const searchText = normalizeSearch(query);
    return policies.filter((policy) => {
      const searchable = [policy.title, policy.org, policy.region, policy.summary, policy.tag, policy.amount, policy.category]
        .map((value) => normalizeSearch(value))
        .join(" ");
      const matchesSearch = !searchText || searchable.includes(searchText);
      const matchesRegion = selectedRegion === allFilter || policy.region === selectedRegion;
      const matchesCategory = selectedCategory === allFilter || policy.category === selectedCategory;
      return matchesSearch && matchesRegion && matchesCategory;
    });
  }, [policies, query, selectedCategory, selectedRegion]);

  const hasActiveFilters = query.trim().length > 0 || selectedRegion !== allFilter || selectedCategory !== allFilter;
  const resetFilters = () => {
    setQuery("");
    setSelectedRegion(allFilter);
    setSelectedCategory(allFilter);
  };

  return (
    <section className="screen with-tabs">
      <TopBar
        title="정책 목록"
        left={
          <IconButton label="홈으로" to="/home">
            <ChevronLeft size={20} />
          </IconButton>
        }
        right={
          <button className="icon-btn" disabled={!hasActiveFilters} onClick={resetFilters} type="button" aria-label="필터 초기화">
            <SlidersHorizontal size={18} />
          </button>
        }
      />
      <div className="policy-search-panel card">
        <label className="search-field">
          <Search size={18} />
          <input aria-label="정책 검색" placeholder="정책명, 지역, 기관, 혜택 금액 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="filter-group" aria-label="지역 필터">
          <span className="filter-label">지역</span>
          <div className="filter-row compact">
            {regionFilters.map((region) => (
              <button className={selectedRegion === region ? "filter-chip active" : "filter-chip"} key={region} onClick={() => setSelectedRegion(region)} type="button">
                {region}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group" aria-label="카테고리 필터">
          <span className="filter-label">카테고리</span>
          <div className="filter-row compact">
            {categoryFilters.map((category) => (
              <button className={selectedCategory === category ? "filter-chip active" : "filter-chip"} key={category} onClick={() => setSelectedCategory(category)} type="button">
                {category}
              </button>
            ))}
          </div>
        </div>
        {hasActiveFilters && (
          <Button variant="line" full onClick={resetFilters}>
            조건 초기화
          </Button>
        )}
      </div>
      {isLoading && <LoadingState label="정책을 불러오는 중입니다" />}
      {error && <ErrorState message={error} action={<LinkButton to="/home" variant="line">홈으로 가기</LinkButton>} />}
      {!isLoading && !error && policies && policies.length > 0 && !hasActiveFilters && (
        <PolicyDiscoveryBlocks
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            setQuery("");
            setSelectedRegion(allFilter);
          }}
          policies={policies}
        />
      )}
      {!isLoading && !error && visiblePolicies.length === 0 && (
        <EmptyState
          eyebrow="정책 탐색"
          title={hasActiveFilters ? "검색 조건에 맞는 정책이 없어요" : "등록된 정책이 아직 없어요"}
          body={hasActiveFilters ? "검색어를 줄이거나 지역과 카테고리를 다시 선택해보세요." : "새로운 여행 혜택이 등록되면 이곳에서 확인할 수 있어요."}
          action={hasActiveFilters ? <Button onClick={resetFilters}>전체 보기</Button> : <LinkButton to="/home" variant="line">홈으로 가기</LinkButton>}
        />
      )}
      {!isLoading && !error && visiblePolicies.length > 0 && (
        <>
          <div className="result-summary">조건에 맞는 정책 {visiblePolicies.length}개</div>
          <div className="list">
            {visiblePolicies.map((policy) => (
              <PolicyListCard key={policy.id} policy={policy} />
            ))}
          </div>
        </>
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
  const { addedPolicy, addPolicy, likedPolicy, profile, togglePolicyLike } = useSession();
  const { data: policy, error, isLoading } = useAsyncResource(() => appDataApi.getPolicy(policyId), [policyId]);
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

  const showApplicationNotice = () => {
    setNotice("공식 신청 연결은 준비 중입니다. 필요한 서류와 신청 기간을 먼저 확인해주세요.");
  };

  const saveStandalonePolicy = async () => {
    if (!policy || isSavingPolicy) return;
    setIsSavingPolicy(true);
    try {
      await appDataApi.savePolicy(policy.slug);
      if (!likedPolicy) togglePolicyLike();
      setNotice("관심 정책으로 저장했어요.");
    } catch {
      setNotice("정책을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const sharePolicyLink = async () => {
    if (!policy) return;
    const policyUrl = `${window.location.origin}/policies/${policy.slug}`;
    try {
      const method = await shareLinkWithFallback({
        title: policy.title,
        text: `${policy.title} 정책을 Travel Hunter에서 확인해 보세요.`,
        url: policyUrl,
      });
      setNotice(method === "share" ? "정책 링크를 공유했어요." : "정책 링크를 복사했어요.");
    } catch {
      setNotice("정책 링크를 공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  if (isLoading) {
    return (
      <section className="screen detail">
        <div className="detail-body">
          <LoadingState label="정책 상세를 불러오는 중입니다" />
        </div>
      </section>
    );
  }

  if (error || !policy) {
    return (
      <section className="screen detail">
        <div className="detail-body">
          <ErrorState message={error ?? "정책 정보를 찾지 못했어요."} action={<LinkButton to="/policies" variant="line">정책 목록으로</LinkButton>} />
        </div>
      </section>
    );
  }

  const applicationUrl = policy.applyUrl ?? policy.officialUrl;

  return (
    <section className="screen detail">
      <div className="hero">
        <div className="overlay-nav">
          <IconButton label="홈으로" to="/home">
            <ChevronLeft size={20} />
          </IconButton>
          <div className="row">
            <button className="icon-btn" disabled={isSavingPolicy} onClick={saveStandalonePolicy} type="button" aria-label="저장">
              <Heart size={18} fill={likedPolicy ? "currentColor" : "none"} />
            </button>
            <IconButton label="공유" onClick={sharePolicyLink}>
              <Share2 size={18} />
            </IconButton>
          </div>
        </div>
        <div className="hero-label">{policy.label}</div>
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
          <h3>지원 내용</h3>
          <div className="highlight-box">
            <div className="price">{policy.amount}</div>
            <div className="meta">숙박, 교통, 체험비 일부 환급 · 1인 1회 신청</div>
          </div>
        </section>
        <section className="section-block">
          <h3>신청 기간</h3>
          <div>2026.05.01 - 2026.10.31</div>
          <div className="warning-text">{dday(policy.deadline)} · 서둘러 신청하세요</div>
        </section>
        <PolicyFitSummary policy={policy} profile={profile} />
        <BenefitBundlePreview policy={policy} />
        <section className="section-block">
          <h3>신청 대상</h3>
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
          <h3>필요 서류</h3>
          <div className="check-list">
            {policy.documents.map((document) => (
              <div className="check-item" key={document}>
                <span className="checkbox" />
                <span>{document}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="section-block">
          <h3>관련 정보</h3>
          {policy.officialUrl ? (
            <a className="btn ghost full" href={policy.officialUrl} rel="noreferrer" target="_blank">
              공식 안내 확인하기
            </a>
          ) : (
            <Button full variant="ghost" onClick={showApplicationNotice}>
              공식 안내 확인하기
            </Button>
          )}
        </section>
        <PolicyFaqAccordion policy={policy} />
        {notice && <Toast>{notice}</Toast>}
      </div>
      <div className="sticky-cta">
        <Button variant="secondary" onClick={addToTrip}>
          {addedPolicy ? "일정에 담김" : "내 일정에 담기"}
        </Button>
        {applicationUrl ? (
          <a className="btn primary" href={applicationUrl} rel="noreferrer" target="_blank">
            혜택 받으러 가기
          </a>
        ) : (
          <Button onClick={showApplicationNotice}>혜택 받으러 가기</Button>
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

function PolicyFitSummary({ policy, profile }: { policy: Policy; profile: Profile }) {
  const profileRegion = profile.region || null;
  const regionAligned = isRegionAligned(policy.region, profileRegion);
  const requirementPreview = policy.requirements.slice(0, 3);
  const documentPreview = policy.documents.slice(0, 2);

  return (
    <section className="section-block policy-fit-summary" aria-labelledby="policy-fit-title">
      <div className="section-title-row">
        <h3 id="policy-fit-title">조건 확인 요약</h3>
        <Tag tone="warning">신청 전 확인해 주세요</Tag>
      </div>
      <p className="meta">내 정보와 정책 조건을 빠르게 대조해요. 실제 신청 가능 여부는 공식 안내에서 최종 확인이 필요해요.</p>
      <div className="policy-fit-grid">
        <article className={regionAligned ? "policy-fit-card aligned" : "policy-fit-card warning"}>
          <Tag tone={regionAligned ? "primary" : "warning"}>지역</Tag>
          <strong>{regionAligned ? "지역 조건 일치" : "지역 조건 확인 필요"}</strong>
          <span className="meta">
            {regionAligned
              ? `${profileRegion ?? "내 관심 지역"} 기준으로 ${policy.region} 정책 범위와 맞습니다.`
              : `내 관심 지역은 ${profileRegion ?? "미설정"}, 정책 지역은 ${policy.region}입니다.`}
          </span>
        </article>
        <article className="policy-fit-card">
          <Tag tone="gray">대상</Tag>
          <strong>핵심 조건 {policy.requirements.length}개</strong>
          <ul>
            {requirementPreview.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </article>
        <article className="policy-fit-card">
          <Tag tone={policy.documents.length > 0 ? "warning" : "gray"}>서류</Tag>
          <strong>{policy.documents.length > 0 ? "서류 준비 필요" : "서류 확인 필요"}</strong>
          <span className="meta">{documentPreview.length > 0 ? documentPreview.join(", ") : "공식 안내에서 제출 서류를 확인해 주세요."}</span>
        </article>
      </div>
    </section>
  );
}

function BenefitBundlePreview({ policy }: { policy: Policy }) {
  return (
    <section className="section-block benefit-package" aria-labelledby="benefit-package-title">
      <div className="section-title-row">
        <div>
          <p className="state-eyebrow">여행 혜택 패키지</p>
          <h3 id="benefit-package-title">이 정책과 함께 확인할 혜택</h3>
        </div>
        <Tag tone="gray">공식 확인 필요</Tag>
      </div>
      <p className="meta">이 정책을 일정에 담으면 대표 지원, 교통, 지역 할인 후보를 한 화면에서 함께 확인할 수 있어요.</p>
      <div className="benefit-package-grid">
        <article className="benefit-package-card primary">
          <span>대표 지원</span>
          <strong>{policy.title}</strong>
          <p>{policy.amount} · 여행 전 신청과 조건 확인이 필요해요.</p>
        </article>
        <article className="benefit-package-card">
          <span>교통 혜택</span>
          <strong>기차·항공 이동 혜택 후보</strong>
          <p>이동수단이 정해지면 교통 할인이나 포인트 적립 가능성을 확인해요.</p>
        </article>
        <article className="benefit-package-card">
          <span>지역 할인</span>
          <strong>{policy.region} 주변 할인 후보</strong>
          <p>입장료, 체험, 숙박, 지역 투어 할인은 공식 페이지에서 최종 확인해요.</p>
        </article>
      </div>
    </section>
  );
}

function PolicyFaqAccordion({ policy }: { policy: Policy }) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const faqItems = buildPolicyFaqs(policy);

  return (
    <section className="section-block faq-accordion" aria-labelledby="policy-faq-title">
      <h3 id="policy-faq-title">자주 묻는 질문</h3>
      <div className="faq-list">
        {faqItems.map((item) => {
          const isOpen = openFaqId === item.id;
          const panelId = `policy-faq-${item.id}`;
          return (
            <div className="faq-item" key={item.id}>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="faq-question"
                onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                type="button"
              >
                <span>{item.question}</span>
                <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <p className="faq-answer" id={panelId}>
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
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
