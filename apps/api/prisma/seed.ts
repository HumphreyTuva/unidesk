import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/password';

const db = new PrismaClient();

async function main() {
  const ku = await db.university.upsert({
    where: { slug: 'ku' },
    update: {},
    create: { slug: 'ku', name: 'Kenyatta University' },
  });

  // Starting values only. The admin changes these in the admin area.
  const defaults: Record<string, string> = {
    payments_enabled: 'false', // while false, students are never shown anything about payment
    paper_price: '20', // KES per paper download (confirmed by the owner)
    listing_fee: '200', // KES per marketplace listing (placeholder)
    listing_days: '30',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // Starting Quick Links (the admin can add or remove more). Only added when the list is empty, so re-seeding never duplicates them.
  if ((await db.quickLink.count({ where: { universityId: ku.id } })) === 0) {
    await db.quickLink.createMany({
      data: [
        { universityId: ku.id, title: 'Student Online Services', url: 'https://studentonlineservices.ku.ac.ke', position: 1 },
        { universityId: ku.id, title: 'Hostel application', url: 'https://hostel.ku.ac.ke', position: 2 },
      ],
    });
  }

  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  if (email && password.length >= 10) {
    await db.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: { email, emailVerified: true, role: 'ADMIN', universityId: ku.id, name: 'Admin', passwordHash: await hashPassword(password) },
    });
    console.log('Seeded admin account for', email);
  } else {
    console.log('No admin seeded (set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of 10+ characters, or sign in with Google using an email in ADMIN_EMAILS).');
  }
}

main().finally(() => db.$disconnect());
