import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appDataApi } from "../api";
import { useSession } from "../app/session";
import { Button, IconButton, LinkButton } from "../components/ui";

const previewUser = appDataApi.getPreviewUser();

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useSession();
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");

    try {
      await login({
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
      });
      navigate("/home");
    } catch {
      setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    }
  };

  const submitDefaultLogin = async () => {
    setError("");
    try {
      await login();
      navigate("/home");
    } catch {
      setError("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <section className="screen white">
      <div className="auth-hero">
        <div className="logo-mark">TH</div>
        <h2>다시 만난 여행 혜택을 확인하세요</h2>
        <p>{previewUser.email} 계정으로 저장한 혜택과 일정을 이어서 확인할 수 있어요.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>이메일</span>
          <input name="email" type="email" defaultValue={previewUser.email} autoComplete="email" />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input name="password" type="password" defaultValue="password123" autoComplete="current-password" />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
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
        <button className="social kakao" onClick={submitDefaultLogin} type="button">
          카카오로 로그인
        </button>
        <button className="social google" onClick={submitDefaultLogin} type="button">
          Google로 로그인
        </button>
      </div>
    </section>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useSession();
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");

    try {
      await signup({
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
      });
      navigate("/profile-setup");
    } catch {
      setError("회원가입에 실패했습니다. 입력한 정보를 다시 확인해주세요.");
    }
  };

  return (
    <section className="screen white">
      <div className="top-bar">
        <IconButton label="뒤로" to="/">
          ←
        </IconButton>
        <h1>회원가입</h1>
        <span />
      </div>
      <div className="auth-hero compact">
        <div className="logo-mark">TH</div>
        <h2>지금 받을 수 있는 여행 혜택부터 찾기</h2>
        <p>관심 지역과 여행 스타일을 설정하면 맞춤 혜택을 먼저 보여드려요.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>이름</span>
          <input name="name" type="text" defaultValue={previewUser.name} autoComplete="name" />
        </label>
        <label className="field">
          <span>이메일</span>
          <input name="email" type="email" defaultValue={previewUser.email} autoComplete="email" />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input name="password" type="password" defaultValue="password123" autoComplete="new-password" />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button full type="submit">
          가입하고 맞춤 설정하기
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
