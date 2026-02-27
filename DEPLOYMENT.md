# 🚀 FoodScan AI - Complete Deployment Guide

## 📋 Overview
- **Backend**: Node.js + Express + MongoDB (Render)
- **Frontend**: React Native (Expo EAS)
- **Database**: MongoDB Atlas

---

## 🔧 BACKEND DEPLOYMENT (RENDER)

### Step 1: Prepare Repository
```bash
# Commit all changes
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repository
4. Configure service:

**Service Configuration:**
- **Name**: `foodscan-api`
- **Environment**: `Node`
- **Region**: Closest to your users
- **Branch**: `main`
- **Root Directory**: `.` (project root)
- **Runtime**: `Node`
- **Build Command**: `npm run server:build`
- **Start Command**: `npm run server:prod`
- **Health Check Path**: `/api/health`

### Step 3: Set Environment Variables
In Render Dashboard → Service → Environment:

```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/foodscan
MONGODB_DB_NAME=foodscan
JWT_SECRET=your-secure-jwt-secret-here
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
```

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait for build and deployment
3. Test: `https://your-service-name.onrender.com/api/health`

---

## 📱 FRONTEND DEPLOYMENT (EXPO EAS)

### Step 1: Install EAS CLI
```bash
npm install -g @expo/eas-cli
eas login
```

### Step 2: Configure EAS Project
```bash
eas project:info
# Follow prompts to link your project
```

### Step 3: Update API URL
In your app, update the API URL to your deployed backend:
```bash
# In eas.json (already created)
EXPO_PUBLIC_API_URL=https://your-backend-name.onrender.com
```

### Step 4: Build for Production
```bash
# For Android APK (testing)
eas build --platform android --profile preview

# For iOS (testing)  
eas build --platform ios --profile preview

# For App Store/Play Store
eas build --platform all --profile production
```

### Step 5: Submit to Stores
```bash
# Submit to Google Play Store
eas submit --platform android --profile production

# Submit to Apple App Store
eas submit --platform ios --profile production
```

---

## 🔧 TROUBLESHOOTING

### Backend Issues
**Issue**: Build fails on Render
```bash
# Check logs in Render dashboard
# Common fixes:
- Ensure all dependencies are in package.json
- Check MongoDB connection string
- Verify environment variables
```

**Issue**: CORS errors
```bash
# Update allowedOrigins in server/index.ts
# Add your deployed frontend URL
```

### Frontend Issues
**Issue**: Build fails
```bash
# Clear Expo cache
eas build --clear-cache

# Update dependencies
npm install
eas build
```

**Issue**: API connection errors
```bash
# Verify EXPO_PUBLIC_API_URL is correct
# Test backend health endpoint
curl https://your-backend.onrender.com/api/health
```

---

## 🔄 MAINTENANCE

### Backend Updates
```bash
# Push changes to main branch
git push origin main
# Render auto-deploys
```

### Frontend Updates
```bash
# Build new version
eas build --platform all --profile production
# Submit updated version
eas submit --platform all --profile production
```

---

## 📊 MONITORING

### Backend Monitoring
- Render Dashboard: Logs, metrics, errors
- Health endpoint: `/api/health`
- MongoDB Atlas: Database performance

### Frontend Monitoring
- Expo Dashboard: Build status, analytics
- App Store/Play Store: Crash reports, user feedback

---

## 🚀 QUICK DEPLOY CHECKLIST

### Backend ✅
- [ ] Repository pushed to GitHub
- [ ] Render service created
- [ ] Environment variables set
- [ ] Health endpoint working
- [ ] CORS configured for frontend

### Frontend ✅  
- [ ] EAS CLI installed
- [ ] Project configured
- [ ] API URL updated
- [ ] Build successful
- [ ] App submitted to stores

---

## 🆘 SUPPORT

### Render Issues
- Check [Render Docs](https://render.com/docs)
- Review build logs
- Verify environment variables

### Expo Issues  
- Check [Expo Docs](https://docs.expo.dev)
- Use EAS CLI diagnostics
- Review build logs

### Common Issues
1. **MongoDB connection**: Check IP whitelist in Atlas
2. **Environment variables**: Ensure all required vars are set
3. **CORS**: Verify frontend URL is allowed
4. **Build failures**: Clear cache, update dependencies

---

**🎉 Your FoodScan AI app is now live!**
