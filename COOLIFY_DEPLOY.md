# Coolify Deployment Guide for Stuart QR Dating App

## 🚨 **Issues Fixed:**

### 1. **Database Connection During Build** ❌➡️✅
- **Problem**: Prisma migrate trying to connect during build
- **Solution**: Moved migrations to runtime (startup command)

### 2. **Node.js Version Compatibility** ❌➡️✅
- **Problem**: Using Node 18, dependencies need Node 20+
- **Solution**: Updated to Node 20 in Dockerfile

### 3. **Build-time Environment Variables** ❌➡️✅
- **Problem**: Production env vars causing build failures
- **Solution**: Separate build and runtime environments

## 🔧 **Coolify Configuration:**

### **Build Settings:**
- **Base Image**: `node:20-alpine`
- **Build Command**: `npm run build`
- **Start Command**: `npx prisma migrate deploy && node dist/main`

### **Environment Variables (Runtime Only):**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://postgres:eHHoKm8Q7x4x5sxNq9AmSXeGaP5ZX70dNpZsVV2exkXeB9A6DlNLQ9JtEkc0ygOt@147.93.107.217:5436/postgres
JWT_SECRET=your_strong_jwt_secret_32_chars_min
FRONTEND_URL=https://stuart.backend.mtscorporate.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=hahm56825@gmail.com
EMAIL_PASS="bivf agof aaqs aczd"
FROM_EMAIL=noreply@mtscorporate.com
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
MOCK_PAYMENTS=false
IMAGE_UPLOAD_SERVICE_URL=https://img.mtscorporate.com
```

### **Important Notes:**
1. **Set NODE_ENV as "Runtime Only"** - Not available during build
2. **Database migrations run at startup** - Not during build
3. **Use Node 20+** for compatibility
4. **Health check included** - 40s start period for migrations

## 🚀 **Deployment Steps:**

### 1. **In Coolify Dashboard:**
- Set all environment variables as **"Runtime Only"**
- Use custom Dockerfile: `Dockerfile.coolify`
- Set health check path: `/`

### 2. **Custom Start Command:**
```bash
npx prisma migrate deploy && node dist/main
```

### 3. **Port Configuration:**
- Container Port: `3000`
- Health Check: `GET /` (returns "Hello World!")

## 🐛 **Troubleshooting:**

### If Build Still Fails:
1. Check Node.js version in build logs
2. Ensure no DATABASE_URL in build environment
3. Verify all dependencies install correctly

### If Runtime Fails:
1. Check database connection
2. Verify environment variables are set
3. Check migration status: `npx prisma migrate status`

## ✅ **Expected Behavior:**

1. **Build Phase**: ✅ Installs deps, builds app, generates Prisma client
2. **Runtime Phase**: ✅ Runs migrations, starts server on port 3000
3. **Health Check**: ✅ Responds with "Hello World!" at `/`

## 🎯 **Next Steps After Successful Deploy:**

1. Test health endpoint: `https://stuart.backend.mtscorporate.com/`
2. Test admin login: `POST /auth/admin/login`
3. Verify all API endpoints work
4. Update Postman collection with production URLs

Your deployment should now work perfectly! 🎉