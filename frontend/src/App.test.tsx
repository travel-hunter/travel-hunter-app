import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./app/App";
import { SessionProvider } from "./app/session";

function renderRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
}

async function login() {
  const user = userEvent.setup();
  renderRoute("/login");
  await user.click(screen.getByRole("button", { name: "로그인" }));
}

describe("Travel Hunter production app", () => {
  it("renders prototype-based onboarding", () => {
    renderRoute("/");

    expect(screen.getByRole("heading", { name: /지역 정책을 먼저 찾고 여행을 시작하세요/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /이미 계정이 있어요/ })).toHaveAttribute("href", "/login");
    expect(screen.queryByText("Travel Hunter Production")).not.toBeInTheDocument();
    expect(screen.queryByText("9:41")).not.toBeInTheDocument();
    expect(screen.queryByText("5G")).not.toBeInTheDocument();
  });

  it("logs in and reaches home", async () => {
    await login();

    expect(await screen.findByRole("heading", { name: /안녕하세요/ })).toBeInTheDocument();
    expect(screen.getAllByText(/지역사랑 휴가지원/).length).toBeGreaterThan(0);
  });

  it("protects production app routes", () => {
    renderRoute("/home");

    expect(screen.getByRole("heading", { name: "다시 만난 여행 혜택을 확인하세요" })).toBeInTheDocument();
  });

  it("opens core authenticated routes", async () => {
    await login();

    cleanup();
    renderRoute("/policies");
    expect(screen.getByRole("heading", { name: "정책 목록" })).toBeInTheDocument();

    cleanup();
    renderRoute("/trips/jeju-3-days");
    expect(screen.getByRole("heading", { name: "제주 3일 여행" })).toBeInTheDocument();
  });
});
