import { ChevronRight, Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Policy, Trip } from "../api";
import { getTripRegionEmojiFromTitle } from "../data/displayConfig";
import { dday } from "../utils";
import { canUsePolicyActions } from "../utils/policyCapabilities";
import { Tag } from "./ui";

function policyIcon(policy: Policy) {
  const text = `${policy.title} ${policy.tag} ${policy.amount}`;
  if (text.includes("숙박") || text.includes("호텔")) return "🏨";
  if (text.includes("캐시백") || text.includes("포인트") || text.includes("적립")) return "🎁";
  if (text.includes("교통") || text.includes("KTX") || text.includes("기차")) return "🚆";
  if (text.includes("지역사랑") || text.includes("휴가")) return "💴";
  return "🏖️";
}

function policyIconTone(policy: Policy) {
  const text = `${policy.title} ${policy.tag} ${policy.amount}`;
  if (text.includes("숙박") || text.includes("호텔")) return "rose";
  if (text.includes("캐시백") || text.includes("포인트") || text.includes("적립")) return "mint";
  if (text.includes("교통") || text.includes("KTX") || text.includes("기차")) return "blue";
  if (text.includes("지역사랑") || text.includes("휴가")) return "peach";
  return "sky";
}

function compactDeadline(deadline: string) {
  return `~${deadline.split("-").join(".")}`;
}

function tripRegionEmoji(trip: Trip) {
  return getTripRegionEmojiFromTitle(trip.title);
}

export function PolicyListCard({
  policy,
  isSaved = false,
  onToggleSave,
}: {
  policy: Policy;
  isSaved?: boolean;
  onToggleSave?: (policy: Policy) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (isSaving || !onToggleSave) return;
    setIsSaving(true);
    try {
      await onToggleSave(policy);
    } finally {
      setIsSaving(false);
    }
  };
  const canSave = canUsePolicyActions(policy) && Boolean(onToggleSave);

  return (
    <article className="policy-list-card card">
      <Link className="policy-list-card-link" to={`/policies/${policy.slug}`}>
        <div className={`policy-list-icon ${policyIconTone(policy)}`}>{policyIcon(policy)}</div>
        <div className="policy-list-copy">
          <div className="policy-list-taxonomy">
            <span>{policy.category}</span>
          </div>
          <div className="policy-list-badges">
            <span>{policy.amount}</span>
            <em>{dday(policy.deadline)}</em>
          </div>
          <h3>{policy.title}</h3>
          <div className="policy-list-meta">
            <span aria-hidden="true">📍</span>
            {policy.region} · {compactDeadline(policy.deadline)}
          </div>
        </div>
      </Link>
      {canSave && (
        <button
          className={isSaved ? "policy-list-heart saved" : "policy-list-heart"}
          disabled={isSaving}
          onClick={handleToggle}
          type="button"
          aria-label={isSaved ? `${policy.title} 즐겨찾기 해제` : `${policy.title} 즐겨찾기`}
          aria-pressed={isSaved}
        >
          <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
        </button>
      )}
    </article>
  );
}

export function ItineraryCard({
  trip,
  addedPolicy = false,
  confirmStatusError = "",
  isConfirmingStatus = false,
  isDeleting = false,
  onConfirmStatus,
  onDelete,
}: {
  trip: Trip;
  addedPolicy?: boolean;
  confirmStatusError?: string;
  isConfirmingStatus?: boolean;
  isDeleting?: boolean;
  onConfirmStatus?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
}) {
  const detailPath = `/trips/${trip.id}`;
  const [isConfirmSelected, setIsConfirmSelected] = useState(false);
  const canConfirm = trip.status === "draft" && trip.currentUserRole !== "viewer" && Boolean(onConfirmStatus);
  const totalPlaces = Object.values(trip.days).reduce((sum, places) => sum + places.length, 0);
  const dayCount = Object.keys(trip.days).length || 1;

  return (
    <article className="itinerary-card card">
      <Link className="map-thumb" to={detailPath} aria-label={`${trip.title} 상세 보기`}>
        <span className="trip-dday-chip">{trip.status === "confirmed" ? "확정" : "작성 중"}</span>
        <span className="trip-visual-emoji" aria-hidden="true">
          {tripRegionEmoji(trip)}
        </span>
      </Link>
      <div className="itinerary-body">
        <div className="itinerary-head">
          <Link className="itinerary-title-link" to={detailPath}>
            <h4>{trip.title}</h4>
          </Link>
          <div className="itinerary-actions">
            {onDelete && (
              <button className="trip-delete-btn" disabled={isDeleting} onClick={() => onDelete(trip)} type="button">
                {isDeleting ? "삭제 중" : "삭제"}
              </button>
            )}
          </div>
        </div>
        <Link to={detailPath}>
          <div className="meta">
            📅 {trip.dates} · {dayCount}일 · 장소 {totalPlaces}개
          </div>
          <div className="meta">
            👥 {trip.people.length}명 참여 · {addedPolicy ? "정책 연결됨" : "추천 정책 확인 가능"}
          </div>
          <div className="itinerary-policy-row">
            <Tag tone="warning">예상 혜택 {trip.expectedSaving}</Tag>
            <Tag tone={trip.status === "confirmed" ? "primary" : "warning"}>{trip.status === "confirmed" ? "확정됨" : "작성 중"}</Tag>
          </div>
        </Link>
        {canConfirm && (
          <div className="trip-confirm-panel">
            <label className="trip-confirm-check">
              <input checked={isConfirmSelected} disabled={isConfirmingStatus} onChange={(event) => setIsConfirmSelected(event.target.checked)} type="checkbox" />
              <span>일정 확정</span>
            </label>
            <button className="btn sm line" disabled={!isConfirmSelected || isConfirmingStatus} onClick={() => onConfirmStatus?.(trip)} type="button">
              {isConfirmingStatus ? "저장 중" : "저장"}
            </button>
            {confirmStatusError && <div className="warning-text full-row">{confirmStatusError}</div>}
          </div>
        )}
      </div>
      <Link className="card-arrow" to={detailPath} aria-label={`${trip.title} 상세 보기`}>
        <ChevronRight size={18} />
      </Link>
    </article>
  );
}
