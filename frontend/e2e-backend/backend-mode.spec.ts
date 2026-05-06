import { expect, Page, test } from "@playwright/test";

const seedUser = {
  email: "jiyoung@travel.kr",
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

async function getStoredAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const saved = window.localStorage.getItem("travel-hunter-production-auth");
    if (!saved) return "";
    return String(JSON.parse(saved).accessToken || "");
  });

  expect(token).not.toEqual("");
  return token;
}

test.describe.configure({ mode: "serial" });

test("backend data source requires login for protected routes", async ({ page }) => {
  await page.goto("/home");

  await expect(page).toHaveURL(/\/login$/);
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
  const firstTrip = page.locator("a.itinerary-card").first();
  await expect(firstTrip).toBeVisible();
  const tripHref = await firstTrip.getAttribute("href");
  expect(tripHref).toMatch(/^\/trips\/[1-9][0-9]*$/);
  const tripId = tripHref?.split("/").pop() ?? "";
  expect(tripId).toMatch(numericTripId);

  await firstTrip.click();
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`));
  await expect(page.locator('a[href^="/ai-results?tripId="]').first()).toBeVisible();

  await page.locator('a[href^="/ai-results?tripId="]').first().click();
  await expect(page).toHaveURL(new RegExp(`/ai-results\\?tripId=${tripId}$`));
  await expect(page.locator(".result-card").first()).toBeVisible();

  await page.locator(".result-card button").first().click();
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`));

  await page.goto(`/friend-invite?tripId=${tripId}`);
  await expect(page.locator(".invite-link")).toBeVisible();
  await page.locator(".invite-link button").click();
  await expect(page.locator(".toast")).toBeVisible();
  await page.locator(".content > .btn.full").click();
  await expect(page.locator(".content > .btn.full")).toBeVisible();

  await page.goto("/mypage");
  await page.locator(".content > .btn.full").click();
  await expect(page).toHaveURL(/\/login$/);
});

test("backend data source creates a trip with selected profile values and policy slug", async ({ page }) => {
  await login(page);

  await page.goto("/trips/new?policySlug=local-vacation");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.locator(".content .btn.full").click();
  await expect(page).toHaveURL(/\/trips\/[1-9][0-9]*$/);
  const createdTripId = page.url().split("/").pop() ?? "";
  expect(createdTripId).toMatch(numericTripId);

  await page.goto(`/ai-results?tripId=${createdTripId}`);
  await expect(page.locator(".result-card").first()).toBeVisible();

  await page.goto(`/friend-invite?tripId=${createdTripId}`);
  await expect(page.locator(".invite-link")).toBeVisible();
});

test("legacy trip alias canonicalizes when the shared DB has a unique seed match", async ({ page, request }) => {
  await login(page);
  const accessToken = await getStoredAccessToken(page);
  const apiBaseUrl = process.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

  const aliasResponse = await request.get(`${apiBaseUrl}/api/trips/jeju-3-days`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (aliasResponse.status() === 404) {
    test.info().annotations.push({
      type: "note",
      description:
        "Legacy alias failed closed. This is expected when a shared dev DB contains zero or multiple seed-like trip rows.",
    });
    return;
  }

  expect(aliasResponse.ok()).toBeTruthy();
  const aliasTrip = (await aliasResponse.json()) as { id: string };
  expect(aliasTrip.id).toMatch(numericTripId);

  await page.goto("/trips/jeju-3-days");
  await expect(page).toHaveURL(new RegExp(`/trips/${aliasTrip.id}$`));
});
