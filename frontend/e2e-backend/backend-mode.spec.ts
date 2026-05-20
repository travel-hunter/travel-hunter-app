import { expect, Page, test } from "@playwright/test";

const seedUser = {
  email: "test.user@example.com",
  password: "password123",
};

const numericTripId = /^[1-9][0-9]*$/;

async function login(page: Page) {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('input[type="email"]').fill(seedUser.email);
  await page.locator('input[type="password"]').fill(seedUser.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home$/);
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
  await expect(page.locator("body")).toContainText("부산 여행");

  await page.reload();
  await expect(page.locator("body")).toContainText("부산 여행");
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

  await page.locator(".result-card button").first().click();
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`));

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

  await page.goto(`/ai-results?tripId=${createdTripId}`);
  await expect(page.locator(".result-card").first()).toBeVisible();

  await page.goto(`/friend-invite?tripId=${createdTripId}`);
  await expect(page.locator(".invite-link")).toBeVisible();
});
