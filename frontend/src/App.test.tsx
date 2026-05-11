import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appDataApi, type ContactInfo, type InviteState, type NotificationSettings, type Policy, type Trip } from "./api";
import { App } from "./app/App";
import { AppProviders, AppRoot } from "./app/AppRoot";

const testEmail = "test.user@example.com";
const testPassword = "password123";

beforeEach(() => {
  window.localStorage.clear();
});

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

async function setPlaceTimeFromDefault(user: ReturnType<typeof userEvent.setup>, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const clearButton = screen.queryByRole("button", { name: "시간 비우기" }) as HTMLButtonElement | null;
  if (clearButton && !clearButton.disabled) await user.click(clearButton);

  const defaultButton = screen.queryByRole("button", { name: "09:00 설정" });
  if (defaultButton) await user.click(defaultButton);

  const hourUpButton = screen.getByRole("button", { name: "방문 시간 1시간 증가" });
  const minuteUpButton = screen.getByRole("button", { name: "방문 시간 10분 증가" });
  for (let index = 0; index < (hour - 9 + 24) % 24; index += 1) {
    await user.click(hourUpButton);
  }
  for (let index = 0; index < Math.floor(minute / 10); index += 1) {
    await user.click(minuteUpButton);
  }
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
      title: "부산 맛집 여행",
      dates: "2026.06.15 - 06.18",
      days: { 1: [], 2: [], 3: [], 4: [] },
    };
    const createTripSpy = vi.spyOn(appDataApi, "createTrip").mockResolvedValue(createdTrip);
    const addPolicySpy = vi.spyOn(appDataApi, "addPolicyToTrip").mockResolvedValue({ tripId: "44", policyId: "local-vacation", added: true });
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(createdTrip);
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue([createdTrip]);

    try {
      expect(document.body).toHaveTextContent("선택한 조건을 바탕으로 여행 일정을 만들어드려요.");
      expect(document.body).not.toHaveTextContent("선택한 조건을 바탕으로 제주 3일 여행 일정을 만들어드려요.");

      await user.click(screen.getByRole("button", { name: "4일" }));
      await user.click(screen.getByRole("button", { name: "부산" }));
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-create:local-vacation")).toContain("부산"));
      await user.click(screen.getByRole("button", { name: "부산 4일 일정 만들기" }));
      const dialog = await screen.findByRole("dialog", { name: "일정 이름을 정해주세요" });
      const titleInput = within(dialog).getByRole("textbox", { name: "일정 이름" });
      expect(titleInput).toHaveValue("부산 4일 여행");
      await user.clear(titleInput);
      await user.type(titleInput, "부산 맛집 여행");
      await user.click(within(dialog).getByRole("button", { name: "확인" }));

      await waitFor(() =>
        expect(createTripSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "부산 맛집 여행",
            region: "부산",
            style: expect.any(String),
            policySlug: "local-vacation",
            durationDays: 4,
          }),
        ),
      );
      expect(window.localStorage.getItem("travel-hunter:draft:trip-create:local-vacation")).toBeNull();

      cleanup();
      renderRoute("/trips");
      await waitFor(() => expect(screen.getByRole("heading", { name: "부산 맛집 여행", level: 4 })).toBeInTheDocument());
    } finally {
      createTripSpy.mockRestore();
      addPolicySpy.mockRestore();
      getTripSpy.mockRestore();
      listTripsSpy.mockRestore();
    }
  });

  it("cancels or blocks trip creation from the trip name dialog", async () => {
    await login();
    cleanup();
    renderRoute("/trips/new");
    const user = userEvent.setup();
    const createTripSpy = vi.spyOn(appDataApi, "createTrip").mockResolvedValue(appDataApi.getPreviewTrip());

    try {
      await user.click(screen.getByRole("button", { name: /일 일정 만들기/ }));
      const cancelDialog = await screen.findByRole("dialog", { name: "일정 이름을 정해주세요" });
      await user.click(within(cancelDialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "일정 이름을 정해주세요" })).not.toBeInTheDocument());
      expect(createTripSpy).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /일 일정 만들기/ }));
      const emptyDialog = await screen.findByRole("dialog", { name: "일정 이름을 정해주세요" });
      const titleInput = within(emptyDialog).getByRole("textbox", { name: "일정 이름" });
      await user.clear(titleInput);
      await user.click(within(emptyDialog).getByRole("button", { name: "확인" }));
      expect(await within(emptyDialog).findByText("일정 이름을 입력해 주세요.")).toBeInTheDocument();
      expect(createTripSpy).not.toHaveBeenCalled();
    } finally {
      createTripSpy.mockRestore();
    }
  });

  it("restores the trip creation draft after remounting the page", async () => {
    await login();
    cleanup();
    renderRoute("/trips/new?policySlug=local-vacation");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "5일" }));
    await user.click(screen.getByRole("button", { name: "부산" }));
    await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-create:local-vacation")).toContain("부산"));

    cleanup();
    renderRoute("/trips/new?policySlug=local-vacation");

    await waitFor(() => expect(screen.getByRole("button", { name: "부산 5일 일정 만들기" })).toBeInTheDocument());
  });

  it("shows and discards a restored trip creation draft", async () => {
    await login();
    cleanup();
    window.localStorage.setItem(
      "travel-hunter:draft:trip-create:local-vacation",
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        value: { region: "부산", style: "맛집", durationDays: 5, policySlug: "local-vacation" },
      }),
    );

    renderRoute("/trips/new?policySlug=local-vacation");
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText("작성 중이던 일정 조건을 불러왔어요.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "부산 5일 일정 만들기" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "버리기" }));

    await waitFor(() => expect(screen.queryByText("작성 중이던 일정 조건을 불러왔어요.")).not.toBeInTheDocument());
    expect(window.localStorage.getItem("travel-hunter:draft:trip-create:local-vacation")).toBeNull();
    expect(screen.getByRole("button", { name: "제주 3일 일정 만들기" })).toBeInTheDocument();
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
      days: { 1: [{ id: "1", time: "10:20", label: "Updated peak", meta: "New memo" }, addedTrip.days[1][1]] },
    };
    const deletedTrip: Trip = {
      ...editedTrip,
      days: { 1: [editedTrip.days[1][1]] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(initialTrip);
    const addPlaceSpy = vi.spyOn(appDataApi, "addTripPlace").mockResolvedValue(addedTrip);
    const updatePlaceSpy = vi.spyOn(appDataApi, "updateTripPlace").mockResolvedValue(editedTrip);
    const deletePlaceSpy = vi.spyOn(appDataApi, "deleteTripPlace").mockResolvedValue(deletedTrip);
    const confirmSpy = vi.spyOn(window, "confirm");

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("Sunrise peak"));
      await user.click(document.querySelector(".dashed") as HTMLButtonElement);
      expect(screen.getByRole("group", { name: "방문 시간 선택" })).toBeInTheDocument();
      expect(document.querySelector('input[name="place-time"]:not([type="hidden"])')).toBeNull();
      await setPlaceTimeFromDefault(user, "14:30");
      await user.type(document.querySelector('input[name="place-label"]') as HTMLInputElement, "Cafe stop");
      await user.type(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement, "Dessert");
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1")).toContain("Cafe stop"));
      await user.click(document.querySelector(".sheet-actions button") as HTMLButtonElement);

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith("55", 1, {
          time: "14:30",
          label: "Cafe stop",
          meta: "Dessert",
        }),
      );
      expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1")).toBeNull();
      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));

      await user.click(document.querySelector(".place-actions .ghost") as HTMLButtonElement);
      await setPlaceTimeFromDefault(user, "10:20");
      await user.clear(document.querySelector('input[name="place-label"]') as HTMLInputElement);
      await user.type(document.querySelector('input[name="place-label"]') as HTMLInputElement, "Updated peak");
      await user.clear(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement);
      await user.type(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement, "New memo");
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1")).toContain("Updated peak"));
      await user.click(document.querySelector(".sheet-actions button") as HTMLButtonElement);

      await waitFor(() => expect(updatePlaceSpy).toHaveBeenCalledWith("55", "1", expect.objectContaining({ label: "Updated peak", time: "10:20" })));
      expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1")).toBeNull();
      await waitFor(() => expect(document.body).toHaveTextContent("Updated peak"));

      await user.click(document.querySelector(".place-actions .line") as HTMLButtonElement);
      const deleteDialog = await screen.findByRole("dialog", { name: "장소를 삭제할까요?" });
      expect(confirmSpy).not.toHaveBeenCalled();
      await user.click(within(deleteDialog).getByRole("button", { name: "삭제" }));
      await waitFor(() => expect(deletePlaceSpy).toHaveBeenCalledWith("55", "1"));
      await waitFor(() => expect(screen.queryByText("Updated peak")).not.toBeInTheDocument());
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
      updatePlaceSpy.mockRestore();
      deletePlaceSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it("restores and clears edit-place drafts", async () => {
    const initialTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Jeju editable trip",
      days: { 1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("Sunrise peak"));
      await user.click(document.querySelector(".place-actions .ghost") as HTMLButtonElement);
      await setPlaceTimeFromDefault(user, "11:20");
      await user.clear(document.querySelector('input[name="place-label"]') as HTMLInputElement);
      await user.type(document.querySelector('input[name="place-label"]') as HTMLInputElement, "Draft peak");
      await user.clear(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement);
      await user.type(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement, "Draft memo");
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1")).toContain("Draft peak"));

      cleanup();
      renderRoute("/trips/55");
      await waitFor(() => expect(document.body).toHaveTextContent("Sunrise peak"));
      await user.click(document.querySelector(".place-actions .ghost") as HTMLButtonElement);
      expect(document.querySelector('input[name="place-time"]')).toHaveValue("11:20");
      expect(document.querySelector('input[name="place-label"]')).toHaveValue("Draft peak");
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue("Draft memo");

      await user.click(screen.getByRole("button", { name: "닫기" }));
      expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1")).toBeNull();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("restores and clears add-place drafts", async () => {
    const initialTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const addedTrip: Trip = {
      ...initialTrip,
      days: { 1: [{ id: "3", time: "16:00", label: "Tea house", meta: "Reservation" }] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(initialTrip);
    const addPlaceSpy = vi.spyOn(appDataApi, "addTripPlace").mockResolvedValue(addedTrip);

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.querySelector(".dashed")).toBeTruthy());
      await user.click(document.querySelector(".dashed") as HTMLButtonElement);
      await setPlaceTimeFromDefault(user, "23:50");
      await user.click(screen.getByRole("button", { name: "방문 시간 10분 증가" }));
      expect(document.querySelector('input[name="place-time"]')).toHaveValue("00:00");
      await setPlaceTimeFromDefault(user, "16:00");
      await user.type(document.querySelector('input[name="place-label"]') as HTMLInputElement, "Tea house");
      await user.type(document.querySelector('textarea[name="place-meta"]') as HTMLTextAreaElement, "Reservation");
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1")).toContain("Tea house"));

      cleanup();
      renderRoute("/trips/55");
      await waitFor(() => expect(document.querySelector(".dashed")).toBeTruthy());
      await user.click(document.querySelector(".dashed") as HTMLButtonElement);
      expect(document.querySelector('input[name="place-time"]')).toHaveValue("16:00");
      expect(document.querySelector('input[name="place-label"]')).toHaveValue("Tea house");
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue("Reservation");

      await user.click(document.querySelector(".sheet-actions button") as HTMLButtonElement);
      await waitFor(() => expect(addPlaceSpy).toHaveBeenCalledWith("55", 1, expect.objectContaining({ label: "Tea house" })));
      expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1")).toBeNull();

      await user.click(document.querySelector(".dashed") as HTMLButtonElement);
      await user.type(document.querySelector('input[name="place-label"]') as HTMLInputElement, "Will cancel");
      await waitFor(() => expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1")).toContain("Will cancel"));
      await user.click(screen.getByRole("button", { name: "닫기" }));
      expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1")).toBeNull();
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
    }
  });

  it("shows and discards a restored add-place draft", async () => {
    const initialTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      window.localStorage.setItem(
        "travel-hunter:draft:trip-place:55:add:1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          value: { dayNumber: 1, time: "16:00", label: "Tea house", meta: "Reservation" },
        }),
      );
      renderRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.querySelector(".dashed")).toBeTruthy());
      await user.click(document.querySelector(".dashed") as HTMLButtonElement);

      expect(screen.getByText("작성 중이던 장소 내용을 불러왔어요.")).toBeInTheDocument();
      expect(document.querySelector('input[name="place-time"]')).toHaveValue("16:00");
      expect(document.querySelector('input[name="place-label"]')).toHaveValue("Tea house");

      await user.click(screen.getByRole("button", { name: "버리기" }));

      expect(window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1")).toBeNull();
      expect(screen.queryByText("작성 중이던 장소 내용을 불러왔어요.")).not.toBeInTheDocument();
      expect(document.querySelector('input[name="place-time"]')).toHaveValue("");
      expect(document.querySelector('input[name="place-label"]')).toHaveValue("");
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue("");
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("validates place time as a 10 minute spinner value", async () => {
    const initialTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(initialTrip);
    const addPlaceSpy = vi.spyOn(appDataApi, "addTripPlace").mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");
      const user = userEvent.setup();
      window.localStorage.setItem(
        "travel-hunter:draft:trip-place:55:add:1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          value: { dayNumber: 1, time: "09:35", label: "Invalid time stop", meta: "" },
        }),
      );

      await waitFor(() => expect(document.querySelector(".dashed")).toBeTruthy());
      await user.click(document.querySelector(".dashed") as HTMLButtonElement);
      expect(document.querySelector('input[name="place-time"]')).toHaveValue("09:35");
      await user.click(document.querySelector(".sheet-actions button") as HTMLButtonElement);

      expect(addPlaceSpy).not.toHaveBeenCalled();
      expect(screen.getByText("방문 시간은 10분 단위로 선택해 주세요.")).toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
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
      expect(screen.queryByRole("button", { name: "Sunrise peak 순서 이동" })).not.toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("moves places with drag handles within a day and to another day", async () => {
    const initialTrip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Movable trip",
      days: {
        1: [
          { id: "1", time: "09:00", label: "Morning market", meta: "Breakfast" },
          { id: "2", time: "14:00", label: "Cafe stop", meta: "Dessert" },
        ],
        2: [{ id: "3", time: "10:00", label: "Beach walk", meta: "Sea" }],
      },
    };
    const movedUpTrip: Trip = {
      ...initialTrip,
      days: {
        1: [initialTrip.days[1][1], initialTrip.days[1][0]],
        2: initialTrip.days[2],
      },
    };
    const movedDayTrip: Trip = {
      ...initialTrip,
      days: {
        1: [initialTrip.days[1][0]],
        2: [initialTrip.days[2][0], initialTrip.days[1][1]],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(initialTrip);
    let resolveFirstMove: (trip: Trip) => void = () => undefined;
    const movePlaceSpy = vi
      .spyOn(appDataApi, "moveTripPlace")
      .mockImplementationOnce(() => new Promise<Trip>((resolve) => {
        resolveFirstMove = resolve;
      }))
      .mockResolvedValueOnce(movedDayTrip);

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));
      expect(screen.getByText("장소 카드의 이동 핸들로 순서를 조정할 수 있어요")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "위로" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "아래로" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "이동" })).not.toBeInTheDocument();
      const secondTimelineItem = document.querySelectorAll(".timeline-item")[1] as HTMLElement;
      const cafeDragHandle = within(secondTimelineItem).getByRole("button", { name: "Cafe stop 순서 이동" });
      expect(within(secondTimelineItem).getByText("이동")).toBeInTheDocument();
      fireEvent.keyDown(cafeDragHandle, { key: "ArrowUp" });

      await waitFor(() => expect(movePlaceSpy).toHaveBeenCalledWith("55", "2", { dayNumber: 1, position: 1 }));
      expect(await screen.findByText("이동 중")).toBeInTheDocument();
      resolveFirstMove(movedUpTrip);
      await waitFor(() => expect((document.querySelector(".place-detail h4") as HTMLElement).textContent).toBe("Cafe stop"));

      const firstTimelineItem = document.querySelectorAll(".timeline-item")[0] as HTMLElement;
      const movedCafeDragHandle = within(firstTimelineItem).getByRole("button", { name: "Cafe stop 순서 이동" });
      fireEvent.keyDown(movedCafeDragHandle, { key: "ArrowRight", shiftKey: true });

      await waitFor(() => expect(movePlaceSpy).toHaveBeenLastCalledWith("55", "2", { dayNumber: 2, position: 2 }));
      await waitFor(() => expect(screen.getByText("Day 2")).toBeInTheDocument());
      await user.click(screen.getByText("Day 2"));
      expect(document.body).toHaveTextContent("Cafe stop");
    } finally {
      getTripSpy.mockRestore();
      movePlaceSpy.mockRestore();
    }
  });

  it("shows a message when moving a place fails", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Move failure trip",
      days: {
        1: [
          { id: "1", time: "09:00", label: "Morning market", meta: "Breakfast" },
          { id: "2", time: "14:00", label: "Cafe stop", meta: "Dessert" },
        ],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const movePlaceSpy = vi.spyOn(appDataApi, "moveTripPlace").mockRejectedValue(new Error("move failed"));

    try {
      await login();
      cleanup();
      renderRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));
      const secondTimelineItem = document.querySelectorAll(".timeline-item")[1] as HTMLElement;
      const cafeDragHandle = within(secondTimelineItem).getByRole("button", { name: "Cafe stop 순서 이동" });
      fireEvent.keyDown(cafeDragHandle, { key: "ArrowUp" });

      await waitFor(() => expect(movePlaceSpy).toHaveBeenCalledWith("55", "2", { dayNumber: 1, position: 1 }));
      await waitFor(() => expect(document.body).toHaveTextContent("장소 순서를 변경하지 못했어요. 잠시 후 다시 시도해 주세요."));
      expect((document.querySelector(".place-detail h4") as HTMLElement).textContent).toBe("Morning market");
    } finally {
      getTripSpy.mockRestore();
      movePlaceSpy.mockRestore();
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
    const confirmSpy = vi.spyOn(window, "confirm");

    try {
      await login();
      await waitFor(() => expect(document.body).toHaveTextContent("부산 4일 여행"));
      expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();

      cleanup();
      renderRoute("/trips");
      const deleteButton = await screen.findByRole("button", { name: "삭제" });
      const user = userEvent.setup();
      await user.click(deleteButton);

      const cancelDialog = await screen.findByRole("dialog", { name: "일정을 삭제할까요?" });
      expect(document.body).toHaveTextContent("부산 4일 여행 일정과 연결된 장소, 초대, 정책 연결이 함께 삭제됩니다.");
      expect(confirmSpy).not.toHaveBeenCalled();
      await user.click(within(cancelDialog).getByRole("button", { name: "취소" }));
      expect(deleteTripSpy).not.toHaveBeenCalled();

      await user.click(await screen.findByRole("button", { name: "삭제" }));
      const deleteDialog = await screen.findByRole("dialog", { name: "일정을 삭제할까요?" });
      await user.click(within(deleteDialog).getByRole("button", { name: "삭제" }));

      await waitFor(() => expect(deleteTripSpy).toHaveBeenCalledWith("77"));
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
    const confirmSpy = vi.spyOn(window, "confirm");

    try {
      await login();
      cleanup();
      renderRoute("/trips");
      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: "삭제" }));
      const deleteDialog = await screen.findByRole("dialog", { name: "일정을 삭제할까요?" });
      expect(confirmSpy).not.toHaveBeenCalled();
      await user.click(within(deleteDialog).getByRole("button", { name: "삭제" }));

      await waitFor(() => expect(document.body).toHaveTextContent("일정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."));
      expect(document.body).toHaveTextContent("강원 2일 여행");
    } finally {
      listTripsSpy.mockRestore();
      deleteTripSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it("saves a draft trip confirmation from the trips list", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "91",
      title: "Draft trip",
      status: "draft",
      currentUserRole: "owner",
    };
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue([trip]);
    const updateStatusSpy = vi.spyOn(appDataApi, "updateTripStatus").mockResolvedValue({ ...trip, status: "confirmed" });

    try {
      await login();
      cleanup();
      renderRoute("/trips");
      await screen.findByText("Draft trip");
      const user = userEvent.setup();
      const saveButton = document.querySelector(".trip-confirm-panel button") as HTMLButtonElement;
      expect(saveButton).toBeDisabled();

      await user.click(document.querySelector(".trip-confirm-check input") as HTMLInputElement);
      expect(updateStatusSpy).not.toHaveBeenCalled();
      expect(saveButton).not.toBeDisabled();

      await user.click(saveButton);
      await waitFor(() => expect(updateStatusSpy).toHaveBeenCalledWith("91", { status: "confirmed" }));
      await waitFor(() => expect(document.querySelector(".trip-confirm-panel")).not.toBeInTheDocument());
      expect(document.body).toHaveTextContent("확정됨");
    } finally {
      listTripsSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("keeps draft status visible when trip confirmation saving fails", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "92",
      title: "Draft trip with error",
      status: "draft",
      currentUserRole: "owner",
    };
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue([trip]);
    const updateStatusSpy = vi.spyOn(appDataApi, "updateTripStatus").mockRejectedValue(new Error("save failed"));

    try {
      await login();
      cleanup();
      renderRoute("/trips");
      await screen.findByText("Draft trip with error");
      const user = userEvent.setup();
      await user.click(document.querySelector(".trip-confirm-check input") as HTMLInputElement);
      await user.click(document.querySelector(".trip-confirm-panel button") as HTMLButtonElement);

      await waitFor(() => expect(updateStatusSpy).toHaveBeenCalledWith("92", { status: "confirmed" }));
      expect(document.querySelector(".trip-confirm-panel")).toBeInTheDocument();
      expect(document.querySelector(".warning-text.full-row")?.textContent).toContain("일정 확정 상태");
    } finally {
      listTripsSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("hides trip confirmation controls for viewer trips", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "93",
      title: "Viewer trip",
      status: "draft",
      currentUserRole: "viewer",
    };
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue([trip]);
    const updateStatusSpy = vi.spyOn(appDataApi, "updateTripStatus").mockResolvedValue({ ...trip, status: "confirmed" });

    try {
      await login();
      cleanup();
      renderRoute("/trips");
      await screen.findByText("Viewer trip");
      expect(document.querySelector(".trip-confirm-panel")).not.toBeInTheDocument();
      expect(updateStatusSpy).not.toHaveBeenCalled();
    } finally {
      listTripsSpy.mockRestore();
      updateStatusSpy.mockRestore();
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

  it("shows policy discovery blocks and applies category shortcuts", async () => {
    await login();
    cleanup();
    renderRoute("/policies");
    const user = userEvent.setup();

    await waitFor(() => expect(document.body).toHaveTextContent("정책 탐색 바로가기"));
    expect(document.body).toHaveTextContent("매칭 높은 정책");
    expect(document.body).toHaveTextContent("마감 임박");
    expect(document.body).toHaveTextContent("혜택 유형별 보기");

    await user.click(screen.getByRole("button", { name: /캐시백 모아보기/ }));

    await waitFor(() => expect(document.body).toHaveTextContent("조건에 맞는 정책 1개"));
    expect(document.body).toHaveTextContent("부산 여행 캐시백");
    expect(screen.queryByText("정책 탐색 바로가기")).not.toBeInTheDocument();
  });

  it("interleaves deadline and recommended policy rails on home", async () => {
    await login();
    cleanup();
    renderRoute("/home");

    await waitFor(() => expect(document.body).toHaveTextContent("마감 임박 혜택"));
    expect(document.body).toHaveTextContent("추천 혜택");
    expect(screen.getByLabelText("마감 임박 정책 목록")).toBeInTheDocument();
    expect(screen.getByLabelText("추천 정책 목록")).toBeInTheDocument();
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

  it("shows a compact saved-policy error state with a recovery action on my page", async () => {
    await login();
    const listSavedPoliciesSpy = vi.spyOn(appDataApi, "listSavedPolicies").mockRejectedValue(new Error("load failed"));

    try {
      cleanup();
      renderRoute("/mypage");

      await waitFor(() => expect(document.body).toHaveTextContent("저장한 정책을 불러오지 못했어요."));
      const savedPolicyCard = screen.getByText("저장 정책").closest(".card") as HTMLElement;
      expect(savedPolicyCard).toBeTruthy();
      const alert = within(savedPolicyCard).getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(within(alert).getByRole("link", { name: "정책 찾기" })).toHaveAttribute("href", "/policies");
    } finally {
      listSavedPoliciesSpy.mockRestore();
    }
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

  it("saves a notification contact phone number from my page", async () => {
    const emptyContact: ContactInfo = {
      phoneNumber: null,
      phoneVerified: false,
    };
    const savedContact: ContactInfo = {
      phoneNumber: "01012345678",
      phoneVerified: false,
    };
    const getContactSpy = vi.spyOn(appDataApi, "getContact").mockResolvedValue(emptyContact);
    const updateContactSpy = vi.spyOn(appDataApi, "updateContact").mockResolvedValue(savedContact);

    try {
      await login();
      cleanup();
      renderRoute("/mypage");
      const user = userEvent.setup();

      const phoneInput = await screen.findByRole("textbox", { name: "전화번호" });
      await user.type(phoneInput, "010 1234 5678");
      await user.click(screen.getByRole("button", { name: "연락처 저장" }));

      await waitFor(() => expect(updateContactSpy).toHaveBeenCalledWith({ phoneNumber: "010 1234 5678" }));
      await waitFor(() => expect(phoneInput).toHaveValue("01012345678"));
      expect(document.body).toHaveTextContent("검증 전 연락처입니다");
    } finally {
      getContactSpy.mockRestore();
      updateContactSpy.mockRestore();
    }
  });

  it("shows one trip title in the my page trip summary", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "101",
      title: "부산 맛집 여행",
    };

    await login();
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue([trip]);

    try {
      cleanup();
      renderRoute("/mypage");

      await waitFor(() => expect(document.body).toHaveTextContent("부산 맛집 여행"));
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("shows the first trip title and extra count in the my page trip summary", async () => {
    const trips: Trip[] = [
      { ...appDataApi.getPreviewTrip(), id: "101", title: "부산 맛집 여행" },
      { ...appDataApi.getPreviewTrip(), id: "102", title: "강원 2일 여행" },
      { ...appDataApi.getPreviewTrip(), id: "103", title: "제주 3일 여행" },
    ];

    await login();
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockResolvedValue(trips);

    try {
      cleanup();
      renderRoute("/mypage");

      await waitFor(() => expect(document.body).toHaveTextContent("부산 맛집 여행, 그 외 2건"));
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("shows a trip summary error on my page when trips fail to load", async () => {
    await login();
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips").mockRejectedValue(new Error("load failed"));

    try {
      cleanup();
      renderRoute("/mypage");

      await waitFor(() => expect(document.body).toHaveTextContent("일정 정보를 불러오지 못했어요"));
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("keeps the notification contact form open when saving fails", async () => {
    const contact: ContactInfo = {
      phoneNumber: "01012345678",
      phoneVerified: false,
    };
    const getContactSpy = vi.spyOn(appDataApi, "getContact").mockResolvedValue(contact);
    const updateContactSpy = vi
      .spyOn(appDataApi, "updateContact")
      .mockRejectedValue(new Error("save failed"));

    try {
      await login();
      cleanup();
      renderRoute("/mypage");
      const user = userEvent.setup();

      const phoneInput = await screen.findByRole("textbox", { name: "전화번호" });
      await user.clear(phoneInput);
      await user.click(screen.getByRole("button", { name: "연락처 저장" }));

      await waitFor(() => expect(updateContactSpy).toHaveBeenCalledWith({ phoneNumber: null }));
      await waitFor(() => expect(document.body).toHaveTextContent("연락처를 저장하지 못했어요."));
    } finally {
      getContactSpy.mockRestore();
      updateContactSpy.mockRestore();
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

  it("shows a policy condition summary with region alignment guidance", async () => {
    await login();
    cleanup();
    renderRoute("/policies/local-vacation");

    await waitFor(() => expect(document.body).toHaveTextContent("조건 확인 요약"));
    expect(document.body).toHaveTextContent("신청 전 확인해 주세요");
    expect(document.body).toHaveTextContent("지역 조건 일치");
    expect(document.body).toHaveTextContent("국내 거주자");
    expect(document.body).toHaveTextContent("서류 준비 필요");
    expect(document.body).toHaveTextContent("공식 안내에서 최종 확인이 필요해요");
  });

  it("shows a region check warning when the policy region differs from the profile", async () => {
    const busanPolicy: Policy = {
      id: "busan-only",
      slug: "busan-only",
      label: "BS",
      tag: "지역 조건",
      title: "부산 전용 여행 지원",
      org: "부산관광재단",
      region: "부산",
      deadline: "2026-09-30",
      amount: "5만원 지원",
      summary: "부산 여행자 대상 정책입니다.",
      match: 72,
      category: "추천",
      requirements: ["부산 여행", "사전 예약"],
      documents: ["예약 내역"],
      officialUrl: null,
      applyUrl: null,
    };
    const getPolicySpy = vi.spyOn(appDataApi, "getPolicy").mockResolvedValue(busanPolicy);

    try {
      await login();
      cleanup();
      renderRoute("/policies/busan-only");

      await waitFor(() => expect(document.body).toHaveTextContent("지역 조건 확인 필요"));
      expect(document.body).toHaveTextContent("내 관심 지역은 제주, 정책 지역은 부산입니다.");
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("opens policy FAQ answers with accessible accordion state", async () => {
    await login();
    cleanup();
    renderRoute("/policies/local-vacation");
    const user = userEvent.setup();

    const documentQuestion = await screen.findByRole("button", { name: /어떤 서류가 필요한가요/ });
    expect(documentQuestion).toHaveAttribute("aria-expanded", "false");
    expect(document.body).not.toHaveTextContent("정책별 접수처에서 원본, 사본, 파일 형식을 다시 확인해 주세요.");

    await user.click(documentQuestion);

    expect(documentQuestion).toHaveAttribute("aria-expanded", "true");
    expect(document.body).toHaveTextContent("신분증 사본, 숙박 영수증, 교통비 증빙 준비가 필요할 수 있어요.");
    expect(document.body).toHaveTextContent("정책별 접수처에서 원본, 사본, 파일 형식을 다시 확인해 주세요.");
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
      await user.click(screen.getByRole("button", { name: "초대 링크 활성화" }));
      await waitFor(() => expect(confirmInviteSpy).toHaveBeenCalledWith("55", "viewer"));

      await user.click(screen.getByRole("button", { name: /함께 편집/ }));
      await user.click(screen.getByRole("button", { name: "초대 링크 준비 완료" }));
      await waitFor(() => expect(confirmInviteSpy).toHaveBeenLastCalledWith("55", "editor"));
    } finally {
      getTripSpy.mockRestore();
      getInviteSpy.mockRestore();
      confirmInviteSpy.mockRestore();
    }
  });

  it("requests a password reset email from the forgot password page", async () => {
    const requestSpy = vi.spyOn(appDataApi, "requestPasswordReset").mockResolvedValue({ requested: true });

    try {
      renderRoute("/forgot-password");
      const user = userEvent.setup();

      await user.type(screen.getByRole("textbox", { name: "이메일" }), testEmail);
      await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));

      await waitFor(() => expect(requestSpy).toHaveBeenCalledWith({ email: testEmail }));
      expect(document.body).toHaveTextContent("비밀번호 재설정 링크를 보냈어요");
    } finally {
      requestSpy.mockRestore();
    }
  });

  it("confirms a password reset token and links back to login", async () => {
    const confirmSpy = vi.spyOn(appDataApi, "confirmPasswordReset").mockResolvedValue({ reset: true });

    try {
      renderRoute("/reset-password?token=abc123");
      const user = userEvent.setup();

      await user.type(document.querySelector('input[name="password"]') as HTMLInputElement, "new-password123");
      await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));

      await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith({ token: "abc123", newPassword: "new-password123" }));
      expect(document.body).toHaveTextContent("비밀번호를 변경했어요");
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it("links social login buttons to backend OAuth start routes", () => {
    const kakaoUrl = "http://127.0.0.1:8000/api/auth/oauth/kakao/start?redirect=%2Fhome";
    const googleUrl = "http://127.0.0.1:8000/api/auth/oauth/google/start?redirect=%2Fhome";
    const oauthSpy = vi.spyOn(appDataApi, "getOAuthStartUrl").mockImplementation((provider) => (provider === "kakao" ? kakaoUrl : googleUrl));

    try {
      renderRoute("/login");

      expect(screen.getByRole("link", { name: "카카오로 로그인" })).toHaveAttribute("href", kakaoUrl);
      expect(screen.getByRole("link", { name: "Google로 로그인" })).toHaveAttribute("href", googleUrl);
    } finally {
      oauthSpy.mockRestore();
    }
  });

  it("shares the current policy URL through Web Share API", async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const navigatorPrototype = Object.getPrototypeOf(window.navigator) as Navigator & { share?: typeof shareSpy };
    const originalShareDescriptor = Object.getOwnPropertyDescriptor(navigatorPrototype, "share");
    Object.defineProperty(navigatorPrototype, "share", { configurable: true, value: shareSpy });

    try {
      await login();
      cleanup();
      renderRoute("/policies/local-vacation");

      await userEvent.setup().click(await screen.findByRole("button", { name: "공유" }));

      expect(screen.queryByRole("link", { name: /친구 초대/ })).not.toBeInTheDocument();
      await waitFor(() => expect(shareSpy).toHaveBeenCalled());
      await waitFor(() => expect(document.body).toHaveTextContent("정책 링크를 공유했어요"));
    } finally {
      if (originalShareDescriptor) {
        Object.defineProperty(navigatorPrototype, "share", originalShareDescriptor);
      } else {
        Reflect.deleteProperty(navigatorPrototype, "share");
      }
    }
  });

  it("renders policy documents as static checklist rows", async () => {
    await login();
    cleanup();
    renderRoute("/policies/local-vacation");

    await waitFor(() => expect(document.body).toHaveTextContent("필요 서류"));
    expect(document.querySelectorAll(".check-item").length).toBeGreaterThan(0);
    expect(document.querySelector(".check-item")?.tagName).toBe("DIV");
  });

  it("opens an AI recommendation criteria sheet", async () => {
    await login();
    cleanup();
    renderRoute("/ai-results?tripId=jeju-3-days");

    await userEvent.setup().click(await screen.findByRole("button", { name: "추천 기준" }));

    expect(screen.getByRole("dialog", { name: "AI 추천 기준" })).toBeInTheDocument();
    expect(document.body).toHaveTextContent("정책 조건");
    expect(document.body).toHaveTextContent("이동 거리");
  });

  it("preserves an invite redirect through login and signup navigation", async () => {
    renderRoute("/invites/jeju-3d/accept");

    expect(document.querySelector('input[type="email"]')).toBeTruthy();

    await userEvent.setup().click(screen.getByRole("button", { name: "회원가입" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "회원가입" })).toBeInTheDocument());
    const loginLink = screen.getByRole("link", { name: "로그인" });
    expect(decodeURIComponent(loginLink.getAttribute("href") ?? "")).toBe("/login?redirect=/invites/jeju-3d/accept");
  });

  it("shares the invite link from the friend invite page", async () => {
    const trip: Trip = {
      ...appDataApi.getPreviewTrip(),
      id: "55",
      title: "Invite share trip",
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

    try {
      await login();
      cleanup();
      renderRoute("/friend-invite?tripId=55");

      await waitFor(() => expect(getInviteSpy).toHaveBeenCalledWith("55"));
      await userEvent.setup().click(await screen.findByRole("button", { name: "링크 복사" }));

      await waitFor(() => expect(screen.getByRole("button", { name: "복사됨" })).toBeInTheDocument());
      await waitFor(() => expect(document.querySelector(".toast")).toBeTruthy());
    } finally {
      getTripSpy.mockRestore();
      getInviteSpy.mockRestore();
    }
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
    const email = `invite-${Date.now()}@example.com`;
    await user.type(
      document.querySelector('input[name="email"]') as HTMLInputElement,
      email,
    );
    const emailCheckButton = document.querySelector(".input-action-row button[type='button']");
    expect(emailCheckButton).toBeTruthy();
    await user.click(emailCheckButton as HTMLButtonElement);
    await waitFor(() => expect(document.body).toHaveTextContent("사용할 수 있는 이메일입니다."));
    await user.type(document.querySelector('input[name="password"]') as HTMLInputElement, "password123");
    await user.click(document.querySelector('button[type="submit"]') as HTMLButtonElement);

    const nicknameInput = await waitFor(() => {
      const input = document.querySelector('input[name="nickname"]');
      expect(input).toBeTruthy();
      return input as HTMLInputElement;
    });
    await user.clear(nicknameInput);
    await user.type(nicknameInput, "초대테스트");
    await user.click(document.querySelector('button[type="submit"]') as HTMLButtonElement);

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
