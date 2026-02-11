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
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => {
    if (user && user.user_type === 'child') {
      fetchDashboardData();
    } else {
      setDashboardData({
        highestScores: null,
        learningMetrics: null,
        learningBlocks: [],
        loading: false
      });
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/dashboard-data/${user.user_id}`);
      
      const { highest_scores, learning_metrics, learning_blocks } = response.data;
      
      setDashboardData({
        highestScores: highest_scores || {
          speech_test: 0,
          listening_test: 0,
          word_jumble: 0,
          memory_match: 0,
          spelling_bee: 0
        },
        learningMetrics: learning_metrics || {
          streak: 0,
          longest_streak: 0,
          total_learning_time: 0,
          today_learning: 0,
          improvement_rate: 0,
          blocks_earned: 0,
          daily_goal: false,
          daily_goal_target: 60
        },
        learningBlocks: learning_blocks || [],
        loading: false
      });
      
      if (learning_blocks && learning_blocks.length > 0) {
        setBlocks(learning_blocks);
      } else {
        generateEmptyBlocks();
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
    const endDate = new Date();
    
    for (let i = 0; i < totalBlocks; i++) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (149 - i));
      
      newBlocks.push({
        date: date.toISOString().split('T')[0],
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getIntensityColor = (intensity) => {
    switch(intensity) {
      case 0: return '#ebedf0';
      case 1: return '#9be9a8';
      case 2: return '#40c463';
      case 3: return '#30a14e';
      case 4: return '#216e39';
      default: return '#ebedf0';
    }
  };

  if (dashboardData.loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading your learning journey...</div>
      </div>
    );
  }

  if (user.user_type === 'parent') {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>👋 Welcome, {user.username}!</h1>
          <p>Please visit the Parent Dashboard to view your children's progress</p>
        </div>
      </div>
    );
  }

  const { highestScores, learningMetrics } = dashboardData;
  const todayProgress = getTodayProgress();

  // Group blocks by week for LeetCode style display
  const weeks = [];
  for (let i = 0; i < Math.ceil(blocks.length / 7); i++) {
    weeks.push(blocks.slice(i * 7, (i + 1) * 7));
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-welcome">
          <h1>🎯 Welcome back, {user.username}!</h1>
          <p>{learningMetrics.total_learning_time > 0 ? 'Keep building your learning tower!' : 'Start your learning journey today!'}</p>
        </div>
      </div>

      {/* Streak Section - LeetCode Style */}
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

      {/* Highest Scores Section - FIXED */}
      <div className="scores-section">
        <h2>🏆 Your Highest Scores</h2>
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
            <div className="score-icon">🧩</div>
            <div className="score-info">
              <span className="score-label">Memory Match</span>
              <span className="score-value">{highestScores?.memory_match || 0}</span>
            </div>
          </div>
          <div className="score-card">
            <div className="score-icon">🔤</div>
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
              <h4>Total Time</h4>
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

      {/* LeetCode Style Activity Calendar */}
      <div className="blocks-section">
        <h2>📅 Learning Activity Calendar</h2>
        <p className="blocks-description">
          {learningMetrics.streak > 0 
            ? `🔥 ${learningMetrics.streak} day streak! Keep it up!` 
            : 'Start learning today to build your streak!'}
        </p>
        
        <div className="calendar-container">
          <div className="calendar-months">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
              <span key={month} className="calendar-month">{month}</span>
            ))}
          </div>
          
          <div className="calendar-grid">
            <div className="calendar-days">
              {['Mon', 'Wed', 'Fri'].map(day => (
                <span key={day} className="calendar-day-label">{day}</span>
              ))}
            </div>
            
            <div className="calendar-weeks">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="calendar-week">
                  {week.map((block, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className="calendar-block"
                      style={{ 
                        backgroundColor: getIntensityColor(block.intensity),
                        opacity: block.filled ? 1 : 0.3
                      }}
                      title={`${formatDate(block.date)}: ${block.minutes} minutes of learning`}
                      onClick={() => setSelectedBlock(block)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-label">Less</span>
              <div className="legend-colors">
                <div className="legend-block" style={{ backgroundColor: '#ebedf0' }}></div>
                <div className="legend-block" style={{ backgroundColor: '#9be9a8' }}></div>
                <div className="legend-block" style={{ backgroundColor: '#40c463' }}></div>
                <div className="legend-block" style={{ backgroundColor: '#30a14e' }}></div>
                <div className="legend-block" style={{ backgroundColor: '#216e39' }}></div>
              </div>
              <span className="legend-label">More</span>
            </div>
          </div>
        </div>

        {selectedBlock && (
          <div className="block-details">
            <p>
              <strong>{formatDate(selectedBlock.date)}</strong>: 
              {selectedBlock.minutes > 0 
                ? ` ${selectedBlock.minutes} minutes of learning` 
                : ' No learning activity'}
            </p>
            <button onClick={() => setSelectedBlock(null)} className="close-details-btn">
              ✕
            </button>
          </div>
        )}

        <div className="blocks-summary">
          <p>
            <strong>{learningMetrics?.blocks_earned || 0} blocks</strong> earned 
            ({formatTime((learningMetrics?.blocks_earned || 0) * 30)} of learning)
          </p>
          <p className="summary-detail">
            {blocks.filter(b => b.filled).length} active days in the last 150 days
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
            <p>30 minutes daily can fill one block on your calendar</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;