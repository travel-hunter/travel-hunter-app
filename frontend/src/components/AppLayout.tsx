import { CalendarDays, Home, UserRound, WalletCards } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <main className="public-layout">
      <div className="public-container">
        <Outlet />
      </div>
    </main>
  );
}

export function ServiceLayout() {
  return (
    <div className="service-layout">
      <header className="service-header">
        <Link className="brand" to="/home" aria-label="Travel Hunter home">
          <span className="brand-mark">TH</span>
          <span>Travel Hunter</span>
        </Link>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          <NavLink className={navClass} to="/home">
            홈
          </NavLink>
          <NavLink className={navClass} to="/policies">
            정책
          </NavLink>
          <NavLink className={navClass} to="/trips">
            일정
          </NavLink>
          <NavLink className={navClass} to="/mypage">
            마이
          </NavLink>
        </nav>
      </header>
      <main className="app-container">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-link active" : "nav-link";
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
