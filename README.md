# QR Card Dating App API 💕

A comprehensive NestJS REST API for a QR card-based dating application with Stripe payments, real-time matching, and admin dashboard.

## 🚀 Features

- 🔐 **JWT Authentication** with bcrypt password hashing
- 👤 **Profile Management** with form-data photo uploads
- 🔗 **QR Code System** - Generate 50 codes per user, 5-scan limit enforcement
- 👨‍💼 **Admin Dashboard** with profile approval workflow and notifications
- 💳 **Stripe Integration** - $69 setup fee, $13/month or $120/year subscriptions
- 💘 **Matching System** - Handle viewer interest and mutual matches
- 📱 **Complete User Journey** from registration to contact sharing

## 🛠 Tech Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + bcrypt
- **Payments**: Stripe API (Live Keys)
- **QR Generation**: qrcode library
- **File Upload**: Multer (multipart/form-data)
- **Validation**: class-validator + class-transformer

## 📋 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL database
- Stripe account

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/MTS-Services/stuart_backend_nodejs.git
   cd stuart_backend_nodejs
   npm install
   ```

2. **Environment Setup**
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/qr_dating_app"
   
   # Application
   PORT=3000
   JWT_SECRET="your_super_secret_jwt_key"
   
   # Stripe (Live Keys)
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

3. **Database Setup**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed  # Optional test data
   ```

4. **Start Development**
   ```bash
   npm run start:dev
   ```

Server runs at `http://localhost:3000` 🎉

## 🔄 User Journey Flow

```
📱 Landing Page → 📧 Registration → 💳 Pay Setup Fee ($69)
    ↓
👤 Create Profile → 📸 Upload Photos → ✍️ Write Bio
    ↓
👨‍💼 Admin Review → ✅ Approve/❌ Reject → 📧 Notification
    ↓
🔗 Generate QR Cards (50 codes) → 👀 Others Scan (5-limit)
    ↓
💘 Matching System → 🤝 Mutual Interest → 📞 Contact Sharing
    ↓
💰 Monthly ($13) or Yearly ($120) Subscription
```

## 📁 Project Structure

```
src/
├── auth/           # 🔐 JWT authentication, login/register
├── profile/        # 👤 Profile CRUD, photo uploads (form-data)
├── qr-card/        # 🔗 QR generation, scanning, analytics
├── admin/          # 👨‍💼 Dashboard, approvals, notifications
├── payment/        # 💳 Stripe integration, subscriptions
└── prisma.service.ts  # 🗄️ Database connection service
```

## 🗃️ Database Schema

**9 Core Entities with Full Relations:**

- **User** - Auth, payment status, Stripe customer
- **Profile** - Bio, photos, preferences, approval status
- **QRCard** - Generated codes, scan tracking, analytics
- **Scan** - Who scanned what, timestamp tracking
- **Match** - Mutual interest, contact sharing
- **Subscription** - Plan management, billing cycles
- **Payment** - Stripe integration, transaction history
- **Admin** - Dashboard access, role management
- **Notification** - System alerts, approval updates

## 🔌 API Endpoints

### 🔐 Authentication
```http
POST /auth/register          # User registration
POST /auth/login            # User login  
POST /auth/admin/login      # Admin access
```

### 👤 Profile Management
```http
POST /profile               # Create profile
GET /profile                # Get user profile
PUT /profile                # Update profile
POST /profile/photo         # Upload photos (form-data!)
DELETE /profile/photo/:url  # Delete photo
POST /profile/submit        # Submit for admin review
```

### 🔗 QR Card System
```http
POST /qr-cards/generate     # Generate 50 QR codes
GET /qr-cards              # List user's cards
GET /qr-cards/:id/scans    # View scan analytics
POST /qr-cards/scan/:code  # Scan someone's QR
PUT /qr-cards/:id/deactivate  # Deactivate card
```

### 💳 Payment System (Stripe)
```http
POST /payment/setup-fee           # Create payment intent ($69)
POST /payment/confirm-setup-fee   # Confirm payment
POST /payment/subscription        # Monthly/yearly plans
GET /payment/payments            # Payment history
GET /payment/subscription        # Current plan
POST /payment/subscription/cancel  # Cancel subscription
```

### 👨‍💼 Admin Dashboard
```http
GET /admin/dashboard              # Statistics overview
GET /admin/profiles/pending       # Profiles awaiting review
GET /admin/profiles/:id          # Profile details
POST /admin/profiles/:id/approve  # Approve profile
POST /admin/profiles/:id/reject   # Reject profile
GET /admin/profiles/verified      # Approved profiles
GET /admin/notifications         # System notifications
PUT /admin/notifications/:id/read # Mark as read
```

## 🧪 Testing

**Complete Postman Collection Included!**

Import `QR_Card_Dating_App_API.postman_collection.json`:

- ✅ **20+ Pre-configured Endpoints**
- 🔑 **Automatic JWT Token Management**
- 📎 **Form-data File Upload Support**
- 🔄 **Full User Journey Testing**
- 👨‍💼 **Admin Workflow Testing**
- 💳 **Stripe Payment Flow**

### Test Environment Variables
```json
{
  "baseUrl": "http://localhost:3000",
  "access_token": "{{auto_generated}}",
  "admin_token": "{{auto_generated}}"
}
```

## 🔧 Development Commands

```bash
# Development
npm run start:dev         # Watch mode with hot reload

# Production
npm run build            # TypeScript compilation
npm run start:prod       # Production server

# Database
npx prisma studio        # Visual database browser
npx prisma migrate dev   # Apply schema changes
npx prisma generate     # Update Prisma client types
npx prisma db seed      # Populate test data

# Testing
npm run test            # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:cov        # Coverage report
```

## 💰 Payment Integration

**Live Stripe Integration Ready!**

- ✅ **Setup Fee**: $69.00 one-time payment
- 📅 **Monthly Plan**: $13.00/month recurring
- 📅 **Yearly Plan**: $120.00/year (2 months free!)
- 🔒 **Secure**: Real Stripe API with webhook support
- 📊 **Tracking**: Complete payment history and analytics

## 🚀 Deployment

**Production Ready Features:**

- ✅ Environment variable configuration
- ✅ Database migrations
- ✅ Error handling and logging
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Rate limiting ready
- ✅ Health check endpoints

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by MTS Services**

🔗 **Repository**: [https://github.com/MTS-Services/stuart_backend_nodejs](https://github.com/MTS-Services/stuart_backend_nodejs)