import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Policy, Trip } from "../api/types";
import { dday } from "../utils";
import { Tag } from "./ui";

export function PolicyMiniCard({ policy }: { policy: Policy }) {
  return (
    <Link className="policy-mini card" to={`/policies/${policy.slug}`}>
      <div className="visual-tile">{policy.label}</div>
      <Tag>{policy.tag}</Tag>
      <h4>{policy.title}</h4>
      <div className="meta">
        {policy.region} 쨌 {dday(policy.deadline)} 쨌 留ㅼ묶 {policy.match}%
      </div>
    </Link>
  );
}

export function PolicyListCard({ policy }: { policy: Policy }) {
  return (
    <Link className="list-card card" to={`/policies/${policy.slug}`}>
      <div className="thumb-row">
        <div className="square-thumb">{policy.label}</div>
        <div>
          <div className="between">
            <Tag>{policy.tag}</Tag>
            <Tag tone="warning">{dday(policy.deadline)}</Tag>
          </div>
          <h3>{policy.title}</h3>
          <div className="meta">
            {policy.org} 쨌 {policy.region} 쨌 留ㅼ묶 {policy.match}%
          </div>
        </div>
      </div>
      <p className="meta">{policy.summary}</p>
    </Link>
  );
}

export function PlaceCard({ title, meta, className }: { title: string; meta: string; className: string }) {
  return (
    <Link className={`place-card ${className}`} to={`/trips/new?region=${encodeURIComponent(title)}`}>
      <h4>{title}</h4>
      <div className="meta">{meta}</div>
    </Link>
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

  return (
    <article className="itinerary-card card">
      <Link className="map-thumb" to={detailPath} aria-label={`${trip.title} ?곸꽭 蹂닿린`} />
      <div className="itinerary-body">
        <div className="itinerary-head">
          <Link className="itinerary-title-link" to={detailPath}>
            <h4>{trip.title}</h4>
          </Link>
          <div className="itinerary-actions">
            <Tag tone={trip.status === "confirmed" ? "primary" : "warning"}>{trip.status === "confirmed" ? "\uD655\uC815\uB428" : "\uC791\uC131 \uC911"}</Tag>
            <Tag tone="warning">?덉긽 ?덇컧 {trip.expectedSaving}</Tag>
            {onDelete && (
              <button className="trip-delete-btn" disabled={isDeleting} onClick={() => onDelete(trip)} type="button">
                {isDeleting ? "\uC0AD\uC81C \uC911" : "\uC0AD\uC81C"}
              </button>
            )}
          </div>
        </div>
        <Link to={detailPath}>
          <div className="meta">
            {trip.people.length} people · policy {addedPolicy ? "connected" : "2 candidates"}
          </div>
        </Link>
        {canConfirm && (
          <div className="trip-confirm-panel">
            <label className="trip-confirm-check">
              <input checked={isConfirmSelected} disabled={isConfirmingStatus} onChange={(event) => setIsConfirmSelected(event.target.checked)} type="checkbox" />
              <span>\uC77C\uC815 \uD655\uC815</span>
            </label>
            <button className="btn sm line" disabled={!isConfirmSelected || isConfirmingStatus} onClick={() => onConfirmStatus?.(trip)} type="button">
              {isConfirmingStatus ? "\uC800\uC7A5 \uC911" : "\uC800\uC7A5"}
            </button>
            {confirmStatusError && <div className="warning-text full-row">{confirmStatusError}</div>}
          </div>
        )}
      </div>
      <Link className="card-arrow" to={detailPath} aria-label={`${trip.title} ?곸꽭 蹂닿린`}>
        <ChevronRight size={18} />
      </Link>
    </article>
  );
}
