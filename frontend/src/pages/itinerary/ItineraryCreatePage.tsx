import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appDataApi, type TravelAreaRecommendation } from "../../api";
import { useSession } from "../../app/session";
import { useAsyncResource } from "../../api/useAsyncResource";
import { Button, ErrorState, IconButton } from "../../components/ui";
import { tripCreatePrimaryRegions, tripCreatePrimaryRegionValues } from "../../data/displayConfig";
import { getDefaultTripDateRange } from "../../utils/dateDefaults";

const TRIP_CREATE_TOTAL_STEPS = 4;
const tripCreateMaxDays = 5;
const tripCreateMinDays = 2;
const broadTravelAreaRegions = new Set<string>(tripCreatePrimaryRegionValues);
const legacyTravelAreaQueryRegions = ["속초", "경주", "강릉"] as const;
const NO_TRAVEL_AREA_HEADING = "세부 지역 선택";
type TripCreateStep = 1 | 2 | 3 | 4;
type SelectedTravelArea = Pick<TravelAreaRecommendation, "travelAreaId" | "travelAreaName" | "sido" | "includedCities" | "summary" | "tags">;

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function tripDateDayCount(startDate: string, endDate: string): number | null {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function formatTripCreateDate(value: string): string {
  return value.replace(/-/g, ".");
}

function generatedTripTitle(region: string, dayCount: number | null): string {
  return `${region || "선택한 지역"} ${dayCount ?? 3}일 여행`;
}

function normalizeRegionParam(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  const supportedRegions = [...tripCreatePrimaryRegionValues, ...legacyTravelAreaQueryRegions];
  return supportedRegions.includes(normalized) ? normalized : null;
}

function normalizeTravelAreaIdParam(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function isBroadTravelAreaRegion(region: string | null | undefined): region is string {
  return Boolean(region && broadTravelAreaRegions.has(region));
}

function toSelectedTravelArea(area: TravelAreaRecommendation): SelectedTravelArea {
  return {
    travelAreaId: area.travelAreaId,
    travelAreaName: area.travelAreaName,
    sido: area.sido,
    includedCities: area.includedCities,
    summary: area.summary,
    tags: area.tags,
  };
}

export function ItineraryCreatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, updateProfile, addPolicy } = useSession();
  const { data: profileOptions } = useAsyncResource(() => appDataApi.getProfileOptions(), []);
  const policySlug = searchParams.get("policySlug") ?? undefined;
  const requestedTravelAreaId = normalizeTravelAreaIdParam(searchParams.get("travelAreaId"));
  const requestedRegion = normalizeRegionParam(searchParams.get("region"));
  const linkablePolicySlug = policySlug;
  const defaultTripDatesRef = useRef(getDefaultTripDateRange());
  const defaultTripStartDate = defaultTripDatesRef.current.startDate;
  const defaultTripEndDate = defaultTripDatesRef.current.endDate;
  const ignoredRequestedTravelAreaIdRef = useRef<string | null>(null);
  const initialDayCount = tripDateDayCount(defaultTripStartDate, defaultTripEndDate);
  const initialRegion = requestedRegion || profile.region || "제주";
  const [selectedRegionDraft, setSelectedRegionDraft] = useState(initialRegion);
  const [selectedTravelArea, setSelectedTravelArea] = useState<SelectedTravelArea | null>(null);
  const [travelAreaChoiceSido, setTravelAreaChoiceSido] = useState<string | null>(
    requestedTravelAreaId ? null : isBroadTravelAreaRegion(requestedRegion) ? requestedRegion : isBroadTravelAreaRegion(initialRegion) ? initialRegion : null,
  );
  const [travelAreaChoiceQuery, setTravelAreaChoiceQuery] = useState<string | null>(requestedTravelAreaId || !requestedRegion || isBroadTravelAreaRegion(requestedRegion) ? null : requestedRegion);
  const [travelAreaRecommendations, setTravelAreaRecommendations] = useState<TravelAreaRecommendation[]>([]);
  const [isTravelAreaLoading, setIsTravelAreaLoading] = useState(false);
  const [travelAreaError, setTravelAreaError] = useState("");
  const [step, setStep] = useState<TripCreateStep>(1);
  const [startDate, setStartDate] = useState(defaultTripStartDate);
  const [endDate, setEndDate] = useState(defaultTripEndDate);
  const [titleDraft, setTitleDraft] = useState(generatedTripTitle(initialRegion, initialDayCount));
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const selectedRegion = (selectedTravelArea?.travelAreaName ?? selectedRegionDraft.trim()) || initialRegion;
  const selectedRegionButton = selectedTravelArea?.sido ?? selectedRegion;
  const requiresTravelAreaSelection = Boolean(requestedTravelAreaId || travelAreaChoiceSido || travelAreaChoiceQuery);
  const dayCount = tripDateDayCount(startDate, endDate);
  const dateRangeError =
    dayCount === null
      ? "출발일과 도착일을 선택하세요."
      : dayCount < tripCreateMinDays || dayCount > tripCreateMaxDays
        ? "일정 기간은 2일부터 5일까지 선택할 수 있습니다."
        : "";
  const linkedPolicyLabel = linkablePolicySlug
    ? linkablePolicySlug.startsWith("travelmonth-")
      ? "선택한 정책까지 일정에 연결할게요"
      : "선택한 정책을 새 일정에 연결할게요"
    : "";
  const canProceed =
    step === 1
      ? Boolean(selectedRegion) && (!requiresTravelAreaSelection || Boolean(selectedTravelArea))
      : step === 2
        ? Boolean(profile.style)
        : step === 3
          ? !dateRangeError
          : Boolean(titleDraft.trim());

  const syncTravelAreaSearchParams = (updates: { region?: string | null; travelAreaId?: string | null }) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (updates.region === null) {
      nextSearchParams.delete("region");
    } else if (updates.region) {
      nextSearchParams.set("region", updates.region);
    }
    if (updates.travelAreaId === null) {
      nextSearchParams.delete("travelAreaId");
    } else if (updates.travelAreaId) {
      nextSearchParams.set("travelAreaId", updates.travelAreaId);
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const applyTravelArea = (area: TravelAreaRecommendation, options?: { syncUrl?: boolean }) => {
    const previousAutoTitle = generatedTripTitle(selectedRegion, dayCount);
    const nextTravelArea = toSelectedTravelArea(area);
    setSelectedTravelArea(nextTravelArea);
    setTravelAreaChoiceSido(area.sido);
    setTravelAreaChoiceQuery(null);
    setSelectedRegionDraft(area.travelAreaName);
    updateProfile("region", area.travelAreaName);
    setTitleDraft((current) => (current.trim() === "" || current === previousAutoTitle ? generatedTripTitle(area.travelAreaName, dayCount) : current));
    if (options?.syncUrl) {
      syncTravelAreaSearchParams({ region: area.sido, travelAreaId: area.travelAreaId });
    }
  };

  useEffect(() => {
    if (!requestedTravelAreaId && requestedRegion) {
      const previousAutoTitle = generatedTripTitle(selectedRegion, dayCount);
      setSelectedRegionDraft(requestedRegion);
      updateProfile("region", requestedRegion);
      setSelectedTravelArea(null);
      if (isBroadTravelAreaRegion(requestedRegion)) {
        setTravelAreaChoiceSido(requestedRegion);
        setTravelAreaChoiceQuery(null);
      } else {
        setTravelAreaChoiceSido(null);
        setTravelAreaChoiceQuery(requestedRegion);
      }
      setTitleDraft((current) => (current.trim() === "" || current === previousAutoTitle ? generatedTripTitle(requestedRegion, dayCount) : current));
    }
  }, [requestedRegion, requestedTravelAreaId]);

  useEffect(() => {
    if (!requestedTravelAreaId) {
      ignoredRequestedTravelAreaIdRef.current = null;
    }
    const shouldIgnoreRequestedTravelAreaId = Boolean(requestedTravelAreaId && ignoredRequestedTravelAreaIdRef.current === requestedTravelAreaId);
    const hasResolvedRequestedTravelArea = Boolean(requestedTravelAreaId && selectedTravelArea?.travelAreaId === requestedTravelAreaId);
    const hasSelectedTravelAreaInRecommendations = Boolean(
      selectedTravelArea && travelAreaRecommendations.some((area) => area.travelAreaId === selectedTravelArea.travelAreaId),
    );
    const travelAreaQuery =
      requestedTravelAreaId && !shouldIgnoreRequestedTravelAreaId
        ? hasResolvedRequestedTravelArea
          ? null
          : { query: requestedTravelAreaId, limit: 20 }
        : hasSelectedTravelAreaInRecommendations
          ? null
        : travelAreaChoiceQuery
          ? { query: travelAreaChoiceQuery, limit: 20 }
          : travelAreaChoiceSido
          ? { sido: travelAreaChoiceSido, limit: 20 }
          : null;
    if (!travelAreaQuery) {
      if (hasSelectedTravelAreaInRecommendations) {
        setTravelAreaError("");
        setIsTravelAreaLoading(false);
        return;
      }
      setTravelAreaRecommendations([]);
      setTravelAreaError("");
      setIsTravelAreaLoading(false);
      return;
    }

    let cancelled = false;
    setIsTravelAreaLoading(true);
    setTravelAreaError("");
    appDataApi
      .listTravelAreaRecommendations(travelAreaQuery)
      .then((response) => {
        if (cancelled) return;
        if (requestedTravelAreaId && ignoredRequestedTravelAreaIdRef.current === requestedTravelAreaId) return;
        setTravelAreaRecommendations(response.items);
        if (requestedTravelAreaId) {
          const matchedArea = response.items.find((area) => area.travelAreaId === requestedTravelAreaId);
          if (matchedArea) {
            applyTravelArea(matchedArea);
          } else {
            setSelectedTravelArea(null);
            setTravelAreaError("요청한 세부 지역을 찾을 수 없습니다. 다른 지역을 선택하세요.");
          }
        } else if (selectedTravelArea && !response.items.some((area) => area.travelAreaId === selectedTravelArea.travelAreaId)) {
          if (response.items.length === 1) {
            applyTravelArea(response.items[0], { syncUrl: true });
          } else {
            setSelectedTravelArea(null);
          }
        } else if ((travelAreaChoiceSido || travelAreaChoiceQuery) && !selectedTravelArea && response.items.length === 1) {
          applyTravelArea(response.items[0], { syncUrl: true });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTravelAreaRecommendations([]);
        setTravelAreaError("세부 지역을 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
      })
      .finally(() => {
        if (!cancelled) setIsTravelAreaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedTravelAreaId, selectedTravelArea, travelAreaChoiceQuery, travelAreaChoiceSido]);

  const selectRegion = (region: string) => {
    const previousAutoTitle = generatedTripTitle(selectedRegion, dayCount);
    if (requestedTravelAreaId) {
      ignoredRequestedTravelAreaIdRef.current = requestedTravelAreaId;
    }
    setSelectedRegionDraft(region);
    setSelectedTravelArea(null);
    setTravelAreaChoiceSido(isBroadTravelAreaRegion(region) ? region : null);
    setTravelAreaChoiceQuery(null);
    syncTravelAreaSearchParams({ region, travelAreaId: null });
    updateProfile("region", region);
    setTitleDraft((current) => (current.trim() === "" || current === previousAutoTitle ? generatedTripTitle(region, dayCount) : current));
  };

  const selectTravelArea = (area: TravelAreaRecommendation) => {
    applyTravelArea(area, { syncUrl: true });
  };

  const updateDates = (nextStartDate: string, nextEndDate: string) => {
    const previousAutoTitle = generatedTripTitle(selectedRegion, dayCount);
    const nextDayCount = tripDateDayCount(nextStartDate, nextEndDate);
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setTitleDraft((current) => (current.trim() === "" || current === previousAutoTitle ? generatedTripTitle(selectedRegion, nextDayCount) : current));
  };

  const goNext = () => {
    if (!canProceed) return;
    if (step < TRIP_CREATE_TOTAL_STEPS) {
      setStep((current) => Math.min(current + 1, TRIP_CREATE_TOTAL_STEPS) as TripCreateStep);
      return;
    }
    void createTrip();
  };

  const createTrip = async () => {
    const title = titleDraft.trim();
    if (!title) {
      setError("일정 제목을 입력하세요.");
      return;
    }
    if (dateRangeError) {
      setError(dateRangeError);
      setStep(3);
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const trip = await appDataApi.createTrip({
        title,
        region: selectedRegion,
        travelAreaId: selectedTravelArea?.travelAreaId ?? undefined,
        style: profile.style,
        ...(linkablePolicySlug ? { policySlug: linkablePolicySlug } : {}),
        startDate,
        endDate,
      });
      if (linkablePolicySlug) {
        await appDataApi.addPolicyToTrip(trip.id, linkablePolicySlug);
        addPolicy(linkablePolicySlug);
      }
      navigate(`/trips/${trip.id}`);
    } catch {
      setError("일정을 만들지 못했습니다. 선택한 조건을 확인하고 다시 시도하세요.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="screen prototype-trip-create-screen">
      <div className="prototype-create-top">
        <IconButton label="일정 목록" to="/trips">
          <ChevronLeft size={20} />
        </IconButton>
        <h1>새 일정</h1>
        <span>{step}/{TRIP_CREATE_TOTAL_STEPS}</span>
      </div>

      <div className="prototype-create-progress" aria-label="일정 생성 단계">
        <span style={{ width: `${(step / TRIP_CREATE_TOTAL_STEPS) * 100}%` }} />
      </div>

      <div className="prototype-create-content">
        {linkedPolicyLabel && step === 1 && (
          <div className="prototype-linked-policy-banner">
            <span aria-hidden="true">혜택</span>
            <strong>{linkedPolicyLabel}</strong>
          </div>
        )}

        {step === 1 && (
          <section className="prototype-create-step-panel">
            <h2>여행 지역 선택</h2>
            <div className="prototype-region-grid">
              {tripCreatePrimaryRegions.map((region) => (
                <button className={selectedRegionButton === region.value ? "active" : ""} key={region.value} onClick={() => selectRegion(region.value)} type="button">
                  <span aria-hidden="true">{region.emoji}</span>
                  <strong>{region.label}</strong>
                </button>
              ))}
            </div>
            {requiresTravelAreaSelection && (
              <div className="prototype-travel-area-choice">
                <div className="prototype-travel-area-heading">
                  <h3>{travelAreaChoiceSido ? `${travelAreaChoiceSido} 세부 지역 선택` : NO_TRAVEL_AREA_HEADING}</h3>
                </div>
                {isTravelAreaLoading && <p className="prototype-travel-area-status">세부 지역을 불러오는 중</p>}
                {travelAreaError && <p className="prototype-travel-area-status invalid">{travelAreaError}</p>}
                {!isTravelAreaLoading && !travelAreaError && travelAreaRecommendations.length === 0 && (
                  <p className="prototype-travel-area-status">선택 가능한 세부 지역이 없습니다. 다른 지역을 선택하세요.</p>
                )}
                    {travelAreaRecommendations.length > 0 && (
                  <div className="prototype-travel-area-grid" aria-label="세부 지역 선택">
                    {travelAreaRecommendations.map((area) => (
                      <button
                        className={selectedTravelArea?.travelAreaId === area.travelAreaId ? "prototype-travel-area-card active" : "prototype-travel-area-card"}
                        key={area.travelAreaId}
                        onClick={() => selectTravelArea(area)}
                        type="button"
                      >
                        <strong>{area.travelAreaName}</strong>
                        <small>{area.summary}</small>
                        <span className="prototype-travel-area-tags">
                          {area.tags.slice(0, 4).map((tag) => (
                            <em key={tag}>{tag}</em>
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="prototype-create-step-panel">
            <h2>코스 취향 선택</h2>
            <p>{selectedRegion} 일정에 맞는 코스 분위기</p>
            <div className="prototype-style-choice">
              <span className="meta">코스 취향</span>
              <div className="prototype-region-grid" aria-label="장소 취향 선택">
                {(profileOptions?.travelStyles ?? []).map((style) => (
                  <button
                    aria-pressed={profile.style === style}
                    className={profile.style === style ? "active" : ""}
                    key={style}
                    onClick={() => updateProfile("style", style)}
                    type="button"
                  >
                    <strong>{style}</strong>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="prototype-create-step-panel">
            <h2>여행 기간 선택</h2>
            <p>출발일과 도착일 선택</p>
            <div className="prototype-date-fields">
              <label>
                출발일
                <input type="date" value={startDate} onChange={(event) => updateDates(event.target.value, endDate)} />
              </label>
              <label>
                도착일
                <input type="date" value={endDate} onChange={(event) => updateDates(startDate, event.target.value)} />
              </label>
            </div>
            <div className={dateRangeError ? "prototype-date-summary invalid" : "prototype-date-summary"}>
              <span>기간</span>
              <strong>{dayCount && !dateRangeError ? `총 ${dayCount}일 여행` : dateRangeError}</strong>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="prototype-create-step-panel">
            <h2>일정 제목 입력</h2>
            <p>나중에 변경할 수 있습니다.</p>
            <label className="prototype-title-field">
              일정 제목
              <input
                aria-label="일정 제목"
                name="trip-title"
                onChange={(event) => setTitleDraft(event.target.value)}
                placeholder={generatedTripTitle(selectedRegion, dayCount)}
                value={titleDraft}
              />
            </label>
            <div className="prototype-create-summary">
              <span>요약</span>
              <div>지역 · {selectedRegion}</div>
              <div>
                일정 · {formatTripCreateDate(startDate)} ~ {formatTripCreateDate(endDate)} ({dayCount ?? "-"}일)
              </div>
              <div>인원 · 1명</div>
              {linkablePolicySlug && <div className="linked">연결 정책 · 선택한 정책</div>}
            </div>
          </section>
        )}

        {error && <ErrorState compact message={error} />}
      </div>

      <div className="prototype-create-sticky-actions">
        {step > 1 && (
          <Button variant="line" disabled={isCreating} onClick={() => setStep((current) => Math.max(current - 1, 1) as TripCreateStep)}>
            이전
          </Button>
        )}
        <Button full disabled={!canProceed || isCreating} onClick={goNext}>
          {isCreating ? "일정 생성 중" : step < TRIP_CREATE_TOTAL_STEPS ? "다음" : "일정 만들기"}
        </Button>
      </div>
    </section>
  );
}
