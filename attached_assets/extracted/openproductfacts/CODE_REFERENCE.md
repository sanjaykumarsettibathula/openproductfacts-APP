# FoodScan AI - Quick Code Reference Guide

## 🎯 Quick Navigation: Functionality → Code Location

### Authentication & User Management

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| User Login | `client/src/pages/login.jsx` | `handleLogin()`, `checkAuth()` |
| User Registration | `client/src/pages/login.jsx` | `handleSignup()` |
| Session Management | `client/src/api/base44Client.js` | `getSessionId()`, `setSessionId()`, `clearSession()` |
| Protected Routes | `client/src/App.jsx` | `ProtectedRoute` component |
| Backend Auth | `server/server-alternative.js` | `/api/auth/login`, `/api/auth/register`, `/api/auth/me` |

### Product Scanning

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| Barcode Scanner | `client/src/components/BarcodeScanner.jsx` | `startScanner()`, `stopScanner()`, `handleScanSuccess()` |
| Scan Page | `client/src/pages/scan.jsx` | `handleScan()`, `handleImageCapture()`, `handleManualSubmit()` |
| Open Food Facts API | `client/src/pages/scan.jsx` | `fetchProductFromAPI()` |
| Image Analysis | `client/src/pages/scan.jsx` | `handleImageCapture()`, LLM invoke with image |
| Manual Entry | `client/src/pages/scan.jsx` | `handleManualSubmit()`, LLM invoke with text |

### Product Management

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| Product Creation | `client/src/pages/scan.jsx` | `base44.entities.Product.create()` |
| Product Display | `client/src/pages/productdetail.jsx` | Product detail page |
| Product List | `client/src/pages/history.jsx` | Scanned products list |
| Product API | `server/server-alternative.js` | `/api/products/*` endpoints |
| Product Card | `client/src/components/ProductCard.jsx` | Product card component |

### AI Chatbot

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| Chatbot Component | `client/src/components/ChatBot.jsx` | `handleSend()`, `loadUserData()`, `initializeChat()` |
| Health Info Extraction | `client/src/components/ChatBot.jsx` | `extractAndUpdateHealthInfo()` |
| LLM Integration | `server/server-alternative.js` | `/api/llm/invoke` endpoint |
| LLM Client | `client/src/api/base44Client.js` | `integrations.Core.InvokeLLM()` |

### Health Tracking

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| Profile Management | `client/src/pages/profile.jsx` | `handleSave()`, `handleFieldChange()`, `markAllergyForRemoval()` |
| Health Updates | `client/src/components/ChatBot.jsx` | `extractAndUpdateHealthInfo()`, `updatePreferencesMutation` |
| Backend Health API | `server/server-alternative.js` | `/api/user-preferences/:id/update-health` |
| User Preferences | `client/src/api/base44Client.js` | `entities.UserPreference.*` methods |

### Product Comparison

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| Compare Page | `client/src/pages/compare.jsx` | `compareNutrition()`, `ComparisonRow` component |
| Product Selection | `client/src/pages/compare.jsx` | Product search and selection |

### Product Lists

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| Lists Page | `client/src/pages/lists.jsx` | `handleCreate()`, `getRandomColor()`, `getIconForList()` |
| Lists API | `server/server-alternative.js` | `/api/product-lists/*` endpoints |
| Lists Client | `client/src/api/base44Client.js` | `entities.ProductList.*` methods |

### Scan History

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| History Page | `client/src/pages/history.jsx` | `handleSelectAll()`, `handleDelete()`, `exportData()` |
| Scanned Products API | `server/server-alternative.js` | `/api/scanned-products/*` endpoints |
| Scanned Products Client | `client/src/api/base44Client.js` | `entities.ScannedProduct.*` methods |

### UI Components

| Component | File Location | Purpose |
|-----------|---------------|---------|
| BarcodeScanner | `client/src/components/BarcodeScanner.jsx` | Barcode scanning |
| ChatBot | `client/src/components/ChatBot.jsx` | AI chatbot |
| ProductCard | `client/src/components/ProductCard.jsx` | Product card display |
| NutriScoreBadge | `client/src/components/NutriScoreBadge.jsx` | Nutri-Score badge |
| EcoScoreBadge | `client/src/components/EcoScoreBadge.jsx` | Eco-Score badge |
| Layout | `client/src/layout.jsx` | App layout with navigation |

### Database Operations

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| Database Read/Write | `server/server-alternative.js` | `readDB()`, `writeDB()` |
| JSON Parsing | `server/server-alternative.js` | `parseJSONField()`, `stringifyJSONField()` |
| Database Init | `server/server-alternative.js` | `initDatabase()` |
| Database File | `server/database.json` | JSON database file |

### API Endpoints

| Endpoint | File Location | Purpose |
|----------|---------------|---------|
| `/api/auth/*` | `server/server-alternative.js` | Authentication |
| `/api/products/*` | `server/server-alternative.js` | Product management |
| `/api/scanned-products/*` | `server/server-alternative.js` | Scan history |
| `/api/product-lists/*` | `server/server-alternative.js` | Product lists |
| `/api/user-preferences/*` | `server/server-alternative.js` | User preferences |
| `/api/llm/invoke` | `server/server-alternative.js` | Gemini AI |
| `/api/upload` | `server/server-alternative.js` | File upload |
| `/api/chat-conversations/*` | `server/server-alternative.js` | Chat history |

### File Upload

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| File Upload Client | `client/src/api/base44Client.js` | `integrations.Core.UploadFile()` |
| File Upload Server | `server/server-alternative.js` | `/api/upload` endpoint (Multer) |
| Image Analysis | `client/src/pages/scan.jsx` | `handleImageCapture()` |
| Health Report Upload | `client/src/pages/profile.jsx` | `handleHealthReportUpload()` |

### Navigation & Routing

| Functionality | File Location | Key Functions/Methods |
|--------------|---------------|----------------------|
| App Routing | `client/src/App.jsx` | Route definitions |
| Navigation | `client/src/layout.jsx` | Bottom navigation, mobile menu |
| Page URLs | `client/src/utils.js` | `createPageUrl()` helper |

### State Management

| Functionality | File Location | Technology |
|---------------|---------------|------------|
| Data Fetching | All pages | TanStack Query (React Query) |
| API State | `client/src/api/base44Client.js` | Fetch API |
| Local State | All components | React useState |
| Session State | `client/src/api/base44Client.js` | localStorage |

---

## 🔍 Finding Specific Code

### "Where is the barcode scanning logic?"
**Answer:** `client/src/components/BarcodeScanner.jsx` - Contains camera access, scanning logic, and manual entry.

### "Where does the chatbot extract health information?"
**Answer:** `client/src/components/ChatBot.jsx` - Function `extractAndUpdateHealthInfo()` (line 107-232).

### "Where is the product creation after scanning?"
**Answer:** `client/src/pages/scan.jsx` - Functions `fetchProductFromAPI()`, `handleImageCapture()`, `handleManualSubmit()`.

### "Where is the Gemini AI integration?"
**Answer:** 
- Backend: `server/server-alternative.js` - `/api/llm/invoke` endpoint (line 1102-1296)
- Frontend: `client/src/api/base44Client.js` - `integrations.Core.InvokeLLM()` method

### "Where are user preferences stored?"
**Answer:** 
- Database: `server/database.json` - `userPreferences` table
- Backend: `server/server-alternative.js` - `/api/user-preferences/*` endpoints
- Frontend: `client/src/pages/profile.jsx` - Profile management

### "Where is the Open Food Facts API called?"
**Answer:** `client/src/pages/scan.jsx` - Function `fetchProductFromAPI()` (line 318-419).

### "Where is the session management?"
**Answer:** 
- Frontend: `client/src/api/base44Client.js` - Session functions (getSessionId, setSessionId, clearSession)
- Backend: `server/server-alternative.js` - Session Map and auth endpoints

### "Where is the product comparison logic?"
**Answer:** `client/src/pages/compare.jsx` - Function `compareNutrition()` and `ComparisonRow` component.

### "Where are allergies updated from chatbot?"
**Answer:** `client/src/components/ChatBot.jsx` - Function `extractAndUpdateHealthInfo()` calls `base44.entities.UserPreference.updateHealth()`.

### "Where is the database initialized?"
**Answer:** `server/server-alternative.js` - Function `initDatabase()` (line 131-177).

---

## 📝 Common Tasks & Code Locations

### Adding a New API Endpoint
1. Add route in `server/server-alternative.js`
2. Add method in `client/src/api/base44Client.js`
3. Use in component with TanStack Query

### Adding a New Page
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.jsx`
3. Add navigation item in `client/src/layout.jsx`
4. Add URL in `client/src/utils.js`

### Adding a New Component
1. Create component in `client/src/components/`
2. Import and use in pages
3. Add to UI components if reusable

### Modifying Database Schema
1. Update `initDatabase()` in `server/server-alternative.js`
2. Update parse/stringify functions if needed
3. Update API endpoints to handle new fields

### Modifying AI Prompts
1. Chatbot: `client/src/components/ChatBot.jsx` - `handleSend()` function
2. Image Analysis: `client/src/pages/scan.jsx` - `handleImageCapture()` function
3. Manual Entry: `client/src/pages/scan.jsx` - `handleManualSubmit()` function
4. Health Extraction: `client/src/components/ChatBot.jsx` - `extractAndUpdateHealthInfo()` function

---

## 🚀 Quick Start for Common Changes

### Change AI Model
**File:** `server/server-alternative.js`
**Line:** 36
**Change:** `const modelName = 'gemini-2.0-flash-001';` to desired model

### Change API URL
**File:** `client/src/api/base44Client.js`
**Line:** 3
**Change:** `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';`

### Change Port
**File:** `server/server-alternative.js`
**Line:** 18
**Change:** `const PORT = process.env.PORT || 5000;`
**Or:** Set in `server/.env` file

### Add New Nutrition Field
1. Update product schema in `server/server-alternative.js`
2. Update `nutritional_info` object in scan pages
3. Update product detail display
4. Update database initialization

### Add New Allergy
1. User mentions in chatbot → Auto-extracted
2. Or manually add in `client/src/pages/profile.jsx`
3. Stored in `userPreferences.allergies` (comma-separated string)

---

## 🎓 Code Patterns

### API Call Pattern
```javascript
// In component
const { data, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: async () => {
    return await base44.entities.EntityName.method();
  },
});
```

### Mutation Pattern
```javascript
const mutation = useMutation({
  mutationFn: async (data) => {
    return await base44.entities.EntityName.create(data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['key'] });
  },
});
```

### LLM Invocation Pattern
```javascript
const response = await base44.integrations.Core.InvokeLLM({
  prompt: 'Your prompt here',
  response_json_schema: { /* schema */ },
  file_urls: [/* image URLs */],
});
```

### Session Management Pattern
```javascript
// Get session
const sessionId = getSessionId();

// Set session (after login)
setSessionId(response.sessionId);

// Clear session (after logout)
clearSession();
```

---

**End of Reference Guide**

Use this guide to quickly locate code for specific functionality. For detailed explanations, refer to `PROJECT_ANALYSIS.md`.


