import { Bot, ChevronLeft } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  appDataApi,
  type Recommendation,
  type RecommendationCategoryGroup,
  type Trip,
  type TripPlaceRequest,
} from "../../api";
import { useAsyncResource } from "../../api/useAsyncResource";
import {
  KakaoMapView,
  type KakaoMapMarker,
} from "../../components/map/KakaoMapView";
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Tag,
  Toast,
  TopBar,
} from "../../components/ui";
import { resolveTripId } from "./_shared";

const categoryLabels: Record<RecommendationCategoryGroup | "other", string> = {
  stay: "숙소",
  food: "맛집",
  attraction: "명소",
  other: "기타",
};

const categoryIcons: Record<RecommendationCategoryGroup | "other", string> = {
  stay: "🛏️",
  food: "🍜",
  attraction: "📍",
  other: "✨",
};

function recommendationCategory(
  item: Recommendation,
): RecommendationCategoryGroup | "other" {
  if (
    item.categoryGroup === "stay" ||
    item.categoryGroup === "food" ||
    item.categoryGroup === "attraction"
  )
    return item.categoryGroup;
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
    meta: recommendationPlaceDescription(item),
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
  return (
    item.id ?? item.externalPlaceId ?? `${item.title}:${item.meta}:${index}`
  );
}

function normalizePlaceTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function tripHasRecommendation(
  trip: Trip | null,
  item: Recommendation,
): boolean {
  if (!trip) return false;
  const recommendationTitle = normalizePlaceTitle(item.title);
  return Object.values(trip.days).some((places) =>
    places.some(
      (place) => normalizePlaceTitle(place.label) === recommendationTitle,
    ),
  );
}

function tripDayNumbers(trip: Trip | null): number[] {
  return Object.keys(trip?.days ?? { 1: [] })
    .map(Number)
    .filter((day) => Number.isFinite(day))
    .sort((a, b) => a - b);
}

function recommendationLocationLabel(item: Recommendation): string {
  return item.address || item.meta || "위치 확인 필요";
}

function recommendationPlaceDescription(item: Recommendation): string {
  const officialParts = [item.categoryName, item.phone].filter(
    (part): part is string => Boolean(part),
  );
  if (officialParts.length > 0) return officialParts.join(" · ");
  if (item.categoryCode) {
    return `${categoryLabels[recommendationCategory(item)]} · ${item.categoryCode}`;
  }
  return item.address || item.meta || "카카오 장소 정보 확인";
}

function recommendationCompactCategoryLabel(item: Recommendation): string {
  const categoryParts =
    item.categoryName
      ?.split(">")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];
  const categoryLeaf = categoryParts[categoryParts.length - 1];
  if (categoryLeaf) return categoryLeaf;
  if (item.categoryCode) return categoryLabels[recommendationCategory(item)];
  return categoryLabels[recommendationCategory(item)] || item.meta || "장소";
}

function compactDayLabel(dayNumber: number): string {
  return `D${dayNumber}`;
}

export function AiResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get("tripId");
  const [activeTripId, setActiveTripId] = useState(requestedTripId ?? "");
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<
    string | null
  >(null);
  const [dayPickerCandidateKey, setDayPickerCandidateKey] = useState<
    string | null
  >(null);
  const [activeDay, setActiveDay] = useState(1);
  const [pendingAddDay, setPendingAddDay] = useState(1);
  const [tripOverride, setTripOverride] = useState<Trip | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [addingRecommendationKey, setAddingRecommendationKey] = useState<
    string | null
  >(null);
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
  const selectedCandidate =
    recommendations.find(
      (item, index) => recommendationKey(item, index) === selectedCandidateKey,
    ) ?? null;
  const dayPickerCandidate =
    recommendations.find(
      (item, index) => recommendationKey(item, index) === dayPickerCandidateKey,
    ) ?? null;
  const selectedAlreadyAdded = selectedCandidate
    ? tripHasRecommendation(activeTrip, selectedCandidate)
    : false;
  const selectedMapCandidate =
    selectedCandidate && selectedCandidateKey
      ? { item: selectedCandidate, itemKey: selectedCandidateKey }
      : null;
  const selectedSummaryCandidate = selectedCandidate;

  useEffect(() => {
    const initialDay = dayNumbers[0] ?? 1;
    setActiveDay(initialDay);
    setPendingAddDay(initialDay);
  }, [activeTrip?.id]);

  useEffect(() => {
    if (recommendations.length === 0) {
      setSelectedCandidateKey(null);
      setDayPickerCandidateKey(null);
      return;
    }

    const hasSelectedCandidate = Boolean(
      selectedCandidateKey &&
      recommendations.some(
        (item, index) =>
          recommendationKey(item, index) === selectedCandidateKey,
      ),
    );
    if (hasSelectedCandidate) return;

    const firstCandidate = recommendations[0];
    const firstCandidateKey = recommendationKey(firstCandidate, 0);
    const recommendedDay = recommendationDayNumber(firstCandidate);
    const resolvedDay = dayNumbers.includes(recommendedDay)
      ? recommendedDay
      : (dayNumbers[0] ?? recommendedDay);

    setSelectedCandidateKey(firstCandidateKey);
    setActiveDay(resolvedDay);
    setPendingAddDay(resolvedDay);
  }, [activeTrip?.id, recommendations, selectedCandidateKey]);

  const groupedRecommendations = useMemo(() => {
    const groups: Record<
      RecommendationCategoryGroup | "other",
      Array<{ item: Recommendation; itemKey: string }>
    > = {
      stay: [],
      food: [],
      attraction: [],
      other: [],
    };
    recommendations.forEach((item, index) => {
      groups[recommendationCategory(item)].push({
        item,
        itemKey: recommendationKey(item, index),
      });
    });
    return groups;
  }, [recommendations]);

  const selectCandidate = (itemKey: string) => {
    const item = recommendations.find(
      (candidate, index) => recommendationKey(candidate, index) === itemKey,
    );
    setSelectedCandidateKey(itemKey);
    setDayPickerCandidateKey(null);
    if (item) {
      const recommendedDay = recommendationDayNumber(item);
      const resolvedDay = dayNumbers.includes(recommendedDay)
        ? recommendedDay
        : (dayNumbers[0] ?? recommendedDay);
      setActiveDay(resolvedDay);
      setPendingAddDay(resolvedDay);
    }
    setAddError("");
  };

  const openDayPicker = (itemKey: string) => {
    const item = recommendations.find(
      (candidate, index) => recommendationKey(candidate, index) === itemKey,
    );
    if (!item || tripHasRecommendation(activeTrip, item)) return;
    setSelectedCandidateKey(itemKey);
    setDayPickerCandidateKey(itemKey);
    const recommendedDay = recommendationDayNumber(item);
    const resolvedDay = dayNumbers.includes(recommendedDay)
      ? recommendedDay
      : (dayNumbers[0] ?? recommendedDay);
    setActiveDay(resolvedDay);
    setPendingAddDay(resolvedDay);
    setAddError("");
  };

  const addRecommendationToTrip = async (dayNumber: number) => {
    if (
      !activeTripId ||
      !dayPickerCandidate ||
      !dayPickerCandidateKey ||
      addingRecommendationKey
    )
      return;
    const itemKey = dayPickerCandidateKey;
    setAddError("");
    setNotice(null);
    setAddingRecommendationKey(itemKey);
    try {
      const nextTrip = await appDataApi.addTripPlace(
        activeTripId,
        dayNumber,
        recommendationPlacePayload(dayPickerCandidate),
      );
      const refreshedTrip = await appDataApi
        .getTrip(activeTripId)
        .catch(() => nextTrip);
      setTripOverride(refreshedTrip);
      setActiveDay(dayNumber);
      setDayPickerCandidateKey(null);
      setNotice(
        `${dayPickerCandidate.title}을 Day ${dayNumber} 일정에 추가했어요.`,
      );
    } catch {
      setAddError(
        "후보 장소를 일정에 추가하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setAddingRecommendationKey(null);
    }
  };

  return (
    <section className="screen ai-results-screen prototype-trip-detail-screen">
      <TopBar
        title="AI 추천 후보"
        left={
          <IconButton label="일정 상세" to={detailPath}>
            <ChevronLeft size={20} />
          </IconButton>
        }
        right={
          <button
            className="icon-btn"
            type="button"
            aria-label="추천 기준 보기"
            onClick={() => setIsCriteriaOpen(true)}
          >
            <Bot size={18} />
          </button>
        }
      />
      <div className="content ai-results-content">
        {isLoading && <LoadingState label="추천 후보를 불러오는 중입니다" />}
        {error && (
          <ErrorState message={`추천 후보를 불러오지 못했어요. ${error}`} />
        )}
        {addError && <p className="form-error">{addError}</p>}
        {!isLoading && !error && recommendations.length === 0 && (
          <EmptyState
            title="추가할 후보가 없어요"
            body="현재 일정에 바로 더할 추천 후보가 없습니다."
            action={
              <Button onClick={() => navigate(detailPath)}>
                일정으로 돌아가기
              </Button>
            }
          />
        )}
        {!isLoading && !error && recommendations.length > 0 && (
          <div className="ai-results-layout ai-results-workspace ai-results-map-first">
            <section
              className="ai-map-column ai-map-column-primary"
              aria-label="후보 지도 확인"
            >
              <div className="ai-map-card">
                <CandidateMap
                  candidate={selectedMapCandidate}
                  onSelect={(itemKey) => {
                    if (itemKey) selectCandidate(itemKey);
                    else {
                      setSelectedCandidateKey(null);
                      setDayPickerCandidateKey(null);
                    }
                  }}
                  selectedKey={selectedCandidateKey}
                />
                <section
                  className="ai-map-selected-summary"
                  aria-label="선택 후보 요약"
                  aria-live="polite"
                >
                  {selectedSummaryCandidate ? (
                    <>
                      <h2>{selectedSummaryCandidate.title}</h2>
                      <p className="meta">
                        {recommendationLocationLabel(selectedSummaryCandidate)}
                      </p>
                      <p className="meta">
                        {recommendationPlaceDescription(
                          selectedSummaryCandidate,
                        )}
                      </p>
                      {selectedSummaryCandidate.placeUrl && (
                        <a
                          className="ai-map-selected-link"
                          href={selectedSummaryCandidate.placeUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          카카오맵 보기
                        </a>
                      )}
                    </>
                  ) : (
                    <strong>후보를 선택해 주세요</strong>
                  )}
                </section>
              </div>
            </section>

            <div className="ai-candidate-panel ai-planning-rail ai-candidate-list-compact">
              {(
                Object.keys(groupedRecommendations) as Array<
                  RecommendationCategoryGroup | "other"
                >
              ).map((category) => {
                const items = groupedRecommendations[category];
                if (items.length === 0) return null;
                return (
                  <section
                    className="ai-category-section"
                    aria-label={`${categoryLabels[category]} 후보`}
                    key={category}
                  >
                    <div className="ai-category-head">
                      <h3>{categoryLabels[category]}</h3>
                      <Tag tone="gray">{items.length}곳</Tag>
                    </div>
                    {items.map(({ item, itemKey }) => {
                      const alreadyAdded = tripHasRecommendation(
                        activeTrip,
                        item,
                      );
                      const isSelected = selectedCandidateKey === itemKey;
                      const isDayPickerOpen =
                        dayPickerCandidateKey === itemKey && !alreadyAdded;
                      const isSaving = addingRecommendationKey === itemKey;
                      const pickerDays =
                        dayNumbers.length > 0
                          ? dayNumbers
                          : [recommendationDayNumber(item)];
                      const className = [
                        "ai-candidate-card",
                        isSelected ? "active" : "",
                        alreadyAdded ? "ai-candidate-card-added" : "",
                        isDayPickerOpen ? "ai-candidate-card-picker-open" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <Fragment key={itemKey}>
                          <div
                            className={className}
                            data-testid={`ai-candidate-card-${itemKey}`}
                          >
                            <button
                              aria-label={`${item.title} 선택`}
                              aria-pressed={isSelected}
                              className="ai-candidate-select"
                              disabled={isSaving}
                              onClick={() => selectCandidate(itemKey)}
                              type="button"
                            >
                              <span
                                className="ai-candidate-icon"
                                aria-hidden="true"
                              >
                                {categoryIcons[recommendationCategory(item)]}
                              </span>
                              <span className="ai-candidate-copy">
                                <strong>{item.title}</strong>
                                <span className="ai-candidate-review">
                                  {recommendationCompactCategoryLabel(item)}
                                </span>
                              </span>
                            </button>
                            <span className="ai-candidate-actions">
                              {alreadyAdded ? (
                                <span className="ai-candidate-cta">
                                  이미 추가됨
                                </span>
                              ) : (
                                <button
                                  aria-label={`${item.title} 추가`}
                                  aria-controls={
                                    isDayPickerOpen
                                      ? "ai-inline-day-selector"
                                      : undefined
                                  }
                                  aria-expanded={isDayPickerOpen}
                                  className="ai-candidate-add-button"
                                  disabled={isSaving}
                                  onClick={() => openDayPicker(itemKey)}
                                  type="button"
                                >
                                  {isSaving ? "추가 중" : "추가"}
                                </button>
                              )}
                            </span>
                          </div>
                          {isDayPickerOpen && (
                            <CandidateInlineDaySelector
                              activeDay={pendingAddDay}
                              candidate={item}
                              dayNumbers={pickerDays}
                              isSaving={isSaving}
                              onAdd={() =>
                                void addRecommendationToTrip(pendingAddDay)
                              }
                              onClose={() => setDayPickerCandidateKey(null)}
                              onSelectDay={setPendingAddDay}
                            />
                          )}
                        </Fragment>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </div>
        )}
        {notice && <Toast>{notice}</Toast>}
      </div>
      {selectedCandidate && !dayPickerCandidate && (
        <span className="sr-only" aria-live="polite">
          {selectedCandidate.title} 선택됨
          {selectedAlreadyAdded ? ", 이미 추가됨" : ""}
        </span>
      )}
      {isCriteriaOpen && (
        <RecommendationCriteriaSheet onClose={() => setIsCriteriaOpen(false)} />
      )}
    </section>
  );
}
function CandidateMap({
  candidate,
  onSelect,
  selectedKey,
}: {
  candidate: { item: Recommendation; itemKey: string } | null;
  onSelect: (itemKey: string | null) => void;
  selectedKey: string | null;
}) {
  const markers: KakaoMapMarker[] = candidate
    ? [
        {
          id: candidate.itemKey,
          label: candidate.item.title,
          subtitle: candidate.item.address || candidate.item.meta,
          latitude: candidate.item.latitude,
          longitude: candidate.item.longitude,
          query: candidate.item.address || candidate.item.title,
        },
      ]
    : [];
  const fallbackMap = (
    <div className="ai-map-surface">
      <div className="ai-map-route-line" aria-hidden="true" />
      {candidate ? (
        (() => {
          const itemKey = candidate.itemKey;
          const isSelected = selectedKey === itemKey;
          return (
            <button
              aria-label={`${candidate.item.title} 선택`}
              aria-pressed={isSelected}
              className={isSelected ? "ai-map-pin active" : "ai-map-pin"}
              key={itemKey}
              onClick={() => onSelect(isSelected ? null : itemKey)}
              style={{ left: "50%", top: "42%" }}
              type="button"
            >
              1
            </button>
          );
        })()
      ) : (
        <p className="ai-map-empty-copy">
          후보를 선택하면 지도에 위치가 표시돼요.
        </p>
      )}
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

function CandidateInlineDaySelector({
  activeDay,
  candidate,
  dayNumbers,
  isSaving,
  onAdd,
  onClose,
  onSelectDay,
}: {
  activeDay: number;
  candidate: Recommendation;
  dayNumbers: number[];
  isSaving: boolean;
  onAdd: () => void;
  onClose: () => void;
  onSelectDay: (dayNumber: number) => void;
}) {
  const days =
    dayNumbers.length > 0 ? dayNumbers : [recommendationDayNumber(candidate)];

  return (
    <div
      className="ai-inline-day-selector"
      id="ai-inline-day-selector"
      role="dialog"
      aria-label={`${candidate.title} Day 선택`}
    >
      <div className="ai-inline-day-selector-head">
        <h3>Day 선택</h3>
        <button
          aria-label="Day 선택 닫기"
          className="ai-inline-day-selector-close"
          disabled={isSaving}
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="ai-slim-day-tabs" role="group" aria-label="Day 선택">
        {days.map((dayNumber) => (
          <button
            aria-pressed={activeDay === dayNumber}
            className={
              activeDay === dayNumber ? "ai-slim-day active" : "ai-slim-day"
            }
            disabled={isSaving}
            key={dayNumber}
            onClick={() => onSelectDay(dayNumber)}
            type="button"
          >
            {compactDayLabel(dayNumber)}
          </button>
        ))}
      </div>
      <button
        aria-label={`Day ${activeDay}에 추가`}
        className="ai-inline-day-selector-add"
        disabled={isSaving}
        onClick={onAdd}
        type="button"
      >
        {isSaving ? "추가 중" : `Day ${activeDay}에 추가`}
      </button>
    </div>
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
    <section className="ai-trip-preview" aria-label="현재 일정 미리보기">
      <div className="stack tight">
        <div className="ai-category-head">
          <div>
            <span className="ai-section-kicker">현재 일정</span>
            <h3>Day {activeDay}</h3>
          </div>
          <Tag tone="gray">{places.length}곳</Tag>
        </div>
        <div className="ai-preview-tabs" role="tablist" aria-label="일차 선택">
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
          <div className="ai-preview-timeline">
            {places.map((place) => (
              <div
                className="ai-preview-place"
                key={place.id ?? `${place.label}-${place.time}`}
              >
                <span className="timeline-marker" aria-hidden="true">
                  <span />
                </span>
                <div>
                  <strong>{place.label}</strong>
                  <span className="meta">{place.address || place.meta}</span>
                </div>
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
      <section
        className="trip-select-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-criteria-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <Tag tone="primary">추천 기준</Tag>
            <h2 id="recommendation-criteria-title">추천 기준</h2>
            <p className="meta">정책, 일정, 위치 단서를 함께 봅니다.</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="stack tight">
          <div className="setting-row">
            <strong>정책 조건</strong>
            <span className="meta">
              일정에 연결된 정책의 지역, 대상 조건, 마감일을 우선 고려합니다.
            </span>
          </div>
          <div className="setting-row">
            <strong>이동 거리</strong>
            <span className="meta">
              같은 일차 안에서 이동 부담이 적은 후보를 우선 보여줍니다.
            </span>
          </div>
          <div className="setting-row">
            <strong>예산</strong>
            <span className="meta">
              사용자의 예산 설정과 예상 절감액이 맞는 장소를 함께 봅니다.
            </span>
          </div>
          <div className="setting-row">
            <strong>여행 스타일</strong>
            <span className="meta">
              휴식, 맛집, 체험 같은 선호 스타일과 맞는 후보를 고릅니다.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
