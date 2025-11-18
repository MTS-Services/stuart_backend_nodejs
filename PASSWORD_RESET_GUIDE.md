# User Password Reset Flow - Implementation Guide

## Overview

When an admin approves a user's registration, the user automatically receives a password setup email and can then set their password to access their account.

---

## 🔄 Complete Flow

### 1. Admin Approves Registration

- Admin approves user's profile via admin panel
- System sends **two emails** to user:
  - ✅ Profile approval confirmation
  - ✅ Password setup instructions with link

### 2. User Receives Email

User gets an email with:

- Welcome message
- Password setup link: `https://scanmemaybe.com/auth/reset-password/{email}`
- Instructions on what they can do after setting password

### 3. User Sets Password

User can set their password using either endpoint:

**Option A: Reset Password by Email (URL parameter)**

```
POST /auth/reset-password/:email
```

Request Body:

```json
{
  "email": "gemok98872@delaeb.com",
  "newPassword": "SecurePassword123!"
}
```

**Option B: Set Password (Direct)**

```
POST /auth/set-password
```

Request Body:

```json
{
  "email": "gemok98872@delaeb.com",
  "password": "SecurePassword123!"
}
```

Response:

```json
{
  "success": true,
  "message": "Password has been set successfully",
  "data": {
    "message": "Password set successfully",
    "user": {
      "id": 1,
      "email": "gemok98872@delaeb.com",
      "name": "John Doe",
      "status": "ACTIVE"
    }
  }
}
```

### 4. User Can Login

Once password is set, user can login:

```
POST /auth/user/login
```

Request Body:

```json
{
  "email": "gemok98872@delaeb.com",
  "password": "SecurePassword123!"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "gemok98872@delaeb.com",
      "name": "John Doe",
      "status": "ACTIVE",
      "profile": {
        "id": 1,
        "status": "APPROVED"
      }
    }
  }
}
```

---

## 🔐 Security Features

### Password Requirements

- Passwords are hashed using bcrypt with 10 salt rounds
- Stored securely in database (never plain text)

### User Status Validation

- User must be `VERIFIED` or `ACTIVE` status to set password
- Status automatically changes to `ACTIVE` once password is set
- Prevents unauthorized password setting for unapproved users

### Email Verification

- Password reset link includes user's email
- System validates email exists before allowing password set
- User-friendly error messages for invalid attempts

---

## 📧 Email Template

The password setup email includes:

- Welcome header with emoji
- Approval confirmation
- Call-to-action button to set password
- Direct link (copy-paste option)
- List of features user can access
- Professional footer with copyright

---

## 🛠️ API Endpoints Summary

| Endpoint                      | Method | Purpose                           | Auth Required |
| ----------------------------- | ------ | --------------------------------- | ------------- |
| `/auth/reset-password/:email` | POST   | Set password using email from URL | No            |
| `/auth/set-password`          | POST   | Set password using email in body  | No            |
| `/auth/user/login`            | POST   | User login with email/password    | No            |

---

## 💾 Database Schema

### User Model

```prisma
model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  name     String
  password String? // Can be null initially
  status   UserStatus @default(WAITLIST)
  // ... other fields
}
```

### User Status Flow

1. `WAITLIST` → User registers
2. `VERIFIED` → Admin approves profile
3. `ACTIVE` → User sets password

---

## 🧪 Testing

### Test User

- **Email:** gemok98872@delaeb.com
- **Status:** VERIFIED
- **Profile:** APPROVED
- **Password:** Not set yet

### Test Endpoints with Postman/cURL

**1. Set Password:**

```bash
curl -X POST http://localhost:3000/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gemok98872@delaeb.com",
    "password": "TestPassword123!"
  }'
```

**2. Login:**

```bash
curl -X POST http://localhost:3000/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gemok98872@delaeb.com",
    "password": "TestPassword123!"
  }'
```

---

## ⚠️ Error Handling

### Common Errors

**User Not Found:**

```json
{
  "message": "User with this email does not exist",
  "statusCode": 400
}
```

**Account Not Approved:**

```json
{
  "message": "Your account must be approved before you can set a password. Please wait for admin approval.",
  "statusCode": 400
}
```

**Invalid Password on Login:**

```json
{
  "message": "Invalid email or password",
  "statusCode": 401
}
```

**Password Not Set:**

```json
{
  "message": "Please set your password first using the link sent to your email",
  "statusCode": 401
}
```

---

## 🔧 Implementation Files

### Modified Files:

1. **`src/auth/auth.controller.ts`**
   - Added `/auth/reset-password/:email` endpoint
   - Added `/auth/set-password` endpoint
   - Added `/auth/user/login` endpoint

2. **`src/auth/auth.service.ts`**
   - Added `userResetPassword()` method
   - Added `loginUser()` method
   - Added `sendPasswordSetupEmail()` method

3. **`src/admin/admin.service.ts`**
   - Updated `approveProfile()` to send password setup email

4. **`prisma/schema.prisma`**
   - Added `password` field to User model

---

## 📱 Frontend Integration

### Password Reset Page

Create a page at: `/auth/reset-password/:email`

```jsx
// Example React component
import { useParams } from 'react-router-dom';
import { useState } from 'react';

function SetPassword() {
  const { email } = useParams();
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch(`/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.success) {
      // Redirect to login or dashboard
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Set Your Password</h1>
      <p>Email: {email}</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter new password"
      />
      <button type="submit">Set Password</button>
    </form>
  );
}
```

---

## ✅ Checklist

- [x] Password field added to User model
- [x] Password hashing implemented (bcrypt)
- [x] Password reset endpoint created
- [x] User login endpoint created
- [x] Email sent on registration approval
- [x] Status validation (VERIFIED/ACTIVE)
- [x] JWT token generation for users
- [x] Error handling implemented
- [x] API documentation created
- [x] Test user verified

---

## 🎯 Next Steps

1. **Frontend Implementation:**
   - Create password setup page
   - Create user login page
   - Implement JWT token storage
   - Add user dashboard

2. **Testing:**
   - Test complete flow end-to-end
   - Verify email delivery
   - Test error scenarios
   - Security testing

3. **Enhancements:**
   - Add password strength validation
   - Implement "forgot password" for users
   - Add 2FA option
   - Rate limiting on login attempts

---

## 📞 Support

For issues or questions:

- Check server logs for detailed error messages
- Verify user status in database
- Ensure email service is configured correctly
- Test with Postman before frontend integration
