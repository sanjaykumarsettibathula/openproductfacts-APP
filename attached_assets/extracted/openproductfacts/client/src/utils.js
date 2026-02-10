// Utility functions for routing and common operations

export const createPageUrl = (pageName) => {
  const routes = {
    Home: '/',
    Scan: '/scan',
    History: '/history',
    Lists: '/lists',
    Profile: '/profile',
    ProductDetail: '/product',
    Compare: '/compare',
    Login: '/login',
  };
  
  return routes[pageName] || '/';
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

