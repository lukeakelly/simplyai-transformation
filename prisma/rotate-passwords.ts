import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

// Must match verifyPassword() in src/lib/auth.ts.
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

// The standing team role accounts. Test/comment-only users created via the
// admin UI are left untouched (manage those in Admin tools → Users).
const ROTATE_USERNAMES = [
  "ceo",
  "coo",
  "cfo",
  "cro",
  "cto",
  "cino",
  "ctro",
  "viewer",
];

async function main() {
  const rows: {
    role: string;
    name: string;
    username: string;
    password: string;
    access: string;
  }[] = [];

  for (const username of ROTATE_USERNAMES) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.log(`! ${username} not found — skipped`);
      continue;
    }
    const password = genPassword();
    await prisma.user.update({
      where: { username },
      data: { passwordHash: hashPassword(password) },
    });
    rows.push({
      role: user.role,
      name: user.name || "",
      username,
      password,
      access: user.permission === "viewer" ? "read-only" : "editor",
    });
  }

  console.log("\n=== ROTATED CREDENTIALS (store securely — shown once) ===\n");
  for (const r of rows) {
    console.log(
      `${r.role.padEnd(8)} | ${r.name.padEnd(8)} | user: ${r.username.padEnd(8)} | pass: ${r.password.padEnd(14)} | ${r.access}`,
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
