import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  appDataApi,
  type ContactInfo,
  type InviteState,
  type LinkedTripPolicy,
  type NotificationSettings,
  type Policy,
  type RegionRecommendation,
  type Trip,
} from "./api";
import { App } from "./app/App";
import { AppProviders, AppRoot } from "./app/AppRoot";
import {
  examplePolicyDetail,
  examplePolicyPath,
  examplePolicySlug,
  examplePolicyTitle,
  getBusanTravelAreaResponse,
  getGangneungTravelAreaResponse,
  getGangwonTravelAreaResponse,
  getGyeongjuTravelAreaResponse,
  getJejuTravelAreaResponse,
  getPreviewTrip,
  getPreviewUser,
  getSokchoTravelAreaResponse,
  testEmail,
  testIsoDateFromToday,
  testPassword,
} from "./test/fixtures";
import { installAppKakaoSdkMock } from "./test/kakaoMock";
import { getLink, login, renderAppRoute } from "./test/renderAppRoute";

async function setPlaceTimeFromDefault(
  user: ReturnType<typeof userEvent.setup>,
  time: string,
) {
  const [hour, minute] = time.split(":").map(Number);
  const clearButton = screen.queryByRole("button", {
    name: "시간 비우기",
  }) as HTMLButtonElement | null;
  if (clearButton && !clearButton.disabled) await user.click(clearButton);

  const defaultButton = screen.queryByRole("button", { name: "09:00 설정" });
  if (defaultButton) await user.click(defaultButton);

  const hourUpButton = screen.getByRole("button", {
    name: "방문 시간 1시간 증가",
  });
  const minuteUpButton = screen.getByRole("button", {
    name: "방문 시간 10분 증가",
  });
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
    expect(document.querySelector("main")).toHaveClass(
      "prototype-login-layout",
    );
    expect(document.querySelector(".prototype-login-screen")).toBeTruthy();
  });

  it("renders the prototype login screen as the first entry page", () => {
    renderAppRoute("/");

    expect(
      screen.getByRole("heading", { name: "트래블헌터" }),
    ).toBeInTheDocument();
    expect(screen.getByText("숨은 여행 혜택을 사냥하세요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "카카오로 시작하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "구글로 시작하기" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".ds-auth-form-shell")).toBeTruthy();
    expect(document.querySelector(".brand-mark-compass")).toBeTruthy();
    expect(
      document.querySelector(".prototype-login-logo"),
    ).not.toHaveTextContent("TH");
    expect(document.querySelector("main")).toHaveClass(
      "prototype-login-layout",
    );
    expect(
      screen.queryByText(`Travel Hunter ${["Pro", "duction"].join("")}`),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("9:41")).not.toBeInTheDocument();
    expect(screen.queryByText("5G")).not.toBeInTheDocument();
    expect(screen.queryByText("WiFi")).not.toBeInTheDocument();
    expect(screen.queryByText("85%")).not.toBeInTheDocument();
  });

  it("redirects the removed onboarding route to the login entry", () => {
    renderAppRoute("/onboarding");

    expect(
      screen.getByRole("heading", { name: "트래블헌터" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(document.querySelector("main")).toHaveClass(
      "prototype-login-layout",
    );
  });

  it("logs in and reaches the authenticated home route", async () => {
    await login();

    expect(getLink("/trips")).toBeInTheDocument();
  });

  it("waits for refresh-cookie session bootstrap before redirecting protected routes", async () => {
    const refreshSpy = vi
      .spyOn(appDataApi, "refreshSession")
      .mockImplementation(() => new Promise(() => {}));

    try {
      renderAppRoute("/home");

      expect(screen.getByText("세션을 확인하는 중입니다")).toBeInTheDocument();
      expect(document.querySelector('input[type="email"]')).toBeNull();
      expect(document.body.textContent).not.toContain("redirect=");
    } finally {
      refreshSpy.mockRestore();
    }
  });

  it("protects authenticated app routes after session bootstrap fails", async () => {
    const refreshSpy = vi
      .spyOn(appDataApi, "refreshSession")
      .mockRejectedValue(new Error("missing refresh cookie"));

    try {
      renderAppRoute("/home");

      await waitFor(() =>
        expect(document.querySelector('input[type="email"]')).toBeTruthy(),
      );
      expect(document.querySelector('button[type="submit"]')).toBeTruthy();
    } finally {
      refreshSpy.mockRestore();
    }
  });

  it("protects authenticated app routes", async () => {
    renderAppRoute("/home");

    await waitFor(() =>
      expect(document.querySelector('input[type="email"]')).toBeTruthy(),
    );
    expect(document.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it("opens core authenticated routes", async () => {
    await login();

    const routes = [
      "/profile-setup",
      "/home",
      "/policies",
      examplePolicyPath,
      "/trips",
      "/trips/new",
      "/trips/1",
      "/ai-results?tripId=1",
      "/friend-invite?tripId=1",
      "/invites/jeju-3d/accept",
      "/mypage",
    ];

    for (const route of routes) {
      cleanup();
      renderAppRoute(route);
      expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses selected dates and shows generated itinerary times when creating a trip", async () => {
    await login();
    cleanup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getJejuTravelAreaResponse());
    renderAppRoute(
      `/trips/new?policySlug=${encodeURIComponent(examplePolicySlug)}`,
    );
    const user = userEvent.setup();
    const createdTrip: Trip = {
      ...getPreviewTrip(),
      id: "44",
      title: "부산 맛집 여행",
      dates: "2026.07.12 - 07.15",
      participantCount: 3,
      days: {
        1: [
          {
            id: "441",
            time: "10:00",
            label: "자갈치시장",
            meta: "맛집 · 해산물",
          },
          {
            id: "442",
            time: "14:00",
            label: "부평깡통시장",
            meta: "맛집 · 시장",
          },
          {
            id: "443",
            time: "18:00",
            label: "돼지국밥 거리",
            meta: "맛집 · 향토음식",
          },
        ],
        2: [
          {
            id: "444",
            time: "10:00",
            label: "해리단길 맛집",
            meta: "맛집 · 골목",
          },
          {
            id: "445",
            time: "14:00",
            label: "기장 해산물 식당",
            meta: "맛집 · 바다",
          },
          {
            id: "446",
            time: "18:00",
            label: "광안리 해변 산책",
            meta: "휴식 · 해변",
          },
        ],
        3: [
          {
            id: "447",
            time: "10:00",
            label: "송정 해변 카페",
            meta: "휴식 · 카페",
          },
          {
            id: "448",
            time: "14:00",
            label: "민락수변공원",
            meta: "휴식 · 야경",
          },
          {
            id: "449",
            time: "18:00",
            label: "해운대 블루라인파크",
            meta: "휴식 · 전망",
          },
        ],
        4: [
          {
            id: "450",
            time: "10:00",
            label: "온천천 카페 거리",
            meta: "휴식 · 산책",
          },
          {
            id: "451",
            time: "14:00",
            label: "영화의전당",
            meta: "체험 · 문화",
          },
          {
            id: "452",
            time: "18:00",
            label: "부산시민공원 공방",
            meta: "체험 · 공방",
          },
        ],
      },
    };
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockResolvedValue(createdTrip);
    const addPolicySpy = vi
      .spyOn(appDataApi, "addPolicyToTrip")
      .mockResolvedValue({
        tripId: "44",
        policyId: examplePolicySlug,
        added: true,
      });
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(createdTrip);
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([createdTrip]);

    try {
      expect(
        screen.getByRole("heading", { name: "여행 지역 선택" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("선택한 정책을 새 일정에 연결할게요"),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /제주 전체/ })).toHaveClass(
          "active",
        ),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(
        screen.getByRole("heading", { name: "코스 취향 선택" }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "휴식" })).toHaveAttribute(
          "aria-pressed",
          "true",
        ),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(
        screen.getByRole("heading", { name: "여행 기간 선택" }),
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("출발일"), {
        target: { value: "2026-07-12" },
      });
      fireEvent.change(screen.getByLabelText("도착일"), {
        target: { value: "2026-07-15" },
      });
      expect(screen.getByText("총 4일 여행")).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "여행 인원 1명 늘리기" }),
      );
      await user.click(
        screen.getByRole("button", { name: "여행 인원 1명 늘리기" }),
      );
      expect(screen.getAllByText("3명").length).toBeGreaterThan(0);
      await user.click(screen.getByRole("button", { name: "다음" }));

      expect(
        screen.getByRole("heading", { name: "일정 제목 입력" }),
      ).toBeInTheDocument();
      expect(screen.getByText("인원 · 3명")).toBeInTheDocument();
      const titleInput = screen.getByRole("textbox", { name: "일정 제목" });
      expect((titleInput as HTMLInputElement).value).toMatch(/^.+ \d일 여행$/);
      await user.clear(titleInput);
      await user.type(titleInput, "부산 맛집 여행");
      await user.click(screen.getByRole("button", { name: "일정 만들기" }));

      await waitFor(() =>
        expect(createTripSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "부산 맛집 여행",
            region: expect.any(String),
            participantCount: 3,
            style: expect.any(String),
            policySlug: examplePolicySlug,
            startDate: "2026-07-12",
            endDate: "2026-07-15",
          }),
        ),
      );
      await expect(screen.findAllByText("10:00")).resolves.not.toHaveLength(0);
      await expect(screen.findAllByText("14:00")).resolves.not.toHaveLength(0);
      await expect(screen.findAllByText("18:00")).resolves.not.toHaveLength(0);
      expect(
        screen.getByRole("link", { name: "✨ 추천 후보 추가" }),
      ).toHaveAttribute("href", "/ai-results?tripId=44");

      cleanup();
      renderAppRoute("/trips");
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: "부산 맛집 여행", level: 4 }),
        ).toBeInTheDocument(),
      );
      expect(screen.getByText(/👥 3명 참여/)).toBeInTheDocument();
    } finally {
      createTripSpy.mockRestore();
      addPolicySpy.mockRestore();
      getTripSpy.mockRestore();
      listTripsSpy.mockRestore();
      travelAreasSpy.mockRestore();
    }
  });

  it("keeps trip participant selection between 1 and 6 on the date step", async () => {
    await login();
    cleanup();
    const user = userEvent.setup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getJejuTravelAreaResponse());

    try {
      renderAppRoute("/trips/new");
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /제주 전체/ })).toHaveClass(
          "active",
        ),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));

      const decrease = screen.getByRole("button", {
        name: "여행 인원 1명 줄이기",
      });
      const increase = screen.getByRole("button", {
        name: "여행 인원 1명 늘리기",
      });
      expect(decrease).toBeDisabled();

      for (let count = 0; count < 5; count += 1) {
        await user.click(increase);
      }

      expect(screen.getAllByText("6명").length).toBeGreaterThan(0);
      expect(increase).toBeDisabled();
    } finally {
      travelAreasSpy.mockRestore();
    }
  });

  it("uses the home recommendation region query when creating a trip", async () => {
    await login();
    cleanup();
    renderAppRoute("/trips/new?region=%EB%B6%80%EC%82%B0");
    const user = userEvent.setup();
    const createdTrip: Trip = {
      ...getPreviewTrip(),
      id: "45",
      title: "부산 추천 여행",
      dates: "2026.06.15 - 06.17",
      days: {
        1: [
          {
            id: "451",
            time: "10:00",
            label: "자갈치시장",
            meta: "맛집 · 해산물",
          },
        ],
        2: [],
        3: [],
      },
    };
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockResolvedValue(createdTrip);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(createdTrip);

    try {
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /부산/ })).toHaveClass(
          "active",
        ),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      const titleInput = screen.getByRole("textbox", { name: "일정 제목" });
      await user.clear(titleInput);
      await user.type(titleInput, "부산 추천 여행");
      await user.click(screen.getByRole("button", { name: "일정 만들기" }));

      await waitFor(() =>
        expect(createTripSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "부산 추천 여행",
            region: "부산 전체",
            travelAreaId: "busan-all",
          }),
        ),
      );
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("45"));
    } finally {
      createTripSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("preselects a travelAreaId query travel-area when creating a trip", async () => {
    await login();
    cleanup();
    const user = userEvent.setup();
    const createdTrip: Trip = {
      ...getPreviewTrip(),
      id: "47",
      title: "속초 여행",
      dates: "2026.06.15 - 06.17",
      days: { 1: [], 2: [], 3: [] },
    };
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValueOnce(getGangwonTravelAreaResponse())
      .mockResolvedValue(getBusanTravelAreaResponse());
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockResolvedValue(createdTrip);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(createdTrip);

    try {
      renderAppRoute("/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang");
      expect(
        await screen.findByRole("button", { name: /속초·고성·양양/ }),
      ).toHaveClass("active");
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "일정 만들기" }));

      await waitFor(() =>
        expect(createTripSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            region: "속초·고성·양양",
            travelAreaId: "gangwon-sokcho-goseong-yangyang",
          }),
        ),
      );
      expect(travelAreasSpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: "gangwon-sokcho-goseong-yangyang" }),
      );
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("47"));
    } finally {
      travelAreasSpy.mockRestore();
      createTripSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("shows 강원 travel-area choices for the legacy region query", async () => {
    await login();
    cleanup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getGangwonTravelAreaResponse());

    try {
      renderAppRoute("/trips/new?region=%EA%B0%95%EC%9B%90");
      expect(
        await screen.findByRole("heading", { name: "강원 세부 지역 선택" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /속초·고성·양양/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /강릉·동해·삼척/ }),
      ).toBeInTheDocument();
      expect(travelAreasSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sido: "강원" }),
      );
    } finally {
      travelAreasSpy.mockRestore();
    }
  });

  it("shows broad region selection first without course preference choices", async () => {
    await login();
    cleanup();

    renderAppRoute("/trips/new");

    expect(await screen.findByText("여행 지역 선택")).toBeInTheDocument();
    expect(screen.queryByText("코스 취향 선택")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /강원/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /전남/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /경남/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^강릉$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^경주$/ }),
    ).not.toBeInTheDocument();
  });

  it("resolves the default primary region into a travel-area candidate", async () => {
    await login();
    cleanup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getJejuTravelAreaResponse());

    try {
      renderAppRoute("/trips/new");

      expect(
        await screen.findByRole("button", { name: /제주 전체/ }),
      ).toHaveClass("active");
      expect(travelAreasSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sido: "제주" }),
      );
      expect(screen.queryByText("코스 취향 선택")).not.toBeInTheDocument();
    } finally {
      travelAreasSpy.mockRestore();
    }
  });

  it("resolves a legacy city region query through travel-area search", async () => {
    await login();
    cleanup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getGyeongjuTravelAreaResponse());

    try {
      renderAppRoute("/trips/new?region=%EA%B2%BD%EC%A3%BC");

      expect(await screen.findByRole("button", { name: /경주/ })).toHaveClass(
        "active",
      );
      expect(travelAreasSpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: "경주" }),
      );
      expect(screen.queryByText("코스 취향 선택")).not.toBeInTheDocument();
    } finally {
      travelAreasSpy.mockRestore();
    }
  });

  it("resolves the legacy Sokcho region query from home destination links", async () => {
    await login();
    cleanup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getSokchoTravelAreaResponse());

    try {
      renderAppRoute("/trips/new?region=%EC%86%8D%EC%B4%88");

      expect(
        await screen.findByRole("button", { name: /속초·고성·양양/ }),
      ).toHaveClass("active");
      expect(travelAreasSpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: "속초" }),
      );
      expect(screen.queryByText("코스 취향 선택")).not.toBeInTheDocument();
    } finally {
      travelAreasSpy.mockRestore();
    }
  });

  it("resolves the legacy Gangneung region query through travel-area search", async () => {
    await login();
    cleanup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getGangneungTravelAreaResponse());

    try {
      renderAppRoute("/trips/new?region=%EA%B0%95%EB%A6%89");

      expect(
        await screen.findByRole("button", { name: /강릉·동해·삼척/ }),
      ).toHaveClass("active");
      expect(travelAreasSpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: "강릉" }),
      );
      expect(screen.queryByText("코스 취향 선택")).not.toBeInTheDocument();
    } finally {
      travelAreasSpy.mockRestore();
    }
  });

  it("asks course preference after a travel area is selected", async () => {
    await login();
    cleanup();
    const user = userEvent.setup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getGangwonTravelAreaResponse());

    try {
      renderAppRoute("/trips/new?region=%EA%B0%95%EC%9B%90");

      await user.click(
        await screen.findByRole("button", { name: /속초·고성·양양/ }),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));

      expect(await screen.findByText("코스 취향 선택")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /맛집/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /휴식/ })).toBeInTheDocument();
    } finally {
      travelAreasSpy.mockRestore();
    }
  });

  it("includes travelAreaId in the createTrip payload after selecting a travel-area card", async () => {
    await login();
    cleanup();
    const user = userEvent.setup();
    const createdTrip: Trip = {
      ...getPreviewTrip(),
      id: "48",
      title: "강원 권역 여행",
      dates: "2026.06.15 - 06.17",
      days: { 1: [], 2: [], 3: [] },
    };
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getGangwonTravelAreaResponse());
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockResolvedValue(createdTrip);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(createdTrip);

    try {
      renderAppRoute("/trips/new?region=%EA%B0%95%EC%9B%90");
      await user.click(
        await screen.findByRole("button", { name: /속초·고성·양양/ }),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      const titleInput = screen.getByRole("textbox", { name: "일정 제목" });
      await user.clear(titleInput);
      await user.type(titleInput, "강원 권역 여행");
      await user.click(screen.getByRole("button", { name: "일정 만들기" }));

      await waitFor(() =>
        expect(createTripSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "강원 권역 여행",
            region: "속초·고성·양양",
            travelAreaId: "gangwon-sokcho-goseong-yangyang",
          }),
        ),
      );
      expect(travelAreasSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sido: "강원" }),
      );
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("48"));
    } finally {
      travelAreasSpy.mockRestore();
      createTripSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("clears a direct travelAreaId requirement when the user switches back to a normal region", async () => {
    await login();
    cleanup();
    const user = userEvent.setup();
    const createdTrip: Trip = {
      ...getPreviewTrip(),
      id: "49",
      title: "부산 일반 여행",
      dates: "2026.06.15 - 06.17",
      days: { 1: [], 2: [], 3: [] },
    };
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockImplementation((options) => {
        if (options?.sido === "부산")
          return Promise.resolve(getBusanTravelAreaResponse());
        return Promise.resolve(getGangwonTravelAreaResponse());
      });
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockResolvedValue(createdTrip);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(createdTrip);

    try {
      renderAppRoute("/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang");
      expect(
        await screen.findByRole("button", { name: /속초·고성·양양/ }),
      ).toHaveClass("active");
      await user.click(screen.getByRole("button", { name: /부산/ }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /부산 전체/ })).toHaveClass(
          "active",
        ),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(
        screen.getByRole("heading", { name: "코스 취향 선택" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(
        screen.getByRole("heading", { name: "여행 기간 선택" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "다음" }));
      const titleInput = screen.getByRole("textbox", { name: "일정 제목" });
      await user.clear(titleInput);
      await user.type(titleInput, "부산 일반 여행");
      await user.click(screen.getByRole("button", { name: "일정 만들기" }));

      await waitFor(() =>
        expect(createTripSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "부산 일반 여행",
            region: "부산 전체",
            travelAreaId: "busan-all",
          }),
        ),
      );
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("49"));
    } finally {
      travelAreasSpy.mockRestore();
      createTripSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("links normalized TravelMonth policy slugs when creating a trip", async () => {
    await login();
    cleanup();
    renderAppRoute(
      "/trips/new?policySlug=travelmonth-58&region=%EB%B6%80%EC%82%B0",
    );
    const user = userEvent.setup();
    const createdTrip: Trip = {
      ...getPreviewTrip(),
      id: "46",
      title: "공식 혜택 참고 여행",
      dates: "2026.06.15 - 06.17",
      days: { 1: [], 2: [], 3: [] },
    };
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockResolvedValue(createdTrip);
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getBusanTravelAreaResponse());
    const addPolicySpy = vi
      .spyOn(appDataApi, "addPolicyToTrip")
      .mockResolvedValue({
        tripId: "46",
        policyId: "travelmonth-58",
        added: true,
      });
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(createdTrip);

    try {
      expect(
        screen.getByText("선택한 정책까지 일정에 연결할게요"),
      ).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent("공식 수집 혜택");
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /부산 전체/ })).toHaveClass(
          "active",
        ),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(document.body).toHaveTextContent("연결 정책 · 선택한 정책");
      const titleInput = screen.getByRole("textbox", { name: "일정 제목" });
      await user.clear(titleInput);
      await user.type(titleInput, "공식 혜택 참고 여행");
      await user.click(screen.getByRole("button", { name: "일정 만들기" }));

      await waitFor(() => expect(createTripSpy).toHaveBeenCalled());
      expect(createTripSpy.mock.calls[0][0]).toEqual(
        expect.objectContaining({ policySlug: "travelmonth-58" }),
      );
      expect(addPolicySpy).toHaveBeenCalledWith("46", "travelmonth-58");
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("46"));
    } finally {
      travelAreasSpy.mockRestore();
      createTripSpy.mockRestore();
      addPolicySpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("blocks trip creation until the inline title step is valid", async () => {
    await login();
    cleanup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getJejuTravelAreaResponse());
    renderAppRoute("/trips/new");
    const user = userEvent.setup();
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockResolvedValue(getPreviewTrip());

    try {
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(
        screen.getByRole("heading", { name: "코스 취향 선택" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(
        screen.getByRole("heading", { name: "여행 기간 선택" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "다음" }));
      expect(
        screen.getByRole("heading", { name: "일정 제목 입력" }),
      ).toBeInTheDocument();
      const titleInput = screen.getByRole("textbox", { name: "일정 제목" });
      await user.clear(titleInput);
      expect(
        screen.getByRole("button", { name: "일정 만들기" }),
      ).toBeDisabled();
      expect(createTripSpy).not.toHaveBeenCalled();
    } finally {
      createTripSpy.mockRestore();
      travelAreasSpy.mockRestore();
    }
  });

  it("shows Kakao candidate lookup copy and a longer wait hint while trip creation is pending", async () => {
    await login();
    cleanup();
    const user = userEvent.setup();
    const travelAreasSpy = vi
      .spyOn(appDataApi, "listTravelAreaRecommendations")
      .mockResolvedValue(getGangwonTravelAreaResponse());
    const createTripSpy = vi
      .spyOn(appDataApi, "createTrip")
      .mockReturnValue(new Promise(() => undefined));

    try {
      renderAppRoute("/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang");

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "다음" })).toBeEnabled(),
      );
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      await user.click(screen.getByRole("button", { name: "다음" }));
      fireEvent.click(screen.getByRole("button", { name: "일정 만들기" }));

      expect(
        screen.getByRole("button", { name: "카카오 장소 후보 조회 중" }),
      ).toBeDisabled();
      expect(
        screen.getByText("카카오 장소 후보를 바탕으로 일정을 만들고 있어요."),
      ).toBeInTheDocument();

      await waitFor(
        () =>
          expect(
            screen.getByText(
              "조금만 더 기다려주세요. 응답이 늦으면 잠시 후 다시 시도할 수 있어요.",
            ),
          ).toBeInTheDocument(),
        {
          timeout: 7000,
        },
      );
      expect(createTripSpy).toHaveBeenCalled();
    } finally {
      createTripSpy.mockRestore();
      travelAreasSpy.mockRestore();
    }
  }, 10000);

  it("renders itinerary detail day tabs from trip data", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "제주 4일 여행",
      dates: "2026.06.15 - 06.18",
      expectedSaving: "0원",
      linkedPolicies: undefined as unknown as Trip["linkedPolicies"],
      days: { 1: [], 2: [], 3: [], 4: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");

      await waitFor(() =>
        expect(screen.getByText("Day 4")).toBeInTheDocument(),
      );
      expect(
        screen.queryByText("Travel Hunter itinerary"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("🏝️")).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "친구 초대" }),
      ).not.toBeInTheDocument();
      const inviteLinks = screen.getAllByRole("link", { name: "+ 친구 초대" });
      expect(inviteLinks).toHaveLength(1);
      expect(inviteLinks[0]).toHaveAttribute(
        "href",
        "/friend-invite?tripId=55",
      );
      expect(
        screen.getByRole("region", { name: "연결된 정책" }),
      ).toBeInTheDocument();
      expect(document.querySelector(".benefit-banner")).toHaveAttribute(
        "href",
        "/policies",
      );
      expect(
        screen.getByRole("region", { name: "이 일정에 어울리는 정책" }),
      ).toBeInTheDocument();
      await userEvent.setup().click(screen.getByText("Day 4"));
      expect(document.body).toHaveTextContent("아직 추가된 장소가 없어요");
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("shows linked policies from the trip detail response", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "56",
      status: "draft",
      currentUserRole: "owner",
      title: "부산 정책 여행",
      linkedPolicies: [
        {
          slug: "busan-digital-nomad",
          title: "부산 워케이션 지원",
          amount: "최대 10만원",
          region: "부산",
        },
        {
          slug: examplePolicySlug,
          title: examplePolicyTitle,
          amount: "최대 30만원",
          region: "전국",
        },
      ],
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/56");

      await waitFor(() =>
        expect(screen.getByText("부산 워케이션 지원")).toBeInTheDocument(),
      );
      expect(screen.getByText(examplePolicyTitle)).toBeInTheDocument();
      expect(document.querySelectorAll(".benefit-banner")).toHaveLength(2);
      expect(getLink("/policies/busan-digital-nomad")).toBeInTheDocument();
      expect(getLink(examplePolicyPath)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /연결 삭제/ })).toHaveLength(
        2,
      );
      expect(document.body).toHaveTextContent("최대 10만원 · 부산");
      expect(document.body).toHaveTextContent("최대 30만원 · 전국");
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("removes a linked policy from a confirmed owner trip detail card", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "61",
      status: "confirmed",
      currentUserRole: "owner",
      title: "정책 삭제 여행",
      linkedPolicies: [
        {
          slug: examplePolicySlug,
          title: examplePolicyTitle,
          amount: "최대 30만원",
          region: "전국",
        },
      ],
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const removePolicySpy = vi
      .spyOn(appDataApi, "removePolicyFromTrip")
      .mockResolvedValue({
        tripId: "61",
        policyId: examplePolicySlug,
        added: false,
      });

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/61");

      const linkedRegion = await screen.findByRole("region", {
        name: "연결된 정책",
      });
      expect(
        within(linkedRegion).getByText(examplePolicyTitle),
      ).toBeInTheDocument();

      await userEvent.setup().click(
        within(linkedRegion).getByRole("button", {
          name: `${examplePolicyTitle} 연결 삭제`,
        }),
      );

      await waitFor(() =>
        expect(removePolicySpy).toHaveBeenCalledWith("61", examplePolicySlug),
      );
      await waitFor(() =>
        expect(
          within(linkedRegion).queryByText(examplePolicyTitle),
        ).not.toBeInTheDocument(),
      );
      expect(
        within(linkedRegion).getByText("연결된 정책이 없어요"),
      ).toBeInTheDocument();
      expect(document.body).toHaveTextContent("정책 연결을 해제했어요.");
    } finally {
      getTripSpy.mockRestore();
      removePolicySpy.mockRestore();
    }
  });

  it("keeps a route-state linked policy hidden after removing it from trip detail", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "62",
      status: "draft",
      currentUserRole: "owner",
      title: "방금 연결한 정책 삭제 여행",
      linkedPolicies: [],
      days: { 1: [] },
    };
    const routePolicy: LinkedTripPolicy = {
      slug: examplePolicySlug,
      title: examplePolicyTitle,
      amount: "최대 30만원",
      region: "전국",
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const removePolicySpy = vi
      .spyOn(appDataApi, "removePolicyFromTrip")
      .mockResolvedValue({
        tripId: "62",
        policyId: examplePolicySlug,
        added: false,
      });

    try {
      await login();
      cleanup();
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/trips/62",
              state: { linkedPolicy: routePolicy },
            },
          ]}
        >
          <AppProviders>
            <App />
          </AppProviders>
        </MemoryRouter>,
      );

      const linkedRegion = await screen.findByRole("region", {
        name: "연결된 정책",
      });
      expect(
        within(linkedRegion).getByText(examplePolicyTitle),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확정하기" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확정취소" }),
      ).not.toBeInTheDocument();

      await userEvent.setup().click(
        within(linkedRegion).getByRole("button", {
          name: `${examplePolicyTitle} 연결 삭제`,
        }),
      );

      await waitFor(() =>
        expect(removePolicySpy).toHaveBeenCalledWith("62", examplePolicySlug),
      );
      await waitFor(() =>
        expect(
          within(linkedRegion).queryByText(examplePolicyTitle),
        ).not.toBeInTheDocument(),
      );
      expect(
        within(linkedRegion).getByText("연결된 정책이 없어요"),
      ).toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
      removePolicySpy.mockRestore();
    }
  });

  it("links trip detail recommended policy cards to policy detail pages", async () => {
    const recommendedPolicies: LinkedTripPolicy[] = [
      {
        slug: "busan-card-cashback",
        title: "부산 카드 캐시백",
        amount: "카드 결제 5% 캐시백",
        region: "부산",
      },
      {
        slug: "busan-stay-coupon",
        title: "부산 숙박 쿠폰",
        amount: "숙박비 3만원",
        region: "부산",
      },
      {
        slug: "busan-food-pass",
        title: "부산 미식 패스",
        amount: "식사권 할인",
        region: "부산",
      },
    ];
    const trip: Trip & { recommendedPolicies: LinkedTripPolicy[] } = {
      ...getPreviewTrip(),
      id: "59",
      title: "부산 추천 여행",
      linkedPolicies: [],
      recommendedPolicies,
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/59");

      const recommendedRegion = await screen.findByRole("region", {
        name: "이 일정에 어울리는 정책",
      });
      expect(
        within(recommendedRegion).getByRole("link", {
          name: /부산 카드 캐시백/,
        }),
      ).toHaveAttribute("href", "/policies/busan-card-cashback");
      expect(
        within(recommendedRegion).getByRole("link", { name: /부산 숙박 쿠폰/ }),
      ).toHaveAttribute("href", "/policies/busan-stay-coupon");
      expect(
        within(recommendedRegion).getByRole("link", { name: /부산 미식 패스/ }),
      ).toHaveAttribute("href", "/policies/busan-food-pass");
      expect(
        within(recommendedRegion).getByText("카드 결제 5% 캐시백"),
      ).toBeInTheDocument();
      expect(
        within(recommendedRegion).queryByText("KTX 청년 여행 할인"),
      ).not.toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("uses a region empty state instead of the generic policy-list card when no recommended policy exists", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "60",
      title: "부산 추천 대기 여행",
      linkedPolicies: [],
      recommendedPolicies: [],
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/60");

      const recommendedRegion = await screen.findByRole("region", {
        name: "이 일정에 어울리는 정책",
      });
      expect(
        within(recommendedRegion).queryByText(
          "이 일정에 맞는 정책을 더 찾아보세요",
        ),
      ).not.toBeInTheDocument();
      expect(
        within(recommendedRegion).getByText("이 일정에 어울리는 정책이 없어요"),
      ).toBeInTheDocument();
      expect(
        within(recommendedRegion).getByText("정책 확인"),
      ).toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("puts the just-attached policy first when the trip already has linked policies", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "58",
      title: "부산 야호",
      expectedSaving: "30만원",
      linkedPolicies: [
        {
          slug: "busan-card-cashback",
          title: "부산 카드 캐시백",
          amount: "카드 결제 5% 캐시백",
          region: "부산",
        },
      ],
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/trips/58",
              state: {
                linkedPolicy: {
                  slug: examplePolicySlug,
                  title: examplePolicyTitle,
                  amount: "최대 30만원",
                  region: "전국",
                },
              },
            },
          ]}
        >
          <AppProviders>
            <App />
          </AppProviders>
        </MemoryRouter>,
      );

      const linkedRegion = await screen.findByRole("region", {
        name: "연결된 정책",
      });
      expect(
        within(linkedRegion).getByText(examplePolicyTitle),
      ).toBeInTheDocument();
      expect(
        within(linkedRegion).getByText("부산 카드 캐시백"),
      ).toBeInTheDocument();
      const banners = document.querySelectorAll(".benefit-banner");
      expect(banners).toHaveLength(2);
      const links = linkedRegion.querySelectorAll(".linked-policy-card-main");
      expect(decodeURIComponent(links[0].getAttribute("href") ?? "")).toBe(
        decodeURIComponent(examplePolicyPath),
      );
      expect(links[1]).toHaveAttribute("href", "/policies/busan-card-cashback");
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("keeps the just-attached policy visible when trip detail response is stale", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "57",
      title: "부산 야호",
      expectedSaving: "30만원",
      linkedPolicies: undefined as unknown as Trip["linkedPolicies"],
      days: { 1: [] },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/trips/57",
              state: {
                linkedPolicy: {
                  slug: examplePolicySlug,
                  title: examplePolicyTitle,
                  amount: "최대 30만원",
                  region: "전국",
                },
              },
            },
          ]}
        >
          <AppProviders>
            <App />
          </AppProviders>
        </MemoryRouter>,
      );

      await waitFor(() =>
        expect(screen.getByText(examplePolicyTitle)).toBeInTheDocument(),
      );
      expect(
        decodeURIComponent(
          document
            .querySelector(".linked-policy-card-main")
            ?.getAttribute("href") ?? "",
        ),
      ).toBe(decodeURIComponent(examplePolicyPath));
      expect(document.body).toHaveTextContent("최대 30만원 · 전국");
      expect(
        screen.queryByText("연결된 정책이 없어요"),
      ).not.toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("toggles itinerary detail between list and map views", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "제주 지도 여행",
      dates: "2026.06.15 - 06.17",
      days: {
        1: [
          { id: "1", time: "09:00", label: "성산 일출봉", meta: "자연·관광지" },
          { id: "2", time: "12:30", label: "해녀의 집", meta: "맛집·한식" },
        ],
        2: [{ id: "3", time: "10:00", label: "한림공원", meta: "자연·관광지" }],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55?day=1&view=map&place=1");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(screen.getByRole("tab", { name: "지도" })).toHaveAttribute(
          "aria-selected",
          "true",
        ),
      );
      expect(screen.getByLabelText("Day 1 지도")).toBeInTheDocument();
      expect(document.querySelector("[data-kakao-map-view]")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "1번 장소: 성산 일출봉" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("dialog", { name: "성산 일출봉 지도 상세" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /길찾기/ })).toHaveAttribute(
        "href",
        "https://map.kakao.com/link/search/%EC%84%B1%EC%82%B0%20%EC%9D%BC%EC%B6%9C%EB%B4%89",
      );

      await user.click(screen.getByRole("tab", { name: "리스트" }));
      await waitFor(() =>
        expect(screen.getByRole("tab", { name: "리스트" })).toHaveAttribute(
          "aria-selected",
          "true",
        ),
      );
      expect(screen.queryByLabelText("Day 1 지도")).not.toBeInTheDocument();
      expect(
        screen.queryByText("장소 카드의 이동 핸들로 순서를 조정할 수 있어요"),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "지도" }));
      await user.click(
        screen.getByRole("button", { name: "2번 장소: 해녀의 집" }),
      );
      expect(
        screen.getByRole("dialog", { name: "해녀의 집 지도 상세" }),
      ).toBeInTheDocument();

      await user.click(screen.getByText("Day 2"));
      await waitFor(() =>
        expect(screen.getByLabelText("Day 2 지도")).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("dialog", { name: "해녀의 집 지도 상세" }),
      ).not.toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("renders a trip detail coordinate-less Kakao map through the shared query fallback", async () => {
    vi.stubEnv("VITE_KAKAO_MAP_JS_KEY", "test-js-key");
    const kakao = installAppKakaoSdkMock();
    const expectedQuery = "부산 중구 자갈치해안로 52";
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "부산 지도 여행",
      dates: "2026.06.15 - 06.17",
      days: {
        1: [
          {
            id: "missing-coordinate-place",
            time: "10:00",
            label: "자갈치시장",
            meta: "시장·맛집",
            address: expectedQuery,
            latitude: null,
            longitude: null,
          },
        ],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55?day=1&view=map");

      await waitFor(() =>
        expect(kakao.addressSearch).toHaveBeenCalledWith(
          expectedQuery,
          expect.any(Function),
        ),
      );
      await waitFor(() =>
        expect(kakao.keywordSearch).toHaveBeenCalledWith(
          expectedQuery,
          expect.any(Function),
        ),
      );
      expect(kakao.addressQueries).toEqual([expectedQuery]);
      expect(kakao.keywordQueries).toEqual([expectedQuery]);
      expect(kakao.addressSearch.mock.invocationCallOrder[0]).toBeLessThan(
        kakao.keywordSearch.mock.invocationCallOrder[0],
      );
      await waitFor(() => expect(kakao.mapInstances).toHaveLength(1));
      expect(kakao.markerInstances).toHaveLength(1);
      expect(kakao.customOverlayInstances).toHaveLength(1);
      expect(kakao.customOverlayInstances[0].options.content).toHaveTextContent(
        "자갈치시장",
      );
      expect(
        screen.queryByRole("button", { name: "1번 장소: 자갈치시장" }),
      ).not.toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
      vi.unstubAllEnvs();
      delete window.kakao;
    }
  });

  it("uses stored Kakao place URL and address in the trip map detail sheet", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      days: {
        1: [
          {
            id: "1",
            time: "13:00",
            label: "Kakao food place",
            meta: "Food · Busan",
            address: "Busan road 1",
            latitude: 35.1,
            longitude: 129.1,
            category: "Food",
            categoryCode: "FD6",
            placeUrl: "http://place.map.kakao.com/12345",
          },
        ],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55?day=1&view=map&place=1");

      await waitFor(() =>
        expect(
          screen.getByRole("dialog", { name: "Kakao food place 지도 상세" }),
        ).toBeInTheDocument(),
      );
      expect(screen.getByText("Busan road 1")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /길찾기/ })).toHaveAttribute(
        "href",
        "http://place.map.kakao.com/12345",
      );
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("adds, edits, and deletes places from the itinerary detail", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: {
        1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }],
      },
    };
    const addedTrip: Trip = {
      ...initialTrip,
      days: {
        1: [
          ...initialTrip.days[1],
          { id: "2", time: "14:30", label: "Cafe stop", meta: "Dessert" },
        ],
      },
    };
    const editedTrip: Trip = {
      ...addedTrip,
      days: {
        1: [
          { id: "1", time: "10:20", label: "Updated peak", meta: "New memo" },
          addedTrip.days[1][1],
        ],
      },
    };
    const deletedTrip: Trip = {
      ...editedTrip,
      days: { 1: [editedTrip.days[1][1]] },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(addedTrip);
    const updatePlaceSpy = vi
      .spyOn(appDataApi, "updateTripPlace")
      .mockResolvedValue(editedTrip);
    const deletePlaceSpy = vi
      .spyOn(appDataApi, "deleteTripPlace")
      .mockResolvedValue(deletedTrip);
    const confirmSpy = vi.spyOn(window, "confirm");

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      expect(
        screen.getByRole("group", { name: "방문 시간 선택" }),
      ).toBeInTheDocument();
      expect(
        document.querySelector('input[name="place-time"]:not([type="hidden"])'),
      ).toBeNull();
      await setPlaceTimeFromDefault(user, "14:30");
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Cafe stop",
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "Dessert",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:add:1",
          ),
        ).toContain("Cafe stop"),
      );
      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith("55", 1, {
          time: "14:30",
          label: "Cafe stop",
          meta: "Dessert",
        }),
      );
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();
      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));

      await user.click(
        document.querySelector(".place-actions .ghost") as HTMLButtonElement,
      );
      await setPlaceTimeFromDefault(user, "10:20");
      await user.clear(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
      );
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Updated peak",
      );
      await user.clear(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "New memo",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:edit:1",
          ),
        ).toContain("Updated peak"),
      );
      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );

      await waitFor(() =>
        expect(updatePlaceSpy).toHaveBeenCalledWith(
          "55",
          "1",
          expect.objectContaining({ label: "Updated peak", time: "10:20" }),
        ),
      );
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1"),
      ).toBeNull();
      await waitFor(() =>
        expect(document.body).toHaveTextContent("Updated peak"),
      );

      await user.click(
        document.querySelector(".place-actions .line") as HTMLButtonElement,
      );
      const deleteDialog = await screen.findByRole("dialog", {
        name: "장소를 삭제할까요?",
      });
      expect(confirmSpy).not.toHaveBeenCalled();
      await user.click(
        within(deleteDialog).getByRole("button", { name: "삭제" }),
      );
      await waitFor(() =>
        expect(deletePlaceSpy).toHaveBeenCalledWith("55", "1"),
      );
      await waitFor(() =>
        expect(screen.queryByText("Updated peak")).not.toBeInTheDocument(),
      );
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
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: {
        1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      await user.click(
        document.querySelector(".place-actions .ghost") as HTMLButtonElement,
      );
      await setPlaceTimeFromDefault(user, "11:20");
      await user.clear(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
      );
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Draft peak",
      );
      await user.clear(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "Draft memo",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:edit:1",
          ),
        ).toContain("Draft peak"),
      );

      cleanup();
      renderAppRoute("/trips/55");
      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      await user.click(
        document.querySelector(".place-actions .ghost") as HTMLButtonElement,
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "11:20",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "Draft peak",
      );
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue(
        "Draft memo",
      );

      await user.click(screen.getByRole("button", { name: "닫기" }));
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:edit:1"),
      ).toBeNull();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("restores and clears add-place drafts", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const addedTrip: Trip = {
      ...initialTrip,
      days: {
        1: [
          { id: "3", time: "16:00", label: "Tea house", meta: "Reservation" },
        ],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(addedTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      await setPlaceTimeFromDefault(user, "23:50");
      await user.click(
        screen.getByRole("button", { name: "방문 시간 10분 증가" }),
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "00:00",
      );
      await setPlaceTimeFromDefault(user, "16:00");
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Tea house",
      );
      await user.type(
        document.querySelector(
          'textarea[name="place-meta"]',
        ) as HTMLTextAreaElement,
        "Reservation",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:add:1",
          ),
        ).toContain("Tea house"),
      );

      cleanup();
      renderAppRoute("/trips/55");
      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "16:00",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "Tea house",
      );
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue(
        "Reservation",
      );

      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );
      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith(
          "55",
          1,
          expect.objectContaining({ label: "Tea house" }),
        ),
      );
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();

      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      await user.type(
        document.querySelector('input[name="place-label"]') as HTMLInputElement,
        "Will cancel",
      );
      await waitFor(() =>
        expect(
          window.localStorage.getItem(
            "travel-hunter:draft:trip-place:55:add:1",
          ),
        ).toContain("Will cancel"),
      );
      await user.click(screen.getByRole("button", { name: "닫기" }));
      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
    }
  });

  it("shows and discards a restored add-place draft", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      window.localStorage.setItem(
        "travel-hunter:draft:trip-place:55:add:1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          value: {
            dayNumber: 1,
            time: "16:00",
            label: "Tea house",
            meta: "Reservation",
          },
        }),
      );
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );

      expect(
        screen.getByText("작성 중이던 장소 내용을 불러왔어요."),
      ).toBeInTheDocument();
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "16:00",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "Tea house",
      );

      await user.click(screen.getByRole("button", { name: "삭제" }));

      expect(
        window.localStorage.getItem("travel-hunter:draft:trip-place:55:add:1"),
      ).toBeNull();
      expect(
        screen.queryByText("작성 중이던 장소 내용을 불러왔어요."),
      ).not.toBeInTheDocument();
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "",
      );
      expect(document.querySelector('input[name="place-label"]')).toHaveValue(
        "",
      );
      expect(document.querySelector('textarea[name="place-meta"]')).toHaveValue(
        "",
      );
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("validates place time as a 10 minute spinner value", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Jeju editable trip",
      days: { 1: [] },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();
      window.localStorage.setItem(
        "travel-hunter:draft:trip-place:55:add:1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          value: {
            dayNumber: 1,
            time: "09:35",
            label: "Invalid time stop",
            meta: "",
          },
        }),
      );

      await waitFor(() =>
        expect(
          document.querySelector(".prototype-trip-action-add"),
        ).toBeTruthy(),
      );
      await user.click(
        document.querySelector(
          ".prototype-trip-action-add",
        ) as HTMLButtonElement,
      );
      expect(document.querySelector('input[name="place-time"]')).toHaveValue(
        "09:35",
      );
      await user.click(
        document.querySelector(".sheet-actions button") as HTMLButtonElement,
      );

      expect(addPlaceSpy).not.toHaveBeenCalled();
      expect(
        screen.getByText("방문 시간은 10분 단위로 선택해 주세요."),
      ).toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
      addPlaceSpy.mockRestore();
    }
  });

  it("renders viewer trips as read-only in the itinerary detail", async () => {
    const viewerTrip: Trip = {
      ...getPreviewTrip(),
      id: "66",
      title: "Viewer trip",
      currentUserRole: "viewer",
      days: {
        1: [{ id: "1", time: "09:00", label: "Sunrise peak", meta: "Nature" }],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(viewerTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/66");

      await waitFor(() =>
        expect(document.body).toHaveTextContent("Sunrise peak"),
      );
      expect(document.body).toHaveTextContent("보기 권한으로 참여 중입니다");
      expect(
        document.querySelector(".prototype-trip-action-add"),
      ).not.toBeInTheDocument();
      expect(document.querySelector(".place-actions")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Sunrise peak 순서 이동" }),
      ).not.toBeInTheDocument();
    } finally {
      getTripSpy.mockRestore();
    }
  });

  it("moves places with drag handles within a day and to another day", async () => {
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Movable trip",
      days: {
        1: [
          {
            id: "1",
            time: "09:00",
            label: "Morning market",
            meta: "Breakfast",
          },
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
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);
    let resolveFirstMove: (trip: Trip) => void = () => undefined;
    const movePlaceSpy = vi
      .spyOn(appDataApi, "moveTripPlace")
      .mockImplementationOnce(
        () =>
          new Promise<Trip>((resolve) => {
            resolveFirstMove = resolve;
          }),
      )
      .mockResolvedValueOnce(movedDayTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");
      const user = userEvent.setup();

      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));
      expect(
        screen.queryByText("장소 카드의 이동 핸들로 순서를 조정할 수 있어요"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "위로" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "아래로" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "이동" }),
      ).not.toBeInTheDocument();
      const secondTimelineItem = document.querySelectorAll(
        ".timeline-item",
      )[1] as HTMLElement;
      const cafeDragHandle = within(secondTimelineItem).getByRole("button", {
        name: "Cafe stop 순서 이동",
      });
      expect(cafeDragHandle).toHaveClass("drag-handle");
      fireEvent.keyDown(cafeDragHandle, { key: "ArrowUp" });

      await waitFor(() =>
        expect(movePlaceSpy).toHaveBeenCalledWith("55", "2", {
          dayNumber: 1,
          position: 1,
        }),
      );
      expect(await screen.findByText("이동 중")).toBeInTheDocument();
      resolveFirstMove(movedUpTrip);
      await waitFor(() =>
        expect(
          (document.querySelector(".place-detail h4") as HTMLElement)
            .textContent,
        ).toBe("Cafe stop"),
      );

      const firstTimelineItem = document.querySelectorAll(
        ".timeline-item",
      )[0] as HTMLElement;
      const movedCafeDragHandle = within(firstTimelineItem).getByRole(
        "button",
        { name: "Cafe stop 순서 이동" },
      );
      fireEvent.keyDown(movedCafeDragHandle, {
        key: "ArrowRight",
        shiftKey: true,
      });

      await waitFor(() =>
        expect(movePlaceSpy).toHaveBeenLastCalledWith("55", "2", {
          dayNumber: 2,
          position: 2,
        }),
      );
      await waitFor(() =>
        expect(screen.getByText("Day 2")).toBeInTheDocument(),
      );
      await user.click(screen.getByText("Day 2"));
      expect(document.body).toHaveTextContent("Cafe stop");
    } finally {
      getTripSpy.mockRestore();
      movePlaceSpy.mockRestore();
    }
  });

  it("shows a message when moving a place fails", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      status: "draft",
      currentUserRole: "owner",
      title: "Move failure trip",
      days: {
        1: [
          {
            id: "1",
            time: "09:00",
            label: "Morning market",
            meta: "Breakfast",
          },
          { id: "2", time: "14:00", label: "Cafe stop", meta: "Dessert" },
        ],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const movePlaceSpy = vi
      .spyOn(appDataApi, "moveTripPlace")
      .mockRejectedValue(new Error("move failed"));

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55");

      await waitFor(() => expect(document.body).toHaveTextContent("Cafe stop"));
      const secondTimelineItem = document.querySelectorAll(
        ".timeline-item",
      )[1] as HTMLElement;
      const cafeDragHandle = within(secondTimelineItem).getByRole("button", {
        name: "Cafe stop 순서 이동",
      });
      fireEvent.keyDown(cafeDragHandle, { key: "ArrowUp" });

      await waitFor(() =>
        expect(movePlaceSpy).toHaveBeenCalledWith("55", "2", {
          dayNumber: 1,
          position: 1,
        }),
      );
      await waitFor(() =>
        expect(document.body).toHaveTextContent(
          "장소 순서를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      );
      expect(
        (document.querySelector(".place-detail h4") as HTMLElement).textContent,
      ).toBe("Morning market");
    } finally {
      getTripSpy.mockRestore();
      movePlaceSpy.mockRestore();
    }
  });

  it("renders AI additional candidates grouped by category with a map-centered layout", async () => {
    const recommendation = {
      id: "kakao_local:spot-1",
      label: "attraction",
      title: "속초 전망대",
      meta: "속초시 해안로",
      reason: "기존 일정 사이에 넣기 좋은 명소입니다.",
      categoryGroup: "attraction" as const,
      categoryCode: "AT4",
      categoryName: "관광명소 > 전망대",
      phone: "033-123-4567",
      address: "강원 속초시 해안로 1",
      latitude: 38.2,
      longitude: 128.6,
      placeUrl: "http://place.map.kakao.com/spot-1",
      suggestedDay: 1,
      aiReview: "Day 1 오후 동선에 부담이 적은 후보입니다.",
      sourceProvider: "kakao_local",
      externalPlaceId: "spot-1",
    };
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "속초 여행",
      days: { 1: [], 2: [] },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(initialTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      expect(document.querySelector(".ai-results-screen")).toBeTruthy();
      expect(document.querySelector(".ai-results-hero")).toBeNull();
      expect(document.querySelector(".ai-flow-panel")).toBeNull();
      expect(document.querySelector(".ai-results-compact-head")).toBeNull();
      expect(document.querySelector(".ai-slim-day-add")).toBeNull();
      expect(document.querySelector(".ai-trip-preview")).toBeNull();
      expect(
        screen.queryByRole("button", { name: /전체 1/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /추가 가능 1/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /이미 추가 0/ }),
      ).not.toBeInTheDocument();
      expect(
        await screen.findByRole("region", { name: "추천 후보 지도" }),
      ).toBeInTheDocument();
      expect(document.querySelector("[data-kakao-map-view]")).toBeTruthy();
      expect(
        screen.getByRole("region", { name: "선택 후보 요약" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "명소 후보" }),
      ).toBeInTheDocument();
      expect(document.body).toHaveTextContent("속초 전망대");
      expect(document.body).toHaveTextContent(
        "관광명소 > 전망대 · 033-123-4567",
      );
      const selectedSummary = screen.getByRole("region", {
        name: "선택 후보 요약",
      });
      expect(selectedSummary.tagName.toLowerCase()).toBe("section");
      const kakaoLink = within(selectedSummary).getByRole("link", {
        name: "카카오맵 보기",
      });
      expect(kakaoLink).toHaveAttribute(
        "href",
        "http://place.map.kakao.com/spot-1",
      );
      expect(kakaoLink).toHaveAttribute("target", "_blank");
      expect(kakaoLink).toHaveAttribute("rel", "noreferrer");
      const candidateCard = screen.getByTestId(
        "ai-candidate-card-kakao_local:spot-1",
      );
      expect(within(candidateCard).getByText("전망대")).toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("강원 속초시 해안로 1"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("관광명소 > 전망대 · 033-123-4567"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText(/033-123-4567/),
      ).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(
        "Day 1 오후 동선에 부담이 적은 후보입니다.",
      );
      expect(document.body).not.toHaveTextContent("추천 근거");
      expect(document.body).not.toHaveTextContent("추가 가능");
      expect(document.body).not.toHaveTextContent("장소 정보");
    } finally {
      listRecommendationsSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("hides the Kakao map link when selected AI candidate has no place URL", async () => {
    const recommendation = {
      id: "kakao_local:spot-no-url",
      label: "attraction",
      title: "속초 작은 전망대",
      meta: "명소 후보",
      reason: "가까운 후보입니다.",
      categoryGroup: "attraction" as const,
      categoryName: "관광명소 > 전망대",
      address: "강원 속초시 해안로 2",
      suggestedDay: 1,
      placeUrl: null,
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue({
      ...getPreviewTrip(),
      id: "55",
      days: { 1: [], 2: [] },
    });

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      const selectedSummary = await screen.findByRole("region", {
        name: "선택 후보 요약",
      });
      expect(selectedSummary).toHaveTextContent("속초 작은 전망대");
      expect(
        within(selectedSummary).queryByRole("link", { name: "카카오맵 보기" }),
      ).not.toBeInTheDocument();
    } finally {
      listRecommendationsSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("adds an AI candidate from its inline add button with a card-local Day selector", async () => {
    const recommendation = {
      id: "kakao_local:food-1",
      label: "food",
      title: "속초 로컬 맛집",
      meta: "점심 후보",
      reason: "식사 만족도가 높아요.",
      categoryGroup: "food" as const,
      categoryCode: "FD6",
      categoryName: "음식점 > 카페 > 커피전문점",
      phone: "033-222-3333",
      address: "강원 속초시 중앙로 1",
      latitude: 38.1,
      longitude: 128.5,
      placeUrl: "http://place.map.kakao.com/food-1",
      suggestedDay: 2,
      aiReview: "Day 2 점심 동선에 맞는 후보입니다.",
      sourceProvider: "kakao_local",
      externalPlaceId: "food-1",
    };
    const initialTrip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "AI recommendation trip",
      days: { 1: [], 2: [], 3: [] },
    };
    const updatedTrip: Trip = {
      ...initialTrip,
      days: {
        1: [],
        2: [
          {
            id: "9",
            time: "",
            label: recommendation.title,
            meta: "음식점 > 카페 > 커피전문점 · 033-222-3333",
          },
        ],
        3: [],
      },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockResolvedValue(updatedTrip);
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValueOnce(initialTrip)
      .mockResolvedValue(updatedTrip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      const user = userEvent.setup();
      const foodSection = await screen.findByRole("region", {
        name: "맛집 후보",
      });
      const candidateCard = within(foodSection).getByTestId(
        "ai-candidate-card-kakao_local:food-1",
      );
      expect(document.querySelector(".ai-slim-day-add")).toBeNull();
      await waitFor(() =>
        expect(
          within(candidateCard).getByRole("button", {
            name: "속초 로컬 맛집 선택",
          }),
        ).toHaveAttribute("aria-pressed", "true"),
      );
      expect(within(candidateCard).getByText("커피전문점")).toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("D2 추천"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText("강원 속초시 중앙로 1"),
      ).not.toBeInTheDocument();
      expect(
        within(candidateCard).queryByText(/033-222-3333/),
      ).not.toBeInTheDocument();

      await user.click(
        within(candidateCard).getByRole("button", {
          name: "속초 로컬 맛집 추가",
        }),
      );

      expect(
        within(candidateCard).getByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(document.querySelector(".ai-day-popover")).toBeNull();
      expect(document.querySelector(".ai-trip-preview")).toBeNull();
      const dayPopover = within(foodSection).getByRole("dialog", {
        name: "속초 로컬 맛집 Day 선택",
      });
      expect(dayPopover).toHaveClass("ai-inline-day-selector");
      expect(candidateCard.nextElementSibling).toBe(dayPopover);
      expect(
        within(candidateCard).queryByText("D2 추천"),
      ).not.toBeInTheDocument();
      expect(within(dayPopover).queryByText("D2 추천")).not.toBeInTheDocument();
      expect(
        within(dayPopover).queryByRole("button", { name: "취소" }),
      ).not.toBeInTheDocument();
      expect(
        within(dayPopover).getByRole("button", { name: "D2" }),
      ).toHaveAttribute("aria-pressed", "true");

      await user.click(within(dayPopover).getByRole("button", { name: "D3" }));
      expect(addPlaceSpy).not.toHaveBeenCalled();
      await user.click(
        within(dayPopover).getByRole("button", { name: "Day 3에 추가" }),
      );

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith(
          "55",
          3,
          expect.objectContaining({
            label: recommendation.title,
            meta: "음식점 > 카페 > 커피전문점 · 033-222-3333",
            address: recommendation.address,
            latitude: recommendation.latitude,
            longitude: recommendation.longitude,
            categoryCode: recommendation.categoryCode,
            placeUrl: recommendation.placeUrl,
            sourceProvider: recommendation.sourceProvider,
            externalPlaceId: recommendation.externalPlaceId,
          }),
        ),
      );
      await waitFor(() => expect(getTripSpy).toHaveBeenCalledWith("55"));
      await waitFor(() =>
        expect(document.body).toHaveTextContent(
          "속초 로컬 맛집을 Day 3 일정에 추가했어요.",
        ),
      );
    } finally {
      listRecommendationsSpy.mockRestore();
      addPlaceSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("marks already-added AI candidates as duplicates without opening the add action", async () => {
    const recommendation = {
      id: "kakao_local:spot-1",
      label: "attraction",
      title: "속초해변",
      meta: "명소 후보",
      reason: "동선에 가까워요.",
      categoryGroup: "attraction" as const,
      suggestedDay: 1,
    };
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "Duplicate trip",
      days: {
        1: [{ id: "1", time: "", label: "속초해변", meta: "이미 등록됨" }],
        2: [],
      },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      const duplicateSection = await screen.findByRole("region", {
        name: "명소 후보",
      });
      const duplicateCard = within(duplicateSection).getByTestId(
        "ai-candidate-card-kakao_local:spot-1",
      );
      await userEvent
        .setup()
        .click(
          within(duplicateCard).getByRole("button", { name: "속초해변 선택" }),
        );
      expect(document.body).toHaveTextContent("이미 추가됨");
      expect(
        within(duplicateCard).queryByRole("button", { name: "속초해변 추가" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("dialog", { name: "속초해변 Day 선택" }),
      ).not.toBeInTheDocument();
    } finally {
      listRecommendationsSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("keeps selected AI candidate on the map and category card in sync", async () => {
    const recommendations = [
      {
        id: "kakao_local:spot-1",
        label: "attraction",
        title: "속초 전망대",
        meta: "명소 후보",
        reason: "전망이 좋아요.",
        categoryGroup: "attraction" as const,
        categoryCode: "AT4",
      },
      {
        id: "kakao_local:food-1",
        label: "food",
        title: "속초 로컬 맛집",
        meta: "맛집 후보",
        reason: "점심에 좋아요.",
        categoryGroup: "food" as const,
        categoryCode: "FD6",
      },
      {
        label: "stay",
        title: "속초 조용한 숙소",
        meta: "숙소 후보",
        reason: "휴식에 좋아요.",
        categoryGroup: "stay" as const,
        categoryCode: "AD5",
      },
    ];
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "Candidate sync trip",
      days: { 1: [], 2: [] },
    };
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue(recommendations);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      await waitFor(() =>
        expect(listRecommendationsSpy).toHaveBeenCalledWith("55"),
      );
      const mapRegion = screen.getByRole("region", { name: "추천 후보 지도" });
      await waitFor(() =>
        expect(
          within(mapRegion).getAllByRole("button", { name: /선택/ }),
        ).toHaveLength(1),
      );
      expect(
        within(mapRegion).getByRole("button", { name: "속초 전망대 선택" }),
      ).toHaveAttribute("aria-pressed", "true");

      const foodSection = await screen.findByRole("region", {
        name: "맛집 후보",
      });
      await userEvent.setup().click(
        within(foodSection).getByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      );
      expect(
        within(foodSection).getByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(mapRegion).getAllByRole("button", { name: /선택/ }),
      ).toHaveLength(1);
      expect(
        within(mapRegion).getByRole("button", { name: "속초 로컬 맛집 선택" }),
      ).toHaveAttribute("aria-pressed", "true");

      const staySection = await screen.findByRole("region", {
        name: "숙소 후보",
      });
      await userEvent.setup().click(
        within(staySection).getByRole("button", {
          name: "속초 조용한 숙소 선택",
        }),
      );
      expect(
        within(mapRegion).getAllByRole("button", { name: /선택/ }),
      ).toHaveLength(1);
      expect(
        within(mapRegion).getByRole("button", {
          name: "속초 조용한 숙소 선택",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(mapRegion).queryByRole("button", {
          name: "속초 로컬 맛집 선택",
        }),
      ).not.toBeInTheDocument();
    } finally {
      listRecommendationsSpy.mockRestore();
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
    const listRecommendationsSpy = vi
      .spyOn(appDataApi, "listRecommendations")
      .mockResolvedValue([recommendation]);
    const addPlaceSpy = vi
      .spyOn(appDataApi, "addTripPlace")
      .mockRejectedValue(new Error("Trip not found"));
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue({
      ...getPreviewTrip(),
      id: "55",
      days: { 1: [], 2: [], 3: [] },
    });

    try {
      await login();
      cleanup();
      renderAppRoute("/ai-results?tripId=55");

      const user = userEvent.setup();
      const otherSection = await screen.findByRole("region", {
        name: "기타 후보",
      });
      await user.click(
        within(otherSection).getByRole("button", {
          name: "고기국수 로컬 맛집 추가",
        }),
      );
      await user.click(
        within(otherSection).getByRole("button", { name: "Day 1에 추가" }),
      );

      await waitFor(() =>
        expect(addPlaceSpy).toHaveBeenCalledWith(
          "55",
          1,
          expect.objectContaining({ label: recommendation.title }),
        ),
      );
      await waitFor(() =>
        expect(document.querySelector(".form-error")?.textContent).toContain(
          "후보 장소",
        ),
      );
    } finally {
      listRecommendationsSpy.mockRestore();
      addPlaceSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("deletes trips from the trips list without using the home recommendation card", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "77",
      title: "부산 4일 여행",
      dates: "2026.06.15 - 06.18",
      days: { 1: [], 2: [], 3: [], 4: [] },
    };
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const deleteTripSpy = vi
      .spyOn(appDataApi, "deleteTrip")
      .mockResolvedValue({ tripId: "77", deleted: true });
    const confirmSpy = vi.spyOn(window, "confirm");

    try {
      await login();
      const homeAiCard = document.querySelector(".prototype-home-ai-card");
      expect(homeAiCard).toBeTruthy();
      expect(homeAiCard).not.toHaveTextContent("부산 4일 여행");
      expect(
        screen.queryByRole("button", { name: "삭제" }),
      ).not.toBeInTheDocument();

      cleanup();
      renderAppRoute("/trips");
      const tripHeader = document.querySelector(
        ".prototype-screen-head",
      ) as HTMLElement;
      expect(
        within(tripHeader).queryByText("여행 일정"),
      ).not.toBeInTheDocument();
      expect(within(tripHeader).getByText("내 일정")).toBeInTheDocument();
      expect(
        within(tripHeader).getByRole("link", { name: "+ 새 일정" }),
      ).toHaveAttribute("href", "/trips/new");
      expect(
        document.querySelector(".prototype-floating-create"),
      ).not.toBeInTheDocument();
      await screen.findByText("부산 4일 여행");
      expect(
        document.querySelector(".trip-visual-emoji")?.textContent,
      ).toContain("🌉");
      expect(document.body).toHaveTextContent(
        "2026.06.15 - 06.18 · 4일 · 장소 0개",
      );
      expect(document.body).not.toHaveTextContent("추천 정책 확인 가능");
      expect(document.body).toHaveTextContent("👥 1명 참여");
      expect(document.body).toHaveTextContent("예상 혜택");

      const deleteButton = await screen.findByRole("button", { name: "삭제" });
      const user = userEvent.setup();
      await user.click(deleteButton);

      const cancelDialog = await screen.findByRole("dialog", {
        name: "일정을 삭제할까요?",
      });
      expect(document.body).toHaveTextContent(
        "부산 4일 여행 일정과 연결된 장소, 초대, 정책 연결이 함께 삭제됩니다.",
      );
      expect(confirmSpy).not.toHaveBeenCalled();
      await user.click(
        within(cancelDialog).getByRole("button", { name: "취소" }),
      );
      expect(deleteTripSpy).not.toHaveBeenCalled();

      await user.click(await screen.findByRole("button", { name: "삭제" }));
      const deleteDialog = await screen.findByRole("dialog", {
        name: "일정을 삭제할까요?",
      });
      await user.click(
        within(deleteDialog).getByRole("button", { name: "삭제" }),
      );

      await waitFor(() => expect(deleteTripSpy).toHaveBeenCalledWith("77"));
      await waitFor(() =>
        expect(screen.queryByText("부산 4일 여행")).not.toBeInTheDocument(),
      );
      expect(document.body).toHaveTextContent("아직 등록된 일정이 없어요");
    } finally {
      listTripsSpy.mockRestore();
      deleteTripSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it("keeps a trip visible when trip deletion fails", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "88",
      title: "강원 2일 여행",
      dates: "2026.06.15 - 06.16",
      days: { 1: [], 2: [] },
    };
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const deleteTripSpy = vi
      .spyOn(appDataApi, "deleteTrip")
      .mockRejectedValue(new Error("Trip not found"));
    const confirmSpy = vi.spyOn(window, "confirm");

    try {
      await login();
      cleanup();
      renderAppRoute("/trips");
      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: "삭제" }));
      const deleteDialog = await screen.findByRole("dialog", {
        name: "일정을 삭제할까요?",
      });
      expect(confirmSpy).not.toHaveBeenCalled();
      await user.click(
        within(deleteDialog).getByRole("button", { name: "삭제" }),
      );

      await waitFor(() =>
        expect(document.body).toHaveTextContent(
          "일정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      );
      expect(document.body).toHaveTextContent("강원 2일 여행");
    } finally {
      listTripsSpy.mockRestore();
      deleteTripSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it("renders trips without list confirmation controls or status badges", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "91",
      title: "Draft trip",
      status: "draft",
      currentUserRole: "owner",
    };
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const updateStatusSpy = vi
      .spyOn(appDataApi, "updateTripStatus")
      .mockResolvedValue({ ...trip, status: "confirmed" });

    try {
      await login();
      cleanup();
      renderAppRoute("/trips");
      await screen.findByText("Draft trip");
      expect(
        document.querySelector(".trip-confirm-panel"),
      ).not.toBeInTheDocument();
      expect(document.querySelector(".trip-dday-chip")).not.toBeInTheDocument();
      expect(updateStatusSpy).not.toHaveBeenCalled();
      const statusTags = Array.from(
        document.querySelectorAll(".itinerary-policy-row .tag"),
      );
      expect(statusTags).toHaveLength(1);
      expect(statusTags[0]).toHaveClass("benefit");
      expect(document.body).not.toHaveTextContent("작성 중");
      expect(document.body).not.toHaveTextContent("확정됨");
    } finally {
      listTripsSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("does not call trip confirmation from the trips list", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "92",
      title: "Draft trip without list action",
      status: "draft",
      currentUserRole: "owner",
    };
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const updateStatusSpy = vi
      .spyOn(appDataApi, "updateTripStatus")
      .mockRejectedValue(new Error("save failed"));

    try {
      await login();
      cleanup();
      renderAppRoute("/trips");
      await screen.findByText("Draft trip without list action");
      expect(screen.queryByText("작성 중")).not.toBeInTheDocument();
      expect(screen.queryByText("확정됨")).not.toBeInTheDocument();
      expect(
        document.querySelector(".trip-confirm-check"),
      ).not.toBeInTheDocument();
      expect(updateStatusSpy).not.toHaveBeenCalled();
    } finally {
      listTripsSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("hides trip confirmation controls for viewer trips", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "93",
      title: "Viewer trip",
      status: "draft",
      currentUserRole: "viewer",
    };
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const updateStatusSpy = vi
      .spyOn(appDataApi, "updateTripStatus")
      .mockResolvedValue({ ...trip, status: "confirmed" });

    try {
      await login();
      cleanup();
      renderAppRoute("/trips");
      await screen.findByText("Viewer trip");
      expect(
        document.querySelector(".trip-confirm-panel"),
      ).not.toBeInTheDocument();
      expect(updateStatusSpy).not.toHaveBeenCalled();
    } finally {
      listTripsSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("keeps confirmed owner trip detail editable without confirmation controls", async () => {
    const confirmedTrip: Trip = {
      ...getPreviewTrip(),
      id: "94",
      title: "Confirmed detail trip",
      status: "confirmed",
      currentUserRole: "owner",
      linkedPolicies: [
        {
          slug: examplePolicySlug,
          title: examplePolicyTitle,
          amount: "10,000원 할인",
          region: "경남",
        },
      ],
      days: {
        1: [
          {
            id: "p1",
            time: "09:00",
            label: "Locked beach",
            meta: "확정 일정 장소",
          },
        ],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(confirmedTrip);
    const updateStatusSpy = vi
      .spyOn(appDataApi, "updateTripStatus")
      .mockRejectedValue(new Error("status update should not run"));

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/94");

      await waitFor(() =>
        expect(
          screen.getAllByText("Confirmed detail trip").length,
        ).toBeGreaterThan(0),
      );
      expect(
        screen.queryByRole("region", { name: "일정 확정 상태" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확정취소" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확정하기" }),
      ).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(
        "확정된 일정은 편집할 수 없어요",
      );
      expect(
        document.querySelector(".prototype-trip-action-add"),
      ).toBeInTheDocument();
      expect(document.querySelector(".drag-handle")).toBeInTheDocument();
      expect(document.querySelector(".place-actions")).toBeInTheDocument();
      expect(
        document.querySelector(".linked-policy-remove"),
      ).toBeInTheDocument();
      expect(updateStatusSpy).not.toHaveBeenCalled();
    } finally {
      getTripSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("does not render draft trip detail confirmation controls", async () => {
    const draftTrip: Trip = {
      ...getPreviewTrip(),
      id: "96",
      title: "Draft detail trip",
      status: "draft",
      currentUserRole: "owner",
      linkedPolicies: [
        {
          slug: examplePolicySlug,
          title: examplePolicyTitle,
          amount: "10,000원 할인",
          region: "경남",
        },
      ],
      days: {
        1: [
          {
            id: "p1",
            time: "09:00",
            label: "Editable beach",
            meta: "작성 중 장소",
          },
        ],
      },
    };
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue(draftTrip);
    const updateStatusSpy = vi
      .spyOn(appDataApi, "updateTripStatus")
      .mockRejectedValue(new Error("status update should not run"));

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/96");

      await waitFor(() =>
        expect(screen.getAllByText("Draft detail trip").length).toBeGreaterThan(
          0,
        ),
      );
      expect(
        screen.queryByRole("region", { name: "일정 확정 상태" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확정하기" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확정취소" }),
      ).not.toBeInTheDocument();
      expect(
        document.querySelector(".prototype-trip-action-add"),
      ).toBeInTheDocument();
      expect(document.querySelector(".drag-handle")).toBeInTheDocument();
      expect(document.querySelector(".place-actions")).toBeInTheDocument();
      expect(
        document.querySelector(".linked-policy-remove"),
      ).toBeInTheDocument();
      expect(updateStatusSpy).not.toHaveBeenCalled();
    } finally {
      getTripSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("does not show confirmation cancel controls for confirmed viewer trips", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "95",
      title: "Confirmed viewer trip",
      status: "confirmed",
      currentUserRole: "viewer",
      days: {
        1: [
          {
            id: "p1",
            time: "09:00",
            label: "Viewer locked place",
            meta: "읽기 전용",
          },
        ],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const updateStatusSpy = vi
      .spyOn(appDataApi, "updateTripStatus")
      .mockResolvedValue({ ...trip, status: "draft" });

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/95");

      await waitFor(() =>
        expect(
          screen.getAllByText("Confirmed viewer trip").length,
        ).toBeGreaterThan(0),
      );
      expect(
        screen.queryByRole("button", { name: "확정취소" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확정하기" }),
      ).not.toBeInTheDocument();
      expect(updateStatusSpy).not.toHaveBeenCalled();
    } finally {
      getTripSpy.mockRestore();
      updateStatusSpy.mockRestore();
    }
  });

  it("filters policies by region and prototype category tabs", async () => {
    const policies: Policy[] = [
      examplePolicyDetail,
      {
        ...examplePolicyDetail,
        id: "gangneung-stay",
        slug: "gangneung-stay",
        label: "GN",
        tag: "숙박",
        title: "강릉 숙박 할인권",
        region: "강원",
        category: "숙박",
        summary: "강릉 숙박 혜택",
      },
      {
        ...examplePolicyDetail,
        id: "busan-card-cashback",
        slug: "busan-card-cashback",
        label: "BS",
        tag: "지역할인",
        title: "부산 카드 캐시백",
        region: "부산",
        category: "지역할인",
        summary: "부산 지역 결제 혜택",
      },
    ];
    const listPoliciesSpy = vi
      .spyOn(appDataApi, "listPolicies")
      .mockResolvedValue(policies);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent(examplePolicyTitle),
      );
      expect(document.body).toHaveTextContent("강릉 숙박 할인권");
      expect(document.body).toHaveTextContent("부산 카드 캐시백");

      await user.click(screen.getByRole("button", { name: "🌎 지역" }));
      const regionFilter = screen.getByRole("group", { name: "지역 필터" });
      const visibleBusanFilter = within(regionFilter).queryByRole("button", {
        name: "부산",
      });
      if (visibleBusanFilter) {
        await user.click(visibleBusanFilter);
      } else {
        await user.click(
          within(regionFilter).getByRole("button", { name: "전체 지역 보기" }),
        );
        await user.click(
          within(regionFilter).getByRole("button", { name: "부산" }),
        );
      }
      await waitFor(() =>
        expect(document.body).toHaveTextContent("부산 카드 캐시백"),
      );
      expect(screen.queryByText("강릉 숙박 할인권")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "지역할인" }));
      await waitFor(() =>
        expect(document.body).toHaveTextContent("부산 카드 캐시백"),
      );

      await user.click(screen.getByRole("button", { name: "초기화" }));
      await waitFor(() =>
        expect(document.body).toHaveTextContent(examplePolicyTitle),
      );
      expect(document.body).toHaveTextContent("강릉 숙박 할인권");
      expect(getLink(examplePolicyPath)).toBeInTheDocument();
    } finally {
      listPoliciesSpy.mockRestore();
    }
  });

  it("shows primary regions first and reveals the full region list on demand", async () => {
    const regionalPolicies: Policy[] = [
      {
        id: "nationwide",
        slug: "nationwide",
        label: "ALL",
        tag: "지역할인",
        title: "전국 여행 할인",
        org: "한국관광공사",
        region: "전국",
        deadline: "2026-06-30",
        amount: "할인",
        summary: "전국 혜택",
        match: 92,
        category: "지역할인",
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
        sourceType: "internal",
      },
      {
        id: "jeju",
        slug: "jeju",
        label: "JEJU",
        tag: "숙박",
        title: "제주 숙박 할인",
        org: "제주관광공사",
        region: "제주",
        deadline: "2026-06-30",
        amount: "할인",
        summary: "제주 혜택",
        match: 91,
        category: "숙박",
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
        sourceType: "internal",
      },
      ...[
        "부산",
        "부산",
        "서울",
        "서울",
        "강원",
        "강원",
        "경기",
        "전남",
        "대구",
        "광주",
      ].map((region, index) => ({
        id: `region-${index}`,
        slug: `region-${index}`,
        label: region,
        tag: "지역할인",
        title: `${region} 지역 혜택`,
        org: `${region}관광공사`,
        region,
        deadline: "2026-06-30",
        amount: "할인",
        summary: `${region} 혜택`,
        match: 80 - index,
        category: "지역할인" as const,
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
        sourceType: "internal" as const,
      })),
    ];
    const policyListSpy = vi
      .spyOn(appDataApi, "listPolicies")
      .mockResolvedValue(regionalPolicies);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("전국 여행 할인"),
      );
      await user.click(screen.getByRole("button", { name: "🌎 지역" }));
      const regionFilter = screen.getByRole("group", { name: "지역 필터" });

      expect(within(regionFilter).getByText("주요 지역")).toBeInTheDocument();
      expect(
        within(regionFilter).getByRole("button", { name: "전체 지역 보기" }),
      ).toBeInTheDocument();
      expect(
        within(regionFilter).queryByRole("button", { name: "광주" }),
      ).not.toBeInTheDocument();

      await user.click(
        within(regionFilter).getByRole("button", { name: "전체 지역 보기" }),
      );
      await user.click(
        within(regionFilter).getByRole("button", { name: "광주" }),
      );

      await waitFor(() =>
        expect(document.body).toHaveTextContent("광주 지역 혜택"),
      );
      expect(screen.queryByText("전국 여행 할인")).not.toBeInTheDocument();
    } finally {
      policyListSpy.mockRestore();
    }
  });

  it("renders the prototype policy list tabs and compact cards", async () => {
    const policies: Policy[] = [
      examplePolicyDetail,
      {
        ...examplePolicyDetail,
        id: "busan-card-cashback",
        slug: "busan-card-cashback",
        label: "BS",
        tag: "지역할인",
        title: "부산 카드 캐시백",
        region: "부산",
        category: "지역할인",
      },
      {
        ...examplePolicyDetail,
        id: "gangneung-stay",
        slug: "gangneung-stay",
        label: "GN",
        tag: "숙박",
        title: "강릉 숙박 할인권",
        region: "강원",
        category: "숙박",
      },
    ];
    const listPoliciesSpy = vi
      .spyOn(appDataApi, "listPolicies")
      .mockResolvedValue(policies);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("♥ 즐겨찾기"),
      );
      expect(screen.getByRole("button", { name: "전체" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "교통" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "숙박" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "여행상품" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "지역할인" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "이벤트" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "기타" })).toBeInTheDocument();
      expect(screen.queryByText("정책 탐색 바로가기")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "지역할인" }));

      await waitFor(() =>
        expect(document.body).toHaveTextContent("부산 카드 캐시백"),
      );
      expect(document.body).toHaveTextContent("부산 카드 캐시백");
      expect(document.body).toHaveTextContent(examplePolicyTitle);
      expect(screen.queryByText("강릉 숙박 할인권")).not.toBeInTheDocument();
    } finally {
      listPoliciesSpy.mockRestore();
    }
  });

  it("shows policy result counts, search, and priority ordering", async () => {
    const policies: Policy[] = [
      {
        id: "far-discount",
        slug: "far-discount",
        label: "할인",
        tag: "지역할인",
        title: "장기 지역 할인",
        org: "Travel Hunter",
        region: "전국",
        deadline: testIsoDateFromToday(120),
        amount: "혜택 제공",
        summary: "공식 안내 확인",
        match: 99,
        category: "지역할인",
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
        sourceType: "internal",
      },
      {
        id: "transport-expiring",
        slug: "transport-expiring",
        label: "교통",
        tag: "교통",
        title: "강릉 KTX 할인",
        org: "Travel Hunter",
        region: "강원",
        deadline: testIsoDateFromToday(3),
        amount: "30% 할인",
        summary: "강릉 여행 교통 할인",
        match: 70,
        category: "교통",
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
        sourceType: "internal",
      },
      {
        id: "lodging-clear",
        slug: "lodging-clear",
        label: "숙박",
        tag: "숙박",
        title: "부산 숙박 5만원 할인",
        org: "Travel Hunter",
        region: "부산",
        deadline: testIsoDateFromToday(30),
        amount: "최대 5만원",
        summary: "부산 숙박 할인",
        match: 80,
        category: "숙박",
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
        sourceType: "internal",
      },
    ];
    const listPoliciesSpy = vi
      .spyOn(appDataApi, "listPolicies")
      .mockResolvedValue(policies);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("전체 3개 중 3개 표시"),
      );
      const firstPolicyLink = document.querySelector(
        ".policy-list-card:first-child a",
      );
      expect(firstPolicyLink?.textContent).toContain("강릉 KTX 할인");

      await user.type(
        screen.getByPlaceholderText("정책명, 지역, 혜택으로 검색"),
        "부산",
      );

      await waitFor(() =>
        expect(document.body).toHaveTextContent("전체 3개 중 1개 표시"),
      );
      expect(document.body).toHaveTextContent("부산 숙박 5만원 할인");
      expect(document.body).not.toHaveTextContent("강릉 KTX 할인");
    } finally {
      listPoliciesSpy.mockRestore();
    }
  });

  it("shows matching policies for transport and travel product category tabs", async () => {
    const transportPolicy: Policy = {
      id: "transport-policy",
      slug: "transport-policy",
      label: "TR",
      tag: "교통",
      title: "남도 기차둘레길 1박 2일 최대 35% 할인행사",
      org: "한국관광공사",
      region: "전남",
      deadline: "2026-05-31",
      amount: "최대 35%",
      summary: "남도 기차 여행상품 할인",
      match: 90,
      category: "교통",
      requirements: [],
      documents: [],
      officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
      applyUrl: null,
      sourceType: "external",
    };
    const packagePolicy: Policy = {
      id: "package-policy",
      slug: "package-policy",
      label: "PK",
      tag: "여행상품",
      title: "K리그 지역 원정 경기 관람 및 체류여행 패키지 할인",
      org: "한국관광공사",
      region: "전국",
      deadline: "2026-05-31",
      amount: "할인",
      summary: "체류여행 패키지 할인",
      match: 88,
      category: "여행상품",
      requirements: [],
      documents: [],
      officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
      applyUrl: null,
      sourceType: "external",
    };
    const policyListSpy = vi
      .spyOn(appDataApi, "listPolicies")
      .mockResolvedValue([transportPolicy, packagePolicy]);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies");
      const user = userEvent.setup();

      await waitFor(() =>
        expect(document.body).toHaveTextContent("남도 기차둘레길"),
      );
      await user.click(screen.getByRole("button", { name: "교통" }));
      expect(document.body).toHaveTextContent(
        "남도 기차둘레길 1박 2일 최대 35% 할인행사",
      );
      expect(
        screen.queryByText("K리그 지역 원정 경기 관람 및 체류여행 패키지 할인"),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "여행상품" }));
      expect(document.body).toHaveTextContent(
        "K리그 지역 원정 경기 관람 및 체류여행 패키지 할인",
      );
      expect(
        screen.queryByText("남도 기차둘레길 1박 2일 최대 35% 할인행사"),
      ).not.toBeInTheDocument();
    } finally {
      policyListSpy.mockRestore();
    }
  });

  it("restores the policy category tab from the URL", async () => {
    const transportPolicy: Policy = {
      id: "transport-policy",
      slug: "transport-policy",
      label: "TR",
      tag: "교통",
      title: "남도 기차둘레길 1박 2일 최대 35% 할인행사",
      org: "한국관광공사",
      region: "전남",
      deadline: "2026-05-31",
      amount: "최대 35%",
      summary: "남도 기차 여행상품 할인",
      match: 90,
      category: "교통",
      requirements: [],
      documents: [],
      officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
      applyUrl: null,
      sourceType: "external",
    };
    const packagePolicy: Policy = {
      id: "jeju-city-tour",
      slug: "jeju-city-tour",
      label: "JEJU",
      tag: "여행상품",
      title: "제주시티투어버스 1일 탑승권 33% 할인",
      org: "한국관광공사",
      region: "제주",
      deadline: "2026-05-31",
      amount: "33%",
      summary: "제주시티투어버스 탑승권 할인",
      match: 88,
      category: "여행상품",
      requirements: [],
      documents: [],
      officialUrl: "https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
      applyUrl: null,
      sourceType: "external",
    };
    const policyListSpy = vi
      .spyOn(appDataApi, "listPolicies")
      .mockResolvedValue([transportPolicy, packagePolicy]);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies?category=여행상품");

      await waitFor(() =>
        expect(document.body).toHaveTextContent(
          "제주시티투어버스 1일 탑승권 33% 할인",
        ),
      );
      expect(screen.getByRole("button", { name: "여행상품" })).toHaveClass(
        "active",
      );
      expect(
        screen.queryByText("남도 기차둘레길 1박 2일 최대 35% 할인행사"),
      ).not.toBeInTheDocument();
    } finally {
      policyListSpy.mockRestore();
    }
  });

  it("renders collected TravelMonth benefits in the policy list", async () => {
    const collectedPolicy: Policy = {
      id: "travelmonth-58",
      slug: "travelmonth-58",
      label: "부산",
      tag: "최대 2만원",
      title: "부산 공식 캐시백",
      org: "부산관광공사",
      region: "부산",
      deadline: "2026-06-30",
      amount: "최대 2만원",
      summary: "부산 공식 캐시백 상품 할인",
      match: 80,
      category: "지역할인",
      requirements: ["공식 안내에서 신청 조건을 확인하세요."],
      documents: ["혜택 안내 확인"],
      officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
      applyUrl: null,
      sourceType: "external",
    };
    const listPoliciesSpy = vi
      .spyOn(appDataApi, "listPolicies")
      .mockResolvedValue([collectedPolicy]);
    const savePolicySpy = vi.spyOn(appDataApi, "savePolicy");

    try {
      await login();
      cleanup();
      renderAppRoute("/policies");

      await waitFor(() =>
        expect(getLink("/policies/travelmonth-58")).toBeInTheDocument(),
      );
      expect(document.body).toHaveTextContent("부산 공식 캐시백");
      expect(document.body).not.toHaveTextContent("공식 수집");
      expect(document.body).not.toHaveTextContent("external");
      expect(
        screen.getByRole("button", { name: /부산 공식 캐시백 즐겨찾기/ }),
      ).toBeInTheDocument();
      expect(savePolicySpy).not.toHaveBeenCalled();
    } finally {
      listPoliciesSpy.mockRestore();
      savePolicySpy.mockRestore();
    }
  });

  it("renders normalized official benefit detail with enabled save and trip controls", async () => {
    const collectedPolicy: Policy = {
      id: "travelmonth-58",
      slug: "travelmonth-58",
      label: "부산",
      tag: "최대 2만원",
      title: "부산 공식 캐시백",
      org: "부산관광공사",
      region: "부산",
      deadline: "2026-06-30",
      amount: "최대 2만원",
      summary: "부산 야경투어 상품 할인",
      match: 80,
      category: "지역할인",
      requirements: ["공식 안내에서 신청 조건을 확인하세요."],
      documents: ["혜택 안내 확인"],
      officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
      applyUrl: null,
      sourceType: "external",
    };
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "201",
      title: "부산 공식 혜택 여행",
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(collectedPolicy);
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const savePolicySpy = vi
      .spyOn(appDataApi, "savePolicy")
      .mockResolvedValue({ policyId: "travelmonth-58", saved: true });
    const addPolicyToTripSpy = vi
      .spyOn(appDataApi, "addPolicyToTrip")
      .mockResolvedValue({
        tripId: "201",
        policyId: "travelmonth-58",
        added: true,
      });

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/travelmonth-58");
      const user = userEvent.setup();

      expect(
        await screen.findByRole("heading", { name: "부산 공식 캐시백" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "혜택 안내 보기" }),
      ).toHaveAttribute("href", collectedPolicy.officialUrl);
      expect(document.body).not.toHaveTextContent("공식 수집");
      const saveButton = screen.getByRole("button", { name: "저장" });
      const tripButton = screen.getByRole("button", {
        name: /내 일정에 담기|일정에 담김/,
      });
      expect(saveButton).not.toBeDisabled();
      expect(tripButton).not.toBeDisabled();
      await user.click(saveButton);
      await user.click(tripButton);
      await user.click(
        await screen.findByRole("button", { name: /부산 공식 혜택 여행/ }),
      );
      expect(savePolicySpy).toHaveBeenCalledWith("travelmonth-58");
      expect(listTripsSpy).toHaveBeenCalled();
      await waitFor(() =>
        expect(addPolicyToTripSpy).toHaveBeenCalledWith(
          "201",
          "travelmonth-58",
        ),
      );
    } finally {
      getPolicySpy.mockRestore();
      listTripsSpy.mockRestore();
      savePolicySpy.mockRestore();
      addPolicyToTripSpy.mockRestore();
    }
  });

  it("renders the prototype home rails with real policy links", async () => {
    await login();
    cleanup();
    renderAppRoute("/home");

    await waitFor(() =>
      expect(document.body).toHaveTextContent("이번 주 혜택"),
    );
    expect(document.body).toHaveTextContent("어디로 떠나세요?");
    expect(screen.getByLabelText("마이페이지")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("안녕,");
    expect(document.body).toHaveTextContent(
      "이번 주 놓치면 아쉬운 혜택이 있어요",
    );
    expect(document.body).toHaveTextContent("인기 국내 여행지");
    expect(document.body).toHaveTextContent("AI 추천 맞춤 일정");
    expect(document.body).not.toHaveTextContent("추천 혜택");
    expect(screen.getByLabelText("이번 주 혜택 정책 목록")).toBeInTheDocument();
    expect(document.querySelector(".ds-home-rail")).toBeTruthy();
    const destinationRail = screen.getByLabelText("인기 국내 여행지 목록");
    expect(destinationRail).toBeInTheDocument();
    await waitFor(() => {
      const destinationLinks = within(destinationRail).getAllByRole("link");
      expect(destinationLinks.length).toBeGreaterThan(0);
      expect(destinationLinks[0]).toHaveAttribute(
        "href",
        expect.stringMatching(/^\/trips\/new\?region=/),
      );
    });
    await waitFor(() =>
      expect(
        within(destinationRail).getAllByText(/(혜택|마감 임박) \d+개/).length,
      ).toBeGreaterThan(0),
    );
    expect(document.body).not.toHaveTextContent("⭐ 4.9");
    await waitFor(() =>
      expect(screen.getByText("이번 주 인기 정책")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("이번 주 혜택 정책 목록")).getAllByRole(
          "link",
        ).length,
      ).toBeGreaterThan(0),
    );
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("이번 주 혜택 정책 목록")).getAllByRole(
          "link",
        ).length,
      ).toBeGreaterThan(0),
    );
  });

  it("uses profile style to render region recommendations on the home destination rail", async () => {
    const getProfileSpy = vi.spyOn(appDataApi, "getProfile").mockResolvedValue({
      region: "부산",
      style: "맛집",
      budget: "40만원 이하",
    });
    const regionRecommendations: RegionRecommendation[] = [
      {
        region: "강원",
        title: "강원 미식 지원",
        reason: "맛집 혜택이 많고 마감 임박 정책이 있습니다.",
        policyCount: 7,
        endingSoonCount: 2,
        estimatedValueKrw: 50000,
        score: 12,
        styleMatchedCount: 3,
      },
      {
        region: "부산",
        title: "부산 로컬 혜택",
        reason: "맛집 취향과 연결되는 지역 혜택입니다.",
        policyCount: 5,
        endingSoonCount: 0,
        estimatedValueKrw: 30000,
        score: 9,
        styleMatchedCount: 2,
      },
    ];
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue(regionRecommendations);

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      await waitFor(() =>
        expect(listRegionRecommendationsSpy).toHaveBeenCalledWith({
          style: "맛집",
          region: "부산",
          limit: 3,
        }),
      );
      const destinationRail = screen.getByLabelText("인기 국내 여행지 목록");
      expect(
        within(destinationRail).getByRole("link", { name: /강원/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EA%B0%95%EC%9B%90");
      expect(
        within(destinationRail).getByText("마감 임박 2개"),
      ).toBeInTheDocument();
      expect(
        within(destinationRail).getByRole("link", { name: /부산/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      expect(within(destinationRail).getByText("혜택 5개")).toBeInTheDocument();
    } finally {
      getProfileSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("uses a region recommendation CTA for the home AI trip card instead of an existing trip", async () => {
    const existingTrip: Trip = {
      ...getPreviewTrip(),
      id: "300",
      title: "경주 야호",
      dates: "2026.05.18 - 05.20",
      expectedSaving: "30만원",
    };
    const regionRecommendations: RegionRecommendation[] = [
      {
        region: "부산",
        title: "부산 맛집 추천",
        reason: "맛집 혜택이 많고 마감 임박 정책이 있습니다.",
        policyCount: 5,
        endingSoonCount: 1,
        estimatedValueKrw: 70000,
        score: 10,
        styleMatchedCount: 2,
      },
    ];
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([existingTrip]);
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue(regionRecommendations);

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      await waitFor(() =>
        expect(listRegionRecommendationsSpy).toHaveBeenCalled(),
      );
      expect(listTripsSpy).not.toHaveBeenCalled();
      const aiCard = document.querySelector(
        ".prototype-home-ai-card",
      ) as HTMLAnchorElement | null;
      expect(aiCard).toBeTruthy();
      expect(aiCard).toHaveAttribute(
        "href",
        "/trips/new?region=%EB%B6%80%EC%82%B0",
      );
      expect(aiCard).toHaveTextContent("부산");
      expect(aiCard).not.toHaveTextContent("경주 야호");
      expect(aiCard).not.toHaveTextContent("2026.05.18 - 05.20");
      expect(aiCard).not.toHaveTextContent("예상 절약 30만원");
    } finally {
      listTripsSpy.mockRestore();
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("keeps policy-based home destinations when region recommendations fail", async () => {
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockRejectedValue(new Error("recommendation API unavailable"));

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      const destinationRail =
        await screen.findByLabelText("인기 국내 여행지 목록");
      expect(
        within(destinationRail).getByRole("link", { name: /부산/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      await waitFor(() =>
        expect(
          within(destinationRail).getAllByText(/혜택 \d+개/).length,
        ).toBeGreaterThan(0),
      );
    } finally {
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("keeps policy-based home destinations when region recommendations are empty", async () => {
    const listRegionRecommendationsSpy = vi
      .spyOn(appDataApi, "listRegionRecommendations")
      .mockResolvedValue([]);

    try {
      await login();
      cleanup();
      renderAppRoute("/home");

      const destinationRail =
        await screen.findByLabelText("인기 국내 여행지 목록");
      expect(
        within(destinationRail).getByRole("link", { name: /부산/ }),
      ).toHaveAttribute("href", "/trips/new?region=%EB%B6%80%EC%82%B0");
      await waitFor(() =>
        expect(
          within(destinationRail).getAllByText(/혜택 \d+개/).length,
        ).toBeGreaterThan(0),
      );
    } finally {
      listRegionRecommendationsSpy.mockRestore();
    }
  });

  it("renders multiple saved trips on the trips list", async () => {
    const trips: Trip[] = [
      {
        ...getPreviewTrip(),
        id: "77",
        title: "부산 4일 여행",
        dates: "2026.06.15 - 06.18",
        participantCount: 4,
        days: { 1: [], 2: [], 3: [], 4: [] },
      },
      {
        ...getPreviewTrip(),
        id: "78",
        title: "경주 3일 여행",
        dates: "2026.07.01 - 07.03",
        days: { 1: [], 2: [], 3: [] },
      },
    ];
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue(trips);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips");

      await screen.findByText("부산 4일 여행");
      expect(screen.getByText("경주 3일 여행")).toBeInTheDocument();
      expect(document.querySelectorAll(".itinerary-card")).toHaveLength(2);
      expect(screen.getByText(/👥 4명 참여/)).toBeInTheDocument();
      expect(getLink("/trips/77")).toBeInTheDocument();
      expect(getLink("/trips/78")).toBeInTheDocument();
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("opens the policy trip picker, attaches a policy, and links to the selected trip", async () => {
    const previewTrip = getPreviewTrip();
    const user = userEvent.setup();
    const loginSpy = vi
      .spyOn(appDataApi, "login")
      .mockResolvedValue({ accessToken: "test-token", user: getPreviewUser() });
    const refreshSpy = vi
      .spyOn(appDataApi, "refreshSession")
      .mockResolvedValue({ accessToken: "test-token", user: getPreviewUser() });
    const profileSpy = vi
      .spyOn(appDataApi, "getProfile")
      .mockResolvedValue({ region: "부산", style: "휴식", budget: "20만원" });
    const savedPolicySpy = vi
      .spyOn(appDataApi, "listSavedPolicies")
      .mockResolvedValue([]);
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(examplePolicyDetail);
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([previewTrip]);
    const addPolicyToTripSpy = vi
      .spyOn(appDataApi, "addPolicyToTrip")
      .mockResolvedValue({
        tripId: previewTrip.id,
        policyId: examplePolicySlug,
        added: true,
      });
    const getTripSpy = vi
      .spyOn(appDataApi, "getTrip")
      .mockResolvedValue({ ...previewTrip, linkedPolicies: [] });

    try {
      renderAppRoute("/login");
      await user.type(
        document.querySelector('input[name="email"]') as HTMLInputElement,
        testEmail,
      );
      await user.type(
        document.querySelector('input[name="password"]') as HTMLInputElement,
        testPassword,
      );
      await user.click(document.querySelector('button[type="submit"]') as HTMLButtonElement);

      await waitFor(() => expect(getLink("/policies")).toBeInTheDocument());
      cleanup();
      renderAppRoute(examplePolicyPath);

      const addButton = await waitFor(() => {
        const button = document.querySelector(".sticky-cta button");
        expect(button).toBeTruthy();
        return button as HTMLButtonElement;
      });
      await user.click(addButton);

      const row = await waitFor(() => {
        const tripRow = document.querySelector(".trip-select-row");
        expect(tripRow).toBeTruthy();
        return tripRow as HTMLButtonElement;
      });
      await user.click(row);

      await screen.findByText(`${examplePolicyTitle}을 부산 여행 1에 담았어요`);
      expect(screen.getByText("부산 여행 1에서 연결된 정책을 확인할 수 있어요.")).toBeInTheDocument();
      expect(addPolicyToTripSpy).toHaveBeenCalledWith(previewTrip.id, examplePolicySlug);

      await user.click(screen.getByRole("button", { name: "일정에서 보기" }));

      const linkedRegion = await screen.findByRole("region", {
        name: "연결된 정책",
      });
      expect(within(linkedRegion).getByText(examplePolicyTitle)).toBeInTheDocument();
    } finally {
      loginSpy.mockRestore();
      refreshSpy.mockRestore();
      profileSpy.mockRestore();
      savedPolicySpy.mockRestore();
      getPolicySpy.mockRestore();
      listTripsSpy.mockRestore();
      addPolicyToTripSpy.mockRestore();
      getTripSpy.mockRestore();
    }
  });

  it("shows all saved trips in the policy trip picker", async () => {
    const trips: Trip[] = [
      {
        ...getPreviewTrip(),
        id: "201",
        title: "부산 야호",
        dates: "2026.07.04 - 07.08",
        days: { 1: [] },
      },
      {
        ...getPreviewTrip(),
        id: "202",
        title: "경주 야호",
        dates: "2026.05.18 - 05.20",
        days: { 1: [] },
      },
    ];
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue(trips);

    try {
      await login();
      cleanup();
      renderAppRoute(examplePolicyPath);

      await userEvent.setup().click(
        await screen.findByRole("button", {
          name: /내 일정에 담기|일정에 담김/,
        }),
      );
      await screen.findByText("부산 야호");
      expect(screen.getByText("경주 야호")).toBeInTheDocument();
      expect(document.querySelectorAll(".trip-select-row")).toHaveLength(2);
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("keeps the trip-attached state scoped to the selected policy", async () => {
    const originalGetPolicy = appDataApi.getPolicy.bind(appDataApi);
    const otherPolicy: Policy = {
      id: "city-pass",
      slug: "city-pass",
      label: "CP",
      tag: "추천",
      title: "도시 여행 패스",
      org: "Travel Hunter",
      region: "전국",
      deadline: "2026-12-31",
      amount: "확인 필요",
      summary: "다른 정책 상세 CTA 상태를 확인하기 위한 정책입니다.",
      match: 72,
      category: "지역할인",
      requirements: ["국내 여행자"],
      documents: ["신분증"],
      officialUrl: null,
      applyUrl: null,
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockImplementation((slug) =>
        slug === "city-pass"
          ? Promise.resolve(otherPolicy)
          : originalGetPolicy(slug),
      );

    try {
      await login();
      cleanup();
      render(
        <MemoryRouter initialEntries={[examplePolicyPath]}>
          <AppProviders>
            <App />
            <Link to="/policies/city-pass">다른 정책 테스트 이동</Link>
          </AppProviders>
        </MemoryRouter>,
      );

      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("button", { name: /내 일정에 담기/ }),
      );
      await user.click(
        await screen.findByRole("button", { name: /제주 3일 여행/ }),
      );
      await waitFor(() =>
        expect(document.querySelector(".toast")).toBeTruthy(),
      );
      await user.click(
        screen.getByRole("link", { name: "다른 정책 테스트 이동" }),
      );

      await waitFor(() =>
        expect(screen.getByText("도시 여행 패스")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: /내 일정에 담기/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "일정에 담김" }),
      ).not.toBeInTheDocument();
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("saves a policy from the policy detail header action", async () => {
    await login();
    await appDataApi
      .removeSavedPolicy(examplePolicySlug)
      .catch(() => undefined);
    cleanup();
    render(
      <MemoryRouter
        initialEntries={["/policies", examplePolicyPath]}
        initialIndex={1}
      >
        <AppProviders>
          <App />
        </AppProviders>
      </MemoryRouter>,
    );

    const saveButton = await screen.findByRole("button", { name: "저장" });
    const user = userEvent.setup();
    await user.click(saveButton);

    await waitFor(() =>
      expect(document.body).toHaveTextContent("관심 정책으로 저장했어요."),
    );
    await user.click(screen.getByRole("button", { name: "뒤로" }));
    const savedFilterButton = await waitFor(() => {
      const button = document.querySelector(".prototype-head-pill");
      expect(button).toBeTruthy();
      return button as HTMLButtonElement;
    });
    await user.click(savedFilterButton);

    await waitFor(() => {
      expect(document.querySelector(".prototype-head-pill")).toHaveTextContent(
        /\([1-9]\d*\)/,
      );
      expect(getLink(examplePolicyPath)).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("button", {
        name: `${examplePolicyTitle} 즐겨찾기 해제`,
      }),
    );
    await waitFor(() =>
      expect(
        document.querySelector(`a[href="${examplePolicyPath}"]`),
      ).toBeFalsy(),
    );
  });

  it("refreshes the my page favorite summary after policy detail save and unsave", async () => {
    const user = userEvent.setup();
    const listSavedPoliciesSpy = vi
      .spyOn(appDataApi, "listSavedPolicies")
      .mockResolvedValue([]);
    const savePolicySpy = vi
      .spyOn(appDataApi, "savePolicy")
      .mockResolvedValue({ policyId: examplePolicySlug, saved: true });
    const removeSavedPolicySpy = vi
      .spyOn(appDataApi, "removeSavedPolicy")
      .mockResolvedValue({ policyId: examplePolicySlug, saved: false });

    try {
      await login();
      cleanup();
      render(
        <MemoryRouter initialEntries={[examplePolicyPath]}>
          <AppProviders>
            <App />
            <Link to="/mypage">마이페이지 테스트 이동</Link>
            <Link to={examplePolicyPath}>정책 상세 테스트 이동</Link>
          </AppProviders>
        </MemoryRouter>,
      );

      await user.click(await screen.findByRole("button", { name: "저장" }));
      await waitFor(() =>
        expect(savePolicySpy).toHaveBeenCalledWith(examplePolicySlug),
      );
      await screen.findByText("관심 정책으로 저장했어요.");
      await user.click(screen.getByRole("link", { name: "마이페이지 테스트 이동" }));

      const savedSummary = await screen.findByLabelText("나의 활동 요약");
      const favoritePolicyStat = within(savedSummary)
        .getByText("즐겨찾기")
        .closest(".prototype-stat-card") as HTMLElement;
      await waitFor(() =>
        expect(within(favoritePolicyStat).getByText("1")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("link", { name: "정책 상세 테스트 이동" }));
      await user.click(await screen.findByRole("button", { name: "저장" }));
      await waitFor(() =>
        expect(removeSavedPolicySpy).toHaveBeenCalledWith(examplePolicySlug),
      );
      await screen.findByText("관심 정책에서 해제했어요.");
      await user.click(screen.getByRole("link", { name: "마이페이지 테스트 이동" }));

      const updatedSummary = await screen.findByLabelText("나의 활동 요약");
      const updatedFavoritePolicyStat = within(updatedSummary)
        .getByText("즐겨찾기")
        .closest(".prototype-stat-card") as HTMLElement;
      await waitFor(() =>
        expect(within(updatedFavoritePolicyStat).getByText("0")).toBeInTheDocument(),
      );
    } finally {
      listSavedPoliciesSpy.mockRestore();
      savePolicySpy.mockRestore();
      removeSavedPolicySpy.mockRestore();
    }
  });

  it("shows saved policies on my page and removes them", async () => {
    await login();
    await appDataApi.savePolicy(examplePolicySlug);
    cleanup();
    renderAppRoute("/mypage");
    await waitFor(() => expect(getLink(examplePolicyPath)).toBeInTheDocument());
    expect(screen.getAllByText("마이").length).toBeGreaterThan(0);
    expect(screen.queryByText("프로필")).not.toBeInTheDocument();
    expect(screen.getByText("내 일정")).toBeInTheDocument();
    expect(screen.getByText("즐겨찾기")).toBeInTheDocument();
    expect(screen.getByText("신청 정책")).toBeInTheDocument();
    expect(screen.getByText(/즐겨찾기 정책/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /알림 설정/ }),
    ).toBeInTheDocument();
    expect(document.querySelector(".ds-profile-panel")).toBeTruthy();
    expect(
      document.querySelector(".prototype-profile-badge"),
    ).toHaveTextContent("🧳");
    expect(document.querySelector(".prototype-mypage-screen")).toHaveClass(
      "prototype-mypage-screen",
    );
    expect(document.querySelector(".ds-settings-menu")).toBeTruthy();
    const favoriteCard = document.querySelector(".ds-favorite-policy-card");
    expect(favoriteCard).toBeTruthy();
    expect(
      favoriteCard
        ?.querySelector(".ds-favorite-policy-thumb")
        ?.textContent?.trim(),
    ).toMatch(/[🚌🛏️🗺️💸🎊📌]/);
    expect(
      favoriteCard
        ?.querySelector(".ds-favorite-policy-thumb")
        ?.textContent?.trim(),
    ).not.toBe("혜");
    expect(
      favoriteCard?.querySelector(".ds-favorite-policy-copy"),
    ).toBeTruthy();
    expect(
      within(favoriteCard as HTMLElement).getByRole("button", {
        name: "저장 해제",
      }),
    ).toHaveClass("ds-favorite-policy-remove");
    const menuIcons = [
      ...document.querySelectorAll(".prototype-menu-icon"),
    ].map((icon) => icon.textContent?.trim() ?? "");
    expect(menuIcons).toEqual(["", "", "", "", ""]);

    await userEvent.setup().click(
      within(favoriteCard as HTMLElement).getByRole("button", {
        name: "저장 해제",
      }),
    );

    await waitFor(() =>
      expect(
        document.querySelector(`a[href="${examplePolicyPath}"]`),
      ).toBeFalsy(),
    );
  });

  it("shows a compact saved-policy error state with a recovery action on my page", async () => {
    await login();
    const listSavedPoliciesSpy = vi
      .spyOn(appDataApi, "listSavedPolicies")
      .mockRejectedValue(new Error("load failed"));

    try {
      cleanup();
      renderAppRoute("/mypage");

      await waitFor(() =>
        expect(document.body).toHaveTextContent(
          "저장한 정책을 불러오지 못했어요.",
        ),
      );
      const savedPolicySection = screen
        .getByText(/즐겨찾기 정책/)
        .closest("section") as HTMLElement;
      expect(savedPolicySection).toBeTruthy();
      const alert = within(savedPolicySection).getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(
        within(alert).getByRole("link", { name: "정책 찾기" }),
      ).toHaveAttribute("href", "/policies");
    } finally {
      listSavedPoliciesSpy.mockRestore();
    }
  });

  it("shows a lightweight empty state when my page has no favorite policies", async () => {
    await login();
    const listSavedPoliciesSpy = vi
      .spyOn(appDataApi, "listSavedPolicies")
      .mockResolvedValue([]);

    try {
      cleanup();
      renderAppRoute("/mypage");

      await waitFor(() =>
        expect(
          screen.getByText("아직 즐겨찾기한 정책이 없어요"),
        ).toBeInTheDocument(),
      );
      expect(
        screen.getByText(
          "관심 있는 혜택의 하트를 눌러두면 여기에서 다시 확인할 수 있어요.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "정책 보러가기" }),
      ).toHaveAttribute("href", "/policies");
      expect(
        document.querySelector(`a[href="${examplePolicyPath}"]`),
      ).toBeFalsy();
    } finally {
      listSavedPoliciesSpy.mockRestore();
    }
  });

  it("deduplicates favorite policies by slug on my page", async () => {
    await login();
    const duplicatePolicy = { ...examplePolicyDetail };
    const listSavedPoliciesSpy = vi
      .spyOn(appDataApi, "listSavedPolicies")
      .mockResolvedValue([duplicatePolicy, duplicatePolicy]);

    try {
      cleanup();
      renderAppRoute("/mypage");

      await waitFor(() =>
        expect(document.querySelector(".ds-favorite-policy-card")).toBeTruthy(),
      );
      expect(
        document.querySelectorAll(".ds-favorite-policy-card"),
      ).toHaveLength(1);
      expect(screen.getByText("즐겨찾기 정책 (1)")).toBeInTheDocument();
    } finally {
      listSavedPoliciesSpy.mockRestore();
    }
  });

  it("refreshes the my page applied policy summary after policy linking on another route", async () => {
    const trip = getPreviewTrip();
    const user = userEvent.setup();

    await login();
    cleanup();

    const listSavedPoliciesSpy = vi
      .spyOn(appDataApi, "listSavedPolicies")
      .mockResolvedValue([]);
    const listAppliedPoliciesSpy = vi
      .spyOn(appDataApi, "listAppliedPolicies")
      .mockResolvedValue([]);
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const addPolicyToTripSpy = vi
      .spyOn(appDataApi, "addPolicyToTrip")
      .mockResolvedValue({
        tripId: trip.id,
        policyId: examplePolicySlug,
        added: true,
      });

    try {
      render(
        <MemoryRouter initialEntries={[examplePolicyPath]}>
          <AppProviders>
            <App />
            <Link to="/mypage">마이페이지 테스트 이동</Link>
          </AppProviders>
        </MemoryRouter>,
      );

      await user.click(await screen.findByRole("button", { name: /내 일정에 담기/ }));
      await user.click(await screen.findByRole("button", { name: /부산 여행 1/ }));
      await waitFor(() =>
        expect(addPolicyToTripSpy).toHaveBeenCalledWith(
          trip.id,
          examplePolicySlug,
        ),
      );
      await user.click(screen.getByRole("link", { name: "마이페이지 테스트 이동" }));

      const summary = await screen.findByLabelText("나의 활동 요약");
      const appliedPolicyStat = within(summary)
        .getByText("신청 정책")
        .closest(".prototype-stat-card") as HTMLElement;
      await waitFor(() =>
        expect(within(appliedPolicyStat).getByText("1")).toBeInTheDocument(),
      );
    } finally {
      listSavedPoliciesSpy.mockRestore();
      listAppliedPoliciesSpy.mockRestore();
      listTripsSpy.mockRestore();
      addPolicyToTripSpy.mockRestore();
    }
  });

  it("removes trip detail unlinked policies from the my page applied summary", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      linkedPolicies: [],
    };
    const user = userEvent.setup();

    await login();
    cleanup();

    const listAppliedPoliciesSpy = vi
      .spyOn(appDataApi, "listAppliedPolicies")
      .mockResolvedValue([]);
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);
    const addPolicyToTripSpy = vi
      .spyOn(appDataApi, "addPolicyToTrip")
      .mockResolvedValue({
        policyId: examplePolicySlug,
        tripId: trip.id,
        added: true,
      });
    const removePolicyFromTripSpy = vi
      .spyOn(appDataApi, "removePolicyFromTrip")
      .mockResolvedValue({
        policyId: examplePolicySlug,
        tripId: trip.id,
        added: false,
      });

    try {
      render(
        <MemoryRouter initialEntries={[examplePolicyPath]}>
          <AppProviders>
            <App />
            <Link to="/mypage">마이페이지 테스트 이동</Link>
          </AppProviders>
        </MemoryRouter>,
      );

      await user.click(await screen.findByRole("button", { name: /내 일정에 담기/ }));
      await user.click(await screen.findByRole("button", { name: /부산 여행 1/ }));
      await user.click(await screen.findByRole("button", { name: "일정에서 보기" }));
      const linkedRegion = await screen.findByRole("region", {
        name: "연결된 정책",
      });
      await user.click(
        within(linkedRegion).getByRole("button", {
          name: `${examplePolicyTitle} 연결 삭제`,
        }),
      );
      await waitFor(() =>
        expect(removePolicyFromTripSpy).toHaveBeenCalledWith(
          trip.id,
          examplePolicySlug,
        ),
      );
      await waitFor(() =>
        expect(
          within(linkedRegion).queryByRole("button", {
            name: `${examplePolicyTitle} 연결 삭제`,
          }),
        ).not.toBeInTheDocument(),
      );
      await user.click(screen.getByRole("link", { name: "마이페이지 테스트 이동" }));

      const summary = await screen.findByLabelText("나의 활동 요약");
      const appliedPolicyStat = within(summary)
        .getByText("신청 정책")
        .closest(".prototype-stat-card") as HTMLElement;
      await waitFor(() =>
        expect(within(appliedPolicyStat).getByText("0")).toBeInTheDocument(),
      );
    } finally {
      listAppliedPoliciesSpy.mockRestore();
      listTripsSpy.mockRestore();
      getTripSpy.mockRestore();
      addPolicyToTripSpy.mockRestore();
      removePolicyFromTripSpy.mockRestore();
    }
  });

  it("keeps notification controls inside the settings sheet on my page", async () => {
    await login();
    cleanup();
    renderAppRoute("/mypage");
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getAllByText("마이").length).toBeGreaterThan(0),
    );
    expect(
      screen.queryByRole("textbox", { name: "전화번호" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("카카오 알림톡 연락처");

    await user.click(screen.getByRole("button", { name: /알림 설정/ }));
    const dialog = await screen.findByRole("dialog", { name: "알림 설정" });
    expect(
      within(dialog).getByText("카카오 알림톡 연락처"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("textbox", { name: "전화번호" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("switch")).toBeInTheDocument();
  });

  it("opens FAQ, terms, and privacy content from my page settings", async () => {
    await login();
    cleanup();
    renderAppRoute("/mypage");
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getAllByText("마이").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByRole("button", { name: /공지사항 \/ FAQ/ }));
    let dialog = await screen.findByRole("dialog", { name: "공지사항 / FAQ" });
    expect(
      within(dialog).getByText("정책 정보는 어떻게 확인하나요?"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "신청 버튼과 혜택 안내 보기 버튼은 무엇이 다른가요?",
      ),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("준비 중이에요.");
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));

    await user.click(screen.getByRole("button", { name: /이용약관/ }));
    dialog = await screen.findByRole("dialog", { name: "이용약관" });
    expect(within(dialog).getByText("서비스 목적")).toBeInTheDocument();
    expect(within(dialog).getByText("정보의 성격")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));

    await user.click(screen.getByRole("button", { name: /개인정보처리방침/ }));
    dialog = await screen.findByRole("dialog", { name: "개인정보처리방침" });
    expect(within(dialog).getByText("수집 항목")).toBeInTheDocument();
    expect(within(dialog).getByText("보호 조치")).toBeInTheDocument();
  });

  it("edits profile preferences from my page", async () => {
    const nextProfile = {
      region: "강원",
      style: "사진",
      budget: "상관없음",
    };
    const nextNickname = `바다${Date.now().toString().slice(-6)}`;
    const nextUser = {
      ...getPreviewUser(),
      email: testEmail,
      nickname: nextNickname,
    };
    const updateProfileSpy = vi
      .spyOn(appDataApi, "updateProfile")
      .mockResolvedValue(nextProfile);

    try {
      await login();
      const updateNicknameSpy = vi
        .spyOn(appDataApi, "updateNickname")
        .mockResolvedValue(nextUser);
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(await screen.findByRole("button", { name: "편집" }));
      const dialog = screen.getByRole("dialog", { name: "프로필 편집" });
      const getCurrentUserSpy = vi
        .spyOn(appDataApi, "getCurrentUser")
        .mockResolvedValue(nextUser);
      expect(dialog).toBeInTheDocument();
      const nicknameInput = within(dialog).getByRole("textbox", {
        name: "닉네임",
      });
      await user.clear(nicknameInput);
      await user.type(nicknameInput, nextUser.nickname);
      expect(nicknameInput).toHaveValue(nextUser.nickname);

      await user.click(
        within(dialog).getByRole("button", { name: nextProfile.region }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: nextProfile.style }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: nextProfile.budget }),
      );
      await user.click(
        within(dialog).getByRole("button", { name: "저장하기" }),
      );

      await waitFor(() =>
        expect(updateNicknameSpy).toHaveBeenCalledWith({
          nickname: nextUser.nickname,
        }),
      );
      await waitFor(() =>
        expect(updateProfileSpy).toHaveBeenCalledWith(nextProfile),
      );
      await waitFor(() =>
        expect(
          screen.queryByRole("heading", { name: "프로필 편집" }),
        ).not.toBeInTheDocument(),
      );
      expect(screen.getByText(nextUser.nickname)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "편집" })).toBeInTheDocument();
      updateNicknameSpy.mockRestore();
      getCurrentUserSpy.mockRestore();
    } finally {
      updateProfileSpy.mockRestore();
    }
  });

  it("validates and suggests nicknames from the my page profile editor", async () => {
    await login();
    const updateNicknameSpy = vi.spyOn(appDataApi, "updateNickname");
    const updateProfileSpy = vi.spyOn(appDataApi, "updateProfile");
    const suggestionSpy = vi
      .spyOn(appDataApi, "getNicknameSuggestion")
      .mockResolvedValue({ nickname: "반짝여행자123" });

    try {
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(await screen.findByRole("button", { name: "편집" }));
      const dialog = screen.getByRole("dialog", { name: "프로필 편집" });
      const nicknameInput = within(dialog).getByRole("textbox", {
        name: "닉네임",
      });

      await user.clear(nicknameInput);
      await user.type(nicknameInput, "가");
      await user.click(
        within(dialog).getByRole("button", { name: "저장하기" }),
      );
      expect(
        await within(dialog).findByText(
          "닉네임은 2자 이상 20자 이하로 입력해 주세요.",
        ),
      ).toBeInTheDocument();
      expect(updateNicknameSpy).not.toHaveBeenCalled();
      expect(updateProfileSpy).not.toHaveBeenCalled();

      await user.click(
        within(dialog).getByRole("button", { name: "랜덤 닉네임 추천" }),
      );
      await waitFor(() => expect(nicknameInput).toHaveValue("반짝여행자123"));
    } finally {
      updateNicknameSpy.mockRestore();
      updateProfileSpy.mockRestore();
      suggestionSpy.mockRestore();
    }
  });

  it("shows a nickname suggestion error from the my page profile editor", async () => {
    await login();
    const suggestionSpy = vi
      .spyOn(appDataApi, "getNicknameSuggestion")
      .mockRejectedValue(new Error("suggest failed"));

    try {
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(await screen.findByRole("button", { name: "편집" }));
      const dialog = screen.getByRole("dialog", { name: "프로필 편집" });
      await user.click(
        within(dialog).getByRole("button", { name: "랜덤 닉네임 추천" }),
      );

      expect(
        await within(dialog).findByText(
          "닉네임을 추천하지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      ).toBeInTheDocument();
    } finally {
      suggestionSpy.mockRestore();
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
    const getSettingsSpy = vi
      .spyOn(appDataApi, "getNotificationSettings")
      .mockResolvedValue(enabledSettings);
    const updateSettingsSpy = vi
      .spyOn(appDataApi, "updateNotificationSettings")
      .mockResolvedValue(disabledSettings);

    try {
      await login();
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /알림 설정/ }),
      );
      const dialog = await screen.findByRole("dialog", { name: "알림 설정" });
      await waitFor(() =>
        expect(dialog).toHaveTextContent("정책 D-7, D-1 알림"),
      );
      await user.click(within(dialog).getByRole("switch"));

      await waitFor(() =>
        expect(updateSettingsSpy).toHaveBeenCalledWith({
          deadlineEnabled: false,
        }),
      );
      await waitFor(() =>
        expect(dialog).toHaveTextContent("마감 알림을 받지 않음"),
      );
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
    const getContactSpy = vi
      .spyOn(appDataApi, "getContact")
      .mockResolvedValue(emptyContact);
    const updateContactSpy = vi
      .spyOn(appDataApi, "updateContact")
      .mockResolvedValue(savedContact);

    try {
      await login();
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /알림 설정/ }),
      );
      const dialog = await screen.findByRole("dialog", { name: "알림 설정" });
      const phoneInput = within(dialog).getByRole("textbox", {
        name: "전화번호",
      });
      await waitFor(() => expect(phoneInput).not.toBeDisabled());
      await user.type(phoneInput, "010 1234 5678");
      await user.click(
        within(dialog).getByRole("button", { name: "연락처 저장" }),
      );

      await waitFor(() =>
        expect(updateContactSpy).toHaveBeenCalledWith({
          phoneNumber: "010 1234 5678",
        }),
      );
      await waitFor(() => expect(phoneInput).toHaveValue("01012345678"));
      expect(dialog).toHaveTextContent("검증 전 연락처입니다");
    } finally {
      getContactSpy.mockRestore();
      updateContactSpy.mockRestore();
    }
  });

  it("requests and confirms a notification contact verification code from my page", async () => {
    const savedContact: ContactInfo = {
      phoneNumber: "01012345678",
      phoneVerified: false,
    };
    const verifiedContact: ContactInfo = {
      phoneNumber: "01012345678",
      phoneVerified: true,
    };
    const getContactSpy = vi
      .spyOn(appDataApi, "getContact")
      .mockResolvedValue(savedContact);
    const requestVerificationSpy = vi
      .spyOn(appDataApi, "requestContactVerification")
      .mockResolvedValue({
        requested: true,
        expiresAt: "2026-05-21T10:05:00",
        resendAvailableAt: "2026-05-21T10:01:00",
      });
    const confirmVerificationSpy = vi
      .spyOn(appDataApi, "confirmContactVerification")
      .mockResolvedValue(verifiedContact);

    try {
      await login();
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /알림 설정/ }),
      );
      const dialog = await screen.findByRole("dialog", { name: "알림 설정" });
      await waitFor(() =>
        expect(dialog).toHaveTextContent("검증 전 연락처입니다"),
      );
      await user.click(
        within(dialog).getByRole("button", { name: "인증번호 받기" }),
      );

      await waitFor(() =>
        expect(requestVerificationSpy).toHaveBeenCalledWith({
          phoneNumber: "01012345678",
        }),
      );
      expect(dialog).toHaveTextContent("인증번호를 보냈어요.");
      const codeInput = within(dialog).getByRole("textbox", {
        name: "인증번호",
      });
      await user.type(codeInput, "123456");
      await user.click(
        within(dialog).getByRole("button", { name: "인증 확인" }),
      );

      await waitFor(() =>
        expect(confirmVerificationSpy).toHaveBeenCalledWith({ code: "123456" }),
      );
      await waitFor(() =>
        expect(dialog).toHaveTextContent("검증된 연락처입니다"),
      );
    } finally {
      getContactSpy.mockRestore();
      requestVerificationSpy.mockRestore();
      confirmVerificationSpy.mockRestore();
    }
  });

  it("shows one trip title in the my page trip summary", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "101",
      title: "부산 맛집 여행",
    };

    await login();
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue([trip]);

    try {
      cleanup();
      renderAppRoute("/mypage");

      const summary = await screen.findByLabelText("나의 활동 요약");
      await waitFor(() =>
        expect(within(summary).getByText("내 일정")).toBeInTheDocument(),
      );
      const tripStat = within(summary)
        .getByText("내 일정")
        .closest(".prototype-stat-card");
      expect(tripStat).not.toBeNull();
      await waitFor(() =>
        expect(
          within(tripStat as HTMLElement).getByText("1"),
        ).toBeInTheDocument(),
      );
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("shows the trip count in the my page stats", async () => {
    const trips: Trip[] = [
      { ...getPreviewTrip(), id: "101", title: "부산 맛집 여행" },
      { ...getPreviewTrip(), id: "102", title: "강원 2일 여행" },
      { ...getPreviewTrip(), id: "103", title: "제주 3일 여행" },
    ];

    await login();
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockResolvedValue(trips);

    try {
      cleanup();
      renderAppRoute("/mypage");

      const summary = await screen.findByLabelText("나의 활동 요약");
      await waitFor(() =>
        expect(within(summary).getByText("내 일정")).toBeInTheDocument(),
      );
      const tripStat = within(summary)
        .getByText("내 일정")
        .closest(".prototype-stat-card");
      expect(tripStat).not.toBeNull();
      await waitFor(() =>
        expect(
          within(tripStat as HTMLElement).getByText("3"),
        ).toBeInTheDocument(),
      );
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("shows the applied policy count in the my page stats", async () => {
    const appliedPolicies: Policy[] = [
      {
        id: examplePolicySlug,
        slug: examplePolicySlug,
        label: "지",
        tag: "최대 30만원 환급",
        title: examplePolicyTitle,
        org: "문화체육관광부",
        region: "전국",
        deadline: "2026-10-31",
        amount: "최대 30만원 환급",
        summary: "국내 여행 지원",
        match: 98,
        category: "지역할인",
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
      },
      {
        id: "gangneung-stay",
        slug: "gangneung-stay",
        label: "속",
        tag: "숙박 할인",
        title: "강릉 숙박 할인권",
        org: "강릉시",
        region: "강원",
        deadline: "2026-08-15",
        amount: "숙박비 50% 할인",
        summary: "숙박 할인",
        match: 90,
        category: "숙박",
        requirements: [],
        documents: [],
        officialUrl: null,
        applyUrl: null,
      },
    ];

    await login();
    const listAppliedPoliciesSpy = vi
      .spyOn(appDataApi, "listAppliedPolicies")
      .mockResolvedValue(appliedPolicies);

    try {
      cleanup();
      renderAppRoute("/mypage");

      const summary = await screen.findByLabelText("나의 활동 요약");
      const appliedPolicyStat = within(summary)
        .getByText("신청 정책")
        .closest(".prototype-stat-card") as HTMLElement;
      expect(appliedPolicyStat).toBeTruthy();
      await waitFor(() =>
        expect(within(appliedPolicyStat).getByText("2")).toBeInTheDocument(),
      );
    } finally {
      listAppliedPoliciesSpy.mockRestore();
    }
  });

  it("keeps the my page stats visible when trips fail to load", async () => {
    await login();
    const listTripsSpy = vi
      .spyOn(appDataApi, "listTrips")
      .mockRejectedValue(new Error("load failed"));

    try {
      cleanup();
      renderAppRoute("/mypage");

      const summary = await screen.findByLabelText("나의 활동 요약");
      await waitFor(() =>
        expect(within(summary).getByText("내 일정")).toBeInTheDocument(),
      );
      const tripStat = within(summary)
        .getByText("내 일정")
        .closest(".prototype-stat-card");
      expect(tripStat).not.toBeNull();
      await waitFor(() =>
        expect(
          within(tripStat as HTMLElement).getByText("0"),
        ).toBeInTheDocument(),
      );
      expect(document.body).not.toHaveTextContent(
        "일정 정보를 불러오지 못했어요",
      );
    } finally {
      listTripsSpy.mockRestore();
    }
  });

  it("keeps the notification contact form open when saving fails", async () => {
    const contact: ContactInfo = {
      phoneNumber: "01012345678",
      phoneVerified: false,
    };
    const getContactSpy = vi
      .spyOn(appDataApi, "getContact")
      .mockResolvedValue(contact);
    const updateContactSpy = vi
      .spyOn(appDataApi, "updateContact")
      .mockRejectedValue(new Error("save failed"));

    try {
      await login();
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /알림 설정/ }),
      );
      const dialog = await screen.findByRole("dialog", { name: "알림 설정" });
      const phoneInput = within(dialog).getByRole("textbox", {
        name: "전화번호",
      });
      await waitFor(() => expect(phoneInput).not.toBeDisabled());
      await user.clear(phoneInput);
      await user.click(
        within(dialog).getByRole("button", { name: "연락처 저장" }),
      );

      await waitFor(() =>
        expect(updateContactSpy).toHaveBeenCalledWith({ phoneNumber: null }),
      );
      await waitFor(() =>
        expect(dialog).toHaveTextContent("연락처를 저장하지 못했어요."),
      );
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
    const getSettingsSpy = vi
      .spyOn(appDataApi, "getNotificationSettings")
      .mockResolvedValue(enabledSettings);
    const updateSettingsSpy = vi
      .spyOn(appDataApi, "updateNotificationSettings")
      .mockRejectedValue(new Error("save failed"));

    try {
      await login();
      cleanup();
      renderAppRoute("/mypage");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /알림 설정/ }),
      );
      const dialog = await screen.findByRole("dialog", { name: "알림 설정" });
      await waitFor(() =>
        expect(dialog).toHaveTextContent("정책 D-7, D-1 알림"),
      );
      await user.click(within(dialog).getByRole("switch"));

      await waitFor(() =>
        expect(updateSettingsSpy).toHaveBeenCalledWith({
          deadlineEnabled: false,
        }),
      );
      await waitFor(() =>
        expect(dialog).toHaveTextContent("알림 설정을 저장하지 못했어요."),
      );
      expect(dialog).toHaveTextContent("정책 D-7, D-1 알림");
    } finally {
      getSettingsSpy.mockRestore();
      updateSettingsSpy.mockRestore();
    }
  });

  it("uses an official policy link as an official information CTA when no direct apply link is available", async () => {
    const officialUrl =
      "https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267";
    const officialOnlyPolicy: Policy = {
      id: "official-only-policy",
      slug: "official-only-policy",
      label: "OF",
      tag: "공식 안내",
      title: "공식 안내만 있는 정책",
      org: "문화체육관광부",
      region: "전국",
      deadline: "2026-12-31",
      amount: "확인 필요",
      summary: "공식 안내 페이지에서 세부 혜택을 확인하는 정책입니다.",
      match: 70,
      category: "지역할인",
      requirements: ["공식 안내 확인 필요"],
      documents: ["공식 안내 확인"],
      officialUrl,
      applyUrl: null,
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(officialOnlyPolicy);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/official-only-policy");

      const applicationLink = await screen.findByRole("link", {
        name: "혜택 안내 보기",
      });
      expect(applicationLink).toHaveAttribute("href", officialUrl);
      expect(applicationLink).toHaveAttribute("target", "_blank");
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("uses a direct apply link as the primary application CTA when available", async () => {
    const applyPolicy: Policy = {
      id: "apply-policy",
      slug: "apply-policy",
      label: "AP",
      tag: "접수 가능",
      title: "직접 신청 가능 정책",
      org: "Travel Hunter",
      region: "전국",
      deadline: "2026-12-31",
      amount: "확인 필요",
      summary: "직접 신청 링크가 확인된 정책입니다.",
      match: 70,
      category: "지역할인",
      requirements: ["공식 공고 확인 필요"],
      documents: ["공식 공고 확인 필요"],
      officialUrl: "https://travel.example/notice",
      applyUrl: "https://travel.example/apply",
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(applyPolicy);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/apply-policy");

      const applicationLink = await screen.findByRole("link", {
        name: "신청하러 가기",
      });
      expect(applicationLink).toHaveAttribute(
        "href",
        "https://travel.example/apply",
      );
      expect(applicationLink).toHaveAttribute("target", "_blank");
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("renders the prototype policy detail section order", async () => {
    await login();
    cleanup();
    renderAppRoute(examplePolicyPath);

    await waitFor(() => expect(document.body).toHaveTextContent("지원 내용"));
    const bodyText = document.body.textContent ?? "";
    expect(bodyText.indexOf("지원 내용")).toBeLessThan(
      bodyText.indexOf("신청 기간"),
    );
    expect(bodyText.indexOf("신청 기간")).toBeLessThan(
      bodyText.indexOf("신청 대상"),
    );
    expect(bodyText.indexOf("신청 대상")).toBeLessThan(
      bodyText.indexOf("필요 서류"),
    );
    expect(document.body).toHaveTextContent(
      "디지털관광주민증 발급 또는 지역별 신청 조건 확인",
    );
    expect(document.body).not.toHaveTextContent("조건 확인 요약");
    expect(document.body).not.toHaveTextContent("이 정책과 함께 확인할 혜택");
    expect(document.body).not.toHaveTextContent("자주 묻는 질문");
  });

  it("splits policy requirements into target, usage condition, and confirmation sections", async () => {
    const cardPolicy: Policy = {
      id: "card-benefit-policy",
      slug: "card-benefit-policy",
      label: "BUSAN",
      tag: "지역할인",
      title: "부산 결제 캐시백",
      org: "부산관광공사",
      region: "부산",
      deadline: "2026-06-30",
      amount: "카드 결제 5% 캐시백",
      summary: "부산 결제 캐시백 혜택",
      match: 80,
      category: "지역할인",
      requirements: [
        "국내 여행자",
        "제휴 카드",
        "부산 결제",
        "월 한도 적용",
        "공식 안내 확인 필요",
      ],
      documents: ["혜택 안내 확인"],
      officialUrl: "https://travel.example/busan-card",
      applyUrl: null,
      sourceType: "external",
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(cardPolicy);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/card-benefit-policy");

      await screen.findByText("부산 결제 캐시백");
      const bodyText = document.body.textContent ?? "";
      expect(bodyText.indexOf("신청 대상")).toBeLessThan(
        bodyText.indexOf("혜택 적용 조건"),
      );
      expect(bodyText.indexOf("혜택 적용 조건")).toBeLessThan(
        bodyText.indexOf("확인 필요 사항"),
      );
      expect(document.body).toHaveTextContent("국내 여행자");
      expect(document.body).toHaveTextContent(
        "제휴 카드로 결제한 건에 한해 혜택이 적용됩니다.",
      );
      expect(document.body).toHaveTextContent(
        "부산 지역 결제 또는 대상 가맹점 이용 건을 기준으로 적용됩니다.",
      );
      expect(document.body).toHaveTextContent(
        "월별 할인/캐시백 한도 내에서 혜택이 적용됩니다.",
      );
      expect(document.body).toHaveTextContent(
        "공식 안내에서 세부 조건과 최신 공지를 확인하세요.",
      );
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("breaks long policy benefit summaries into scannable detail groups", async () => {
    const longSummaryPolicy: Policy = {
      id: "long-summary-policy",
      slug: "long-summary-policy",
      label: "YW",
      tag: "지역할인",
      title: "왕과 사는 남자 영월봄기행 10,000 할인",
      org: "한국관광공사",
      region: "강원",
      deadline: "2026-05-29",
      amount: "최대 140000원",
      summary:
        "기간: 4월1일~5월29일 매주 주말 *이용일 20일 전 사전예약 여행가는 달 기간 한정 특별 할인 운영 · 정상가 대비 10,000원 할인 적용(1박2일 정상가 140,000원) ※여행가는 달 홈페이지 해당 내용 캡쳐본 제시할 경우, 할인 적용 · 고향사랑기부자 혜택 추가 할인 적용 40,000원 ※영월군 고향사랑기부제 100,000원 기부후 당사 답례품 “사계절 릴레이 축제 할인권” 지정시 30,000원할인 + 특별할인 10,000원 = 40,000원 할인 1. 기본 특별 할인 할인 혜택: 정상가에서 10,000원 할인 실구매가",
      match: 80,
      category: "지역할인",
      requirements: ["공식 안내에서 신청 조건을 확인하세요."],
      documents: ["혜택 안내 확인"],
      officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
      applyUrl: null,
      sourceType: "external",
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(longSummaryPolicy);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/long-summary-policy");

      const supportSection = await screen.findByRole("region", {
        name: "지원 내용",
      });
      expect(
        within(supportSection).getByText("최대 140000원"),
      ).toBeInTheDocument();
      expect(within(supportSection).getByText("핵심 혜택")).toBeInTheDocument();
      expect(within(supportSection).getByText("운영 기간")).toBeInTheDocument();
      expect(within(supportSection).getByText("이용 조건")).toBeInTheDocument();
      expect(within(supportSection).getByText("유의사항")).toBeInTheDocument();
      expect(
        within(supportSection).getByText(/정상가 대비 10,000원 할인/),
      ).toBeInTheDocument();
      expect(
        within(supportSection).getByText(/4월1일~5월29일/),
      ).toBeInTheDocument();
      expect(
        within(supportSection).getByText(/캡쳐본 제시/),
      ).toBeInTheDocument();
      expect(
        within(supportSection).getByText(/고향사랑기부제/),
      ).toBeInTheDocument();
      expect(supportSection.querySelector(".highlight-box .meta")).toBeNull();
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("uses the dgtour summary instead of repeating generic benefit text", async () => {
    const dgtourPolicy: Policy = {
      id: "dgtour-밀양-1",
      slug: "dgtour-밀양-1",
      label: "경남",
      tag: "지역할인",
      title: "밀양 디지털관광주민증 혜택",
      org: "한국관광공사",
      region: "경남",
      deadline: "2026-12-31",
      amount: "혜택 제공",
      summary:
        "디지털관광주민증 소지자 대상 밀양(경남) 지역 방문 시 혜택을 제공합니다.",
      match: 75,
      category: "지역할인",
      requirements: ["디지털관광주민증 발급자", "경남 방문"],
      documents: ["디지털관광주민증"],
      officialUrl: "https://korean.visitkorea.or.kr/dgtourcard/tour50.do",
      applyUrl: null,
      sourceType: "external",
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(dgtourPolicy);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/dgtour-%EB%B0%80%EC%96%91-1");

      const supportSection = await screen.findByRole("region", {
        name: "지원 내용",
      });
      expect(
        within(supportSection).getByText("디지털관광주민증 혜택"),
      ).toBeInTheDocument();
      expect(within(supportSection).getByText("핵심 혜택")).toBeInTheDocument();
      expect(
        within(supportSection).getByText(
          "디지털관광주민증 소지자 대상 밀양(경남) 지역 방문 시 혜택을 제공합니다.",
        ),
      ).toBeInTheDocument();
      expect(supportSection).not.toHaveTextContent("혜택 제공 혜택");
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("separates TravelMonth condition text from trailing benefit period text", async () => {
    const welchonPolicy: Policy = {
      id: "travelmonth-44",
      slug: "travelmonth-44",
      label: "전국",
      tag: "여행상품",
      title: "웰촌 체험상품 30% 할인",
      org: "한국농어촌공사",
      region: "전국",
      deadline: "2026-05-31",
      amount: "최대 30%",
      summary:
        "행사 기간 중 온라인 체험상품 예약 결제 후 사용 완료 참여자 26년 4월 중순부터 5월 말",
      match: 90,
      category: "여행상품",
      requirements: ["공식 혜택 안내에서 조건을 확인하세요."],
      documents: [],
      officialUrl: "https://weektonongchon.netlify.app/",
      applyUrl: null,
      sourceType: "external",
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(welchonPolicy);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/travelmonth-44");

      const supportSection = await screen.findByRole("region", {
        name: "지원 내용",
      });
      expect(within(supportSection).getByText("최대 30%")).toBeInTheDocument();
      expect(within(supportSection).getByText("이용 조건")).toBeInTheDocument();
      expect(within(supportSection).getByText("운영 기간")).toBeInTheDocument();
      expect(
        within(supportSection).getByText(
          /온라인 체험상품 예약 결제 후 사용 완료 참여자/,
        ),
      ).toBeInTheDocument();
      expect(
        within(supportSection).getByText(/26년 4월 중순부터 5월 말/),
      ).toBeInTheDocument();
      expect(
        within(supportSection).queryByText(welchonPolicy.summary),
      ).not.toBeInTheDocument();
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("renders policy detail in prototype-only flow without FAQ accordion", async () => {
    await login();
    cleanup();
    renderAppRoute(examplePolicyPath);

    await waitFor(() =>
      expect(document.body).toHaveTextContent(examplePolicyTitle),
    );
    expect(
      screen.queryByRole("button", { name: /어떤 서류가 필요한가요/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /내 일정에 담기|일정에 담김/ }),
    ).toBeInTheDocument();
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
      category: "기타",
      requirements: ["공식 공고 확인 필요"],
      documents: ["공식 공고 확인 필요"],
      officialUrl: null,
      applyUrl: null,
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(fallbackPolicy);

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/no-link-policy");
      const fallbackButton = await screen.findByRole("button", {
        name: "신청 링크 준비 중",
      });
      expect(fallbackButton).toBeDisabled();
      expect(fallbackButton).toHaveAttribute(
        "title",
        "공식 신청 연결은 준비 중입니다.",
      );
      expect(document.body).toHaveTextContent("공식 신청 연결은 준비 중입니다.");
      expect(fallbackButton).toHaveAccessibleDescription(
        "공식 신청 연결은 준비 중입니다.",
      );
    } finally {
      getPolicySpy.mockRestore();
    }
  });

  it("blocks save and trip actions for info-only raw fallback policies", async () => {
    const rawFallbackPolicy: Policy = {
      id: "travelmonth-raw-58",
      slug: "travelmonth-raw-58",
      label: "RAW",
      tag: "공식 안내",
      title: "정규화 대기 중인 공식 혜택",
      org: "한국관광공사",
      region: "부산",
      deadline: "2026-06-30",
      amount: "최대 2만원",
      summary: "원문 수집 상세만 임시로 확인할 수 있는 혜택입니다.",
      match: 80,
      category: "지역할인",
      requirements: ["공식 안내 확인 필요"],
      documents: ["혜택 안내 확인"],
      officialUrl: "https://korean.visitkorea.or.kr/travelmonth/benefit.do",
      applyUrl: null,
      sourceType: "external",
      actionStatus: "infoOnly",
    };
    const getPolicySpy = vi
      .spyOn(appDataApi, "getPolicy")
      .mockResolvedValue(rawFallbackPolicy);
    const loginSpy = vi
      .spyOn(appDataApi, "login")
      .mockResolvedValue({ accessToken: "test-token", user: getPreviewUser() });
    const refreshSpy = vi
      .spyOn(appDataApi, "refreshSession")
      .mockResolvedValue({ accessToken: "test-token", user: getPreviewUser() });
    const profileSpy = vi
      .spyOn(appDataApi, "getProfile")
      .mockResolvedValue({ region: "부산", style: "휴식", budget: "20만원" });
    const savedPolicySpy = vi
      .spyOn(appDataApi, "listSavedPolicies")
      .mockResolvedValue([]);
    const savePolicySpy = vi.spyOn(appDataApi, "savePolicy");
    const listTripsSpy = vi.spyOn(appDataApi, "listTrips");

    try {
      await login();
      cleanup();
      renderAppRoute("/policies/travelmonth-raw-58");
      const user = userEvent.setup();

      await screen.findByText("정규화 대기 중인 공식 혜택");
      expect(document.body).toHaveTextContent(
        "이 혜택은 공식 원문 확인만 가능해요. 저장하거나 일정에 담으려면 정규화된 정책으로 승격되어야 합니다.",
      );
      const saveButton = screen.getByRole("button", { name: "저장" });
      const tripButton = screen.getByRole("button", {
        name: /내 일정에 담기/,
      });
      expect(saveButton).toBeDisabled();
      expect(tripButton).toBeDisabled();

      await user.click(saveButton);
      await user.click(tripButton);
      expect(savePolicySpy).not.toHaveBeenCalled();
      expect(listTripsSpy).not.toHaveBeenCalled();
    } finally {
      getPolicySpy.mockRestore();
      loginSpy.mockRestore();
      refreshSpy.mockRestore();
      profileSpy.mockRestore();
      savedPolicySpy.mockRestore();
      savePolicySpy.mockRestore();
      listTripsSpy.mockRestore();
    }
  });

  it("saves profile setup choices before showing the personalized home", async () => {
    await login();
    cleanup();
    renderAppRoute("/profile-setup");
    const user = userEvent.setup();

    await waitFor(() =>
      expect(document.querySelector(".ds-profile-setup-step")).toBeTruthy(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "어디로 떠나고 싶나요?" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "부산" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "부산" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "맛집" }));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "1인 30만원 이하" }));
    await user.click(screen.getByRole("button", { name: "추천 홈 보기" }));

    await waitFor(() =>
      expect(document.body).toHaveTextContent("인기 국내 여행지"),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("인기 국내 여행지 목록")).toHaveTextContent(
        /마감 임박|혜택/,
      ),
    );
  });

  it("saves selected invite roles from the friend invite page", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
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
    const getInviteSpy = vi
      .spyOn(appDataApi, "getInviteState")
      .mockResolvedValue(inviteState);
    const confirmInviteSpy = vi
      .spyOn(appDataApi, "confirmInviteSent")
      .mockImplementation(async (tripId, role = "editor") => ({
        ...inviteState,
        tripId: tripId ?? "55",
        role,
        invited: true,
      }));

    try {
      await login();
      cleanup();
      renderAppRoute("/friend-invite?tripId=55");
      const user = userEvent.setup();

      await waitFor(() => expect(getInviteSpy).toHaveBeenCalledWith("55"));
      await user.click(
        await screen.findByRole("button", { name: /보기만 가능/ }),
      );
      await user.click(
        screen.getByRole("button", { name: "초대 링크 활성화" }),
      );
      await waitFor(() =>
        expect(confirmInviteSpy).toHaveBeenCalledWith("55", "viewer"),
      );

      await user.click(screen.getByRole("button", { name: /함께 편집/ }));
      await user.click(
        screen.getByRole("button", { name: "초대 링크 준비 완료" }),
      );
      await waitFor(() =>
        expect(confirmInviteSpy).toHaveBeenLastCalledWith("55", "editor"),
      );
    } finally {
      getTripSpy.mockRestore();
      getInviteSpy.mockRestore();
      confirmInviteSpy.mockRestore();
    }
  });

  it("requests a password reset email from the forgot password page", async () => {
    const requestSpy = vi
      .spyOn(appDataApi, "requestPasswordReset")
      .mockResolvedValue({ requested: true });

    try {
      renderAppRoute("/forgot-password");
      expect(document.querySelector("main")).toHaveClass(
        "prototype-login-layout",
      );
      expect(document.querySelector(".prototype-auth-screen")).toBeTruthy();
      expect(document.querySelector(".ds-auth-form-shell")).toBeTruthy();
      const user = userEvent.setup();

      await user.type(
        screen.getByRole("textbox", { name: "이메일" }),
        testEmail,
      );
      await user.click(
        screen.getByRole("button", { name: "재설정 링크 받기" }),
      );

      await waitFor(() =>
        expect(requestSpy).toHaveBeenCalledWith({ email: testEmail }),
      );
      expect(
        await screen.findByText(
          "재설정 링크 요청을 접수했어요. 계정이 있는 이메일이면 메일이 도착합니다.",
        ),
      ).toBeInTheDocument();
    } finally {
      requestSpy.mockRestore();
    }
  });

  it("confirms a password reset token and links back to login", async () => {
    const confirmSpy = vi
      .spyOn(appDataApi, "confirmPasswordReset")
      .mockResolvedValue({ reset: true });

    try {
      renderAppRoute("/reset-password?token=abc123");
      const user = userEvent.setup();

      await user.type(
        document.querySelector('input[name="password"]') as HTMLInputElement,
        "new-password123",
      );
      await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));

      await waitFor(() =>
        expect(confirmSpy).toHaveBeenCalledWith({
          token: "abc123",
          newPassword: "new-password123",
        }),
      );
      expect(document.body).toHaveTextContent("비밀번호를 변경했어요");
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it("shows missing email delivery configuration on the forgot password page", async () => {
    const requestSpy = vi
      .spyOn(appDataApi, "requestPasswordReset")
      .mockRejectedValue(new Error("Email delivery is not configured"));

    try {
      renderAppRoute("/forgot-password");
      const user = userEvent.setup();

      await user.type(
        screen.getByRole("textbox", { name: "이메일" }),
        testEmail,
      );
      await user.click(screen.getByRole("button", { name: "재설정 링크 받기" }));

      await waitFor(() => expect(requestSpy).toHaveBeenCalledWith({ email: testEmail }));
      expect(
        await screen.findByText(
          "현재 로컬 환경은 이메일 발송 설정이 없어 재설정 링크를 보낼 수 없어요. SMTP 설정 후 다시 시도해 주세요.",
        ),
      ).toBeInTheDocument();
    } finally {
      requestSpy.mockRestore();
    }
  });

  it("shows a clear reset-password missing token state", () => {
    renderAppRoute("/reset-password");

    expect(screen.getByText("재설정 링크가 올바르지 않아요")).toBeInTheDocument();
    expect(
      screen.getByText("이메일에 있는 전체 링크를 다시 열거나 새 재설정 링크를 요청해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 링크 요청하기" })).toBeInTheDocument();
  });

  it("offers a new reset link when a reset token is invalid or expired", async () => {
    const confirmSpy = vi
      .spyOn(appDataApi, "confirmPasswordReset")
      .mockRejectedValue(new Error("Invalid or expired reset token"));

    try {
      renderAppRoute("/reset-password?token=expired-token");
      const user = userEvent.setup();

      await user.type(screen.getByLabelText("새 비밀번호"), "new-password123");
      await user.click(screen.getByRole("button", { name: "비밀번호 변경" }));

      await waitFor(() =>
        expect(confirmSpy).toHaveBeenCalledWith({
          token: "expired-token",
          newPassword: "new-password123",
        }),
      );
      expect(
        await screen.findByText("비밀번호를 재설정하지 못했어요. 링크가 만료되었거나 이미 사용되었을 수 있어요."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "새 재설정 링크를 요청하기" }),
      ).toBeInTheDocument();
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it("links social login buttons to backend OAuth start routes", () => {
    renderAppRoute("/login");

    expect(screen.getByRole("link", { name: "카카오로 시작하기" })).toHaveAttribute(
      "href",
      "/oauth/kakao/start?redirect=%2Fhome",
    );
    expect(screen.getByRole("link", { name: "구글로 시작하기" })).toHaveAttribute(
      "href",
      "/oauth/google/start?redirect=%2Fhome",
    );
  });

  it("shows a local-friendly OAuth start error when a provider is not configured", async () => {
    const oauthSpy = vi
      .spyOn(appDataApi, "getOAuthStartUrl")
      .mockReturnValue("http://127.0.0.1:8000/api/auth/oauth/kakao/start?redirect=%2Fhome");
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "OAuth provider is not configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    try {
      renderAppRoute("/oauth/kakao/start?redirect=/home");

      await waitFor(() =>
        expect(fetchSpy).toHaveBeenCalledWith(
          "http://127.0.0.1:8000/api/auth/oauth/kakao/start?redirect=%2Fhome",
          {
            credentials: "include",
            redirect: "manual",
          },
        ),
      );
      expect(await screen.findByText("카카오 로그인을 사용할 수 없어요")).toBeInTheDocument();
      expect(
        screen.getByText(
          "카카오 로그인을 사용할 수 없어요. OAuth provider is not configured",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "이메일로 로그인하기" })).toBeInTheDocument();
    } finally {
      oauthSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("shows a local-friendly OAuth callback error", async () => {
    const refreshSpy = vi.spyOn(appDataApi, "refreshSession");

    try {
      renderAppRoute("/oauth/callback?error=access_denied&redirect=/home");

      expect(await screen.findByText("소셜 로그인을 사용할 수 없어요")).toBeInTheDocument();
      expect(screen.getByText("로그인을 완료하지 못했어요")).toBeInTheDocument();
      expect(
        screen.getByText("소셜 로그인 제공자가 로그인을 완료하지 못했어요. 이메일로 로그인해 주세요."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "로그인으로 돌아가기" })).toBeInTheDocument();
    } finally {
      refreshSpy.mockRestore();
    }
  });

  it("shares the current policy URL through Web Share API", async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const navigatorPrototype = Object.getPrototypeOf(
      window.navigator,
    ) as Navigator & { share?: typeof shareSpy };
    const originalShareDescriptor = Object.getOwnPropertyDescriptor(
      navigatorPrototype,
      "share",
    );
    Object.defineProperty(navigatorPrototype, "share", {
      configurable: true,
      value: shareSpy,
    });

    try {
      await login();
      cleanup();
      renderAppRoute(examplePolicyPath);

      await userEvent
        .setup()
        .click(await screen.findByRole("button", { name: "공유" }));

      expect(
        screen.queryByRole("link", { name: /친구 초대/ }),
      ).not.toBeInTheDocument();
      await waitFor(() => expect(shareSpy).toHaveBeenCalled());
      await waitFor(() =>
        expect(document.body).toHaveTextContent("정책 링크를 공유했어요"),
      );
    } finally {
      if (originalShareDescriptor) {
        Object.defineProperty(
          navigatorPrototype,
          "share",
          originalShareDescriptor,
        );
      } else {
        Reflect.deleteProperty(navigatorPrototype, "share");
      }
    }
  });

  it("renders policy documents as static checklist rows", async () => {
    await login();
    cleanup();
    renderAppRoute(examplePolicyPath);

    await waitFor(() => expect(document.body).toHaveTextContent("필요 서류"));
    expect(document.querySelectorAll(".check-item").length).toBeGreaterThan(0);
    expect(document.querySelector(".check-item")?.tagName).toBe("DIV");
  });

  it("opens an AI recommendation criteria sheet", async () => {
    await login();
    cleanup();
    renderAppRoute("/ai-results?tripId=55");

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "추천 기준 보기" }));

    expect(
      screen.getByRole("dialog", { name: "추천 기준" }),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent("정책 조건");
    expect(document.body).toHaveTextContent("이동 거리");
  });

  it("preserves an invite redirect through login and signup navigation", async () => {
    renderAppRoute("/invites/jeju-3d/accept");

    await waitFor(() =>
      expect(document.querySelector('input[type="email"]')).toBeTruthy(),
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "회원가입" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "회원가입" }),
      ).toBeInTheDocument(),
    );
    const loginLink = screen.getByRole("link", { name: "로그인" });
    expect(decodeURIComponent(loginLink.getAttribute("href") ?? "")).toBe(
      "/login?redirect=/invites/jeju-3d/accept",
    );
  });

  it("shares the invite link from the friend invite page", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
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
    const getInviteSpy = vi
      .spyOn(appDataApi, "getInviteState")
      .mockResolvedValue(inviteState);

    try {
      await login();
      cleanup();
      renderAppRoute("/friend-invite?tripId=55");

      await waitFor(() => expect(getInviteSpy).toHaveBeenCalledWith("55"));
      await userEvent
        .setup()
        .click(await screen.findByRole("button", { name: "링크 복사" }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "복사됨" }),
        ).toBeInTheDocument(),
      );
      await waitFor(() =>
        expect(document.querySelector(".toast")).toBeTruthy(),
      );
    } finally {
      getTripSpy.mockRestore();
      getInviteSpy.mockRestore();
    }
  });

  it("accepts a valid invite after login and links to the joined trip", async () => {
    renderAppRoute("/login?redirect=/invites/jeju-3d/accept");

    const user = userEvent.setup();
    await user.type(
      document.querySelector('input[name="email"]') as HTMLInputElement,
      testEmail,
    );
    await user.type(
      document.querySelector('input[name="password"]') as HTMLInputElement,
      testPassword,
    );
    await user.click(
      document.querySelector('button[type="submit"]') as HTMLButtonElement,
    );

    await waitFor(() =>
      expect(document.body).toHaveTextContent("초대를 수락했어요"),
    );
    const tripLink = await waitFor(() => {
      const link = document.querySelector('a[href^="/trips/"]');
      expect(link).toBeTruthy();
      return link as HTMLAnchorElement;
    });
    expect(tripLink.getAttribute("href")).toMatch(/^\/trips\/[1-9][0-9]*$/);
  });

  it("accepts a valid invite after signup when a redirect is present", async () => {
    renderAppRoute("/signup?redirect=/invites/jeju-3d/accept");
    expect(document.querySelector("main")).toHaveClass(
      "prototype-login-layout",
    );
    expect(document.querySelector(".prototype-auth-screen")).toBeTruthy();
    expect(document.querySelector(".ds-auth-form-shell")).toBeTruthy();

    const user = userEvent.setup();
    const email = `invite-${Date.now()}@example.com`;
    await user.type(
      document.querySelector('input[name="email"]') as HTMLInputElement,
      email,
    );
    const emailCheckButton = document.querySelector(
      ".input-action-row button[type='button']",
    );
    expect(emailCheckButton).toBeTruthy();
    await user.click(emailCheckButton as HTMLButtonElement);
    await waitFor(() =>
      expect(document.body).toHaveTextContent("사용할 수 있는 이메일입니다."),
    );
    await user.type(
      document.querySelector('input[name="password"]') as HTMLInputElement,
      "password123",
    );
    await user.click(
      document.querySelector('button[type="submit"]') as HTMLButtonElement,
    );

    const nicknameInput = await waitFor(() => {
      const input = document.querySelector('input[name="nickname"]');
      expect(input).toBeTruthy();
      return input as HTMLInputElement;
    });
    await user.clear(nicknameInput);
    await user.type(nicknameInput, "초대테스트");
    await user.click(
      document.querySelector('button[type="submit"]') as HTMLButtonElement,
    );

    await waitFor(() =>
      expect(document.body).toHaveTextContent("초대를 수락했어요"),
    );
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
    renderAppRoute("/invites/unknown-token/accept");

    await waitFor(() =>
      expect(document.body).toHaveTextContent("초대 링크를 찾을 수 없어요"),
    );
  });
});
