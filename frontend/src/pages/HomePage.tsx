import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { appDataApi } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { ItineraryCard, PlaceCard, PolicyMiniCard } from "../components/cards";
import { ErrorState, LoadingState } from "../components/ui";
import { dday } from "../utils";

export function HomePage() {
  const { currentUser, profile, addedPolicy } = useSession();
  const previewUser = appDataApi.getPreviewUser();
  const { data: policies, error: policiesError, isLoading: policiesLoading } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const { data: trips, error: tripsError, isLoading: tripsLoading } = useAsyncResource(() => appDataApi.listTrips(), []);
  const name = currentUser?.name ?? previewUser.name;
  const featuredPolicy = policies?.[0];
  const featuredTrip = trips?.[0];

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
        <h2>어디로 떠나볼까요, {name}님</h2>
        <p>여행에서 받을 수 있는 혜택을 먼저 확인해보세요.</p>
      </div>
      {policiesLoading && <LoadingState label="추천 혜택을 불러오는 중입니다" />}
      {policiesError && <ErrorState message={policiesError} />}
      {featuredPolicy && (
        <Link className="promo" to={`/policies/${featuredPolicy.slug}`}>
          <div>
            <div className="kicker">내 일정에 맞는 추천 정책</div>
            <strong>{featuredPolicy.amount}</strong>
          </div>
          <div>
            <span>
              {featuredPolicy.title} · {featuredPolicy.region} · {dday(featuredPolicy.deadline)}
            </span>
            <span className="promo-cta">지금 확인하기</span>
          </div>
        </Link>
      )}
      <div className="section-title">
        <h3>받을 수 있는 혜택</h3>
        <Link to="/policies">전체 보기</Link>
      </div>
      <div className="h-scroll" aria-label="추천 정책 목록">
        {(policies ?? []).map((policy) => (
          <PolicyMiniCard key={policy.id} policy={policy} />
        ))}
      </div>
      <div className="section-title">
        <h3>인기 국내 여행지</h3>
        <Link to="/trips/new">
          <Plus size={16} /> 일정 만들기
        </Link>
      </div>
      <div className="h-scroll" aria-label="인기 여행지 목록">
        <PlaceCard title="제주" meta="혜택 2건 · 매칭 98%" className="jeju" />
        <PlaceCard title="부산" meta="맛집 중심 · 캐시백" className="busan" />
        <PlaceCard title="강원" meta="숙박 할인 · 자연" className="gangwon" />
      </div>
      <div className="section-title">
        <h3>AI 추천 일정</h3>
        <Link to="/trips">내 일정</Link>
      </div>
      {tripsLoading && <LoadingState label="추천 일정을 불러오는 중입니다" />}
      {tripsError && <ErrorState message={tripsError} />}
      {featuredTrip && <ItineraryCard trip={featuredTrip} addedPolicy={addedPolicy} />}
    </section>
  );
}
