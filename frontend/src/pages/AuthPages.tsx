import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft, Dice5 } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "error">("idle");
  const [checkedEmail, setCheckedEmail] = useState("");
  const redirect = getSafeRedirect(searchParams);
  const emailAvailable = emailStatus === "available" && checkedEmail === email.trim().toLowerCase();

  const checkEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    if (!normalizedEmail) {
      setError("이메일을 입력해 주세요.");
      return;
    }
    setEmailStatus("checking");
    try {
      const result = await appDataApi.checkEmailAvailability({ email: normalizedEmail });
      setCheckedEmail(normalizedEmail);
      setEmailStatus(result.available ? "available" : "unavailable");
    } catch {
      setEmailStatus("error");
      setError("이메일 중복 확인을 하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!normalizedEmail || password.length < 8) {
      setError("이메일과 8자 이상 비밀번호를 입력해 주세요.");
      return;
    }
    if (!emailAvailable) {
      setError("이메일 중복 확인을 해주세요.");
      return;
    }

    try {
      await signup({
        email: normalizedEmail,
        password,
      });
      navigate(withRedirect("/nickname-setup", redirect));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      if (detail === "Email already registered") {
        setEmailStatus("unavailable");
        setCheckedEmail(normalizedEmail);
        setError("이미 가입된 이메일입니다.");
        return;
      }
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
          <span>이메일</span>
          <div className="input-action-row">
            <input
              name="email"
              type="email"
              placeholder="user@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailStatus("idle");
                setCheckedEmail("");
              }}
            />
            <button className="btn sm line" type="button" onClick={checkEmail} disabled={emailStatus === "checking"}>
              {emailStatus === "checking" ? "확인 중" : "중복 확인"}
            </button>
          </div>
        </label>
        {emailStatus === "available" && <p className="form-success">사용할 수 있는 이메일입니다.</p>}
        {emailStatus === "unavailable" && <p className="form-error">이미 가입된 이메일입니다.</p>}
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
          가입하고 닉네임 정하기
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
    <section className="screen white">
      <div className="top-bar">
        <IconButton label="뒤로" to={withRedirect("/signup", redirect)}>
          <ChevronLeft size={20} />
        </IconButton>
        <h1>닉네임 설정</h1>
        <span />
      </div>
      <div className="auth-hero compact">
        <div className="logo-mark">TH</div>
        <h2>Travel Hunter에서 사용할 닉네임을 정해 주세요</h2>
        <p>추천 닉네임을 그대로 쓰거나 원하는 이름으로 바꿀 수 있어요.</p>
      </div>
      <form className="form" onSubmit={submit}>
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
