import { expect, Page, test } from "@playwright/test";

const seedUser = {
  email: "test.user@example.com",
  password: "password123",
};

const numericTripId = /^[1-9][0-9]*$/;
const apiBaseUrl = process.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

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

  await page.goto("/policies/local-vacation");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("link", { name: "공식 안내 확인" })).toHaveAttribute(
    "href",
    "https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267",
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
  await expect(page.locator(".result-card").first()).toBeVisible();

  const recommendationAction = page.locator(".result-card button").first();
  await expect(recommendationAction).toBeVisible();
  if (await recommendationAction.isEnabled()) {
    await recommendationAction.click();
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`));
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
  await expect(categoryTabs).toBeVisible();
  await expect(page.getByRole("button", { name: "기타" })).toBeVisible();

  const layout = await categoryTabs.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const buttons = Array.from(element.querySelectorAll(".prototype-category-tab"));
    return {
      display: style.display,
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
  await expect(page.getByRole("heading", { name: "어디로 떠나나요?" })).toBeVisible();
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByRole("heading", { name: "언제 떠나나요?" })).toBeVisible();
  await page.getByLabel("출발일").fill("2026-07-12");
  await page.getByLabel("도착일").fill("2026-07-14");
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByRole("heading", { name: "일정 제목을 정해볼까요?" })).toBeVisible();
  await page.getByRole("textbox", { name: "일정 제목" }).fill("홈 추천 smoke 여행");
  await page.getByRole("button", { name: "일정 만들기" }).click();

  await expect(page).toHaveURL(/\/trips\/[1-9][0-9]*$/);
  await expect(page.locator(".day-tab").first()).toBeVisible();
  const recommendedPolicyLink = page.locator('.prototype-matching-policy-card[href^="/policies/"]').first();
  await expect(recommendedPolicyLink).toBeVisible();
  const policyHref = await recommendedPolicyLink.getAttribute("href");
  expect(policyHref).toMatch(/^\/policies\/.+/);
  await recommendedPolicyLink.click();
  await expect(page).toHaveURL(/\/policies\/.+/);
  await expect(page.getByRole("link", { name: "공식 안내 확인" }).or(page.getByRole("link", { name: "신청하러 가기" }))).toBeVisible();
});

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.ceil(document.documentElement.scrollWidth - document.documentElement.clientWidth));
  expect(overflow).toBeLessThanOrEqual(1);
}

test("backend data source creates a trip with selected profile values and policy slug", async ({ page }) => {
  await login(page);

  await page.goto("/trips/new?policySlug=local-vacation");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("heading", { name: "어디로 떠나나요?" })).toBeVisible();
  await page.getByRole("button", { name: /부산/ }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "언제 떠나나요?" })).toBeVisible();
  await page.getByLabel("출발일").fill("2026-07-12");
  await page.getByLabel("도착일").fill("2026-07-15");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "일정 제목을 정해볼까요?" })).toBeVisible();
  await page.getByRole("textbox", { name: "일정 제목" }).fill("부산 e2e 여행");
  await page.getByRole("button", { name: "일정 만들기" }).click();
  await expect(page).toHaveURL(/\/trips\/[1-9][0-9]*$/);
  const createdTripId = page.url().split("/").pop() ?? "";
  expect(createdTripId).toMatch(numericTripId);
  await expect(page.locator(".day-tab").first()).toBeVisible();
  await expect(page.locator("body")).toContainText("10:00");
  await expect(page.locator("body")).toContainText("14:00");
  await expect(page.locator("body")).toContainText("18:00");

  await page.goto(`/ai-results?tripId=${createdTripId}`);
  await expect(page.locator(".result-card").first()).toBeVisible();

  await page.goto(`/friend-invite?tripId=${createdTripId}`);
  await expect(page.locator(".invite-link")).toBeVisible();
});
