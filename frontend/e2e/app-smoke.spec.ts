import { expect, Page, test } from "@playwright/test";

const forbiddenCopy = [
  `Travel Hunter ${["Pro", "duction"].join("")}`,
  "9:41",
  "5G",
  "WiFi",
  "85%",
  ["Proto", "type"].join(""),
  ["mo", "ck"].join(""),
  ["Sp", "rint"].join(""),
];

async function expectRendered(page: Page) {
  const root = page.locator("#root");
  await expect(root).not.toBeEmpty();

  for (const text of forbiddenCopy) {
    await expect(page.locator("body")).not.toContainText(text);
  }
}

async function login(page: Page) {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home$/);
}

test("public routes render in a real browser", async ({ page }) => {
  for (const route of ["/", "/login", "/signup"]) {
    await page.goto(route);
    await expectRendered(page);
  }

  await expect(page.locator('a[href="/login"]')).toBeVisible();
});

test("protected routes redirect anonymous users to login", async ({ page }) => {
  await page.goto("/home");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fhome$/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("login reaches the authenticated home route", async ({ page }) => {
  await login(page);

  await expect(page.locator('a[href="/policies"]:visible').first()).toBeVisible();
  await expect(page.locator('a[href="/trips"]:visible').first()).toBeVisible();
});

test("authenticated app routes render without blank root", async ({ page }) => {
  await login(page);

  const routes = ["/profile-setup", "/home", "/policies", "/policies/local-vacation", "/trips", "/trips/new", "/trips/jeju-3-days", "/trips/1", "/ai-results?tripId=jeju-3-days", "/friend-invite?tripId=jeju-3-days", "/mypage"];

  for (const route of routes) {
    await page.goto(route);
    await expectRendered(page);
  }
});

test("core service actions show stable feedback", async ({ page }) => {
  await login(page);

  await page.goto("/policies/local-vacation");
  await page.locator(".sticky-cta button").first().click();
  await expect(page.locator(".trip-select-sheet")).toBeVisible();
  await page.locator(".trip-select-row").first().click();
  await expect(page.locator(".toast")).toBeVisible();

  await page.goto("/trips/new");
  await page.locator(".content .btn.full").click();
  await expect(page).toHaveURL(/\/trips\/jeju-3-days$/);

  await page.goto("/trips/jeju-3-days");
  await page.locator('a[href^="/ai-results?tripId="]').click();
  await expect(page).toHaveURL(/\/ai-results\?tripId=/);
  await page.locator(".result-card button").first().click();
  await expect(page).toHaveURL(/\/trips\/jeju-3-days$/);

  await page.goto("/friend-invite");
  await page.locator(".invite-link button").click();
  await expect(page.locator(".toast")).toBeVisible();
  await page.locator(".content > .btn.full").click();
  await expect(page.locator(".content > .btn.full")).toBeVisible();

  await page.goto("/mypage");
  await page.locator(".content > .btn.full").click();
  await expect(page).toHaveURL(/\/login$/);
});

test("key screens stay within responsive viewport width", async ({ page }) => {
  await login(page);

  const viewports = [
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];
  const routes = ["/", "/login", "/home", "/policies/local-vacation", "/trips/jeju-3-days"];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const route of routes) {
      await page.goto(route);
      await expectRendered(page);

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 4);
    }
  }
});
