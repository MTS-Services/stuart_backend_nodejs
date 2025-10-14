# QR Card Scanning Guide 🔍

## The Issue You Encountered

**Error**: `Cannot POST /qr-cards/scan/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQAAACkCAYAAAAZtYVBAAAAAklEQVR4AewaftI...`

**Problem**: You tried to scan using the entire base64 image data instead of the QR code identifier.

## How QR Card Scanning Works

### 1. **QR Code Generation** 📱
When you generate QR cards, each card gets:
- A unique UUID identifier (e.g., `abc-123-def-456`)
- A base64 QR code image containing a URL
- The URL format: `https://yourapp.com/scan/abc-123-def-456`

### 2. **Correct Scanning Process** ✅

**Step 1**: Generate QR cards first
```bash
POST /qr-cards/generate/by-email
Body: {"email": "user@example.com", "count": 5}
```

**Step 2**: Extract the QR code identifier from the response
```json
{
  "cards": [
    {
      "id": 1,
      "qrCode": "abc-123-def-456",  // ← This is what you need!
      "qrCodeImage": "data:image/png;base64,iVBORw0K...",
      "scanUrl": "https://yourapp.com/scan/abc-123-def-456"
    }
  ]
}
```

**Step 3**: Use the QR code identifier for scanning
```bash
POST /qr-cards/scan/abc-123-def-456
Body: {"viewerId": null}
```

### 3. **What NOT to Do** ❌

❌ **Wrong**: Using the base64 image data
```bash
POST /qr-cards/scan/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQ...
```

❌ **Wrong**: Using the full scan URL
```bash
POST /qr-cards/scan/https://yourapp.com/scan/abc-123-def-456
```

### 4. **Real-World Scanning Flow** 🌍

1. **User scans QR code** with phone camera
2. **QR code contains**: `https://yourapp.com/scan/abc-123-def-456`
3. **Frontend extracts UUID**: `abc-123-def-456`
4. **API call**: `POST /qr-cards/scan/abc-123-def-456`

### 5. **Testing with Postman** 🧪

1. **Run "Generate QR Cards"** request first
2. **Check the response** - it saves `qr_code` variable automatically
3. **Run "Scan QR Code"** request - it uses `{{qr_code}}` variable
4. **View the scan results** with profile information

### 6. **Expected Scan Response** 📊

```json
{
  "id": 1,
  "qrCode": "abc-123-def-456",
  "scanCount": 1,
  "maxScans": 5,
  "isActive": true,
  "profile": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "bio": "Looking for meaningful connections!",
    "age": 25,
    "location": "New York, NY"
  }
}
```

### 7. **Complete Test Workflow** 🔄

1. **Register User**: `POST /auth/register`
2. **Create Profile**: `POST /profile` (with form-data)
3. **Generate QR Cards**: `POST /qr-cards/generate/by-email`
4. **Scan QR Code**: `POST /qr-cards/scan/{uuid}`
5. **View Results**: Profile information displayed

---

## Summary 💡

- **QR Code ID**: Use the UUID from the `qrCode` field
- **Not the Image**: Never use the base64 image data
- **Not the URL**: Extract just the UUID part
- **Test Flow**: Generate → Extract UUID → Scan with UUID

The Postman collection handles this automatically by saving the QR code ID when you generate cards! 🎉