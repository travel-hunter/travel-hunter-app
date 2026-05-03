import { Heart, Share2, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSession } from "../app/session";
import { PolicyListCard } from "../components/cards";
import { Button, IconButton, LinkButton, Tag, TopBar } from "../components/ui";
import { getPolicy, policies } from "../data/prototypeData";
import { dday } from "../utils";

const filters = ["추천", "환급", "숙박", "캐시백", "마감임박"] as const;

export function PolicyListPage() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("추천");
  const visiblePolicies = useMemo(() => {
    if (activeFilter === "추천") return policies;
    if (activeFilter === "마감임박") return policies.filter((policy) => dday(policy.deadline) !== "마감");
    return policies.filter((policy) => policy.category === activeFilter);
  }, [activeFilter]);

  return (
    <section className="screen with-tabs">
      <TopBar
        title="정책 목록"
        left={
          <IconButton label="홈으로" to="/home">
            ‹
          </IconButton>
        }
        right={
          <button className="icon-btn" type="button" aria-label="필터">
            <SlidersHorizontal size={18} />
          </button>
        }
      />
      <div className="filter-row">
        {filters.map((filter) => (
          <button className={activeFilter === filter ? "filter-chip active" : "filter-chip"} key={filter} onClick={() => setActiveFilter(filter)} type="button">
            {filter}
          </button>
        ))}
      </div>
      <div className="list">
        {visiblePolicies.map((policy) => (
          <PolicyListCard key={policy.id} policy={policy} />
        ))}
      </div>
    </section>
  );
}

export function PolicyDetailPage() {
  const { policyId } = useParams();
  const { addedPolicy, addPolicy, likedPolicy, togglePolicyLike } = useSession();
  const policy = getPolicy(policyId);

  return (
    <section className="screen detail">
      <div className="hero">
        <div className="overlay-nav">
          <IconButton label="홈으로" to="/home">
            ‹
          </IconButton>
          <div className="row">
            <button className="icon-btn" onClick={togglePolicyLike} type="button" aria-label="저장">
              <Heart size={18} fill={likedPolicy ? "currentColor" : "none"} />
            </button>
            <IconButton label="공유" to="/friend-invite">
              <Share2 size={18} />
            </IconButton>
          </div>
        </div>
        <div className="hero-label">{policy.label}</div>
      </div>
      <div className="detail-body">
        <div className="title-block">
          <div className="row">
            <Tag>{policy.tag}</Tag>
            <Tag tone="warning">{dday(policy.deadline)} 마감</Tag>
          </div>
          <h1>{policy.title}</h1>
          <div className="meta">
            {policy.org} 주관 · {policy.region}
          </div>
        </div>
        <section className="section-block">
          <h3>지원 내용</h3>
          <div className="highlight-box">
            <div className="price">{policy.amount}</div>
            <div className="meta">숙박, 교통, 체험비 일부 환급 · 1인 1회 신청</div>
          </div>
        </section>
        <section className="section-block">
          <h3>신청 기간</h3>
          <div>2026.05.01 - 2026.10.31</div>
          <div className="warning-text">{dday(policy.deadline)} · 서둘러 신청하세요</div>
        </section>
        <section className="section-block">
          <h3>신청 대상</h3>
          <ul className="bullet-list">
            {policy.requirements.map((item) => (
              <li key={item}>
                <span className="bullet">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="section-block">
          <h3>필요 서류</h3>
          <div className="check-list">
            {policy.documents.map((document) => (
              <button className="check-item" key={document} type="button">
                <span className="checkbox" />
                <span>{document}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="section-block">
          <h3>관련 정보</h3>
          <Button full variant="ghost">
            공식 사이트 FAQ 보기
          </Button>
        </section>
      </div>
      <div className="sticky-cta">
        <Button variant="secondary" onClick={addPolicy}>
          {addedPolicy ? "추가됨" : "내 일정에 담기"}
        </Button>
        <LinkButton to="/trips/jeju-3-days">혜택 받으러 가기</LinkButton>
      </div>
    </section>
  );
}
