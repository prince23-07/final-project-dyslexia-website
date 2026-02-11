import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Progress.css';

const Progress = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.user_type === 'child') {
      fetchProgress();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/progress/${user.user_id}`);
      console.log('Progress data received:', response.data);
      setProgressData(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching progress:', error);
      setError('Failed to load progress data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getGameIcon = (gameType) => {
    const icons = {
      'word_jumble': '🔤',
      'memory_match': '🧩',
      'spelling_bee': '🐝'
    };
    return icons[gameType] || '🎮';
  };

  const formatGameType = (gameType) => {
    return gameType.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getDifficultyLabel = (difficulty) => {
    if (!difficulty) return 'Not set';
    if (difficulty < 1.3) return 'Beginner';
    if (difficulty < 1.8) return 'Easy';
    if (difficulty < 2.3) return 'Medium';
    if (difficulty < 2.8) return 'Hard';
    return 'Expert';
  };

  if (loading) {
    return (
      <div className="progress-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (user.user_type === 'parent') {
    return (
      <div className="progress-container">
        <h2>My Progress</h2>
        <div className="empty-state">
          <p>👨‍👩‍👧‍👦 Parent accounts don't have progress tracking</p>
          <p className="subtext">Please visit the Parent Dashboard to view your children's progress</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-container">
        <h2>My Progress</h2>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchProgress} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="progress-container">
        <h2>My Progress</h2>
        <div className="empty-state">
          <p>📊 No progress data available yet</p>
          <p className="subtext">Complete tests and play games to see your progress here!</p>
        </div>
      </div>
    );
  }

  const { test_results = [], game_scores = [], highest_scores = {}, current_difficulty = 1.0 } = progressData;
  
  const totalTests = test_results.length;
  const totalGames = game_scores.length;
  
  const avgTestScore = test_results.length > 0 
    ? test_results.reduce((sum, test) => sum + test.score, 0) / test_results.length 
    : 0;
  
  const avgGameScore = game_scores.length > 0
    ? game_scores.reduce((sum, game) => sum + game.score, 0) / game_scores.length
    : 0;

  return (
    <div className="progress-container">
      <h2>📊 My Learning Progress</h2>
      
      {/* Progress Summary */}
      <div className="progress-summary">
        <div className="summary-card">
          <h3>🎯 Current Level</h3>
          <div className="level-display">
            <span className="level-badge">{getDifficultyLabel(current_difficulty)}</span>
            <div className="difficulty-bar">
              <div 
                className="difficulty-fill"
                style={{ width: `${((current_difficulty - 0.5) / 2.5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>📝 Tests</h3>
          <div className="stat-display">
            <span className="stat-number">{totalTests}</span>
            <span className="stat-label">Completed</span>
          </div>
          {totalTests > 0 && (
            <div className="stat-detail">
              <span>Average Score:</span>
              <span className="stat-value">{avgTestScore.toFixed(1)}%</span>
            </div>
          )}
        </div>

        <div className="summary-card">
          <h3>🎮 Games</h3>
          <div className="stat-display">
            <span className="stat-number">{totalGames}</span>
            <span className="stat-label">Played</span>
          </div>
          {totalGames > 0 && (
            <div className="stat-detail">
              <span>Average Score:</span>
              <span className="stat-value">{avgGameScore.toFixed(0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Highest Scores Section */}
      <div className="highest-scores-section">
        <h3>🏆 Highest Scores</h3>
        <div className="highest-scores-grid">
          <div className="highest-score-card">
            <div className="score-icon">🎤</div>
            <div className="score-details">
              <span className="score-label">Speech Test</span>
              <span className="score-value">
                {highest_scores?.speech_test > 0 ? `${highest_scores.speech_test.toFixed(1)}%` : 'Not attempted'}
              </span>
            </div>
          </div>
          <div className="highest-score-card">
            <div className="score-icon">👂</div>
            <div className="score-details">
              <span className="score-label">Listening Test</span>
              <span className="score-value">
                {highest_scores?.listening_test > 0 ? `${highest_scores.listening_test.toFixed(1)}%` : 'Not attempted'}
              </span>
            </div>
          </div>
          <div className="highest-score-card">
            <div className="score-icon">🔤</div>
            <div className="score-details">
              <span className="score-label">Word Jumble</span>
              <span className="score-value">{highest_scores?.word_jumble || 0}</span>
            </div>
          </div>
          <div className="highest-score-card">
            <div className="score-icon">🧩</div>
            <div className="score-details">
              <span className="score-label">Memory Match</span>
              <span className="score-value">{highest_scores?.memory_match || 0}</span>
            </div>
          </div>
          <div className="highest-score-card">
            <div className="score-icon">🐝</div>
            <div className="score-details">
              <span className="score-label">Spelling Bee</span>
              <span className="score-value">{highest_scores?.spelling_bee || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="progress-details">
        {/* Test Results Section */}
        <div className="test-results-section">
          <h3>📝 Test History</h3>
          {test_results.length > 0 ? (
            <div className="results-list">
              {test_results.map((result, index) => (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <span className="result-type">{result.test_type}</span>
                    <span className="result-score">{result.score.toFixed(1)}%</span>
                  </div>
                  <div className="result-meta">
                    <span className="result-date">{formatDate(result.date)}</span>
                    <span className="result-difficulty">
                      Level: {getDifficultyLabel(result.difficulty_level)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>📝 No test results yet</p>
              <p className="subtext">Complete some tests to see your progress here!</p>
            </div>
          )}
        </div>

        {/* Game Scores Section */}
        <div className="game-scores-section">
          <h3>🎮 Game Achievements</h3>
          {game_scores.length > 0 ? (
            <div className="scores-list">
              {game_scores.map((score, index) => (
                <div key={index} className="game-score-item">
                  <div className="game-header">
                    <span className="game-icon">{getGameIcon(score.game_type)}</span>
                    <div className="game-info">
                      <span className="game-name">{formatGameType(score.game_type)}</span>
                      <span className="game-level">Level {score.level}</span>
                    </div>
                    <span className="game-score">{score.score}</span>
                  </div>
                  <div className="game-meta">
                    <span className="game-date">{formatDate(score.date)}</span>
                    <span className="game-difficulty">
                      Level: {getDifficultyLabel(score.difficulty_level)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>🎮 No game scores yet</p>
              <p className="subtext">Play some games to see your scores here!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="recommendations">
        <h3>💡 AI Recommendations</h3>
        <div className="recommendation-card">
          <h4>Based on your progress:</h4>
          <ul>
            {current_difficulty < 1.3 ? (
              <>
                <li>Start with simple words and short sentences</li>
                <li>Practice daily for 15 minutes</li>
                <li>Focus on phonics and letter sounds</li>
                <li>Play Memory Match to build vocabulary</li>
              </>
            ) : current_difficulty < 1.8 ? (
              <>
                <li>Practice reading aloud for 15 minutes daily</li>
                <li>Try Word Jumble to improve sentence structure</li>
                <li>Listen carefully and repeat after audio</li>
                <li>Take breaks during long sessions</li>
              </>
            ) : current_difficulty < 2.3 ? (
              <>
                <li>Challenge yourself with longer sentences</li>
                <li>Use colored overlays when reading</li>
                <li>Break complex words into smaller chunks</li>
                <li>Practice spelling bee words daily</li>
              </>
            ) : (
              <>
                <li>Read diverse texts to expand vocabulary</li>
                <li>Write summaries of what you read</li>
                <li>Practice speed reading techniques</li>
                <li>Explain concepts to others to reinforce learning</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Progress;