import { test, expect } from "@playwright/test";

test.describe("Dropdown interactions", () => {
  test.describe("SearchableSelect", () => {
    test("opens with animation class, filters, and shows checkmark on selected option", async ({ page }) => {
      await page.goto("/geo-interests");
      await page.waitForLoadState("networkidle");

      // Open the create form
      const newButton = page.getByRole("button", { name: "New Geo-Interest" });
      await expect(newButton).toBeVisible();
      await newButton.click();

      // Focus the country dropdown
      const countryInput = page.locator("#countrySearch");
      await expect(countryInput).toBeVisible({ timeout: 5000 });
      await countryInput.click();

      // Dropdown should appear with glass-dropdown-animate
      const dropdown = page.locator("ul[role='listbox']");
      await expect(dropdown).toBeVisible();
      await expect(dropdown).toHaveClass(/glass-dropdown-animate/);

      // Filter options
      await countryInput.fill("Fra");
      const franceOption = dropdown.getByText("France");
      await expect(franceOption).toBeVisible();

      // Select France
      await franceOption.click();
      await expect(countryInput).toHaveValue("France");

      // Reopen and verify checkmark (svg inside the selected option)
      await countryInput.click();
      await expect(dropdown).toBeVisible();
      const selectedButton = dropdown.locator("button", { hasText: "France" });
      await expect(selectedButton.locator("svg")).toBeVisible();
    });

    test("chevron rotates when dropdown opens", async ({ page }) => {
      await page.goto("/geo-interests");
      await page.waitForLoadState("networkidle");

      const newButton = page.getByRole("button", { name: "New Geo-Interest" });
      await newButton.click();

      const countryInput = page.locator("#countrySearch");
      await expect(countryInput).toBeVisible({ timeout: 5000 });

      // Chevron should not be rotated initially
      const chevron = page.locator("#countrySearch ~ svg, div:has(> #countrySearch) > svg");
      // Before opening: no rotate-180
      await expect(chevron.first()).not.toHaveClass(/rotate-180/);

      // Open dropdown
      await countryInput.click();

      // After opening: should have rotate-180
      await expect(chevron.first()).toHaveClass(/rotate-180/);
    });

    test("dropdown items use glass-dropdown-item class", async ({ page }) => {
      await page.goto("/geo-interests");
      await page.waitForLoadState("networkidle");

      const newButton = page.getByRole("button", { name: "New Geo-Interest" });
      await newButton.click();

      const countryInput = page.locator("#countrySearch");
      await expect(countryInput).toBeVisible({ timeout: 5000 });
      await countryInput.click();

      const items = page.locator("[role='option'] button");
      await expect(items.first()).toBeVisible();
      await expect(items.first()).toHaveClass(/glass-dropdown-item/);
    });
  });
});
