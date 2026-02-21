// @vitest-environment jsdom
// List pages use EntityListPage which renders <table>/<thead>/<tbody>/<tr>/<th>/<td>.
// happy-dom strips table elements when parsed inside <template> nodes, which breaks
// Svelte 5's $.from_html() template cache. jsdom parses table elements correctly.
//
// Smoke contract: each page renders without throwing, and the page title heading
// is present in the DOM. No items are passed so only the empty-state branch runs.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";

// ---------------------------------------------------------------------------
// Page components
// ---------------------------------------------------------------------------

import AccountsPage from "../../src/routes/accounts/+page.svelte";
import HumansPage from "../../src/routes/humans/+page.svelte";
import ActivitiesPage from "../../src/routes/activities/+page.svelte";
import PetsPage from "../../src/routes/pets/+page.svelte";
import EmailsPage from "../../src/routes/emails/+page.svelte";
import PhoneNumbersPage from "../../src/routes/phone-numbers/+page.svelte";
import GeoInterestsPage from "../../src/routes/geo-interests/+page.svelte";
import RouteInterestsPage from "../../src/routes/route-interests/+page.svelte";
import SocialIdsPage from "../../src/routes/social-ids/+page.svelte";

// ---------------------------------------------------------------------------
// Smoke tests — each page gets the minimal data shape with empty collections
// ---------------------------------------------------------------------------

describe("List page smoke tests", () => {
  it("Accounts page renders without error", () => {
    render(AccountsPage, {
      props: {
        data: { accounts: [], userRole: "agent" },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: "Accounts" })).toBeDefined();
  });

  it("Humans page renders without error", () => {
    render(HumansPage, {
      props: {
        data: {
          humans: [],
          userRole: "agent",
          q: "",
          page: 1,
          limit: 50,
          total: 0,
        },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: "Humans" })).toBeDefined();
  });

  it("Activities page renders without error", () => {
    render(ActivitiesPage, {
      props: {
        data: {
          activities: [],
          q: "",
          type: "",
          dateFrom: "",
          dateTo: "",
          page: 1,
          limit: 50,
          total: 0,
        },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: "Activities" })).toBeDefined();
  });

  it("Pets page renders without error", () => {
    render(PetsPage, {
      props: {
        data: { pets: [], userRole: "agent" },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: "Pets" })).toBeDefined();
  });

  it("Emails page renders without error", () => {
    render(EmailsPage, {
      props: {
        data: { emails: [] },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: "Emails" })).toBeDefined();
  });

  it("Phone Numbers page renders without error", () => {
    render(PhoneNumbersPage, {
      props: {
        data: { phoneNumbers: [] },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: "Phone Numbers" })).toBeDefined();
  });

  it("Geo Interests page renders without error", () => {
    render(GeoInterestsPage, {
      props: {
        data: { geoInterests: [], userRole: "agent" },
        form: null,
      },
    });
    // Title is "Geo-Interests" (hyphenated) — must match EntityListPage title prop exactly
    expect(screen.getByRole("heading", { name: "Geo-Interests" })).toBeDefined();
  });

  it("Route Interests page renders without error", () => {
    render(RouteInterestsPage, {
      props: {
        data: { routeInterests: [], expressions: [], userRole: "agent" },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: "Route Interests" })).toBeDefined();
  });

  it("Social IDs page renders without error", () => {
    render(SocialIdsPage, {
      props: {
        data: { socialIds: [] },
      },
    });
    // Title is "Social Media IDs" — must match EntityListPage title prop exactly
    expect(screen.getByRole("heading", { name: "Social Media IDs" })).toBeDefined();
  });
});
