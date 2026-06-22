import { Search } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  appDataApi,
  type Policy,
  type Profile,
  type RegionRecommendation,
} from "../api";
import { useAsyncResource } from "../api/useAsyncResource";
import { useSession } from "../app/session";
import {
  AiRecommendationCard,
  type AiRecommendationCardVisual,
} from "../components/AiRecommendationCard";
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

const PROFILE_PROMPT_DISMISSAL_PREFIX =
  "travel-hunter-profile-completion-dismissed:";
const AI_CAROUSEL_SWIPE_THRESHOLD_PX = 42;

export function isProfileComplete(profile: Profile) {
  const regionCount = profile.preferredRegions?.length ?? 0;
  return (
    regionCount >= 1 &&
    regionCount <= 3 &&
    Boolean(profile.style?.trim()) &&
    Boolean(profile.budget?.trim())
  );
}

export function HomePage() {
  const { currentUser, profile } = useSession();
  const dismissalKey = currentUser
    ? `${PROFILE_PROMPT_DISMISSAL_PREFIX}${currentUser.id}`
    : null;
  const [isProfilePromptDismissed, setIsProfilePromptDismissed] =
    useState(false);
  const {
    data: policies,
    error: policiesError,
    isLoading: policiesLoading,
  } = useAsyncResource(() => appDataApi.listPolicies(), []);
  const { data: regionRecommendations } = useAsyncResource(
    () =>
      appDataApi.listRegionRecommendations({
        style: profile.style,
        ...(profile.region ? { region: profile.region } : {}),
        limit: 3,
      }),
    [profile.style, profile.region],
  );
  useEffect(() => {
    setIsProfilePromptDismissed(
      dismissalKey
        ? window.sessionStorage.getItem(dismissalKey) === "1"
        : false,
    );
  }, [dismissalKey]);
  const name = currentUser?.nickname ?? "여행자";
  const featuredPolicy = getFeaturedPolicy(policies);
  const deadlinePolicies = getDeadlinePolicies(policies, 4);
  const recommendedDestinations =
    buildHomeDestinationsFromRegionRecommendations(regionRecommendations);
  const homeDestinations =
    recommendedDestinations.length > 0
      ? recommendedDestinations
      : buildHomeDestinations(policies);
  const aiDestination = homeDestinations[0];
  const preferredAiRegions = useMemo(
    () =>
      Array.from(
        new Set(
          profile.preferredRegions
            ?.map((region) => region.trim())
            .filter(Boolean) ?? [],
        ),
      ),
    [profile.preferredRegions],
  );
  const { data: preferredRegionRecommendations } = useAsyncResource(
    () =>
      preferredAiRegions.length > 0
        ? appDataApi.listRegionRecommendations({
            style: profile.style,
            preferredRegions: preferredAiRegions,
            limit: 3,
          })
        : Promise.resolve([]),
    [preferredAiRegions.join(","), profile.style],
  );
  const aiRegionCards = useMemo(
    () =>
      buildPreferredAiCards(
        preferredAiRegions,
        preferredRegionRecommendations,
        profile.style,
      ),
    [preferredAiRegions, profile.style, preferredRegionRecommendations],
  );
  const avatarLabel = name.trim().slice(0, 1).toUpperCase() || "T";
  const fallbackAiRegion = profile.region ?? "추천 지역";
  const fallbackAiStyle = profile.style ?? "맞춤";
  const aiCardTo =
    aiDestination?.to ??
    (profile.region
      ? `/trips/new?region=${encodeURIComponent(profile.region)}`
      : "/trips/new");
  const aiCardTitle = aiDestination
    ? `${aiDestination.title} ${fallbackAiStyle} 코스 만들기`
    : `${fallbackAiRegion} ${fallbackAiStyle} 코스 만들기`;
  const shouldShowProfilePrompt = Boolean(
    currentUser && !isProfileComplete(profile) && !isProfilePromptDismissed,
  );
  const dismissProfilePrompt = () => {
    if (dismissalKey) window.sessionStorage.setItem(dismissalKey, "1");
    setIsProfilePromptDismissed(true);
  };
  const aiCardVisual: AiRecommendationCardVisual = {
    avatar: "🤖",
    headline: `${fallbackAiRegion} 코스 만들까요?`,
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
        <Link
          className="prototype-home-avatar"
          to="/mypage"
          aria-label="마이페이지"
        >
          {avatarLabel}
        </Link>
      </div>

      <div className="prototype-home-greeting">
        <h2>안녕, {name}님</h2>
        <p>이번 주 놓치면 아쉬운 혜택이 있어요</p>
      </div>

      {shouldShowProfilePrompt && (
        <section
          className="ds-card profile-completion-card"
          role="dialog"
          aria-labelledby="profile-completion-title"
          aria-describedby="profile-completion-body"
        >
          <div>
            <strong id="profile-completion-title">
              프로필 설정을 완료해 주세요
            </strong>
            <p id="profile-completion-body" className="meta">
              관심 지역, 여행 스타일, 예산이 모두 설정되어야 추천 정확도가
              높아져요.
            </p>
          </div>
          <div className="sheet-actions">
            <Link className="btn line" to="/profile-setup?redirect=/home">
              설정하러 가기
            </Link>
            <button
              className="btn ghost"
              type="button"
              onClick={dismissProfilePrompt}
            >
              나중에
            </button>
          </div>
        </section>
      )}

      {policiesLoading && <LoadingState label="혜택을 불러오는 중입니다" />}
      {policiesError && (
        <ErrorState title="혜택을 불러오지 못했어요" message={policiesError} />
      )}
      {featuredPolicy && (
        <Link
          className="prototype-home-hero"
          to={`/policies/${featuredPolicy.slug}`}
        >
          <div className="prototype-home-hero-kicker">이번 주 인기 정책</div>
          <strong>{featuredPolicy.amount}</strong>
          <p>
            {featuredPolicy.title} · {featuredPolicy.region} ·{" "}
            {dday(featuredPolicy.deadline)}
          </p>
          <span className="prototype-home-hero-cta">지금 확인하기</span>
        </Link>
      )}

      <HomeSectionHeader
        title="이번 주 혜택"
        actionLabel="더보기"
        to="/policies"
      />
      <div
        className="prototype-home-policy-rail"
        aria-label="이번 주 혜택 정책 목록"
      >
        {deadlinePolicies.map((policy) => (
          <PrototypePolicyCard key={policy.id} policy={policy} />
        ))}
      </div>

      <HomeRail title="인기 국내 여행지" ariaLabel="인기 국내 여행지 목록">
        {homeDestinations.map((destination) => (
          <Link
            key={destination.title}
            className="prototype-home-destination-card"
            style={
              { "--destination-color": destination.color } as CSSProperties
            }
            to={destination.to}
          >
            <strong>{destination.title}</strong>
            <span>{destination.badge}</span>
          </Link>
        ))}
      </HomeRail>

      <div className="prototype-home-ai-title">AI 추천 맞춤 일정</div>
      {aiRegionCards.length > 1 ? (
        <PreferredAiCarousel cards={aiRegionCards} />
      ) : aiRegionCards.length === 1 ? (
        <div className="prototype-home-ai-single">
          <AiRecommendationCard {...aiRegionCards[0]} />
        </div>
      ) : (
        <AiRecommendationCard
          to={aiCardTo}
          title={aiCardTitle}
          saving={aiDestination?.badge ?? "정책과 일정을 함께 추천"}
          detail="추천 지역으로 새 일정 만들기"
          visual={aiCardVisual}
        />
      )}
    </section>
  );
}

type PreferredAiCard = {
  region: string;
  to: string;
  title: string;
  saving: string;
  detail: string;
  visual: AiRecommendationCardVisual;
};

function buildPreferredAiCards(
  preferredRegions: string[],
  recommendations: RegionRecommendation[] | null | undefined,
  style: string | null | undefined,
): PreferredAiCard[] {
  const recommendationByRegion = new Map(
    (recommendations ?? []).map((recommendation) => [
      recommendation.region,
      recommendation,
    ]),
  );
  const courseStyle = style?.trim() || "맞춤";
  return preferredRegions.map((region) => {
    const recommendation = recommendationByRegion.get(region);
    return {
      region,
      to: `/trips/new?region=${encodeURIComponent(region)}`,
      title: `${region} ${courseStyle} 코스 만들기`,
      saving:
        recommendation && recommendation.endingSoonCount > 0
          ? `마감 임박 ${recommendation.endingSoonCount}개`
          : recommendation
            ? `혜택 ${recommendation.policyCount}개`
            : "관심지역 맞춤 일정",
      detail: "관심지역으로 새 일정 만들기",
      visual: {
        avatar: "🤖",
        headline: `${region} 코스 만들까요?`,
        subline: recommendation?.reason ?? "혜택까지 반영해서 추천해요",
        chips: [
          { emoji: "🏨", label: "숙소 포함" },
          { emoji: "🍜", label: `${courseStyle} 취향` },
        ],
      },
    };
  });
}

function PreferredAiCarousel({ cards }: { cards: PreferredAiCard[] }) {
  const [position, setPosition] = useState(1);
  const [isSnapping, setIsSnapping] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const slideCount = cards.length;
  const extendedCards = useMemo(
    () => [cards[slideCount - 1], ...cards, cards[0]],
    [cards, slideCount],
  );
  const activeIndex = normalizeCarouselIndex(position - 1, slideCount);
  const activeRegion = cards[activeIndex]?.region ?? "";

  useEffect(() => {
    setPosition(1);
    setIsSnapping(false);
  }, [cards]);

  const moveBy = (delta: number) => {
    setIsSnapping(false);
    setPosition((current) => current + delta);
  };
  const moveToPrevious = () => moveBy(-1);
  const moveToNext = () => moveBy(1);
  const handleTransitionEnd = () => {
    if (position === 0) {
      setIsSnapping(true);
      setPosition(slideCount);
      return;
    }
    if (position === slideCount + 1) {
      setIsSnapping(true);
      setPosition(1);
      return;
    }
    setIsSnapping(false);
  };
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
  };
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const distance = event.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(distance) < AI_CAROUSEL_SWIPE_THRESHOLD_PX) return;
    if (distance < 0) moveToNext();
    else moveToPrevious();
  };
  const cancelDrag = () => {
    dragStartX.current = null;
  };

  return (
    <div
      aria-label="관심지역 AI 추천 일정 카드"
      className="prototype-home-ai-carousel"
      data-active-region={activeRegion}
      role="group"
    >
      <button
        className="prototype-home-ai-carousel-control previous"
        type="button"
        onClick={moveToPrevious}
        aria-label="이전 관심지역 일정"
      >
        ‹
      </button>
      <div
        className="prototype-home-ai-carousel-viewport"
        onPointerCancel={cancelDrag}
        onPointerDown={handlePointerDown}
        onPointerLeave={cancelDrag}
        onPointerUp={handlePointerUp}
      >
        <div
          className="prototype-home-ai-carousel-track"
          data-snapping={isSnapping ? "true" : "false"}
          onTransitionEnd={handleTransitionEnd}
          style={{ "--carousel-position": position } as CSSProperties}
        >
          {extendedCards.map((card, index) => (
            <div
              className="prototype-home-ai-slide"
              data-carousel-clone={
                index === 0 || index === extendedCards.length - 1
                  ? "true"
                  : undefined
              }
              key={`${card.region}-${index}`}
              aria-hidden={index === 0 || index === extendedCards.length - 1}
            >
              <AiRecommendationCard
                {...card}
                tabIndex={
                  index === 0 || index === extendedCards.length - 1
                    ? -1
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>
      <button
        className="prototype-home-ai-carousel-control next"
        type="button"
        onClick={moveToNext}
        aria-label="다음 관심지역 일정"
      >
        ›
      </button>
      <div className="prototype-home-ai-carousel-dots" aria-hidden="true">
        {cards.map((card, index) => (
          <span
            key={card.region}
            className={index === activeIndex ? "active" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function normalizeCarouselIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function PrototypePolicyCard({ policy }: { policy: Policy }) {
  return (
    <Link
      className="prototype-home-policy-card"
      to={`/policies/${policy.slug}`}
    >
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
