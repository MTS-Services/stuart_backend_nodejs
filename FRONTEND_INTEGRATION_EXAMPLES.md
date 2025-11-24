# Images JSON Field - Frontend Integration Examples

## Frontend Form Data Example (JavaScript)

```javascript
// How to send structured files from frontend
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('age', '25');

// Add structured image files
if (faceFile) formData.append('face', faceFile);
if (fullbodyFile) formData.append('fullbody', fullbodyFile);
if (toothyGrinFile) formData.append('toothyGrin', toothyGrinFile);

// Add multiple extra files
extraFiles.forEach(file => {
  formData.append('extras', file);
});

// Set update mode (for updates only)
formData.append('imageUpdateMode', 'merge'); // or 'replace'

fetch('/profile/create-with-structured-files', {
  method: 'POST',
  body: formData
});
```

## React Component Example

```jsx
// React component example
import React, { useState } from 'react';

const ProfileUpload = () => {
  const [files, setFiles] = useState({
    face: null,
    fullbody: null,
    toothyGrin: null,
    extras: []
  });
  const [email, setEmail] = useState('');

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('email', email);
    
    if (files.face) formData.append('face', files.face);
    if (files.fullbody) formData.append('fullbody', files.fullbody);
    if (files.toothyGrin) formData.append('toothyGrin', files.toothyGrin);
    
    files.extras.forEach(file => {
      formData.append('extras', file);
    });
    
    const response = await fetch('/profile/create-with-structured-files', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Profile created:', result);
  };

  return (
    <form>
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => setFiles({...files, face: e.target.files[0]})}
        placeholder="Face Image"
      />
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => setFiles({...files, fullbody: e.target.files[0]})}
        placeholder="Full Body Image"
      />
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => setFiles({...files, toothyGrin: e.target.files[0]})}
        placeholder="Toothy Grin Image"
      />
      <input 
        type="file" 
        accept="image/*"
        multiple
        onChange={(e) => setFiles({...files, extras: Array.from(e.target.files)})}
        placeholder="Extra Images"
      />
      <button type="button" onClick={handleSubmit}>Create Profile</button>
    </form>
  );
};

export default ProfileUpload;
```

## Database Examples

### Prisma Create Query

```javascript
await prisma.profile.create({
  data: {
    userId: 1,
    email: 'user@example.com',
    image: ['url1', 'url2', 'url3'],
    images: {
      face: 'https://cloudinary.com/face.jpg',
      fullbody: 'https://cloudinary.com/fullbody.jpg',
      toothyGrin: null,
      extras: {
        hobby: 'https://cloudinary.com/hobby.jpg'
      }
    }
  }
});
```

### Prisma Update Query

```javascript
await prisma.profile.update({
  where: { userId: 1 },
  data: {
    images: {
      face: 'https://cloudinary.com/new_face.jpg',
      fullbody: 'https://cloudinary.com/fullbody.jpg',
      toothyGrin: 'https://cloudinary.com/smile.jpg',
      extras: {
        vacation: 'https://cloudinary.com/vacation.jpg',
        pet: 'https://cloudinary.com/pet.jpg'
      }
    }
  }
});
```

### Prisma Read Query

```javascript
const profile = await prisma.profile.findUnique({
  where: { userId: 1 },
  select: {
    image: true,
    images: true
  }
});

console.log('Regular images:', profile.image);
console.log('Structured images:', profile.images);
```

## Vue.js Example

```vue
<template>
  <div>
    <form @submit.prevent="uploadProfile">
      <input type="file" ref="faceFile" @change="handleFaceFile" accept="image/*">
      <input type="file" ref="fullbodyFile" @change="handleFullbodyFile" accept="image/*">
      <input type="file" ref="toothyGrinFile" @change="handleToothyGrinFile" accept="image/*">
      <input type="file" ref="extraFiles" @change="handleExtraFiles" multiple accept="image/*">
      <button type="submit">Upload Profile</button>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      profileData: {
        face: null,
        fullbody: null,
        toothyGrin: null,
        extras: []
      }
    };
  },
  methods: {
    handleFaceFile(event) {
      this.profileData.face = event.target.files[0];
    },
    handleFullbodyFile(event) {
      this.profileData.fullbody = event.target.files[0];
    },
    handleToothyGrinFile(event) {
      this.profileData.toothyGrin = event.target.files[0];
    },
    handleExtraFiles(event) {
      this.profileData.extras = Array.from(event.target.files);
    },
    async uploadProfile() {
      const formData = new FormData();
      formData.append('email', 'user@example.com');
      
      if (this.profileData.face) formData.append('face', this.profileData.face);
      if (this.profileData.fullbody) formData.append('fullbody', this.profileData.fullbody);
      if (this.profileData.toothyGrin) formData.append('toothyGrin', this.profileData.toothyGrin);
      
      this.profileData.extras.forEach(file => {
        formData.append('extras', file);
      });
      
      try {
        const response = await fetch('/profile/create-with-structured-files', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        console.log('Profile uploaded:', result);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }
};
</script>
```

## Postman Testing

### Create Profile with Structured Files

1. **Method**: POST
2. **URL**: `{{baseUrl}}/profile/create-with-structured-files`
3. **Body**: form-data
   - `email`: user@example.com
   - `age`: 25
   - `face`: [select image file]
   - `fullbody`: [select image file]
   - `toothyGrin`: [select image file]
   - `extras`: [select multiple image files]

### Update Profile with Merge Mode

1. **Method**: PUT
2. **URL**: `{{baseUrl}}/profile/update-with-structured-files`
3. **Body**: form-data
   - `email`: user@example.com
   - `imageUpdateMode`: merge
   - `face`: [select new image file]
   - `extras`: [select additional image files]

### Update Profile with Replace Mode

1. **Method**: PUT
2. **URL**: `{{baseUrl}}/profile/update-with-structured-files`
3. **Body**: form-data
   - `email`: user@example.com
   - `imageUpdateMode`: replace
   - `face`: [select image file]
   - `fullbody`: [select image file]
   - `toothyGrin`: [select image file]