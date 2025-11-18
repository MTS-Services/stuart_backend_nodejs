const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPasswordReset() {
  try {
    console.log('🔍 Testing Password Reset Functionality\n');

    // Find a user to test with
    const testEmail = 'gemok98872@delaeb.com';
    
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { profile: true },
    });

    if (!user) {
      console.log(`❌ User not found with email: ${testEmail}`);
      console.log('\n📝 Available users:');
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true, status: true, password: true },
        take: 5,
      });
      console.table(allUsers);
      return;
    }

    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Has Password: ${!!user.password}`);
    console.log(`   Profile Status: ${user.profile?.status || 'No profile'}`);
    
    console.log('\n📧 Password Reset Flow:');
    console.log('   1. Admin approves registration → User receives password setup email');
    console.log(`   2. User visits: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password/${testEmail}`);
    console.log(`   3. User sets password via POST /auth/reset-password/${testEmail}`);
    console.log('   4. User can login via POST /auth/user/login');

    console.log('\n🔗 API Endpoints:');
    console.log(`   POST /auth/reset-password/${testEmail}`);
    console.log('   Body: { "email": "' + testEmail + '", "newPassword": "your-new-password" }');
    console.log('\n   POST /auth/set-password');
    console.log('   Body: { "email": "' + testEmail + '", "password": "your-new-password" }');
    console.log('\n   POST /auth/user/login');
    console.log('   Body: { "email": "' + testEmail + '", "password": "your-password" }');

    // Check if user is eligible to set password
    if (user.status === 'VERIFIED' || user.status === 'ACTIVE') {
      console.log('\n✅ User is VERIFIED/ACTIVE - can set password');
    } else {
      console.log(`\n⚠️  User status is ${user.status} - needs to be VERIFIED or ACTIVE to set password`);
      console.log('   Admin needs to approve the profile first');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordReset();
