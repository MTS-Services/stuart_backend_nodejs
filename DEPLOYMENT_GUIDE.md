# 🚀 Stuart QR Dating App - Deployment Guide

## 🔧 **Pre-Deployment Checklist**

### ✅ **1. Environment Setup**
- [ ] Update `.env.production` with real production values
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Configure production database URL
- [ ] Add real Stripe keys (set MOCK_PAYMENTS=false)
- [ ] Update FRONTEND_URL with actual domain
- [ ] Configure production email settings

### ✅ **2. Database Setup**
```bash
# Run migrations on production database
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Optionally seed data
npx prisma db seed
```

### ✅ **3. Security Configuration**
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates
- [ ] Configure rate limiting
- [ ] Set strong session secrets
- [ ] Enable security headers

## 🐳 **Docker Deployment (Recommended)**

### **Option 1: Simple Docker Run**
```bash
# Build and run with Docker
npm run deploy:docker

# Or manually:
docker build -t stuart-api .
docker run -p 3000:3000 --env-file .env.production stuart-api
```

### **Option 2: Docker Compose (Full Stack)**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## ☁️ **Cloud Platform Deployment**

### **Heroku Deployment**
```bash
# Install Heroku CLI
npm install -g heroku

# Create Heroku app
heroku create stuart-qr-dating-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL="your_production_db_url"
heroku config:set JWT_SECRET="your_jwt_secret"
# ... add all other env vars

# Deploy
git push heroku main
```

### **Vercel Deployment**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### **DigitalOcean App Platform**
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Configure build command: `npm run build`
4. Configure run command: `npm run start:prod`

### **Railway Deployment**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

## 🗄️ **Database Deployment Options**

### **Option 1: Managed Database (Recommended)**
- **PostgreSQL**: AWS RDS, Google Cloud SQL, DigitalOcean Databases
- **Connection**: Update DATABASE_URL in production env

### **Option 2: Self-hosted with Docker**
```bash
# Included in docker-compose.yml
docker-compose up postgres
```

## 📊 **Production Monitoring**

### **Health Checks**
```bash
# Check application health
curl https://your-domain.com/

# Check database connection
curl https://your-domain.com/test-db
```

### **Logging**
- Application logs via Docker logs
- Database monitoring via provider dashboard
- Error tracking with Sentry (optional)

## 🔒 **Security Considerations**

### **Environment Variables**
```bash
# Never commit these to git:
JWT_SECRET=production_secret_here
STRIPE_SECRET_KEY=sk_live_...
EMAIL_PASS=app_password_here
DATABASE_URL=postgres://...
```

### **CORS Configuration**
```typescript
// Add to main.ts for production
app.enableCors({
  origin: [
    'https://your-production-domain.com',
    'https://admin.your-production-domain.com'
  ],
  credentials: true,
});
```

## 🚀 **Quick Deploy Commands**

```bash
# 1. Prepare for production
npm run build

# 2. Deploy to Docker
npm run deploy:docker

# 3. Deploy to cloud platform
# (Use platform-specific commands above)

# 4. Verify deployment
curl https://your-api-domain.com/
```

## 🐛 **Troubleshooting**

### **Common Issues:**
1. **Database Connection**: Check DATABASE_URL format
2. **Environment Variables**: Ensure all required vars are set
3. **CORS Errors**: Update origin settings
4. **Build Failures**: Check TypeScript compilation errors
5. **Port Issues**: Ensure PORT environment variable is set

### **Debug Commands:**
```bash
# Check logs
docker logs stuart-api

# Connect to container
docker exec -it stuart-api sh

# Test database connection
npx prisma studio
```

## 📈 **Performance Optimization**

- Enable Redis for caching
- Configure CDN for static assets
- Use connection pooling for database
- Enable compression middleware
- Set up monitoring and alerts

## 🔄 **CI/CD Setup (Optional)**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run test
      # Add deployment steps for your platform
```

---

## 🎯 **Next Steps After Deployment**

1. **Test all endpoints** with production URLs
2. **Update Postman collection** with production base URL
3. **Configure monitoring** and alerting
4. **Set up backup strategy** for database
5. **Update DNS** to point to your API
6. **Test payment flows** with real Stripe keys
7. **Configure email delivery** monitoring

Your Stuart QR Dating App is now ready for production! 🎉