import { CalendarDays, Home, Search, UserRound, WalletCards } from "lucide-react";
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
      <TopNavigation />
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

function topTabClass({ isActive }: { isActive: boolean }) {
  return isActive ? "top-tab active" : "top-tab";
}

function TopNavigation() {
  return (
    <header className="service-top-navigation" aria-label="데스크톱 주요 메뉴">
      <div className="service-top-brand">
        <span className="service-top-brand-mark" aria-hidden="true">
          ✈️
        </span>
        <span className="service-top-brand-copy">
          <strong>Travel Hunter</strong>
        </span>
      </div>
      <div className="service-top-search" aria-hidden="true">
        <Search size={15} />
        <span>지역, 정책, 일정 검색</span>
      </div>
      <nav className="top-tabs" aria-label="주요 메뉴">
        <NavLink className={topTabClass} to="/home">
          <Home size={17} />
          <span>홈</span>
        </NavLink>
        <NavLink className={topTabClass} to="/policies">
          <WalletCards size={17} />
          <span>정책</span>
        </NavLink>
        <NavLink className={topTabClass} to="/trips">
          <CalendarDays size={17} />
          <span>일정</span>
        </NavLink>
        <NavLink className={topTabClass} to="/mypage">
          <UserRound size={17} />
          <span>마이</span>
        </NavLink>
      </nav>
    </header>
  );
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
