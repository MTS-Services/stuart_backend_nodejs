// Quick test script to check the external upload service
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    // Create a simple test file
    const testData = 'test image data';
    const testBuffer = Buffer.from(testData);
    
    const formData = new FormData();
    formData.append('image', testBuffer, {
      filename: 'test.jpg',
      contentType: 'image/jpeg',
    });

    console.log('Testing upload to: https://img.mtscorporate.com/upload-single');
    
    const response = await axios.post('https://img.mtscorporate.com/upload-single', formData, {
      headers: formData.getHeaders(),
      timeout: 10000
    });

    console.log('Success!', response.data);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
  }
}

testUpload();