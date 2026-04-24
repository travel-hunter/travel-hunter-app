import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  Home,
  LogOut,
  MapPin,
  Menu,
  Plane,
  Plus,
  Search,
  Share2,
  Sparkles,
  User,
  WalletCards,
} from "lucide-react";
import { Link, Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Destination, Policy, Trip, destinations, policies, policyTypes, regions, trips } from "./data";

type AuthState = {
  email: string;
  nickname: string;
};

const savedAuth = window.localStorage.getItem("travel-hunter-auth");
const initialAuth: AuthState | null = savedAuth ? JSON.parse(savedAuth) : null;

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(initialAuth);

  const login = (nextAuth: AuthState) => {
    window.localStorage.setItem("travel-hunter-auth", JSON.stringify(nextAuth));
    setAuth(nextAuth);
  };

  const logout = () => {
    window.localStorage.removeItem("travel-hunter-auth");
    setAuth(null);
  };

  return (
    <Routes>
      <Route path="/" element={auth ? <Navigate to="/home" replace /> : <Onboarding />} />
      <Route path="/signup" element={<SignupPage onAuth={login} />} />
      <Route path="/login" element={<LoginPage onAuth={login} />} />
      <Route element={<ProtectedRoute isAuthed={Boolean(auth)} />}>
        <Route path="/home" element={<HomePage user={auth} onLogout={logout} />} />
        <Route path="/policies" element={<PolicyListPage />} />
        <Route path="/policies/:id" element={<PolicyDetailPage />} />
        <Route path="/trips" element={<TripListPage />} />
        <Route path="/trips/new" element={<TripCreatePage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ isAuthed }: { isAuthed: boolean }) {
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <AppFrame />;
}

function AppFrame() {
  return (
    <div className="app-shell">
      <main className="screen-stack">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}

function Onboarding() {
  return (
    <main className="onboarding">
      <section className="onboarding-visual" aria-label="국내 여행 이미지">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
          alt="푸른 하늘 아래 국내 여행지를 떠올리게 하는 풍경"
        />
        <div className="logo-mark">
          <Plane size={34} />
        </div>
      </section>
      <section className="auth-panel">
        <p className="eyebrow">국내 여행 혜택 탐색</p>
        <h1>트레블헌터</h1>
        <p className="lead">정책 혜택부터 일정 관리까지, 알뜰한 국내 여행을 한 번에 준비하세요.</p>
        <div className="button-stack">
          <Link className="button primary" to="/signup">
            회원가입
            <ChevronRight size={18} />
          </Link>
          <Link className="button secondary" to="/login">
            이미 계정이 있다면 로그인
          </Link>
        </div>
      </section>
    </main>
  );
}

function SignupPage({ onAuth }: { onAuth: (auth: AuthState) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [region, setRegion] = useState("제주");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateSignup(email, password, confirmPassword, nickname, agreed);
    if (validation) {
      setError(validation);
      return;
    }

    onAuth({ email, nickname });
    navigate("/home");
  };

  return (
    <AuthLayout title="새 여행 계정 만들기" description="관심 지역을 저장하고 정책 혜택을 일정과 연결해보세요.">
      <form className="form" onSubmit={submit}>
        <Field label="이메일" type="email" value={email} onChange={setEmail} placeholder="travel@example.com" />
        <Field label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="영문+숫자 8자 이상" />
        <Field label="비밀번호 확인" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="비밀번호 재입력" />
        <Field label="닉네임" value={nickname} onChange={setNickname} placeholder="여행자 닉네임" />
        <Field label="생년월일" type="date" value={birthDate} onChange={setBirthDate} />
        <label className="field">
          <span>관심 지역</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {regions.slice(1).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>필수 약관과 개인정보 처리방침에 동의합니다.</span>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button primary" type="submit">
          가입 완료
          <Check size={18} />
        </button>
        <SocialButtons />
      </form>
      <p className="auth-switch">
        이미 계정이 있다면 <Link to="/login">로그인</Link>
      </p>
    </AuthLayout>
  );
}

function LoginPage({ onAuth }: { onAuth: (auth: AuthState) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@travelhunter.kr");
  const [password, setPassword] = useState("hunter123");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isEmail(email) || password.length < 1) {
      setError("이메일과 비밀번호를 확인해주세요.");
      return;
    }

    onAuth({ email, nickname: "트래블러" });
    navigate("/home");
  };

  return (
    <AuthLayout title="다시 떠날 준비" description="로그인하면 저장한 일정과 연결된 정책을 이어서 볼 수 있습니다.">
      <form className="form" onSubmit={submit}>
        <Field label="이메일" type="email" value={email} onChange={setEmail} />
        <Field label="비밀번호" type="password" value={password} onChange={setPassword} />
        {error && <p className="form-error">{error}</p>}
        <button className="button primary" type="submit">
          로그인
          <ChevronRight size={18} />
        </button>
        <SocialButtons />
      </form>
      <p className="auth-switch">
        <Link to="/signup">회원가입</Link>
        <span aria-hidden="true">|</span>
        <a href="#password">비밀번호 찾기</a>
      </p>
    </AuthLayout>
  );
}

function HomePage({ user, onLogout }: { user?: AuthState | null; onLogout?: () => void }) {
  return (
    <Screen>
      <TopBar
        title="어디로 떠나요?"
        leading={<Search size={20} />}
        trailing={
          <div className="top-actions">
            <Link className="icon-button" to="/trips">
              <CalendarDays size={19} />
              <span className="sr-only">일정</span>
            </Link>
            {onLogout && (
              <button className="icon-button" onClick={onLogout} type="button">
                <LogOut size={19} />
                <span className="sr-only">로그아웃</span>
              </button>
            )}
          </div>
        }
      />
      <section className="hero-band">
        <p className="eyebrow">안녕하세요{user?.nickname ? `, ${user.nickname}님` : ""}</p>
        <h2>지원 정책을 여행 일정에 바로 연결하세요.</h2>
        <Link className="button accent" to="/trips/new">
          새 일정 만들기
          <Plus size={18} />
        </Link>
      </section>

      <SectionHeader title="이번 달 놓치면 안 되는 혜택" actionLabel="전체 보기" to="/policies" />
      <div className="horizontal-list">
        {policies.slice(0, 3).map((policy) => (
          <PolicyCard key={policy.id} policy={policy} compact />
        ))}
      </div>

      <SectionHeader title="인기 국내 여행지" />
      <div className="destination-grid">
        {destinations.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>

      <section className="ai-panel">
        <div>
          <p className="eyebrow">AI 추천 맞춤 일정</p>
          <h3>제주 3일 알뜰 코스</h3>
          <p>연결 가능한 정책 2개와 이동 동선을 함께 고려한 추천입니다.</p>
        </div>
        <Link className="icon-button filled" to="/trips/jeju-3-days">
          <Sparkles size={22} />
          <span className="sr-only">AI 추천 일정 보기</span>
        </Link>
      </section>
    </Screen>
  );
}

function PolicyListPage() {
  const [selectedRegion, setSelectedRegion] = useState("전국");
  const [selectedType, setSelectedType] = useState("전체");
  const [ageGroup, setAgeGroup] = useState("20대");

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const regionMatch = selectedRegion === "전국" || policy.region === selectedRegion || policy.region === "전국";
      const typeMatch = selectedType === "전체" || policy.type === selectedType;
      return regionMatch && typeMatch;
    });
  }, [selectedRegion, selectedType]);

  return (
    <Screen>
      <TopBar title="정책 목록" leading={<ClipboardList size={20} />} />
      <div className="filter-panel">
        <label>
          지역
          <select value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </label>
        <label>
          유형
          <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
            {policyTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          연령대
          <select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
            {["20대", "30대", "40대", "가족"].map((age) => (
              <option key={age}>{age}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="content-grid">
        {filteredPolicies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} />
        ))}
      </div>
    </Screen>
  );
}

function PolicyDetailPage() {
  const { id } = useParams();
  const policy = policies.find((item) => item.id === id);

  if (!policy) {
    return <NotFound title="정책을 찾을 수 없습니다." to="/policies" />;
  }

  return (
    <Screen>
      <BackTopBar title="정책 상세" to="/policies" />
      <article className="detail-card">
        <span className="tag">{policy.type}</span>
        <h1>{policy.title}</h1>
        <p className="muted">주관: {policy.sponsor}</p>
        <InfoBlock icon={<CalendarDays />} title="신청 기간" body={policy.period} />
        <InfoBlock icon={<WalletCards />} title="지원 내용" body={policy.benefit} />
        <InfoBlock icon={<User />} title="신청 대상" body={policy.audience} />
        <InfoBlock icon={<MapPin />} title="대상 조건" body={policy.condition} />
        <section className="checklist" aria-label="필요 서류 체크리스트">
          <h2>필요 서류</h2>
          {policy.documents.map((document) => (
            <label key={document} className="check-row">
              <input type="checkbox" />
              <span>{document}</span>
            </label>
          ))}
        </section>
      </article>
      <div className="sticky-actions">
        <a className="button primary" href={policy.officialUrl} target="_blank" rel="noreferrer">
          공식 신청하러 가기
          <ChevronRight size={18} />
        </a>
        <Link className="button secondary" to="/trips/jeju-3-days">
          내 일정에 추가
        </Link>
      </div>
    </Screen>
  );
}

function TripListPage() {
  const upcomingTrips = trips;
  const pastTrips: Trip[] = [];
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const selectedTrips = tab === "upcoming" ? upcomingTrips : pastTrips;

  return (
    <Screen>
      <TopBar
        title="내 일정"
        leading={<CalendarDays size={20} />}
        trailing={
          <Link className="icon-button filled" to="/trips/new">
            <Plus size={18} />
            <span className="sr-only">새 일정 만들기</span>
          </Link>
        }
      />
      <div className="segmented" role="tablist" aria-label="일정 구분">
        <button className={tab === "upcoming" ? "active" : ""} type="button" onClick={() => setTab("upcoming")}>
          다가오는 일정
        </button>
        <button className={tab === "past" ? "active" : ""} type="button" onClick={() => setTab("past")}>
          지난 일정
        </button>
      </div>
      <div className="content-grid">
        {selectedTrips.length > 0 ? (
          selectedTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)
        ) : (
          <EmptyState title="지난 일정이 없습니다." body="새 일정 만들기로 다음 여행을 준비해보세요." />
        )}
      </div>
    </Screen>
  );
}

function TripCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("제주 3일 여행");
  const [startDate, setStartDate] = useState("2026-05-17");
  const [endDate, setEndDate] = useState("2026-05-19");
  const [region, setRegion] = useState("제주");
  const [companion, setCompanion] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !startDate || !endDate || !region) {
      setError("여행 제목, 날짜, 방문 지역을 입력해주세요.");
      return;
    }
    navigate("/trips/jeju-3-days");
  };

  return (
    <Screen>
      <BackTopBar title="새 일정 만들기" to="/trips" />
      <form className="form elevated" onSubmit={submit}>
        <Field label="여행 제목" value={title} onChange={setTitle} />
        <div className="two-column">
          <Field label="시작일" type="date" value={startDate} onChange={setStartDate} />
          <Field label="종료일" type="date" value={endDate} onChange={setEndDate} />
        </div>
        <label className="field">
          <span>방문 지역</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {regions.slice(1).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <Field label="동행자 추가" value={companion} onChange={setCompanion} placeholder="이메일 또는 닉네임" />
        {error && <p className="form-error">{error}</p>}
        <button className="button primary" type="submit">
          다음
          <ChevronRight size={18} />
        </button>
      </form>
    </Screen>
  );
}

function TripDetailPage() {
  const { id } = useParams();
  const trip = trips.find((item) => item.id === id);
  const [activeDay, setActiveDay] = useState(1);

  if (!trip) {
    return <NotFound title="일정을 찾을 수 없습니다." to="/trips" />;
  }

  const active = trip.days.find((day) => day.day === activeDay) ?? trip.days[0];
  const linkedPolicies = policies.filter((policy) => trip.policyIds.includes(policy.id));

  return (
    <Screen>
      <BackTopBar title={trip.title} to="/trips" trailing={<span className="participant-badge">{trip.participants}명</span>} />
      <section className="map-panel" aria-label="지도 동선 미리보기">
        <div className="route-line" />
        <span className="map-pin pin-1">1</span>
        <span className="map-pin pin-2">2</span>
        <span className="map-pin pin-3">3</span>
        <p>{trip.region} 동선 표시</p>
      </section>
      <div className="day-tabs" role="tablist" aria-label="날짜 선택">
        {trip.days.map((day) => (
          <button
            className={activeDay === day.day ? "active" : ""}
            key={day.day}
            type="button"
            onClick={() => setActiveDay(day.day)}
          >
            Day {day.day}
          </button>
        ))}
      </div>
      <section className="timeline">
        {active.places.map((place) => (
          <article className="place-row" key={place.id}>
            <span className="time">{place.time}</span>
            <div>
              <h3>{place.name}</h3>
              <p>{place.category}</p>
            </div>
            <Menu size={18} aria-hidden="true" />
          </article>
        ))}
        <button className="button secondary" type="button">
          <Plus size={18} />
          장소 추가
        </button>
      </section>
      <div className="action-grid">
        <button className="button primary" type="button">
          <Bot size={18} />
          AI 추천받기
        </button>
        <button className="button secondary" type="button">
          <Share2 size={18} />
          친구 초대
        </button>
      </div>
      <section className="linked-policies">
        <SectionHeader title={`연결된 정책 (${linkedPolicies.length})`} />
        {linkedPolicies.map((policy) => (
          <Link key={policy.id} className="mini-policy" to={`/policies/${policy.id}`}>
            <WalletCards size={18} />
            <span>{policy.title}</span>
            <ChevronRight size={16} />
          </Link>
        ))}
      </section>
    </Screen>
  );
}

function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={18} />
        처음으로
      </Link>
      <section className="auth-card">
        <div className="brand-row">
          <span className="logo-small">
            <Plane size={20} />
          </span>
          <span>트레블헌터</span>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </section>
    </main>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function SocialButtons() {
  return (
    <div className="social-area" aria-label="소셜 로그인">
      <span>또는</span>
      <div className="social-buttons">
        <button className="button social kakao" type="button">
          카카오
        </button>
        <button className="button social google" type="button">
          구글
        </button>
      </div>
    </div>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return <div className="screen">{children}</div>;
}

function TopBar({ title, leading, trailing }: { title: string; leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <header className="top-bar">
      <div className="top-title">
        {leading}
        <span>{title}</span>
      </div>
      {trailing}
    </header>
  );
}

function BackTopBar({ title, to, trailing }: { title: string; to: string; trailing?: ReactNode }) {
  return (
    <header className="top-bar">
      <Link className="icon-button" to={to}>
        <ArrowLeft size={19} />
        <span className="sr-only">뒤로</span>
      </Link>
      <span className="top-bar-title">{title}</span>
      {trailing ?? <span className="top-spacer" />}
    </header>
  );
}

function BottomTabs() {
  const tabs = [
    { to: "/home", label: "홈", icon: Home },
    { to: "/policies", label: "정책", icon: ClipboardList },
    { to: "/trips", label: "일정", icon: CalendarDays },
    { to: "/home", label: "마이", icon: User },
  ];

  return (
    <nav className="bottom-tabs" aria-label="주요 메뉴">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={label} to={to} className={({ isActive }) => (isActive && label !== "마이" ? "active" : "")}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function SectionHeader({ title, actionLabel, to }: { title: string; actionLabel?: string; to?: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {to && actionLabel && (
        <Link to={to}>
          {actionLabel}
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function PolicyCard({ policy, compact = false }: { policy: Policy; compact?: boolean }) {
  return (
    <Link className={`policy-card ${compact ? "compact" : ""}`} to={`/policies/${policy.id}`}>
      <div className="card-topline">
        <span className="tag">{policy.type}</span>
        <span>{policy.region}</span>
      </div>
      <h3>{policy.title}</h3>
      <p>{policy.benefit}</p>
      <dl>
        <div>
          <dt>신청 기간</dt>
          <dd>{policy.period}</dd>
        </div>
        <div>
          <dt>대상</dt>
          <dd>{policy.audience}</dd>
        </div>
      </dl>
    </Link>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <article className="destination-card">
      <img src={destination.imageUrl} alt={`${destination.name} 여행지 풍경`} />
      <div>
        <span>{destination.region}</span>
        <h3>{destination.name}</h3>
        <p>{destination.description}</p>
      </div>
    </article>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link className="trip-card" to={`/trips/${trip.id}`}>
      <div>
        <span className="tag">{trip.region}</span>
        <h3>{trip.title}</h3>
        <p>{trip.startDate} - {trip.endDate}</p>
      </div>
      <dl>
        <div>
          <dt>참여자</dt>
          <dd>{trip.participants}명</dd>
        </div>
        <div>
          <dt>연결 정책</dt>
          <dd>{trip.policyIds.length}개</dd>
        </div>
      </dl>
      <ChevronRight size={20} />
    </Link>
  );
}

function InfoBlock({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <section className="info-block">
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="empty-state">
      <CalendarDays size={28} />
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function NotFound({ title, to }: { title: string; to: string }) {
  return (
    <Screen>
      <EmptyState title={title} body="목록 화면에서 다시 선택해주세요." />
      <Link className="button primary" to={to}>
        목록으로 이동
      </Link>
    </Screen>
  );
}

function validateSignup(email: string, password: string, confirmPassword: string, nickname: string, agreed: boolean) {
  if (!isEmail(email)) return "이메일 형식을 확인해주세요.";
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) return "비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.";
  if (password !== confirmPassword) return "비밀번호 확인이 일치하지 않습니다.";
  if (!nickname.trim()) return "닉네임을 입력해주세요.";
  if (!agreed) return "필수 약관에 동의해야 가입할 수 있습니다.";
  return "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
