import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    highestScores: null,
    learningMetrics: null,
    learningBlocks: [],
    loading: true
  });
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    if (user && user.user_type === 'child') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/dashboard-data/${user.user_id}`);
      
      const { highest_scores, learning_metrics, learning_blocks } = response.data;
      
      // Check if we have real data or need to show zeros
      const hasRealData = learning_metrics && learning_metrics.total_learning_time > 0;
      
      setDashboardData({
        highestScores: highest_scores || {
          speech_test: 0,
          listening_test: 0,
          word_jumble: 0,
          memory_match: 0,
          spelling_bee: 0
        },
        learningMetrics: hasRealData ? learning_metrics : {
          streak: 0,
          longest_streak: 0,
          total_learning_time: 0,
          today_learning: 0,
          improvement_rate: 0,
          test_improvement: 0,
          blocks_earned: 0,
          daily_goal: false,
          daily_goal_target: 60
        },
        learningBlocks: learning_blocks || [],
        loading: false
      });
      
      // Generate blocks visualization
      if (hasRealData && learning_blocks && learning_blocks.length > 0) {
        const newBlocks = learning_blocks.map(block => ({
          id: block.date,
          filled: block.filled,
          intensity: block.intensity,
          minutes: block.minutes
        }));
        setBlocks(newBlocks);
      } else {
        // Show empty blocks for new users
        generateEmptyBlocks();
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Show zeros for new users
      setDashboardData({
        highestScores: {
          speech_test: 0,
          listening_test: 0,
          word_jumble: 0,
          memory_match: 0,
          spelling_bee: 0
        },
        learningMetrics: {
          streak: 0,
          longest_streak: 0,
          total_learning_time: 0,
          today_learning: 0,
          improvement_rate: 0,
          test_improvement: 0,
          blocks_earned: 0,
          daily_goal: false,
          daily_goal_target: 60
        },
        learningBlocks: [],
        loading: false
      });
      generateEmptyBlocks();
    }
  };

  const generateEmptyBlocks = () => {
    const totalBlocks = 150;
    const newBlocks = [];
    
    for (let i = 0; i < totalBlocks; i++) {
      newBlocks.push({
        id: i,
        filled: false,
        intensity: 0,
        minutes: 0
      });
    }
    
    setBlocks(newBlocks);
  };

  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTodayProgress = () => {
    const metrics = dashboardData.learningMetrics;
    if (!metrics) return { progress: 0, label: '0 / 60 min' };
    
    const target = metrics.daily_goal_target || 60;
    const today = metrics.today_learning || 0;
    const progress = Math.min((today / target) * 100, 100);
    
    return {
      progress,
      label: today === 0 ? 'Start learning!' : (metrics.daily_goal ? 'Goal Met! 🎉' : `${today} / ${target} min`)
    };
  };

  if (dashboardData.loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading your learning journey...</div>
      </div>
    );
  }

  const { highestScores, learningMetrics } = dashboardData;
  const todayProgress = getTodayProgress();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-welcome">
          <h1>🎯 Welcome back, {user.username}!</h1>
          <p>{learningMetrics.total_learning_time > 0 ? 'Keep building your learning tower!' : 'Start your learning journey today!'}</p>
        </div>
      </div>

      {/* Streak Section */}
      <div className="streak-section">
        <div className="streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <span className="streak-label">Current Streak</span>
            <span className="streak-value">{learningMetrics.streak || 0} days</span>
            <span className="streak-subtitle">
              {learningMetrics.streak > 0 ? 'Keep it going!' : 'Start learning to build a streak!'}
            </span>
          </div>
        </div>
        <div className="streak-card">
          <div className="streak-icon">🏆</div>
          <div className="streak-info">
            <span className="streak-label">Longest Streak</span>
            <span className="streak-value">{learningMetrics.longest_streak || 0} days</span>
            <span className="streak-subtitle">
              {learningMetrics.longest_streak > 0 ? 'Your best record!' : 'No streak yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Scores Section */}
      <div className="scores-section">
        <h2>📊 Your Scores</h2>
        <div className="scores-grid">
          <div className="score-card">
            <div className="score-icon">🎤</div>
            <div className="score-info">
              <span className="score-label">Speech Test</span>
              <span className="score-value">
                {highestScores?.speech_test > 0 ? `${highestScores.speech_test.toFixed(1)}%` : 'Not attempted'}
              </span>
            </div>
          </div>
          <div className="score-card">
            <div className="score-icon">👂</div>
            <div className="score-info">
              <span className="score-label">Listening Test</span>
              <span className="score-value">
                {highestScores?.listening_test > 0 ? `${highestScores.listening_test.toFixed(1)}%` : 'Not attempted'}
              </span>
            </div>
          </div>
          <div className="score-card">
            <div className="score-icon">🧠</div>
            <div className="score-info">
              <span className="score-label">Memory Match</span>
              <span className="score-value">{highestScores?.memory_match || 0}</span>
            </div>
          </div>
          <div className="score-card">
            <div className="score-icon">🔠</div>
            <div className="score-info">
              <span className="score-label">Word Jumble</span>
              <span className="score-value">{highestScores?.word_jumble || 0}</span>
            </div>
          </div>
          <div className="score-card">
            <div className="score-icon">🐝</div>
            <div className="score-info">
              <span className="score-label">Spelling Bee</span>
              <span className="score-value">{highestScores?.spelling_bee || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Metrics */}
      <div className="metrics-section">
        <h2>📈 Learning Metrics</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <h4>Improvement Rate</h4>
              <p className="metric-value">{learningMetrics?.improvement_rate || 0}%</p>
              <p className="metric-description">
                {learningMetrics.total_learning_time > 0 ? 'Track your progress!' : 'Start learning to see improvement'}
              </p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">⏱️</div>
            <div className="metric-content">
              <h4>Time Spent</h4>
              <p className="metric-value">{formatTime(learningMetrics?.total_learning_time || 0)}</p>
              <p className="metric-description">
                {learningMetrics.total_learning_time > 0 ? 'Total learning time' : 'Start learning today!'}
              </p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🎯</div>
            <div className="metric-content">
              <h4>Daily Goal</h4>
              <div className="progress-circle">
                <div 
                  className="progress-fill"
                  style={{ transform: `rotate(${todayProgress.progress * 3.6}deg)` }}
                ></div>
                <div className="progress-text">
                  <span className="progress-percent">{Math.round(todayProgress.progress)}%</span>
                </div>
              </div>
              <p className="metric-description">{todayProgress.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Blocks Visualization */}
      <div className="blocks-section">
        <h2>🏗️ Learning Blocks</h2>
        <p className="blocks-description">
          Each block represents 30 minutes of learning. Build your knowledge tower!
        </p>
        <div className="blocks-grid">
          {blocks.map((block, index) => (
            <div
              key={block.id || index}
              className={`learning-block block-intensity-${block.intensity || 0}`}
              title={block.filled ? `${block.minutes || 30} minutes of learning` : 'No learning yet'}
            />
          ))}
        </div>
        <div className="blocks-legend">
          <div className="legend-item">
            <div className="legend-block block-intensity-0"></div>
            <span>No learning</span>
          </div>
          <div className="legend-item">
            <div className="legend-block block-intensity-1"></div>
            <span>30 min</span>
          </div>
          <div className="legend-item">
            <div className="legend-block block-intensity-2"></div>
            <span>1 hour</span>
          </div>
          <div className="legend-item">
            <div className="legend-block block-intensity-3"></div>
            <span>2+ hours</span>
          </div>
        </div>
        <div className="blocks-summary">
          <p>
            <strong>{learningMetrics?.blocks_earned || 0} blocks</strong> earned 
            ({formatTime((learningMetrics?.blocks_earned || 0) * 30)} of learning)
          </p>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="tips-section">
        <h3>💡 Quick Tips</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon">🎯</span>
            <p>Complete daily goals to keep your streak alive!</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🏆</span>
            <p>Try to beat your highest scores in tests and games</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">📚</span>
            <p>30 minutes daily can fill one block on your tower</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;