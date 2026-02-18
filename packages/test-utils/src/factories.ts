import { createId } from "@humans/db";
import type { Role } from "@humans/shared";

const now = () => new Date().toISOString();

export function buildUser(overrides: Partial<{
  id: string;
  email: string;
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
    email: `user-${createId()}@test.com`,
    name: "Test User",
    avatarUrl: null,
    googleId: null,
    role: "agent" as Role,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

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
  assignedToUserId: string | null;
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
    assignedToUserId: null,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

export function buildPet(overrides: Partial<{
  id: string;
  clientId: string;
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
    clientId: createId(),
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
