import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './ParentDashboard.css';

const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const [childrenData, setChildrenData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showParentInfo, setShowParentInfo] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (user && user.user_type === 'parent') {
      fetchChildrenData();
    }
  }, [user]);

  const fetchChildrenData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/parent-dashboard/${user.user_id}`);
      setChildrenData(response.data.children || []);
    } catch (error) {
      setError('Failed to load children data');
      console.error('Error fetching children data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/change-password', {
        user_id: user.user_id,
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });

      if (response.status === 200) {
        setPasswordMessage('✅ Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordMessage('');
        }, 2000);
      }
    } catch (error) {
      setPasswordMessage(error.response?.data?.error || 'Failed to change password');
    }
  };

  const getScoreDisplay = (score, type) => {
    if (score === 0) return 'Not attempted';
    if (type === 'test') return `${score}%`;
    return score;
  };

  if (loading) {
    return (
      <div className="parent-dashboard-container">
        <div className="loading">Loading children's progress...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="parent-dashboard-container">
      <div className="parent-header">
        <h2>👨‍👩‍👧‍👦 Parent Dashboard</h2>
        <p>Monitor your children's learning progress</p>
        
        <div className="parent-actions">
          <button 
            className="action-btn info-btn"
            onClick={() => setShowParentInfo(!showParentInfo)}
          >
            {showParentInfo ? '❌ Hide Info' : 'ℹ️ Parent Info'}
          </button>
          <button 
            className="action-btn password-btn"
            onClick={() => setShowChangePassword(!showChangePassword)}
          >
            {showChangePassword ? '❌ Cancel' : '🔒 Change Password'}
          </button>
          <button 
            className="action-btn logout-btn"
            onClick={logout}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Change Password Form */}
      {showChangePassword && (
        <div className="change-password-section">
          <h3>Change Your Password</h3>
          <form onSubmit={handlePasswordSubmit} className="password-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                className="child-friendly-input"
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                className="child-friendly-input"
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                className="child-friendly-input"
                placeholder="Confirm new password"
              />
            </div>
            {passwordMessage && (
              <div className={`password-message ${passwordMessage.includes('✅') ? 'success' : 'error'}`}>
                {passwordMessage}
              </div>
            )}
            <button type="submit" className="auth-button">
              Change Password
            </button>
          </form>
        </div>
      )}

      {/* Parent Account Information Section */}
      {showParentInfo && (
        <div className="parent-info-section">
          <div className="parent-info-card">
            <h3>👨‍👩‍👧‍👦 How Parent Accounts Work</h3>
            
            <div className="info-content">
              <div className="info-points">
                <ul>
                  <li>Parent accounts are created automatically when a child registers</li>
                  <li>Parent ID format: <strong>parent_childusername</strong></li>
                  <li>Parent password format: <strong>childpassword@parent</strong></li>
                  <li>Use your child's credentials to determine your Parent ID and Password</li>
                </ul>
              </div>
              
              <div className="example-section">
                <h4>Example:</h4>
                <div className="example-box">
                  <p>If your child's username is <strong>johnny</strong> and password is <strong>abc123</strong>:</p>
                  <div className="credentials-example">
                    <div className="credential-item">
                      <span className="cred-label">Parent ID:</span>
                      <code>parent_johnny</code>
                    </div>
                    <div className="credential-item">
                      <span className="cred-label">Parent Password:</span>
                      <code>abc123@parent</code>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="note">
                <p>💡 If you don't have a child account yet, register as a child first to get your Parent ID</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {childrenData.length === 0 ? (
        <div className="no-children">
          <h3>No Children Registered</h3>
          <p>Your children need to register using your Parent ID: <strong>{user.username}</strong></p>
          <p>Tell them to enter this ID when they create their account.</p>
        </div>
      ) : (
        <div className="children-list">
          {childrenData.map((child) => (
            <div key={child.child_id} className="child-card">
              <div className="child-header">
                <h3>{child.child_name}</h3>
                <span className="child-age">Age: {child.child_age}</span>
              </div>

              {/* Highest Scores */}
              <div className="scores-section">
                <h4>🏆 Highest Scores</h4>
                <div className="scores-grid">
                  <div className="score-item">
                    <span>Speech Test</span>
                    <span className="score-value">
                      {getScoreDisplay(child.highest_scores.speech_test, 'test')}
                    </span>
                  </div>
                  <div className="score-item">
                    <span>Listening Test</span>
                    <span className="score-value">
                      {getScoreDisplay(child.highest_scores.listening_test, 'test')}
                    </span>
                  </div>
                  <div className="score-item">
                    <span>Word Jumble</span>
                    <span className="score-value">
                      {getScoreDisplay(child.highest_scores.word_jumble, 'game')}
                    </span>
                  </div>
                  <div className="score-item">
                    <span>Memory Match</span>
                    <span className="score-value">
                      {getScoreDisplay(child.highest_scores.memory_match, 'game')}
                    </span>
                  </div>
                  <div className="score-item">
                    <span>Spelling Bee</span>
                    <span className="score-value">
                      {getScoreDisplay(child.highest_scores.spelling_bee, 'game')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="activity-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Tests</span>
                  <span className="summary-value">{child.total_tests}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Games</span>
                  <span className="summary-value">{child.total_games}</span>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <h4>Recent Activity</h4>
                
                <div className="activity-tabs">
                  <div className="activity-tab">
                    <h5>Recent Tests ({child.recent_tests.length})</h5>
                    {child.recent_tests.length > 0 ? (
                      <div className="activity-list">
                        {child.recent_tests.map((test, index) => (
                          <div key={index} className="activity-item">
                            <span className="activity-type">{test.test_type}</span>
                            <span className="activity-score">{test.score}%</span>
                            <span className="activity-date">
                              {new Date(test.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-activity">No tests completed yet</p>
                    )}
                  </div>

                  <div className="activity-tab">
                    <h5>Recent Games ({child.recent_games.length})</h5>
                    {child.recent_games.length > 0 ? (
                      <div className="activity-list">
                        {child.recent_games.map((game, index) => (
                          <div key={index} className="activity-item">
                            <span className="activity-type">{game.game_type.replace('_', ' ').toUpperCase()}</span>
                            <span className="activity-score">Score: {game.score}</span>
                            <span className="activity-level">Level: {game.level}</span>
                            <span className="activity-date">
                              {new Date(game.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-activity">No games played yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;