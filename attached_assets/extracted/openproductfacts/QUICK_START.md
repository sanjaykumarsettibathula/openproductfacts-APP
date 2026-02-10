# Quick Start Guide - Fix All Issues

## 🚨 Issues Fixed

### 1. Scanner Box Duplication ✅
- **Fixed**: Hidden html5-qrcode default scanning box
- **Fixed**: Made scanner field wider horizontally (2.5x width, 0.6x height)
- **Result**: Only one custom green frame visible, wider for barcodes

### 2. Chatbot Not Working ✅
- **Fixed**: Improved error handling in LLM endpoint
- **Fixed**: Better API key validation
- **Fixed**: Improved error messages
- **Result**: Chatbot should now work with proper API key

### 3. LLM Product Analysis Not Working ✅
- **Fixed**: Improved JSON parsing
- **Fixed**: Better error handling
- **Fixed**: Improved prompt formatting
- **Result**: Product analysis should work correctly

### 4. Database Setup ✅
- **Fixed**: Added ChatConversation table
- **Fixed**: Auto-creates missing tables
- **Fixed**: All required databases exist
- **Result**: Complete database structure

## 📝 Step-by-Step Setup

### Step 1: Create Environment Files

**Backend (server/.env):**
```bash
cd server
# Create .env file
echo PORT=5000 > .env
echo GEMINI_API_KEY=AIzaSyA_4TxLvM05ed-laTiPTIwl9IkZ9fdJCms >> .env
echo NODE_ENV=development >> .env
```

Or manually create `server/.env`:
```env
PORT=5000
GEMINI_API_KEY=AIzaSyA_4TxLvM05ed-laTiPTIwl9IkZ9fdJCms
NODE_ENV=development
```

**Frontend (client/.env):**
```bash
cd client
# Create .env file
echo VITE_API_URL=http://localhost:5000/api > .env
echo VITE_NODE_ENV=development >> .env
```

Or manually create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

### Step 2: Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### Step 3: Start Backend Server

```bash
cd server
npm run dev
```

**Check for:**
- ✅ `✅ Gemini AI initialized successfully`
- ✅ `Server running on http://localhost:5000`
- ✅ `✅ Database schema updated` (if first run)

### Step 4: Start Frontend

```bash
cd client
npm run dev
```

### Step 5: Verify Setup

1. **Check Backend:**
   - Open: http://localhost:5000/api/health
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Database:**
   - File: `server/database.json`
   - Should contain all tables:
     - users
     - products
     - scannedProducts
     - productLists
     - userPreferences
     - chatConversations

3. **Test Chatbot:**
   - Open app in browser
   - Click chatbot button
   - Ask a question
   - Should get response from Gemini AI

4. **Test Scanner:**
   - Go to Scan page
   - Should see wider scanning frame
   - Only one green frame (no duplication)
   - Should scan barcodes

## 🔍 Troubleshooting

### Chatbot Still Not Working

1. **Check server/.env file exists:**
   ```bash
   cd server
   dir .env  # Windows
   ls -la .env  # Mac/Linux
   ```

2. **Check API key in .env:**
   ```bash
   # Should see your API key
   type .env  # Windows
   cat .env  # Mac/Linux
   ```

3. **Check server logs:**
   - Should see: `✅ Gemini AI initialized successfully`
   - If not, check API key format

4. **Test API directly:**
   ```bash
   curl -X POST http://localhost:5000/api/llm/invoke \
     -H "Content-Type: application/json" \
     -d "{\"prompt\": \"Hello\"}"
   ```

### Scanner Still Duplicated

1. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for errors

3. **Verify component:**
   - Check `client/src/components/BarcodeScanner.jsx`
   - Should have CSS to hide default box

### Product Analysis Not Working

1. **Check LLM endpoint:**
   - Test with curl (see above)
   - Check server logs for errors

2. **Check image upload:**
   - Verify file uploads work
   - Check `server/uploads/` directory

3. **Check API response:**
   - Look in browser Network tab
   - Check response from `/api/llm/invoke`

## ✅ Verification Checklist

- [ ] `server/.env` file exists with `GEMINI_API_KEY`
- [ ] `client/.env` file exists with `VITE_API_URL`
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Database file (`server/database.json`) exists
- [ ] All 6 database tables exist
- [ ] Gemini AI initializes successfully
- [ ] Chatbot responds to questions
- [ ] Scanner shows only one frame (wider)
- [ ] Product analysis works

## 🎯 Quick Test

1. **Start servers:**
   ```bash
   # Terminal 1
   cd server && npm run dev
   
   # Terminal 2
   cd client && npm run dev
   ```

2. **Test chatbot:**
   - Open http://localhost:3000
   - Click chatbot
   - Ask: "What is a healthy diet?"
   - Should get response

3. **Test scanner:**
   - Go to Scan page
   - Verify only one wider frame
   - Test barcode scanning

4. **Test product analysis:**
   - Upload product image
   - Should analyze and create product

## 📞 Still Having Issues?

1. **Check server logs** for errors
2. **Check browser console** for errors
3. **Verify .env files** exist and have correct values
4. **Test API endpoints** directly with curl/Postman
5. **Check database.json** structure

All fixes have been applied. The application should now work correctly!

