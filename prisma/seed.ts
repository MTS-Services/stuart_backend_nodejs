import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@yourapp.com' },
    update: {},
    create: {
      email: 'admin@yourapp.com',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Default admin created:', admin);

  // Create a test user
  const testUserPassword = await bcrypt.hash('testuser123', 10);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password: testUserPassword,
      status: 'WAITLIST',
      paidSetupFee: false,
    },
  });

  console.log('Test user created:', testUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });