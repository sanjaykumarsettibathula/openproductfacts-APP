# FoodScan AI - AI-Powered Nutrition Scanner

A full-stack web and mobile application for scanning food products, analyzing nutritional content, and getting AI-powered health insights with automatic health data tracking.

## 🚀 Features

- 📱 **Barcode Scanning**: Scan product barcodes using html5-qrcode library
- 🤖 **AI Nutrition Assistant**: Get personalized nutrition advice using Gemini AI
- 📊 **Health Scores**: View Nutri-Score and Eco-Score for products
- 💬 **Smart Chatbot**: Automatically tracks and stores health information from conversations
- 📝 **Product History**: Track all scanned products with search and filter
- 📋 **Custom Lists**: Organize products into custom lists
- 👤 **User Profile**: Manage health preferences, allergies, and dietary restrictions
- 🔍 **Product Comparison**: Compare products to find healthier alternatives
- 🏥 **Health Tracking**: Automatic extraction of allergies and conditions from chatbot conversations

## 🏗️ Project Structure

```
base4/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Backend (Express + Node.js)
│   ├── server-alternative.js  # Main server
│   ├── package.json
│   └── database.json      # JSON database
│
└── package.json           # Root package.json
```

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Gemini API key (for AI features)

## 🔧 Setup

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

### 2. Environment Variables

**Backend (`server/.env`):**
```env
PORT=5000
GEMINI_API_KEY=AIzaSyA_4TxLvM05ed-laTiPTIwl9IkZ9fdJCms
NODE_ENV=development
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

**Note:** Copy `env.example` files and update with your actual values.

### 3. Start the Application

**Option 1: Run Both Servers Together**
```bash
npm run dev
```

**Option 2: Run Separately**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 🎯 Key Features

### Barcode Scanning

- Real-time barcode scanning using html5-qrcode
- Automatic product lookup
- Manual barcode entry option
- Camera permission handling

### Chatbot Health Tracking

The chatbot automatically:
- Extracts health information from conversations
- Detects allergies and conditions
- Updates user profile automatically
- Provides personalized recommendations

**Example:**
```
User: "I'm having a rash on my neck, I'm having this allergy from yesterday"

Chatbot: "You should avoid milk, peanuts etc..."

[System]: ✅ Profile Updated: New allergies added: milk, peanuts.
```

### User Health Management

- Store health data during signup
- Update health info in profile
- Automatic updates from chatbot
- Delete allergies/conditions when resolved

## 🗄️ Database

The application uses a JSON-based database (`server/database.json`) by default. No setup required!

### Schema

- **users**: User accounts
- **products**: Product catalog
- **scannedProducts**: User scan history
- **productLists**: Custom product lists
- **userPreferences**: Health data and preferences

## 🔌 API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### User Preferences (Health Data)
- `GET /api/user-preferences` - List preferences
- `POST /api/user-preferences` - Create preferences
- `PUT /api/user-preferences/:id` - Update preferences
- `POST /api/user-preferences/:id/update-health` - Update health from chatbot

### LLM
- `POST /api/llm/invoke` - Invoke Gemini AI

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- html5-qrcode
- Framer Motion
- Sonner

### Backend
- Node.js
- Express.js
- Gemini AI (@google/generative-ai)
- JSON Database
- Multer (file uploads)

## 📚 Documentation

- **Complete Setup**: See `SETUP_COMPLETE.md`
- **Backend Setup**: See `BACKEND_SETUP.md`
- **Frontend Setup**: See `FRONTEND_SETUP.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md`

## 🐛 Troubleshooting

### Backend Issues
- Check Gemini API key in `.env`
- Verify database.json exists
- Check server logs

### Frontend Issues
- Check camera permissions
- Verify backend is running
- Check browser console

## 🔐 Security

- Never commit `.env` files
- Use environment variables for secrets
- Hash passwords in production
- Use HTTPS in production
- Add JWT authentication for production

## 📝 License

This project is for educational purposes.

## 🙏 Acknowledgments

- Gemini AI by Google
- html5-qrcode library
- Open Food Facts API

## 🎉 Getting Started

1. Clone the repository
2. Install dependencies
3. Set up environment variables
4. Start the servers
5. Open http://localhost:3000

Enjoy using FoodScan AI! 🚀
