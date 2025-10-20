const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestProfile() {
  try {
    // Find the user first
    const user = await prisma.user.findUnique({
      where: { email: 'qradmin@example.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Create a basic profile
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        age: 25,
        height: "5'8\"",
        bio: "Test profile for QR generation",
        location: "Test City",
        status: 'APPROVED' // Set as approved so QR generation works
      }
    });

    console.log('✅ Profile created successfully:', {
      id: profile.id,
      userId: profile.userId,
      status: profile.status
    });
  } catch (error) {
    console.error('❌ Error creating profile:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestProfile();