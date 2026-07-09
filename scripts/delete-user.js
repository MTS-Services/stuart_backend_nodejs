const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error('Usage: node scripts/delete-user.js <email>');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, subscription: true, qrCards: true },
  });

  if (!user) {
    console.log('User not found:', email);
    return;
  }

  console.log('Found user:', {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
  });
  console.log(
    'Profile:',
    user.profile ? { id: user.profile.id, status: user.profile.status } : null,
  );
  console.log('QR cards:', user.qrCards.length);
  console.log(
    'Subscription:',
    user.subscription
      ? { id: user.subscription.id, status: user.subscription.status }
      : null,
  );

  const matches = await prisma.match.deleteMany({
    where: { OR: [{ userId: user.id }, { targetId: user.id }] },
  });
  console.log('Deleted matches:', matches.count);

  const scans = await prisma.scan.deleteMany({ where: { viewerId: user.id } });
  console.log('Deleted scans (as viewer):', scans.count);

  const payments = await prisma.payment.deleteMany({ where: { userId: user.id } });
  console.log('Deleted payments:', payments.count);

  await prisma.user.delete({ where: { id: user.id } });
  console.log('Deleted user and cascaded profile/qr cards/subscription');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
