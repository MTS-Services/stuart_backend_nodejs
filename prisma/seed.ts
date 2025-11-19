import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hash the password once for all admins
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  // Admin users to create
  const adminUsers = [
    {
      email: 'cheryl.tenold@gmail.com',
      username: 'cheryl.tenold',
      name: 'Cheryl Tenold',
    },
    {
      email: 'stuart.draper@gmail.com',
      username: 'stuart.draper',
      name: 'Stuart Draper',
    },
    {
      email: 'shariarhosain1315@gmail.com',
      username: 'shariarhosain1315',
      name: 'Shariar Hosain',
    },
    {
      email: 'admin@example.com',
      username: 'admin',
      name: 'Admin User',
    },
  ];

  console.log('Creating admin users...');
  
  // Create all admin users in both Admin and User tables
  for (const adminData of adminUsers) {
    // Create in Admin table
    const admin = await prisma.admin.upsert({
      where: { email: adminData.email },
      update: {
        password: hashedPassword,
        isActive: true,
      },
      create: {
        email: adminData.email,
        username: adminData.username,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });
    console.log(`✓ Admin created/updated in Admin table: ${admin.email}`);

    // Create in User table with admin role
    const user = await prisma.user.upsert({
      where: { email: adminData.email },
      update: {
        password: hashedPassword,
        role: 'admin',
        status: 'ACTIVE',
        isApproved: true,
      },
      create: {
        email: adminData.email,
        name: adminData.name,
        password: hashedPassword,
        role: 'admin',
        status: 'ACTIVE',
        isApproved: true,
        paidSetupFee: true,
      },
    });
    console.log(`✓ Admin created/updated in User table: ${user.email}`);
  }

  console.log('\n✓ All admin users seeded successfully!');
  console.log('Password for all admins: Admin@123');
  console.log('\nAdmins created in both tables:');
  console.log('- cheryl.tenold@gmail.com');
  console.log('- stuart.draper@gmail.com');
  console.log('- shariarhosain1315@gmail.com');
  console.log('- admin@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });