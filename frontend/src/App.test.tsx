import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { appDataApi, Policy } from "./api";
import { App } from "./app/App";
import { AppProviders, AppRoot } from "./app/AppRoot";

function renderRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  );
}

function getLink(href: string) {
  const link = document.querySelector(`a[href="${href}"]`);
  expect(link).toBeTruthy();
  return link as HTMLAnchorElement;
}

async function login() {
  const user = userEvent.setup();
  renderRoute("/login");
  const submit = document.querySelector('button[type="submit"]');
  expect(submit).toBeTruthy();
  await user.click(submit as HTMLButtonElement);
  await waitFor(() => expect(getLink("/policies")).toBeInTheDocument());
}

describe("Travel Hunter app", () => {
  it("renders the browser app root on a direct login entry", () => {
    window.history.pushState({}, "", "/login");
    render(<AppRoot />);

    expect(document.querySelector('input[type="email"]')).toBeTruthy();
    expect(document.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it("renders service onboarding without internal presentation chrome", () => {
    renderRoute("/");

    expect(getLink("/login")).toBeInTheDocument();
    expect(screen.queryByText(`Travel Hunter ${["Pro", "duction"].join("")}`)).not.toBeInTheDocument();
    expect(screen.queryByText("9:41")).not.toBeInTheDocument();
    expect(screen.queryByText("5G")).not.toBeInTheDocument();
    expect(screen.queryByText("WiFi")).not.toBeInTheDocument();
    expect(screen.queryByText("85%")).not.toBeInTheDocument();
  });

  it("logs in and reaches the authenticated home route", async () => {
    await login();

    expect(getLink("/trips")).toBeInTheDocument();
  });

  it("protects authenticated app routes", () => {
    renderRoute("/home");

    expect(document.querySelector('input[type="email"]')).toBeTruthy();
    expect(document.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it("opens core authenticated routes", async () => {
    await login();

    const routes = [
      "/profile-setup",
      "/home",
      "/policies",
      "/policies/local-vacation",
      "/trips",
      "/trips/new",
      "/trips/jeju-3-days",
      "/trips/1",
      "/ai-results?tripId=jeju-3-days",
      "/friend-invite?tripId=jeju-3-days",
      "/invites/jeju-3d/accept",
      "/mypage",
    ];

    for (const route of routes) {
      cleanup();
      renderRoute(route);
      expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it("filters policies by search, region, and category", async () => {
    await login();
    cleanup();
    renderRoute("/policies");
    const user = userEvent.setup();

    const searchInput = await screen.findByRole("textbox", { name: "정책 검색" });
    await waitFor(() => expect(document.body).toHaveTextContent("조건에 맞는 정책 3개"));

    await user.type(searchInput, "속초");
    await waitFor(() => expect(document.body).toHaveTextContent("속초 숙박 할인권"));
    expect(screen.queryByText("지역사랑 휴가지원")).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.click(screen.getByRole("button", { name: "부산" }));
    await waitFor(() => expect(document.body).toHaveTextContent("부산 여행 캐시백"));
    expect(screen.queryByText("속초 숙박 할인권")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "캐시백" }));
    await waitFor(() => expect(document.body).toHaveTextContent("조건에 맞는 정책 1개"));

    await user.type(searchInput, "숙박");
    await waitFor(() => expect(document.body).toHaveTextContent("검색 조건에 맞는 정책이 없어요"));

    await user.click(screen.getByRole("button", { name: "전체 보기" }));
    await waitFor(() => expect(document.body).toHaveTextContent("조건에 맞는 정책 3개"));
    expect(getLink("/policies/local-vacation")).toBeInTheDocument();
  });

  it("opens the policy trip picker and attaches a policy to a selected trip", async () => {
    await login();
    cleanup();
    renderRoute("/policies/local-vacation");

    const addButton = await waitFor(() => {
      const button = document.querySelector(".sticky-cta button");
      expect(button).toBeTruthy();
      return button as HTMLButtonElement;
    });
    await userEvent.setup().click(addButton);

    const row = await waitFor(() => {
      const tripRow = document.querySelector(".trip-select-row");
      expect(tripRow).toBeTruthy();
      return tripRow as HTMLButtonElement;
    });
    await userEvent.setup().click(row);

    await waitFor(() => expect(document.querySelector(".toast")).toBeTruthy());
  });

  it("saves a policy from the policy detail header action", async () => {
    await login();
    cleanup();
    renderRoute("/policies/local-vacation");

    const saveButton = await screen.findByRole("button", { name: "저장" });
    await userEvent.setup().click(saveButton);

    await waitFor(() => expect(document.body).toHaveTextContent("관심 정책으로 저장했어요."));
  });

  it("shows saved policies on my page and removes them", async () => {
    await login();
    cleanup();
    renderRoute("/policies/local-vacation");

    const saveButton = await waitFor(() => {
      const button = document.querySelector(".overlay-nav button.icon-btn");
      expect(button).toBeTruthy();
      return button as HTMLButtonElement;
    });
    await userEvent.setup().click(saveButton);
    await waitFor(() => expect(document.querySelector(".toast")).toBeTruthy());

    cleanup();
    renderRoute("/mypage");
    await waitFor(() => expect(getLink("/policies/local-vacation")).toBeInTheDocument());

    await userEvent.setup().click(await screen.findByRole("button", { name: "저장 해제" }));

    await waitFor(() => expect(document.querySelector('a[href="/policies/local-vacation"]')).toBeFalsy());
  });

  it("uses an official policy link when available and keeps the fallback notice otherwise", async () => {
    await login();
    cleanup();
    renderRoute("/policies/local-vacation");

    const officialUrl = "https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267";
    const officialInfoLink = await screen.findByRole("link", { name: "공식 안내 확인하기" });
    expect(officialInfoLink).toHaveAttribute("href", officialUrl);

    const applicationLink = await screen.findByRole("link", { name: "혜택 받으러 가기" });
    expect(applicationLink).toHaveAttribute("href", officialUrl);
    expect(applicationLink).toHaveAttribute("target", "_blank");
  });

  it("keeps the application notice fallback when a policy has no official links", async () => {
    const fallbackPolicy: Policy = {
      id: "no-link-policy",
      slug: "no-link-policy",
      label: "NL",
      tag: "안내 준비",
      title: "신청 링크 준비 중 정책",
      org: "Travel Hunter",
      region: "전국",
      deadline: "2026-12-31",
      amount: "확인 필요",
      summary: "공식 신청 링크가 아직 확인되지 않은 정책입니다.",
      match: 70,
      category: "추천",
      requirements: ["공식 공고 확인 필요"],
      documents: ["공식 공고 확인 필요"],
      officialUrl: null,
      applyUrl: null,
    };
    const getPolicySpy = vi.spyOn(appDataApi, "getPolicy").mockResolvedValue(fallbackPolicy);

    try {
      await login();
      cleanup();
      renderRoute("/policies/no-link-policy");
      const fallbackButton = await screen.findByRole("button", { name: "혜택 받으러 가기" });
      await userEvent.setup().click(fallbackButton);

      await waitFor(() => expect(document.body).toHaveTextContent("공식 신청 연결은 준비 중입니다."));
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("saves profile setup choices before showing the personalized home", async () => {
    await login();
    cleanup();
    renderRoute("/profile-setup");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "부산" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "맛집" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "1인 30만원 이하" }));
    await user.click(screen.getByRole("button", { name: "추천 홈 보기" }));

    await waitFor(() => expect(document.body).toHaveTextContent("부산 여행"));
  });

  it("preserves an invite redirect through login and signup navigation", async () => {
    renderRoute("/invites/jeju-3d/accept");

    expect(document.querySelector('input[type="email"]')).toBeTruthy();

    await userEvent.setup().click(screen.getByRole("button", { name: "회원가입" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "회원가입" })).toBeInTheDocument());
    const loginLink = screen.getByRole("link", { name: "로그인" });
    expect(decodeURIComponent(loginLink.getAttribute("href") ?? "")).toBe("/login?redirect=/invites/jeju-3d/accept");
  });

  it("accepts a valid invite after login and links to the joined trip", async () => {
    renderRoute("/login?redirect=/invites/jeju-3d/accept");

    await userEvent.setup().click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(document.body).toHaveTextContent("초대를 수락했어요"));
    const tripLink = await waitFor(() => {
      const link = document.querySelector('a[href^="/trips/"]');
      expect(link).toBeTruthy();
      return link as HTMLAnchorElement;
    });
    expect(tripLink.getAttribute("href")).toMatch(/^\/trips\/[1-9][0-9]*$/);
  });

  it("accepts a valid invite after signup when a redirect is present", async () => {
    renderRoute("/signup?redirect=/invites/jeju-3d/accept");

    const user = userEvent.setup();
    await user.type(document.querySelector('input[name="name"]') as HTMLInputElement, "초대 테스트 사용자");
    await user.type(
      document.querySelector('input[name="email"]') as HTMLInputElement,
      `invite-${Date.now()}@example.com`,
    );
    await user.type(document.querySelector('input[name="password"]') as HTMLInputElement, "password123");
    await user.click(screen.getByRole("button", { name: "가입하고 맞춤 설정하기" }));

    await waitFor(() => expect(document.body).toHaveTextContent("초대를 수락했어요"));
    const tripLink = await waitFor(() => {
      const link = document.querySelector('a[href^="/trips/"]');
      expect(link).toBeTruthy();
      return link as HTMLAnchorElement;
    });
    expect(tripLink.getAttribute("href")).toMatch(/^\/trips\/[1-9][0-9]*$/);
  });

  it("shows an invite error state for an unknown invite token", async () => {
    await login();
    cleanup();
    renderRoute("/invites/unknown-token/accept");

    await waitFor(() => expect(document.body).toHaveTextContent("초대 링크를 찾을 수 없어요"));
  });
});
