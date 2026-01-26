import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [highestScores, setHighestScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHighestScores();
    }
  }, [user]);

  const fetchHighestScores = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/user-highest-scores/${user.user_id}`);
      setHighestScores(response.data.highest_scores);
    } catch (error) {
      console.error('Error fetching highest scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreDisplay = (score, type) => {
    if (score === 0) return 'Not attempted';
    if (type === 'test') return `${score}%`;
    return score;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dyslexia Learning Aid</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}!</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Let's Start Learning!</h2>
          <p>Choose an activity to improve your reading and writing skills</p>
        </div>

        {/* Highest Scores Display */}
        {!loading && highestScores && (
          <div className="highest-scores-section">
            <h3>🏆 Your Highest Scores</h3>
            <div className="scores-grid">
              <div className="score-item">
                <span className="score-label">Speech Test</span>
                <span className="score-value">{getScoreDisplay(highestScores.speech_test, 'test')}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Listening Test</span>
                <span className="score-value">{getScoreDisplay(highestScores.listening_test, 'test')}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Word Jumble</span>
                <span className="score-value">{getScoreDisplay(highestScores.word_jumble, 'game')}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Memory Match</span>
                <span className="score-value">{getScoreDisplay(highestScores.memory_match, 'game')}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Spelling Bee</span>
                <span className="score-value">{getScoreDisplay(highestScores.spelling_bee, 'game')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="activities-grid">
          <Link to="/speech-test" className="activity-card">
            <div className="activity-icon">🎤</div>
            <h3>Speech Test</h3>
            <p>Read paragraphs and improve your speaking skills</p>
            {highestScores && (
              <div className="activity-score">
                Best: {getScoreDisplay(highestScores.speech_test, 'test')}
              </div>
            )}
          </Link>

          <Link to="/listening-test" className="activity-card">
            <div className="activity-icon">👂</div>
            <h3>Listening Test</h3>
            <p>Listen to audio and type what you hear</p>
            {highestScores && (
              <div className="activity-score">
                Best: {getScoreDisplay(highestScores.listening_test, 'test')}
              </div>
            )}
          </Link>

          <Link to="/games" className="activity-card">
            <div className="activity-icon">🎮</div>
            <h3>Learning Games</h3>
            <p>Play fun games to improve your skills</p>
            {highestScores && (
              <div className="activity-score">
                Best Game: {Math.max(
                  highestScores.word_jumble, 
                  highestScores.memory_match, 
                  highestScores.spelling_bee
                ) || 0}
              </div>
            )}
          </Link>

          <Link to="/progress" className="activity-card">
            <div className="activity-icon">📊</div>
            <h3>My Progress</h3>
            <p>Track your learning journey</p>
            <div className="activity-score">
              Detailed Analysis
            </div>
          </Link>
        </div>

        {/* Account Settings */}
        <div className="account-section">
          <h3>Account Settings</h3>
          <Link to="/change-password" className="parent-link">
            Change Password
          </Link>
        </div>

        {/* Parent Dashboard Link */}
        {user?.user_type === 'parent' && (
          <div className="parent-dashboard-section">
            <h3>👨‍👩‍👧‍👦 Parent Dashboard</h3>
            <p>Monitor your children's learning progress</p>
            <Link to="/parent-dashboard" className="parent-link">
              View Children's Progress
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;