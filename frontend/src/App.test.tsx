import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { appDataApi, type InviteState, type NotificationSettings, type Policy, type Trip } from "./api";
import { App } from "./app/App";
import { AppProviders, AppRoot } from "./app/AppRoot";

const testEmail = "test.user@example.com";
const testPassword = "password123";

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
  await user.type(document.querySelector('input[name="email"]') as HTMLInputElement, testEmail);
  await user.type(document.querySelector('input[name="password"]') as HTMLInputElement, testPassword);
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

  it("uses selected region and duration when creating a trip", async () => {
    await login();
    cleanup();
    renderRoute("/trips/new?policySlug=local-vacation");
    const user = userEvent.setup();
    const createdTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "44",
      dates: "2026.06.15 - 06.18",
      days: { 1: [], 2: [], 3: [], 4: [] },
    };
    const createTripSpy = vi.spyOn(appDataApi, "createTrip").mockResolvedValue(createdTrip);
    const addPolicySpy = vi.spyOn(appDataApi, "addPolicyToTrip").mockResolvedValue({ tripId: "44", policyId: "local-vacation", added: true });
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(createdTrip);

    try {
      expect(document.body).toHaveTextContent("선택한 조건을 바탕으로 여행 일정을 만들어드려요.");
      expect(document.body).not.toHaveTextContent("선택한 조건을 바탕으로 제주 3일 여행 일정을 만들어드려요.");

      await user.click(screen.getByRole("button", { name: "4일" }));
      await user.click(screen.getByRole("button", { name: "부산" }));
      await user.click(screen.getByRole("button", { name: "부산 4일 일정 만들기" }));

      await waitFor(() =>
        expect(createTripSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "부산 4일 여행",
            region: "부산",
            style: expect.any(String),
            policySlug: "local-vacation",
            durationDays: 4,
          }),
        ),
      );
    } finally {
      createTripSpy.mockRestore();
      addPolicySpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("renders itinerary detail day tabs from trip data", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "부산 4일 여행",
      dates: "2026.06.15 - 06.18",
      days: { 1: [], 2: [], 3: [], 4: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");

      await waitFor(() => expect(screen.getByText("Day 4")).toBeInTheDocument());
      await userEvent.setup().click(screen.getByText("Day 4"));
      expect(document.body).toHaveTextContent("아직 추가된 장소가 없어요");
      expect(document.body).toHaveTextContent("3박 4일");
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("adds, edits, and deletes places from the itinerary detail", async () => {
    const initialTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Jeju editable trip",
      days: { 1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }] },
    };
    const addedTrip: Trip = {
      ...initialTrip,
      days: { 1: [...initialTrip.days[1], { id: "2", time: "14:30", label: "Cafe stop", meta: "Dessert" }] },
    };
    const editedTrip: Trip = {
      ...addedTrip,
      days: { 1: [{ id: "1", time: "10:15", label: "Updated peak", meta: "New memo" }, addedTrip.days[1][1]] },
    };
    const deletedTrip: Trip = {
      ...editedTrip,
      days: { 1: [editedTrip.days[1][1]] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(initialTrip);
    const addPlaceSpy = vi.spyOn(appDataApi, "addTripPlace").mockResolvedValue(addedTrip);
    const updatePlaceSpy = vi.spyOn(appDataApi, "updateTripPlace").mockResolvedValue(editedTrip);
    const deletePlaceSpy = vi.spyOn(appDataApi, "deleteTripPlace").mockResolvedValue(deletedTrip);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("Sunrise peak"));
      await user.click(document.querySelector(".dashed") as HTMLButtonElement);
      await user.type(document.querySelector('input[name="place-time"]') as HTMLInputElement, "14:30");
      await user.type(document.querySelector('input[name="place-label"]') as HTMLInputElement, "Cafe stop");
      await user.type(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement, "Dessert");
      await user.click(document.querySelector(".sheet-actions button") as HTMLButtonElement);

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith("55", 1, {
          time: "14:30",
          label: "Cafe stop",
          meta: "Dessert",
        }),
      );
      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));

      await user.click(document.querySelector(".place-actions .ghost") as HTMLButtonElement);
      await user.clear(document.querySelector('input[name="place-time"]') as HTMLInputElement);
      await user.type(document.querySelector('input[name="place-time"]') as HTMLInputElement, "10:15");
      await user.clear(document.querySelector('input[name="place-label"]') as HTMLInputElement);
      await user.type(document.querySelector('input[name="place-label"]') as HTMLInputElement, "Updated peak");
      await user.clear(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement);
      await user.type(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement, "New memo");
      await user.click(document.querySelector(".sheet-actions button") as HTMLButtonElement);

      await waitFor(() => expect(updatePlaceSpy).toHaveBeenCalledWith("55", "1", expect.objectContaining({ label: "Updated peak" })));
      await waitFor(() => expect(document.body).toHaveTextContent("Updated peak"));

      await user.click(document.querySelector(".place-actions .line") as HTMLButtonElement);
      await waitFor(() => expect(deletePlaceSpy).toHaveBeenCalledWith("55", "1"));
      expect(confirmSpy).toHaveBeenCalledWith("이 장소를 일정에서 삭제할까요?");
      await waitFor(() => expect(screen.queryByText("Updated peak")).not.toBeInTheDocument());
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
      updatePlaceSpy.mockRestore();
      deletePlaceSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it("renders viewer trips as read-only in the itinerary detail", async () => {
    const viewerTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "66",
      title: "Viewer trip",
      currentUserRole: "viewer",
      days: { 1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(viewerTrip);

    try {
      await login();
      cleanup();
      renderRoute("/trips/66");

      await waitFor(() => expect(document.body).toHaveTextContent("Sunrise peak"));
      expect(document.body).toHaveTextContent("보기 권한으로 참여 중입니다");
      expect(document.querySelector(".dashed")).toHaveAttribute("hidden");
      expect(document.querySelector(".place-actions")).toHaveAttribute("hidden");
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("adds an AI recommendation to the requested trip timeline", async () => {
    const recommendation = {
      label: "SEA",
      title: "월정리 바다 카페",
      meta: "Day 2 오후에 적합 · 이동 18분",
      reason: "비가 와도 머물기 좋고 주변 이동이 짧아요.",
    };
    const updatedTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "AI recommendation trip",
      days: { 1: [], 2: [{ id: "9", time: "", label: recommendation.title, meta: `${recommendation.meta} · ${recommendation.reason}` }] },
    };
    const listRecommendationsSpy = vi.spyOn(appDataApi, "listRecommendations").mockResolvedValue([recommendation]);
    const addPlaceSpy = vi.spyOn(appDataApi, "addTripPlace").mockResolvedValue(updatedTrip);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(updatedTrip);

    try {
      await login();
      cleanup();
      renderRoute("/ai-results?tripId=55");

      await waitFor(() => expect(listRecommendationsSpy).toHaveBeenCalledWith("55"));
      const addButton = await waitFor(() => {
        const button = document.querySelector(".result-card button");
        expect(button).toBeTruthy();
        return button as HTMLButtonElement;
      });
      await userEvent.setup().click(addButton);

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith("55", 2, {
          label: recommendation.title,
          meta: `${recommendation.meta} · ${recommendation.reason}`,
        }),
      );
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("55"));
      await userEvent.setup().click(screen.getByText("Day 2"));
      expect(document.body).toHaveTextContent(recommendation.title);
    } finally {
      listRecommendationsSpy.mockRestore();
      addPlaceSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("keeps users on AI results when adding a recommendation fails", async () => {
    const recommendation = {
      label: "FOOD",
      title: "고기국수 로컬 맛집",
      meta: "점심 대체 후보",
      reason: "예산 안에서 식사 만족도가 높아요.",
    };
    const listRecommendationsSpy = vi.spyOn(appDataApi, "listRecommendations").mockResolvedValue([recommendation]);
    const addPlaceSpy = vi.spyOn(appDataApi, "addTripPlace").mockRejectedValue(new Error("Trip not found"));
    const getTripSpy = vi.spyOn(appDataApi, "getTrip");

    try {
      await login();
      cleanup();
      renderRoute("/ai-results?tripId=55");

      const addButton = await waitFor(() => {
        const button = document.querySelector(".result-card button");
        expect(button).toBeTruthy();
        return button as HTMLButtonElement;
      });
      await userEvent.setup().click(addButton);

      await waitFor(() => expect(addPlaceSpy).toHaveBeenCalledWith("55", 1, expect.objectContaining({ label: recommendation.title })));
      await waitFor(() => expect(document.querySelector(".form-error")?.textContent).toContain("추천 장소"));
      expect(getTripSpy).not.toHaveBeenCalled();
    } finally {
      listRecommendationsSpy.mockRestore();
      addPlaceSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("deletes trips from the trips list but not from the home card", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "77",
      title: "부산 4일 여행",
      dates: "2026.06.15 - 06.18",
      days: { 1: [], 2: [], 3: [], 4: [] },
    };
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue([trip]);
    const deleteTripSpy = vi.spyOn(appDataApi, "deleteTrip").mockResolvedValue({ tripId: "77", deleted: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      await login();
      await waitFor(() => expect(document.body).toHaveTextContent("부산 4일 여행"));
      expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();

      cleanup();
      renderRoute("/trips");
      const deleteButton = await screen.findByRole("button", { name: "삭제" });
      await userEvent.setup().click(deleteButton);

      await waitFor(() => expect(deleteTripSpy).toHaveBeenCalledWith("77"));
      expect(confirmSpy).toHaveBeenCalledWith("이 일정을 삭제할까요?");
      await waitFor(() => expect(screen.queryByText("부산 4일 여행")).not.toBeInTheDocument());
      expect(document.body).toHaveTextContent("아직 등록된 일정이 없어요");
    } finally {
      listTripsSpy.mockRestore();
      deleteTripSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it("keeps a trip visible when trip deletion fails", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "88",
      title: "강원 2일 여행",
      dates: "2026.06.15 - 06.16",
      days: { 1: [], 2: [] },
    };
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue([trip]);
    const deleteTripSpy = vi.spyOn(appDataApi, "deleteTrip").mockRejectedValue(new Error("Trip not found"));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      await login();
      cleanup();
      renderRoute("/trips");
      await userEvent.setup().click(await screen.findByRole("button", { name: "삭제" }));

      await waitFor(() => expect(document.body).toHaveTextContent("일정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."));
      expect(document.body).toHaveTextContent("강원 2일 여행");
    } finally {
      listTripsSpy.mockRestore();
      deleteTripSpy.mockRestore();
      confirmSpy.mockRestore();
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

  it("edits profile preferences from my page", async () => {
    const nextProfile = {
      region: "강원",
      style: "사진",
      budget: "상관없음",
    };
    const updateProfileSpy = vi.spyOn(appDataApi, "updateProfile").mockResolvedValue(nextProfile);

    try {
      await login();
      cleanup();
      renderRoute("/mypage");
      const user = userEvent.setup();

      await user.click(await screen.findByRole("button", { name: "편집" }));
      expect(screen.getByRole("heading", { name: "프로필 편집" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: nextProfile.region }));
      await user.click(screen.getByRole("button", { name: nextProfile.style }));
      await user.click(screen.getByRole("button", { name: nextProfile.budget }));
      await user.click(screen.getByRole("button", { name: "저장하기" }));

      await waitFor(() => expect(updateProfileSpy).toHaveBeenCalledWith(nextProfile));
      await waitFor(() => expect(screen.queryByRole("heading", { name: "프로필 편집" })).not.toBeInTheDocument());
      expect(document.body).toHaveTextContent(nextProfile.region);
      expect(document.body).toHaveTextContent(nextProfile.style);
      expect(document.body).toHaveTextContent(nextProfile.budget);
    } finally {
      updateProfileSpy.mockRestore();
    }
  });

  it("toggles deadline notifications from my page", async () => {
    const enabledSettings: NotificationSettings = {
      deadlineEnabled: true,
      deadlineLeadDays: [7, 1],
    };
    const disabledSettings: NotificationSettings = {
      deadlineEnabled: false,
      deadlineLeadDays: [7, 1],
    };
    const getSettingsSpy = vi.spyOn(appDataApi, "getNotificationSettings").mockResolvedValue(enabledSettings);
    const updateSettingsSpy = vi.spyOn(appDataApi, "updateNotificationSettings").mockResolvedValue(disabledSettings);

    try {
      await login();
      cleanup();
      renderRoute("/mypage");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("정책 D-7, D-1 알림"));
      await user.click(await screen.findByRole("switch"));

      await waitFor(() => expect(updateSettingsSpy).toHaveBeenCalledWith({ deadlineEnabled: false }));
      await waitFor(() => expect(document.body).toHaveTextContent("마감 알림을 받지 않음"));
    } finally {
      getSettingsSpy.mockRestore();
      updateSettingsSpy.mockRestore();
    }
  });

  it("restores deadline notification state when saving fails", async () => {
    const enabledSettings: NotificationSettings = {
      deadlineEnabled: true,
      deadlineLeadDays: [7, 1],
    };
    const getSettingsSpy = vi.spyOn(appDataApi, "getNotificationSettings").mockResolvedValue(enabledSettings);
    const updateSettingsSpy = vi
      .spyOn(appDataApi, "updateNotificationSettings")
      .mockRejectedValue(new Error("save failed"));

    try {
      await login();
      cleanup();
      renderRoute("/mypage");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("정책 D-7, D-1 알림"));
      await user.click(await screen.findByRole("switch"));

      await waitFor(() => expect(updateSettingsSpy).toHaveBeenCalledWith({ deadlineEnabled: false }));
      await waitFor(() => expect(document.body).toHaveTextContent("알림 설정을 저장하지 못했어요."));
      expect(document.body).toHaveTextContent("정책 D-7, D-1 알림");
    } finally {
      getSettingsSpy.mockRestore();
      updateSettingsSpy.mockRestore();
    }
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

  it("saves selected invite roles from the friend invite page", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Invite role trip",
    };
    const inviteState: InviteState = {
      id: "9",
      tripId: "55",
      inviteToken: "abc",
      inviteUrl: "travelhunter.app/i/abc",
      expiresAt: "2026-06-30T00:00:00Z",
      createdAt: "2026-05-04T00:00:00Z",
      acceptedAt: null,
      invited: false,
      copied: false,
      role: "editor",
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const getInviteSpy = vi.spyOn(appDataApi, "getInviteState").mockResolvedValue(inviteState);
    const confirmInviteSpy = vi.spyOn(appDataApi, "confirmInviteSent").mockImplementation(async (tripId, role = "editor") => ({
      ...inviteState,
      tripId: tripId ?? "55",
      role,
      invited: true,
    }));

    try {
      await login();
      cleanup();
      renderRoute("/friend-invite?tripId=55");
      const user = userEvent.setup();

      await waitFor(() => expect(getInviteSpy).toHaveBeenCalledWith("55"));
      await user.click(await screen.findByRole("button", { name: /보기만 가능/ }));
      await user.click(screen.getByRole("button", { name: "친구에게 초대 보내기" }));
      await waitFor(() => expect(confirmInviteSpy).toHaveBeenCalledWith("55", "viewer"));

      await user.click(screen.getByRole("button", { name: /함께 편집/ }));
      await user.click(screen.getByRole("button", { name: "초대 완료" }));
      await waitFor(() => expect(confirmInviteSpy).toHaveBeenLastCalledWith("55", "editor"));
    } finally {
      getTripSpy.mockRestore();
      getInviteSpy.mockRestore();
      confirmInviteSpy.mockRestore();
    }
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

    const user = userEvent.setup();
    await user.type(document.querySelector('input[name="email"]') as HTMLInputElement, testEmail);
    await user.type(document.querySelector('input[name="password"]') as HTMLInputElement, testPassword);
    await user.click(document.querySelector('button[type="submit"]') as HTMLButtonElement);

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
