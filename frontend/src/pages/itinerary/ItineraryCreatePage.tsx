import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appDataApi } from "../../api";
import { useSession } from "../../app/session";
import { Button, ErrorState, IconButton } from "../../components/ui";
import { tripCreateRegions, tripRegionEmoji } from "../../data/displayConfig";
import { addDaysToDateInput, getDefaultTripDateRange } from "../../utils/dateDefaults";
import { clearDraft, createDraftKey, readDraft, saveDraft } from "../../utils/draftStorage";
import { DraftRestoreNotice } from "./_shared";

const durationOptions = [2, 3, 4, 5] as const;
const profileOptions = appDataApi.getProfileOptions();
const tripCreateMaxDays = 5;
const tripCreateMinDays = 2;
type DurationDays = (typeof durationOptions)[number];
type TripCreateDraft = {
  region: string;
  style: string;
  durationDays?: DurationDays;
  startDate?: string;
  endDate?: string;
  title?: string;
  step?: number;
  policySlug: string | null;
};

function isDurationOption(value: unknown): value is DurationDays {
  return durationOptions.includes(value as DurationDays);
}

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

function isValidTripCreateStep(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function tripCreateDraftKey(policySlug: string | undefined): string {
  return createDraftKey(`trip-create:${policySlug ?? "none"}`);
}

function normalizeRegionParam(value: string | null): string | null {
  if (!value) return null;
  return (tripCreateRegions as readonly string[]).includes(value) ? value : null;
}

function isCollectedExternalPolicySlug(value: string | undefined): boolean {
  return value?.startsWith("travelmonth-") ?? false;
}

export function ItineraryCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, updateProfile, addPolicy } = useSession();
  const policySlug = searchParams.get("policySlug") ?? undefined;
  const requestedRegion = normalizeRegionParam(searchParams.get("region"));
  const linkablePolicySlug = isCollectedExternalPolicySlug(policySlug) ? undefined : policySlug;
  const defaultTripDatesRef = useRef(getDefaultTripDateRange());
  const defaultTripStartDate = defaultTripDatesRef.current.startDate;
  const defaultTripEndDate = defaultTripDatesRef.current.endDate;
  const draftKey = tripCreateDraftKey(policySlug);
  const initialDraft = readDraft<TripCreateDraft>(draftKey);
  const initialProfileRef = useRef({ region: profile.region, style: profile.style });
  const skipNextTripDraftSaveRef = useRef(false);
  const initialDayCount = tripDateDayCount(initialDraft?.startDate ?? defaultTripStartDate, initialDraft?.endDate ?? defaultTripEndDate);
  const initialRegion = initialDraft?.region || requestedRegion || profile.region || "제주";
  const [selectedRegionDraft, setSelectedRegionDraft] = useState(initialRegion);
  const [step, setStep] = useState<1 | 2 | 3>(isValidTripCreateStep(initialDraft?.step) ? initialDraft.step : 1);
  const [startDate, setStartDate] = useState(initialDraft?.startDate ?? defaultTripStartDate);
  const [endDate, setEndDate] = useState(initialDraft?.endDate ?? defaultTripEndDate);
  const [titleDraft, setTitleDraft] = useState(initialDraft?.title ?? generatedTripTitle(initialRegion, initialDayCount));
  const [isCreating, setIsCreating] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isTripDraftNoticeVisible, setIsTripDraftNoticeVisible] = useState(false);
  const [error, setError] = useState("");
  const selectedRegion = selectedRegionDraft.trim() || initialRegion;
  const dayCount = tripDateDayCount(startDate, endDate);
  const dateRangeError =
    dayCount === null
      ? "출발일과 도착일을 선택해 주세요."
      : dayCount < tripCreateMinDays || dayCount > tripCreateMaxDays
        ? "일정 기간은 2일부터 5일까지 선택할 수 있어요."
        : "";
  const linkedPolicyLabel = linkablePolicySlug
    ? "선택한 정책을 새 일정에 연결할게요"
    : isCollectedExternalPolicySlug(policySlug)
      ? "공식 수집 혜택을 참고해 일정을 만들게요"
      : "";
  const canProceed =
    step === 1
      ? Boolean(selectedRegion)
      : step === 2
        ? !dateRangeError
        : Boolean(titleDraft.trim());

  useEffect(() => {
    const draft = readDraft<TripCreateDraft>(draftKey);
    if (draft && draft.policySlug === (policySlug ?? null)) {
      let appliedDraft = false;
      if (draft.region) {
        setSelectedRegionDraft(draft.region);
        updateProfile("region", draft.region);
        if (draft.region !== initialProfileRef.current.region) appliedDraft = true;
      }
      if (draft.style) {
        updateProfile("style", draft.style);
        if (draft.style !== initialProfileRef.current.style) appliedDraft = true;
      }
      if (draft.startDate) {
        setStartDate(draft.startDate);
        if (draft.startDate !== defaultTripStartDate) appliedDraft = true;
      }
      if (draft.endDate) {
        setEndDate(draft.endDate);
        if (draft.endDate !== defaultTripEndDate) appliedDraft = true;
      }
      if (draft.title) {
        setTitleDraft(draft.title);
        appliedDraft = true;
      }
      if (isValidTripCreateStep(draft.step)) setStep(draft.step);
      if (!draft.startDate && isDurationOption(draft.durationDays)) {
        const nextEndDate = addDaysToDateInput(defaultTripStartDate, draft.durationDays - 1);
        setEndDate(nextEndDate);
        if (draft.durationDays !== 3) appliedDraft = true;
      }
      setIsTripDraftNoticeVisible(appliedDraft);
    } else if (requestedRegion && requestedRegion !== initialProfileRef.current.region) {
      setSelectedRegionDraft(requestedRegion);
      updateProfile("region", requestedRegion);
    }
    setIsDraftReady(true);
  }, [draftKey, policySlug, requestedRegion]);

  useEffect(() => {
    if (!isDraftReady) return;
    if (skipNextTripDraftSaveRef.current) {
      skipNextTripDraftSaveRef.current = false;
      return;
    }
    saveDraft<TripCreateDraft>(draftKey, {
      region: selectedRegion,
      style: profile.style,
      startDate,
      endDate,
      title: titleDraft,
      step,
      policySlug: policySlug ?? null,
    });
  }, [draftKey, endDate, isDraftReady, policySlug, profile.style, selectedRegion, startDate, step, titleDraft]);

  const selectRegion = (region: string) => {
    const previousAutoTitle = generatedTripTitle(selectedRegion, dayCount);
    setSelectedRegionDraft(region);
    updateProfile("region", region);
    setTitleDraft((current) => (current.trim() === "" || current === previousAutoTitle ? generatedTripTitle(region, dayCount) : current));
  };

  const updateDates = (nextStartDate: string, nextEndDate: string) => {
    const previousAutoTitle = generatedTripTitle(selectedRegion, dayCount);
    const nextDayCount = tripDateDayCount(nextStartDate, nextEndDate);
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setTitleDraft((current) => (current.trim() === "" || current === previousAutoTitle ? generatedTripTitle(selectedRegion, nextDayCount) : current));
  };

  const discardTripCreateDraft = () => {
    skipNextTripDraftSaveRef.current = true;
    clearDraft(draftKey);
    const resetRegion = requestedRegion || initialProfileRef.current.region;
    setSelectedRegionDraft(resetRegion);
    updateProfile("region", resetRegion);
    updateProfile("style", initialProfileRef.current.style);
    setStep(1);
    setStartDate(defaultTripStartDate);
    setEndDate(defaultTripEndDate);
    setTitleDraft(generatedTripTitle(resetRegion || "제주", 3));
    setIsTripDraftNoticeVisible(false);
  };

  const goNext = () => {
    if (!canProceed) return;
    if (step < 3) {
      setStep((current) => (current + 1) as 1 | 2 | 3);
      return;
    }
    void createTrip();
  };

  const createTrip = async () => {
    const title = titleDraft.trim();
    if (!title) {
      setError("일정 제목을 입력해 주세요.");
      return;
    }
    if (dateRangeError) {
      setError(dateRangeError);
      setStep(2);
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const trip = await appDataApi.createTrip({
        title,
        region: selectedRegion,
        style: profile.style,
        ...(linkablePolicySlug ? { policySlug: linkablePolicySlug } : {}),
        startDate,
        endDate,
      });
      if (linkablePolicySlug) {
        await appDataApi.addPolicyToTrip(trip.id, linkablePolicySlug);
        addPolicy(linkablePolicySlug);
      }
      clearDraft(draftKey);
      navigate(`/trips/${trip.id}`);
    } catch {
      setError("일정을 만들지 못했어요. 선택한 조건을 확인하고 다시 시도해 주세요.");
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
        <span>{step}/3</span>
      </div>

      <div className="prototype-create-progress" aria-label="일정 생성 단계">
        <span style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      <div className="prototype-create-content">
        {linkedPolicyLabel && step === 1 && (
          <div className="prototype-linked-policy-banner">
            <span aria-hidden="true">🎁</span>
            <strong>{linkedPolicyLabel}</strong>
          </div>
        )}

        {step === 1 && (
          <section className="prototype-create-step-panel">
            <h2>어디로 떠나나요?</h2>
            <p>지역을 선택하면 맞춤 정책을 찾아드려요.</p>
            <div className="prototype-region-grid">
              {tripCreateRegions.map((region) => (
                <button className={selectedRegion === region ? "active" : ""} key={region} onClick={() => selectRegion(region)} type="button">
                  <span>{tripRegionEmoji[region]}</span>
                  <strong>{region}</strong>
                </button>
              ))}
            </div>
            <div className="prototype-style-choice">
              <span className="meta">어떤 코스를 선호하나요?</span>
              <div className="prototype-region-grid" aria-label="장소 취향 선택">
                {profileOptions.travelStyles.map((style) => (
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

        {step === 2 && (
          <section className="prototype-create-step-panel">
            <h2>언제 떠나나요?</h2>
            <p>여행 기간을 선택해 주세요.</p>
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
              <span>🧳</span>
              <strong>{dayCount && !dateRangeError ? `총 ${dayCount}일 여행` : dateRangeError}</strong>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="prototype-create-step-panel">
            <h2>일정 제목을 정해볼까요?</h2>
            <p>나중에 언제든 변경할 수 있어요.</p>
            <label className="prototype-title-field">
              일정 제목
              <input name="trip-title" onChange={(event) => setTitleDraft(event.target.value)} placeholder={generatedTripTitle(selectedRegion, dayCount)} value={titleDraft} />
            </label>
            <div className="prototype-create-summary">
              <span>요약</span>
              <div>📍 지역 · {selectedRegion}</div>
              <div>
                🗓 일정 · {formatTripCreateDate(startDate)} ~ {formatTripCreateDate(endDate)} ({dayCount ?? "-"}일)
              </div>
              <div>👥 인원 · 1명</div>
              {linkablePolicySlug && <div className="linked">🎁 연결 정책 · 선택한 정책</div>}
              {!linkablePolicySlug && isCollectedExternalPolicySlug(policySlug) && <div className="linked">🎁 참고 혜택 · 공식 수집 혜택</div>}
            </div>
          </section>
        )}

        {isTripDraftNoticeVisible && <DraftRestoreNotice message="작성 중이던 일정 조건을 불러왔어요." onDiscard={discardTripCreateDraft} />}
        {error && <ErrorState compact message={error} />}
      </div>

      <div className="prototype-create-sticky-actions">
        {step > 1 && (
          <Button variant="line" disabled={isCreating} onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3)}>
            이전
          </Button>
        )}
        <Button full disabled={!canProceed || isCreating} onClick={goNext}>
          {isCreating ? "일정을 만드는 중입니다" : step < 3 ? "다음" : "일정 만들기"}
        </Button>
      </div>
    </section>
  );
}
