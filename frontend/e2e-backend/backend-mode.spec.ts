import { expect, Page, test } from "@playwright/test";

const seedUser = {
  email: "test.user@example.com",
  password: "password123",
};

const numericTripId = /^[1-9][0-9]*$/;
const apiBaseUrl = process.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";
const examplePolicySlug = "dgtour-\uC601\uAD11-8";
const examplePolicyPath = `/policies/${encodeURIComponent(examplePolicySlug)}`;
const examplePolicyOfficialUrl = "https://www.yeonggwang.go.kr/travel/";

async function login(page: Page) {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('input[type="email"]').fill(seedUser.email);
  await page.locator('input[type="password"]').fill(seedUser.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home$/);
}

async function seedStoredAuth(page: Page) {
  const response = await page.request.post(`${apiBaseUrl}/api/auth/login`, {
    data: seedUser,
  });
  expect(response.ok()).toBeTruthy();
  const auth = await response.json();
  await page.addInitScript((storedAuth) => {
    window.localStorage.setItem("travel-hunter-production-auth", JSON.stringify(storedAuth));
  }, auth);
  return auth as { accessToken: string };
}

test.describe.configure({ mode: "serial" });

test("backend data source requires login for protected routes", async ({ page }) => {
  await page.goto("/home");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fhome$/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("backend data source persists profile setup choices", async ({ page }) => {
  await login(page);

  await page.goto("/profile-setup");
  await page.getByRole("button", { name: "부산" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "맛집" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "1인 30만원 이하" }).click();
  await page.getByRole("button", { name: "추천 홈 보기" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator(".prototype-home-ai-card")).toBeVisible();
  await expect(page.locator(".prototype-home-ai-card")).toContainText("맛집 코스 만들기");

  await page.reload();
  await expect(page.locator(".prototype-home-ai-card")).toContainText("맛집 코스 만들기");
});

test("backend data source drives policy, trip, recommendation, invite, and logout flow", async ({ page }) => {
  await login(page);

  await page.goto(examplePolicyPath);
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("link", { name: "혜택 안내 보기" })).toHaveAttribute(
    "href",
    examplePolicyOfficialUrl,
  );
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.locator(".toast")).toContainText("관심 정책");
  await expect(page.locator(".sticky-cta button").first()).toBeVisible();
  await page.locator(".sticky-cta button").first().click();
  const policyTripSheet = page.locator(".trip-select-sheet");
  await expect(policyTripSheet).toBeVisible();
  const policyTripRow = policyTripSheet.locator(".trip-select-row").first();
  const policyTripLabel = await policyTripRow.textContent();
  expect(policyTripLabel).toBeTruthy();
  await policyTripRow.click();
  await expect(page.locator(".toast")).toBeVisible();
  await policyTripSheet.locator("button", { hasText: "일정에서 보기" }).click();
  await expect(page).toHaveURL(/\/trips\/[1-9][0-9]*$/);

  await page.goto("/trips");
  const firstTrip = page.locator("article.itinerary-card").first();
  await expect(firstTrip).toBeVisible();
  const firstTripLink = firstTrip.locator('a[href^="/trips/"]').first();
  const tripHref = await firstTripLink.getAttribute("href");
  expect(tripHref).toMatch(/^\/trips\/[1-9][0-9]*$/);
  const tripId = tripHref?.split("/").pop() ?? "";
  expect(tripId).toMatch(numericTripId);

  await firstTripLink.click();
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`));
  await expect(page.locator('a[href^="/ai-results?tripId="]').first()).toBeVisible();

  await page.locator('a[href^="/ai-results?tripId="]').first().click();
  await expect(page).toHaveURL(new RegExp(`/ai-results\\?tripId=${tripId}$`));
  await expect(page.locator(".ai-candidate-card").first()).toBeVisible();

  const recommendationAction = page.locator(".ai-candidate-card").first();
  await expect(recommendationAction).toBeVisible();
  if (await recommendationAction.isEnabled()) {
    await recommendationAction.click();
    const dayPicker = page.getByRole("dialog");
    const addToDayButton = dayPicker.getByRole("button", { name: /^Day [1-9][0-9]*/ }).first();
    await expect(addToDayButton).toBeVisible();
    await addToDayButton.click();
    await expect(page.locator(".toast")).toBeVisible();
    await page.goto(`/trips/${tripId}`);
  } else {
    await expect(recommendationAction).toContainText("이미 일정에 있음");
    await page.goto(`/trips/${tripId}`);
  }

  await page.goto(`/friend-invite?tripId=${tripId}`);
  await expect(page.locator(".invite-link")).toBeVisible();
  await expect(page.locator(".invite-link span")).toContainText("travelhunter.app/i/");
  await expect(page.getByRole("button", { name: "링크 복사" })).toBeVisible();
  await page.getByRole("button", { name: /초대 링크/ }).click();
  await expect(page.getByRole("button", { name: "초대 링크 준비 완료" })).toBeVisible();

  await page.goto("/mypage");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("policy category tabs stay on one horizontal scroll row on mobile", async ({ page }) => {
  await seedStoredAuth(page);

  await page.goto("/policies");
  const categoryTabs = page.locator(".prototype-policy-list-screen .prototype-category-tabs");
  const categoryScroller = page.locator(".prototype-policy-list-screen .prototype-policy-titlebar");
  await expect(categoryTabs).toBeVisible();
  await expect(categoryScroller).toBeVisible();
  await expect(page.getByRole("button", { name: "기타" })).toBeVisible();

  const layout = await categoryScroller.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const buttons = Array.from(element.querySelectorAll(".prototype-category-tab"));
    const tabs = element.querySelector(".prototype-category-tabs");
    const tabsStyle = tabs ? window.getComputedStyle(tabs) : null;
    return {
      display: tabsStyle?.display,
      overflowX: style.overflowX,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      topValues: buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
    };
  });

  expect(layout.display).toBe("flex");
  expect(layout.overflowX).toBe("auto");
  expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth);
  expect(new Set(layout.topValues).size).toBe(1);
});

test("policy detail sticky CTA stays attached above bottom tabs while scrolling", async ({ page }) => {
  await seedStoredAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/policies/travelmonth-44");
  const cta = page.locator(".prototype-policy-detail-screen .sticky-cta");
  const bottomTabs = page.locator(".bottom-tabs");
  await expect(cta).toBeVisible();
  await expect(bottomTabs).toBeVisible();

  await page.locator(".app-container").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const layout = await page.evaluate(() => {
    const ctaElement = document.querySelector(".prototype-policy-detail-screen .sticky-cta");
    const bottomTabsElement = document.querySelector(".bottom-tabs");
    if (!ctaElement || !bottomTabsElement) return null;
    const ctaRect = ctaElement.getBoundingClientRect();
    const bottomTabsRect = bottomTabsElement.getBoundingClientRect();
    return {
      gap: Math.round(bottomTabsRect.top - ctaRect.bottom),
    };
  });

  expect(Math.abs(layout?.gap ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(1);
});

test("confirmed trip detail keeps owner editing controls available", async ({ page }) => {
  const auth = await seedStoredAuth(page);
  const createResponse = await page.request.post(`${apiBaseUrl}/api/trips`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      title: "확정 잠금 e2e 여행",
      region: "부산",
      style: "맛집",
      startDate: "2026-07-12",
      endDate: "2026-07-14",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdTrip = await createResponse.json();
  const tripId = String(createdTrip.id);
  expect(tripId).toMatch(numericTripId);

  const confirmResponse = await page.request.patch(`${apiBaseUrl}/api/trips/${tripId}/status`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { status: "confirmed" },
  });
  expect(confirmResponse.ok()).toBeTruthy();
  const confirmedTrip = await confirmResponse.json();
  expect(confirmedTrip.status).toBe("confirmed");

  await page.goto(`/trips/${tripId}`);
  await expect(page.locator(".trip-status-panel")).toHaveCount(0);
  await expect(page.locator(".prototype-trip-action-add")).toBeVisible();
  await expect(page.locator(".drag-handle").first()).toBeVisible();
});

test("core app screens do not horizontally overflow at common responsive widths", async ({ page }) => {
  await seedStoredAuth(page);

  const widths = [360, 390, 430, 1024, 1440];
  const staticScreens = [
    { path: "/home", selector: ".prototype-home-screen" },
    { path: "/policies", selector: ".prototype-policy-list-screen" },
    { path: "/trips/new", selector: ".prototype-create-content" },
    { path: "/mypage", selector: ".prototype-mypage-screen" },
  ];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });

    for (const screen of staticScreens) {
      await page.goto(screen.path);
      await expect(page.locator(screen.selector)).toBeVisible();
      await expectNoDocumentOverflow(page);
    }

    await page.goto("/trips");
    const firstTripLink = page.locator('article.itinerary-card a[href^="/trips/"]').first();
    await expect(firstTripLink).toBeVisible();
    const tripHref = await firstTripLink.getAttribute("href");
    expect(tripHref).toMatch(/^\/trips\/[1-9][0-9]*$/);
    await page.goto(tripHref ?? "/trips");
    await expect(page.locator(".prototype-trip-detail-screen")).toBeVisible();
    await expectNoDocumentOverflow(page);
  }
});

test("home recommendation starts a new trip and reaches recommended policy detail", async ({ page }) => {
  await seedStoredAuth(page);

  await page.goto("/home");
  const aiTripCard = page.locator(".prototype-home-ai-card");
  await expect(aiTripCard).toBeVisible();
  await expect(aiTripCard).toHaveAttribute("href", /\/trips\/new\?region=/);

  await aiTripCard.click();
  await expect(page).toHaveURL(/\/trips\/new\?region=/);
  await expect(page.getByRole("heading", { name: "여행 지역 선택" })).toBeVisible();
  const firstTravelArea = page.locator(".prototype-travel-area-card").first();
  await expect(firstTravelArea).toBeVisible();
  await firstTravelArea.click();
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByRole("heading", { name: "코스 취향 선택" })).toBeVisible();
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByRole("heading", { name: "여행 기간 선택" })).toBeVisible();
  await page.locator('input[type="date"]').nth(0).fill("2026-07-12");
  await page.locator('input[type="date"]').nth(1).fill("2026-07-14");
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByRole("heading", { name: "일정 제목 입력" })).toBeVisible();
  await page.locator('input[name="trip-title"]').fill("홈 추천 smoke 여행");
  await page.getByRole("button", { name: "일정 만들기" }).click();

  await expect(page).toHaveURL(/\/trips\/[1-9][0-9]*$/);
  await expect(page.locator(".day-tab").first()).toBeVisible();
  const recommendedPolicyLink = page.locator('.prototype-matching-policy-card[href^="/policies/"]').first();
  await expect(recommendedPolicyLink).toBeVisible();
  const policyHref = await recommendedPolicyLink.getAttribute("href");
  expect(policyHref).toMatch(/^\/policies\/.+/);
  await recommendedPolicyLink.click();
  await expect(page).toHaveURL(/\/policies\/.+/);
  await expect(page.getByRole("link", { name: "혜택 안내 보기" }).or(page.getByRole("link", { name: "신청하러 가기" }))).toBeVisible();
});

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.ceil(document.documentElement.scrollWidth - document.documentElement.clientWidth));
  expect(overflow).toBeLessThanOrEqual(1);
}

test("backend data source creates a trip with selected profile values and policy slug", async ({ page }) => {
  await login(page);

  await page.goto(`/trips/new?policySlug=${encodeURIComponent(examplePolicySlug)}`);
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("heading", { name: "여행 지역 선택" })).toBeVisible();
  await page.getByRole("button", { name: /부산/ }).click();
  const firstTravelArea = page.locator(".prototype-travel-area-card").first();
  await expect(firstTravelArea).toBeVisible();
  await firstTravelArea.click();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "코스 취향 선택" })).toBeVisible();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "여행 기간 선택" })).toBeVisible();
  await page.locator('input[type="date"]').nth(0).fill("2026-07-12");
  await page.locator('input[type="date"]').nth(1).fill("2026-07-15");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "일정 제목 입력" })).toBeVisible();
  await page.locator('input[name="trip-title"]').fill("부산 e2e 여행");
  await page.getByRole("button", { name: "일정 만들기" }).click();
  await expect(page).toHaveURL(/\/trips\/[1-9][0-9]*$/);
  const createdTripId = page.url().split("/").pop() ?? "";
  expect(createdTripId).toMatch(numericTripId);
  await expect(page.locator(".day-tab").first()).toBeVisible();
  await expect(page.locator("body")).toContainText("10:00");
  await expect(page.locator("body")).toContainText("13:00");
  await expect(page.locator("body")).toContainText("16:00");
  await expect(page.locator("body")).toContainText("20:00");

  await page.goto(`/ai-results?tripId=${createdTripId}`);
  await expect(page.locator(".ai-candidate-card").first()).toBeVisible();

  await page.goto(`/friend-invite?tripId=${createdTripId}`);
  await expect(page.locator(".invite-link")).toBeVisible();
});
