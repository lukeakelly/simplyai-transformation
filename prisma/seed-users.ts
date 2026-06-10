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
  role: string;
  permission: "editor" | "viewer";
  isAdmin: boolean;
};

const ACCOUNTS: Account[] = [
  { username: "ceo", role: "CEO", permission: "editor", isAdmin: false },
  { username: "coo", role: "COO", permission: "editor", isAdmin: true },
  { username: "cfo", role: "CFO", permission: "editor", isAdmin: false },
  { username: "cro", role: "CRO", permission: "editor", isAdmin: false },
  { username: "cto", role: "CTO", permission: "editor", isAdmin: false },
  { username: "cino", role: "CInO", permission: "editor", isAdmin: false },
  { username: "ctro", role: "CTRO", permission: "editor", isAdmin: false },
  { username: "viewer", role: "Viewer", permission: "viewer", isAdmin: false },
];

async function main() {
  const rows: { username: string; role: string; password: string; access: string }[] =
    [];

  for (const acc of ACCOUNTS) {
    const existing = await prisma.user.findUnique({
      where: { username: acc.username },
    });

    if (existing) {
      // Keep existing password; only refresh role metadata.
      await prisma.user.update({
        where: { username: acc.username },
        data: {
          role: acc.role,
          permission: acc.permission,
          isAdmin: acc.isAdmin,
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
