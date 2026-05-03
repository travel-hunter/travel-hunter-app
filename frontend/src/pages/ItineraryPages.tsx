import { Bot, Plus, Send, Share2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../app/session";
import { ItineraryCard } from "../components/cards";
import { Button, IconButton, PageHead, Tag, TopBar } from "../components/ui";
import { itinerary, recommendations, regions, travelStyles } from "../data/prototypeData";

export function ItineraryListPage() {
  const { addedPolicy } = useSession();

  return (
    <section className="screen with-tabs">
      <TopBar
        title="일정 목록"
        right={
          <IconButton label="일정 생성" to="/trips/new">
            <Plus size={18} />
          </IconButton>
        }
      />
      <div className="content stack padded">
        <ItineraryCard addedPolicy={addedPolicy} />
        <Link className="list-card card" to="/trips/new">
          <div className="between">
            <div>
              <Tag tone="primary">새 일정</Tag>
              <h3>정책 조건에 맞는 여행 만들기</h3>
            </div>
            <span className="btn sm primary">만들기</span>
          </div>
          <p className="meta">지역, 날짜, 테마를 선택하면 추천 정책과 AI 동선을 함께 구성합니다.</p>
        </Link>
      </div>
    </section>
  );
}

export function ItineraryCreatePage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useSession();

  return (
    <section className="screen">
      <TopBar
        title="일정 생성"
        left={
          <IconButton label="일정 목록" to="/trips">
            ‹
          </IconButton>
        }
      />
      <div className="content stack padded">
        <div className="card">
          <div className="card-body stack">
            <PageHead eyebrow="AI 일정 빌더" title="정책 조건에 맞는 여행을 만듭니다" body="prototype 기준으로 제주 3일 일정을 생성합니다." />
            <ChoiceGroup label="지역" values={regions} selected={profile.region} onSelect={(value) => updateProfile("region", value)} />
            <ChoiceGroup label="여행 테마" values={travelStyles} selected={profile.style} onSelect={(value) => updateProfile("style", value)} />
          </div>
        </div>
        <Button full onClick={() => navigate("/trips/jeju-3-days")}>
          제주 3일 일정 생성
        </Button>
      </div>
    </section>
  );
}

function ChoiceGroup({ label, values, selected, onSelect }: { label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div>
      <div className="choice-label">{label}</div>
      <div className="choice-grid">
        {values.map((value) => (
          <button className={selected === value ? "choice active" : "choice"} key={value} onClick={() => onSelect(value)} type="button">
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ItineraryDetailPage() {
  const { addedPolicy } = useSession();
  const [activeDay, setActiveDay] = useState<1 | 2 | 3>(1);
  const dayPlaces = itinerary.days[activeDay];

  return (
    <section className="screen with-tabs">
      <TopBar
        title={itinerary.title}
        left={
          <IconButton label="홈으로" to="/home">
            ‹
          </IconButton>
        }
        right={
          <IconButton label="친구 초대" to="/friend-invite">
            <Share2 size={18} />
          </IconButton>
        }
      />
      <div className="trip-summary">
        <div className="row meta">{itinerary.dates} · 2박 3일</div>
        <div className="between">
          <div className="row">
            <div className="avatar-stack">
              {itinerary.people.map((name) => (
                <span className="avatar-mini" key={name}>
                  {name[0]}
                </span>
              ))}
            </div>
            <span className="meta">{itinerary.people.length}명 참여 중</span>
          </div>
          <Link className="btn sm secondary" to="/friend-invite">
            초대
          </Link>
        </div>
      </div>
      <Link className="benefit-banner" to="/policies/local-vacation">
        <Tag tone="warning">정책 매칭</Tag>
        <strong>{addedPolicy ? "지역사랑 휴가지원이 연결되었어요" : "받을 수 있는 혜택 2건"}</strong>
        <div className="meta">최대 30만원 절감 가능 · 정책 상세 보기</div>
      </Link>
      <div className="map-large" aria-label="제주 일정 지도">
        <div className="marker one" />
        <div className="marker two" />
        <div className="marker three" />
      </div>
      <div className="day-tabs">
        {[1, 2, 3].map((day) => (
          <button className={activeDay === day ? "day-tab active" : "day-tab"} key={day} onClick={() => setActiveDay(day as 1 | 2 | 3)} type="button">
            <strong>Day {day}</strong>
            <span>06.{14 + day}</span>
          </button>
        ))}
      </div>
      <div className="timeline">
        {dayPlaces.map((place) => (
          <div className="timeline-item" key={`${place.time}-${place.label}`}>
            <div className="time">{place.time}</div>
            <article className="place-detail">
              <div>
                <h4>{place.label}</h4>
                <div className="meta">{place.meta}</div>
              </div>
              <div className="drag">⋮⋮</div>
            </article>
          </div>
        ))}
        <button className="dashed" type="button">
          + 장소 추가
        </button>
        <Link className="btn secondary full" to="/ai-results">
          AI에게 추천받기
        </Link>
      </div>
    </section>
  );
}

export function AiResultsPage() {
  const navigate = useNavigate();

  return (
    <section className="screen">
      <TopBar
        title="AI 추천 결과"
        left={
          <IconButton label="일정 상세" to="/trips/jeju-3-days">
            ‹
          </IconButton>
        }
        right={
          <button className="icon-btn" type="button" aria-label="추천 기준">
            <Bot size={18} />
          </button>
        }
      />
      <div className="content stack padded">
        <div className="card">
          <div className="card-body">
            <Tag tone="primary">휴식 여행</Tag>
            <h3>제주 3일 일정에 추가할 후보</h3>
            <p className="meta">정책 조건, 이동 거리, 예산을 함께 고려한 mock 추천입니다.</p>
          </div>
        </div>
        {recommendations.map((item) => (
          <article className="result-card card" key={item.title}>
            <div className="result-photo">{item.label}</div>
            <div className="stack tight">
              <div>
                <h3>{item.title}</h3>
                <div className="meta">{item.meta}</div>
              </div>
              <p className="meta">{item.reason}</p>
              <Button variant="secondary" onClick={() => navigate("/trips/jeju-3-days")}>
                일정에 추가
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FriendInvitePage() {
  const { invited, sendInvite } = useSession();

  return (
    <section className="screen">
      <TopBar
        title="친구 초대"
        left={
          <IconButton label="일정 상세" to="/trips/jeju-3-days">
            ‹
          </IconButton>
        }
      />
      <div className="content stack padded">
        <div className="card">
          <div className="card-body stack">
            <PageHead eyebrow="공유 권한" title={`${itinerary.title}에 친구를 초대하세요`} body="초대 받은 친구는 일정 확인과 장소 의견 추가가 가능합니다." />
            <div className="invite-link">
              <span>travelhunter.app/i/jeju-3d</span>
              <button className="btn sm ghost" type="button">
                복사
              </button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <SettingRow label="보기 권한" body="일정과 정책 연결 상태 확인" value="기본" />
            <SettingRow label="댓글 권한" body="장소 의견과 체크리스트 의견 추가" value="허용" tone="primary" />
            <SettingRow label="편집 권한" body="장소 순서와 시간 변경" value="제한" tone="gray" />
          </div>
        </div>
        <Button full onClick={sendInvite}>
          <Send size={18} />
          {invited ? "초대 완료" : "친구에게 초대 보내기"}
        </Button>
      </div>
    </section>
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
