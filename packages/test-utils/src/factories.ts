import { createId, formatDisplayId, type DisplayIdPrefix } from "@humans/db";
import type { Role } from "@humans/shared";

const now = () => new Date().toISOString();

// Test display ID counter — call resetTestDisplayIdCounters() between tests
const testCounters: Record<string, number> = {};

export function nextTestDisplayId(prefix: DisplayIdPrefix): string {
  testCounters[prefix] = (testCounters[prefix] ?? 0) + 1;
  return formatDisplayId(prefix, testCounters[prefix]);
}

export function resetTestDisplayIdCounters() {
  for (const key of Object.keys(testCounters)) {
    delete testCounters[key];
  }
}

export function buildColleague(overrides: Partial<{
  id: string;
  displayId: string;
  email: string;
  firstName: string;
  middleNames: string | null;
  lastName: string;
  name: string;
  avatarUrl: string | null;
  googleId: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    displayId: nextTestDisplayId("COL"),
    email: `colleague-${createId()}@test.com`,
    firstName: "Test",
    middleNames: null,
    lastName: "Colleague",
    name: "Test Colleague",
    avatarUrl: null,
    googleId: null,
    role: "agent" as Role,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

/** @deprecated Use buildColleague instead */
export const buildUser = buildColleague;

export function buildPet(overrides: Partial<{
  id: string;
  displayId: string;
  humanId: string | null;
  name: string;
  breed: string | null;
  weight: number | null;
  age: number | null;
  specialNeeds: string | null;
  healthCertR2Key: string | null;
  vaccinationR2Key: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    displayId: nextTestDisplayId("PET"),
    humanId: createId(),
    name: "Buddy",
    breed: "Golden Retriever",
    weight: 30,
    age: 3,
    specialNeeds: null,
    healthCertR2Key: null,
    vaccinationR2Key: null,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildHuman(overrides: Partial<{
  id: string;
  displayId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  status: "open" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    displayId: nextTestDisplayId("HUM"),
    firstName: "Test",
    middleName: null,
    lastName: "Human",
    status: "open" as const,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildAccount(overrides: Partial<{
  id: string;
  displayId: string;
  name: string;
  status: "open" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    displayId: nextTestDisplayId("ACC"),
    name: `Account ${createId().slice(0, 6)}`,
    status: "open" as const,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildActivity(overrides: Partial<{
  id: string;
  displayId: string;
  type: string;
  subject: string;
  body: string | null;
  notes: string | null;
  activityDate: string;
  humanId: string | null;
  accountId: string | null;
  routeSignupId: string | null;
  gmailId: string | null;
  frontId: string | null;
  syncRunId: string | null;
  colleagueId: string | null;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    displayId: nextTestDisplayId("ACT"),
    type: "email",
    subject: "Test activity",
    body: null,
    notes: null,
    activityDate: ts,
    humanId: null,
    accountId: null,
    routeSignupId: null,
    gmailId: null,
    frontId: null,
    syncRunId: null,
    colleagueId: createId(),
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildGeoInterest(overrides: Partial<{
  id: string;
  displayId: string;
  city: string;
  country: string;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    displayId: nextTestDisplayId("GEO"),
    city: "London",
    country: "United Kingdom",
    createdAt: now(),
    ...overrides,
  };
}

export function buildGeoInterestExpression(overrides: Partial<{
  id: string;
  displayId: string;
  humanId: string;
  geoInterestId: string;
  activityId: string | null;
  notes: string | null;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    displayId: nextTestDisplayId("GEX"),
    humanId: createId(),
    geoInterestId: createId(),
    activityId: null,
    notes: null,
    createdAt: now(),
    ...overrides,
  };
}

export function buildEmail(overrides: Partial<{
  id: string;
  displayId: string;
  ownerType: "human" | "account";
  ownerId: string;
  email: string;
  labelId: string | null;
  isPrimary: boolean;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    displayId: nextTestDisplayId("EML"),
    ownerType: "human" as const,
    ownerId: createId(),
    email: `email-${createId()}@test.com`,
    labelId: null,
    isPrimary: false,
    createdAt: now(),
    ...overrides,
  };
}

export function buildPhoneNumber(overrides: Partial<{
  id: string;
  displayId: string;
  ownerType: "human" | "account";
  ownerId: string;
  phoneNumber: string;
  labelId: string | null;
  hasWhatsapp: boolean;
  isPrimary: boolean;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    displayId: nextTestDisplayId("FON"),
    ownerType: "human" as const,
    ownerId: createId(),
    phoneNumber: `+1${Math.floor(Math.random() * 9000000000 + 1000000000).toString()}`,
    labelId: null,
    hasWhatsapp: false,
    isPrimary: false,
    createdAt: now(),
    ...overrides,
  };
}

export function buildLeadSource(overrides: Partial<{
  id: string;
  displayId: string;
  name: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    displayId: nextTestDisplayId("LES"),
    name: "Test Source",
    category: "organic",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildConfigItem(overrides: Partial<{
  id: string;
  name: string;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    name: "Default Label",
    createdAt: now(),
    ...overrides,
  };
}

export function buildLeadEvent(overrides: Partial<{
  id: string;
  displayId: string;
  humanId: string;
  eventType: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdByColleagueId: string | null;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    displayId: nextTestDisplayId("LED"),
    humanId: createId(),
    eventType: "inquiry",
    notes: null,
    metadata: null,
    createdByColleagueId: null,
    createdAt: now(),
    ...overrides,
  };
}
