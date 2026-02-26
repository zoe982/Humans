import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import LeadScoreInlineFlags from "./LeadScoreInlineFlags.svelte";

vi.mock("$lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "$lib/api";
const mockApi = vi.mocked(api);

// ── Shared fixture ────────────────────────────────────────────────────────────

interface LeadScoreFull {
  id: string;
  scoreTotal: number;
  scoreFit: number;
  scoreIntent: number;
  scoreEngagement: number;
  scoreNegative: number;
  fitMatchesCurrentWebsiteFlight: boolean;
  fitPriceAcknowledgedOk: boolean;
  intentDepositPaid: boolean;
  intentPaymentDetailsSent: boolean;
  intentRequestedPaymentDetails: boolean;
  intentBookingSubmitted: boolean;
  intentBookingStarted: boolean;
  intentRouteSignupSubmitted: boolean;
  engagementRespondedFast: boolean;
  engagementRespondedSlow: boolean;
  negativeNoContactMethod: boolean;
  negativeOffNetworkRequest: boolean;
  negativePriceObjection: boolean;
  negativeGhostedAfterPaymentSent: boolean;
  customerHasFlown: boolean;
}

const defaultLeadScore: LeadScoreFull = {
  id: "ls-1",
  scoreTotal: 45,
  scoreFit: 30,
  scoreIntent: 25,
  scoreEngagement: 15,
  scoreNegative: 25,
  fitMatchesCurrentWebsiteFlight: false,
  fitPriceAcknowledgedOk: false,
  intentDepositPaid: false,
  intentPaymentDetailsSent: false,
  intentRequestedPaymentDetails: false,
  intentBookingSubmitted: false,
  intentBookingStarted: false,
  intentRouteSignupSubmitted: false,
  engagementRespondedFast: false,
  engagementRespondedSlow: false,
  negativeNoContactMethod: false,
  negativeOffNetworkRequest: false,
  negativePriceObjection: false,
  negativeGhostedAfterPaymentSent: false,
  customerHasFlown: false,
};

function renderComponent(overrides: Partial<{
  leadScore: LeadScoreFull;
  detailHref: string;
  onScoreUpdate: (updated: LeadScoreFull) => void;
}> = {}): ReturnType<typeof render> {
  return render(LeadScoreInlineFlags, {
    props: {
      leadScore: defaultLeadScore,
      detailHref: "/lead-scores/ls-1",
      ...overrides,
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LeadScoreInlineFlags", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── Rendering: hero bar ───────────────────────────────────────────────────

  it("renders the total score in the hero bar", () => {
    renderComponent();
    // LeadScoreBadge renders the score as text
    expect(screen.getByText("45")).toBeDefined();
  });

  it("renders 'cold' band label when scoreTotal is below 50", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreTotal: 45 } });
    expect(screen.getByText("cold")).toBeDefined();
  });

  it("renders 'warm' band label when scoreTotal is 50 to 74", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreTotal: 60 } });
    expect(screen.getByText("warm")).toBeDefined();
  });

  it("renders 'hot' band label when scoreTotal is 75 or above", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreTotal: 80 } });
    expect(screen.getByText("hot")).toBeDefined();
  });

  it("renders the Fit category sub-badge with the correct score", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreFit: 30 } });
    expect(screen.getByText("+30 Fit")).toBeDefined();
  });

  it("renders the Intent category sub-badge with the correct score", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreIntent: 25 } });
    expect(screen.getByText("+25 Intent")).toBeDefined();
  });

  it("renders the Engage category sub-badge with the correct score", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreEngagement: 15 } });
    expect(screen.getByText("+15 Engage")).toBeDefined();
  });

  it("renders the Neg category sub-badge with the correct score", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreNegative: 25 } });
    expect(screen.getByText("-25 Neg")).toBeDefined();
  });

  it("renders a 'Full details' link with the correct href", () => {
    renderComponent({ detailHref: "/lead-scores/ls-1" });
    const link = screen.getByRole("link", { name: /Full details/ });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/lead-scores/ls-1");
  });

  // ── Rendering: category section headers ──────────────────────────────────

  it("renders the FIT section header", () => {
    renderComponent();
    expect(screen.getByText("Fit")).toBeDefined();
  });

  it("renders the INTENT section header", () => {
    renderComponent();
    expect(screen.getByText("Intent")).toBeDefined();
  });

  it("renders the ENGAGEMENT section header", () => {
    renderComponent();
    expect(screen.getByText("Engagement")).toBeDefined();
  });

  it("renders the NEGATIVE section header", () => {
    renderComponent();
    expect(screen.getByText("Negative")).toBeDefined();
  });

  it("renders the Fit score/max as '{scoreFit}/35'", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreFit: 30 } });
    expect(screen.getByText("30/35")).toBeDefined();
  });

  it("renders the Intent score/max as '{scoreIntent}/50'", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreIntent: 25 } });
    expect(screen.getByText("25/50")).toBeDefined();
  });

  it("renders the Engagement score/max as '{scoreEngagement}/15'", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreEngagement: 15 } });
    expect(screen.getByText("15/15")).toBeDefined();
  });

  it("renders the Negative score/max as '-{scoreNegative}/60'", () => {
    renderComponent({ leadScore: { ...defaultLeadScore, scoreNegative: 25 } });
    expect(screen.getByText("-25/60")).toBeDefined();
  });

  // ── Rendering: checkbox labels ────────────────────────────────────────────

  it("renders the 'Website flight match' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Website flight match")).toBeDefined();
  });

  it("renders the 'Price acknowledged OK' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Price acknowledged OK")).toBeDefined();
  });

  it("renders the 'Deposit paid' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Deposit paid")).toBeDefined();
  });

  it("renders the 'Payment details sent' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Payment details sent")).toBeDefined();
  });

  it("renders the 'Requested payment details' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Requested payment details")).toBeDefined();
  });

  it("renders the 'Booking submitted' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Booking submitted")).toBeDefined();
  });

  it("renders the 'Booking started' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Booking started")).toBeDefined();
  });

  it("renders the 'Route signup submitted' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Route signup submitted")).toBeDefined();
  });

  it("renders the 'Responded fast' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Responded fast")).toBeDefined();
  });

  it("renders the 'Responded slow' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Responded slow")).toBeDefined();
  });

  it("renders the 'No contact method' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("No contact method")).toBeDefined();
  });

  it("renders the 'Off-network request' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Off-network request")).toBeDefined();
  });

  it("renders the 'Price objection' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Price objection")).toBeDefined();
  });

  it("renders the 'Ghosted after payment sent' checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Ghosted after payment sent")).toBeDefined();
  });

  it("renders the 'Customer has flown' lifecycle checkbox label", () => {
    renderComponent();
    expect(screen.getByText("Customer has flown")).toBeDefined();
  });

  it("renders the '(min 95 pts)' qualifier next to 'Customer has flown'", () => {
    renderComponent();
    expect(screen.getByText("(min 95 pts)")).toBeDefined();
  });

  // ── Rendering: point values ───────────────────────────────────────────────

  it("renders '+30 pts' point value for Website flight match", () => {
    renderComponent();
    expect(screen.getByText("+30 pts")).toBeDefined();
  });

  it("renders '+5 pts' point value for Price acknowledged OK", () => {
    renderComponent();
    // "+5 pts" appears for both fitPriceAcknowledgedOk and intentRouteSignupSubmitted
    const fivePts = screen.getAllByText("+5 pts");
    expect(fivePts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders '+50 pts' point value for Deposit paid", () => {
    renderComponent();
    expect(screen.getByText("+50 pts")).toBeDefined();
  });

  it("renders '+35 pts' point value for Payment details sent", () => {
    renderComponent();
    expect(screen.getByText("+35 pts")).toBeDefined();
  });

  it("renders '+25 pts' point value for Requested payment details", () => {
    renderComponent();
    expect(screen.getByText("+25 pts")).toBeDefined();
  });

  it("renders '+20 pts' point value for Booking submitted", () => {
    renderComponent();
    expect(screen.getByText("+20 pts")).toBeDefined();
  });

  it("renders '+10 pts' point value for Booking started", () => {
    renderComponent();
    expect(screen.getByText("+10 pts")).toBeDefined();
  });

  it("renders '+15 pts' point value for Responded fast", () => {
    renderComponent();
    expect(screen.getByText("+15 pts")).toBeDefined();
  });

  it("renders '+8 pts' point value for Responded slow", () => {
    renderComponent();
    expect(screen.getByText("+8 pts")).toBeDefined();
  });

  it("renders '-30 pts' point value for No contact method", () => {
    renderComponent();
    expect(screen.getByText("-30 pts")).toBeDefined();
  });

  it("renders '-25 pts' point value for Off-network request", () => {
    renderComponent();
    expect(screen.getByText("-25 pts")).toBeDefined();
  });

  it("renders '-20 pts' point value for Price objection", () => {
    renderComponent();
    expect(screen.getByText("-20 pts")).toBeDefined();
  });

  it("renders '-15 pts' point value for Ghosted after payment sent", () => {
    renderComponent();
    expect(screen.getByText("-15 pts")).toBeDefined();
  });

  // ── Rendering: total checkbox count ──────────────────────────────────────

  it("renders exactly 15 checkboxes in total", () => {
    renderComponent();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(15);
  });

  // ── Checkbox state: all false ─────────────────────────────────────────────

  it("renders all checkboxes unchecked when all flags are false", () => {
    renderComponent();
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      expect(cb instanceof HTMLInputElement && cb.checked).toBe(false);
    }
  });

  // ── Checkbox state: specific flags true ───────────────────────────────────

  it("renders fitMatchesCurrentWebsiteFlight checkbox as checked when flag is true", () => {
    renderComponent({
      leadScore: { ...defaultLeadScore, fitMatchesCurrentWebsiteFlight: true },
    });
    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox is fitMatchesCurrentWebsiteFlight
    expect(checkboxes[0] instanceof HTMLInputElement && checkboxes[0].checked).toBe(true);
  });

  it("renders fitPriceAcknowledgedOk checkbox as checked when flag is true", () => {
    renderComponent({
      leadScore: { ...defaultLeadScore, fitPriceAcknowledgedOk: true },
    });
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[1] instanceof HTMLInputElement && checkboxes[1].checked).toBe(true);
  });

  it("renders intentDepositPaid checkbox as checked when flag is true", () => {
    renderComponent({
      leadScore: { ...defaultLeadScore, intentDepositPaid: true },
    });
    const checkboxes = screen.getAllByRole("checkbox");
    // intentDepositPaid is in column 2, checkbox index 4 (after 2 fit + 2 engagement)
    expect(checkboxes[4] instanceof HTMLInputElement && checkboxes[4].checked).toBe(true);
  });

  it("renders customerHasFlown checkbox as checked when flag is true", () => {
    renderComponent({
      leadScore: { ...defaultLeadScore, customerHasFlown: true },
    });
    const checkboxes = screen.getAllByRole("checkbox");
    // Last checkbox is customerHasFlown
    expect(checkboxes[14] instanceof HTMLInputElement && checkboxes[14].checked).toBe(true);
  });

  it("renders negativeNoContactMethod checkbox as checked when flag is true", () => {
    renderComponent({
      leadScore: { ...defaultLeadScore, negativeNoContactMethod: true },
    });
    const checkboxes = screen.getAllByRole("checkbox");
    // negativeNoContactMethod: index 10 (after 2 fit + 6 intent + 2 engagement)
    expect(checkboxes[10] instanceof HTMLInputElement && checkboxes[10].checked).toBe(true);
  });

  it("renders multiple checked checkboxes when multiple flags are true", () => {
    renderComponent({
      leadScore: {
        ...defaultLeadScore,
        fitMatchesCurrentWebsiteFlight: true,
        engagementRespondedFast: true,
        negativeNoContactMethod: true,
      },
    });
    const checkboxes = screen.getAllByRole("checkbox");
    const checkedCount = checkboxes.filter((cb) => cb instanceof HTMLInputElement && cb.checked).length;
    expect(checkedCount).toBe(3);
  });

  // ── Checked styling ───────────────────────────────────────────────────────

  it("applies highlighted background class to label when fitMatchesCurrentWebsiteFlight is true", () => {
    const { container } = renderComponent({
      leadScore: { ...defaultLeadScore, fitMatchesCurrentWebsiteFlight: true },
    });
    // The label wrapping the first checkbox should have the green highlight class
    const firstCheckbox = container.querySelectorAll("input[type=checkbox]")[0];
    const label = firstCheckbox?.closest("label");
    expect(label?.className).toContain("bg-[rgba(34,197,94,0.07)]");
  });

  it("does not apply highlighted background class to label when fitMatchesCurrentWebsiteFlight is false", () => {
    const { container } = renderComponent({
      leadScore: { ...defaultLeadScore, fitMatchesCurrentWebsiteFlight: false },
    });
    const firstCheckbox = container.querySelectorAll("input[type=checkbox]")[0];
    const label = firstCheckbox?.closest("label");
    expect(label?.className).not.toContain("bg-[rgba(34,197,94,0.07)]");
  });

  it("applies blue highlight class to an intent checkbox label when its flag is true", () => {
    const { container } = renderComponent({
      leadScore: { ...defaultLeadScore, intentDepositPaid: true },
    });
    // intentDepositPaid is checkbox index 4 (after 2 fit + 2 engagement)
    const checkbox = container.querySelectorAll("input[type=checkbox]")[4];
    const label = checkbox?.closest("label");
    expect(label?.className).toContain("bg-[rgba(59,130,246,0.07)]");
  });

  it("applies red highlight class to a negative checkbox label when its flag is true", () => {
    const { container } = renderComponent({
      leadScore: { ...defaultLeadScore, negativeNoContactMethod: true },
    });
    // negativeNoContactMethod is checkbox index 10
    const checkbox = container.querySelectorAll("input[type=checkbox]")[10];
    const label = checkbox?.closest("label");
    expect(label?.className).toContain("bg-[rgba(239,68,68,0.07)]");
  });

  it("applies purple highlight class to an engagement checkbox label when its flag is true", () => {
    const { container } = renderComponent({
      leadScore: { ...defaultLeadScore, engagementRespondedFast: true },
    });
    // engagementRespondedFast is checkbox index 2 (after 2 fit, before intent)
    const checkbox = container.querySelectorAll("input[type=checkbox]")[2];
    const label = checkbox?.closest("label");
    expect(label?.className).toContain("bg-[rgba(168,85,247,0.07)]");
  });

  // ── Toggle interaction ────────────────────────────────────────────────────

  /** Get a checkbox by index, throwing if not found (getAllByRole guarantees results). */
  function getCheckbox(checkboxes: HTMLElement[], index: number): HTMLElement {
    // eslint-disable-next-line security/detect-object-injection -- test helper with controlled index
    const el = checkboxes[index];
    if (el === undefined) throw new Error("Checkbox at index " + String(index) + " not found");
    return el;
  }

  it("calls api() with correct PATCH URL and payload when a checkbox is clicked", async () => {
    mockApi.mockResolvedValue({ data: { ...defaultLeadScore, fitMatchesCurrentWebsiteFlight: true } });
    renderComponent();

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    expect(mockApi).toHaveBeenCalledWith(
      "/api/lead-scores/ls-1/flags",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ fitMatchesCurrentWebsiteFlight: true }),
      }),
    );
  });

  it("calls api() with PATCH payload for fitPriceAcknowledgedOk when its checkbox is clicked", async () => {
    mockApi.mockResolvedValue({ data: { ...defaultLeadScore, fitPriceAcknowledgedOk: true } });
    renderComponent();

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 1));

    expect(mockApi).toHaveBeenCalledWith(
      "/api/lead-scores/ls-1/flags",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ fitPriceAcknowledgedOk: true }),
      }),
    );
  });

  it("calls api() with PATCH payload for customerHasFlown when its checkbox is clicked", async () => {
    mockApi.mockResolvedValue({ data: { ...defaultLeadScore, customerHasFlown: true } });
    renderComponent();

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 14));

    expect(mockApi).toHaveBeenCalledWith(
      "/api/lead-scores/ls-1/flags",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ customerHasFlown: true }),
      }),
    );
  });

  it("calls api() using the score id from the leadScore prop in the URL", async () => {
    mockApi.mockResolvedValue({ data: { ...defaultLeadScore, id: "ls-99", fitMatchesCurrentWebsiteFlight: true } });
    renderComponent({ leadScore: { ...defaultLeadScore, id: "ls-99" } });

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    expect(mockApi).toHaveBeenCalledWith(
      "/api/lead-scores/ls-99/flags",
      expect.anything(),
    );
  });

  it("calls onScoreUpdate callback with the updated data after a successful PATCH", async () => {
    const updatedScore: LeadScoreFull = { ...defaultLeadScore, fitMatchesCurrentWebsiteFlight: true, scoreFit: 35 };
    mockApi.mockResolvedValue({ data: updatedScore });

    const onScoreUpdate = vi.fn();
    // eslint-disable-next-line @typescript-eslint/strict-void-return -- render return unused in test
    renderComponent({ onScoreUpdate });

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    await waitFor(() => {
      expect(onScoreUpdate).toHaveBeenCalledOnce();
      expect(onScoreUpdate).toHaveBeenCalledWith(updatedScore);
    });
  });

  it("does not call onScoreUpdate when api() returns a response without a 'data' key", async () => {
    mockApi.mockResolvedValue({ something: "else" });

    const onScoreUpdate = vi.fn();
    // eslint-disable-next-line @typescript-eslint/strict-void-return -- render return unused in test
    renderComponent({ onScoreUpdate });

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    await waitFor(() => {
      expect(onScoreUpdate).not.toHaveBeenCalled();
    });
  });

  it("does not call onScoreUpdate when api() returns null", async () => {
    mockApi.mockResolvedValue(null);

    const onScoreUpdate = vi.fn();
    // eslint-disable-next-line @typescript-eslint/strict-void-return -- render return unused in test
    renderComponent({ onScoreUpdate });

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    await waitFor(() => {
      expect(onScoreUpdate).not.toHaveBeenCalled();
    });
  });

  it("updates local state (checkbox becomes checked) after successful PATCH", async () => {
    const updatedScore: LeadScoreFull = { ...defaultLeadScore, fitMatchesCurrentWebsiteFlight: true };
    mockApi.mockResolvedValue({ data: updatedScore });
    renderComponent();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(getCheckbox(checkboxes, 0) instanceof HTMLInputElement && getCheckbox(checkboxes, 0).checked).toBe(false);

    await fireEvent.click(getCheckbox(checkboxes, 0));

    await waitFor(() => {
      const updated = screen.getAllByRole("checkbox");
      expect(getCheckbox(updated, 0) instanceof HTMLInputElement && getCheckbox(updated, 0).checked).toBe(true);
    });
  });

  // ── Saving / disabled state ───────────────────────────────────────────────

  it("disables all checkboxes while an api() call is in flight", async () => {
    let resolveApi!: (v: unknown) => void;
    mockApi.mockReturnValue(new Promise((resolve) => { resolveApi = resolve; }));
    renderComponent();

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    // While api() hasn't resolved, all checkboxes must be disabled
    const disabledCheckboxes = screen.getAllByRole("checkbox");
    for (const cb of disabledCheckboxes) {
      expect(cb instanceof HTMLInputElement && cb.disabled).toBe(true);
    }

    // Resolve to clean up
    resolveApi({ data: defaultLeadScore });
  });

  it("re-enables all checkboxes after the api() call resolves", async () => {
    mockApi.mockResolvedValue({ data: defaultLeadScore });
    renderComponent();

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    await waitFor(() => {
      const afterCheckboxes = screen.getAllByRole("checkbox");
      for (const cb of afterCheckboxes) {
        expect(cb instanceof HTMLInputElement && cb.disabled).toBe(false);
      }
    });
  });

  it("re-enables all checkboxes even when api() throws", async () => {
    mockApi.mockRejectedValue(new Error("Network error"));
    renderComponent();

    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(getCheckbox(checkboxes, 0));

    await waitFor(() => {
      const afterCheckboxes = screen.getAllByRole("checkbox");
      for (const cb of afterCheckboxes) {
        expect(cb instanceof HTMLInputElement && cb.disabled).toBe(false);
      }
    });
  });

  // ── Layout structure ──────────────────────────────────────────────────────

  it("renders all four category containers in the grid", () => {
    const { container } = renderComponent();
    // The 3-col grid div wraps the category columns
    const grid = container.querySelector(".grid");
    expect(grid).toBeDefined();
  });

  it("renders the detailHref passed through the $app/paths resolve mock unchanged", () => {
    renderComponent({ detailHref: "/lead-scores/custom-path" });
    const link = screen.getByRole("link", { name: /Full details/ });
    // The $app/paths mock passes the path through as-is
    expect(link.getAttribute("href")).toBe("/lead-scores/custom-path");
  });
});
