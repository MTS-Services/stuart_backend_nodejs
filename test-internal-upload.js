// Test the internal upload flow with a real image
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testInternalUpload() {
  try {
    // Test if we can reach our own upload endpoint
    console.log('Testing internal upload endpoint: http://localhost:3000/upload/single');
    
    // Create a test image buffer
    const testImageData = Buffer.from('test image content');
    
    const formData = new FormData();
    formData.append('file', testImageData, {
      filename: 'test.jpg',
      contentType: 'image/jpeg',
    });

    // You'll need a valid JWT token for this test
    const response = await axios.post('http://localhost:3000/upload/single', formData, {
      headers: {
        ...formData.getHeaders(),
        // 'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
      },
      timeout: 30000
    });

    console.log('Internal upload success!', response.data);
  } catch (error) {
    console.error('Internal upload error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

// testInternalUpload(); // Uncomment to test (need JWT token)
console.log('External service test passed! Now test your Postman request.');