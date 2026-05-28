import { Search } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { appDataApi, type Policy } from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import { AiRecommendationCard, type AiRecommendationCardVisual } from "../components/AiRecommendationCard";
import { HomeRail, HomeSectionHeader } from "../components/patterns";
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
  const { data: policies, error: policiesError, isLoading: policiesLoading } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const { data: regionRecommendations } = useAsyncResource(
    () => appDataApi.listRegionRecommendations({ style: profile.style, region: profile.region, limit: 3 }),
    [profile.region, profile.style],
  );
  const name = currentUser?.nickname ?? "여행자";
  const featuredPolicy = getFeaturedPolicy(policies);
  const deadlinePolicies = getDeadlinePolicies(policies, 4);
  const recommendedDestinations = buildHomeDestinationsFromRegionRecommendations(regionRecommendations);
  const homeDestinations = recommendedDestinations.length > 0 ? recommendedDestinations : buildHomeDestinations(policies);
  const aiDestination = homeDestinations[0];
  const avatarLabel = name.trim().slice(0, 1).toUpperCase() || "T";
  const aiCardTo = aiDestination?.to ?? `/trips/new?region=${encodeURIComponent(profile.region)}`;
  const aiCardTitle = aiDestination ? `${aiDestination.title} ${profile.style} 코스 만들기` : `${profile.region} ${profile.style} 코스 만들기`;
  const aiCardVisual: AiRecommendationCardVisual = {
    avatar: "🤖",
    headline: `${profile.region} 코스 만들까요?`,
    subline: "혜택까지 반영해서 추천해요",
    chips: [
      { emoji: "🏨", label: "숙소 포함" },
      { emoji: "🍜", label: "맛집 포함" },
    ],
  };

  return (
    <section className="screen with-tabs prototype-app-screen prototype-home-screen">
      <div className="prototype-status-spacer" aria-hidden="true" />
      <div className="prototype-home-search-row">
        <Link className="prototype-home-search-pill" to="/policies">
          <Search size={15} />
          어디로 떠나세요?
        </Link>
        <Link className="prototype-home-avatar" to="/mypage" aria-label="마이페이지">
          {avatarLabel}
        </Link>
      </div>

      <div className="prototype-home-greeting">
        <h2>안녕, {name}님</h2>
        <p>이번 주 놓치면 아쉬운 혜택이 있어요</p>
      </div>

      {policiesLoading && <LoadingState label="혜택을 불러오는 중입니다" />}
      {policiesError && <ErrorState title="혜택을 불러오지 못했어요" message={policiesError} />}
      {featuredPolicy && (
        <Link className="prototype-home-hero" to={`/policies/${featuredPolicy.slug}`}>
          <div className="prototype-home-hero-kicker">이번 주 인기 정책</div>
          <strong>{featuredPolicy.amount}</strong>
          <p>
            {featuredPolicy.title} · {featuredPolicy.region} · {dday(featuredPolicy.deadline)}
          </p>
          <span className="prototype-home-hero-cta">지금 확인하기</span>
        </Link>
      )}

      <HomeSectionHeader title="이번 주 혜택" actionLabel="더보기" to="/policies" />
      <div className="prototype-home-policy-rail" aria-label="이번 주 혜택 정책 목록">
        {deadlinePolicies.map((policy) => (
          <PrototypePolicyCard key={policy.id} policy={policy} />
        ))}
      </div>

      <HomeRail title="인기 국내 여행지" ariaLabel="인기 국내 여행지 목록">
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
      </HomeRail>

      <div className="prototype-home-ai-title">AI 추천 맞춤 일정</div>
      <AiRecommendationCard
        to={aiCardTo}
        title={aiCardTitle}
        saving={aiDestination?.badge ?? "정책과 일정을 함께 추천"}
        detail="추천 지역으로 새 일정 만들기"
        visual={aiCardVisual}
      />
    </section>
  );
}

function PrototypePolicyCard({ policy }: { policy: Policy }) {
  return (
    <Link className="prototype-home-policy-card" to={`/policies/${policy.slug}`}>
      <div className="prototype-home-policy-label" aria-hidden="true">
        {getHomePolicyIcon(policy)}
      </div>
      <em className="prototype-home-policy-category">{policy.category}</em>
      <span>{policy.amount}</span>
      <strong>{policy.title}</strong>
      <small>
        {policy.region} · {dday(policy.deadline)}
      </small>
    </Link>
  );
}