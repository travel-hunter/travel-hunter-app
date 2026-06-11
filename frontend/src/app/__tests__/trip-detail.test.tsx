import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  appDataApi,
  type LinkedTripPolicy,
  type Trip,
} from "../../api";
import { App } from "../App";
import { AppProviders } from "../AppRoot";
import {
  examplePolicyPath,
  examplePolicySlug,
  examplePolicyTitle,
  getPreviewTrip,
} from "../../test/fixtures";
import { installAppKakaoSdkMock } from "../../test/kakaoMock";
import { getLink, login, renderAppRoute } from "../../test/renderAppRoute";

describe("Travel Hunter app — trip detail & itinerary", () => {
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

  it("hides the friend invite entry for non-owner trip members", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "57",
      currentUserRole: "editor",
      title: "편집자 참여 일정",
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/57");

      await waitFor(() =>
        expect(screen.getAllByText("편집자 참여 일정").length).toBeGreaterThan(0),
      );
      expect(screen.queryByRole("link", { name: "+ 친구 초대" })).not.toBeInTheDocument();
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

  it("opens an inspectable place detail dialog from the map bottom sheet", async () => {
    const trip: Trip = {
      ...getPreviewTrip(),
      id: "55",
      title: "제주 지도 여행",
      dates: "2026.06.15 - 06.17",
      days: {
        1: [
          {
            id: "1",
            time: "09:00",
            label: "성산 일출봉",
            meta: "일출 보기 좋은 자연 명소",
            address: "제주 서귀포시 성산읍 성산리 1",
            latitude: 33.458,
            longitude: 126.942,
            category: "관광명소",
            categoryCode: "AT4",
            placeUrl: "https://place.map.kakao.com/123",
          },
        ],
      },
    };
    const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

    try {
      await login();
      cleanup();
      renderAppRoute("/trips/55?day=1&view=map&place=1");
      const user = userEvent.setup();

      await screen.findByRole("dialog", { name: "성산 일출봉 지도 상세" });
      await user.click(screen.getByRole("button", { name: "상세 보기" }));

      const detailDialog = await screen.findByRole("dialog", {
        name: "성산 일출봉 장소 상세",
      });
      expect(within(detailDialog).getByText("Day 1")).toBeInTheDocument();
      expect(within(detailDialog).getByText("09:00")).toBeInTheDocument();
      expect(within(detailDialog).getByText("관광명소")).toBeInTheDocument();
      expect(
        within(detailDialog).getByText("제주 서귀포시 성산읍 성산리 1"),
      ).toBeInTheDocument();
      expect(
        within(detailDialog).getByText("일출 보기 좋은 자연 명소"),
      ).toBeInTheDocument();
      expect(within(detailDialog).getByText("33.458, 126.942")).toBeInTheDocument();
      expect(within(detailDialog).getByRole("link", { name: "카카오맵에서 보기" })).toHaveAttribute(
        "href",
        "https://place.map.kakao.com/123",
      );
      expect(screen.queryByText("장소 상세 보기는 준비 중이에요.")).not.toBeInTheDocument();

      await user.click(within(detailDialog).getByRole("button", { name: "닫기" }));
      expect(
        screen.queryByRole("dialog", { name: "성산 일출봉 장소 상세" }),
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
});
