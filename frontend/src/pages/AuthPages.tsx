import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appDataApi } from "../api";
import { useSession } from "../app/session";
import { Button, IconButton, LinkButton } from "../components/ui";

const previewUser = appDataApi.getPreviewUser();

function getSafeRedirect(searchParams: URLSearchParams) {
  const redirect = searchParams.get("redirect");
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) return null;
  return redirect;
}

function withRedirect(path: string, redirect: string | null) {
  if (!redirect) return path;
  return `${path}?redirect=${encodeURIComponent(redirect)}`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useSession();
  const [error, setError] = useState("");
  const redirect = getSafeRedirect(searchParams);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await login({
        email,
        password,
      });
      navigate(redirect ?? "/home");
    } catch {
      setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    }
  };

  const oauthRedirect = redirect ?? "/home";

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
          <input name="email" type="email" placeholder="이메일을 입력하세요" autoComplete="email" />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input name="password" type="password" placeholder="비밀번호를 입력하세요" autoComplete="current-password" />
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
        <button type="button" onClick={() => navigate(withRedirect("/forgot-password", redirect))}>
          비밀번호 찾기
        </button>
        <span>·</span>
        <button type="button" onClick={() => navigate(withRedirect("/signup", redirect))}>
          회원가입
        </button>
      </div>
      <div className="content">
        <div className="divider">또는</div>
      </div>
      <div className="socials">
        <a className="social kakao" href={appDataApi.getOAuthStartUrl("kakao", oauthRedirect)}>
          카카오로 로그인
        </a>
        <a className="social google" href={appDataApi.getOAuthStartUrl("google", oauthRedirect)}>
          Google로 로그인
        </a>
      </div>
    </section>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup } = useSession();
  const [error, setError] = useState("");
  const redirect = getSafeRedirect(searchParams);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!name || !email || password.length < 8) {
      setError("이름, 이메일, 8자 이상 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await signup({
        name,
        email,
        password,
      });
      navigate(redirect ?? "/profile-setup");
    } catch {
      setError("회원가입에 실패했습니다. 입력한 정보를 다시 확인해주세요.");
    }
  };

  return (
    <section className="screen white">
      <div className="top-bar">
        <IconButton label="뒤로" to="/">
          <ChevronLeft size={20} />
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
          <input name="name" type="text" placeholder="예: 홍길동" autoComplete="name" />
        </label>
        <label className="field">
          <span>이메일</span>
          <input name="email" type="email" placeholder="user@example.com" autoComplete="email" />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input name="password" type="password" placeholder="8자 이상 입력" autoComplete="new-password" />
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
        <LinkButton to={withRedirect("/login", redirect)} variant="ghost">
          로그인
        </LinkButton>
      </div>
    </section>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const redirect = getSafeRedirect(searchParams);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      await appDataApi.requestPasswordReset({ email });
      setStatus("success");
      setMessage("입력한 이메일로 비밀번호 재설정 링크를 보냈어요.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setStatus("error");
      setMessage(detail || "비밀번호 재설정 이메일을 보낼 수 없어요. 관리자에게 SMTP 설정을 확인해 주세요.");
    }
  };

  return (
    <section className="screen white">
      <div className="top-bar">
        <IconButton label="로그인" to={withRedirect("/login", redirect)}>
          <ChevronLeft size={20} />
        </IconButton>
        <h1>비밀번호 찾기</h1>
        <span />
      </div>
      <div className="auth-hero compact">
        <div className="logo-mark">TH</div>
        <h2>비밀번호 재설정 링크를 받을 이메일을 입력하세요</h2>
        <p>계정이 있는 이메일이면 30분 동안 사용할 수 있는 재설정 링크를 보내드려요.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>이메일</span>
          <input name="email" type="email" placeholder="user@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {message && (
          <p className={status === "error" ? "form-error" : "form-success"} role="status">
            {message}
          </p>
        )}
        <Button full type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "요청 중입니다" : "재설정 링크 받기"}
        </Button>
      </form>
      <div className="auth-links">
        <button type="button" onClick={() => navigate(withRedirect("/login", redirect))}>
          로그인으로 돌아가기
        </button>
      </div>
    </section>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("password") || "");
    setError("");

    if (!token) {
      setError("재설정 토큰이 없어요. 이메일의 링크를 다시 확인해 주세요.");
      return;
    }
    if (newPassword.length < 8) {
      setError("8자 이상 새 비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await appDataApi.confirmPasswordReset({ token, newPassword });
      setSuccess(true);
    } catch {
      setError("비밀번호를 재설정하지 못했어요. 링크가 만료되었거나 이미 사용되었을 수 있어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="screen white">
      <div className="top-bar">
        <IconButton label="로그인" to="/login">
          <ChevronLeft size={20} />
        </IconButton>
        <h1>새 비밀번호 설정</h1>
        <span />
      </div>
      <div className="auth-hero compact">
        <div className="logo-mark">TH</div>
        <h2>새 비밀번호를 설정하세요</h2>
        <p>설정이 완료되면 기존 로그인 세션은 모두 만료돼요.</p>
      </div>
      {success ? (
        <div className="content stack padded">
          <div className="state-panel">
            <strong>비밀번호를 변경했어요</strong>
            <p>새 비밀번호로 다시 로그인해 주세요.</p>
          </div>
          <Button full onClick={() => navigate("/login")}>
            로그인하러 가기
          </Button>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>새 비밀번호</span>
            <input name="password" type="password" placeholder="8자 이상 입력" autoComplete="new-password" />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button full type="submit" disabled={isSubmitting}>
            {isSubmitting ? "변경 중입니다" : "비밀번호 변경"}
          </Button>
        </form>
      )}
    </section>
  );
}

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthSession } = useSession();
  const [error, setError] = useState("");
  const redirect = getSafeRedirect(searchParams) ?? "/home";

  useEffect(() => {
    let cancelled = false;
    async function complete() {
      try {
        await completeOAuthSession();
        if (!cancelled) navigate(redirect, { replace: true });
      } catch {
        if (!cancelled) setError("소셜 로그인 세션을 완료하지 못했어요. 다시 시도해 주세요.");
      }
    }
    void complete();
    return () => {
      cancelled = true;
    };
  }, [completeOAuthSession, navigate, redirect]);

  return (
    <section className="screen white">
      <div className="auth-hero">
        <div className="logo-mark">TH</div>
        <h2>소셜 로그인을 완료하는 중입니다</h2>
        <p>잠시만 기다려 주세요.</p>
      </div>
      {error && (
        <div className="content stack padded">
          <p className="form-error" role="alert">
            {error}
          </p>
          <Button full onClick={() => navigate("/login")}>
            로그인으로 돌아가기
          </Button>
        </div>
      )}
    </section>
  );
}
