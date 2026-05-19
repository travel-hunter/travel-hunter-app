import { Bot, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appDataApi, type Recommendation, type TripPlaceRequest } from "../../api";
import { useAsyncResource } from "../../api/useAsyncResource";
import { Button, EmptyState, ErrorState, IconButton, LoadingState, Tag, Toast, TopBar } from "../../components/ui";
import { resolveTripId } from "./_shared";

function recommendationDayNumber(meta: string): number {
  const englishDay = /\bDay\s+([1-9][0-9]*)\b/i.exec(meta);
  const koreanDay = /([1-9][0-9]*)\s*일차/.exec(meta);
  const rawDay = englishDay?.[1] ?? koreanDay?.[1];
  const dayNumber = rawDay ? Number(rawDay) : 1;
  return Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : 1;
}

function recommendationPlacePayload(item: Recommendation): TripPlaceRequest {
  return {
    label: item.title,
    meta: [item.meta, item.reason].filter(Boolean).join(" · "),
  };
}

function recommendationKey(item: Recommendation, index: number): string {
  return `${item.title}:${item.meta}:${index}`;
}

export function AiResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get("tripId");
  const [activeTripId, setActiveTripId] = useState(requestedTripId ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [addingRecommendationKey, setAddingRecommendationKey] = useState<string | null>(null);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const detailPath = activeTripId ? `/trips/${activeTripId}` : "/trips";
  const { data: recommendations, error, isLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    setActiveTripId(resolvedTripId ?? "");
    if (!resolvedTripId) return [];
    return appDataApi.listRecommendations(resolvedTripId);
  }, [requestedTripId]);

  const addRecommendationToTrip = async (item: Recommendation, itemKey: string) => {
    if (!activeTripId || addingRecommendationKey) return;
    setAddError("");
    setNotice(null);
    setAddingRecommendationKey(itemKey);
    try {
      await appDataApi.addTripPlace(activeTripId, recommendationDayNumber(item.meta), recommendationPlacePayload(item));
      setNotice(`${item.title}을 일정에 추가했어요.`);
      navigate(`/trips/${activeTripId}`);
    } catch {
      setAddError("추천 장소를 일정에 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAddingRecommendationKey(null);
    }
  };

  return (
    <section className="screen">
      <TopBar
        title="AI 추천 결과"
        left={
          <IconButton label="일정 상세" to={detailPath}>
            <ChevronLeft size={20} />
          </IconButton>
        }
        right={
          <button className="icon-btn" type="button" aria-label="추천 기준" onClick={() => setIsCriteriaOpen(true)}>
            <Bot size={18} />
          </button>
        }
      />
      <div className="content stack padded">
        <div className="card">
          <div className="card-body">
            <Tag tone="primary">휴식 여행</Tag>
            <h3>제주 3일 일정에 추가할 후보</h3>
            <p className="meta">정책 조건, 이동 거리, 예산을 함께 고려한 추천이에요.</p>
          </div>
        </div>
        {isLoading && <LoadingState label="AI 추천 후보를 불러오는 중입니다" />}
        {error && <ErrorState message={error} />}
        {addError && <p className="form-error">{addError}</p>}
        {!isLoading && !error && (recommendations?.length ?? 0) === 0 && (
          <EmptyState title="추천 후보가 아직 없어요" body="일정 조건을 다시 조정하면 더 알맞은 장소를 찾을 수 있어요." action={<Button onClick={() => navigate("/trips/new")}>일정 조건 바꾸기</Button>} />
        )}
        {(recommendations ?? []).map((item, index) => {
          const itemKey = recommendationKey(item, index);
          return (
            <article className="result-card card" key={itemKey}>
              <div className="result-photo">{item.label}</div>
              <div className="stack tight">
                <div>
                  <h3>{item.title}</h3>
                  <div className="meta">{item.meta}</div>
                </div>
                <p className="meta">{item.reason}</p>
                <Button
                  variant="secondary"
                  disabled={addingRecommendationKey === itemKey}
                  onClick={() => void addRecommendationToTrip(item, itemKey)}
                >
                  {addingRecommendationKey === itemKey ? "추가 중" : "일정에 추가"}
                </Button>
              </div>
            </article>
          );
        })}
        {notice && <Toast>{notice}</Toast>}
      </div>
      {isCriteriaOpen && <RecommendationCriteriaSheet onClose={() => setIsCriteriaOpen(false)} />}
    </section>
  );
}

function RecommendationCriteriaSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="trip-select-sheet" role="dialog" aria-modal="true" aria-labelledby="recommendation-criteria-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <Tag tone="primary">추천 기준</Tag>
            <h2 id="recommendation-criteria-title">AI 추천 기준</h2>
            <p className="meta">현재 추천은 저장된 정책과 일정 정보를 바탕으로 후보를 정리합니다.</p>
          </div>
          <button className="btn sm ghost" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="stack tight">
          <div className="setting-row">
            <strong>정책 조건</strong>
            <span className="meta">일정에 연결된 정책의 지역, 대상 조건, 마감일을 우선 고려합니다.</span>
          </div>
          <div className="setting-row">
            <strong>이동 거리</strong>
            <span className="meta">같은 일차 안에서 이동 부담이 적은 후보를 우선 보여줍니다.</span>
          </div>
          <div className="setting-row">
            <strong>예산</strong>
            <span className="meta">사용자의 예산 설정과 예상 절감액이 맞는 장소를 함께 봅니다.</span>
          </div>
          <div className="setting-row">
            <strong>여행 스타일</strong>
            <span className="meta">휴식, 맛집, 체험 같은 선호 스타일과 맞는 후보를 고릅니다.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingRow({ label, body, value, tone = "default" }: { label: string; body: string; value: string; tone?: "default" | "primary" | "gray" }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <div className="meta">{body}</div>
      </div>
      <Tag tone={tone}>{value}</Tag>
    </div>
  );
}
