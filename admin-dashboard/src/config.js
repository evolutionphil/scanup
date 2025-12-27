// API Configuration for Admin Dashboard
// This will use the Railway backend URL in production

const API_URL = import.meta.env.VITE_API_URL || 'https://scanup-production.up.railway.app';

export default API_URL;
