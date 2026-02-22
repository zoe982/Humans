// @vitest-environment jsdom
// Detail pages use RecordManagementBar which renders <h1> with the record
// title. They also import createChangeHistoryLoader (a .svelte.ts rune-based
// module) and createAutoSaver. Neither makes synchronous network calls —
// loadHistory() fires inside a $effect (deferred after render), and the
// autoSaver only triggers on user interaction.
//
// jsdom is required here for the same reason as list-pages.test.ts:
// RecordManagementBar's breadcrumb chain is rendered by EntityListPage in
// some pages, and several sub-components use table elements that happy-dom
// strips when parsed inside <template> nodes.
//
// Smoke contract: each page renders without throwing, and the <h1> record
// heading is present in the DOM. Only the minimal data shape is supplied.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";

// ---------------------------------------------------------------------------
// Page components
// ---------------------------------------------------------------------------

import PetDetailPage from "../../src/routes/pets/[id]/+page.svelte";
import EmailDetailPage from "../../src/routes/emails/[id]/+page.svelte";
import PhoneDetailPage from "../../src/routes/phone-numbers/[id]/+page.svelte";
import ActivityDetailPage from "../../src/routes/activities/[id]/+page.svelte";
import GeoInterestDetailPage from "../../src/routes/geo-interests/[id]/+page.svelte";
import RouteInterestDetailPage from "../../src/routes/route-interests/[id]/+page.svelte";
import SocialIdDetailPage from "../../src/routes/social-ids/[id]/+page.svelte";
import AccountDetailPage from "../../src/routes/accounts/[id]/+page.svelte";

// ---------------------------------------------------------------------------
// Smoke tests — each page gets the minimal data shape for the primary record
// ---------------------------------------------------------------------------

describe("Detail page smoke tests", () => {
  it("Pet detail page renders without error", () => {
    render(PetDetailPage, {
      props: {
        data: {
          pet: {
            id: "pet-1",
            displayId: "PET-001",
            humanId: null,
            type: "dog",
            name: "Buddy",
            breed: null,
            weight: null,
            ownerName: null,
            ownerDisplayId: null,
          },
          allHumans: [],
        },
      },
    });
    // RecordManagementBar renders <h1>{displayId} — {name}</h1>
    expect(screen.getByRole("heading", { name: "PET-001 — Buddy" })).toBeDefined();
  });

  it("Email detail page renders without error", () => {
    render(EmailDetailPage, {
      props: {
        data: {
          email: {
            id: "email-1",
            displayId: "EML-001",
            ownerType: "human",
            ownerId: "human-1",
            email: "test@example.com",
            labelId: null,
            labelName: null,
            isPrimary: false,
            ownerName: null,
            ownerDisplayId: null,
          },
          humanEmailLabelConfigs: [],
          accountEmailLabelConfigs: [],
          allHumans: [],
          allAccounts: [],
        },
      },
    });
    // RecordManagementBar renders <h1>{displayId} — {email}</h1>
    expect(screen.getByRole("heading", { name: "EML-001 — test@example.com" })).toBeDefined();
  });

  it("Phone Number detail page renders without error", () => {
    render(PhoneDetailPage, {
      props: {
        data: {
          phone: {
            id: "phone-1",
            displayId: "PHN-001",
            ownerType: "human",
            ownerId: "human-1",
            phoneNumber: "+1-555-0100",
            labelId: null,
            labelName: null,
            hasWhatsapp: false,
            isPrimary: false,
            ownerName: null,
            ownerDisplayId: null,
          },
          humanPhoneLabelConfigs: [],
          accountPhoneLabelConfigs: [],
          allHumans: [],
          allAccounts: [],
        },
      },
    });
    // RecordManagementBar renders <h1>{displayId} — {phoneNumber}</h1>
    expect(screen.getByRole("heading", { name: "PHN-001 — +1-555-0100" })).toBeDefined();
  });

  it("Activity detail page renders without error", () => {
    render(ActivityDetailPage, {
      props: {
        data: {
          activity: {
            id: "act-1",
            displayId: "ACT-001",
            type: "email",
            subject: "Initial contact",
            notes: null,
            body: null,
            activityDate: "2025-01-15T10:00:00.000Z",
            humanId: null,
            humanName: null,
            accountId: null,
            accountName: null,
            routeSignupId: null,
            websiteBookingRequestId: null,
            geoInterestExpressions: [],
            routeInterestExpressions: [],
            colleagueId: null,
            createdAt: "2025-01-15T10:00:00.000Z",
            updatedAt: "2025-01-15T10:00:00.000Z",
          },
          humans: [],
          accounts: [],
          routeSignups: [],
          websiteBookingRequests: [],
          apiUrl: "http://localhost",
        },
        form: null,
      },
    });
    // RecordManagementBar renders <h1>{displayId} — {subject}</h1>
    expect(screen.getByRole("heading", { name: "ACT-001 — Initial contact" })).toBeDefined();
  });

  it("Geo Interest detail page renders without error", () => {
    render(GeoInterestDetailPage, {
      props: {
        data: {
          geoInterest: {
            id: "geo-1",
            city: "London",
            country: "UK",
            createdAt: "2025-01-15T10:00:00.000Z",
            expressions: [],
          },
          humans: [],
        },
        form: null,
      },
    });
    // RecordManagementBar renders <h1>{city}, {country}</h1>
    expect(screen.getByRole("heading", { name: "London, UK" })).toBeDefined();
  });

  it("Route Interest detail page renders without error", () => {
    render(RouteInterestDetailPage, {
      props: {
        data: {
          routeInterest: {
            id: "ri-1",
            displayId: "RI-001",
            originCity: "London",
            originCountry: "UK",
            destinationCity: "Paris",
            destinationCountry: "France",
            createdAt: "2025-01-15T10:00:00.000Z",
            expressions: [],
          },
          humans: [],
          reverseRoute: null,
        },
        form: null,
      },
    });
    // RecordManagementBar renders <h1>{originCity}, {originCountry} → {destinationCity}, {destinationCountry}</h1>
    expect(screen.getByRole("heading", { name: "London, UK → Paris, France" })).toBeDefined();
  });

  it("Social ID detail page renders without error", () => {
    render(SocialIdDetailPage, {
      props: {
        data: {
          socialId: {
            id: "sid-1",
            displayId: "SID-001",
            handle: "@testuser",
            platformId: null,
            platformName: null,
            humanId: null,
            humanName: null,
            accountId: null,
            accountName: null,
          },
          platformConfigs: [],
          allHumans: [],
          allAccounts: [],
        },
      },
    });
    // RecordManagementBar renders <h1>{displayId} — {handle}</h1>
    expect(screen.getByRole("heading", { name: "SID-001 — @testuser" })).toBeDefined();
  });

  it("Account detail page renders without error", () => {
    render(AccountDetailPage, {
      props: {
        data: {
          account: {
            id: "acc-1",
            displayId: "ACC-001",
            name: "Acme Corp",
            status: "active",
            types: [],
            emails: [],
            phoneNumbers: [],
            socialIds: [],
            linkedHumans: [],
            activities: [],
            humanActivities: [],
            createdAt: "2025-01-15T10:00:00.000Z",
            updatedAt: "2025-01-15T10:00:00.000Z",
          },
          typeConfigs: [],
          humanLabelConfigs: [],
          emailLabelConfigs: [],
          phoneLabelConfigs: [],
          allHumans: [],
          socialIdPlatformConfigs: [],
        },
        form: null,
      },
    });
    expect(screen.getByRole("heading", { name: /ACC-001/ })).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Structural enforcement — no detail page should use tabs
// ---------------------------------------------------------------------------

describe("Detail page structure enforcement", () => {
  const pages = [
    {
      name: "Account",
      component: AccountDetailPage,
      props: {
        data: {
          account: {
            id: "acc-1", displayId: "ACC-001", name: "Acme Corp", status: "active",
            types: [], emails: [], phoneNumbers: [], socialIds: [],
            linkedHumans: [], activities: [], humanActivities: [],
            createdAt: "2025-01-15T10:00:00.000Z", updatedAt: "2025-01-15T10:00:00.000Z",
          },
          typeConfigs: [], humanLabelConfigs: [], emailLabelConfigs: [],
          phoneLabelConfigs: [], allHumans: [], socialIdPlatformConfigs: [],
        },
        form: null,
      },
    },
    {
      name: "Pet",
      component: PetDetailPage,
      props: {
        data: {
          pet: { id: "pet-1", displayId: "PET-001", humanId: null, type: "dog", name: "Buddy", breed: null, weight: null, ownerName: null, ownerDisplayId: null },
          allHumans: [],
        },
      },
    },
    {
      name: "Activity",
      component: ActivityDetailPage,
      props: {
        data: {
          activity: {
            id: "act-1", displayId: "ACT-001", type: "email", subject: "Test", notes: null, body: null,
            activityDate: "2025-01-15T10:00:00.000Z", humanId: null, humanName: null,
            accountId: null, accountName: null, routeSignupId: null, websiteBookingRequestId: null,
            geoInterestExpressions: [], routeInterestExpressions: [],
            colleagueId: null, createdAt: "2025-01-15T10:00:00.000Z", updatedAt: "2025-01-15T10:00:00.000Z",
          },
          humans: [], accounts: [], routeSignups: [], websiteBookingRequests: [], apiUrl: "http://localhost",
        },
        form: null,
      },
    },
  ];

  for (const { name, component, props } of pages) {
    it(`${name} detail page does not use tabs (no role=tablist)`, () => {
      const { container } = render(component, { props });
      expect(container.querySelector('[role="tablist"]')).toBeNull();
    });
  }
});
