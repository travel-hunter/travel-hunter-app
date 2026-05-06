import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { appDataApi, type Policy } from "../api";
import { useSession } from "../app/session";
import { Button, Tag } from "../components/ui";
import { money } from "../utils";

export function MyPage() {
  const navigate = useNavigate();
  const { currentUser, likedPolicy, logout } = useSession();
  const previewUser = appDataApi.getPreviewUser();
  const previewTrip = appDataApi.getPreviewTrip();
  const name = currentUser?.name ?? previewUser.name;
  const [savedPolicies, setSavedPolicies] = useState<Policy[]>([]);
  const [isLoadingSavedPolicies, setIsLoadingSavedPolicies] = useState(true);
  const [savedPolicyError, setSavedPolicyError] = useState("");
  const [removingPolicySlug, setRemovingPolicySlug] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingSavedPolicies(true);
    setSavedPolicyError("");

    appDataApi
      .listSavedPolicies()
      .then((policies) => {
        if (!isCurrent) return;
        setSavedPolicies(policies);
      })
      .catch(() => {
        if (!isCurrent) return;
        setSavedPolicyError("저장한 정책을 불러오지 못했어요.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingSavedPolicies(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const removeSavedPolicy = async (policy: Policy) => {
    if (removingPolicySlug) return;
    setRemovingPolicySlug(policy.slug);
    setSavedPolicyError("");
    try {
      await appDataApi.removeSavedPolicy(policy.slug);
      setSavedPolicies((current) => current.filter((item) => item.slug !== policy.slug));
    } catch {
      setSavedPolicyError("저장한 정책을 해제하지 못했어요.");
    } finally {
      setRemovingPolicySlug(null);
    }
  };

  const savedPolicyCountLabel = isLoadingSavedPolicies
    ? "불러오는 중"
    : savedPolicies.length > 0
      ? `${savedPolicies.length}건 저장됨`
      : likedPolicy
        ? "1건 저장됨"
        : "아직 저장한 정책이 없습니다";

  return (
    <section className="screen with-tabs">
      <div className="content stack padded">
        <div className="card">
          <div className="card-body">
            <div className="between">
              <div className="row">
                <div className="avatar large">{name[0]}</div>
                <div>
                  <h2 className="profile-name">{name}님</h2>
                  <div className="meta">{previewUser.persona}</div>
                </div>
              </div>
              <Button variant="ghost">편집</Button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="between">
              <div>
                <div className="meta">누적 예상 절감</div>
                <div className="price">{money(previewUser.savedAmount)}원</div>
              </div>
              <Tag tone="warning">예상 혜택</Tag>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <Link className="setting-row" to="/policies">
              <div>
                <strong>저장한 정책</strong>
                <div className="meta">{savedPolicyCountLabel}</div>
              </div>
              <span>›</span>
            </Link>
            <Link className="setting-row" to="/trips">
              <div>
                <strong>내 일정</strong>
                <div className="meta">{previewTrip.title}</div>
              </div>
              <span>›</span>
            </Link>
            <div className="setting-row">
              <div>
                <strong>마감 알림</strong>
                <div className="meta">정책 D-7, D-1 알림</div>
              </div>
              <Tag>켜짐</Tag>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="between">
              <div>
                <strong>저장 정책</strong>
                <div className="meta">관심 있는 혜택을 다시 확인하세요</div>
              </div>
              <Link className="btn ghost" to="/policies">
                정책 찾기
              </Link>
            </div>
            {savedPolicyError && <div className="warning-text">{savedPolicyError}</div>}
            {isLoadingSavedPolicies && <div className="meta">저장한 정책을 불러오는 중입니다</div>}
            {!isLoadingSavedPolicies && savedPolicies.length === 0 && (
              <div className="state-panel">
                <strong>저장한 정책이 없어요</strong>
                <p>정책 상세에서 저장을 누르면 이곳에 모아볼 수 있어요.</p>
              </div>
            )}
            {!isLoadingSavedPolicies && savedPolicies.length > 0 && (
              <div className="list compact">
                {savedPolicies.map((policy) => (
                  <div className="setting-row" key={policy.slug}>
                    <Link to={`/policies/${policy.slug}`}>
                      <strong>{policy.title}</strong>
                      <div className="meta">
                        {policy.org} · {policy.amount}
                      </div>
                    </Link>
                    <Button
                      disabled={removingPolicySlug === policy.slug}
                      onClick={() => removeSavedPolicy(policy)}
                      variant="ghost"
                    >
                      {removingPolicySlug === policy.slug ? "해제 중" : "저장 해제"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button full variant="line" onClick={signOut}>
          <LogOut size={18} />
          로그아웃
        </Button>
      </div>
    </section>
  );
}
