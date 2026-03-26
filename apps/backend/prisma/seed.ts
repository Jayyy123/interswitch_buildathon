import { PrismaClient, UserRole, PlanTier, MemberStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding OmoHealth database...');

  // ── Test Iyaloja ──────────────────────────────────────────────────────────
  const iyaloja = await prisma.user.upsert({
    where: { phone: '+2340000000001' },
    update: {},
    create: {
      phone: '+2340000000001',
      role: UserRole.IYALOJA,
    },
  });
  console.log('✅ Iyaloja user:', iyaloja.id);

  // ── Test Association (no real ISW wallet in seed — use placeholders) ──────
  const assoc = await prisma.association.upsert({
    where: { id: 'seed-assoc-0001-0000-000000000000' },
    update: {},
    create: {
      id: 'seed-assoc-0001-0000-000000000000',
      userId: iyaloja.id,
      name: 'Balogun Traders Association',
      plan: PlanTier.GOLD,
      monthlyDues: 5000,
      coverageLimit: 500000,
      poolBalance: 0,
      walletId: null,          // provisioned by ISW at runtime
      walletAccountNumber: null,
    },
  });
  console.log('✅ Association:', assoc.id);

  // ── Test Members ──────────────────────────────────────────────────────────
  const members = [
    { name: 'Kemi Adeyemi', phone: '08011111111', bvn: '11111111111' },
    { name: 'Tunde Okafor', phone: '08022222222', bvn: '22222222222' },
  ];

  for (const m of members) {
    const existing = await prisma.member.findFirst({
      where: { phone: m.phone, associationId: assoc.id },
    });
    if (!existing) {
      await prisma.member.create({
        data: {
          associationId: assoc.id,
          name: m.name,
          phone: m.phone,
          bvn: m.bvn,
          status: MemberStatus.ACTIVE,
          coverageUsedThisYear: 0,
          walletId: null,
          walletAccountNumber: null,
        },
      });
      console.log('✅ Member seeded:', m.name);
    } else {
      console.log('⏭  Member already exists:', m.name);
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log('──────────────────────────────────────────────');
  console.log('Test OTP login: POST /auth/send-otp { phone: "+2340000000001" }');
  console.log('Role: IYALOJA | Association ID:', assoc.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
