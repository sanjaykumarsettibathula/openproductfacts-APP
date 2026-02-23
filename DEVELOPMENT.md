# Development Commands

## 🚀 Running the Application

### **Start Both Servers (Recommended)**
```bash
npm start
```
This will run both the backend server and Expo development server in parallel with colored output:
- 🔵 **SERVER**: Backend API server on port 3001
- 🟢 **EXPO**: Expo development server

### **Individual Commands**
```bash
# Start only the backend server
npm run start:server-only

# Start only the Expo development server
npm run start:expo-only

# Original server command (still works)
npm run server:dev

# Original Expo command (still works)
npx expo start
```

## 📱 Development Workflow

1. **Single Command Setup**: Run `npm start` to start both servers
2. **Backend API**: Available at `http://localhost:3001`
3. **Expo Dev Server**: Available at `http://localhost:8081` (or as shown in terminal)
4. **Mobile App**: Scan QR code or run in simulator

## 🔧 Server Details

- **Backend Port**: 3001
- **Database**: MongoDB (configured in .env)
- **API Endpoints**: `http://localhost:3001/api/*`
- **Health Check**: `http://localhost:3001/api/health`

## 📝 Notes

- The `npm start` command uses `concurrently` to run both servers
- Each server output is color-coded for easy identification
- Both servers will restart automatically on file changes
- Press `Ctrl+C` twice to stop both servers
