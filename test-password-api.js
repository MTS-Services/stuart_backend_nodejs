// Test Password Reset API Endpoints
// This script simulates the password reset flow

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'gemok98872@delaeb.com';
const TEST_PASSWORD = 'TestPassword123!';

async function testPasswordReset() {
  console.log('🧪 Testing Password Reset Flow\n');

  try {
    // Test 1: Set Password
    console.log('📝 Test 1: Setting password for user...');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}\n`);

    const setPasswordResponse = await fetch(`${BASE_URL}/auth/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const setPasswordData = await setPasswordResponse.json();
    console.log('Response:', JSON.stringify(setPasswordData, null, 2));

    if (setPasswordData.success) {
      console.log('✅ Password set successfully!\n');
    } else {
      console.log('❌ Failed to set password\n');
      return;
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: User Login
    console.log('📝 Test 2: Logging in with new password...');
    const loginResponse = await fetch(`${BASE_URL}/auth/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Response:', JSON.stringify(loginData, null, 2));

    if (loginData.success && loginData.data.access_token) {
      console.log('\n✅ Login successful!');
      console.log(`   Access Token: ${loginData.data.access_token.substring(0, 50)}...`);
      console.log(`   User ID: ${loginData.data.user.id}`);
      console.log(`   User Status: ${loginData.data.user.status}\n`);
    } else {
      console.log('❌ Login failed\n');
    }

    // Test 3: Alternative endpoint (reset-password with email in URL)
    console.log('📝 Test 3: Testing alternative endpoint...');
    const altResetResponse = await fetch(`${BASE_URL}/auth/reset-password/${TEST_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        newPassword: 'AnotherPassword456!',
      }),
    });

    const altResetData = await altResetResponse.json();
    console.log('Response:', JSON.stringify(altResetData, null, 2));

    if (altResetData.success) {
      console.log('✅ Alternative endpoint working!\n');
    }

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('\n⚠️  Make sure the server is running:');
    console.error('   npm run start:dev');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running!');
    console.log('\nPlease start the server first:');
    console.log('   npm run start:dev');
    console.log('\nThen run this test again:');
    console.log('   node test-password-api.js');
    return;
  }

  await testPasswordReset();
})();
