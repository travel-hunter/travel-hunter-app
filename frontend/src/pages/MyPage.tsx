import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { appDataApi } from "../api";
import { useSession } from "../app/session";
import { Button, Tag } from "../components/ui";
import { money } from "../utils";

export function MyPage() {
  const navigate = useNavigate();
  const { currentUser, likedPolicy, logout } = useSession();
  const previewUser = appDataApi.getPreviewUser();
  const previewTrip = appDataApi.getPreviewTrip();
  const name = currentUser?.name ?? previewUser.name;

  const signOut = () => {
    logout();
    navigate("/login");
  };

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
                <div className="meta">{likedPolicy ? "1건 저장됨" : "아직 저장한 정책이 없습니다"}</div>
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
        <Button full variant="line" onClick={signOut}>
          <LogOut size={18} />
          로그아웃
        </Button>
      </div>
    </section>
  );
}
