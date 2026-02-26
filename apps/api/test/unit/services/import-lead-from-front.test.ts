import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestDb } from "../setup";
import * as schema from "@humans/db/schema";

// Mock frontFetch before importing the service
vi.mock("../../../src/services/front-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/services/front-sync")>();
  return {
    ...actual,
    frontFetch: vi.fn(),
  };
});

// Must import after vi.mock
import { importLeadFromFront } from "../../../src/services/general-leads";
import { frontFetch } from "../../../src/services/front-sync";

const mockFrontFetch = vi.mocked(frontFetch);

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
}

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1", email = "col1@test.com") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
    displayId: nextDisplayId("COL"),
    email,
    firstName: "Test",
    lastName: "User",
    name: "Test User",
    role: "admin",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

function buildConversation(overrides: Partial<{
  id: string;
  subject: string;
  recipient: { handle: string; name?: string };
}> = {}) {
  return {
    id: overrides.id ?? "cnv_test1",
    subject: overrides.subject ?? "Test conversation",
    recipient: overrides.recipient ?? { handle: "john@example.com", name: "John Doe" },
    last_message: { created_at: Date.now() / 1000 },
    _links: { related: { messages: { href: "https://api2.frontapp.com/conversations/cnv_test1/messages" } } },
  };
}

function buildMessage(overrides: Partial<{
  id: string;
  is_inbound: boolean;
  is_draft: boolean;
  created_at: number;
  blurb: string;
  body: string;
  text: string;
  type: string;
  author: { handle?: string; name?: string; email?: string; first_name?: string; last_name?: string };
  recipients: { handle: string; role: string; name?: string }[];
}> = {}) {
  return {
    id: overrides.id ?? "msg_test1",
    type: overrides.type ?? "email",
    is_inbound: overrides.is_inbound ?? true,
    is_draft: overrides.is_draft ?? false,
    created_at: overrides.created_at ?? Date.now() / 1000,
    blurb: overrides.blurb ?? "Test message",
    body: overrides.body ?? "<p>Test message</p>",
    text: overrides.text ?? "Test message",
    author: overrides.author,
    recipients: overrides.recipients ?? [{ handle: "john@example.com", role: "from", name: "John Doe" }],
  };
}

function buildPaginatedResponse<T>(results: T[]) {
  return {
    _results: results,
    _pagination: { next: null },
  };
}

beforeEach(() => {
  seedCounter = 0;
  mockFrontFetch.mockReset();
});

// ─── importLeadFromFront ──────────────────────────────────────────────

describe("importLeadFromFront", () => {
  it("imports a lead from a conversation ID with email contact", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = buildConversation();
    const messages = [buildMessage({ id: "msg_1" }), buildMessage({ id: "msg_2" })];

    // Mock: GET conversation
    mockFrontFetch.mockResolvedValueOnce(conversation);
    // Mock: GET messages (paginated)
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    expect(result.lead.displayId).toMatch(/^LEA-/);
    expect(result.activitiesImported).toBe(2);
    expect(result.contactHandle).toBe("john@example.com");
    expect(result.contactName).toBe("John Doe");

    // Verify lead was created with frontConversationId
    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
    expect(leads[0]!.frontConversationId).toBe("cnv_test1");
    expect(leads[0]!.firstName).toBe("John");
    expect(leads[0]!.lastName).toBe("Doe");

    // Verify email was linked
    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0]!.email).toBe("john@example.com");
    expect(emailRows[0]!.generalLeadId).toBe(leads[0]!.id);

    // Verify activities were created
    const activityRows = await db.select().from(schema.activities);
    expect(activityRows).toHaveLength(2);
    expect(activityRows[0]!.generalLeadId).toBe(leads[0]!.id);
    expect(activityRows[0]!.frontId).toBe("msg_1");
    expect(activityRows[0]!.frontConversationId).toBe("cnv_test1");
  });

  it("resolves a message ID to a conversation ID", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = buildConversation();
    const messages = [buildMessage()];

    // Mock: GET message → returns conversation_id
    mockFrontFetch.mockResolvedValueOnce({ conversation_id: "cnv_test1" });
    // Mock: GET conversation
    mockFrontFetch.mockResolvedValueOnce(conversation);
    // Mock: GET messages
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "msg_abc123", "fake-token", "col-1");

    expect(result.lead.displayId).toMatch(/^LEA-/);
    // Verify first call was to resolve the message
    expect(mockFrontFetch).toHaveBeenCalledWith(
      "https://api2.frontapp.com/messages/msg_abc123",
      "fake-token",
    );
  });

  it("rejects invalid ID format", async () => {
    const db = getTestDb();
    await seedColleague(db);

    await expect(
      importLeadFromFront(db, "invalid_123", "fake-token", "col-1"),
    ).rejects.toThrowError(/Invalid Front ID format/);
  });

  it("detects duplicate conversation and returns error with existing lead displayId", async () => {
    const db = getTestDb();
    await seedColleague(db);

    // Seed existing lead with frontConversationId
    const ts = now();
    await db.insert(schema.generalLeads).values({
      id: "lead-existing",
      displayId: "LEA-AAA-001",
      status: "open",
      firstName: "Existing",
      lastName: "Lead",
      frontConversationId: "cnv_test1",
      createdAt: ts,
      updatedAt: ts,
    });

    const conversation = buildConversation();
    // Mock: GET conversation (to resolve cnv_xxx → get conversation)
    mockFrontFetch.mockResolvedValueOnce(conversation);

    await expect(
      importLeadFromFront(db, "cnv_test1", "fake-token", "col-1"),
    ).rejects.toThrowError(/already imported.*LEA-AAA-001/i);
  });

  it("handles phone number contact", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = buildConversation({
      recipient: { handle: "+1234567890", name: "Jane Smith" },
    });
    const messages = [buildMessage({
      id: "msg_1",
      type: "custom",
      recipients: [{ handle: "+1234567890", role: "from", name: "Jane Smith" }],
    })];

    mockFrontFetch.mockResolvedValueOnce(conversation);
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    expect(result.contactHandle).toBe("+1234567890");

    // Verify phone was linked (not email)
    const phoneRows = await db.select().from(schema.phones);
    expect(phoneRows).toHaveLength(1);
    expect(phoneRows[0]!.phoneNumber).toBe("+1234567890");
    expect(phoneRows[0]!.hasWhatsapp).toBe(true);

    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(0);
  });

  it("skips draft messages", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = buildConversation();
    const messages = [
      buildMessage({ id: "msg_1", is_draft: false }),
      buildMessage({ id: "msg_2", is_draft: true }),
    ];

    mockFrontFetch.mockResolvedValueOnce(conversation);
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    expect(result.activitiesImported).toBe(1);

    const activityRows = await db.select().from(schema.activities);
    expect(activityRows).toHaveLength(1);
    expect(activityRows[0]!.frontId).toBe("msg_1");
  });

  it("handles empty conversation (no messages)", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = buildConversation();
    mockFrontFetch.mockResolvedValueOnce(conversation);
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse([]));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    expect(result.activitiesImported).toBe(0);

    // Lead should still be created
    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
  });

  it("handles no recipient on conversation", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = { ...buildConversation(), recipient: undefined };
    mockFrontFetch.mockResolvedValueOnce(conversation);
    // Still need to mock messages response since impl fetches before checking contact
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse([]));

    await expect(
      importLeadFromFront(db, "cnv_test1", "fake-token", "col-1"),
    ).rejects.toThrowError(/no contact/i);
  });

  it("falls through to message recipients when conversation recipient is a colleague", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1", "colleague@company.com");

    const conversation = buildConversation({
      recipient: { handle: "colleague@company.com", name: "Colleague" },
    });
    const messages = [buildMessage({
      id: "msg_1",
      recipients: [
        { handle: "colleague@company.com", role: "from", name: "Colleague" },
        { handle: "external@client.com", role: "to", name: "External Client" },
      ],
    })];

    mockFrontFetch.mockResolvedValueOnce(conversation);
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    expect(result.contactHandle).toBe("external@client.com");
    expect(result.contactName).toBe("External Client");

    // The lead should use the external contact's name
    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.firstName).toBe("External");
    expect(leads[0]!.lastName).toBe("Client");
  });

  it("parses single-word name into firstName with empty lastName", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = buildConversation({
      recipient: { handle: "solo@example.com", name: "Madonna" },
    });
    const messages = [buildMessage({ id: "msg_1" })];

    mockFrontFetch.mockResolvedValueOnce(conversation);
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.firstName).toBe("Madonna");
    expect(leads[0]!.lastName).toBe("(unknown)");
    expect(result.contactName).toBe("Madonna");
  });

  it("uses handle as name when no name provided", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const conversation = buildConversation({
      recipient: { handle: "user@example.com" },
    });
    const messages = [buildMessage({ id: "msg_1" })];

    mockFrontFetch.mockResolvedValueOnce(conversation);
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    // When no name, use handle as firstName
    expect(leads[0]!.firstName).toBe("user@example.com");
    expect(leads[0]!.lastName).toBe("(unknown)");
    expect(result.contactHandle).toBe("user@example.com");
  });

  it("uses onConflictDoNothing for duplicate activity frontIds", async () => {
    const db = getTestDb();
    await seedColleague(db);

    // Pre-seed an activity with front_id
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-existing",
      displayId: "ACT-000001",
      type: "email",
      subject: "Existing",
      activityDate: ts,
      frontId: "msg_1",
      createdAt: ts,
      updatedAt: ts,
    });

    const conversation = buildConversation();
    const messages = [
      buildMessage({ id: "msg_1" }), // duplicate — should be skipped
      buildMessage({ id: "msg_2" }), // new — should be imported
    ];

    mockFrontFetch.mockResolvedValueOnce(conversation);
    mockFrontFetch.mockResolvedValueOnce(buildPaginatedResponse(messages));

    const result = await importLeadFromFront(db, "cnv_test1", "fake-token", "col-1");

    // Both messages attempted, but msg_1 silently skipped by onConflictDoNothing
    expect(result.activitiesImported).toBe(2);

    // Only 2 activities total (existing + new msg_2)
    const activityRows = await db.select().from(schema.activities);
    expect(activityRows).toHaveLength(2);
  });
});
