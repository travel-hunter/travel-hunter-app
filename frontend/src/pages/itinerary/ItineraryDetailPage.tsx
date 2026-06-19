import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, type DragEndEvent, type DragStartEvent, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Car, ChevronLeft, GripVertical, Info, Map as MapIcon, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { appDataApi, isApiError, type ItineraryPlace, type LinkedTripPolicy, type PlaceSearchCandidate, type Recommendation, type Trip, type TripPlaceMutationRequest, type TripPlaceRequest } from "../../api";
import { useSession } from "../../app/session";
import { useAsyncResource } from "../../api/useAsyncResource";
import { KakaoMapView, type KakaoMapMarker } from "../../components/map/KakaoMapView";
import { Button, ConfirmDialog, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, Toast, TopBar } from "../../components/ui";
import { getPolicyMoodIcon, getPolicyMoodTone, getTripRegionEmojiFromTitle } from "../../data/displayConfig";
import { clearDraft, createDraftKey, readDraft, saveDraft } from "../../utils/draftStorage";
import { DraftRestoreNotice } from "./_shared";

const defaultPlaceTime = "09:00";
const placeMinuteStep = 10;
const placeMinuteOptions = [0, 10, 20, 30, 40, 50] as const;
const placeTimeErrorMessage = "방문 시간은 10분 단위로 선택해 주세요.";

type TripDetailLocationState = {
  linkedPolicy?: LinkedTripPolicy | null;
};
type TripPlaceAddDraft = TripPlaceRequest & {
  dayNumber: number;
};
type TripPlaceEditDraft = TripPlaceRequest & {
  placeId: string;
};
type PreviewPlace = {
  previewId: string;
  dayNumber: number;
  time?: string;
  label: string;
  meta?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  categoryCode?: string | null;
  placeUrl?: string | null;
  sourceProvider?: string | null;
  externalPlaceId?: string | null;
};
type DisplayedPlace = ItineraryPlace & {
  isRecommendationPreview?: boolean;
  previewId?: string;
  previewDayNumber?: number;
};
type RecommendationTimeBucket = "attraction" | "food" | "cafe" | "stay";
type RecommendationPreviewState = {
  status: "idle" | "loading" | "ready" | "saving";
  places: PreviewPlace[];
  error: string;
};
type PlacePreviewSource = "empty" | "draft" | "recommendation" | "searchPreview" | "selected" | "manual";
type PlaceSaveEligibility = "empty" | "saveSelected" | "requiresExplicitCandidate" | "manualAllowed";
type PlacePreviewCandidate = TripPlaceRequest & {
  previewId: string;
  source: Exclude<PlacePreviewSource, "empty">;
  dayNumber: number;
};
type PlacePreviewState =
  | { source: "empty"; place: null }
  | { source: Exclude<PlacePreviewSource, "empty">; place: PlacePreviewCandidate };

function tripDayNumbers(days: Record<number, unknown[]>): number[] {
  return Object.keys(days)
    .map(Number)
    .filter((day) => Number.isFinite(day))
    .sort((a, b) => a - b);
}

function formatStayLabel(dayCount: number): string {
  return `${Math.max(dayCount - 1, 0)}박 ${dayCount}일`;
}

function hasPolicySaving(expectedSaving: string | undefined): boolean {
  const value = expectedSaving?.trim();
  return Boolean(value && !value.startsWith("0"));
}

function linkedTripPoliciesForDisplay(
  apiPolicies: LinkedTripPolicy[] | undefined,
  routePolicy: LinkedTripPolicy | null,
  hiddenRoutePolicySlugs: Set<string>,
): LinkedTripPolicy[] {
  const seen = new Set<string>();
  const policies: LinkedTripPolicy[] = [];
  const append = (policy: LinkedTripPolicy | null | undefined) => {
    if (!policy || seen.has(policy.slug)) return;
    seen.add(policy.slug);
    policies.push(policy);
  };

  if (!routePolicy || !hiddenRoutePolicySlugs.has(routePolicy.slug)) append(routePolicy);
  for (const policy of apiPolicies ?? []) append(policy);
  return policies;
}

function formatDayDateLabel(dates: string, dayNumber: number): string {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(dates);
  if (!match) return `Day ${dayNumber}`;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayNumber - 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatTripDday(dates: string): string {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(dates);
  if (!match) return "D-day";
  const start = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.ceil((start.getTime() - todayDate.getTime()) / 86_400_000);
  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return "D-day";
  return `D+${Math.abs(diffDays)}`;
}

function getPlaceEmoji(place: ItineraryPlace): string {
  const text = `${place.label} ${place.meta}`.toLowerCase();
  if (/카페|커피|tea|cafe|오설록/.test(text)) return "☕";
  if (/식당|맛집|해녀|국수|흑돼지|밥|restaurant|food|meal/.test(text)) return "🍽️";
  if (/바다|해변|해수욕|beach|sea|월정|섭지/.test(text)) return "🌊";
  if (/산|오름|일출|숲|공원|nature|park|peak/.test(text)) return "⛰️";
  if (/공항|역|터미널|airport|station/.test(text)) return "🧳";
  return "📍";
}

function getPlaceMapPoint(index: number, dayNumber: number): { x: number; y: number } {
  const basePoints = [
    { x: 78, y: 30 },
    { x: 72, y: 52 },
    { x: 84, y: 62 },
    { x: 52, y: 70 },
    { x: 33, y: 56 },
    { x: 25, y: 38 },
  ];
  const point = basePoints[index % basePoints.length];
  const offset = Math.max(dayNumber - 1, 0) * 3;
  return {
    x: Math.min(90, Math.max(10, point.x - offset)),
    y: Math.min(86, Math.max(18, point.y + (offset % 7))),
  };
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

function recommendationPlaceDescription(item: Recommendation): string {
  const parts = [item.categoryName, item.address].filter((part): part is string => Boolean(part?.trim()));
  if (parts.length > 0) return parts.join(" · ");
  return item.meta || item.reason || "장소 정보 확인";
}

function recommendationPlacePayload(item: Recommendation, time: string | undefined): TripPlaceRequest {
  return {
    time: time ?? "",
    label: item.title,
    meta: recommendationPlaceDescription(item),
    address: item.address ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    category: item.categoryName ?? item.categoryGroup ?? null,
    categoryCode: item.categoryCode ?? null,
    placeUrl: item.placeUrl ?? null,
    sourceProvider: item.sourceProvider ?? null,
    externalPlaceId: item.externalPlaceId ?? null,
  };
}

function explicitRecommendationPlaceTime(item: Recommendation): string | null {
  return item.meta.match(/\b\d{2}:\d{2}\b/)?.[0] ?? null;
}

function recommendationTimeBucket(item: Recommendation): RecommendationTimeBucket {
  const categoryCode = item.categoryCode?.toUpperCase();
  if (categoryCode === "FD6") return "food";
  if (categoryCode === "CE7") return "cafe";
  if (categoryCode === "AD5") return "stay";
  if (item.categoryGroup === "food") return "food";
  if (item.categoryGroup === "stay") return "stay";

  const categoryText = [item.categoryName, item.meta, item.reason, item.title].filter(Boolean).join(" ");
  if (/카페|커피|디저트/.test(categoryText)) return "cafe";
  if (/식당|음식|맛집|밥|한식|양식|일식|중식|분식|레스토랑/.test(categoryText)) return "food";
  if (/숙소|호텔|리조트|펜션|게스트하우스/.test(categoryText)) return "stay";
  return "attraction";
}

function recommendationBucketBaseTime(bucket: RecommendationTimeBucket): string {
  switch (bucket) {
    case "food":
      return "12:00";
    case "cafe":
      return "15:00";
    case "stay":
      return "17:00";
    case "attraction":
    default:
      return "10:00";
  }
}

function addHoursToPlaceTime(time: string, hours: number): string {
  const parsed = parsePlaceTime(time) ?? parsePlaceTime(defaultPlaceTime) ?? { hour: 9, minute: 0 };
  return formatPlaceTime((parsed.hour + hours) % 24, parsed.minute);
}

function recommendationPlaceTime(item: Recommendation, bucketOffset = 0): string {
  const explicitTime = explicitRecommendationPlaceTime(item);
  if (explicitTime) return explicitTime;
  return addHoursToPlaceTime(recommendationBucketBaseTime(recommendationTimeBucket(item)), bucketOffset);
}

function recommendationPreviewId(item: Recommendation, index: number): string {
  const stableId = item.id ?? item.externalPlaceId;
  if (stableId) return stableId;
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ?? `preview-${index}-${Date.now()}`;
}

function previewPlaceFromRecommendation(item: Recommendation, index: number, dayNumber: number): PreviewPlace {
  const payload = recommendationPlacePayload(item, recommendationPlaceTime(item));
  return {
    previewId: recommendationPreviewId(item, index),
    dayNumber,
    time: payload.time,
    label: payload.label,
    meta: payload.meta,
    address: payload.address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    category: payload.category,
    categoryCode: payload.categoryCode,
    placeUrl: payload.placeUrl,
    sourceProvider: payload.sourceProvider,
    externalPlaceId: payload.externalPlaceId,
  };
}

function previewPlacesFromRecommendations(items: Recommendation[], dayNumbers: number[], visibleDay: number): PreviewPlace[] {
  const bucketCounts = new Map<string, number>();
  return items.map((item, index) => {
    const dayNumber = dayNumbers.includes(item.suggestedDay ?? 1) ? item.suggestedDay ?? 1 : visibleDay;
    const explicitTime = explicitRecommendationPlaceTime(item);
    const bucket = recommendationTimeBucket(item);
    const bucketKey = `${dayNumber}:${bucket}`;
    const offset = explicitTime ? 0 : bucketCounts.get(bucketKey) ?? 0;
    if (!explicitTime) bucketCounts.set(bucketKey, offset + 1);
    const payload = recommendationPlacePayload(item, recommendationPlaceTime(item, offset));
    return {
      previewId: recommendationPreviewId(item, index),
      dayNumber,
      time: payload.time,
      label: payload.label,
      meta: payload.meta,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      category: payload.category,
      categoryCode: payload.categoryCode,
      placeUrl: payload.placeUrl,
      sourceProvider: payload.sourceProvider,
      externalPlaceId: payload.externalPlaceId,
    };
  });
}

function tripPlaceMutationFromPreviewPlace(place: PreviewPlace, expectedRevision: number): TripPlaceMutationRequest {
  return {
    time: place.time ?? "",
    label: place.label,
    meta: place.meta,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    category: place.category,
    categoryCode: place.categoryCode,
    placeUrl: place.placeUrl,
    sourceProvider: place.sourceProvider,
    externalPlaceId: place.externalPlaceId,
    expectedRevision,
  };
}

function timelinePlaceFromPreviewPlace(place: PreviewPlace): DisplayedPlace {
  return {
    time: place.time ?? "",
    label: place.label,
    meta: place.meta ?? "",
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    category: place.category,
    categoryCode: place.categoryCode,
    placeUrl: place.placeUrl,
    sourceProvider: place.sourceProvider,
    externalPlaceId: place.externalPlaceId,
    isRecommendationPreview: true,
    previewId: place.previewId,
    previewDayNumber: place.dayNumber,
  };
}

function previewFromPayload(
  payload: TripPlaceRequest,
  source: Exclude<PlacePreviewSource, "empty">,
  dayNumber: number,
  previewId: string,
): PlacePreviewCandidate {
  return {
    ...payload,
    label: payload.label,
    meta: payload.meta ?? "",
    previewId,
    source,
    dayNumber,
  };
}

function previewFromRecommendation(item: Recommendation, index: number, dayNumber: number): PlacePreviewCandidate {
  const time = recommendationPlaceTime(item);
  return previewFromPayload(recommendationPlacePayload(item, time), "recommendation", dayNumber, recommendationPreviewId(item, index));
}

function placeSearchCandidatePayload(item: PlaceSearchCandidate, time: string | undefined): TripPlaceRequest {
  return {
    time: time ?? "",
    label: item.title,
    meta: item.meta,
    address: item.address ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    category: item.categoryName ?? null,
    categoryCode: item.categoryCode ?? null,
    placeUrl: item.placeUrl ?? null,
    sourceProvider: item.sourceProvider ?? null,
    externalPlaceId: item.externalPlaceId ?? item.id ?? null,
  };
}

function previewFromSearchCandidate(item: PlaceSearchCandidate, dayNumber: number, source: "searchPreview" | "selected", time = ""): PlacePreviewCandidate {
  return previewFromPayload(placeSearchCandidatePayload(item, time), source, dayNumber, item.id ?? item.externalPlaceId ?? `${item.title}:${item.address ?? item.meta}`);
}

function previewFromDraft(draft: TripPlaceAddDraft, dayNumber: number): PlacePreviewCandidate {
  return previewFromPayload(
    {
      time: draft.time ?? "",
      label: draft.label,
      meta: draft.meta ?? "",
    },
    "draft",
    dayNumber,
    `draft:${dayNumber}:${draft.label}`,
  );
}

function placePreviewMarker(place: PlacePreviewCandidate): KakaoMapMarker | null {
  const query = place.address?.trim() || place.label.trim() || place.meta?.trim() || null;
  if (!place.label.trim() && !query) return null;
  return {
    id: place.previewId,
    label: place.label,
    subtitle: place.address || place.meta || null,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    query,
  };
}

function saveEligibilityForPreview(preview: PlacePreviewState): PlaceSaveEligibility {
  if (preview.source === "empty") return "empty";
  return preview.source === "searchPreview" ? "requiresExplicitCandidate" : "saveSelected";
}

function placeSearchText(item: PlaceSearchCandidate): string {
  return [item.title, item.meta, item.categoryName, item.address]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLocaleLowerCase("ko-KR");
}

const TRIP_CONFLICT_MESSAGE = "다른 사용자가 먼저 일정을 수정했어요. 최신 내용을 확인한 뒤 다시 저장해 주세요.";
const REPLACE_PREVIEW_CLEANUP_MESSAGE = "새 추천 장소는 저장됐지만 기존 장소 정리가 끝나지 않았어요. 최신 일정을 확인해 남은 기존 장소를 정리해 주세요.";

function isTripConflict(error: unknown): boolean {
  return isApiError(error) && error.status === 409;
}

export function ItineraryDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { removeAddedPolicy } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeDay, setActiveDay] = useState(1);
  const [selectedMapPlaceId, setSelectedMapPlaceId] = useState<string | null>(() => searchParams.get("place"));
  const { data: loadedTrip, error, isLoading } = useAsyncResource(() => {
    if (!tripId) return Promise.reject(new Error("Trip not found"));
    return appDataApi.getTrip(tripId);
  }, [tripId]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [placeEditor, setPlaceEditor] = useState<{ mode: "add"; dayNumber: number } | { mode: "edit"; dayNumber: number; place: ItineraryPlace } | null>(null);
  const [placeForm, setPlaceForm] = useState<TripPlaceRequest>({ time: "", label: "", meta: "" });
  const [placeError, setPlaceError] = useState("");
  const [placeDeleteError, setPlaceDeleteError] = useState("");
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");
  const [placeSearchCandidates, setPlaceSearchCandidates] = useState<PlaceSearchCandidate[]>([]);
  const [isLoadingPlaceSearch, setIsLoadingPlaceSearch] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState("");
  const [placePreview, setPlacePreview] = useState<PlacePreviewState>({ source: "empty", place: null });
  const [placeSaveEligibility, setPlaceSaveEligibility] = useState<PlaceSaveEligibility>("empty");
  const [movingPlaceId, setMovingPlaceId] = useState<string | null>(null);
  const [draggingPlaceId, setDraggingPlaceId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [placeDetail, setPlaceDetail] = useState<{ dayNumber: number; place: ItineraryPlace } | null>(null);
  const [deleteCandidatePlace, setDeleteCandidatePlace] = useState<ItineraryPlace | null>(null);
  const [removingPolicySlug, setRemovingPolicySlug] = useState<string | null>(null);
  const [policyRemoveError, setPolicyRemoveError] = useState("");
  const [hiddenRoutePolicySlugs, setHiddenRoutePolicySlugs] = useState<Set<string>>(() => new Set());
  const [placeDraftNotice, setPlaceDraftNotice] = useState("");
  const [recommendationPreview, setRecommendationPreview] = useState<RecommendationPreviewState>({ status: "idle", places: [], error: "" });
  const [replacePreviewConfirmOpen, setReplacePreviewConfirmOpen] = useState(false);
  const [replacePreviewFinalizeOpen, setReplacePreviewFinalizeOpen] = useState(false);
  const placeEditorSessionRef = useRef(0);
  const placeSearchRequestRef = useRef(0);
  const placePreviewRef = useRef<PlacePreviewState>({ source: "empty", place: null });
  const dayNumbers = trip ? tripDayNumbers(trip.days) : [];
  const visibleDay = dayNumbers.includes(activeDay) ? activeDay : (dayNumbers[0] ?? 1);
  const dayPlaces = trip?.days[visibleDay] ?? [];
  const isPreviewActive = recommendationPreview.status === "ready" || recommendationPreview.status === "saving";
  const previewDayPlaces = isPreviewActive ? recommendationPreview.places.filter((place) => place.dayNumber === visibleDay) : [];
  const displayedPlaces: DisplayedPlace[] = [...dayPlaces, ...previewDayPlaces.map(timelinePlaceFromPreviewPlace)];
  const selectedPreviewMapPlace = isPreviewActive ? previewDayPlaces.find((place) => place.previewId === selectedMapPlaceId) ?? null : null;
  const mapPlaces: DisplayedPlace[] = selectedPreviewMapPlace ? [timelinePlaceFromPreviewPlace(selectedPreviewMapPlace)] : dayPlaces;
  const sortablePlaceIds = dayPlaces.flatMap((place) => (place.id ? [placeDragId(place.id)] : []));
  const stayLabel = formatStayLabel(dayNumbers.length || 3);
  const canManageTripStatus = trip?.currentUserRole === "owner" || trip?.currentUserRole === "editor";
  const isTripViewer = Boolean(trip && !canManageTripStatus);
  const canEditTrip = Boolean(canManageTripStatus);
  const activeDraggingPlaceLabel = draggingPlaceLabel(trip, draggingPlaceId);
  const tripPeople = trip?.people.length ? trip.people : ["지영", "민수", "수현"];
  const tripRegionEmojiLabel = trip ? getTripRegionEmojiFromTitle(trip.title) : "🧳";
  const tripDdayLabel = trip ? formatTripDday(trip.dates) : "D-day";
  const routeLinkedPolicy = (location.state as TripDetailLocationState | null)?.linkedPolicy ?? null;
  const linkedPolicies = linkedTripPoliciesForDisplay(trip?.linkedPolicies, routeLinkedPolicy, hiddenRoutePolicySlugs);
  const recommendedPolicies = trip?.recommendedPolicies ?? [];
  const hasLinkedPolicyFallback = linkedPolicies.length === 0 && hasPolicySaving(trip?.expectedSaving);
  const hasSavedPlaces = Object.values(trip?.days ?? {}).some((places) => places.length > 0);
  const dragSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const refreshTripAfterConflict = async (setError: (message: string) => void) => {
    if (!trip) return;
    const latestTrip = await appDataApi.getTrip(trip.id).catch(() => null);
    if (latestTrip) setTrip(latestTrip);
    setError(TRIP_CONFLICT_MESSAGE);
  };
  const refreshTripQuietly = async (tripIdToRefresh: string) => {
    const latestTrip = await appDataApi.getTrip(tripIdToRefresh).catch(() => null);
    if (latestTrip) setTrip(latestTrip);
  };
  const updatePlacePreview = (nextPreview: PlacePreviewState) => {
    placePreviewRef.current = nextPreview;
    setPlacePreview(nextPreview);
  };
  const clearPlacePreview = () => {
    updatePlacePreview({ source: "empty", place: null });
    setPlaceSaveEligibility("empty");
  };

  useEffect(() => {
    if (loadedTrip) setTrip(loadedTrip);
  }, [loadedTrip]);

  useEffect(() => {
    if (dayNumbers.length > 0) {
      const requestedDay = Number(searchParams.get("day"));
      setActiveDay(dayNumbers.includes(requestedDay) ? requestedDay : dayNumbers[0]);
    }
  }, [trip?.id]);

  useEffect(() => {
    const nextPlaceId = searchParams.get("place");
    setSelectedMapPlaceId((currentPlaceId) => {
      if (!nextPlaceId && currentPlaceId && recommendationPreview.places.some((place) => place.previewId === currentPlaceId)) {
        return currentPlaceId;
      }
      return nextPlaceId;
    });
  }, [recommendationPreview.places, searchParams]);

  useEffect(() => {
    if (trip && tripId && trip.id !== tripId) {
      navigate(`/trips/${trip.id}`, { replace: true });
    }
  }, [navigate, trip, tripId]);

  const updateDetailSearchParams = (nextValues: { day?: number; place?: string | null }) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextValues.day) next.set("day", String(nextValues.day));
      if ("place" in nextValues) {
        if (nextValues.place) next.set("place", nextValues.place);
        else next.delete("place");
      }
      return next;
    }, { replace: true });
  };

  const selectTripDay = (day: number) => {
    setActiveDay(day);
    setSelectedMapPlaceId(null);
    updateDetailSearchParams({ day, place: null });
  };

  const selectMapPlace = (placeId: string | null) => {
    setSelectedMapPlaceId(placeId);
    if (placeId && recommendationPreview.places.some((place) => place.previewId === placeId)) return;
    updateDetailSearchParams({ day: visibleDay, place: placeId });
  };

  const selectRecommendationPreviewMapPlace = (previewId: string) => {
    setSelectedMapPlaceId(previewId);
    updateDetailSearchParams({ day: visibleDay, place: null });
  };

  const showEditPermissionRequired = () => {
    setNotice("편집 권한이 필요해요. 이 일정은 보기 권한으로 참여 중이라 장소 추가나 추천 일정 저장을 할 수 없어요.");
    window.setTimeout(() => setNotice(null), 2200);
  };

  const openRecommendationPreview = async () => {
    if (!trip) return;
    if (!canEditTrip) {
      showEditPermissionRequired();
      return;
    }
    setRecommendationPreview({ status: "loading", places: [], error: "" });
    try {
      const recommendations = await appDataApi.listRecommendations(trip.id);
      const nextPlaces = previewPlacesFromRecommendations(recommendations, dayNumbers, visibleDay);
      setRecommendationPreview({ status: "ready", places: nextPlaces, error: "" });
    } catch {
      setRecommendationPreview({ status: "idle", places: [], error: "추천 일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
    }
  };

  const saveRecommendationPreview = async ({ replaceExisting }: { replaceExisting: boolean }) => {
    const previewPlaces = recommendationPreview.places;
    if (!trip || previewPlaces.length === 0) return;
    const invalidTimePlace = previewPlaces.find((place) => !isTenMinutePlaceTime(place.time ?? ""));
    if (invalidTimePlace) {
      setRecommendationPreview((current) => ({
        ...current,
        status: "ready",
        error: `${invalidTimePlace.label} 방문 시간은 10분 단위로 입력해 주세요.`,
      }));
      return;
    }
    setRecommendationPreview((current) => ({ ...current, status: "saving", error: "" }));
    const savedPreviewIds = new Set<string>();
    const originalPlaceIds = replaceExisting
      ? Object.values(trip.days)
          .flat()
          .map((place) => place.id)
          .filter((placeId): placeId is string => Boolean(placeId))
      : [];
    let replaceCleanupStarted = false;
    try {
      let currentTrip = trip;
      for (const previewPlace of previewPlaces) {
        currentTrip = await appDataApi.addTripPlace(
          currentTrip.id,
          previewPlace.dayNumber,
          tripPlaceMutationFromPreviewPlace(previewPlace, currentTrip.revision),
        );
        savedPreviewIds.add(previewPlace.previewId);
      }
      if (replaceExisting) {
        replaceCleanupStarted = true;
        for (const placeId of originalPlaceIds) {
          currentTrip = await appDataApi.deleteTripPlace(currentTrip.id, placeId, currentTrip.revision);
        }
      }
      setTrip(currentTrip);
      setRecommendationPreview((current) => {
        const remainingPlaces = current.places.filter((place) => !savedPreviewIds.has(place.previewId));
        return remainingPlaces.length > 0 ? { status: "ready", places: remainingPlaces, error: "" } : { status: "idle", places: [], error: "" };
      });
      setSelectedMapPlaceId((currentPlaceId) => (currentPlaceId && savedPreviewIds.has(currentPlaceId) ? null : currentPlaceId));
      setReplacePreviewConfirmOpen(false);
      setReplacePreviewFinalizeOpen(false);
      setNotice(
        replaceExisting
          ? "추천 일정으로 교체했어요."
          : previewPlaces.length === 1
            ? `${previewPlaces[0].label}을(를) 저장했어요.`
            : "추천 일정을 저장했어요.",
      );
      window.setTimeout(() => setNotice(null), 1800);
    } catch (error) {
      const replaceCleanupFailed = replaceExisting && replaceCleanupStarted && savedPreviewIds.size === previewPlaces.length;
      const keepUnsavedPreview = (current: RecommendationPreviewState, message: string): RecommendationPreviewState => ({
        ...current,
        status: "ready",
        error: message,
        places: current.places.filter((place) => !savedPreviewIds.has(place.previewId)),
      });
      const preservePreviewState = (message: string) => {
        setRecommendationPreview((current) => keepUnsavedPreview(current, message));
      };
      if (replaceCleanupFailed) {
        await refreshTripQuietly(trip.id);
        preservePreviewState(REPLACE_PREVIEW_CLEANUP_MESSAGE);
        setReplacePreviewConfirmOpen(false);
        setReplacePreviewFinalizeOpen(false);
      } else if (isTripConflict(error)) {
        await refreshTripAfterConflict((message) => preservePreviewState(message));
      } else {
        await refreshTripQuietly(trip.id);
        preservePreviewState("추천 일정을 저장하지 못했어요. 최신 일정은 다시 불러왔고, 저장되지 않은 미리보기 입력은 그대로 보존했어요.");
      }
    }
  };

  const saveRecommendationPreviewPlace = async (previewId: string) => {
    const previewPlace = recommendationPreview.places.find((place) => place.previewId === previewId);
    if (!trip || !previewPlace) return;
    if (!isTenMinutePlaceTime(previewPlace.time ?? "")) {
      setRecommendationPreview((current) => ({
        ...current,
        status: "ready",
        error: `${previewPlace.label} 방문 시간은 10분 단위로 입력해 주세요.`,
      }));
      return;
    }
    setRecommendationPreview((current) => ({ ...current, status: "saving", error: "" }));
    try {
      const nextTrip = await appDataApi.addTripPlace(
        trip.id,
        previewPlace.dayNumber,
        tripPlaceMutationFromPreviewPlace(previewPlace, trip.revision),
      );
      setTrip(nextTrip);
      setRecommendationPreview((current) => ({
        status: "ready",
        places: current.places.filter((place) => place.previewId !== previewId),
        error: "",
      }));
      setNotice(`${previewPlace.label}을(를) 저장했어요.`);
      window.setTimeout(() => setNotice(null), 1800);
    } catch (error) {
      const preservePreviewState = (message: string) => {
        setRecommendationPreview((current) => ({ ...current, status: "ready", error: message }));
      };
      if (isTripConflict(error)) {
        await refreshTripAfterConflict((message) => preservePreviewState(message));
      } else {
        await refreshTripQuietly(trip.id);
        preservePreviewState("추천 일정을 저장하지 못했어요. 최신 일정은 다시 불러왔고, 저장되지 않은 미리보기 입력은 그대로 보존했어요.");
      }
    }
  };

  const cancelRecommendationPreviewPlace = (previewId: string) => {
    setRecommendationPreview((current) => ({
      ...current,
      status: current.status === "saving" ? current.status : "ready",
      places: current.places.filter((place) => place.previewId !== previewId),
    }));
  };

  const chooseAddPlaceRecommendation = (items: Recommendation[], dayNumber: number): { item: Recommendation; index: number } | null => {
    if (items.length === 0) return null;
    const visibleDayMatch = items.findIndex((item) => item.suggestedDay === dayNumber);
    if (visibleDayMatch >= 0) return { item: items[visibleDayMatch], index: visibleDayMatch };
    const tripDayMatch = items.findIndex((item) => item.suggestedDay != null && dayNumbers.includes(item.suggestedDay));
    if (tripDayMatch >= 0) return { item: items[tripDayMatch], index: tripDayMatch };
    return { item: items[0], index: 0 };
  };

  const hydrateDefaultPlaceRecommendation = async (nextTrip: Trip, dayNumber: number, sessionId: number, searchRequestId: number) => {
    try {
      const recommendations = await appDataApi.listRecommendations(nextTrip.id);
      if (placeEditorSessionRef.current !== sessionId) return;
      if (placeSearchRequestRef.current !== searchRequestId) return;
      if (placePreviewRef.current.source !== "empty") return;
      const recommendation = chooseAddPlaceRecommendation(recommendations, dayNumber);
      if (!recommendation) return;
      const preview = previewFromRecommendation(recommendation.item, recommendation.index, dayNumber);
      updatePlacePreview({ source: "recommendation", place: preview });
      setPlaceSaveEligibility("saveSelected");
      updatePlaceForm({
        time: preview.time ?? "",
        label: preview.label,
        meta: preview.meta ?? "",
        address: preview.address,
        latitude: preview.latitude,
        longitude: preview.longitude,
        category: preview.category,
        categoryCode: preview.categoryCode,
        placeUrl: preview.placeUrl,
        sourceProvider: preview.sourceProvider,
        externalPlaceId: preview.externalPlaceId,
      });
    } catch {
      if (placeEditorSessionRef.current === sessionId && placePreviewRef.current.source === "empty") {
        setPlaceSaveEligibility("empty");
      }
    }
  };

  const openAddPlace = () => {
    if (!canEditTrip) {
      showEditPermissionRequired();
      return;
    }
    const draft = trip ? readDraft<TripPlaceAddDraft>(tripPlaceAddDraftKey(trip.id, visibleDay)) : null;
    const sessionId = placeEditorSessionRef.current + 1;
    placeEditorSessionRef.current = sessionId;
    placeSearchRequestRef.current = 0;
    setPlaceSearchQuery("");
    setPlaceSearchCandidates([]);
    setPlaceSearchError("");
    setPlaceEditor({ mode: "add", dayNumber: visibleDay });
    setPlaceForm(draft ? { time: draft.time ?? "", label: draft.label, meta: draft.meta ?? "" } : { time: "", label: "", meta: "" });
    if (draft?.label?.trim()) {
      updatePlacePreview({ source: "draft", place: previewFromDraft(draft, visibleDay) });
      setPlaceSaveEligibility("saveSelected");
    } else {
      clearPlacePreview();
    }
    setPlaceDraftNotice(draft ? "작성 중이던 장소 내용을 불러왔어요." : "");
    setPlaceError("");
    if (trip) void hydrateDefaultPlaceRecommendation(trip, visibleDay, sessionId, placeSearchRequestRef.current);
  };

  const openEditPlace = (place: ItineraryPlace) => {
    if (!canEditTrip) {
      setPlaceError("이 일정은 보기 권한으로 참여 중이라 편집할 수 없어요.");
      return;
    }
    const draft = trip && place.id ? readDraft<TripPlaceEditDraft>(tripPlaceEditDraftKey(trip.id, place.id)) : null;
    placeEditorSessionRef.current += 1;
    setPlaceSearchQuery("");
    setPlaceSearchError("");
    setPlaceSearchCandidates([]);
    clearPlacePreview();
    setPlaceEditor({ mode: "edit", dayNumber: visibleDay, place });
    setPlaceForm(draft ? { time: draft.time ?? "", label: draft.label, meta: draft.meta ?? "" } : { ...place, time: place.time, label: place.label, meta: place.meta });
    setPlaceDraftNotice(draft ? "수정 중이던 장소 내용을 불러왔어요." : "");
    setPlaceError("");
  };

  const loadPlaceSearchCandidates = async (nextTripId: string, query: string, sessionId: number, requestId: number) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      if (placeEditorSessionRef.current === sessionId && placeSearchRequestRef.current === requestId) {
        setPlaceSearchCandidates([]);
        setPlaceSearchError("");
        setIsLoadingPlaceSearch(false);
        setPlaceSaveEligibility(placePreviewRef.current.source === "searchPreview" ? "manualAllowed" : saveEligibilityForPreview(placePreviewRef.current));
      }
      return;
    }
    setIsLoadingPlaceSearch(true);
    setPlaceSearchError("");
    try {
      const candidates = await appDataApi.searchTripPlaces(nextTripId, { query: trimmedQuery });
      if (placeEditorSessionRef.current !== sessionId || placeSearchRequestRef.current !== requestId) return;
      setPlaceSearchCandidates(candidates);
      if (candidates.length > 0 && placeEditor?.mode === "add") {
        const preview = previewFromSearchCandidate(candidates[0], placeEditor.dayNumber, "searchPreview", placeForm.time ?? "");
        updatePlacePreview({ source: "searchPreview", place: preview });
        setPlaceSaveEligibility("requiresExplicitCandidate");
      } else if (placeEditor?.mode === "add") {
        setPlaceSaveEligibility("manualAllowed");
      }
    } catch {
      if (placeEditorSessionRef.current !== sessionId || placeSearchRequestRef.current !== requestId) return;
      setPlaceSearchCandidates([]);
      setPlaceSearchError("장소 검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      if (placeEditor?.mode === "add") setPlaceSaveEligibility("manualAllowed");
    } finally {
      if (placeEditorSessionRef.current === sessionId && placeSearchRequestRef.current === requestId) setIsLoadingPlaceSearch(false);
    }
  };

  const updatePlaceSearchQuery = (query: string) => {
    setPlaceSearchQuery(query);
    if (placeEditor?.mode === "add") {
      setPlaceError("");
      const trimmedQuery = query.trim();
      const blankSearchPreviewEligibility = placePreviewRef.current.source === "searchPreview" ? "manualAllowed" : saveEligibilityForPreview(placePreviewRef.current);
      setPlaceSaveEligibility(trimmedQuery ? "requiresExplicitCandidate" : blankSearchPreviewEligibility);
      setPlaceForm((current) => ({
        time: current.time ?? "",
        label: trimmedQuery ? "" : current.label,
        meta: trimmedQuery ? "" : current.meta ?? "",
      }));
    }
    const requestId = placeSearchRequestRef.current + 1;
    placeSearchRequestRef.current = requestId;
    if (trip) void loadPlaceSearchCandidates(trip.id, query, placeEditorSessionRef.current, requestId);
  };

  const selectPlaceSearchCandidate = (candidate: PlaceSearchCandidate) => {
    const preview = previewFromSearchCandidate(candidate, placeEditor?.dayNumber ?? visibleDay, "selected", placeForm.time ?? "");
    updatePlacePreview({ source: "selected", place: preview });
    setPlaceSaveEligibility("saveSelected");
    updatePlaceForm(placeSearchCandidatePayload(candidate, placeForm.time));
    setPlaceSearchQuery(candidate.title);
    setPlaceError("");
  };

  const submitPlaceEditor = async () => {
    if (!trip || !placeEditor) return;
    if (!canEditTrip) {
      setPlaceError("이 일정은 보기 권한으로 참여 중이라 편집할 수 없어요.");
      return;
    }
    if (placeEditor.mode === "add" && placeSaveEligibility === "requiresExplicitCandidate") {
      setPlaceError("검색 결과에서 저장할 장소를 직접 선택해 주세요.");
      return;
    }
    if (placeEditor.mode === "add" && placeSaveEligibility === "empty") {
      setPlaceError("검색 결과를 선택하거나 장소명을 직접 입력해 주세요.");
      return;
    }
    const label = placeForm.label.trim();
    if (!label) {
      setPlaceError(placeEditor.mode === "add" ? "검색 결과를 선택하거나 장소명을 직접 입력해 주세요." : "장소명을 입력해 주세요.");
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
      const payload: TripPlaceRequest & { expectedRevision: number } = {
        time,
        label,
        meta: placeForm.meta?.trim() || undefined,
        expectedRevision: trip.revision,
      };
      if (placeForm.address !== undefined) payload.address = placeForm.address;
      if (placeForm.latitude !== undefined) payload.latitude = placeForm.latitude;
      if (placeForm.longitude !== undefined) payload.longitude = placeForm.longitude;
      if (placeForm.category !== undefined) payload.category = placeForm.category;
      if (placeForm.categoryCode !== undefined) payload.categoryCode = placeForm.categoryCode;
      if (placeForm.placeUrl !== undefined) payload.placeUrl = placeForm.placeUrl;
      if (placeForm.sourceProvider !== undefined) payload.sourceProvider = placeForm.sourceProvider;
      if (placeForm.externalPlaceId !== undefined) payload.externalPlaceId = placeForm.externalPlaceId;
      const nextTrip =
        placeEditor.mode === "add"
          ? await appDataApi.addTripPlace(trip.id, placeEditor.dayNumber, payload)
          : await appDataApi.updateTripPlace(trip.id, placeEditor.place.id ?? "", payload);
      if (placeEditor.mode === "add") clearDraft(tripPlaceAddDraftKey(trip.id, placeEditor.dayNumber));
      if (placeEditor.mode === "edit" && placeEditor.place.id) clearDraft(tripPlaceEditDraftKey(trip.id, placeEditor.place.id));
      setTrip(nextTrip);
      setPlaceEditor(null);
      clearPlacePreview();
      setPlaceDraftNotice("");
      setNotice(placeEditor.mode === "add" ? "장소를 일정에 추가했어요." : "장소 정보를 수정했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch (error) {
      if (isTripConflict(error)) {
        await refreshTripAfterConflict(setPlaceError);
      } else {
        setPlaceError("장소 정보를 저장하지 못했어요. 입력값을 확인하고 다시 시도해 주세요.");
      }
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
      const nextTrip = await appDataApi.moveTripPlace(trip.id, place.id, { dayNumber, position, expectedRevision: trip.revision });
      setTrip(nextTrip);
      setActiveDay(dayNumber);
      updateDetailSearchParams({ day: dayNumber, place: null });
      setNotice("장소 순서를 변경했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch (error) {
      if (isTripConflict(error)) {
        await refreshTripAfterConflict(setMoveError);
      } else {
        setMoveError("장소 순서를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
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
      const nextTrip = await appDataApi.deleteTripPlace(trip.id, place.id, trip.revision);
      clearDraft(tripPlaceEditDraftKey(trip.id, place.id));
      setTrip(nextTrip);
      setDeleteCandidatePlace(null);
      setPlaceDraftNotice("");
      setNotice("장소를 일정에서 삭제했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch (error) {
      if (isTripConflict(error)) {
        await refreshTripAfterConflict(setPlaceDeleteError);
      } else {
        setPlaceDeleteError("장소를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsSavingPlace(false);
    }
  };

  const removeLinkedPolicy = async (policy: LinkedTripPolicy) => {
    if (!trip || removingPolicySlug) return;
    if (!canEditTrip) {
      setPolicyRemoveError("이 일정은 보기 권한으로 참여 중이라 정책 연결을 삭제할 수 없어요.");
      return;
    }
    setRemovingPolicySlug(policy.slug);
    setPolicyRemoveError("");
    try {
      await appDataApi.removePolicyFromTrip(trip.id, policy.slug);
      if (routeLinkedPolicy?.slug === policy.slug) {
        setHiddenRoutePolicySlugs((current) => new Set(current).add(policy.slug));
      }
      removeAddedPolicy(policy.slug);
      const nextLinkedPolicies = trip.linkedPolicies.filter((linkedPolicy) => linkedPolicy.slug !== policy.slug);
      setTrip({
        ...trip,
        expectedSaving: nextLinkedPolicies.length === 0 ? "0원" : trip.expectedSaving,
        linkedPolicies: nextLinkedPolicies,
      });
      setNotice("정책 연결을 해제했어요.");
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setPolicyRemoveError("정책 연결을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRemovingPolicySlug(null);
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
    placeEditorSessionRef.current += 1;
    setPlaceDraftNotice("");
    setPlaceSearchCandidates([]);
    setPlaceSearchQuery("");
    clearPlacePreview();
    setPlaceEditor(null);
  };

  const discardPlaceDraft = () => {
    if (!trip || !placeEditor) return;
    if (placeEditor.mode === "add") {
      clearDraft(tripPlaceAddDraftKey(trip.id, placeEditor.dayNumber));
      setPlaceForm({ time: "", label: "", meta: "" });
      clearPlacePreview();
    }
    if (placeEditor.mode === "edit" && placeEditor.place.id) {
      clearDraft(tripPlaceEditDraftKey(trip.id, placeEditor.place.id));
      setPlaceForm({ time: placeEditor.place.time, label: placeEditor.place.label, meta: placeEditor.place.meta });
    }
    setPlaceDraftNotice("");
  };

  const normalizedPlaceSearchQuery = placeSearchQuery.trim().toLocaleLowerCase("ko-KR");
  const placeSearchResults = placeSearchCandidates
    .filter((candidate) => {
      if (!normalizedPlaceSearchQuery) return true;
      return placeSearchText(candidate).includes(normalizedPlaceSearchQuery);
    })
    .slice(0, 6);

  if (isLoading) {
    return (
      <section className="screen with-tabs prototype-trip-detail-screen">
        <LoadingState label="일정 상세를 불러오는 중입니다" />
      </section>
    );
  }

  if (error || !trip) {
    return (
      <section className="screen with-tabs prototype-trip-detail-screen">
        <ErrorState message={error ?? "일정 정보를 찾지 못했어요."} action={<LinkButton to="/trips" variant="line">일정 목록으로</LinkButton>} />
      </section>
    );
  }

  return (
    <section className={canEditTrip ? "screen with-tabs prototype-trip-detail-screen" : "screen with-tabs readonly-trip prototype-trip-detail-screen"}>
      <TopBar
        title={trip.title}
        left={
          <IconButton label="일정 목록" to="/trips">
            <ChevronLeft size={20} />
          </IconButton>
        }
      />
      <div className="prototype-trip-detail-hero">
        <div>
          <span className="prototype-detail-dday-chip">{tripDdayLabel}</span>
          <h1>{trip.title}</h1>
          <p>📅 {trip.dates}</p>
        </div>
        <div className="prototype-trip-hero-icon" aria-hidden="true">
          {tripRegionEmojiLabel}
        </div>
      </div>
      <div className="trip-summary">
        <div className="between">
          <div className="row">
            <div className="avatar-stack">
              {tripPeople.slice(0, 3).map((name) => (
                <span className="avatar-mini" key={name}>
                  {name[0]}
                </span>
              ))}
            </div>
            <span className="meta">{tripPeople.length}명 참여 중</span>
          </div>
          {canManageTripStatus && (
            <Link className="prototype-invite-pill" to={`/friend-invite?tripId=${encodeURIComponent(trip.id)}`}>
              + 친구 초대
            </Link>
          )}
        </div>
      </div>
      <section className="prototype-linked-policy-section" aria-label="연결된 정책">
        <h2>🎯 연결된 정책</h2>
        {linkedPolicies.length > 0 ? (
          linkedPolicies.map((policy) => {
            const isHiddenPolicy = policy.status === "hidden";
            return (
              <div className={isHiddenPolicy ? "benefit-banner linked-policy-card hidden-policy" : "benefit-banner linked-policy-card"} key={policy.slug}>
                {isHiddenPolicy ? (
                  <div className="linked-policy-card-main" aria-label={`${policy.title} 숨김 정책`}>
                    <span className="benefit-banner-icon" aria-hidden="true">🚫</span>
                    <div>
                      <strong>{policy.title}</strong>
                      <div className="meta">{`${policy.amount || "혜택 확인"} · 숨김 처리됨`}</div>
                    </div>
                  </div>
                ) : (
                  <Link className="linked-policy-card-main" to={`/policies/${policy.slug}`}>
                    <span className="benefit-banner-icon" aria-hidden="true">💴</span>
                    <div>
                      <strong>{policy.title}</strong>
                      <div className="meta">{`${policy.amount || "혜택 확인"} · ${policy.region || "전국"}`}</div>
                    </div>
                  </Link>
                )}
                {canEditTrip && (
                  <button
                    aria-label={`${policy.title} 연결 삭제`}
                    className="linked-policy-remove"
                    disabled={removingPolicySlug === policy.slug}
                    onClick={() => void removeLinkedPolicy(policy)}
                    type="button"
                  >
                    {removingPolicySlug === policy.slug ? "삭제 중" : "삭제"}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <Link className="benefit-banner" to="/policies">
            <span className="benefit-banner-icon" aria-hidden="true">💴</span>
            <div>
              <strong>{hasLinkedPolicyFallback ? "연결된 정책이 있어요" : "연결된 정책이 없어요"}</strong>
              <div className="meta">
                {hasLinkedPolicyFallback ? `${trip?.expectedSaving ?? "혜택 확인"} · 정책 목록에서 확인` : "정책 상세에서 일정을 연결할 수 있어요"}
              </div>
            </div>
            <span className="benefit-banner-arrow" aria-hidden="true">›</span>
          </Link>
        )}
        {policyRemoveError && <p className="form-error">{policyRemoveError}</p>}
      </section>
      <section className="trip-benefit-grid" aria-label="이 일정에 어울리는 정책">
        <h2>💡 이 일정에 어울리는 정책</h2>
        <div className="prototype-matching-policy-rail">
          {recommendedPolicies.length > 0 ? (
            recommendedPolicies.map((policy) => (
              <Link className="prototype-matching-policy-card" key={policy.slug} to={`/policies/${policy.slug}`}>
                <div className="matching-card-head">
                  <span aria-hidden="true">💡</span>
                  <em>{policy.amount || "정책 확인"}</em>
                </div>
                <strong>{policy.title}</strong>
              </Link>
            ))
          ) : (
            <Link className="prototype-matching-policy-card" to="/policies">
              <div className="matching-card-head">
                <span aria-hidden="true">💡</span>
                <em>정책 확인</em>
              </div>
              <strong>이 일정에 어울리는 정책이 없어요</strong>
            </Link>
          )}
        </div>
      </section>
      <div className="prototype-trip-detail-divider" aria-hidden="true" />
      <DndContext
        sensors={dragSensors}
        collisionDetection={closestCenter}
        onDragStart={handlePlaceDragStart}
        onDragCancel={() => setDraggingPlaceId(null)}
        onDragEnd={handlePlaceDragEnd}
      >
        {isTripViewer && (
          <div className="card">
            <div className="card-body stack tight">
              <strong>보기 권한으로 참여 중입니다</strong>
              <p className="meta">일정과 정책은 확인할 수 있지만 장소 편집은 할 수 없어요.</p>
            </div>
          </div>
        )}

        {recommendationPreview.status === "loading" && <p className="place-search-status">추천 일정을 불러오는 중입니다.</p>}
        {recommendationPreview.error && <p className="form-error">{recommendationPreview.error}</p>}
        {isPreviewActive && (
          <section className="recommendation-preview-banner" aria-label="추천 일정 저장 전 미리보기">
            <div>
              <strong>저장 전 미리보기</strong>
              <p className="meta">추천 일정은 저장 전 후보 카드로 확인하고, 카드별 저장/취소 또는 취소/전체 저장을 할 수 있어요.</p>
              {recommendationPreview.places.length === 0 ? <p className="place-search-status">저장할 추천 일정이 없어요. 다시 추천을 불러와 주세요.</p> : null}
            </div>
            <div className="recommendation-preview-actions">
              <button className="btn sm line" type="button" disabled={recommendationPreview.status === "saving"} onClick={() => setRecommendationPreview({ status: "idle", places: [], error: "" })}>
                취소
              </button>
              {recommendationPreview.places.length > 0 ? (
                <button
                  className="btn sm primary"
                  type="button"
                  disabled={recommendationPreview.status === "saving"}
                  onClick={() => {
                    setRecommendationPreview((current) => ({ ...current, error: "" }));
                    setReplacePreviewFinalizeOpen(false);
                    setReplacePreviewConfirmOpen(true);
                  }}
                >
                  {recommendationPreview.status === "saving" ? "저장 중" : "전체 저장"}
                </button>
              ) : null}
            </div>
          </section>
        )}

        <PrototypeTripMap
          dayNumber={visibleDay}
          onSelectPlace={selectMapPlace}
          onShowPlaceDetail={(place) => {
            setNotice(null);
            setPlaceDetail({ dayNumber: visibleDay, place });
          }}
          places={mapPlaces}
          selectedPlaceId={selectedMapPlaceId}
        />

        <section className="trip-primary-actions" aria-label="일정 편집 작업">
          <button className="prototype-trip-action-button prototype-trip-action-add" type="button" onClick={openAddPlace}>
            + 장소 추가
          </button>
          <button className="prototype-trip-action-button prototype-trip-action-ai" type="button" onClick={() => void openRecommendationPreview()}>
            ✨ 추천 일정만들기
          </button>
        </section>

        <div className="day-tabs" aria-label="일정 날짜 선택">
          {dayNumbers.map((day) => (
            <DroppableDayTab
              canDrop={canEditTrip && Boolean(draggingPlaceId)}
              dateLabel={formatDayDateLabel(trip.dates, day)}
              day={day}
              isActive={visibleDay === day}
              key={day}
              onSelect={selectTripDay}
              placeLabel={activeDraggingPlaceLabel}
            />
          ))}
        </div>

        {displayedPlaces.length > 0 && (
          <>
            <div className={draggingPlaceId ? "timeline dnd-active" : "timeline"}>
              <SortableContext items={sortablePlaceIds} strategy={verticalListSortingStrategy}>
                {displayedPlaces.map((place, index) => (
                  <SortablePlaceItem
                    canEditTrip={canEditTrip && !isPreviewActive}
                    currentDay={visibleDay}
                    dayNumbers={dayNumbers}
                    disabled={Boolean(movingPlaceId) || isSavingPlace || recommendationPreview.status === "saving"}
                    isMoving={movingPlaceId === place.id}
                    key={place.id ?? place.previewId ?? `${place.time}-${place.label}`}
                    onCancelRecommendationPreviewPlace={cancelRecommendationPreviewPlace}
                    onDelete={requestDeletePlace}
                    onEdit={openEditPlace}
                    onMove={movePlaceTo}
                    onSelectRecommendationPreviewPlace={selectRecommendationPreviewMapPlace}
                    onSaveRecommendationPreviewPlace={(previewId) => void saveRecommendationPreviewPlace(previewId)}
                    place={place}
                    placeNumber={index + 1}
                    places={dayPlaces}
                    trip={trip}
                  />
                ))}
              </SortableContext>
            </div>
          </>
        )}
      </DndContext>
      {placeError && !placeEditor && <Toast>{placeError}</Toast>}
      {moveError && <Toast>{moveError}</Toast>}
      {notice && <Toast>{notice}</Toast>}
      {placeEditor && (
        <PlaceEditorSheet
          error={placeError}
          form={placeForm}
          isLoadingSearch={isLoadingPlaceSearch}
          isSaving={isSavingPlace}
          mode={placeEditor.mode}
          onChange={updatePlaceForm}
          onClose={closePlaceEditor}
          onDiscardDraft={discardPlaceDraft}
          onSearchChange={updatePlaceSearchQuery}
          onSelectSearchCandidate={selectPlaceSearchCandidate}
          onSubmit={submitPlaceEditor}
          preview={placePreview}
          saveEligibility={placeSaveEligibility}
          searchCandidates={placeSearchResults}
          searchError={placeSearchError}
          searchQuery={placeSearchQuery}
          restoredDraftMessage={placeDraftNotice}
        />
      )}
      {placeDetail && (
        <PlaceDetailDialog
          dayNumber={placeDetail.dayNumber}
          onClose={() => setPlaceDetail(null)}
          place={placeDetail.place}
        />
      )}
      <ConfirmDialog
        open={replacePreviewConfirmOpen}
        title="추천 일정으로 바꿀까요?"
        body={hasSavedPlaces ? "기존 일정은 삭제되고, 남아있는 추천 후보 전체가 저장됩니다." : "남아있는 추천 후보 전체가 일정으로 저장됩니다."}
        error={recommendationPreview.error}
        confirmLabel="저장"
        isSubmitting={recommendationPreview.status === "saving"}
        onCancel={() => setReplacePreviewConfirmOpen(false)}
        onConfirm={() => {
          setReplacePreviewConfirmOpen(false);
          setReplacePreviewFinalizeOpen(true);
        }}
      />
      <ConfirmDialog
        open={replacePreviewFinalizeOpen}
        title="전체 저장을 확정할까요?"
        body={hasSavedPlaces ? "기존 일정을 삭제하고 남아있는 추천 후보 전체를 저장합니다. 확정하면 되돌릴 수 없어요." : "남아있는 추천 후보 전체를 일정으로 저장합니다."}
        error={recommendationPreview.error}
        confirmLabel="확정"
        isSubmitting={recommendationPreview.status === "saving"}
        onCancel={() => setReplacePreviewFinalizeOpen(false)}
        onConfirm={() => void saveRecommendationPreview({ replaceExisting: true })}
      />
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

function PrototypeTripMap({
  dayNumber,
  onSelectPlace,
  onShowPlaceDetail,
  places,
  selectedPlaceId,
}: {
  dayNumber: number;
  onSelectPlace: (placeId: string | null) => void;
  onShowPlaceDetail: (place: ItineraryPlace) => void;
  places: DisplayedPlace[];
  selectedPlaceId: string | null;
}) {
  const selectedPlace = places.find((place, index) => mapPlaceId(place, index) === selectedPlaceId && !place.isRecommendationPreview) ?? null;
  const mapPlaces = places.map((place, index) => ({
    place,
    index,
    point: getPlaceMapPoint(index, dayNumber),
  }));
  const routePoints = mapPlaces.map(({ point }) => `${point.x},${point.y}`).join(" ");
  const markers: KakaoMapMarker[] = places.map((place, index) => ({
    id: mapPlaceId(place, index),
    label: place.label,
    subtitle: place.address || place.meta,
    latitude: place.latitude,
    longitude: place.longitude,
    query: place.address || place.label,
  }));

  if (places.length === 0) {
    return (
      <div className="prototype-map-wrap">
        <div className="prototype-map-empty">
          <MapIcon size={28} />
          <strong>아직 표시할 장소가 없어요</strong>
          <p>장소 추가 버튼으로 방문지를 일정에 저장해 보세요.</p>
        </div>
      </div>
    );
  }

  const fallbackMap = (
    <div className="prototype-full-map" onMouseDown={() => onSelectPlace(null)}>
        <svg className="prototype-map-terrain" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 8,22 Q 30,5 55,15 T 95,30 L 95,75 Q 70,90 40,82 Q 12,78 5,55 Z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.45)" strokeWidth=".3" />
          <path d="M 8,42 Q 35,46 55,42 T 95,55" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".7" strokeDasharray="1.5,1" />
          <path d="M 25,15 Q 30,40 35,60 T 50,90" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".55" strokeDasharray="1,1" />
          <circle cx="50" cy="50" r="3" fill="rgba(255,255,255,.5)" />
          <text x="50" y="46" textAnchor="middle" fontSize="2.5" fill="rgba(255,255,255,.85)" fontWeight="700">
            중심지
          </text>
          {mapPlaces.length > 1 && <polyline points={routePoints} fill="none" stroke="#ff5e5b" strokeWidth=".9" strokeDasharray="2.5,1.5" opacity=".85" />}
        </svg>
        <div className="prototype-map-controls" aria-label="지도 컨트롤">
          <button aria-label="확대" type="button">＋</button>
          <button aria-label="축소" type="button">−</button>
          <button aria-label="전체 보기" type="button">🧭</button>
        </div>
        {mapPlaces.map(({ index, place, point }) => {
          const markerId = mapPlaceId(place, index);
          const selected = markerId === selectedPlaceId;
          return (
            <button
              aria-label={`${index + 1}번 장소: ${place.label}`}
              className={selected ? "prototype-map-pin selected" : "prototype-map-pin"}
              key={markerId}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => onSelectPlace(selected ? null : markerId)}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              type="button"
            >
              <span className="prototype-map-pin-dot">{index + 1}</span>
              <span className="prototype-map-pin-label">{place.label}</span>
            </button>
          );
        })}
      </div>
  );

  return (
    <div className="prototype-map-wrap">
      <KakaoMapView
        ariaLabel={`Day ${dayNumber} 지도`}
        fallback={fallbackMap}
        markers={markers}
        onSelectMarker={(markerId) => onSelectPlace(markerId)}
        selectedMarkerId={selectedPlaceId}
      />
      {selectedPlace && (
        <PlaceMapBottomSheet
          onClose={() => onSelectPlace(null)}
          onShowPlaceDetail={onShowPlaceDetail}
          place={selectedPlace}
        />
      )}
      <div className="prototype-map-caption">
        <span>Day {dayNumber} · <strong>{places.length}곳</strong></span>
        <span>핀을 탭하면 상세가 나타나요</span>
      </div>
    </div>
  );
}

function mapPlaceId(place: DisplayedPlace, index: number): string {
  return place.id ?? place.previewId ?? `${place.label}-${index}`;
}

function PlaceMapBottomSheet({
  onClose,
  onShowPlaceDetail,
  place,
}: {
  onClose: () => void;
  onShowPlaceDetail: (place: ItineraryPlace) => void;
  place: ItineraryPlace;
}) {
  const kakaoSearchUrl = place.placeUrl || `https://map.kakao.com/link/search/${encodeURIComponent(place.label)}`;
  const detailText = place.address || place.meta || "상세 메모가 아직 없어요.";

  return (
    <section className="place-map-bottom-sheet" aria-label={`${place.label} 지도 상세`} role="dialog" onMouseDown={(event) => event.stopPropagation()}>
      <div className="place-map-sheet-main">
        <div className="place-map-sheet-icon" aria-hidden="true">{getPlaceEmoji(place)}</div>
        <div>
          <div className="place-map-sheet-tags">
            {place.time && <span>{place.time}</span>}
            <em>Day 장소</em>
          </div>
          <strong>{place.label}</strong>
          <p>{detailText}</p>
        </div>
        <button aria-label="지도 장소 상세 닫기" className="place-map-sheet-close" onClick={onClose} type="button">
          <X size={14} />
        </button>
      </div>
      <div className="place-map-sheet-actions">
        <a href={kakaoSearchUrl} rel="noreferrer" target="_blank">
          <Car size={14} />
          길찾기
        </a>
        <button onClick={() => onShowPlaceDetail(place)} type="button">
          <Info size={14} />
          상세 보기
        </button>
      </div>
    </section>
  );
}

function PlaceDetailDialog({
  dayNumber,
  onClose,
  place,
}: {
  dayNumber: number;
  onClose: () => void;
  place: ItineraryPlace;
}) {
  const titleId = "place-detail-title";
  const detailText = place.meta || "메모가 아직 없어요.";
  const addressText = place.address || "주소 정보 없음";
  const categoryText = place.category || place.categoryCode || "장소";
  const coordinateText = Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    ? `${place.latitude}, ${place.longitude}`
    : "좌표 정보 없음";
  const kakaoPlaceUrl = place.placeUrl || `https://map.kakao.com/link/search/${encodeURIComponent(place.address || place.label)}`;

  return (
    <div className="sheet-backdrop place-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="trip-select-sheet place-detail-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <h2 id={titleId}>{place.label} 장소 상세</h2>
            <p className="meta">Day {dayNumber} 지도에서 선택한 장소</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="place-detail-summary" aria-label="장소 요약">
          <span>Day {dayNumber}</span>
          {place.time && <span>{place.time}</span>}
          <span>{categoryText}</span>
        </div>
        <div className="place-detail-fields">
          <section>
            <strong>주소</strong>
            <p>{addressText}</p>
          </section>
          <section>
            <strong>메모</strong>
            <p>{detailText}</p>
          </section>
          <section>
            <strong>좌표</strong>
            <p>{coordinateText}</p>
          </section>
        </div>
        <a className="btn primary" href={kakaoPlaceUrl} rel="noreferrer" target="_blank">
          카카오맵에서 보기
        </a>
      </section>
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
  onCancelRecommendationPreviewPlace,
  onDelete,
  onEdit,
  onMove,
  onSaveRecommendationPreviewPlace,
  onSelectRecommendationPreviewPlace,
  place,
  placeNumber,
  places,
  trip,
}: {
  canEditTrip: boolean;
  currentDay: number;
  dayNumbers: number[];
  disabled: boolean;
  isMoving: boolean;
  onCancelRecommendationPreviewPlace: (previewId: string) => void;
  onDelete: (place: ItineraryPlace) => void;
  onEdit: (place: ItineraryPlace) => void;
  onMove: (place: ItineraryPlace, dayNumber: number, position: number) => Promise<void>;
  onSaveRecommendationPreviewPlace: (previewId: string) => void;
  onSelectRecommendationPreviewPlace: (previewId: string) => void;
  place: DisplayedPlace;
  placeNumber: number;
  places: ItineraryPlace[];
  trip: Trip;
}) {
  const sortableId = place.id ? placeDragId(place.id) : `missing:${place.time}-${place.label}`;
  const isRecommendationPreviewPlace = Boolean(place.isRecommendationPreview && place.previewId);
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: sortableId,
    disabled: isRecommendationPreviewPlace || !canEditTrip || !place.id || disabled,
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
      <div className="timeline-marker" aria-hidden="true">
        <span>{placeNumber}</span>
      </div>
      <article className={isRecommendationPreviewPlace ? "place-detail recommendation-preview-place" : "place-detail"}>
        {canEditTrip && place.id && !isRecommendationPreviewPlace && (
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
          </button>
        )}
        {isRecommendationPreviewPlace && place.previewId ? (
          <button
            className="place-copy recommendation-preview-place-select"
            type="button"
            aria-label={`${place.label} 지도에서 보기`}
            onClick={() => onSelectRecommendationPreviewPlace(place.previewId!)}
            disabled={disabled}
          >
            <div className="place-prototype-meta">
              {place.time && <span>{place.time}</span>}
              <em aria-hidden="true">{getPlaceEmoji(place)}</em>
              <span className="preview-candidate-index">추천 후보</span>
            </div>
            <h4>{place.label}</h4>
            <div className="meta">{place.meta}</div>
          </button>
        ) : (
          <div className="place-copy">
            <div className="place-prototype-meta">
              {place.time && <span>{place.time}</span>}
              <em aria-hidden="true">{getPlaceEmoji(place)}</em>
            </div>
            <h4>{place.label}</h4>
            <div className="meta">{place.meta}</div>
          </div>
        )}
        {isMoving && <span className="place-moving-badge">이동 중</span>}
        {isRecommendationPreviewPlace && place.previewId ? (
          <div className="place-actions recommendation-preview-place-actions">
            <button
              className="btn sm primary"
              type="button"
              aria-label={`${place.label} 미리보기 저장`}
              onClick={(event) => {
                event.stopPropagation();
                onSaveRecommendationPreviewPlace(place.previewId!);
              }}
              disabled={disabled}
            >
              저장
            </button>
            <button
              className="btn sm line"
              type="button"
              aria-label={`${place.label} 미리보기 취소`}
              onClick={(event) => {
                event.stopPropagation();
                onCancelRecommendationPreviewPlace(place.previewId!);
              }}
              disabled={disabled}
            >
              취소
            </button>
          </div>
        ) : canEditTrip ? (
          <div className="place-actions">
            <button className="btn sm ghost" type="button" onClick={() => onEdit(place)} disabled={!place.id || disabled}>
              수정
            </button>
            <button className="btn sm line" type="button" onClick={() => onDelete(place)} disabled={!place.id || disabled || isMoving}>
              삭제
            </button>
          </div>
        ) : null}
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

function PlacePreviewMapCard({
  preview,
  saveEligibility,
}: {
  preview: PlacePreviewState;
  saveEligibility: PlaceSaveEligibility;
}) {
  const place = preview.place;
  const marker = place ? placePreviewMarker(place) : null;
  const helperText =
    saveEligibility === "requiresExplicitCandidate"
      ? "검색 결과를 지도에 미리 표시했어요. 저장하려면 후보를 직접 선택해 주세요."
      : saveEligibility === "saveSelected"
        ? "저장할 장소로 선택되어 있어요."
        : saveEligibility === "manualAllowed"
          ? "검색 결과가 없어도 장소명을 직접 입력해 저장할 수 있어요."
          : "장소를 검색하면 지도에 표시돼요.";
  const fallback = (
    <div className={place ? "place-preview-fallback has-place" : "place-preview-fallback"}>
      <MapIcon size={18} aria-hidden="true" />
      <div>
        <strong>{place?.label || "장소를 검색하면 지도에 표시돼요"}</strong>
        <span>{place?.address || place?.meta || "추천 장소나 검색 후보가 여기에 미리 표시됩니다."}</span>
      </div>
    </div>
  );

  return (
    <section className="place-preview-map-card" aria-label="장소 지도 미리보기">
      <div className="place-preview-map-head">
        <div>
          <span className="eyebrow">지도 미리보기</span>
          <h3>{place?.label || "선택할 장소 확인"}</h3>
        </div>
        <span className={saveEligibility === "saveSelected" || saveEligibility === "manualAllowed" ? "place-preview-state ready" : "place-preview-state"}>
          {saveEligibility === "saveSelected" ? "저장 가능" : saveEligibility === "manualAllowed" ? "직접 입력" : "확인 필요"}
        </span>
      </div>
      {marker ? (
        <KakaoMapView
          ariaLabel={`${place?.label ?? "장소"} 지도 미리보기`}
          fallback={fallback}
          markers={[marker]}
          onSelectMarker={() => undefined}
          selectedMarkerId={marker.id}
        />
      ) : (
        fallback
      )}
      {place && (
        <div className="place-preview-details">
          <strong>{place.label}</strong>
          <span>{place.address || place.meta || "장소 정보 확인"}</span>
        </div>
      )}
      <p className="place-preview-helper">{helperText}</p>
    </section>
  );
}

function PlaceEditorSheet({
  error,
  form,
  isLoadingSearch,
  isSaving,
  mode,
  onChange,
  onClose,
  onDiscardDraft,
  onSearchChange,
  onSelectSearchCandidate,
  onSubmit,
  preview,
  saveEligibility,
  searchCandidates,
  searchError,
  searchQuery,
  restoredDraftMessage,
}: {
  error: string;
  form: TripPlaceRequest;
  isLoadingSearch: boolean;
  isSaving: boolean;
  mode: "add" | "edit";
  onChange: (form: TripPlaceRequest) => void;
  onClose: () => void;
  onDiscardDraft: () => void;
  onSearchChange: (query: string) => void;
  onSelectSearchCandidate: (candidate: PlaceSearchCandidate) => void;
  onSubmit: () => void;
  preview: PlacePreviewState;
  saveEligibility: PlaceSaveEligibility;
  searchCandidates: PlaceSearchCandidate[];
  searchError: string;
  searchQuery: string;
  restoredDraftMessage: string;
}) {
  const showEmptySearch = mode === "add" && searchQuery.trim() && !isLoadingSearch && searchCandidates.length === 0;
  const showBlankManualRecovery = mode === "add" && !searchQuery.trim() && saveEligibility === "manualAllowed" && searchCandidates.length === 0 && !isLoadingSearch;
  const showManualPlaceName = mode === "edit" || showEmptySearch || showBlankManualRecovery || (mode === "add" && Boolean(form.label) && searchCandidates.length === 0 && !isLoadingSearch);
  const updateManualPlaceName = (label: string) => {
    onChange({ time: form.time ?? "", label, meta: form.meta ?? "" });
  };
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="trip-select-sheet" role="dialog" aria-modal="true" aria-labelledby="place-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2 id="place-editor-title">{mode === "add" ? "장소 추가" : "장소 수정"}</h2>
            <p className="meta">{mode === "add" ? "장소를 검색해 선택하거나 직접 입력한 뒤 방문 시간과 메모를 저장하세요." : "장소명, 방문 시간, 메모를 수정하세요."}</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose} disabled={isSaving}>
            닫기
          </button>
        </div>
        <div className="form place-editor-form">
          {restoredDraftMessage && <DraftRestoreNotice message={restoredDraftMessage} onDiscard={onDiscardDraft} />}
          {mode === "add" && (
            <div className="place-search-panel">
              <label className="field">
                장소 검색
                <input
                  name="place-search"
                  placeholder="장소명이나 주소 검색"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </label>
              {isLoadingSearch && <p className="place-search-status">장소 검색 결과를 불러오는 중입니다.</p>}
              {searchError && <p className="place-search-status error">{searchError}</p>}
              {searchCandidates.length > 0 && (
                <div className="place-search-results" role="list" aria-label="장소 검색 결과">
                  {searchCandidates.map((candidate, index) => (
                    <button
                      aria-label={`${candidate.title} 선택`}
                      className="place-search-result"
                      key={candidate.id ?? candidate.externalPlaceId ?? `${candidate.title}:${index}`}
                      type="button"
                      onClick={() => onSelectSearchCandidate(candidate)}
                    >
                      <span>
                        <strong>{candidate.title}</strong>
                        <em>{candidate.categoryName ?? "장소"}</em>
                      </span>
                      <small>{candidate.address ?? candidate.meta}</small>
                    </button>
                  ))}
                </div>
              )}
              {form.label && (
                <div className="place-selected-summary" aria-label="선택한 장소">
                  <strong>{form.label}</strong>
                  <span>{form.meta || "장소 정보 확인"}</span>
                </div>
              )}
              {showEmptySearch && <p className="place-search-status">검색 결과가 없어요. 장소명을 직접 입력해 저장할 수 있어요.</p>}
            </div>
          )}
          {mode === "add" && <PlacePreviewMapCard preview={preview} saveEligibility={saveEligibility} />}
          <PlaceTimePicker disabled={isSaving} value={form.time ?? ""} onChange={(time) => onChange({ ...form, time })} />
          <input type="hidden" name="place-time" value={form.time ?? ""} readOnly />
          {showManualPlaceName ? (
            <label className="field">
              장소명
              <input
                name="place-label"
                placeholder="성산일출봉"
                value={form.label}
                onChange={(event) => updateManualPlaceName(event.target.value)}
              />
            </label>
          ) : (
            <input type="hidden" name="place-label" value={form.label} readOnly />
          )}
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
