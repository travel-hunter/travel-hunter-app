import { Bot, ChevronLeft, Plus, Send, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { appDataApi, type InviteState, type ItineraryPlace, type Recommendation, type Trip, type TripPlaceRequest } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { ItineraryCard } from "../components/cards";
import { Button, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, PageHead, Tag, Toast, TopBar } from "../components/ui";

const profileOptions = appDataApi.getProfileOptions();
const durationOptions = [2, 3, 4, 5] as const;

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

export function ItineraryListPage() {
  const { addedPolicy } = useSession();
  const { data: loadedTrips, error, isLoading } = useAsyncResource(() => appDataApi.listTrips(), []);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (loadedTrips) setTrips(loadedTrips);
  }, [loadedTrips]);

  const deleteTrip = async (trip: Trip) => {
    if (deletingTripId) return;
    if (!window.confirm("이 일정을 삭제할까요?")) return;
    setDeletingTripId(trip.id);
    setDeleteError("");
    try {
      await appDataApi.deleteTrip(trip.id);
      setTrips((current) => current.filter((item) => item.id !== trip.id));
    } catch {
      setDeleteError("일정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingTripId(null);
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
        {error && <ErrorState message={error} />}
        {deleteError && <ErrorState message={deleteError} />}
        {!isLoading && !error && trips.length === 0 && (
          <EmptyState title="아직 등록된 일정이 없어요" body="첫 여행을 만들고 받을 수 있는 혜택을 함께 확인해보세요." action={<LinkButton to="/trips/new">일정 만들기</LinkButton>} />
        )}
        {trips.map((trip) => (
          <ItineraryCard key={trip.id} trip={trip} addedPolicy={addedPolicy} isDeleting={deletingTripId === trip.id} onDelete={deleteTrip} />
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
    </section>
  );
}

export function ItineraryCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, updateProfile, addPolicy } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [durationDays, setDurationDays] = useState<(typeof durationOptions)[number]>(3);
  const policySlug = searchParams.get("policySlug") ?? undefined;
  const selectedRegion = profile.region.trim() || "선택한 지역";
  const tripTitle = `${selectedRegion} ${durationDays}일 여행`;

  const createTrip = async () => {
    setIsCreating(true);
    setError("");
    try {
      const trip = await appDataApi.createTrip({
        title: tripTitle,
        region: profile.region,
        style: profile.style,
        policySlug,
        durationDays,
      });
      if (policySlug) {
        await appDataApi.addPolicyToTrip(trip.id, policySlug);
        addPolicy();
      }
      navigate(`/trips/${trip.id}`);
    } catch {
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
        {error && <ErrorState message={error} />}
        <Button full disabled={isCreating} onClick={createTrip}>
          {isCreating ? "일정을 만드는 중입니다" : `${selectedRegion} ${durationDays}일 일정 만들기`}
        </Button>
      </div>
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

function DurationChoiceGroup({ selected, onSelect }: { selected: (typeof durationOptions)[number]; onSelect: (value: (typeof durationOptions)[number]) => void }) {
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
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dayNumbers = trip ? tripDayNumbers(trip.days) : [];
  const visibleDay = dayNumbers.includes(activeDay) ? activeDay : (dayNumbers[0] ?? 1);
  const dayPlaces = trip?.days[visibleDay] ?? [];
  const stayLabel = formatStayLabel(dayNumbers.length || 3);

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
    setPlaceEditor({ mode: "add", dayNumber: visibleDay });
    setPlaceForm({ time: "", label: "", meta: "" });
    setPlaceError("");
  };

  const openEditPlace = (place: ItineraryPlace) => {
    setPlaceEditor({ mode: "edit", dayNumber: visibleDay, place });
    setPlaceForm({ time: place.time, label: place.label, meta: place.meta });
    setPlaceError("");
  };

  const submitPlaceEditor = async () => {
    if (!trip || !placeEditor) return;
    const label = placeForm.label.trim();
    if (!label) {
      setPlaceError("장소명을 입력해 주세요.");
      return;
    }
    setIsSavingPlace(true);
    setPlaceError("");
    try {
      const payload = {
        time: placeForm.time?.trim() || undefined,
        label,
        meta: placeForm.meta?.trim() || undefined,
      };
      const nextTrip =
        placeEditor.mode === "add"
          ? await appDataApi.addTripPlace(trip.id, placeEditor.dayNumber, payload)
          : await appDataApi.updateTripPlace(trip.id, placeEditor.place.id ?? "", payload);
      setTrip(nextTrip);
      setPlaceEditor(null);
      setNotice(placeEditor.mode === "add" ? "장소를 일정에 추가했어요." : "장소 정보를 수정했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setPlaceError("장소 정보를 저장하지 못했어요. 입력값을 확인하고 다시 시도해 주세요.");
    } finally {
      setIsSavingPlace(false);
    }
  };

  const deletePlace = async (place: ItineraryPlace) => {
    if (!trip || !place.id || isSavingPlace) return;
    if (!window.confirm("이 장소를 일정에서 삭제할까요?")) return;
    setIsSavingPlace(true);
    setPlaceError("");
    try {
      const nextTrip = await appDataApi.deleteTripPlace(trip.id, place.id);
      setTrip(nextTrip);
      setNotice("장소를 일정에서 삭제했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setPlaceError("장소를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSavingPlace(false);
    }
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
        <ErrorState message={error ?? "일정 정보를 찾지 못했어요."} />
      </section>
    );
  }

  return (
    <section className="screen with-tabs">
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
      <div className="day-tabs">
        {dayNumbers.map((day) => (
          <button className={visibleDay === day ? "day-tab active" : "day-tab"} key={day} onClick={() => setActiveDay(day)} type="button">
            <strong>Day {day}</strong>
            <span>{formatDayDateLabel(trip.dates, day)}</span>
          </button>
        ))}
      </div>
      <div className="timeline">
        {dayPlaces.length === 0 && <EmptyState title="아직 추가된 장소가 없어요" body="장소 추가 버튼으로 방문지를 일정에 저장해 보세요." />}
        {dayPlaces.map((place) => (
          <div className="timeline-item" key={place.id ?? `${place.time}-${place.label}`}>
            <div className="time">{place.time}</div>
            <article className="place-detail">
              <div>
                <h4>{place.label}</h4>
                <div className="meta">{place.meta}</div>
              </div>
              <div className="place-actions">
                <button className="btn sm ghost" type="button" onClick={() => openEditPlace(place)} disabled={!place.id || isSavingPlace}>
                  수정
                </button>
                <button className="btn sm line" type="button" onClick={() => deletePlace(place)} disabled={!place.id || isSavingPlace}>
                  삭제
                </button>
              </div>
            </article>
          </div>
        ))}
        <button className="dashed" type="button" onClick={openAddPlace}>
          + 장소 추가
        </button>
        <Link className="btn secondary full" to={`/ai-results?tripId=${encodeURIComponent(trip.id)}`}>
          AI 추천 일정 보기
        </Link>
      </div>
      {placeError && !placeEditor && <Toast>{placeError}</Toast>}
      {notice && <Toast>{notice}</Toast>}
      {placeEditor && (
        <PlaceEditorSheet
          error={placeError}
          form={placeForm}
          isSaving={isSavingPlace}
          mode={placeEditor.mode}
          onChange={setPlaceForm}
          onClose={() => !isSavingPlace && setPlaceEditor(null)}
          onSubmit={submitPlaceEditor}
        />
      )}
    </section>
  );
}

function PlaceEditorSheet({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string;
  form: TripPlaceRequest;
  isSaving: boolean;
  mode: "add" | "edit";
  onChange: (form: TripPlaceRequest) => void;
  onClose: () => void;
  onSubmit: () => void;
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
          <label className="field">
            방문 시간
            <input
              name="place-time"
              placeholder="09:30"
              value={form.time ?? ""}
              onChange={(event) => onChange({ ...form, time: event.target.value })}
            />
          </label>
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
  const [addingRecommendation, setAddingRecommendation] = useState<string | null>(null);
  const detailPath = activeTripId ? `/trips/${activeTripId}` : "/trips";
  const { data: recommendations, error, isLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    setActiveTripId(resolvedTripId ?? "");
    if (!resolvedTripId) return [];
    return appDataApi.listRecommendations(resolvedTripId);
  }, [requestedTripId]);

  const addRecommendationToTrip = async (item: Recommendation) => {
    if (!activeTripId || addingRecommendation) return;
    setAddError("");
    setNotice(null);
    setAddingRecommendation(item.title);
    try {
      await appDataApi.addTripPlace(activeTripId, recommendationDayNumber(item.meta), recommendationPlacePayload(item));
      setNotice(`${item.title}을 일정에 추가했어요.`);
      navigate(`/trips/${activeTripId}`);
    } catch {
      setAddError("추천 장소를 일정에 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAddingRecommendation(null);
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
          <button className="icon-btn" type="button" aria-label="추천 기준">
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
        {(recommendations ?? []).map((item) => (
          <article className="result-card card" key={item.title}>
            <div className="result-photo">{item.label}</div>
            <div className="stack tight">
              <div>
                <h3>{item.title}</h3>
                <div className="meta">{item.meta}</div>
              </div>
              <p className="meta">{item.reason}</p>
              <Button
                variant="secondary"
                disabled={addingRecommendation === item.title}
                onClick={() => void addRecommendationToTrip(item)}
              >
                {addingRecommendation === item.title ? "추가 중" : "일정에 추가"}
              </Button>
            </div>
          </article>
        ))}
        {notice && <Toast>{notice}</Toast>}
      </div>
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
  const effectiveInviteState = sentInviteState ?? inviteState;
  const detailPath = activeTripId ? `/trips/${activeTripId}` : "/trips";

  const copyInviteLink = async () => {
    const inviteUrl = effectiveInviteState?.inviteUrl ?? "";
    try {
      if (navigator.clipboard && inviteUrl) await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // Clipboard permission can be unavailable in some browsers; the UI still confirms the copy action.
    }
    setCopied(true);
    setNotice("초대 링크를 복사했어요.");
  };

  const sendFriendInvite = async () => {
    const tripId = activeTripId || effectiveInviteState?.tripId;
    if (tripId) {
      const nextInviteState = await appDataApi.confirmInviteSent(tripId);
      setSentInviteState(nextInviteState);
    }
    sendInvite();
    setNotice("친구에게 초대장을 보냈어요.");
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
            <PageHead eyebrow="공유 권한" title={`${title}에 친구를 초대하세요`} body="초대받은 친구는 일정 확인과 장소 의견 추가를 할 수 있어요." />
            <div className="invite-link">
              <span>{inviteUrl}</span>
              <button className="btn sm ghost" onClick={copyInviteLink} type="button">
                {copied ? "복사됨" : "링크 복사"}
              </button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <SettingRow label="보기 권한" body="일정과 연결된 정책 확인" value="기본" />
            <SettingRow label="댓글 권한" body="장소 의견과 체크리스트 의견 추가" value="허용" tone="primary" />
            <SettingRow label="편집 권한" body="장소 순서와 시간 변경" value="제한" tone="gray" />
          </div>
        </div>
        {notice && <Toast>{notice}</Toast>}
        <Button full onClick={sendFriendInvite}>
          <Send size={18} />
          {invited || effectiveInviteState?.invited ? "초대 완료" : "친구에게 초대 보내기"}
        </Button>
      </div>
    </section>
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
