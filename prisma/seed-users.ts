import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

// Password hashing — must match verifyPassword() in src/lib/auth.ts.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Readable, unambiguous random password (no 0/O/1/l/I).
function genPassword(len = 12): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

type Account = {
  username: string;
  name: string;
  role: string;
  permission: "editor" | "viewer";
  isAdmin: boolean;
};

const ACCOUNTS: Account[] = [
  { username: "ceo", name: "Jason", role: "CEO", permission: "editor", isAdmin: false },
  { username: "superadmin", name: "Super Admin", role: "Super Admin", permission: "editor", isAdmin: true },
  { username: "coo", name: "Luke", role: "Resource Admin", permission: "editor", isAdmin: true },
  { username: "cfo", name: "Wayne", role: "CFO", permission: "editor", isAdmin: false },
  { username: "cro", name: "CRO", role: "CRO", permission: "editor", isAdmin: false },
  { username: "cto", name: "CTO", role: "CTO", permission: "editor", isAdmin: false },
  { username: "cino", name: "Gina", role: "CInO", permission: "editor", isAdmin: false },
  { username: "ctro", name: "Kylie", role: "CTRO", permission: "editor", isAdmin: false },
  { username: "viewer", name: "Reviewer", role: "Read Only", permission: "viewer", isAdmin: false },
];

async function main() {
  const rows: { username: string; role: string; password: string; access: string }[] =
    [];

  for (const acc of ACCOUNTS) {
    const existing = await prisma.user.findUnique({
      where: { username: acc.username },
    });

    if (existing) {
      // Keep existing password; only refresh role metadata. Backfill the
      // display name only when it is missing so admin edits are preserved.
      await prisma.user.update({
        where: { username: acc.username },
        data: {
          role: acc.role,
          permission: acc.permission,
          isAdmin: acc.isAdmin,
          ...(existing.name ? {} : { name: acc.name }),
        },
      });
      rows.push({
        username: acc.username,
        role: acc.role,
        password: "(unchanged — already existed)",
        access: acc.permission === "viewer" ? "read-only" : "editor",
      });
      continue;
    }

    const password = genPassword();
    await prisma.user.create({
      data: {
        username: acc.username,
        name: acc.name,
        passwordHash: hashPassword(password),
        role: acc.role,
        permission: acc.permission,
        isAdmin: acc.isAdmin,
      },
    });
    rows.push({
      username: acc.username,
      role: acc.role,
      password,
      access: acc.permission === "viewer" ? "read-only" : "editor",
    });
  }

  console.log("\n=== CREDENTIALS (store securely — passwords shown once) ===\n");
  for (const r of rows) {
    console.log(
      `${r.role.padEnd(8)} | user: ${r.username.padEnd(8)} | pass: ${r.password.padEnd(14)} | ${r.access}`,
    );
  }
  console.log("\n=== END CREDENTIALS ===\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
