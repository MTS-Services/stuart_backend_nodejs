// Test script for the new images JSON field feature
// This script demonstrates how the new images field should be used

const testProfileData = {
  // Required fields
  email: "test@example.com",
  gmail: "test@gmail.com", 
  userId: 1,
  bodyType: "Athletic",
  county: "Test County",
  displayName: "Test User",
  phone: "+1234567890",
  
  // Optional fields
  age: 25,
  height: "5'10\"",
  bio: "Test bio that is longer than 10 characters",
  location: "Test City",
  
  // Required image array (minimum 3)
  image: [
    { url: "https://example.com/image1.jpg" },
    { url: "https://example.com/image2.jpg" },
    { url: "https://example.com/image3.jpg" }
  ],
  
  // NEW: Optional images JSON field
  images: {
    face: "https://example.com/face.jpg",
    fullbody: "https://example.com/fullbody.jpg", 
    toothyGrin: "https://example.com/smile.jpg",
    extras: {
      "1": "https://example.com/extra1.jpg",
      "2": "https://example.com/extra2.jpg",
      "casual": "https://example.com/casual.jpg",
      "formal": "https://example.com/formal.jpg"
    }
  }
};

const testUpdateData = {
  email: "test@example.com",
  
  // Update just the images JSON structure
  images: {
    face: "https://example.com/new_face.jpg",
    fullbody: "https://example.com/new_fullbody.jpg",
    toothyGrin: "https://example.com/new_smile.jpg",
    extras: {
      "1": "https://example.com/new_extra1.jpg",
      "2": "https://example.com/new_extra2.jpg",
      "3": "https://example.com/new_extra3.jpg",
      "workout": "https://example.com/workout.jpg"
    }
  }
};

console.log("=== NEW IMAGES FIELD FEATURE TEST ===");
console.log("\n1. Profile Creation with images JSON:");
console.log(JSON.stringify(testProfileData, null, 2));

console.log("\n2. Profile Update with images JSON:");
console.log(JSON.stringify(testUpdateData, null, 2));

console.log("\n3. Expected Response Format:");
console.log(`{
  "id": 1,
  "userId": 1,
  "email": "test@example.com",
  "age": 25,
  "height": "5'10\\"",
  "bio": "Test bio that is longer than 10 characters",
  "location": "Test City",
  "bodyType": "Athletic",
  "county": "Test County",
  "displayName": "Test User",
  "phone": "+1234567890",
  "gmail": "test@gmail.com",
  "images": [
    {"url": "https://example.com/image1.jpg"},
    {"url": "https://example.com/image2.jpg"},
    {"url": "https://example.com/image3.jpg"}
  ],
  "imageUrls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg", 
    "https://example.com/image3.jpg"
  ],
  "imagesJson": {
    "face": "https://example.com/face.jpg",
    "fullbody": "https://example.com/fullbody.jpg",
    "toothyGrin": "https://example.com/smile.jpg",
    "extras": {
      "1": "https://example.com/extra1.jpg",
      "2": "https://example.com/extra2.jpg",
      "casual": "https://example.com/casual.jpg",
      "formal": "https://example.com/formal.jpg"
    }
  },
  "status": "DRAFT",
  "photoCount": 3,
  "isComplete": true,
  "createdAt": "2024-11-24T...",
  "updatedAt": "2024-11-24T..."
}`);

console.log("\n=== API ENDPOINTS ===");
console.log("POST /profile - Create profile (with optional images JSON field)");
console.log("PUT /profile - Update profile (with optional images JSON field)"); 
console.log("GET /profile/:email - Get profile (includes imagesJson field)");
console.log("PUT /profile/:email/images/json - Update only the images JSON structure");

console.log("\n=== KEY FEATURES ===");
console.log("• images field is OPTIONAL when creating/updating profiles");
console.log("• If images JSON is not provided or empty, returns default structure:");
console.log("  { face: null, fullbody: null, toothyGrin: null, extras: {} }");
console.log("• extras field allows dynamic key-value pairs for additional images");
console.log("• Separate endpoint for updating just the images JSON structure");
console.log("• Backwards compatible with existing image array functionality");