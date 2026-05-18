import { CalendarDays, Home, UserRound, WalletCards } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

export function PublicLayout() {
  const { pathname } = useLocation();
  const isPrototypeLoginScreen =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/oauth/callback" ||
    pathname === "/onboarding";

  return (
    <main className={isPrototypeLoginScreen ? "public-layout prototype-login-layout" : "public-layout"}>
      <div className={isPrototypeLoginScreen ? "public-container prototype-login-container" : "public-container"}>
        <Outlet />
      </div>
    </main>
  );
}

export function ServiceLayout() {
  return (
    <div className="service-layout">
      <main className="app-container">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}

function tabClass({ isActive }: { isActive: boolean }) {
  return isActive ? "tab active" : "tab";
}

export function BottomTabs() {
  return (
    <nav className="bottom-tabs" aria-label="주요 메뉴">
      <NavLink className={tabClass} to="/home">
        <Home size={19} />
        <span>홈</span>
      </NavLink>
      <NavLink className={tabClass} to="/policies">
        <WalletCards size={19} />
        <span>정책</span>
      </NavLink>
      <NavLink className={tabClass} to="/trips">
        <CalendarDays size={19} />
        <span>일정</span>
      </NavLink>
      <NavLink className={tabClass} to="/mypage">
        <UserRound size={19} />
        <span>마이</span>
      </NavLink>
    </nav>
  );
}
