import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [userType, setUserType] = useState('child'); // Default to child
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(formData.username, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const fillDemoCredentials = () => {
    if (userType === 'child') {
      setFormData({
        username: 'johnny',
        password: 'child123'
      });
    } else {
      setFormData({
        username: 'parent_johnny',
        password: 'child123@parent'
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome to Dyslexia Aid</h2>
        
        {/* User Type Selection */}
        <div className="user-type-selector">
          <button
            type="button"
            className={`user-type-btn ${userType === 'child' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('child')}
          >
            👶 Child Login
          </button>
          <button
            type="button"
            className={`user-type-btn ${userType === 'parent' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('parent')}
          >
            👨‍👩‍👧‍👦 Parent Login
          </button>
        </div>

        <p className="auth-subtitle">
          {userType === 'child' 
            ? 'Login to play games and take tests' 
            : 'Login to monitor your child\'s progress'}
        </p>
        
        {error && <div className="error-message">{error}</div>}
        
        {/* Simple Demo Button */}
        <div className="demo-section">
          <button 
            type="button" 
            onClick={fillDemoCredentials}
            className="demo-btn"
          >
            Fill Example Credentials
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{userType === 'child' ? 'Username' : 'Parent ID'}</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="child-friendly-input"
              placeholder={userType === 'child' ? 'Enter your username' : 'Enter Parent ID'}
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="child-friendly-input"
              placeholder="Enter your password"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Logging in...' : `Login as ${userType === 'child' ? 'Child' : 'Parent'}`}
          </button>
        </form>
        
        <p className="auth-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
        
        <p className="auth-link">
          Forgot your password? <Link to="/forgot-password">Reset it here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;