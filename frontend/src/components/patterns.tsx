import { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Policy } from "../api";
import { SurfaceCard } from "./ui";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function BrandMark() {
  return (
    <div className="prototype-login-logo brand-mark-compass" aria-hidden="true">
      <svg className="brand-mark-compass-ring" viewBox="0 0 56 56" fill="none" focusable="false">
        <circle className="brand-mark-orbit" cx="28" cy="28" r="22" />
        <circle className="brand-mark-inner" cx="28" cy="28" r="15.5" />
        <path className="brand-mark-needle-primary" d="M31.6 10.9 29.3 26.2 44.7 23.9 31.6 10.9Z" />
        <path className="brand-mark-needle-accent" d="M24.4 45.1 26.7 29.8 11.3 32.1 24.4 45.1Z" />
        <circle className="brand-mark-center" cx="28" cy="28" r="3.4" />
      </svg>
    </div>
  );
}

export function HomeSectionHeader({ actionLabel, title, to }: { actionLabel?: string; title: string; to?: string }) {
  return (
    <div className="ds-section-header">
      <h3>{title}</h3>
      {actionLabel && to && <Link to={to}>{actionLabel}</Link>}
    </div>
  );
}

export function ProfileSectionHeader({ actionLabel, title, to }: { actionLabel?: string; title: string; to?: string }) {
  return (
    <div className="ds-section-header ds-profile-section-header">
      <h3>{title}</h3>
      {actionLabel && to && <Link to={to}>{actionLabel}</Link>}
    </div>
  );
}

export function FavoritePolicyCard({
  icon,
  isRemoving,
  onRemove,
  policy,
}: {
  icon: string;
  isRemoving: boolean;
  onRemove: () => void;
  policy: Policy;
}) {
  return (
    <SurfaceCard as="article" className="ds-favorite-policy-card">
      <Link className="ds-favorite-policy-link" to={`/policies/${policy.slug}`}>
        <span className="ds-favorite-policy-thumb" aria-hidden="true">
          {icon}
        </span>
        <span className="ds-favorite-policy-copy">
          <strong>{policy.title}</strong>
          <small>{policy.amount}</small>
        </span>
      </Link>
      <button
        aria-label="저장 해제"
        className="btn ghost ds-favorite-policy-remove"
        disabled={isRemoving}
        onClick={onRemove}
        type="button"
      >
        {isRemoving ? "..." : "해제"}
      </button>
    </SurfaceCard>
  );
}

export function HomeRail({ ariaLabel, children, className, title }: { ariaLabel?: string; children: ReactNode; className?: string; title: string }) {
  return (
    <section className={classNames("ds-home-rail", className)} aria-label={ariaLabel ?? title}>
      <HomeSectionHeader title={title} />
      <div className="ds-home-rail-items">{children}</div>
    </section>
  );
}

export function AuthFormShell({ body, children, title }: { body?: string; children: ReactNode; title: string }) {
  return (
    <section className="ds-auth-form-shell">
      <div className="ds-auth-form-head">
        <BrandMark />
        <h1>{title}</h1>
        {body && <p>{body}</p>}
      </div>
      {children}
    </section>
  );
}

export function ProfilePanel({ children, meta, title }: { children: ReactNode; meta?: string; title: string }) {
  return (
    <SurfaceCard as="section" className="ds-profile-panel">
      <div className="ds-profile-panel-head">
        <div>
          <h2>{title}</h2>
          {meta && <p className="meta">{meta}</p>}
        </div>
      </div>
      {children}
    </SurfaceCard>
  );
}

export function ProfileSetupStep({
  body,
  children,
  eyebrow,
  title,
}: {
  body: string;
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <SurfaceCard className="ds-profile-setup-step">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="choice-grid">{children}</div>
    </SurfaceCard>
  );
}
