@echo off
echo 🚀 Starting FoodScan Development Environment...
echo.

echo 🔵 Starting API Server...
start /B "npm run server:dev"

echo.
echo ⏳ Waiting for API server to initialize...
timeout /t 5 /nobreak >nul

echo.
echo 🟢 Starting Expo Development Server...
start /B "npx expo start --clear --port 8082"

echo.
echo ✅ Both servers are running!
echo 📱 Scan the QR code with Expo Go app
echo 🌐 Or open http://localhost:8082 in browser
pause
