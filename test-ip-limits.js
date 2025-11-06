const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testIPScanLimits() {
  console.log('🧪 Testing IP-based QR Code Scan Limits');
  console.log('==========================================');
  
  try {
    // First, let's assume we have a QR code to test with
    // You can replace this with an actual QR code from your database
    const testQRCode = 'test-qr-code-uuid';
    const testIP = '192.168.1.100';
    
    console.log(`📱 QR Code: ${testQRCode}`);
    console.log(`🌐 Test IP: ${testIP}`);
    console.log();
    
    // Simulate multiple scans from the same IP
    for (let i = 1; i <= 7; i++) {
      console.log(`🔍 Scan attempt #${i}`);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/qr-cards/scan/${testQRCode}`, {
          scannerEmail: `test${i}@example.com`
        }, {
          headers: {
            'X-Forwarded-For': testIP,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          console.log(`✅ Scan #${i} successful`);
          console.log(`   Scans remaining: ${response.data.scansRemaining}`);
        } else {
          console.log(`❌ Scan #${i} failed: ${response.data.message}`);
          if (response.data.ipLimitReached) {
            console.log(`   IP limit reached: ${response.data.scansFromThisIP}/5 scans from this IP`);
          }
        }
      } catch (error) {
        if (error.response && error.response.data) {
          console.log(`❌ Scan #${i} failed: ${error.response.data.message}`);
        } else {
          console.log(`❌ Scan #${i} failed: ${error.message}`);
        }
      }
      
      console.log();
    }
    
    // Test with different IP
    console.log('🔄 Testing with different IP address...');
    const differentIP = '192.168.1.101';
    
    try {
      const response = await axios.post(`${API_BASE_URL}/qr-cards/scan/${testQRCode}`, {
        scannerEmail: 'different-ip@example.com'
      }, {
        headers: {
          'X-Forwarded-For': differentIP,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ Scan from different IP successful`);
        console.log(`   Total scans remaining on card: ${response.data.scansRemaining}`);
      } else {
        console.log(`❌ Scan from different IP failed: ${response.data.message}`);
      }
    } catch (error) {
      if (error.response && error.response.data) {
        console.log(`❌ Different IP scan failed: ${error.response.data.message}`);
      } else {
        console.log(`❌ Different IP scan failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Example of how limits work
console.log('📋 QR Code Scan Limits Overview:');
console.log('================================');
console.log('• Each QR card can be scanned up to 250 times total');
console.log('• Each IP address can scan the same card up to 5 times');
console.log('• After 5 scans from the same IP, that IP is blocked from scanning that specific card');
console.log('• Other IP addresses can still scan the card (up to their 5-scan limit)');
console.log('• Once the card reaches 250 total scans, no one can scan it anymore');
console.log();

if (require.main === module) {
  testIPScanLimits();
}

module.exports = { testIPScanLimits };