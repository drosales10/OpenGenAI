import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseSeedUsers() {
  const raw = process.env.USERS_SEED_JSON;
  if (!raw) {
    return [
      { email: process.env.INTERNAL_ADMIN_EMAIL || 'local-admin@open-generative.ai', display_name: process.env.INTERNAL_ADMIN_NAME || 'Local Admin', role: 'admin' },
      { email: 'operator@open-generative.ai', display_name: 'Operator', role: 'user' },
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function run() {
  const seedUsers = parseSeedUsers().filter((u) => u?.email);
  if (!seedUsers.length) {
    console.log('[seed-users] No users to seed.');
    return;
  }

  for (const user of seedUsers) {
    const role = String(user.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
    const email = String(user.email).trim().toLowerCase();
    const displayName = String(user.display_name || user.displayName || '').trim() || null;

    await prisma.user.upsert({
      where: { email },
      update: {
        displayName,
        role,
        updatedAt: new Date(),
      },
      create: {
        email,
        displayName,
        role,
      },
    });

    console.log(`[seed-users] upserted ${email} (${role})`);
  }
}

run()
  .catch((error) => {
    console.error('[seed-users] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
