import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, Dice5 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appDataApi } from "../api";
import { getPostAuthPath, getSafeRedirect, withRedirect } from "../app/onboarding";
import { useSession } from "../app/session";
import { Button, IconButton, LinkButton } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useSession();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      setIsSubmitting(true);
      await login({
        email,
        password,
      });
      navigate(redirect ?? "/home");
    } catch {
      setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const oauthRedirect = redirect ?? "/home";

  return (
    <section className="screen white prototype-login-screen">
      <div className="prototype-status-bar" aria-hidden="true" />
      <div className="prototype-login-content">
        <div className="prototype-login-hero">
          <div className="prototype-login-logo" aria-hidden="true">
            ✈️
          </div>
          <h1>트래블헌터</h1>
          <p>숨은 여행 혜택을 사냥하세요</p>
        </div>

        <form className="prototype-login-form" onSubmit={submit}>
          <label className="prototype-field">
            <span>
              이메일 <strong>*</strong>
            </span>
            <input name="email" type="email" placeholder="이메일을 입력하세요" autoComplete="email" />
          </label>
          <label className="prototype-field">
            <span>
              비밀번호 <strong>*</strong>
            </span>
            <input name="password" type="password" placeholder="비밀번호를 입력하세요" autoComplete="current-password" />
          </label>
          {error && (
            <p className="prototype-login-error" role="alert">
              {error}
            </p>
          )}
          <button className="prototype-login-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <>
                <span className="prototype-login-spinner" aria-hidden="true" />
                로그인 중...
              </>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        <div className="prototype-login-links">
          <button type="button" onClick={() => navigate(withRedirect("/forgot-password", redirect))}>
            비밀번호 찾기
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate(withRedirect("/signup", redirect))}>
            회원가입
          </button>
        </div>

        <div className="prototype-login-divider">
          <span>또는</span>
        </div>

        <div className="prototype-login-socials">
          <a className="prototype-social kakao" href={appDataApi.getOAuthStartUrl("kakao", oauthRedirect)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
              <path d="M12 3C7.03 3 3 6.36 3 10.5c0 2.6 1.69 4.9 4.26 6.27-.19.7-.67 2.54-.77 2.94-.12.49.18.48.38.35.16-.1 2.5-1.69 3.51-2.37.53.08 1.08.12 1.62.12 4.97 0 9-3.36 9-7.5S16.97 3 12 3z" />
            </svg>
            카카오로 시작하기
          </a>
          <a className="prototype-social google" href={appDataApi.getOAuthStartUrl("google", oauthRedirect)}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            구글로 시작하기
          </a>
        </div>
      </div>
    </section>
  );
}

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const { signup } = useSession();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirect = getSafeRedirect(searchParams);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("이메일을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signup({ email: normalizedEmail });
      setSentEmail(result.email);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      if (detail === "Email already registered") {
        setError("이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 입력해 주세요.");
        return;
      }
      if (detail === "인증 메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.") {
        setError(detail);
        return;
      }
      setError("인증 메일을 보내지 못했어요. 입력한 이메일을 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="screen white prototype-auth-screen">
      <div className="prototype-status-bar" aria-hidden="true" />
      <div className="top-bar prototype-auth-top">
        <IconButton label="뒤로" to="/">
          <ChevronLeft size={20} />
        </IconButton>
        <h1 className="prototype-auth-top-title">
          <span aria-hidden="true">✈️</span>
          <span className="sr-only">회원가입</span>
        </h1>
        <span />
      </div>
      <div className="auth-hero compact prototype-auth-hero">
        <h2>이메일 인증 후 비밀번호를 설정해요</h2>
        <p>먼저 이메일 소유를 확인하고, 인증 링크에서 비밀번호를 입력하면 가입이 완료돼요.</p>
      </div>
      <form className="form prototype-auth-form" onSubmit={submit}>
        <label className="field">
          <span>이메일</span>
          <input
            name="email"
            type="email"
            placeholder="user@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSentEmail("");
              setError("");
            }}
          />
        </label>
        {sentEmail && (
          <div className="state-panel">
            <strong>인증 메일을 보냈어요</strong>
            <p>{sentEmail}으로 보낸 링크를 30분 안에 열고 비밀번호를 설정하면 가입이 완료돼요.</p>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button full type="submit" disabled={isSubmitting}>
          {isSubmitting ? "인증 메일 발송 중" : sentEmail ? "인증 메일 재발송" : "인증 메일 받기"}
        </Button>
      </form>
      <div className="auth-links prototype-auth-links">
        <span>이미 계정이 있나요?</span>
        <LinkButton to={withRedirect("/login", redirect)} variant="ghost">
          로그인
        </LinkButton>
      </div>
    </section>
  );
}

export function SignupVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifySignup, completeSignup } = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const attemptedTokenRef = useRef<string | null>(null);
  const redirect = getSafeRedirect(searchParams) ?? "/home";
  const token = searchParams.get("token") ?? "";

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!token) {
        setError("인증 토큰이 없어요. 이메일의 링크를 다시 확인해 주세요.");
        setIsVerifying(false);
        return;
      }
      if (attemptedTokenRef.current === token) return;
      attemptedTokenRef.current = token;
      setIsVerifying(true);
      setError("");
      try {
        const result = await verifySignup(token);
        if (!cancelled) setEmail(result.email);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "";
        if (!cancelled) {
          setError(detail === "Email already registered" ? "이미 가입된 이메일입니다. 로그인해 주세요." : "인증 링크가 만료되었거나 이미 사용되었어요. 회원가입을 다시 요청해 주세요.");
        }
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [token, verifySignup]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    setError("");

    if (password.length < 8) {
      setError("비밀번호는 8자 이상 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await completeSignup({ token, password });
      navigate(getPostAuthPath(user, redirect), { replace: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setError(detail === "Email already registered" ? "이미 가입된 이메일입니다. 로그인해 주세요." : "가입을 완료하지 못했어요. 인증 링크를 다시 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="screen white prototype-auth-screen">
      <div className="prototype-status-bar" aria-hidden="true" />
      <div className="auth-hero prototype-auth-hero">
        <div className="logo-mark">✈️</div>
        <h2>{isVerifying ? "이메일 인증을 확인하는 중입니다" : email ? "이메일 인증이 완료됐어요" : "이메일 인증이 필요해요"}</h2>
        <p>{email ? `${email} 계정에 사용할 비밀번호를 설정해 주세요.` : "인증 링크를 확인하고 다시 시도해 주세요."}</p>
      </div>
      <div className="content stack padded prototype-auth-content">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!isVerifying && email && !error && (
          <form className="form prototype-auth-form" onSubmit={submit}>
            <label className="field">
              <span>비밀번호</span>
              <input name="password" type="password" placeholder="8자 이상 입력" autoComplete="new-password" />
            </label>
            <Button full type="submit" disabled={isSubmitting}>
              {isSubmitting ? "가입 완료 중" : "비밀번호 설정하고 가입 완료"}
            </Button>
          </form>
        )}
        {!isVerifying && !email && (
          <Button full onClick={() => navigate(withRedirect("/signup", redirect))}>
            인증 메일 다시 받기
          </Button>
        )}
      </div>
    </section>
  );
}

export function NicknameSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, saveNickname } = useSession();
  const redirect = getSafeRedirect(searchParams);
  const [nickname, setNickname] = useState(currentUser?.nickname ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    setNickname(currentUser?.nickname ?? "");
  }, [currentUser?.nickname]);

  const suggestNickname = async () => {
    setError("");
    setIsSuggesting(true);
    try {
      const suggestion = await appDataApi.getNicknameSuggestion();
      setNickname(suggestion.nickname);
    } catch {
      setError("닉네임을 추천하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = nickname.trim();
    setError("");
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError("닉네임은 2자 이상 20자 이하로 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      await saveNickname(trimmed);
      navigate(redirect ?? "/profile-setup");
    } catch {
      setError("닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="screen white prototype-auth-screen">
      <div className="prototype-status-bar" aria-hidden="true" />
      <div className="top-bar prototype-auth-top">
        <IconButton label="뒤로" to={withRedirect("/signup", redirect)}>
          <ChevronLeft size={20} />
        </IconButton>
        <h1 className="prototype-auth-top-title">
          <span aria-hidden="true">✈️</span>
          <span className="sr-only">닉네임 설정</span>
        </h1>
        <span />
      </div>
      <div className="auth-hero compact prototype-auth-hero">
        <h2>Travel Hunter에서 사용할 닉네임을 정해 주세요</h2>
        <p>추천 닉네임을 그대로 쓰거나 원하는 이름으로 바꿀 수 있어요.</p>
      </div>
      <form className="form prototype-auth-form" onSubmit={submit}>
        <label className="field">
          <span>닉네임</span>
          <div className="input-action-row nickname-row">
            <input name="nickname" type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} autoComplete="nickname" />
            <button className="icon-btn" type="button" aria-label="랜덤 닉네임 추천" onClick={suggestNickname} disabled={isSaving || isSuggesting}>
              <Dice5 size={18} />
            </button>
          </div>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button full type="submit" disabled={isSaving}>
          {isSaving ? "저장 중" : "이 닉네임으로 시작하기"}
        </Button>
      </form>
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
      setMessage("비밀번호 재설정 링크를 보냈어요");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setStatus("error");
      setMessage(detail || "비밀번호 재설정 이메일을 보낼 수 없어요. 관리자에게 SMTP 설정을 확인해 주세요.");
    }
  };

  return (
    <section className="screen white prototype-auth-screen">
      <div className="prototype-status-bar" aria-hidden="true" />
      <div className="top-bar prototype-auth-top">
        <IconButton label="로그인" to={withRedirect("/login", redirect)}>
          <ChevronLeft size={20} />
        </IconButton>
        <h1 className="prototype-auth-top-title">
          <span aria-hidden="true">✈️</span>
          <span className="sr-only">비밀번호 찾기</span>
        </h1>
        <span />
      </div>
      <div className="auth-hero compact prototype-auth-hero">
        <h2>비밀번호 재설정 링크를 받을 이메일을 입력하세요</h2>
        <p>계정이 있는 이메일이면 30분 동안 사용할 수 있는 재설정 링크를 보내드려요.</p>
      </div>
      <form className="form prototype-auth-form" onSubmit={submit}>
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
      <div className="auth-links prototype-auth-links">
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
      setError("8자 이상의 새 비밀번호를 입력해 주세요.");
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
    <section className="screen white prototype-auth-screen">
      <div className="prototype-status-bar" aria-hidden="true" />
      <div className="top-bar prototype-auth-top">
        <IconButton label="로그인" to="/login">
          <ChevronLeft size={20} />
        </IconButton>
        <h1 className="prototype-auth-top-title">
          <span aria-hidden="true">✈️</span>
          <span className="sr-only">새 비밀번호 설정</span>
        </h1>
        <span />
      </div>
      <div className="auth-hero compact prototype-auth-hero">
        <h2>새 비밀번호를 설정하세요</h2>
        <p>설정이 완료되면 기존 로그인 세션은 모두 만료돼요.</p>
      </div>
      {success ? (
        <div className="content stack padded prototype-auth-content">
          <div className="state-panel">
            <strong>비밀번호를 변경했어요</strong>
            <p>새 비밀번호로 다시 로그인해 주세요.</p>
          </div>
          <Button full onClick={() => navigate("/login")}>
            로그인하러 가기
          </Button>
        </div>
      ) : (
        <form className="form prototype-auth-form" onSubmit={submit}>
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
        const user = await completeOAuthSession();
        if (!cancelled) navigate(getPostAuthPath(user, redirect), { replace: true });
      } catch {
        if (!cancelled) setError("트래블헌터 로그인 처리를 완료하지 못했어요. 다시 시도해 주세요.");
      }
    }
    void complete();
    return () => {
      cancelled = true;
    };
  }, [completeOAuthSession, navigate, redirect]);

  return (
    <section className="screen white prototype-auth-screen">
      <div className="prototype-status-bar" aria-hidden="true" />
      <div className="auth-hero prototype-auth-hero">
        <div className="logo-mark">✈️</div>
        <h2>트래블헌터 로그인을 완료하는 중입니다</h2>
        <p>잠시만 기다려 주세요.</p>
      </div>
      {error && (
        <div className="content stack padded prototype-auth-content">
          <p className="form-error" role="alert">
            {error}
          </p>
          <Button full onClick={() => navigate("/login")}>
            로그인으로 돌아가기</Button>
        </div>
      )}
    </section>
  );
}
