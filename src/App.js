import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Tests from './components/Tests';
import Games from './components/Games';
import Progress from './components/Progress';
import ForgotPassword from './components/ForgotPassword';
import ChangePassword from './components/ChangePassword';
import ParentDashboard from './components/ParentDashboard';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [theme, setTheme] = useState('soothing');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const isParent = user.user_type === 'parent';
  const isChild = user.user_type === 'child';

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const menuItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: '🏠', 
      visible: true,
      forParent: true,
      forChild: true
    },
    { 
      path: '/parent-dashboard', 
      label: 'Parent Dashboard', 
      icon: '👨‍👩‍👧‍👦', 
      visible: isParent,
      forParent: true,
      forChild: false
    },
    { 
      path: '/tests', 
      label: 'Tests', 
      icon: '🧪', 
      visible: isChild,
      forParent: false,
      forChild: true
    },
    { 
      path: '/games', 
      label: 'Games', 
      icon: '🎮', 
      visible: isChild,
      forParent: false,
      forChild: true
    },
    { 
      path: '/progress', 
      label: 'My Progress', 
      icon: '📊', 
      visible: isChild,
      forParent: false,
      forChild: true
    },
  ];

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="top-nav-left">
          <h1 className="app-logo">🧠 Dyslexia Aid</h1>
        </div>
        <div className="top-nav-right">
          <div className="theme-selector">
            <button 
              className={`theme-btn ${theme === 'soothing' ? 'active' : ''}`}
              onClick={() => toggleTheme('soothing')}
              title="Soothing Mode"
            >
              🌈
            </button>
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => toggleTheme('light')}
              title="Light Mode"
            >
              ☀️
            </button>
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => toggleTheme('dark')}
              title="Dark Mode"
            >
              🌙
            </button>
          </div>
          <span className="user-greeting">Welcome, {user.username}!</span>
          <button 
            className="change-password-btn"
            onClick={() => navigate('/change-password')}
          >
            🔐 Change Password
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>

      <div className="main-content">
        {/* Left Sidebar - Navigation */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Navigation</h3>
          </div>
          <nav className="sidebar-nav">
            {menuItems
              .filter(item => item.visible)
              .map((item) => (
                <button
                  key={item.path}
                  className={`sidebar-btn ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span className="sidebar-label">{item.label}</span>
                </button>
              ))}
          </nav>
          
          <div 
            className="user-info-sidebar clickable-user-section"
            onClick={() => setShowUserPopup(true)}
          >
            <div className="user-avatar">
              {isChild ? '👶' : '👨‍👩‍👧‍👦'}
            </div>
            <div className="user-details">
              <h4>{user.username}</h4>
              <p className="user-type">{isChild ? 'Child Account' : 'Parent Account'}</p>
            </div>
          </div>

          {showUserPopup && (
            <div className="user-popup-overlay" onClick={() => setShowUserPopup(false)}>
              <div className="user-popup" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="close-popup-btn"
                  onClick={() => setShowUserPopup(false)}
                >
                  ✕
                </button>
                <div className="popup-header">
                  <h3>👤 Account Information</h3>
                </div>
                <div className="popup-details">
                  <div className="detail-item">
                    <span className="detail-label">Username:</span>
                    <span className="detail-value">{user.username}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">User ID:</span>
                    <span className="detail-value">{user.user_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Account Type:</span>
                    <span className="detail-value">{isChild ? 'Child' : 'Parent'}</span>
                  </div>
                  {user.email && (
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{user.email}</span>
                    </div>
                  )}
                  {isChild && user.current_difficulty && (
                    <div className="detail-item">
                      <span className="detail-label">Current Level:</span>
                      <span className="detail-value">
                        {user.current_difficulty < 1.3 ? 'Beginner' : 
                         user.current_difficulty < 1.8 ? 'Easy' : 
                         user.current_difficulty < 2.3 ? 'Medium' : 
                         user.current_difficulty < 2.8 ? 'Hard' : 'Expert'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="popup-actions">
                  <button 
                    className="popup-action-btn"
                    onClick={() => {
                      navigate('/change-password');
                      setShowUserPopup(false);
                    }}
                  >
                    🔐 Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/change-password" element={
            <PrivateRoute>
              <MainLayout>
                <ChangePassword />
              </MainLayout>
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          } />
          <Route path="/tests" element={
            <PrivateRoute>
              <MainLayout>
                <Tests />
              </MainLayout>
            </PrivateRoute>
          } />
          <Route path="/parent-dashboard" element={
            <PrivateRoute>
              <MainLayout>
                <ParentDashboard />
              </MainLayout>
            </PrivateRoute>
          } />
          <Route path="/games" element={
            <PrivateRoute>
              <MainLayout>
                <Games />
              </MainLayout>
            </PrivateRoute>
          } />
          <Route path="/progress" element={
            <PrivateRoute>
              <MainLayout>
                <Progress />
              </MainLayout>
            </PrivateRoute>
          } />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;