import { createId } from "./id.js";

const now = new Date().toISOString();

const adminColleague = {
  id: createId(),
  email: "zoe@marsico.org",
  firstName: "Zoe",
  middleNames: null,
  lastName: "Marsico",
  name: "Zoe Marsico",
  avatarUrl: null,
  googleId: null,
  role: "admin" as const,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

console.log("Seed data for admin colleague:");
console.log(JSON.stringify(adminColleague, null, 2));

// SQL for manual insertion via wrangler d1 execute
console.log("\nSQL INSERT:");
console.log(
  `INSERT INTO colleagues (id, email, first_name, middle_names, last_name, name, avatar_url, google_id, role, is_active, created_at, updated_at) VALUES ('${adminColleague.id}', '${adminColleague.email}', '${adminColleague.firstName}', NULL, '${adminColleague.lastName}', '${adminColleague.name}', NULL, NULL, '${adminColleague.role}', 1, '${adminColleague.createdAt}', '${adminColleague.updatedAt}');`,
);
