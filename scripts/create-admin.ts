import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const [username, password, role] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <username> <password> [role]");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.error(`User "${username}" already exists.`);
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: role || "admin",
    },
  });

  console.log(`User "${user.username}" created with role "${user.role}" (id: ${user.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
