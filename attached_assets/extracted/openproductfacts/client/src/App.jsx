import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Layout from './layout.jsx'
import Home from './pages/home.jsx'
import Scan from './pages/scan.jsx'
import History from './pages/history.jsx'
import Lists from './pages/lists.jsx'
import Profile from './pages/profile.jsx'
import ProductDetail from './pages/productdetail.jsx'
import Compare from './pages/compare.jsx'
import Login from './pages/login.jsx'
import { base44 } from './api/base44Client.js'

// Protected Route Component
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await base44.auth.me();
      if (user && user.email) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated - show content
  return children;
}

function App() {
  return (
    <Routes>
      {/* Login route - accessible without authentication */}
      <Route path="/login" element={<Login />} />
      
      {/* All other routes require authentication */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/history" element={<History />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/product" element={<ProductDetail />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App

