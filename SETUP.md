# Backend Storage Setup Guide

## 🚀 Quick Setup

### 1. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual credentials
```

### 2. Required Services

#### MongoDB Atlas (Database)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free account
3. Create a new cluster (free tier is sufficient)
4. Create a database user with read/write permissions
5. Get your connection string:
   - Click "Connect" → "Connect your application"
   - Copy the MongoDB URI
6. Add to `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/foodscan
   MONGODB_DB_NAME=foodscan
   ```

#### Gemini AI (API Key)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env`:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your-api-key-here
   ```

#### JWT Secret
1. Generate a secure secret:
   ```bash
   # Using OpenSSL (recommended)
   openssl rand -base64 32
   
   # Or use online generator: https://generate-secret.vercel.app/32
   ```
2. Add to `.env`:
   ```
   JWT_SECRET=your-generated-secret-here
   ```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Servers
```bash
# Terminal 1: Start the backend server
npm run server:dev

# Terminal 2: Start the Expo app
npm run expo:dev
```

## 📁 File Structure

```
├── .env                    # Your secret credentials (never commit)
├── .env.example           # Template for environment variables
├── server/
│   ├── index.ts           # Express server with API routes
│   ├── storage.ts         # MongoDB storage implementation
│   └── routes.ts          # Route compatibility layer
├── lib/
│   ├── storage.ts         # Local AsyncStorage functions
│   ├── apiService.ts      # Centralized API client
│   └── DataContext.tsx    # React state management
└── SETUP.md               # This file
```

## 🔧 Architecture Overview

### Hybrid Storage Strategy
- **Local First**: AsyncStorage for instant UI response
- **Background Sync**: MongoDB for data persistence and cross-device sync
- **Offline Support**: App works perfectly without internet

### Data Flow
1. **User Action** → Local storage (immediate)
2. **Background** → MongoDB sync (fire-and-forget)
3. **App Start** → Load local + merge with server data

### Authentication
- JWT tokens with 30-day expiration
- Secure password hashing (bcrypt, 12 rounds)
- Token stored in AsyncStorage for persistence

## 🚨 Important Notes

### Security
- **Never commit `.env` to git** (already in .gitignore)
- Use strong, unique passwords
- Keep your JWT secret secure
- Use MongoDB Atlas network access controls

### Performance
- Local storage provides instant UI response
- Background sync doesn't block the user interface
- Automatic conflict resolution (server wins, newer scans win)

### Error Handling
- Graceful degradation when offline
- Automatic retry for failed sync operations
- User data is never lost (local backup)

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if MongoDB URI is correct
echo $MONGODB_URI

# Verify environment variables are loaded
npm run server:dev
```

### Connection Issues
1. **MongoDB**: Check IP whitelist in Atlas settings
2. **API**: Ensure EXPO_PUBLIC_API_URL matches server port
3. **Network**: Check firewall settings for port 5000

### Data Not Syncing
1. Verify JWT token is valid
2. Check browser network tab for API errors
3. Ensure MongoDB user has proper permissions

## 📱 Testing the Setup

1. **Register a new user** in the app
2. **Scan a product** to create local data
3. **Check MongoDB Atlas** → Collections → Verify data appears
4. **Restart app** → Verify data persists and syncs

## 🔄 Production Deployment

### Environment Variables
```bash
# Production
EXPO_PUBLIC_API_URL=https://your-domain.com
NODE_ENV=production
```

### Security Checklist
- [ ] Change default JWT secret
- [ ] Enable MongoDB Atlas IP whitelisting
- [ ] Use HTTPS in production
- [ ] Set up monitoring and logging

## 🆘 Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB Atlas cluster is running
4. Check network connectivity between app and server

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.mongodb.com/atlas)
- [Expo Router Guide](https://docs.expo.dev/router)
- [JWT Best Practices](https://jwt.io/introduction)
