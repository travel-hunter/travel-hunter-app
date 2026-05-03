import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useSession } from "../app/session";
import { ItineraryCard, PlaceCard, PolicyMiniCard } from "../components/cards";
import { policies, user } from "../data/prototypeData";
import { dday } from "../utils";

export function HomePage() {
  const { currentUser, profile, addedPolicy } = useSession();
  const name = currentUser?.name ?? user.name;

  return (
    <section className="screen with-tabs">
      <div className="top-search">
        <Link className="search-pill" to="/policies">
          <Search size={18} />
          지역, 혜택, 일정 검색
        </Link>
        <Link className="avatar" to="/mypage">
          {name[0]}
        </Link>
      </div>
      <div className="greeting">
        <h2>안녕하세요, {name}님</h2>
        <p>{profile.region} 여행에서 받을 수 있는 혜택을 먼저 모아봤어요.</p>
      </div>
      <Link className="promo" to="/policies/local-vacation">
        <div>
          <div className="kicker">이번 주 추천 정책</div>
          <strong>{policies[0].amount}</strong>
        </div>
        <div>
          <span>
            {policies[0].title} · {policies[0].region} · {dday(policies[0].deadline)}
          </span>
          <span className="promo-cta">지금 확인하기</span>
        </div>
      </Link>
      <div className="section-title">
        <h3>이번 주 혜택</h3>
        <Link to="/policies">전체 보기</Link>
      </div>
      <div className="h-scroll" aria-label="policy cards">
        {policies.map((policy) => (
          <PolicyMiniCard key={policy.id} policy={policy} />
        ))}
      </div>
      <div className="section-title">
        <h3>인기 국내 여행지</h3>
        <Link to="/trips/new">
          <Plus size={16} /> 일정 만들기
        </Link>
      </div>
      <div className="h-scroll" aria-label="place cards">
        <PlaceCard title="제주" meta="혜택 2건 · 매칭 98%" className="jeju" />
        <PlaceCard title="부산" meta="맛집 중심 · 캐시백" className="busan" />
        <PlaceCard title="강원" meta="숙박 할인 · 자연" className="gangwon" />
      </div>
      <div className="section-title">
        <h3>AI 추천 일정</h3>
        <Link to="/trips">내 일정</Link>
      </div>
      <ItineraryCard addedPolicy={addedPolicy} />
    </section>
  );
}
