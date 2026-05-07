import { ChevronLeft, Heart, Search, Share2, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { appDataApi, type Trip } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { PolicyListCard } from "../components/cards";
import { Button, EmptyState, ErrorState, IconButton, LoadingState, Tag, Toast, TopBar } from "../components/ui";
import { dday } from "../utils";

type TripSheetStatus = "closed" | "loading" | "empty" | "ready" | "submitting" | "error" | "success";

function policyTripErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Policy not found")) return "정책 정보를 찾을 수 없어요. 다시 확인해 주세요.";
  if (message.includes("Trip not found")) return "일정을 찾을 수 없어요. 다른 일정을 선택해 주세요.";
  return "일정에 혜택을 담지 못했어요. 잠시 후 다시 시도해 주세요.";
}

const allFilter = "전체";
const categoryFilters = [allFilter, "환급", "숙박", "캐시백"] as const;

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
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
      {error && <ErrorState message={error} />}
      {!isLoading && !error && visiblePolicies.length === 0 && (
        <EmptyState
          title={hasActiveFilters ? "검색 조건에 맞는 정책이 없어요" : "등록된 정책이 아직 없어요"}
          body={hasActiveFilters ? "검색어를 줄이거나 지역과 카테고리를 다시 선택해보세요." : "새로운 여행 혜택이 등록되면 이곳에서 확인할 수 있어요."}
          action={<Button onClick={resetFilters}>전체 보기</Button>}
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

export function PolicyDetailPage() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const { addedPolicy, addPolicy, likedPolicy, togglePolicyLike } = useSession();
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

  const copyPolicyLink = async () => {
    if (!policy) return;
    const policyUrl = `${window.location.origin}/policies/${policy.slug}`;
    try {
      if (window.navigator.clipboard) await window.navigator.clipboard.writeText(policyUrl);
      setNotice("정책 링크를 복사했어요.");
    } catch {
      setNotice("정책 링크를 복사하지 못했어요. 주소창의 URL을 직접 복사해 주세요.");
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
          <ErrorState message={error ?? "정책 정보를 찾지 못했어요."} />
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
            <IconButton label="공유" onClick={copyPolicyLink}>
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
