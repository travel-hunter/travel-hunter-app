import { Heart, Share2, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { appDataApi } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { PolicyListCard } from "../components/cards";
import { Button, EmptyState, ErrorState, IconButton, LoadingState, Tag, Toast, TopBar } from "../components/ui";
import { dday } from "../utils";

const filters = ["추천", "환급", "숙박", "캐시백", "마감임박"] as const;

export function PolicyListPage() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("추천");
  const { data: policies, error, isLoading } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const visiblePolicies = useMemo(() => {
    if (!policies) return [];
    if (activeFilter === "추천") return policies;
    if (activeFilter === "마감임박") return policies.filter((policy) => dday(policy.deadline) !== "마감");
    return policies.filter((policy) => policy.category === activeFilter);
  }, [activeFilter, policies]);

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
      {isLoading && <LoadingState label="정책을 불러오는 중입니다" />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && visiblePolicies.length === 0 && (
        <EmptyState title="조건에 맞는 정책이 아직 없어요" body="다른 필터를 선택해 받을 수 있는 혜택을 확인해보세요." action={<Button onClick={() => setActiveFilter("추천")}>추천 정책 보기</Button>} />
      )}
      {!isLoading && !error && visiblePolicies.length > 0 && (
        <div className="list">
          {visiblePolicies.map((policy) => (
            <PolicyListCard key={policy.id} policy={policy} />
          ))}
        </div>
      )}
    </section>
  );
}

export function PolicyDetailPage() {
  const { policyId } = useParams();
  const { addedPolicy, addPolicy, likedPolicy, togglePolicyLike } = useSession();
  const { data: policy, error, isLoading } = useAsyncResource(() => appDataApi.getPolicy(policyId), [policyId]);
  const [notice, setNotice] = useState<string | null>(null);

  const addToTrip = () => {
    addPolicy();
    setNotice("일정에 혜택을 담았어요. 제주 3일 여행에서 바로 확인할 수 있습니다.");
  };

  const showApplicationNotice = () => {
    setNotice("공식 신청 연결은 준비 중입니다. 필요한 서류와 신청 기간을 먼저 확인해주세요.");
  };

  if (isLoading) {
    return (
      <section className="screen detail">
        <div className="detail-body">
          <LoadingState label="정책 상세를 불러오는 중입니다" />
        </div>
      </section>
    );
  }

  if (error || !policy) {
    return (
      <section className="screen detail">
        <div className="detail-body">
          <ErrorState message={error ?? "정책 정보를 찾지 못했어요."} />
        </div>
      </section>
    );
  }

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
          <Button full variant="ghost" onClick={showApplicationNotice}>
            공식 안내 확인하기
          </Button>
        </section>
        {notice && <Toast>{notice}</Toast>}
      </div>
      <div className="sticky-cta">
        <Button variant="secondary" onClick={addToTrip}>
          {addedPolicy ? "일정에 담김" : "내 일정에 담기"}
        </Button>
        <Button onClick={showApplicationNotice}>혜택 받으러 가기</Button>
      </div>
    </section>
  );
}
