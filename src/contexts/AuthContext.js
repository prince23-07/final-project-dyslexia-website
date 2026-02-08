// contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Try to get user from localStorage on initial load
    const savedUser = localStorage.getItem('dyslexiaUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user exists in localStorage on mount
    const savedUser = localStorage.getItem('dyslexiaUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });
      
      if (response.status === 200) {
        const userData = {
          user_id: response.data.user_id,
          username: response.data.username,
          user_type: response.data.user_type,
          email: response.data.email || ''
        };
        
        setUser(userData);
        // Save to localStorage
        localStorage.setItem('dyslexiaUser', JSON.stringify(userData));
        return { success: true, data: userData };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    // Remove from localStorage
    localStorage.removeItem('dyslexiaUser');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};