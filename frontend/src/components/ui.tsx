import { ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonVariant = "primary" | "secondary" | "ghost" | "line";

export function Button({
  children,
  variant = "primary",
  full = false,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  full?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button className={`btn ${variant} ${full ? "full" : ""}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  to,
  variant = "primary",
  full = false,
}: {
  children: ReactNode;
  to: string;
  variant?: ButtonVariant;
  full?: boolean;
}) {
  return (
    <Link className={`btn ${variant} ${full ? "full" : ""}`} to={to}>
      {children}
    </Link>
  );
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "primary" | "warning" | "gray" }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

export function TopBar({
  title,
  left,
  right,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="top-bar">
      <div>{left}</div>
      <h1>{title}</h1>
      <div className="top-right">{right}</div>
    </div>
  );
}

export function PageHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

export function IconButton({ children, to, label, onClick }: { children: ReactNode; to?: string; label: string; onClick?: () => void }) {
  if (to) {
    return (
      <Link className="icon-btn" to={to} aria-label={label}>
        {children}
      </Link>
    );
  }

  return (
    <button className="icon-btn" onClick={onClick} type="button" aria-label={label}>
      {children}
    </button>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p>{body}</p>
      {action}
    </section>
  );
}

export function LoadingState({ label = "정보를 불러오는 중입니다" }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <span className="spinner" />
      <strong>{label}</strong>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state-panel error" role="alert">
      <strong>잠깐 문제가 생겼어요</strong>
      <p>{message}</p>
    </div>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="toast" role="status">
      {children}
    </div>
  );
}
