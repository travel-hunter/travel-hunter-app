import { Bot, ChevronLeft, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appDataApi, type Recommendation, type RecommendationCategoryGroup, type Trip, type TripPlaceRequest } from "../../api";
import { useAsyncResource } from "../../api/useAsyncResource";
import { KakaoMapView, type KakaoMapMarker } from "../../components/map/KakaoMapView";
import { Button, EmptyState, ErrorState, IconButton, LoadingState, Tag, Toast, TopBar } from "../../components/ui";
import { resolveTripId } from "./_shared";

const categoryLabels: Record<RecommendationCategoryGroup | "other", string> = {
  stay: "숙소",
  food: "맛집",
  attraction: "명소",
  other: "기타",
};

function recommendationCategory(item: Recommendation): RecommendationCategoryGroup | "other" {
  if (item.categoryGroup === "stay" || item.categoryGroup === "food" || item.categoryGroup === "attraction") return item.categoryGroup;
  return "other";
}

function recommendationDayNumber(item: Recommendation): number {
  if (item.suggestedDay && item.suggestedDay > 0) return item.suggestedDay;
  const englishDay = /\bDay\s+([1-9][0-9]*)\b/i.exec(item.meta);
  const koreanDay = /([1-9][0-9]*)\s*일차/.exec(item.meta);
  const rawDay = englishDay?.[1] ?? koreanDay?.[1];
  const dayNumber = rawDay ? Number(rawDay) : 1;
  return Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : 1;
}

function recommendationPlacePayload(item: Recommendation): TripPlaceRequest {
  return {
    label: item.title,
    meta: item.aiReview || [item.meta, item.reason].filter(Boolean).join(" · "),
    address: item.address ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    categoryCode: item.categoryCode ?? null,
    placeUrl: item.placeUrl ?? null,
    sourceProvider: item.sourceProvider ?? null,
    externalPlaceId: item.externalPlaceId ?? null,
  };
}

function recommendationKey(item: Recommendation, index: number): string {
  return item.id ?? item.externalPlaceId ?? `${item.title}:${item.meta}:${index}`;
}

function normalizePlaceTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function tripHasRecommendation(trip: Trip | null, item: Recommendation): boolean {
  if (!trip) return false;
  const recommendationTitle = normalizePlaceTitle(item.title);
  return Object.values(trip.days).some((places) =>
    places.some((place) => normalizePlaceTitle(place.label) === recommendationTitle),
  );
}

function tripDayNumbers(trip: Trip | null): number[] {
  return Object.keys(trip?.days ?? { 1: [] })
    .map(Number)
    .filter((day) => Number.isFinite(day))
    .sort((a, b) => a - b);
}

export function AiResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get("tripId");
  const [activeTripId, setActiveTripId] = useState(requestedTripId ?? "");
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null);
  const [pendingCandidateKey, setPendingCandidateKey] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [tripOverride, setTripOverride] = useState<Trip | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [addingRecommendationKey, setAddingRecommendationKey] = useState<string | null>(null);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const detailPath = activeTripId ? `/trips/${activeTripId}` : "/trips";
  const { data, error, isLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    setActiveTripId(resolvedTripId ?? "");
    setTripOverride(null);
    if (!resolvedTripId) return { recommendations: [], trip: null };
    const [recommendations, trip] = await Promise.all([
      appDataApi.listRecommendations(resolvedTripId),
      appDataApi.getTrip(resolvedTripId).catch(() => null),
    ]);
    return { recommendations, trip };
  }, [requestedTripId]);
  const recommendations = data?.recommendations ?? [];
  const activeTrip = tripOverride ?? data?.trip ?? null;
  const dayNumbers = tripDayNumbers(activeTrip);
  const selectedCandidate = recommendations.find((item, index) => recommendationKey(item, index) === selectedCandidateKey) ?? null;
  const pendingCandidate = recommendations.find((item, index) => recommendationKey(item, index) === pendingCandidateKey) ?? null;

  useEffect(() => {
    setActiveDay(dayNumbers[0] ?? 1);
  }, [activeTrip?.id]);

  const groupedRecommendations = useMemo(() => {
    const groups: Record<RecommendationCategoryGroup | "other", Array<{ item: Recommendation; itemKey: string }>> = {
      stay: [],
      food: [],
      attraction: [],
      other: [],
    };
    recommendations.forEach((item, index) => {
      groups[recommendationCategory(item)].push({ item, itemKey: recommendationKey(item, index) });
    });
    return groups;
  }, [recommendations]);

  const openDayPicker = (itemKey: string) => {
    setSelectedCandidateKey(itemKey);
    setPendingCandidateKey(itemKey);
    setAddError("");
  };

  const addRecommendationToTrip = async (dayNumber: number) => {
    if (!activeTripId || !pendingCandidate || addingRecommendationKey) return;
    const itemKey = pendingCandidateKey ?? recommendationKey(pendingCandidate, 0);
    setAddError("");
    setNotice(null);
    setAddingRecommendationKey(itemKey);
    try {
      const nextTrip = await appDataApi.addTripPlace(activeTripId, dayNumber, recommendationPlacePayload(pendingCandidate));
      const refreshedTrip = await appDataApi.getTrip(activeTripId).catch(() => nextTrip);
      setTripOverride(refreshedTrip);
      setActiveDay(dayNumber);
      setPendingCandidateKey(null);
      setNotice(`${pendingCandidate.title}을 Day ${dayNumber} 일정에 추가했어요.`);
    } catch {
      setAddError("후보 장소를 일정에 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAddingRecommendationKey(null);
    }
  };

  return (
    <section className="screen">
      <TopBar
        title="AI 추천 결과"
        left={
          <IconButton label="일정 상세" to={detailPath}>
            <ChevronLeft size={20} />
          </IconButton>
        }
        right={
          <button className="icon-btn" type="button" aria-label="추천 기준" onClick={() => setIsCriteriaOpen(true)}>
            <Bot size={18} />
          </button>
        }
      />
      <div className="content stack padded">
        <div className="card">
          <div className="card-body">
            <Tag tone="primary">AI 후보 검토</Tag>
            <h3>{activeTrip?.title ?? "현재 일정"}에 더할 장소 후보</h3>
            <p className="meta">기존 일정과 겹치지 않는 후보를 지도 중심으로 묶어 보여줍니다.</p>
          </div>
        </div>
        {isLoading && <LoadingState label="AI 추천 후보를 불러오는 중입니다" />}
        {error && <ErrorState message={error} />}
        {addError && <p className="form-error">{addError}</p>}
        {!isLoading && !error && recommendations.length === 0 && (
          <EmptyState title="추천 후보가 아직 없어요" body="일정 조건을 다시 조정하면 더 알맞은 장소를 찾을 수 있어요." action={<Button onClick={() => navigate("/trips/new")}>일정 조건 바꾸기</Button>} />
        )}
        {!isLoading && !error && recommendations.length > 0 && (
          <div className="ai-results-layout">
            <CandidateMap
              candidates={recommendations}
              onSelect={(itemKey) => {
                if (itemKey) openDayPicker(itemKey);
                else setSelectedCandidateKey(null);
              }}
              selectedKey={selectedCandidateKey}
            />
            <div className="ai-candidate-panel">
              {(Object.keys(groupedRecommendations) as Array<RecommendationCategoryGroup | "other">).map((category) => {
                const items = groupedRecommendations[category];
                if (items.length === 0) return null;
                return (
                  <section className="ai-category-section" aria-label={`${categoryLabels[category]} 후보`} key={category}>
                    <div className="ai-category-head">
                      <h3>{categoryLabels[category]}</h3>
                      <Tag tone="gray">{items.length}곳</Tag>
                    </div>
                    {items.map(({ item, itemKey }) => {
                      const alreadyAdded = tripHasRecommendation(activeTrip, item);
                      const isSelected = selectedCandidateKey === itemKey;
                      return (
                        <button
                          aria-pressed={isSelected}
                          className={isSelected ? "ai-candidate-card active" : "ai-candidate-card"}
                          disabled={addingRecommendationKey === itemKey}
                          key={itemKey}
                          onClick={() => openDayPicker(itemKey)}
                          type="button"
                        >
                          <strong>{item.title}</strong>
                          <span className="ai-candidate-meta">{item.address || item.meta}</span>
                          <span className="ai-candidate-review">{item.aiReview || item.reason}</span>
                          <Tag tone={alreadyAdded ? "gray" : "primary"}>{alreadyAdded ? "이미 일정에 있음" : `Day ${recommendationDayNumber(item)} 추천`}</Tag>
                        </button>
                      );
                    })}
                  </section>
                );
              })}
              <TripPreview trip={activeTrip} activeDay={activeDay} onSelectDay={setActiveDay} />
            </div>
          </div>
        )}
        {notice && <Toast>{notice}</Toast>}
      </div>
      {pendingCandidate && (
        <DayPicker
          candidate={pendingCandidate}
          dayNumbers={dayNumbers}
          isSaving={addingRecommendationKey === pendingCandidateKey}
          onClose={() => setPendingCandidateKey(null)}
          onSelectDay={(dayNumber) => void addRecommendationToTrip(dayNumber)}
        />
      )}
      {selectedCandidate && !pendingCandidate && (
        <span className="sr-only" aria-live="polite">
          {selectedCandidate.title} 선택됨
        </span>
      )}
      {isCriteriaOpen && <RecommendationCriteriaSheet onClose={() => setIsCriteriaOpen(false)} />}
    </section>
  );
}

function CandidateMap({
  candidates,
  onSelect,
  selectedKey,
}: {
  candidates: Recommendation[];
  onSelect: (itemKey: string | null) => void;
  selectedKey: string | null;
}) {
  const markers: KakaoMapMarker[] = candidates.map((candidate, index) => ({
    id: recommendationKey(candidate, index),
    label: candidate.title,
    subtitle: candidate.address || candidate.meta,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  }));
  const fallbackMap = (
    <div className="ai-map-surface">
      <div className="ai-map-route-line" aria-hidden="true" />
      {candidates.map((candidate, index) => {
        const itemKey = recommendationKey(candidate, index);
        const isSelected = selectedKey === itemKey;
        return (
          <button
            aria-label={`${candidate.title} 선택`}
            aria-pressed={isSelected}
            className={isSelected ? "ai-map-pin active" : "ai-map-pin"}
            key={itemKey}
            onClick={() => onSelect(isSelected ? null : itemKey)}
            style={{
              left: `${24 + (index % 3) * 24}%`,
              top: `${26 + (index % 4) * 14}%`,
            }}
            type="button"
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="ai-candidate-map">
      <KakaoMapView
        ariaLabel="추천 후보 지도"
        fallback={fallbackMap}
        markers={markers}
        onSelectMarker={onSelect}
        selectedMarkerId={selectedKey}
      />
    </div>
  );
}

function DayPicker({
  candidate,
  dayNumbers,
  isSaving,
  onClose,
  onSelectDay,
}: {
  candidate: Recommendation;
  dayNumbers: number[];
  isSaving: boolean;
  onClose: () => void;
  onSelectDay: (dayNumber: number) => void;
}) {
  const days = dayNumbers.length > 0 ? dayNumbers : [recommendationDayNumber(candidate)];

  return (
    <section className="ai-day-picker" role="dialog" aria-modal="false" aria-labelledby="ai-day-picker-title">
      <div className="ai-day-picker-head">
        <div>
          <Tag tone="primary">일정 추가</Tag>
          <h3 id="ai-day-picker-title">장소를 추가할 일차 선택</h3>
        </div>
        <button className="icon-btn" aria-label="닫기" onClick={onClose} type="button">
          <X size={16} />
        </button>
      </div>
      <p className="meta">{candidate.title}을 어느 날 일정에 넣을지 선택하세요.</p>
      <div className="ai-day-picker-actions">
        {days.map((dayNumber) => (
          <Button disabled={isSaving} key={dayNumber} onClick={() => onSelectDay(dayNumber)} variant="secondary">
            {isSaving ? "추가 중" : `Day ${dayNumber}에 추가`}
          </Button>
        ))}
      </div>
    </section>
  );
}

function TripPreview({
  activeDay,
  onSelectDay,
  trip,
}: {
  activeDay: number;
  onSelectDay: (dayNumber: number) => void;
  trip: Trip | null;
}) {
  const days = tripDayNumbers(trip);
  const places = trip?.days[activeDay] ?? [];

  if (!trip || days.length === 0) return null;

  return (
    <section className="card" aria-label="현재 일정 미리보기">
      <div className="card-body stack tight">
        <div className="ai-category-head">
          <h3>현재 일정</h3>
          <Tag tone="gray">{places.length}곳</Tag>
        </div>
        <div className="segmented-control" role="tablist" aria-label="일차 선택">
          {days.map((dayNumber) => (
            <button
              aria-selected={activeDay === dayNumber}
              className={activeDay === dayNumber ? "active" : ""}
              key={dayNumber}
              onClick={() => onSelectDay(dayNumber)}
              role="tab"
              type="button"
            >
              Day {dayNumber}
            </button>
          ))}
        </div>
        {places.length === 0 ? (
          <p className="meta">아직 이 날짜에 등록된 장소가 없어요.</p>
        ) : (
          <div className="stack tight">
            {places.map((place) => (
              <div className="setting-row" key={place.id ?? `${place.label}-${place.time}`}>
                <strong>{place.label}</strong>
                <span className="meta">{place.address || place.meta}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RecommendationCriteriaSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="trip-select-sheet" role="dialog" aria-modal="true" aria-labelledby="recommendation-criteria-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <Tag tone="primary">추천 기준</Tag>
            <h2 id="recommendation-criteria-title">AI 추천 기준</h2>
            <p className="meta">현재 추천은 저장된 정책과 일정 정보를 바탕으로 후보를 정리합니다.</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="stack tight">
          <div className="setting-row">
            <strong>정책 조건</strong>
            <span className="meta">일정에 연결된 정책의 지역, 대상 조건, 마감일을 우선 고려합니다.</span>
          </div>
          <div className="setting-row">
            <strong>이동 거리</strong>
            <span className="meta">같은 일차 안에서 이동 부담이 적은 후보를 우선 보여줍니다.</span>
          </div>
          <div className="setting-row">
            <strong>예산</strong>
            <span className="meta">사용자의 예산 설정과 예상 절감액이 맞는 장소를 함께 봅니다.</span>
          </div>
          <div className="setting-row">
            <strong>여행 스타일</strong>
            <span className="meta">휴식, 맛집, 체험 같은 선호 스타일과 맞는 후보를 고릅니다.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
