# Backend API - Frontend Integration Guide

## 🔐 User Authentication System - Complete

### Overview

The backend now supports complete user authentication with password reset functionality. Users can set passwords after admin approval and login to access protected features.

---

## 📋 API Endpoints for Frontend

### 1. **User Registration** ✅

```
POST /auth/register
```

**Request:**

```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "message": "Registration submitted successfully. Admin will review and approve your application.",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "status": "WAITLIST"
  }
}
```

---

### 2. **User Set Password** ✅ NEW!

```
POST /auth/set-password
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password has been set successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "status": "ACTIVE"
    }
  }
}
```

**Frontend Page:** `/auth/reset-password/:email`

---

### 3. **User Login** ✅ NEW!

```
POST /auth/user/login
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
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

**Store Token:**

```javascript
localStorage.setItem('user_token', response.data.access_token);
```

---

### 4. **Password Reset (Alternative)** ✅ NEW!

```
POST /auth/reset-password/:email
```

**Request:**

```json
{
  "email": "user@example.com",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password has been set successfully. You can now login.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "status": "ACTIVE"
    }
  }
}
```

---

### 5. **Admin Login** ✅

```
POST /auth/admin/login
```

**Request:**

```json
{
  "email": "admin@yourapp.com",
  "password": "admin123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "email": "admin@yourapp.com",
    "username": "admin",
    "role": "admin"
  }
}
```

---

## 🎨 Frontend Pages Needed

### 1. **Password Setup Page** 📝 NEW!

**Route:** `/auth/reset-password/:email`

**Component Example:**

```jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

function SetPasswordPage() {
  const { email } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to login
        navigate('/login', {
          state: { message: 'Password set successfully! Please login.' },
        });
      } else {
        setError(data.message || 'Failed to set password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-page">
      <h1>Set Your Password</h1>
      <p>Email: {email}</p>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Setting Password...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
}
```

---

### 2. **User Login Page** 📝 NEW!

**Route:** `/login`

**Component Example:**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function UserLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/auth/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token
        localStorage.setItem('user_token', data.data.access_token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

---

### 3. **Protected Route Wrapper** 📝 NEW!

```jsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('user_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Usage in routes:
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>;
```

---

### 4. **API Helper with Authentication** 📝 NEW!

```javascript
// api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = {
  // Authenticated request helper
  async fetch(endpoint, options = {}) {
    const token = localStorage.getItem('user_token');

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle 401 - redirect to login
      if (response.status === 401) {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error(data.message || 'API Error');
    }

    return data;
  },

  // User endpoints
  user: {
    login: (email, password) =>
      api.fetch('/auth/user/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    setPassword: (email, password) =>
      api.fetch('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    getProfile: () => api.fetch('/profile/me'),

    logout: () => {
      localStorage.removeItem('user_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    },
  },
};
```

---

## 🔄 Complete User Flow

```
1. User Registration
   └─→ POST /auth/register
       └─→ User status: WAITLIST

2. Admin Approval
   └─→ Admin approves via dashboard
       └─→ User status: VERIFIED
       └─→ Email sent with password setup link

3. User Receives Email
   └─→ Email contains: https://yourapp.com/auth/reset-password/{email}
       └─→ User clicks link

4. User Sets Password
   └─→ Frontend extracts email from URL
       └─→ POST /auth/set-password
       └─→ User status: ACTIVE

5. User Login
   └─→ POST /auth/user/login
       └─→ Receives JWT token
       └─→ Store token in localStorage

6. Access Protected Features
   └─→ Include token in Authorization header
       └─→ Access user dashboard, QR cards, etc.
```

---

## 🔐 Token Management

### Storing Token

```javascript
localStorage.setItem('user_token', token);
```

### Using Token in Requests

```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('user_token')}`
}
```

### Checking if User is Logged In

```javascript
const isLoggedIn = !!localStorage.getItem('user_token');
```

### Logout

```javascript
function logout() {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user');
  navigate('/login');
}
```

---

## ✅ Checklist for Frontend Integration

- [ ] Create `/auth/reset-password/:email` page
- [ ] Create `/login` page for users
- [ ] Implement ProtectedRoute wrapper
- [ ] Add token storage (localStorage)
- [ ] Add Authorization header to authenticated requests
- [ ] Handle 401 errors (redirect to login)
- [ ] Add logout functionality
- [ ] Update navigation based on auth state
- [ ] Add loading and error states
- [ ] Test complete flow end-to-end

---

## 📧 Email Link Format

When admin approves user, they receive email with:

```
https://scanmemaybe.com/auth/reset-password/user@example.com
```

Frontend should:

1. Extract email from URL params
2. Show password input form
3. Call `/auth/set-password` with email and password
4. Redirect to `/login` after success

---

## 🚨 Error Handling

### Common Errors

**User not found:**

```json
{
  "message": "User with this email does not exist",
  "statusCode": 400
}
```

**Account not approved:**

```json
{
  "message": "Your account must be approved before you can set a password. Please wait for admin approval.",
  "statusCode": 400
}
```

**Invalid credentials:**

```json
{
  "message": "Invalid email or password",
  "statusCode": 401
}
```

**Password not set:**

```json
{
  "message": "Please set your password first using the link sent to your email",
  "statusCode": 401
}
```

---

## 🧪 Testing

Use the updated Postman collection:

- File: `QR_Card_Dating_App_API.postman_collection.json`
- New endpoints added under "🔐 Authentication" folder:
  - User Set Password
  - User Login
  - User Reset Password by Email

---

## 📞 Support

All endpoints are now live and tested. If you encounter any issues:

1. Check browser console for errors
2. Verify API URL is correct
3. Check network tab for request/response
4. Ensure token is being sent in headers
5. Contact backend team with error details
