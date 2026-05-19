import { ChevronLeft, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { appDataApi, type InviteRole, type InviteState } from "../../api";
import { useAsyncResource } from "../../api/useAsyncResource";
import { useSession } from "../../app/session";
import { Button, ErrorState, IconButton, LoadingState, PageHead, Toast, TopBar } from "../../components/ui";
import { shareLinkWithFallback } from "../../utils/share";
import { resolveTripId } from "./_shared";

const inviteRoleOptions: Array<{ role: InviteRole; label: string; body: string }> = [
  { role: "viewer", label: "보기만 가능", body: "일정과 연결된 정책을 확인할 수 있어요." },
  { role: "editor", label: "함께 편집", body: "장소 의견과 일정 편집에 참여할 수 있어요." },
];

export function FriendInvitePage() {
  const { invited, sendInvite } = useSession();
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get("tripId");
  const [activeTripId, setActiveTripId] = useState(requestedTripId ?? "");
  const { data: trip, error: tripError, isLoading: tripLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    setActiveTripId(resolvedTripId ?? "");
    if (!resolvedTripId) throw new Error("Trip not found");
    return appDataApi.getTrip(resolvedTripId);
  }, [requestedTripId]);
  const { data: inviteState, error: inviteError, isLoading: inviteLoading } = useAsyncResource(async () => {
    const resolvedTripId = await resolveTripId(requestedTripId);
    if (!resolvedTripId) throw new Error("Trip not found");
    return appDataApi.getInviteState(resolvedTripId);
  }, [requestedTripId]);
  const [sentInviteState, setSentInviteState] = useState<InviteState | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<InviteRole>("editor");
  const effectiveInviteState = sentInviteState ?? inviteState;
  const detailPath = activeTripId ? `/trips/${activeTripId}` : "/trips";

  useEffect(() => {
    if (effectiveInviteState?.role) setSelectedRole(effectiveInviteState.role);
  }, [effectiveInviteState?.role]);

  const shareInviteLink = async () => {
    const inviteUrl = effectiveInviteState?.inviteUrl ?? "";
    if (!inviteUrl) return;
    try {
      const method = await shareLinkWithFallback({
        title: `${title} 초대 링크`,
        text: `${title} 일정을 친구에게 공유해 보세요.`,
        url: inviteUrl,
      });
      setCopied(true);
      setNotice(method === "share" ? "초대 링크를 공유했어요." : "초대 링크를 복사했어요.");
    } catch {
      setCopied(true);
      setNotice("초대 링크를 공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const sendFriendInvite = async () => {
    const tripId = activeTripId || effectiveInviteState?.tripId;
    if (tripId) {
      const nextInviteState = await appDataApi.confirmInviteSent(tripId, selectedRole);
      setSentInviteState(nextInviteState);
    }
    sendInvite();
    setNotice("초대 링크가 준비됐어요. 링크를 복사해 친구에게 공유해 주세요.");
  };

  const title = trip?.title ?? "제주 3일 여행";
  const inviteUrl = effectiveInviteState?.inviteUrl ?? "travelhunter.app/i/jeju-3d";

  return (
    <section className="screen">
      <TopBar
        title="친구 초대"
        left={
          <IconButton label="일정 상세" to={detailPath}>
            <ChevronLeft size={20} />
          </IconButton>
        }
      />
      <div className="content stack padded">
        {(tripLoading || inviteLoading) && <LoadingState label="초대 정보를 불러오는 중입니다" />}
        {(tripError || inviteError) && <ErrorState message={tripError ?? inviteError ?? "초대 정보를 찾지 못했어요."} />}
        <div className="card">
          <div className="card-body stack">
            <PageHead eyebrow="공유 권한" title={`${title} 초대 링크를 준비하세요`} body="초대 링크를 활성화한 뒤 복사해서 친구에게 직접 공유할 수 있어요." />
            <div className="invite-link">
              <span>{inviteUrl}</span>
              <button className="btn sm ghost" onClick={shareInviteLink} type="button">
                {copied ? "복사됨" : "링크 복사"}
              </button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body stack tight">
            <div>
              <div className="choice-label">초대 권한</div>
              <p className="meta">친구가 초대를 수락하면 선택한 권한이 일정 참여자 역할로 저장돼요.</p>
            </div>
            <div className="choice-grid">
              {inviteRoleOptions.map((option) => (
                <button
                  className={`choice ${selectedRole === option.role ? "active" : ""}`}
                  key={option.role}
                  onClick={() => setSelectedRole(option.role)}
                  type="button"
                >
                  <strong>{option.label}</strong>
                  <span className="meta">{option.body}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {notice && <Toast>{notice}</Toast>}
        <Button full onClick={sendFriendInvite}>
          <Send size={18} />
          {invited || effectiveInviteState?.invited ? "초대 링크 준비 완료" : "초대 링크 활성화"}
        </Button>
      </div>
    </section>
  );
}
