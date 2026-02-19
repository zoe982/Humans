import { test, expect } from "@playwright/test";

test.describe("Geo-interests dropdown z-index", () => {
  test("country dropdown renders above the table", async ({ page }) => {
    await page.goto("/geo-interests");
    await page.waitForLoadState("networkidle");

    // Open the create form
    const newButton = page.getByRole("button", { name: "New Geo-Interest" });
    await expect(newButton).toBeVisible();
    await newButton.click();

    // Wait for the form to appear
    const countryInput = page.locator("#countrySearch");
    await expect(countryInput).toBeVisible({ timeout: 5000 });

    // Focus and type to open dropdown
    await countryInput.click();
    await countryInput.fill("Fra");

    // The dropdown should be visible
    const dropdown = page.locator(".absolute.z-50");
    await expect(dropdown).toBeVisible();

    // The dropdown should contain "France"
    const franceOption = dropdown.getByText("France");
    await expect(franceOption).toBeVisible();

    // Verify we can click the option — if z-index were broken,
    // the table below would intercept the click
    await franceOption.click();

    // After selection, the input should show "France"
    await expect(countryInput).toHaveValue("France");
  });

  test("selecting a country populates the hidden field", async ({ page }) => {
    await page.goto("/geo-interests");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: "New Geo-Interest" });
    await expect(newButton).toBeVisible();
    await newButton.click();

    const countryInput = page.locator("#countrySearch");
    await expect(countryInput).toBeVisible({ timeout: 5000 });

    await countryInput.click();
    await countryInput.fill("Ger");

    const dropdown = page.locator(".absolute.z-50");
    await dropdown.getByText("Germany").click();

    // The hidden input carrying the actual form value should be set
    const hiddenInput = page.locator('input[name="country"][type="hidden"]');
    await expect(hiddenInput).toHaveValue("Germany");
  });
});
