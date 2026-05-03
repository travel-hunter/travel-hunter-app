import { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../app/session";
import { Button, IconButton, LinkButton } from "../components/ui";
import { user } from "../data/prototypeData";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useSession();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login();
    navigate("/home");
  };

  return (
    <section className="screen white">
      <div className="auth-hero">
        <div className="logo-mark">TH</div>
        <h2>다시 만난 여행 혜택을 확인하세요</h2>
        <p>{user.email} 계정으로 prototype의 핵심 플로우에 바로 진입합니다.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>이메일</span>
          <input type="email" defaultValue={user.email} autoComplete="email" />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input type="password" defaultValue="password123" autoComplete="current-password" />
        </label>
        <Button full type="submit">
          로그인
        </Button>
      </form>
      <div className="auth-links">
        <button type="button">비밀번호 찾기</button>
        <span>·</span>
        <button type="button" onClick={() => navigate("/signup")}>
          회원가입
        </button>
      </div>
      <div className="content">
        <div className="divider">또는</div>
      </div>
      <div className="socials">
        <button className="social kakao" onClick={() => submit(new Event("submit") as unknown as FormEvent)} type="button">
          카카오로 로그인
        </button>
        <button className="social google" onClick={() => submit(new Event("submit") as unknown as FormEvent)} type="button">
          Google로 로그인
        </button>
      </div>
    </section>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { login } = useSession();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login();
    navigate("/profile-setup");
  };

  return (
    <section className="screen white">
      <div className="top-bar">
        <IconButton label="뒤로" to="/">
          ‹
        </IconButton>
        <h1>회원가입</h1>
        <span />
      </div>
      <div className="auth-hero compact">
        <div className="logo-mark">TH</div>
        <h2>지금 받을 수 있는 여행 혜택부터 찾기</h2>
        <p>가입 후 첫 로그인 정보 입력에서 추천 지역과 여행 스타일을 설정합니다.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>이름</span>
          <input type="text" defaultValue={user.name} autoComplete="name" />
        </label>
        <label className="field">
          <span>이메일</span>
          <input type="email" defaultValue={user.email} autoComplete="email" />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input type="password" defaultValue="password123" autoComplete="new-password" />
        </label>
        <Button full type="submit">
          가입하고 정보 입력
        </Button>
      </form>
      <div className="auth-links">
        <span>이미 계정이 있나요?</span>
        <LinkButton to="/login" variant="ghost">
          로그인
        </LinkButton>
      </div>
    </section>
  );
}
