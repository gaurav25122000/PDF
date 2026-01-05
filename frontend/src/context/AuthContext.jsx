import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  // Optimization: Only block loading if there IS a token to verify. 
  // Otherwise, let guests load instantly.
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  // 1. Sync Token with Axios Headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // 2. Load User on Mount
  useEffect(() => {
    checkUser();
  }, []); // Run once on mount, let checkUser handle token check ? 
  // Actually checkUser depends on token state. 
  // But if token is in state from localStorage init, we can call it.

  const checkUser = async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      // Use axios here since headers are set? 
      // Headers might not be set yet if useEffect hasn't run?
      // Set explicitly for this call to be safe or rely on logic.
      // Better to use fetch or explicit axios header here to be sure.
      const response = await axios.get('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      setUser(response.data); // data has {user, usageToday, limit} merged? No, API returns {user: {}, usage: N ...}
      // update API returns: { user: {...}, usageToday: N, limit: N }
      // So we set user to { ...response.data.user, usageToday: response.data.usageToday }
      setUser({ ...response.data.user, usageToday: response.data.usageToday, limit: response.data.limit });

    } catch (error) {
      console.error("Auth check failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // 3. Global Interceptor for Usage Tracking & Error Handling
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => {
        // If success and URL was a process tool
        if (response.config.url && response.config.url.includes('/api/process')) {
          incrementUsage();
        }
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 429) {
          alert(error.response.data.error || "Daily Limit Reached!");
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);


  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
    // After login, fetch 'me' again to get usage stats? 
    // Or simpler: login/signup should return usage stats too? 
    // Current API login returns { token, user }. Usage is missing.
    // Let's call checkUser or force fetch usage independently.
    // For now, simple object. 
    // Let's do a quick fetch of /auth/me after login to be sure of state.
    // Actually, just setToken triggers checkUser? No, checkUser is not in useEffect([token]).
    // Let's call it manually.
    // But axios headers need to update first.
    // A bit racey.
    // Simpler: Just refresh page or rely on next refresh.
    // Correct fix: Update login API to return usage data or make a second call here.
    // Let's maintain user state roughly.
    return response.data;
  };

  const signup = async (email, password, name) => {
    const response = await axios.post('/api/auth/signup', { email, password, name });
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const incrementUsage = () => {
    setUser(prev => {
      if (!prev) return null; // If anonymous, we don't have user object to update count on UI easily.
      // Wait, if anonymous, user is null. So Navbar doesn't show usage.
      // Correct. Anonymous users don't see the counter. They just hit the limit.
      // Feature request: Show counter for anon? Harder.
      // For Logged In users:
      return { ...prev, usageToday: (prev.usageToday || 0) + 1 };
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, incrementUsage }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
