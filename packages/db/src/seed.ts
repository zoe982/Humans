import { createId } from "./id.js";

const now = new Date().toISOString();

const adminUser = {
  id: createId(),
  email: "zoe@marisco.org",
  name: "Zoe Marsico",
  avatarUrl: null,
  googleId: null,
  role: "admin" as const,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

console.log("Seed data for admin user:");
console.log(JSON.stringify(adminUser, null, 2));

// SQL for manual insertion via wrangler d1 execute
console.log("\nSQL INSERT:");
console.log(
  `INSERT INTO users (id, email, name, avatar_url, google_id, role, is_active, created_at, updated_at) VALUES ('${adminUser.id}', '${adminUser.email}', '${adminUser.name}', NULL, NULL, '${adminUser.role}', 1, '${adminUser.createdAt}', '${adminUser.updatedAt}');`,
);
