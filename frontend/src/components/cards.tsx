import { ChevronRight } from "lucide-react";
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
        {policy.region} · {dday(policy.deadline)} · 매칭 {policy.match}%
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
            {policy.org} · {policy.region} · 매칭 {policy.match}%
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

export function ItineraryCard({ trip, addedPolicy = false, isDeleting = false, onDelete }: { trip: Trip; addedPolicy?: boolean; isDeleting?: boolean; onDelete?: (trip: Trip) => void }) {
  const detailPath = `/trips/${trip.id}`;

  return (
    <article className="itinerary-card card">
      <Link className="map-thumb" to={detailPath} aria-label={`${trip.title} 상세 보기`} />
      <div className="itinerary-body">
        <div className="itinerary-head">
          <Link className="itinerary-title-link" to={detailPath}>
            <h4>{trip.title}</h4>
          </Link>
          <div className="itinerary-actions">
            <Tag tone="warning">예상 절감 {trip.expectedSaving}</Tag>
            {onDelete && (
              <button className="trip-delete-btn" disabled={isDeleting} onClick={() => onDelete(trip)} type="button">
                {isDeleting ? "삭제 중" : "삭제"}
              </button>
            )}
          </div>
        </div>
        <Link to={detailPath}>
          <div className="meta">
            2박 3일 · {trip.people.length}명 · 정책 {addedPolicy ? "연결됨" : "2건 후보"}
          </div>
        </Link>
      </div>
      <Link className="card-arrow" to={detailPath} aria-label={`${trip.title} 상세 보기`}>
        <ChevronRight size={18} />
      </Link>
    </article>
  );
}
