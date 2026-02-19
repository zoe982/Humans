import { createId } from "@humans/db";
import type { Role } from "@humans/shared";

const now = () => new Date().toISOString();

export function buildColleague(overrides: Partial<{
  id: string;
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

export function buildClient(overrides: Partial<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: Record<string, string> | null;
  status: "active" | "inactive" | "prospect";
  notes: string | null;
  leadSourceId: string | null;
  assignedToColleagueId: string | null;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    firstName: "Jane",
    lastName: "Doe",
    email: `client-${createId()}@test.com`,
    phone: null,
    address: null,
    status: "prospect" as const,
    notes: null,
    leadSourceId: null,
    assignedToColleagueId: null,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildPet(overrides: Partial<{
  id: string;
  clientId: string | null;
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
    clientId: null,
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
  name: string;
  status: "open" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    name: `Account ${createId().slice(0, 6)}`,
    status: "open" as const,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildActivity(overrides: Partial<{
  id: string;
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
  createdByColleagueId: string;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
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
    createdByColleagueId: createId(),
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildGeoInterest(overrides: Partial<{
  id: string;
  city: string;
  country: string;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    city: "London",
    country: "United Kingdom",
    createdAt: now(),
    ...overrides,
  };
}

export function buildEmail(overrides: Partial<{
  id: string;
  humanId: string;
  email: string;
  labelId: string | null;
  isPrimary: boolean;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    humanId: createId(),
    email: `email-${createId()}@test.com`,
    labelId: null,
    isPrimary: false,
    createdAt: now(),
    ...overrides,
  };
}

export function buildPhoneNumber(overrides: Partial<{
  id: string;
  humanId: string;
  phoneNumber: string;
  labelId: string | null;
  hasWhatsapp: boolean;
  isPrimary: boolean;
  createdAt: string;
}> = {}) {
  return {
    id: createId(),
    humanId: createId(),
    phoneNumber: `+1${Math.floor(Math.random() * 9000000000 + 1000000000).toString()}`,
    labelId: null,
    hasWhatsapp: false,
    isPrimary: false,
    createdAt: now(),
    ...overrides,
  };
}

export function buildFlight(overrides: Partial<{
  id: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  arrivalDate: string;
  airline: string;
  cabinClass: string | null;
  maxPets: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const ts = now();
  return {
    id: createId(),
    flightNumber: "PAV-001",
    departureAirport: "LAX",
    arrivalAirport: "JFK",
    departureDate: "2026-03-15T08:00:00.000Z",
    arrivalDate: "2026-03-15T16:00:00.000Z",
    airline: "Pet Air Valet",
    cabinClass: "cabin",
    maxPets: 4,
    status: "scheduled",
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}
