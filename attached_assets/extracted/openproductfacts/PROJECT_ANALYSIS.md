# FoodScan AI - Complete Project Analysis

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Backend Analysis](#backend-analysis)
4. [Frontend Analysis](#frontend-analysis)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Key Features & Functionality](#key-features--functionality)
8. [Component Details](#component-details)
9. [Data Flow](#data-flow)
10. [Configuration & Setup](#configuration--setup)

---

## 🎯 Project Overview

**FoodScan AI** is a full-stack web application for scanning food products, analyzing nutritional content, and providing AI-powered health insights with automatic health data tracking.

### Core Purpose
- Scan food products via barcode, image, or manual entry
- Get AI-powered nutrition analysis using Gemini AI
- Track user health data and preferences
- Provide personalized recommendations based on allergies and conditions
- Compare products to make healthier choices

### Tech Stack
- **Frontend**: React 18, Vite, React Router, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express.js
- **AI**: Google Gemini AI (gemini-2.0-flash-001)
- **Database**: JSON-based file system (database.json)
- **File Upload**: Multer
- **Authentication**: Session-based (simple implementation)

---

## 🏗️ Architecture

### Project Structure
```
base4/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/           # API client (base44Client.js)
│   │   ├── components/    # React components
│   │   │   ├── ui/        # UI components (shadcn/ui)
│   │   │   ├── BarcodeScanner.jsx
│   │   │   ├── ChatBot.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── NutriScoreBadge.jsx
│   │   │   └── EcoScoreBadge.jsx
│   │   ├── pages/         # Page components
│   │   │   ├── home.jsx
│   │   │   ├── scan.jsx
│   │   │   ├── history.jsx
│   │   │   ├── lists.jsx
│   │   │   ├── profile.jsx
│   │   │   ├── productdetail.jsx
│   │   │   ├── compare.jsx
│   │   │   └── login.jsx
│   │   ├── App.jsx        # Main app with routing
│   │   ├── layout.jsx     # Layout with navigation
│   │   └── main.jsx       # Entry point
│   └── package.json
│
├── server/                 # Backend (Express + Node.js)
│   ├── server-alternative.js  # Main server file
│   ├── database.json      # JSON database
│   ├── uploads/           # Uploaded files directory
│   └── package.json
│
└── package.json           # Root package.json
```

### Architecture Pattern
- **Client-Server Architecture**: RESTful API communication
- **Session-based Auth**: Simple session management with localStorage
- **JSON Database**: File-based storage (can be replaced with SQL/NoSQL)
- **AI Integration**: Gemini AI for nutrition analysis and chatbot

---

## 🔧 Backend Analysis

### Main Server File: `server/server-alternative.js`

#### Key Responsibilities:
1. **Express Server Setup**
   - Port: 5000 (configurable via .env)
   - CORS enabled
   - JSON body parsing
   - File upload handling (Multer)

2. **Gemini AI Initialization**
   - Model: `gemini-2.0-flash-001` (latest fast model)
   - Initialization on server start
   - Fallback to `gemini-2.5-pro` if flash fails
   - Error handling and logging

3. **Database Management**
   - JSON-based file storage (`database.json`)
   - Auto-initialization of tables
   - Helper functions: `readDB()`, `writeDB()`, `parseJSONField()`, `stringifyJSONField()`

4. **Session Management**
   - In-memory session storage (Map)
   - Session ID in headers (`X-Session-Id` or `Authorization`)
   - Session creation on login/register

#### Database Tables:
1. **users** - User accounts
2. **products** - Product catalog
3. **scannedProducts** - User scan history
4. **productLists** - Custom product lists
5. **userPreferences** - Health data and preferences
6. **chatConversations** - Chat history (implemented but not actively used)

#### Key Functions:

**Authentication Endpoints:**
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

**Product Endpoints:**
- `GET /api/products` - List products (with sorting and pagination)
- `GET /api/products/filter` - Filter products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

**Scanned Products Endpoints:**
- `GET /api/scanned-products` - List scanned products
- `GET /api/scanned-products/filter` - Filter scanned products
- `POST /api/scanned-products` - Create scanned product record
- `DELETE /api/scanned-products/:id` - Delete scanned product

**Product Lists Endpoints:**
- `GET /api/product-lists` - List product lists
- `GET /api/product-lists/filter` - Filter product lists
- `POST /api/product-lists` - Create product list
- `PUT /api/product-lists/:id` - Update product list
- `DELETE /api/product-lists/:id` - Delete product list

**User Preferences Endpoints:**
- `GET /api/user-preferences` - List user preferences
- `GET /api/user-preferences/filter` - Filter user preferences
- `POST /api/user-preferences` - Create/update user preferences
- `PUT /api/user-preferences/:id` - Update user preferences
- `POST /api/user-preferences/:id/update-health` - Update health from chatbot

**LLM Endpoint:**
- `POST /api/llm/invoke` - Invoke Gemini AI
  - Parameters: `prompt`, `file_urls`, `response_json_schema`, `add_context_from_internet`
  - Returns: JSON object with `text` property or structured JSON

**File Upload:**
- `POST /api/upload` - Upload file (Multer)
- `GET /uploads/:filename` - Serve uploaded files

**Chat Conversations:**
- `GET /api/chat-conversations` - List conversations
- `POST /api/chat-conversations` - Create conversation
- `PUT /api/chat-conversations/:id` - Update conversation
- `DELETE /api/chat-conversations/:id` - Delete conversation

---

## 💻 Frontend Analysis

### Main Files:

#### 1. `client/src/App.jsx`
- **Purpose**: Main app component with routing
- **Features**:
  - Protected routes (authentication required)
  - Route definitions for all pages
  - Authentication check on mount
  - Redirect to login if not authenticated

**Routes:**
- `/login` - Login page (public)
- `/` - Home page (protected)
- `/scan` - Scan page (protected)
- `/history` - History page (protected)
- `/lists` - Lists page (protected)
- `/profile` - Profile page (protected)
- `/product` - Product detail page (protected)
- `/compare` - Compare page (protected)

#### 2. `client/src/main.jsx`
- **Purpose**: Entry point
- **Features**:
  - React Router setup
  - TanStack Query setup (React Query)
  - Toast notifications (Sonner)
  - Query client configuration

#### 3. `client/src/api/base44Client.js`
- **Purpose**: API client for backend communication
- **Features**:
  - Session management (localStorage)
  - API request wrapper
  - File upload handler
  - Entity methods (Product, ScannedProduct, ProductList, UserPreference, ChatConversation)
  - LLM integration methods

**Key Methods:**
- `auth.me()` - Get current user
- `auth.login(email, password)` - Login
- `auth.register(email, password, full_name)` - Register
- `auth.logout()` - Logout
- `entities.Product.list()` - List products
- `entities.Product.create()` - Create product
- `entities.ScannedProduct.create()` - Create scanned product
- `entities.UserPreference.filter()` - Filter user preferences
- `entities.UserPreference.updateHealth()` - Update health from chatbot
- `integrations.Core.InvokeLLM()` - Invoke Gemini AI
- `integrations.Core.UploadFile()` - Upload file

#### 4. `client/src/layout.jsx`
- **Purpose**: Layout component with navigation
- **Features**:
  - Mobile header with menu
  - Bottom navigation bar
  - Active route highlighting
  - Scan button (special styling)
  - Dark theme styles

**Navigation Items:**
- Home
- History
- Scan (special button)
- Lists
- Profile

---

## 📄 Page Components

### 1. `client/src/pages/home.jsx`
**Purpose**: Dashboard/home page

**Features:**
- Welcome banner with user name
- Quick stats (Scanned, Favorites, Safe, Eco)
- Recent scans display (last 5)
- Quick actions (Compare Products, Set Preferences)
- Getting started guide (if no scans)
- ChatBot integration

**Data Fetching:**
- Recent scans (last 5)
- User preferences
- Favorite lists

**Key Functions:**
- `checkOnboarding()` - Check if user completed onboarding
- Calculates safe products (Nutri-Score A/B)
- Calculates eco-friendly products (Eco-Score A/B)

### 2. `client/src/pages/scan.jsx`
**Purpose**: Product scanning page

**Features:**
- Three scanning modes:
  1. **Barcode Scanner** - Camera-based barcode scanning
  2. **Image Capture** - AI-powered image analysis
  3. **Manual Entry** - Text-based product description

**Barcode Scanning:**
- Uses `html5-qrcode` library
- Camera access handling
- Manual barcode entry option
- Open Food Facts API integration

**Image Analysis:**
- File upload
- Gemini AI analysis
- Extracts: product name, brand, ingredients, allergens, nutritional info, Nutri-Score, packaging
- Creates product record

**Manual Entry:**
- Text description input
- AI analysis of description
- Creates product with estimated values

**Key Functions:**
- `handleScan(barcode)` - Process barcode scan
- `handleImageCapture(file)` - Process image upload
- `handleManualSubmit()` - Process manual entry
- `fetchProductFromAPI(barcode)` - Fetch from Open Food Facts
- `saveToHistory(product)` - Save to scan history

### 3. `client/src/pages/history.jsx`
**Purpose**: Scan history page

**Features:**
- List all scanned products
- Search functionality
- Filter by Nutri-Score (A-E)
- Bulk selection and deletion
- Export to CSV
- Product cards with scores

**Key Functions:**
- `handleSelectAll()` - Select/deselect all products
- `handleDelete()` - Delete selected products
- `exportData()` - Export to CSV
- `filteredProducts` - Filtered product list

### 4. `client/src/pages/lists.jsx`
**Purpose**: Product lists management

**Features:**
- Create custom lists
- List all user lists
- Delete lists
- View list details
- Color-coded lists
- Favorite lists

**Key Functions:**
- `handleCreate()` - Create new list
- `getRandomColor()` - Assign random color to list
- `getIconForList()` - Get icon based on list name
- `handleViewList()` - Navigate to list view

### 5. `client/src/pages/profile.jsx`
**Purpose**: User profile and settings

**Features:**
- Basic information (age, gender, height, weight)
- Allergies management (add/remove)
- Conditions management
- Health report upload
- Location settings
- App settings (dark mode, notifications, language)
- Save changes functionality

**Key Functions:**
- `handleSave()` - Save profile changes
- `handleFieldChange()` - Update field value
- `markAllergyForRemoval()` - Mark allergy for removal
- `undoRemoveAllergy()` - Undo allergy removal
- `toggleCondition()` - Toggle condition
- `handleHealthReportUpload()` - Upload health report
- `handleLogout()` - Logout user

**Health Data:**
- Allergies (comma-separated string)
- Conditions (array)
- Dietary restrictions (array)
- Nutritional goals (object)
- Health report URL

### 6. `client/src/pages/login.jsx`
**Purpose**: Authentication page

**Features:**
- Login form
- Signup form
- Health data collection during signup
- Health report upload during signup
- Condition selection
- Auto-login after signup

**Signup Fields:**
- Email, Password
- Age, Gender, Height, Weight
- Allergies
- Conditions
- Notes
- Health report (optional)

**Key Functions:**
- `handleLogin()` - Login user
- `handleSignup()` - Register user
- `toggleCondition()` - Toggle condition selection
- `checkAuth()` - Check if already logged in

### 7. `client/src/pages/productdetail.jsx`
**Purpose**: Product detail page

**Features:**
- Product image and basic info
- Nutri-Score and Eco-Score badges
- AI health insight
- Nutritional facts table
- Nutri-Score breakdown
- Ingredients list
- Allergens display
- Environmental impact
- Price display and editing
- Comparison capabilities

**Key Functions:**
- `generateAIInsight()` - Generate AI health insight
- `fetchPriceEstimate()` - Fetch price estimate from AI
- `handleUpdatePrice()` - Update product price
- `getLevel()` - Get nutrient level (low/moderate/high)

**Tabs:**
1. **Nutrition** - Nutritional facts and Nutri-Score breakdown
2. **Ingredients** - Complete ingredients list
3. **Environment** - Eco-Score and packaging info
4. **Info** - Barcode, categories, countries

### 8. `client/src/pages/compare.jsx`
**Purpose**: Product comparison page

**Features:**
- Select two products
- Side-by-side comparison
- Nutritional comparison table
- Winner highlighting
- Visual comparison with icons

**Key Functions:**
- `compareNutrition(key)` - Compare specific nutrient
- `ComparisonRow` - Display comparison row

**Comparison Metrics:**
- Energy (kcal)
- Fat, Saturated Fat
- Carbohydrates, Sugars
- Fiber, Protein
- Salt

---

## 🧩 Component Details

### 1. `client/src/components/BarcodeScanner.jsx`
**Purpose**: Barcode scanning component

**Features:**
- Camera-based barcode scanning
- Manual barcode entry
- Custom scanning frame (wider for barcodes)
- Error handling
- Loading states
- Camera permission handling

**Key Functions:**
- `startScanner()` - Start camera scanner
- `stopScanner()` - Stop camera scanner
- `handleScanSuccess()` - Handle successful scan
- `handleManualSubmit()` - Handle manual entry
- `retryScanner()` - Retry camera access

**Configuration:**
- FPS: 20
- Aspect ratio: 16:9
- Scanner box: 85% width, 30% height
- Hidden default html5-qrcode overlay

### 2. `client/src/components/ChatBot.jsx`
**Purpose**: AI nutrition assistant chatbot

**Features:**
- Floating chat button
- Chat window with messages
- User health profile context
- Automatic health info extraction
- Product context support
- Personalized responses
- System messages for profile updates

**Key Functions:**
- `loadUserData()` - Load user and preferences
- `initializeChat()` - Initialize chat with welcome message
- `handleSend()` - Send message to AI
- `extractAndUpdateHealthInfo()` - Extract health info from conversation
- `updatePreferencesMutation` - Update user preferences

**Health Info Extraction:**
- Analyzes user and assistant messages
- Extracts new allergies and conditions
- Updates user profile automatically
- Shows system message on update

**Context Building:**
- User health profile (allergies, conditions, dietary restrictions)
- Current product context (if viewing product)
- Personalized advice based on profile

### 3. `client/src/components/ProductCard.jsx`
**Purpose**: Product card component

**Features:**
- Product image
- Product name and brand
- Nutri-Score and Eco-Score badges
- Click to view details
- Responsive design

### 4. `client/src/components/NutriScoreBadge.jsx`
**Purpose**: Nutri-Score badge component

**Features:**
- Color-coded badges (A-E)
- Size variants (sm, md, lg)
- Gradient backgrounds
- Score display

### 5. `client/src/components/EcoScoreBadge.jsx`
**Purpose**: Eco-Score badge component

**Features:**
- Color-coded badges (A-E)
- Size variants (sm, md, lg)
- Environmental impact rating

---

## 🗄️ Database Schema

### 1. **users** Table
```json
{
  "id": "string (nanoid)",
  "email": "string",
  "full_name": "string",
  "password": "string (plain text - should be hashed in production)",
  "health_data": "object",
  "created_date": "ISO date string"
}
```

### 2. **products** Table
```json
{
  "id": "string (nanoid)",
  "barcode": "string",
  "name": "string",
  "brand": "string",
  "image_url": "string",
  "nutri_score": "string (A-E or unknown)",
  "eco_score": "string (A-E or unknown)",
  "nova_group": "number (0-4)",
  "serving_size": "string",
  "categories": "JSON string array",
  "ingredients": "JSON string array",
  "allergens": "JSON string array",
  "nutritional_info": "JSON object",
  "nutri_score_details": "JSON object",
  "packaging": "JSON object",
  "countries_sold": "JSON string array",
  "price": "number",
  "currency": "string",
  "created_date": "ISO date string",
  "updated_date": "ISO date string"
}
```

### 3. **scannedProducts** Table
```json
{
  "id": "string (nanoid)",
  "product_id": "string",
  "barcode": "string",
  "product_name": "string",
  "product_brand": "string",
  "product_image": "string",
  "nutri_score": "string",
  "eco_score": "string",
  "scanned_at": "ISO date string",
  "created_date": "ISO date string"
}
```

### 4. **productLists** Table
```json
{
  "id": "string (nanoid)",
  "name": "string",
  "description": "string",
  "product_ids": "JSON string array",
  "is_favorite": "number (0 or 1)",
  "color": "string (hex color)",
  "created_date": "ISO date string",
  "updated_date": "ISO date string"
}
```

### 5. **userPreferences** Table
```json
{
  "id": "string (nanoid)",
  "created_by": "string (user email)",
  "age": "number or null",
  "gender": "string (male/female/other)",
  "height_cm": "number or null",
  "weight_kg": "number or null",
  "allergies": "string (comma-separated)",
  "conditions": "JSON string array",
  "dietary_restrictions": "JSON string array",
  "nutritional_goals": "JSON object",
  "blacklisted_ingredients": "JSON string array",
  "location": "JSON object",
  "preferred_stores": "JSON string array",
  "dark_mode": "number (0 or 1)",
  "language": "string",
  "notifications_enabled": "number (0 or 1)",
  "health_report_url": "string",
  "notes": "string",
  "created_date": "ISO date string",
  "updated_date": "ISO date string"
}
```

### 6. **chatConversations** Table
```json
{
  "id": "string (nanoid)",
  "user_id": "string",
  "messages": "JSON array",
  "created_at": "ISO date string",
  "updated_at": "ISO date string"
}
```

---

## 🔄 Data Flow

### 1. **Product Scanning Flow**
```
User scans barcode
  ↓
BarcodeScanner component captures barcode
  ↓
Scan page calls handleScan()
  ↓
Check if product exists in database
  ↓
If exists: Navigate to product detail
If not: Fetch from Open Food Facts API
  ↓
Create product record in database
  ↓
Save to scannedProducts table
  ↓
Navigate to product detail page
```

### 2. **Image Analysis Flow**
```
User uploads image
  ↓
File uploaded to server (/api/upload)
  ↓
Image URL returned
  ↓
LLM invoked with image URL
  ↓
Gemini AI analyzes image
  ↓
Extracts product information (JSON)
  ↓
Create product record
  ↓
Save to scannedProducts
  ↓
Navigate to product detail
```

### 3. **Chatbot Health Tracking Flow**
```
User sends message to chatbot
  ↓
ChatBot loads user preferences
  ↓
Builds context with health profile
  ↓
Sends message to LLM with context
  ↓
Gemini AI responds with personalized advice
  ↓
Response displayed to user
  ↓
Background process: Extract health info
  ↓
LLM analyzes conversation for new allergies/conditions
  ↓
If new info found: Update user preferences
  ↓
Show system message about profile update
```

### 4. **Authentication Flow**
```
User visits app
  ↓
App.jsx checks authentication
  ↓
Calls /api/auth/me
  ↓
If authenticated: Show app
If not: Redirect to login
  ↓
User logs in
  ↓
Session created on server
  ↓
Session ID stored in localStorage
  ↓
Redirect to home page
```

---

## ⚙️ Configuration & Setup

### Environment Variables

**Backend (`server/.env`):**
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

### Dependencies

**Backend:**
- express - Web framework
- cors - CORS middleware
- multer - File upload
- dotenv - Environment variables
- @google/generative-ai - Gemini AI
- nanoid - ID generation

**Frontend:**
- react - UI library
- react-router-dom - Routing
- @tanstack/react-query - Data fetching
- tailwindcss - Styling
- html5-qrcode - Barcode scanning
- framer-motion - Animations
- sonner - Toast notifications
- lucide-react - Icons

### Running the Application

**Development:**
```bash
# Install dependencies
npm run install:all

# Start both servers
npm run dev

# Or start separately
cd server && npm run dev
cd client && npm run dev
```

**Production:**
```bash
# Build frontend
cd client && npm run build

# Start backend
cd server && npm start
```

---

## 🎯 Key Features & Functionality

### 1. **Barcode Scanning**
- Camera-based barcode scanning
- Manual barcode entry
- Open Food Facts API integration
- Automatic product lookup

### 2. **Image Analysis**
- AI-powered image analysis
- Extracts product information from images
- Ingredient list extraction
- Nutritional information extraction

### 3. **Manual Entry**
- Text-based product description
- AI analysis of description
- Estimated nutritional values
- Product creation

### 4. **AI Chatbot**
- Personalized nutrition advice
- Health profile context
- Automatic health tracking
- Product-specific advice

### 5. **Health Tracking**
- Automatic allergy detection
- Condition tracking
- Profile updates from chatbot
- Manual profile management

### 6. **Product Comparison**
- Side-by-side comparison
- Nutritional comparison
- Winner highlighting
- Visual comparison

### 7. **Product Lists**
- Custom product lists
- Favorite lists
- Color-coded lists
- List management

### 8. **Scan History**
- All scanned products
- Search functionality
- Filter by Nutri-Score
- Bulk operations
- CSV export

### 9. **User Profile**
- Health information
- Allergies management
- Conditions management
- Health report upload
- Settings management

### 10. **Product Details**
- Complete product information
- Nutritional facts
- Ingredients list
- Allergens display
- Environmental impact
- AI health insights
- Price management

---

## 🔍 Code Locations for Specific Functionality

### Authentication
- **Login**: `client/src/pages/login.jsx`
- **Auth Check**: `client/src/App.jsx` (ProtectedRoute)
- **Session Management**: `client/src/api/base44Client.js`
- **Backend Auth**: `server/server-alternative.js` (lines 214-343)

### Barcode Scanning
- **Scanner Component**: `client/src/components/BarcodeScanner.jsx`
- **Scan Page**: `client/src/pages/scan.jsx`
- **Open Food Facts Integration**: `client/src/pages/scan.jsx` (fetchProductFromAPI)

### Image Analysis
- **Image Upload**: `client/src/pages/scan.jsx` (handleImageCapture)
- **AI Analysis**: `server/server-alternative.js` (LLM endpoint)
- **File Upload**: `server/server-alternative.js` (upload endpoint)

### Chatbot
- **ChatBot Component**: `client/src/components/ChatBot.jsx`
- **Health Extraction**: `client/src/components/ChatBot.jsx` (extractAndUpdateHealthInfo)
- **LLM Integration**: `server/server-alternative.js` (LLM endpoint)

### Health Tracking
- **Profile Management**: `client/src/pages/profile.jsx`
- **Health Updates**: `client/src/components/ChatBot.jsx` (extractAndUpdateHealthInfo)
- **Backend Health Update**: `server/server-alternative.js` (update-health endpoint)

### Product Management
- **Product Creation**: `client/src/pages/scan.jsx`
- **Product Display**: `client/src/pages/productdetail.jsx`
- **Product List**: `client/src/pages/history.jsx`
- **Backend Product API**: `server/server-alternative.js` (products endpoints)

### Database Operations
- **Database Functions**: `server/server-alternative.js` (readDB, writeDB, parseJSONField, stringifyJSONField)
- **Database File**: `server/database.json`
- **Initialization**: `server/server-alternative.js` (initDatabase)

### API Client
- **API Methods**: `client/src/api/base44Client.js`
- **Session Management**: `client/src/api/base44Client.js` (getSessionId, setSessionId)
- **Request Wrapper**: `client/src/api/base44Client.js` (apiRequest)

---

## 🚀 Future Improvements

### Security
- [ ] Hash passwords (bcrypt)
- [ ] JWT authentication
- [ ] HTTPS in production
- [ ] Input validation and sanitization
- [ ] Rate limiting

### Database
- [ ] Migrate to PostgreSQL/MongoDB
- [ ] Database migrations
- [ ] Connection pooling
- [ ] Backup system

### Features
- [ ] Product recommendations
- [ ] Meal planning
- [ ] Nutrition tracking
- [ ] Social sharing
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Push notifications

### Performance
- [ ] Image optimization
- [ ] Caching strategy
- [ ] Lazy loading
- [ ] Code splitting
- [ ] CDN for static assets

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] API tests

---

## 📝 Notes

### Important Considerations
1. **Passwords are stored in plain text** - Should be hashed in production
2. **Session storage is in-memory** - Will be lost on server restart
3. **JSON database** - Not suitable for production scale
4. **File uploads** - Stored locally, should use cloud storage in production
5. **API Key** - Should be stored securely, not in code
6. **Error Handling** - Basic error handling, should be improved
7. **Validation** - Minimal input validation, should be enhanced

### Known Issues
1. Scanner duplication issue (fixed with CSS)
2. Chatbot may fail if API key is invalid
3. Product analysis may fail for complex images
4. Price estimation may be inaccurate

### Best Practices
1. Always check authentication before accessing protected routes
2. Handle errors gracefully
3. Show loading states during API calls
4. Validate user input
5. Provide user feedback (toasts, messages)
6. Use React Query for data fetching and caching
7. Keep components small and focused
8. Use TypeScript for type safety (not implemented)

---

## 🎓 Learning Resources

### Technologies Used
- [React Documentation](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query)
- [Express.js](https://expressjs.com/)
- [Gemini AI](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [html5-qrcode](https://github.com/mebjas/html5-qrcode)

### Related APIs
- [Open Food Facts API](https://world.openfoodfacts.org/data)
- [Gemini API](https://ai.google.dev/docs)

---

**End of Analysis**

This document provides a comprehensive overview of the FoodScan AI project. For specific implementation details, refer to the source code files mentioned in each section.


