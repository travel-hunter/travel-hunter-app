import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { itinerary, Policy } from "../data/prototypeData";
import { dday } from "../utils";
import { Tag } from "./ui";

export function PolicyMiniCard({ policy }: { policy: Policy }) {
  return (
    <Link className="policy-mini card" to={`/policies/${policy.id}`}>
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
    <Link className="list-card card" to={`/policies/${policy.id}`}>
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
    <Link className={`place-card ${className}`} to="/trips/jeju-3-days">
      <h4>{title}</h4>
      <div className="meta">{meta}</div>
    </Link>
  );
}

export function ItineraryCard({ addedPolicy = false }: { addedPolicy?: boolean }) {
  return (
    <Link className="itinerary-card card" to="/trips/jeju-3-days">
      <div className="map-thumb" />
      <div className="itinerary-body">
        <div className="between">
          <h4>{itinerary.title}</h4>
          <Tag tone="warning">예상 절감 {itinerary.expectedSaving}</Tag>
        </div>
        <div className="meta">
          2박 3일 · {itinerary.people.length}명 · 정책 {addedPolicy ? "연결됨" : "2건 후보"}
        </div>
      </div>
      <ChevronRight size={18} className="card-arrow" />
    </Link>
  );
}
