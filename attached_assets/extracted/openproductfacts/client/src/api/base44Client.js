// Base44 API Client - Connects to backend API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Session management
const SESSION_KEY = 'foodscan_session_id';

function getSessionId() {
  return localStorage.getItem(SESSION_KEY);
}

function setSessionId(sessionId) {
  if (sessionId) {
    localStorage.setItem(SESSION_KEY, sessionId);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const sessionId = getSessionId();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    // Get response text first
    const responseText = await response.text();
    
    if (!response.ok) {
      // Try to parse as JSON for error details
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { error: response.statusText || `HTTP ${response.status}` };
      }
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    // Try to parse as JSON, but if it fails, return as string (for LLM text responses)
    try {
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch {
      // If not valid JSON, return as string (this handles LLM text responses)
      return responseText;
    }
  } catch (error) {
    console.error('API Request Error:', error);
    console.error('URL:', url);
    console.error('Error message:', error.message);
    throw error;
  }
}

async function apiUploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('File upload failed');
  }

  const data = await response.json();
  // Convert relative URL to absolute if needed
  if (data.file_url && data.file_url.startsWith('/')) {
    data.file_url = `${API_BASE_URL.replace('/api', '')}${data.file_url}`;
  }
  return data;
}

const base44 = {
  auth: {
    me: async () => {
      return await apiRequest('/auth/me');
    },
    login: async (email, password) => {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
      return response;
    },
    register: async (email, password, full_name) => {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: { email, password, full_name },
      });
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
      return response;
    },
    logout: async () => {
      const response = await apiRequest('/auth/logout', {
        method: 'POST',
      });
      clearSession();
      return response;
    },
  },
  entities: {
    Product: {
      list: async (sortBy = '-created_date', limit = 100) => {
        return await apiRequest(`/products?sortBy=${sortBy}&limit=${limit}`);
      },
      filter: async (filters) => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key]);
          }
        });
        return await apiRequest(`/products/filter?${params.toString()}`);
      },
      create: async (data) => {
        return await apiRequest('/products', {
          method: 'POST',
          body: data,
        });
      },
      update: async (id, data) => {
        return await apiRequest(`/products/${id}`, {
          method: 'PUT',
          body: data,
        });
      },
      delete: async (id) => {
        return await apiRequest(`/products/${id}`, {
          method: 'DELETE',
        });
      },
    },
    ScannedProduct: {
      list: async (sortBy = '-scanned_at', limit = 100) => {
        return await apiRequest(`/scanned-products?sortBy=${sortBy}&limit=${limit}`);
      },
      filter: async (filters) => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key]);
          }
        });
        return await apiRequest(`/scanned-products/filter?${params.toString()}`);
      },
      create: async (data) => {
        return await apiRequest('/scanned-products', {
          method: 'POST',
          body: data,
        });
      },
      update: async (id, data) => {
        return await apiRequest(`/scanned-products/${id}`, {
          method: 'PUT',
          body: data,
        });
      },
      delete: async (id) => {
        return await apiRequest(`/scanned-products/${id}`, {
          method: 'DELETE',
        });
      },
    },
    ProductList: {
      list: async (sortBy = '-created_date', limit = 100) => {
        return await apiRequest(`/product-lists?sortBy=${sortBy}&limit=${limit}`);
      },
      filter: async (filters) => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key]);
          }
        });
        return await apiRequest(`/product-lists/filter?${params.toString()}`);
      },
      create: async (data) => {
        return await apiRequest('/product-lists', {
          method: 'POST',
          body: data,
        });
      },
      update: async (id, data) => {
        return await apiRequest(`/product-lists/${id}`, {
          method: 'PUT',
          body: data,
        });
      },
      delete: async (id) => {
        return await apiRequest(`/product-lists/${id}`, {
          method: 'DELETE',
        });
      },
    },
    UserPreference: {
      list: async (sortBy = '-created_date', limit = 100) => {
        return await apiRequest(`/user-preferences?sortBy=${sortBy}&limit=${limit}`);
      },
      filter: async (filters) => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            params.append(key, filters[key]);
          }
        });
        return await apiRequest(`/user-preferences/filter?${params.toString()}`);
      },
      create: async (data) => {
        return await apiRequest('/user-preferences', {
          method: 'POST',
          body: data,
        });
      },
      update: async (id, data) => {
        return await apiRequest(`/user-preferences/${id}`, {
          method: 'PUT',
          body: data,
        });
      },
      updateHealth: async (id, { new_allergies, new_conditions }) => {
        return await apiRequest(`/user-preferences/${id}/update-health`, {
          method: 'POST',
          body: { new_allergies, new_conditions },
        });
      },
      delete: async (id) => {
        return await apiRequest(`/user-preferences/${id}`, {
          method: 'DELETE',
        });
      },
    },
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        return await apiUploadFile(file);
      },
      InvokeLLM: async ({ prompt, file_urls, response_json_schema, add_context_from_internet }) => {
        try {
          console.log('Calling LLM endpoint with:', { 
            hasPrompt: !!prompt, 
            promptLength: prompt?.length,
            hasSchema: !!response_json_schema 
          });
          
          const response = await apiRequest('/llm/invoke', {
            method: 'POST',
            body: {
              prompt,
              file_urls,
              response_json_schema,
              add_context_from_internet,
            },
          });
          
          console.log('LLM API response type:', typeof response);
          console.log('LLM API response:', response);
          
          // Handle error responses from backend
          if (response && typeof response === 'object' && response.error) {
            console.error('LLM Error from backend:', response.error);
            throw new Error(response.error || 'Failed to generate response');
          }
          
          // Backend returns { text: "..." } or just a string
          // Extract text from response
          if (typeof response === 'string') {
            // Direct string response (backwards compatibility)
            return response;
          } else if (response && typeof response === 'object' && response.text) {
            // Object with text property
            return response.text;
          } else {
            // Fallback: return response as is
            return response;
          }
        } catch (error) {
          console.error('LLM API Error:', error);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          throw error;
        }
      },
    },
  },
};

// Add ChatConversation entity
base44.entities.ChatConversation = {
  list: async (sortBy = '-created_at', limit = 50) => {
    return await apiRequest(`/chat-conversations?sortBy=${sortBy}&limit=${limit}`);
  },
  filter: async (filters) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    return await apiRequest(`/chat-conversations?${params.toString()}`);
  },
  create: async (data) => {
    return await apiRequest('/chat-conversations', {
      method: 'POST',
      body: data,
    });
  },
  update: async (id, data) => {
    return await apiRequest(`/chat-conversations/${id}`, {
      method: 'PUT',
      body: data,
    });
  },
  delete: async (id) => {
    return await apiRequest(`/chat-conversations/${id}`, {
      method: 'DELETE',
    });
  },
};

export { base44 };
