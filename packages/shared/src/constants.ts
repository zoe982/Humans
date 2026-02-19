export const SESSION_COOKIE_NAME = "humans_session";
export const SESSION_TTL_SECONDS = 86400; // 24 hours
export const OAUTH_STATE_TTL_SECONDS = 600; // 10 minutes

export const ROLES = ["admin", "manager", "agent", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  agent: 1,
  manager: 2,
  admin: 3,
};

export const PERMISSIONS = {
  viewRecords: ["viewer", "agent", "manager", "admin"],
  createEditRecords: ["agent", "manager", "admin"],
  recordLeadEvents: ["agent", "manager", "admin"],
  viewReports: ["manager", "admin"],
  manageLeadSources: ["manager", "admin"],
  manageColleagues: ["admin"],
  viewAuditLog: ["admin"],
  manageHumans: ["agent", "manager", "admin"],
  viewRouteSignups: ["agent", "manager", "admin"],
  manageRouteSignups: ["manager", "admin"],
  deleteRouteSignups: ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const PET_BREEDS = [
  "Australian Shepherd",
  "Beagle",
  "Bernese Mountain Dog",
  "Bichon Frisé",
  "Border Collie",
  "Boxer",
  "Canaan Dog",
  "Cavalier King Charles Spaniel",
  "Cavapoo",
  "Chihuahua",
  "Cocker Spaniel",
  "Cockapoo",
  "Dachshund",
  "English Bulldog",
  "French Bulldog",
  "German Shepherd",
  "Golden Retriever",
  "Goldendoodle",
  "Greyhound",
  "Jack Russell Terrier",
  "Labrador",
  "Labradoodle",
  "Maltese",
  "Miniature Schnauzer",
  "Pomeranian",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Shih Tzu",
  "Siberian Husky",
  "Staffordshire Bull Terrier",
  "Whippet",
  "Yorkshire Terrier",
  "Mixed Breed",
  "Other",
] as const;

export type PetBreed = (typeof PET_BREEDS)[number];
