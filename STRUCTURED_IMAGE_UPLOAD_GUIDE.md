# 📸 Structured Image Upload Implementation

## ✅ **What I've Implemented**

You can now upload structured image files directly from the frontend like this:

### **Frontend Form Data Structure:**
```javascript
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('userId', '1');
// ... other profile fields ...

// Structured image uploads
formData.append('face', faceImageFile);          // Single file
formData.append('fullbody', fullbodyImageFile);  // Single file
formData.append('toothyGrin', smileImageFile);   // Single file
formData.append('extras', extraFile1);           // Multiple files
formData.append('extras', extraFile2);
formData.append('extras', extraFile3);

// Optional: Also supports traditional image uploads
formData.append('image', regularImageFile1);
formData.append('image', regularImageFile2);
```

### **Backend Processing:**
1. **Uploads all files** to storage (using existing ImageUploadService)
2. **Creates structured JSON** from uploaded file URLs
3. **Stores both formats** in database:
   - `image` array: All image URLs for backwards compatibility
   - `images` JSON: Structured format with face, fullbody, toothyGrin, extras

### **Database Storage:**
```json
{
  "image": [
    "https://storage.com/face.jpg",
    "https://storage.com/fullbody.jpg", 
    "https://storage.com/smile.jpg",
    "https://storage.com/extra1.jpg",
    "https://storage.com/extra2.jpg"
  ],
  "images": {
    "face": "https://storage.com/face.jpg",
    "fullbody": "https://storage.com/fullbody.jpg",
    "toothyGrin": "https://storage.com/smile.jpg",
    "extras": {
      "1": "https://storage.com/extra1.jpg",
      "2": "https://storage.com/extra2.jpg"
    }
  }
}
```

## 🔧 **Updated Controller File Fields**

```typescript
const FILE_FIELDS = [
  { name: 'image', maxCount: 13 },      // Original consolidated field
  { name: 'face', maxCount: 1 },        // Face image file
  { name: 'fullbody', maxCount: 1 },    // Fullbody image file  
  { name: 'toothyGrin', maxCount: 1 },  // Toothy grin image file
  { name: 'extras', maxCount: 10 },     // Extra images (max 10)
];
```

## 📡 **API Endpoints**

### **POST /profile** - Create Profile
```javascript
// Multipart form-data with structured files
POST {{base_url}}/profile
Content-Type: multipart/form-data

face: [image file]
fullbody: [image file] 
toothyGrin: [image file]
extras: [image file 1]
extras: [image file 2]
extras: [image file 3]
// + other profile fields
```

### **PUT /profile** - Update Profile
```javascript
// Same structure as POST, supports merge/replace modes
PUT {{base_url}}/profile
Content-Type: multipart/form-data

imageUpdateMode: "merge" // or "replace"
face: [new image file]
extras: [additional image file]
```

## 📥 **Response Format**

When you GET a profile, you'll receive:

```json
{
  "id": 1,
  "userId": 1,
  "email": "user@example.com",
  
  // Original format (for backwards compatibility)
  "images": [
    {"url": "https://storage.com/face.jpg"},
    {"url": "https://storage.com/fullbody.jpg"},
    {"url": "https://storage.com/smile.jpg"},
    {"url": "https://storage.com/extra1.jpg"}
  ],
  
  // Raw URL array
  "imageUrls": [
    "https://storage.com/face.jpg",
    "https://storage.com/fullbody.jpg",
    "https://storage.com/smile.jpg", 
    "https://storage.com/extra1.jpg"
  ],
  
  // NEW: Structured format
  "imagesJson": {
    "face": "https://storage.com/face.jpg",
    "fullbody": "https://storage.com/fullbody.jpg",
    "toothyGrin": "https://storage.com/smile.jpg",
    "extras": {
      "1": "https://storage.com/extra1.jpg"
    }
  },
  
  "photoCount": 4,
  "isComplete": true
  // ... other fields
}
```

## 🔄 **Update Modes**

### **Merge Mode (Default)**
- New structured files are **added** to existing images
- Existing `face` gets **replaced** if new face file uploaded
- New `extras` get **added** with next available keys ("4", "5", etc.)

### **Replace Mode**
- All existing images are **removed**
- Only new uploaded files are kept
- Complete replacement of both image array and JSON structure

## ⚡ **Smart Processing**

1. **Mixed Uploads**: Supports both structured (`face`, `fullbody`, etc.) and regular (`image`) uploads in same request
2. **Automatic JSON Generation**: Creates structured JSON from uploaded files automatically
3. **Backwards Compatibility**: Still supports original `image` array approach
4. **Validation**: Ensures 3-13 total images across all upload methods
5. **Deduplication**: Prevents same URL from appearing twice in image array

## 📝 **Example Frontend Code**

### React with File Upload
```javascript
const handleStructuredUpload = async (formData) => {
  // Add structured files
  if (faceFile) formData.append('face', faceFile);
  if (fullbodyFile) formData.append('fullbody', fullbodyFile);
  if (smileFile) formData.append('toothyGrin', smileFile);
  
  // Add multiple extras
  extraFiles.forEach(file => {
    formData.append('extras', file);
  });
  
  // Send to backend
  const response = await fetch('/profile', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log('Structured images:', result.imagesJson);
};
```

### Vue.js with Axios
```javascript
const uploadStructuredImages = async () => {
  const formData = new FormData();
  formData.append('email', userEmail);
  
  // Structured uploads
  formData.append('face', faceFile.value);
  formData.append('fullbody', fullbodyFile.value);
  
  extraFiles.value.forEach(file => {
    formData.append('extras', file);
  });
  
  try {
    const response = await axios.put('/profile', formData);
    imagesJson.value = response.data.imagesJson;
  } catch (error) {
    console.error('Upload failed:', error.response.data);
  }
};
```

## 🎯 **Key Benefits**

✅ **Frontend Simplicity**: Send files directly with meaningful field names  
✅ **Automatic Organization**: Backend creates structured JSON automatically  
✅ **Flexible Updates**: Merge or replace modes for different use cases  
✅ **Backwards Compatibility**: Existing code continues to work  
✅ **Type Safety**: Clear separation between face, fullbody, smile, and extras  
✅ **Scalable Extras**: Support for unlimited categorized extra images  

This implementation gives you the best of both worlds - simple file uploads from frontend with organized storage in the backend! 🚀