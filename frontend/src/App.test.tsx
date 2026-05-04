import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./app/App";
import { AppProviders, AppRoot } from "./app/AppRoot";

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
      "/mypage",
    ];

    for (const route of routes) {
      cleanup();
      renderRoute(route);
      expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
    }
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
});
