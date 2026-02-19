import { test, expect } from "@playwright/test";

test.describe("Navigation smoke tests", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Sign in with Google")).toBeVisible();
  });

  test("dashboard renders for authenticated user", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    // Auth bypass provides admin role, so nav should show admin link
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  });

  test("humans page renders", async ({ page }) => {
    await page.goto("/humans");
    await expect(page.getByRole("heading", { name: "Humans" })).toBeVisible();
  });

  test("geo-interests page renders", async ({ page }) => {
    await page.goto("/geo-interests");
    await expect(page.getByRole("heading", { name: "Geo-Interests" })).toBeVisible();
  });

  test("nav links navigate correctly", async ({ page }) => {
    await page.goto("/dashboard");

    // Use exact match and nav-scoped locators to avoid ambiguity
    await page.getByRole("link", { name: "Humans", exact: true }).first().click();
    await expect(page).toHaveURL(/\/humans/);

    await page.getByRole("link", { name: "Geo-Interests", exact: true }).first().click();
    await expect(page).toHaveURL(/\/geo-interests/);

    await page.getByRole("link", { name: "Dashboard", exact: true }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
