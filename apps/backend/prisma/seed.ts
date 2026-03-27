/**
 * OmoHealth – Dev Seed
 * Creates realistic test data for verifying the clinic claim submission flow.
 *
 * Run:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hackathon_db?schema=public" \
 *   npx ts-node -r tsconfig-paths/register prisma/seed.ts
 */
import { PrismaClient, UserRole, MemberStatus, PlanTier } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/hackathon_db?schema=public';

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱  Seeding OmoHealth dev data…\n');

  // ── 1. Iyaloja users ──────────────────────────────────────────────────────
  const iyaloja1 = await prisma.user.upsert({
    where: { phone: '+2348030000001' },
    update: {},
    create: { phone: '+2348030000001', role: UserRole.IYALOJA },
  });

  const iyaloja2 = await prisma.user.upsert({
    where: { phone: '+2348030000002' },
    update: {},
    create: { phone: '+2348030000002', role: UserRole.IYALOJA },
  });

  // ── 2. Associations ───────────────────────────────────────────────────────
  const assoc1 = await prisma.association.upsert({
    where: { userId: iyaloja1.id },
    update: { poolBalance: 500_000 },
    create: {
      userId: iyaloja1.id,
      name: 'Lagos Market Traders Union',
      plan: PlanTier.SILVER,
      monthlyDues: 4_000,
      coverageLimit: 150_000,
      poolBalance: 500_000, // ₦500k pool — plenty for test claims
    },
  });

  const assoc2 = await prisma.association.upsert({
    where: { userId: iyaloja2.id },
    update: { poolBalance: 300_000 },
    create: {
      userId: iyaloja2.id,
      name: 'Abuja Artisans Cooperative',
      plan: PlanTier.GOLD,
      monthlyDues: 8_000,
      coverageLimit: 300_000,
      poolBalance: 300_000,
    },
  });

  // ── 3. Members ────────────────────────────────────────────────────────────
  //  Phone numbers are stored as E.164 in the DB (toE164 normalises them on write).
  //  We seed in E.164 so the lookup endpoint matches.
  const membersData = [
    // Assoc 1 – SILVER plan
    {
      bvn: '22200000001',
      phone: '+2348011111111',
      name: 'Adaeze Okonkwo',
      associationId: assoc1.id,
      status: MemberStatus.ACTIVE,
      coverageUsedThisYear: 0,
    },
    {
      bvn: '22200000002',
      phone: '+2348022222222',
      name: 'Emeka Eze',
      associationId: assoc1.id,
      status: MemberStatus.ACTIVE,
      coverageUsedThisYear: 50_000, // ₦50k already used — still has ₦100k left
    },
    {
      bvn: '22200000003',
      phone: '+2348033333333',
      name: 'Fatima Musa',
      associationId: assoc1.id,
      status: MemberStatus.ACTIVE,
      coverageUsedThisYear: 150_000, // FULLY exhausted — claim should be rejected
    },
    // Assoc 2 – GOLD plan
    {
      bvn: '22200000004',
      phone: '+2348044444444',
      name: 'Taiwo Adeleke',
      associationId: assoc2.id,
      status: MemberStatus.ACTIVE,
      coverageUsedThisYear: 0,
    },
    {
      bvn: '22200000005',
      phone: '+2348055555555',
      name: 'Ngozi Chukwu',
      associationId: assoc2.id,
      status: MemberStatus.PAUSED, // PAUSED — claim should be blocked
    },
  ];

  for (const m of membersData) {
    await prisma.member.upsert({
      where: {
        associationId_bvn: { associationId: m.associationId, bvn: m.bvn },
      },
      update: {},
      create: m,
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('✅  Associations:');
  console.log(`   [SILVER] ${assoc1.name}  — pool: ₦500,000`);
  console.log(`   [GOLD]   ${assoc2.name} — pool: ₦300,000\n`);

  console.log('✅  Members (lookup by phone in the clinic portal):');
  console.log(
    '   08011111111 — Adaeze Okonkwo  (ACTIVE, ₦0 used, ₦150k remaining)  → claim should pass',
  );
  console.log(
    '   08022222222 — Emeka Eze        (ACTIVE, ₦50k used, ₦100k remaining) → claim should pass',
  );
  console.log(
    '   08033333333 — Fatima Musa      (ACTIVE, ₦150k used, ₦0 remaining)  → claim BLOCKED (exhausted)',
  );
  console.log(
    '   08044444444 — Taiwo Adeleke    (ACTIVE, ₦0 used, ₦300k remaining)  → claim should pass',
  );
  console.log(
    '   08055555555 — Ngozi Chukwu     (PAUSED)                            → claim BLOCKED (paused)\n',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
