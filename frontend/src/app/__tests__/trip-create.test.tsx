import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  appDataApi,
  type Trip,
} from "../../api";
import {
  examplePolicySlug,
  getBusanTravelAreaResponse,
  getGangneungTravelAreaResponse,
  getGangwonTravelAreaResponse,
  getGyeongjuTravelAreaResponse,
  getJejuTravelAreaResponse,
  getPreviewTrip,
  getSokchoTravelAreaResponse,
} from "../../test/fixtures";
import { login, renderAppRoute } from "../../test/renderAppRoute";

describe("Travel Hunter app — trip creation", () => {
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
      expect(screen.getByText(/👥 1명 참여 · 예정 3명/)).toBeInTheDocument();
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
});
