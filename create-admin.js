const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create or update admin
    const admin = await prisma.admin.upsert({
      where: { email: 'admin@yourapp.com' },
      update: {
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
      create: {
        email: 'admin@yourapp.com',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });

    console.log('✅ Admin created successfully:', {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      isActive: admin.isActive
    });
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();