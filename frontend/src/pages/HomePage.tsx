import { Search } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { appDataApi, type Policy } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { ErrorState, LoadingState } from "../components/ui";
import {
  buildHomeDestinations,
  buildHomeDestinationsFromRegionRecommendations,
  getDeadlinePolicies,
  getFeaturedPolicy,
  getHomePolicyIcon,
} from "../data/displayConfig";
import { dday } from "../utils";

export function HomePage() {
  const { currentUser, profile } = useSession();
  const previewUser = appDataApi.getPreviewUser();
  const { data: policies, error: policiesError, isLoading: policiesLoading } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const { data: trips, error: tripsError, isLoading: tripsLoading } = useAsyncResource(() => appDataApi.listTrips(), []);
  const { data: regionRecommendations } = useAsyncResource(
    () => appDataApi.listRegionRecommendations({ style: profile.style, region: profile.region, limit: 3 }),
    [profile.region, profile.style],
  );
  const name = currentUser?.nickname ?? previewUser.nickname ?? "여행자";
  const featuredPolicy = getFeaturedPolicy(policies);
  const featuredTrip = trips?.[0];
  const deadlinePolicies = getDeadlinePolicies(policies, 4);
  const recommendedDestinations = buildHomeDestinationsFromRegionRecommendations(regionRecommendations);
  const homeDestinations = recommendedDestinations.length > 0 ? recommendedDestinations : buildHomeDestinations(policies);
  const avatarLabel = name.trim().slice(0, 1).toUpperCase() || "T";
  const aiCardTo = featuredTrip ? `/trips/${featuredTrip.id}` : "/trips/new";

  return (
    <section className="screen with-tabs prototype-app-screen prototype-home-screen">
      <div className="prototype-status-spacer" aria-hidden="true" />
      <div className="prototype-home-search-row">
        <Link className="prototype-home-search-pill" to="/policies">
          <Search size={15} />
          어디로 떠나요?
        </Link>
        <Link className="prototype-home-avatar" to="/mypage" aria-label="마이페이지">
          {avatarLabel}
        </Link>
      </div>

      <div className="prototype-home-greeting">
        <h2>안녕, {name}님 👋</h2>
        <p>이번 달 놓치면 안 될 혜택이 있어요!</p>
      </div>

      {policiesLoading && <LoadingState label="혜택을 불러오는 중입니다" />}
      {policiesError && <ErrorState title="혜택을 불러오지 못했어요" message={policiesError} />}
      {featuredPolicy && (
        <Link className="prototype-home-hero" to={`/policies/${featuredPolicy.slug}`}>
          <div className="prototype-home-hero-kicker">💰 이번 달 인기 정책</div>
          <strong>{featuredPolicy.amount}</strong>
          <p>
            {featuredPolicy.title} · {featuredPolicy.region} · {dday(featuredPolicy.deadline)}
          </p>
          <span className="prototype-home-hero-cta">지금 확인하기 →</span>
        </Link>
      )}

      <PrototypeSectionHeader title="💸 이번 달 혜택" action="더보기" to="/policies" />
      <div className="prototype-home-policy-rail" aria-label="이번 달 혜택 정책 목록">
        {deadlinePolicies.map((policy) => (
          <PrototypePolicyCard key={policy.id} policy={policy} />
        ))}
      </div>

      <PrototypeSectionHeader title="🏞️ 인기 국내 여행지" />
      <div className="prototype-home-destination-rail" aria-label="인기 국내 여행지 목록">
        {homeDestinations.map((destination) => (
          <Link
            key={destination.title}
            className="prototype-home-destination-card"
            style={{ "--destination-color": destination.color } as CSSProperties}
            to={destination.to}
          >
            <strong>{destination.title}</strong>
            <span>{destination.badge}</span>
          </Link>
        ))}
      </div>

      <div className="prototype-home-ai-title">✨ AI 추천 맞춤 일정</div>
      {tripsLoading && <LoadingState label="추천 일정을 불러오는 중입니다" />}
      {tripsError && <ErrorState title="일정을 불러오지 못했어요" message={tripsError} />}
      <Link className="prototype-home-ai-card" to={aiCardTo}>
        <div className="prototype-home-ai-visual">
          <span aria-hidden="true">🏝️</span>
        </div>
        <div className="prototype-home-ai-body">
          <strong>{featuredTrip ? featuredTrip.title : `${profile.region} ${profile.style} 코스 만들기`}</strong>
          <div className="prototype-home-ai-meta">
            <span className="prototype-home-ai-saving">{featuredTrip ? `예상 절약 ${featuredTrip.expectedSaving}` : "정책과 일정을 함께 추천"}</span>
            <span className="prototype-home-ai-detail">{featuredTrip ? featuredTrip.dates : `${profile.budget} 기준`}</span>
          </div>
        </div>
      </Link>
    </section>
  );
}

function PrototypeSectionHeader({ title, action, to = "/policies" }: { title: string; action?: string; to?: string }) {
  return (
    <div className="prototype-home-section-header">
      <h3>{title}</h3>
      {action && <Link to={to}>{action}</Link>}
    </div>
  );
}

function PrototypePolicyCard({ policy }: { policy: Policy }) {
  return (
    <Link className="prototype-home-policy-card" to={`/policies/${policy.slug}`}>
      <div className="prototype-home-policy-label" aria-hidden="true">
        {getHomePolicyIcon(policy)}
      </div>
      <span>{policy.amount}</span>
      <strong>{policy.title}</strong>
      <small>
        {policy.region} · {dday(policy.deadline)}
      </small>
    </Link>
  );
}
