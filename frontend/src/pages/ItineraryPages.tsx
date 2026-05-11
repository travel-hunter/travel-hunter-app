import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, type DragEndEvent, type DragStartEvent, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bot, ChevronLeft, GripVertical, Plus, Send, Share2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { appDataApi, type InviteRole, type InviteState, type ItineraryPlace, type Recommendation, type Trip, type TripPlaceRequest } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { ItineraryCard } from "../components/cards";
import { Button, ConfirmDialog, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, PageHead, Tag, Toast, TopBar } from "../components/ui";
import { clearDraft, createDraftKey, readDraft, saveDraft } from "../utils/draftStorage";
import { shareLinkWithFallback } from "../utils/share";

const profileOptions = appDataApi.getProfileOptions();
const durationOptions = [2, 3, 4, 5] as const;
const defaultPlaceTime = "09:00";
const placeMinuteStep = 10;
const placeMinuteOptions = [0, 10, 20, 30, 40, 50] as const;
const placeTimeErrorMessage = "방문 시간은 10분 단위로 선택해 주세요.";
type DurationDays = (typeof durationOptions)[number];
type TripCreateDraft = {
  region: string;
  style: string;
  durationDays: DurationDays;
  policySlug: string | null;
};
type TripPlaceAddDraft = TripPlaceRequest & {
  dayNumber: number;
};
type TripPlaceEditDraft = TripPlaceRequest & {
  placeId: string;
};
type DraftRestoreNoticeProps = {
  message: string;
  onDiscard: () => void;
};
const inviteRoleOptions: Array<{ role: InviteRole; label: string; body: string }> = [
  { role: "viewer", label: "보기만 가능", body: "일정과 연결된 정책을 확인할 수 있어요." },
  { role: "editor", label: "함께 편집", body: "장소 의견과 일정 편집에 참여할 수 있어요." },
];

async function resolveTripId(tripId: string | null | undefined): Promise<string | undefined> {
  if (tripId) return tripId;
  const trips = await appDataApi.listTrips();
  return trips[0]?.id;
}

function tripDayNumbers(days: Record<number, unknown[]>): number[] {
  return Object.keys(days)
    .map(Number)
    .filter((day) => Number.isFinite(day))
    .sort((a, b) => a - b);
}

function formatStayLabel(dayCount: number): string {
  return `${Math.max(dayCount - 1, 0)}박 ${dayCount}일`;
}

function formatDayDateLabel(dates: string, dayNumber: number): string {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(dates);
  if (!match) return `Day ${dayNumber}`;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayNumber - 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function recommendationDayNumber(meta: string): number {
  const englishDay = /\bDay\s+([1-9][0-9]*)\b/i.exec(meta);
  const koreanDay = /([1-9][0-9]*)\s*일차/.exec(meta);
  const rawDay = englishDay?.[1] ?? koreanDay?.[1];
  const dayNumber = rawDay ? Number(rawDay) : 1;
  return Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : 1;
}

function recommendationPlacePayload(item: Recommendation): TripPlaceRequest {
  return {
    label: item.title,
    meta: [item.meta, item.reason].filter(Boolean).join(" · "),
  };
}

function recommendationKey(item: Recommendation, index: number): string {
  return `${item.title}:${item.meta}:${index}`;
}

function isDurationOption(value: unknown): value is DurationDays {
  return durationOptions.includes(value as DurationDays);
}

function tripCreateDraftKey(policySlug: string | undefined): string {
  return createDraftKey(`trip-create:${policySlug ?? "none"}`);
}

function tripPlaceAddDraftKey(tripId: string, dayNumber: number): string {
  return createDraftKey(`trip-place:${tripId}:add:${dayNumber}`);
}

function tripPlaceEditDraftKey(tripId: string, placeId: string): string {
  return createDraftKey(`trip-place:${tripId}:edit:${placeId}`);
}

function placeDragId(placeId: string): string {
  return `place:${placeId}`;
}

function dayDropId(dayNumber: number): string {
  return `day:${dayNumber}`;
}

function draggingPlaceLabel(trip: Trip | null, placeId: string | null): string {
  if (!trip || !placeId) return "장소";
  for (const places of Object.values(trip.days)) {
    const place = places.find((item) => item.id === placeId);
    if (place) return place.label;
  }
  return "장소";
}

function parsePlaceDragId(id: unknown): string | null {
  const value = String(id);
  return value.startsWith("place:") ? value.slice("place:".length) : null;
}

function parseDayDropId(id: unknown): number | null {
  const value = String(id);
  if (!value.startsWith("day:")) return null;
  const dayNumber = Number(value.slice("day:".length));
  return Number.isFinite(dayNumber) ? dayNumber : null;
}

function parsePlaceTime(value: string | null | undefined): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((value ?? "").trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function formatPlaceTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isTenMinutePlaceTime(value: string | null | undefined): boolean {
  if (!value || value.trim() === "") return true;
  const parsed = parsePlaceTime(value);
  return Boolean(parsed && placeMinuteOptions.includes(parsed.minute as (typeof placeMinuteOptions)[number]));
}

function placeTimeBase(value: string | null | undefined): { hour: number; minute: number } {
  const parsed = parsePlaceTime(value);
  if (parsed && parsed.minute % placeMinuteStep === 0) return parsed;
  return parsePlaceTime(defaultPlaceTime) ?? { hour: 9, minute: 0 };
}

export function ItineraryListPage() {
  const { addedPolicy } = useSession();
  const { data: loadedTrips, error, isLoading } = useAsyncResource(() => appDataApi.listTrips(), []);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteCandidateTrip, setDeleteCandidateTrip] = useState<Trip | null>(null);
  const [confirmingStatusTripId, setConfirmingStatusTripId] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loadedTrips) setTrips(loadedTrips);
  }, [loadedTrips]);

  const requestDeleteTrip = (trip: Trip) => {
    if (deletingTripId || confirmingStatusTripId) return;
    setDeleteCandidateTrip(trip);
    setDeleteError("");
  };

  const cancelDeleteTrip = () => {
    if (deletingTripId) return;
    setDeleteCandidateTrip(null);
    setDeleteError("");
  };

  const confirmDeleteTrip = async () => {
    const trip = deleteCandidateTrip;
    if (!trip || deletingTripId) return;
    setDeletingTripId(trip.id);
    setDeleteError("");
    try {
      await appDataApi.deleteTrip(trip.id);
      setTrips((current) => current.filter((item) => item.id !== trip.id));
      setDeleteCandidateTrip(null);
    } catch {
      setDeleteError("일정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingTripId(null);
    }
  };

  const confirmTripStatus = async (trip: Trip) => {
    if (deletingTripId || confirmingStatusTripId) return;
    setConfirmingStatusTripId(trip.id);
    setStatusErrors((current) => ({ ...current, [trip.id]: "" }));
    try {
      const nextTrip = await appDataApi.updateTripStatus(trip.id, { status: "confirmed" });
      setTrips((current) => current.map((item) => (item.id === trip.id ? nextTrip : item)));
    } catch {
      setStatusErrors((current) => ({
        ...current,
        [trip.id]: "일정 확정 상태를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      }));
    } finally {
      setConfirmingStatusTripId(null);
    }
  };

  return (
    <section className="screen with-tabs">
      <TopBar
        title="일정 목록"
        right={
          <IconButton label="일정 생성" to="/trips/new">
            <Plus size={18} />
          </IconButton>
        }
      />
      <div className="content stack padded">
        {isLoading && <LoadingState label="일정을 불러오는 중입니다" />}
        {error && <ErrorState message={error} action={<LinkButton to="/trips/new" variant="line">새 일정 만들기</LinkButton>} />}
        {!isLoading && !error && trips.length === 0 && (
          <EmptyState eyebrow="내 일정" title="아직 등록된 일정이 없어요" body="첫 여행을 만들고 받을 수 있는 혜택을 함께 확인해보세요." action={<LinkButton to="/trips/new">일정 만들기</LinkButton>} />
        )}
        {trips.map((trip) => (
          <ItineraryCard
            key={trip.id}
            trip={trip}
            addedPolicy={addedPolicy}
            confirmStatusError={statusErrors[trip.id]}
            isConfirmingStatus={confirmingStatusTripId === trip.id}
            isDeleting={deletingTripId === trip.id}
            onConfirmStatus={confirmTripStatus}
            onDelete={requestDeleteTrip}
          />
        ))}
        <Link className="list-card card" to="/trips/new">
          <div className="between">
            <div>
              <Tag tone="primary">새 일정</Tag>
              <h3>정책 조건에 맞는 여행 만들기</h3>
            </div>
            <span className="btn sm primary">만들기</span>
          </div>
          <p className="meta">지역, 날짜, 테마를 선택하면 받을 수 있는 정책과 이동 동선을 함께 맞춰드려요.</p>
        </Link>
      </div>
      <ConfirmDialog
        open={Boolean(deleteCandidateTrip)}
        title="일정을 삭제할까요?"
        body={`${deleteCandidateTrip?.title ?? "선택한 일정"} 일정과 연결된 장소, 초대, 정책 연결이 함께 삭제됩니다.`}
        error={deleteError}
        confirmLabel="삭제"
        isSubmitting={Boolean(deletingTripId)}
        onCancel={cancelDeleteTrip}
        onConfirm={confirmDeleteTrip}
      />
    </section>
  );
}

export function ItineraryCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, updateProfile, addPolicy } = useSession();
  const policySlug = searchParams.get("policySlug") ?? undefined;
  const draftKey = tripCreateDraftKey(policySlug);
  const initialDraft = readDraft<TripCreateDraft>(draftKey);
  const initialProfileRef = useRef({ region: profile.region, style: profile.style });
  const skipNextTripDraftSaveRef = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [durationDays, setDurationDays] = useState<DurationDays>(isDurationOption(initialDraft?.durationDays) ? initialDraft.durationDays : 3);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isTripDraftNoticeVisible, setIsTripDraftNoticeVisible] = useState(false);
  const [isTripNameDialogOpen, setIsTripNameDialogOpen] = useState(false);
  const [tripNameDraft, setTripNameDraft] = useState("");
  const [tripNameError, setTripNameError] = useState("");
  const selectedRegion = profile.region.trim() || "선택한 지역";
  const tripTitle = `${selectedRegion} ${durationDays}일 여행`;

  useEffect(() => {
    const draft = readDraft<TripCreateDraft>(draftKey);
    if (draft && draft.policySlug === (policySlug ?? null)) {
      let appliedDraft = false;
      if (draft.region) updateProfile("region", draft.region);
      if (draft.style) updateProfile("style", draft.style);
      if (draft.region && draft.region !== initialProfileRef.current.region) appliedDraft = true;
      if (draft.style && draft.style !== initialProfileRef.current.style) appliedDraft = true;
      if (isDurationOption(draft.durationDays)) {
        setDurationDays(draft.durationDays);
        if (draft.durationDays !== 3) appliedDraft = true;
      }
      setIsTripDraftNoticeVisible(appliedDraft);
    }
    setIsDraftReady(true);
  }, [draftKey, policySlug]);

  useEffect(() => {
    if (!isDraftReady) return;
    if (skipNextTripDraftSaveRef.current) {
      skipNextTripDraftSaveRef.current = false;
      return;
    }
    saveDraft<TripCreateDraft>(draftKey, {
      region: profile.region,
      style: profile.style,
      durationDays,
      policySlug: policySlug ?? null,
    });
  }, [draftKey, durationDays, isDraftReady, policySlug, profile.region, profile.style]);

  const discardTripCreateDraft = () => {
    skipNextTripDraftSaveRef.current = true;
    clearDraft(draftKey);
    updateProfile("region", initialProfileRef.current.region);
    updateProfile("style", initialProfileRef.current.style);
    setDurationDays(3);
    setIsTripDraftNoticeVisible(false);
  };

  const openTripNameDialog = () => {
    setTripNameDraft(tripTitle);
    setTripNameError("");
    setIsTripNameDialogOpen(true);
  };

  const closeTripNameDialog = () => {
    if (isCreating) return;
    setIsTripNameDialogOpen(false);
    setTripNameError("");
  };

  const submitTripNameDialog = () => {
    const customTitle = tripNameDraft.trim();
    if (!customTitle) {
      setTripNameError("일정 이름을 입력해 주세요.");
      return;
    }
    void createTrip(customTitle);
  };

  const createTrip = async (customTitle: string) => {
    setIsCreating(true);
    setError("");
    try {
      const trip = await appDataApi.createTrip({
        title: customTitle,
        region: profile.region,
        style: profile.style,
        policySlug,
        durationDays,
      });
      if (policySlug) {
        await appDataApi.addPolicyToTrip(trip.id, policySlug);
        addPolicy();
      }
      clearDraft(draftKey);
      navigate(`/trips/${trip.id}`);
    } catch {
      setIsTripNameDialogOpen(false);
      setError("일정을 만들지 못했어요. 선택한 조건을 확인하고 다시 시도해 주세요.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="screen">
      <TopBar
        title="일정 생성"
        left={
          <IconButton label="일정 목록" to="/trips">
            <ChevronLeft size={20} />
          </IconButton>
        }
      />
      <div className="content stack padded">
        <div className="card">
          <div className="card-body stack">
            {policySlug && <Tag tone="warning">선택한 혜택도 함께 담을게요</Tag>}
            <PageHead eyebrow="AI 일정 빌더" title="지역과 여행 스타일에 맞춘 일정을 만듭니다" body="선택한 조건을 바탕으로 여행 일정을 만들어드려요." />
            <ChoiceGroup label="지역" values={profileOptions.regions} selected={profile.region} onSelect={(value) => updateProfile("region", value)} />
            <ChoiceGroup label="여행 테마" values={profileOptions.travelStyles} selected={profile.style} onSelect={(value) => updateProfile("style", value)} />
            <DurationChoiceGroup selected={durationDays} onSelect={setDurationDays} />
          </div>
        </div>
        {isTripDraftNoticeVisible && <DraftRestoreNotice message="작성 중이던 일정 조건을 불러왔어요." onDiscard={discardTripCreateDraft} />}
        {error && <ErrorState message={error} />}
        <Button full disabled={isCreating} onClick={openTripNameDialog}>
          {isCreating ? "일정을 만드는 중입니다" : `${selectedRegion} ${durationDays}일 일정 만들기`}
        </Button>
      </div>
      <TripNameDialog
        error={tripNameError}
        isSubmitting={isCreating}
        onCancel={closeTripNameDialog}
        onChange={setTripNameDraft}
        onSubmit={submitTripNameDialog}
        open={isTripNameDialogOpen}
        value={tripNameDraft}
      />
    </section>
  );
}

function ChoiceGroup({ label, values, selected, onSelect }: { label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div>
      <div className="choice-label">{label}</div>
      <div className="choice-grid">
        {values.map((value) => (
          <button className={selected === value ? "choice active" : "choice"} key={value} onClick={() => onSelect(value)} type="button">
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function DurationChoiceGroup({ selected, onSelect }: { selected: DurationDays; onSelect: (value: DurationDays) => void }) {
  return (
    <div>
      <div className="choice-label">기간</div>
      <div className="choice-grid">
        {durationOptions.map((value) => (
          <button className={selected === value ? "choice active" : "choice"} key={value} onClick={() => onSelect(value)} type="button">
            {value}일
          </button>
        ))}
      </div>
    </div>
  );
}

function TripNameDialog({
  error,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
  open,
  value,
}: {
  error: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  open: boolean;
  value: string;
}) {
  if (!open) return null;

  const cancel = () => {
    if (!isSubmitting) onCancel();
  };

  return (
    <div className="sheet-backdrop confirm-backdrop" role="presentation" onMouseDown={cancel}>
      <section className="confirm-dialog trip-name-dialog" role="dialog" aria-modal="true" aria-labelledby="trip-name-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div>
          <h2 id="trip-name-dialog-title">일정 이름을 정해주세요</h2>
          <p>일정 목록과 마이페이지에 표시될 이름입니다.</p>
        </div>
        <label className="field">
          일정 이름
          <input autoFocus disabled={isSubmitting} name="trip-title" onChange={(event) => onChange(event.target.value)} value={value} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="confirm-actions">
          <Button variant="line" disabled={isSubmitting} onClick={cancel}>
            취소
          </Button>
          <Button disabled={isSubmitting} onClick={onSubmit}>
            {isSubmitting ? "생성 중" : "확인"}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function ItineraryDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { addedPolicy } = useSession();
  const [activeDay, setActiveDay] = useState(1);
  const { data: loadedTrip, error, isLoading } = useAsyncResource(() => appDataApi.getTrip(tripId), [tripId]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [placeEditor, setPlaceEditor] = useState<{ mode: "add"; dayNumber: number } | { mode: "edit"; dayNumber: number; place: ItineraryPlace } | null>(null);
  const [placeForm, setPlaceForm] = useState<TripPlaceRequest>({ time: "", label: "", meta: "" });
  const [placeError, setPlaceError] = useState("");
  const [placeDeleteError, setPlaceDeleteError] = useState("");
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [movingPlaceId, setMovingPlaceId] = useState<string | null>(null);
  const [draggingPlaceId, setDraggingPlaceId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteCandidatePlace, setDeleteCandidatePlace] = useState<ItineraryPlace | null>(null);
  const [placeDraftNotice, setPlaceDraftNotice] = useState("");
  const dayNumbers = trip ? tripDayNumbers(trip.days) : [];
  const visibleDay = dayNumbers.includes(activeDay) ? activeDay : (dayNumbers[0] ?? 1);
  const dayPlaces = trip?.days[visibleDay] ?? [];
  const sortablePlaceIds = dayPlaces.flatMap((place) => (place.id ? [placeDragId(place.id)] : []));
  const stayLabel = formatStayLabel(dayNumbers.length || 3);
  const canEditTrip = trip?.currentUserRole === "owner" || trip?.currentUserRole === "editor";
  const activeDraggingPlaceLabel = draggingPlaceLabel(trip, draggingPlaceId);
  const dragSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (loadedTrip) setTrip(loadedTrip);
  }, [loadedTrip]);

  useEffect(() => {
    if (dayNumbers.length > 0) setActiveDay(dayNumbers[0]);
  }, [trip?.id]);

  useEffect(() => {
    if (trip && tripId && trip.id !== tripId) {
      navigate(`/trips/${trip.id}`, { replace: true });
    }
  }, [navigate, trip, tripId]);

  const openAddPlace = () => {
    if (!canEditTrip) {
      setPlaceError("이 일정은 보기 권한으로 참여 중이라 편집할 수 없어요.");
      return;
    }
    const draft = trip ? readDraft<TripPlaceAddDraft>(tripPlaceAddDraftKey(trip.id, visibleDay)) : null;
    setPlaceEditor({ mode: "add", dayNumber: visibleDay });
    setPlaceForm(draft ? { time: draft.time ?? "", label: draft.label, meta: draft.meta ?? "" } : { time: "", label: "", meta: "" });
    setPlaceDraftNotice(draft ? "작성 중이던 장소 내용을 불러왔어요." : "");
    setPlaceError("");
  };

  const openEditPlace = (place: ItineraryPlace) => {
    if (!canEditTrip) {
      setPlaceError("이 일정은 보기 권한으로 참여 중이라 편집할 수 없어요.");
      return;
    }
    const draft = trip && place.id ? readDraft<TripPlaceEditDraft>(tripPlaceEditDraftKey(trip.id, place.id)) : null;
    setPlaceEditor({ mode: "edit", dayNumber: visibleDay, place });
    setPlaceForm(draft ? { time: draft.time ?? "", label: draft.label, meta: draft.meta ?? "" } : { time: place.time, label: place.label, meta: place.meta });
    setPlaceDraftNotice(draft ? "수정 중이던 장소 내용을 불러왔어요." : "");
    setPlaceError("");
  };

  const submitPlaceEditor = async () => {
    if (!trip || !placeEditor) return;
    if (!canEditTrip) {
      setPlaceError("이 일정은 보기 권한으로 참여 중이라 편집할 수 없어요.");
      return;
    }
    const label = placeForm.label.trim();
    if (!label) {
      setPlaceError("장소명을 입력해 주세요.");
      return;
    }
    const time = placeForm.time?.trim() ?? "";
    if (!isTenMinutePlaceTime(time)) {
      setPlaceError(placeTimeErrorMessage);
      return;
    }
    setIsSavingPlace(true);
    setPlaceError("");
    try {
      const payload = {
        time,
        label,
        meta: placeForm.meta?.trim() || undefined,
      };
      const nextTrip =
        placeEditor.mode === "add"
          ? await appDataApi.addTripPlace(trip.id, placeEditor.dayNumber, payload)
          : await appDataApi.updateTripPlace(trip.id, placeEditor.place.id ?? "", payload);
      if (placeEditor.mode === "add") clearDraft(tripPlaceAddDraftKey(trip.id, placeEditor.dayNumber));
      if (placeEditor.mode === "edit" && placeEditor.place.id) clearDraft(tripPlaceEditDraftKey(trip.id, placeEditor.place.id));
      setTrip(nextTrip);
      setPlaceEditor(null);
      setPlaceDraftNotice("");
      setNotice(placeEditor.mode === "add" ? "장소를 일정에 추가했어요." : "장소 정보를 수정했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setPlaceError("장소 정보를 저장하지 못했어요. 입력값을 확인하고 다시 시도해 주세요.");
    } finally {
      setIsSavingPlace(false);
    }
  };

  const requestDeletePlace = (place: ItineraryPlace) => {
    if (!trip || !place.id || isSavingPlace) return;
    if (!canEditTrip) {
      setPlaceError("이 일정은 보기 권한으로 참여 중이라 편집할 수 없어요.");
      return;
    }
    setDeleteCandidatePlace(place);
    setPlaceDeleteError("");
  };

  const movePlaceTo = async (place: ItineraryPlace, dayNumber: number, position: number) => {
    if (!trip || !place.id || movingPlaceId) return;
    if (!canEditTrip) {
      setPlaceError("이 일정은 보기 권한으로 참여 중이라 편집할 수 없어요.");
      return;
    }
    setMovingPlaceId(place.id);
    setMoveError("");
    try {
      const nextTrip = await appDataApi.moveTripPlace(trip.id, place.id, { dayNumber, position });
      setTrip(nextTrip);
      setActiveDay(dayNumber);
      setNotice("장소 순서를 변경했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setMoveError("장소 순서를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setMovingPlaceId(null);
    }
  };

  const handlePlaceDragStart = (event: DragStartEvent) => {
    const placeId = parsePlaceDragId(event.active.id);
    if (placeId) setDraggingPlaceId(placeId);
  };

  const handlePlaceDragEnd = (event: DragEndEvent) => {
    setDraggingPlaceId(null);
    if (!trip || !canEditTrip || movingPlaceId || !event.over) return;
    const placeId = parsePlaceDragId(event.active.id);
    if (!placeId) return;
    const place = dayPlaces.find((item) => item.id === placeId);
    if (!place) return;

    const overPlaceId = parsePlaceDragId(event.over.id);
    if (overPlaceId) {
      const targetIndex = dayPlaces.findIndex((item) => item.id === overPlaceId);
      if (targetIndex < 0 || overPlaceId === placeId) return;
      void movePlaceTo(place, visibleDay, targetIndex + 1);
      return;
    }

    const targetDay = parseDayDropId(event.over.id);
    if (!targetDay || targetDay === visibleDay || !dayNumbers.includes(targetDay)) return;
    const targetCount = trip.days[targetDay]?.length ?? 0;
    void movePlaceTo(place, targetDay, targetCount + 1);
  };

  const cancelDeletePlace = () => {
    if (isSavingPlace) return;
    setDeleteCandidatePlace(null);
    setPlaceDeleteError("");
  };

  const confirmDeletePlace = async () => {
    const place = deleteCandidatePlace;
    if (!trip || !place?.id || isSavingPlace) return;
    setIsSavingPlace(true);
    setPlaceDeleteError("");
    try {
      const nextTrip = await appDataApi.deleteTripPlace(trip.id, place.id);
      clearDraft(tripPlaceEditDraftKey(trip.id, place.id));
      setTrip(nextTrip);
      setDeleteCandidatePlace(null);
      setPlaceDraftNotice("");
      setNotice("장소를 일정에서 삭제했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setPlaceDeleteError("장소를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingPlace(false);
    }
  };

  const updatePlaceForm = (nextForm: TripPlaceRequest) => {
    setPlaceForm(nextForm);
    if (!trip || !placeEditor) return;
    if (placeEditor.mode === "add") {
      saveDraft<TripPlaceAddDraft>(tripPlaceAddDraftKey(trip.id, placeEditor.dayNumber), {
        dayNumber: placeEditor.dayNumber,
        time: nextForm.time ?? "",
        label: nextForm.label,
        meta: nextForm.meta ?? "",
      });
    }
    if (placeEditor.mode === "edit" && placeEditor.place.id) {
      saveDraft<TripPlaceEditDraft>(tripPlaceEditDraftKey(trip.id, placeEditor.place.id), {
        placeId: placeEditor.place.id,
        time: nextForm.time ?? "",
        label: nextForm.label,
        meta: nextForm.meta ?? "",
      });
    }
  };

  const closePlaceEditor = () => {
    if (isSavingPlace) return;
    if (trip && placeEditor?.mode === "add") clearDraft(tripPlaceAddDraftKey(trip.id, placeEditor.dayNumber));
    if (trip && placeEditor?.mode === "edit" && placeEditor.place.id) clearDraft(tripPlaceEditDraftKey(trip.id, placeEditor.place.id));
    setPlaceDraftNotice("");
    setPlaceEditor(null);
  };

  const discardPlaceDraft = () => {
    if (!trip || !placeEditor) return;
    if (placeEditor.mode === "add") {
      clearDraft(tripPlaceAddDraftKey(trip.id, placeEditor.dayNumber));
      setPlaceForm({ time: "", label: "", meta: "" });
    }
    if (placeEditor.mode === "edit" && placeEditor.place.id) {
      clearDraft(tripPlaceEditDraftKey(trip.id, placeEditor.place.id));
      setPlaceForm({ time: placeEditor.place.time, label: placeEditor.place.label, meta: placeEditor.place.meta });
    }
    setPlaceDraftNotice("");
  };

  if (isLoading) {
    return (
      <section className="screen with-tabs">
        <LoadingState label="일정 상세를 불러오는 중입니다" />
      </section>
    );
  }

  if (error || !trip) {
    return (
      <section className="screen with-tabs">
        <ErrorState message={error ?? "일정 정보를 찾지 못했어요."} action={<LinkButton to="/trips" variant="line">일정 목록으로</LinkButton>} />
      </section>
    );
  }

  return (
    <section className={canEditTrip ? "screen with-tabs" : "screen with-tabs readonly-trip"}>
      <TopBar
        title={trip.title}
        left={
          <IconButton label="홈으로" to="/home">
            <ChevronLeft size={20} />
          </IconButton>
        }
        right={
          <IconButton label="친구 초대" to={`/friend-invite?tripId=${encodeURIComponent(trip.id)}`}>
            <Share2 size={18} />
          </IconButton>
        }
      />
      <div className="trip-summary">
        <div className="row meta">{trip.dates} · {stayLabel}</div>
        <div className="between">
          <div className="row">
            <div className="avatar-stack">
              {trip.people.map((name) => (
                <span className="avatar-mini" key={name}>
                  {name[0]}
                </span>
              ))}
            </div>
            <span className="meta">{trip.people.length}명 참여 중</span>
          </div>
          <Link className="btn sm secondary" to={`/friend-invite?tripId=${encodeURIComponent(trip.id)}`}>
            초대
          </Link>
        </div>
      </div>
      <Link className="benefit-banner" to="/policies/local-vacation">
        <Tag tone="warning">정책 매칭</Tag>
        <strong>{addedPolicy ? "지역사랑 휴가지원이 연결되었어요" : "받을 수 있는 혜택 2건"}</strong>
        <div className="meta">최대 30만원 절감 가능 · 정책 상세 보기</div>
      </Link>
      <div className="map-large" aria-label="제주 일정 지도">
        <div className="marker one" />
        <div className="marker two" />
        <div className="marker three" />
      </div>
      <DndContext
        sensors={dragSensors}
        collisionDetection={closestCenter}
        onDragStart={handlePlaceDragStart}
        onDragCancel={() => setDraggingPlaceId(null)}
        onDragEnd={handlePlaceDragEnd}
      >
        <div className="day-tabs">
          {dayNumbers.map((day) => (
            <DroppableDayTab
              canDrop={canEditTrip && Boolean(draggingPlaceId)}
              dateLabel={formatDayDateLabel(trip.dates, day)}
              day={day}
              isActive={visibleDay === day}
              key={day}
              onSelect={setActiveDay}
              placeLabel={activeDraggingPlaceLabel}
            />
          ))}
        </div>
      {!canEditTrip && (
        <div className="card">
          <div className="card-body stack tight">
            <strong>보기 권한으로 참여 중입니다</strong>
            <p className="meta">일정과 정책은 확인할 수 있지만 장소 편집은 할 수 없어요.</p>
          </div>
        </div>
      )}
        {canEditTrip && dayPlaces.length > 0 && (
          <div className={draggingPlaceId ? "dnd-affordance active" : "dnd-affordance"} role="status">
            <GripVertical size={16} />
            <span>{draggingPlaceId ? `${activeDraggingPlaceLabel} 이동 중` : "장소 카드의 이동 핸들로 순서를 조정할 수 있어요"}</span>
          </div>
        )}
        <div className={draggingPlaceId ? "timeline dnd-active" : "timeline"}>
          {dayPlaces.length === 0 && (
            <EmptyState
              compact
              eyebrow={`Day ${visibleDay}`}
              title="아직 추가된 장소가 없어요"
              body={canEditTrip ? "장소 추가 버튼으로 방문지를 일정에 저장해 보세요." : "아직 이 날짜에 등록된 장소가 없어요."}
            />
          )}
          <SortableContext items={sortablePlaceIds} strategy={verticalListSortingStrategy}>
            {dayPlaces.map((place) => (
              <SortablePlaceItem
                canEditTrip={canEditTrip}
                currentDay={visibleDay}
                dayNumbers={dayNumbers}
                disabled={Boolean(movingPlaceId) || isSavingPlace}
                isMoving={movingPlaceId === place.id}
                key={place.id ?? `${place.time}-${place.label}`}
                onDelete={requestDeletePlace}
                onEdit={openEditPlace}
                onMove={movePlaceTo}
                place={place}
                places={dayPlaces}
                trip={trip}
              />
            ))}
          </SortableContext>
          <button className="dashed" type="button" onClick={openAddPlace} hidden={!canEditTrip}>
            + 장소 추가
          </button>
          <Link className="btn secondary full" to={`/ai-results?tripId=${encodeURIComponent(trip.id)}`}>
            AI 추천 일정 보기
          </Link>
        </div>
      </DndContext>
      {placeError && !placeEditor && <Toast>{placeError}</Toast>}
      {moveError && <Toast>{moveError}</Toast>}
      {notice && <Toast>{notice}</Toast>}
      {placeEditor && (
        <PlaceEditorSheet
          error={placeError}
          form={placeForm}
          isSaving={isSavingPlace}
          mode={placeEditor.mode}
          onChange={updatePlaceForm}
          onClose={closePlaceEditor}
          onDiscardDraft={discardPlaceDraft}
          onSubmit={submitPlaceEditor}
          restoredDraftMessage={placeDraftNotice}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteCandidatePlace)}
        title="장소를 삭제할까요?"
        body={`${deleteCandidatePlace?.label ?? "선택한 장소"} 장소가 이 일정에서 삭제됩니다.`}
        error={placeDeleteError}
        confirmLabel="삭제"
        isSubmitting={isSavingPlace}
        onCancel={cancelDeletePlace}
        onConfirm={confirmDeletePlace}
      />
    </section>
  );
}

function DraftRestoreNotice({ message, onDiscard }: DraftRestoreNoticeProps) {
  return (
    <div className="draft-restore-notice" role="status">
      <div>
        <strong>{message}</strong>
        <p>원하지 않으면 임시 저장 내용을 버릴 수 있어요.</p>
      </div>
      <button className="btn sm line" type="button" onClick={onDiscard}>
        버리기
      </button>
    </div>
  );
}

function DroppableDayTab({
  canDrop,
  dateLabel,
  day,
  isActive,
  onSelect,
  placeLabel,
}: {
  canDrop: boolean;
  dateLabel: string;
  day: number;
  isActive: boolean;
  onSelect: (day: number) => void;
  placeLabel: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dayDropId(day), disabled: !canDrop });
  const className = ["day-tab", isActive ? "active" : "", canDrop ? "drop-target" : "", isOver ? "over" : ""].filter(Boolean).join(" ");

  return (
    <button
      aria-label={canDrop ? `Day ${day} ${dateLabel}에 ${placeLabel} 놓기` : `Day ${day} ${dateLabel}`}
      className={className}
      key={day}
      onClick={() => onSelect(day)}
      ref={setNodeRef}
      type="button"
    >
      <strong>Day {day}</strong>
      <span>{dateLabel}</span>
      {canDrop && <em>{isOver ? "놓기" : "이동 가능"}</em>}
    </button>
  );
}

function SortablePlaceItem({
  canEditTrip,
  currentDay,
  dayNumbers,
  disabled,
  isMoving,
  onDelete,
  onEdit,
  onMove,
  place,
  places,
  trip,
}: {
  canEditTrip: boolean;
  currentDay: number;
  dayNumbers: number[];
  disabled: boolean;
  isMoving: boolean;
  onDelete: (place: ItineraryPlace) => void;
  onEdit: (place: ItineraryPlace) => void;
  onMove: (place: ItineraryPlace, dayNumber: number, position: number) => Promise<void>;
  place: ItineraryPlace;
  places: ItineraryPlace[];
  trip: Trip;
}) {
  const sortableId = place.id ? placeDragId(place.id) : `missing:${place.time}-${place.label}`;
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: sortableId,
    disabled: !canEditTrip || !place.id || disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const className = ["timeline-item", isDragging ? "dragging" : "", isMoving ? "moving" : ""].filter(Boolean).join(" ");
  const sortableListeners = listeners ?? {};
  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>): boolean => {
    if (!place.id || disabled) return false;
    const currentIndex = places.findIndex((item) => item.id === place.id);
    if (currentIndex < 0) return false;
    if (event.key === "ArrowUp" && currentIndex > 0) {
      event.preventDefault();
      void onMove(place, currentDay, currentIndex);
      return true;
    }
    if (event.key === "ArrowDown" && currentIndex < places.length - 1) {
      event.preventDefault();
      void onMove(place, currentDay, currentIndex + 2);
      return true;
    }
    if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const currentDayIndex = dayNumbers.indexOf(currentDay);
      const nextDayIndex = event.key === "ArrowRight" ? currentDayIndex + 1 : currentDayIndex - 1;
      const targetDay = dayNumbers[nextDayIndex];
      if (!targetDay) return false;
      event.preventDefault();
      const targetCount = trip.days[targetDay]?.length ?? 0;
      void onMove(place, targetDay, targetCount + 1);
      return true;
    }
    return false;
  };

  return (
    <div className={className} data-place-id={place.id} ref={setNodeRef} style={style}>
      <div className="time">{place.time}</div>
      <article className="place-detail">
        {canEditTrip && place.id && (
          <button
            className="drag-handle"
            type="button"
            aria-label={`${place.label} 순서 이동`}
            disabled={disabled}
            {...attributes}
            {...sortableListeners}
            onKeyDown={(event) => {
              if (!moveWithKeyboard(event)) sortableListeners.onKeyDown?.(event);
            }}
          >
            <GripVertical size={16} />
            <span>이동</span>
          </button>
        )}
        <div className="place-copy">
          <h4>{place.label}</h4>
          <div className="meta">{place.meta}</div>
        </div>
        {isMoving && <span className="place-moving-badge">이동 중</span>}
        <div className="place-actions" hidden={!canEditTrip}>
          <button className="btn sm ghost" type="button" onClick={() => onEdit(place)} disabled={!place.id || disabled}>
            수정
          </button>
          <button className="btn sm line" type="button" onClick={() => onDelete(place)} disabled={!place.id || disabled || isMoving}>
            삭제
          </button>
        </div>
      </article>
    </div>
  );
}

function PlaceTimePicker({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (time: string) => void;
  value: string;
}) {
  const parsed = parsePlaceTime(value);
  const isTimeSet = Boolean(value && parsed);
  const base = placeTimeBase(value);
  const displayValue = isTimeSet && parsed ? formatPlaceTime(parsed.hour, parsed.minute) : "시간 없음";

  const setTime = (hour: number, minute: number) => {
    onChange(formatPlaceTime((hour + 24) % 24, minute));
  };
  const shiftHour = (amount: number) => {
    setTime(base.hour + amount, base.minute);
  };
  const shiftMinute = (amount: number) => {
    const totalMinutes = base.hour * 60 + base.minute + amount;
    const normalized = (totalMinutes + 24 * 60) % (24 * 60);
    setTime(Math.floor(normalized / 60), normalized % 60);
  };

  return (
    <div className="field place-time-picker">
      <span>방문 시간</span>
      <div className="time-picker-control" role="group" aria-label="방문 시간 선택">
        <div className="time-picker-display" aria-live="polite">
          <strong>{displayValue}</strong>
        </div>
        <div className="time-picker-spinners">
          <div className="time-stepper" aria-label="방문 시 조절">
            <span>시</span>
            <button type="button" className="time-stepper-button" onClick={() => shiftHour(-1)} disabled={disabled} aria-label="방문 시간 1시간 감소">
              -
            </button>
            <strong>{String(base.hour).padStart(2, "0")}</strong>
            <button type="button" className="time-stepper-button" onClick={() => shiftHour(1)} disabled={disabled} aria-label="방문 시간 1시간 증가">
              +
            </button>
          </div>
          <div className="time-stepper" aria-label="방문 분 조절">
            <span>분</span>
            <button type="button" className="time-stepper-button" onClick={() => shiftMinute(-placeMinuteStep)} disabled={disabled} aria-label="방문 시간 10분 감소">
              -10
            </button>
            <strong>{String(base.minute).padStart(2, "0")}</strong>
            <button type="button" className="time-stepper-button" onClick={() => shiftMinute(placeMinuteStep)} disabled={disabled} aria-label="방문 시간 10분 증가">
              +10
            </button>
          </div>
        </div>
        <div className="time-picker-actions">
          {!isTimeSet && (
            <button type="button" className="btn sm ghost" onClick={() => onChange(defaultPlaceTime)} disabled={disabled}>
              {defaultPlaceTime} 설정
            </button>
          )}
          <button type="button" className="btn sm line" onClick={() => onChange("")} disabled={disabled || !isTimeSet}>
            시간 비우기
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceEditorSheet({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onDiscardDraft,
  onSubmit,
  restoredDraftMessage,
}: {
  error: string;
  form: TripPlaceRequest;
  isSaving: boolean;
  mode: "add" | "edit";
  onChange: (form: TripPlaceRequest) => void;
  onClose: () => void;
  onDiscardDraft: () => void;
  onSubmit: () => void;
  restoredDraftMessage: string;
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="trip-select-sheet" role="dialog" aria-modal="true" aria-labelledby="place-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2 id="place-editor-title">{mode === "add" ? "장소 추가" : "장소 수정"}</h2>
            <p className="meta">장소명, 방문 시간, 메모를 입력해 일정에 저장하세요.</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose} disabled={isSaving}>
            닫기
          </button>
        </div>
        <div className="form place-editor-form">
          {restoredDraftMessage && <DraftRestoreNotice message={restoredDraftMessage} onDiscard={onDiscardDraft} />}
          <PlaceTimePicker disabled={isSaving} value={form.time ?? ""} onChange={(time) => onChange({ ...form, time })} />
          <input type="hidden" name="place-time" value={form.time ?? ""} readOnly />
          <label className="field">
            장소명
            <input
              name="place-label"
              placeholder="성산일출봉"
              value={form.label}
              onChange={(event) => onChange({ ...form, label: event.target.value })}
            />
          </label>
          <label className="field">
            메모
            <textarea
              name="place-meta"
              placeholder="이동 메모나 예약 정보를 적어주세요"
              value={form.meta ?? ""}
              onChange={(event) => onChange({ ...form, meta: event.target.value })}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="sheet-actions">
          <Button full disabled={isSaving} onClick={onSubmit}>
            {isSaving ? "저장 중입니다" : "저장하기"}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function AiResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get("tripId");
  const [activeTripId, setActiveTripId] = useState(requestedTripId ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [addingRecommendationKey, setAddingRecommendationKey] = useState<string | null>(null);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const detailPath = activeTripId ? `/trips/${activeTripId}` : "/trips";
  const { data: recommendations, error, isLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    setActiveTripId(resolvedTripId ?? "");
    if (!resolvedTripId) return [];
    return appDataApi.listRecommendations(resolvedTripId);
  }, [requestedTripId]);

  const addRecommendationToTrip = async (item: Recommendation, itemKey: string) => {
    if (!activeTripId || addingRecommendationKey) return;
    setAddError("");
    setNotice(null);
    setAddingRecommendationKey(itemKey);
    try {
      await appDataApi.addTripPlace(activeTripId, recommendationDayNumber(item.meta), recommendationPlacePayload(item));
      setNotice(`${item.title}을 일정에 추가했어요.`);
      navigate(`/trips/${activeTripId}`);
    } catch {
      setAddError("추천 장소를 일정에 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
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
            <Tag tone="primary">휴식 여행</Tag>
            <h3>제주 3일 일정에 추가할 후보</h3>
            <p className="meta">정책 조건, 이동 거리, 예산을 함께 고려한 추천이에요.</p>
          </div>
        </div>
        {isLoading && <LoadingState label="AI 추천 후보를 불러오는 중입니다" />}
        {error && <ErrorState message={error} />}
        {addError && <p className="form-error">{addError}</p>}
        {!isLoading && !error && (recommendations?.length ?? 0) === 0 && (
          <EmptyState title="추천 후보가 아직 없어요" body="일정 조건을 다시 조정하면 더 알맞은 장소를 찾을 수 있어요." action={<Button onClick={() => navigate("/trips/new")}>일정 조건 바꾸기</Button>} />
        )}
        {(recommendations ?? []).map((item, index) => {
          const itemKey = recommendationKey(item, index);
          return (
            <article className="result-card card" key={itemKey}>
              <div className="result-photo">{item.label}</div>
              <div className="stack tight">
                <div>
                  <h3>{item.title}</h3>
                  <div className="meta">{item.meta}</div>
                </div>
                <p className="meta">{item.reason}</p>
                <Button
                  variant="secondary"
                  disabled={addingRecommendationKey === itemKey}
                  onClick={() => void addRecommendationToTrip(item, itemKey)}
                >
                  {addingRecommendationKey === itemKey ? "추가 중" : "일정에 추가"}
                </Button>
              </div>
            </article>
          );
        })}
        {notice && <Toast>{notice}</Toast>}
      </div>
      {isCriteriaOpen && <RecommendationCriteriaSheet onClose={() => setIsCriteriaOpen(false)} />}
    </section>
  );
}

export function FriendInvitePage() {
  const { invited, sendInvite } = useSession();
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get("tripId");
  const [activeTripId, setActiveTripId] = useState(requestedTripId ?? "");
  const { data: trip, error: tripError, isLoading: tripLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    setActiveTripId(resolvedTripId ?? "");
    if (!resolvedTripId) throw new Error("Trip not found");
    return appDataApi.getTrip(resolvedTripId);
  }, [requestedTripId]);
  const { data: inviteState, error: inviteError, isLoading: inviteLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    if (!resolvedTripId) throw new Error("Trip not found");
    return appDataApi.getInviteState(resolvedTripId);
  }, [requestedTripId]);
  const [sentInviteState, setSentInviteState] = useState<InviteState | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<InviteRole>("editor");
  const effectiveInviteState = sentInviteState ?? inviteState;
  const detailPath = activeTripId ? `/trips/${activeTripId}` : "/trips";

  useEffect(() => {
    if (effectiveInviteState?.role) setSelectedRole(effectiveInviteState.role);
  }, [effectiveInviteState?.role]);

  const shareInviteLink = async () => {
    const inviteUrl = effectiveInviteState?.inviteUrl ?? "";
    if (!inviteUrl) return;
    try {
      const method = await shareLinkWithFallback({
        title: `${title} 초대 링크`,
        text: `${title} 일정을 친구에게 공유해 보세요.`,
        url: inviteUrl,
      });
      setCopied(true);
      setNotice(method === "share" ? "초대 링크를 공유했어요." : "초대 링크를 복사했어요.");
    } catch {
      setCopied(true);
      setNotice("초대 링크를 공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const sendFriendInvite = async () => {
    const tripId = activeTripId || effectiveInviteState?.tripId;
    if (tripId) {
      const nextInviteState = await appDataApi.confirmInviteSent(tripId, selectedRole);
      setSentInviteState(nextInviteState);
    }
    sendInvite();
    setNotice("초대 링크가 준비됐어요. 링크를 복사해 친구에게 공유해 주세요.");
  };

  const title = trip?.title ?? "제주 3일 여행";
  const inviteUrl = effectiveInviteState?.inviteUrl ?? "travelhunter.app/i/jeju-3d";

  return (
    <section className="screen">
      <TopBar
        title="친구 초대"
        left={
          <IconButton label="일정 상세" to={detailPath}>
            <ChevronLeft size={20} />
          </IconButton>
        }
      />
      <div className="content stack padded">
        {(tripLoading || inviteLoading) && <LoadingState label="초대 정보를 불러오는 중입니다" />}
        {(tripError || inviteError) && <ErrorState message={tripError ?? inviteError ?? "초대 정보를 찾지 못했어요."} />}
        <div className="card">
          <div className="card-body stack">
            <PageHead eyebrow="공유 권한" title={`${title} 초대 링크를 준비하세요`} body="초대 링크를 활성화한 뒤 복사해서 친구에게 직접 공유할 수 있어요." />
            <div className="invite-link">
              <span>{inviteUrl}</span>
              <button className="btn sm ghost" onClick={shareInviteLink} type="button">
                {copied ? "복사됨" : "링크 복사"}
              </button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body stack tight">
            <div>
              <div className="choice-label">초대 권한</div>
              <p className="meta">친구가 초대를 수락하면 선택한 권한이 일정 참여자 역할로 저장돼요.</p>
            </div>
            <div className="choice-grid">
              {inviteRoleOptions.map((option) => (
                <button
                  className={`choice ${selectedRole === option.role ? "active" : ""}`}
                  key={option.role}
                  onClick={() => setSelectedRole(option.role)}
                  type="button"
                >
                  <strong>{option.label}</strong>
                  <span className="meta">{option.body}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {notice && <Toast>{notice}</Toast>}
        <Button full onClick={sendFriendInvite}>
          <Send size={18} />
          {invited || effectiveInviteState?.invited ? "초대 링크 준비 완료" : "초대 링크 활성화"}
        </Button>
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

function SettingRow({ label, body, value, tone = "default" }: { label: string; body: string; value: string; tone?: "default" | "primary" | "gray" }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <div className="meta">{body}</div>
      </div>
      <Tag tone={tone}>{value}</Tag>
    </div>
  );
}
