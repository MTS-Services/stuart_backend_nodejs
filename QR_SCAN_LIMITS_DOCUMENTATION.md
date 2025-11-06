# QR Card Scan Limits Implementation

## Overview
This document describes the implementation of QR card scan limits that provide two-tier protection against abuse while maintaining usability.

## Scan Limit Rules

### 1. Total Card Limit: 250 scans per QR card
- Each QR card can be scanned a maximum of 250 times
- This is a hard limit - once reached, the card becomes unavailable
- Prevents overall abuse and ensures fair usage across all cards

### 2. IP-based Limit: 5 scans per IP address per QR card
- Any single IP address can scan the same QR card up to 5 times
- After 5 scans, that specific IP is blocked from scanning that card
- Different IP addresses can still scan the card (up to their own 5-scan limit)
- Prevents spam and abuse from individual users/devices

## Implementation Details

### Database Schema
```prisma
model QRCard {
  id        Int      @id @default(autoincrement())
  qrCode    String   @unique
  scanCount Int      @default(0)
  maxScans  Int      @default(250)  // Updated from 5 to 250
  isActive  Boolean  @default(true)
  // ... other fields
}

model Scan {
  id        Int      @id @default(autoincrement())
  qrCardId  Int
  ipAddress String?
  // ... other fields
  
  @@index([qrCardId, ipAddress]) // Optimizes IP-based queries
}
```

### Service Logic (QRCardService.scanQRCard)
1. **Card Validation**: Check if QR card exists and is active
2. **Total Limit Check**: Verify card hasn't exceeded 250 total scans
3. **IP Limit Check**: Count scans from the requesting IP address
4. **Scan Recording**: If all checks pass, record the scan and increment counters
5. **Response**: Return success/failure with appropriate messaging

### API Responses

#### Successful Scan
```json
{
  "success": true,
  "profile": {
    "name": "John Doe",
    "age": 25,
    "bio": "Looking for connections!",
    "contactEmail": "john@example.com"
  },
  "scansRemaining": 245,
  "emailNotifications": {
    "profileOwnerNotified": true,
    "scannerNotified": true
  }
}
```

#### Total Limit Reached (250 scans)
```json
{
  "success": false,
  "message": "This card has reached its maximum scan limit (250 scans) and is no longer available",
  "limitReached": true
}
```

#### IP Limit Reached (5 scans per IP)
```json
{
  "success": false,
  "message": "This IP address has already scanned this card 5 times (maximum allowed per IP)",
  "ipLimitReached": true,
  "scansFromThisIP": 5
}
```

## API Endpoints

### Scan QR Code
```
POST /qr-cards/scan/{qrCode}
POST /qr-cards/scan/{qrCode}/{scannerEmail}
```

**Headers**: The IP address is automatically detected from request headers

**Body** (for first endpoint):
```json
{
  "scannerEmail": "scanner@example.com"
}
```

### Check Scan Limits (Admin Only)
```
GET /qr-cards/scan-limits/{qrCode}
```

**Response**:
```json
{
  "qrCode": "uuid-here",
  "totalScans": 15,
  "maxTotalScans": 250,
  "scansRemaining": 235,
  "ipAddress": "192.168.1.100",
  "scansFromThisIP": 3,
  "ipScansRemaining": 2,
  "canScan": true,
  "limitReasons": {
    "totalLimitReached": false,
    "ipLimitReached": false,
    "cardInactive": false
  },
  "owner": {
    "name": "Card Owner",
    "email": "owner@example.com"
  }
}
```

## Migration Applied

A database migration was created to update existing QR cards:
- Changed default `maxScans` from 5 to 250
- Migration name: `20251106053016_update_max_scans_to_250`

## Testing

### Manual Testing
1. Generate a QR card
2. Scan it 5 times from the same IP - 6th scan should be blocked
3. Scan from different IP - should succeed
4. Continue until 250 total scans reached
5. All further scans should be blocked regardless of IP

### Automated Testing
Run the test script:
```bash
node test-ip-limits.js
```

## Benefits

1. **Prevents Spam**: IP-based limits stop individual users from overwhelming cards
2. **Fair Usage**: 250-scan total ensures cards remain usable for legitimate users
3. **Scalable**: Different IPs can independently use their 5-scan allowance
4. **Transparent**: Clear error messages explain why scans are blocked
5. **Administrative**: Admin endpoints allow monitoring and debugging

## Edge Cases Handled

1. **No IP Address**: If IP cannot be determined, only total limit applies
2. **Card Inactive**: Inactive cards cannot be scanned regardless of limits
3. **Simultaneous Scans**: Database constraints prevent race conditions
4. **Email Notifications**: Continue even if scan limits are reached (for error notifications)

## Security Considerations

- IP addresses can be spoofed, but this provides reasonable protection for most use cases
- Consider additional measures for high-security environments (user authentication, CAPTCHA, etc.)
- Monitor for patterns of abuse and adjust limits as needed

## Future Enhancements

1. **Dynamic Limits**: Allow different limits per card type or user tier
2. **Time-based Reset**: Reset IP limits after a certain period
3. **Rate Limiting**: Add time-based rate limiting (e.g., max 1 scan per minute per IP)
4. **Geographic Restrictions**: Block/allow certain geographic regions
5. **User-based Limits**: Track limits by registered users in addition to IP addresses