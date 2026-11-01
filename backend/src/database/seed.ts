import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existingAdmin) {
    console.log('An admin account already exists; initial admin setup skipped.');
    return;
  }

  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD to create the first admin account.',
    );
  }
  if (password.length < 16) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 16 characters long.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(
    async (tx) => {
      const adminInTransaction = await tx.user.findFirst({ where: { role: 'ADMIN' } });
      if (adminInTransaction) {
        console.log('An admin account already exists; initial admin setup skipped.');
        return;
      }

      await tx.user.create({
        data: { name, email, password: passwordHash, role: 'ADMIN' },
      });
    },
    { isolationLevel: 'Serializable' },
  );

  console.log('Initial admin account created.');
}

main()
  .catch((error) => {
    console.error('Initial admin setup failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
