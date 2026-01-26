import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Progress.css';

const Progress = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalTests: 0,
    averageScore: 0,
    gamesPlayed: 0,
    bestGame: 0
  });

  useEffect(() => {
    fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/progress/${user.user_id}`);
      setProgressData(response.data);
      calculateOverallStats(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallStats = (data) => {
    const testResults = data.test_results || [];
    const gameScores = data.game_scores || [];
    
    const totalTests = testResults.length;
    const totalTestScore = testResults.reduce((sum, test) => sum + test.score, 0);
    const averageScore = totalTests > 0 ? totalTestScore / totalTests : 0;
    
    const gamesPlayed = gameScores.length;
    const bestGame = gameScores.length > 0 ? Math.max(...gameScores.map(game => game.score)) : 0;

    setOverallStats({
      totalTests,
      averageScore: Math.round(averageScore),
      gamesPlayed,
      bestGame
    });
  };

  const getGameIcon = (gameType) => {
    const icons = {
      'word_jumble': '🔤',
      'memory_match': '🧩',
      'spelling_bee': '🐝',
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

  // Add this to your Progress.js component (in the progress-summary section)
<div className="summary-card">
  <h3>🏆 Best Scores</h3>
  <div className="best-scores">
    <div className="best-score-item">
      <span>Speech Test:</span>
      <span>{overallStats.bestSpeech || 0}%</span>
    </div>
    <div className="best-score-item">
      <span>Listening Test:</span>
      <span>{overallStats.bestListening || 0}%</span>
    </div>
    <div className="best-score-item">
      <span>Best Game:</span>
      <span>{overallStats.bestGame || 0}</span>
    </div>
  </div>
</div>

  return (
    <div className="progress-container">
      <h2>My Learning Progress</h2>
      
      {/* Overall Progress Summary */}
      <div className="progress-summary">
        <div className="summary-card">
          <h3>📊 Overall Progress</h3>
          <div className="progress-circle">
            <span className="progress-value">{overallStats.averageScore}%</span>
          </div>
          <p>Average Score</p>
        </div>

        <div className="summary-card">
          <h3>🎯 Tests Completed</h3>
          <div className="skill-score">
            <span className="score">{overallStats.totalTests}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${Math.min(overallStats.totalTests * 10, 100)}%`}}
              ></div>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>🎮 Games Played</h3>
          <div className="skill-score">
            <span className="score">{overallStats.gamesPlayed}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${Math.min(overallStats.gamesPlayed * 20, 100)}%`}}
              ></div>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>🏆 Best Game Score</h3>
          <div className="skill-score">
            <span className="score">{overallStats.bestGame}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${Math.min(overallStats.bestGame, 100)}%`}}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="progress-details">
        {/* Test Results Section */}
        <div className="test-results-section">
          <h3>Test History</h3>
          {progressData?.test_results?.length > 0 ? (
            <div className="results-grid">
              {progressData.test_results.map((result, index) => (
                <div key={index} className="result-card">
                  <div className="test-type">{result.test_type}</div>
                  <div className="test-score">{result.score}%</div>
                  <div className="test-date">
                    {new Date(result.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
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
          <h3>Game Achievements</h3>
          {progressData?.game_scores?.length > 0 ? (
            <div className="scores-grid">
              {progressData.game_scores.map((score, index) => (
                <div key={index} className="score-card">
                  <div className="game-header">
                    <span className="game-icon">{getGameIcon(score.game_type)}</span>
                    <div className="game-info">
                      <div className="game-name">{formatGameType(score.game_type)}</div>
                      <div className="game-level">Level {score.level}</div>
                    </div>
                  </div>
                  <div className="game-score">Score: {score.score}</div>
                  <div className="game-date">
                    {new Date(score.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
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
        <h3>AI Recommendations</h3>
        <div className="recommendation-card">
          <h4>🎧 Recommended Podcasts</h4>
          <ul>
            <li>Dyslexia Explored - For understanding dyslexia</li>
            <li>Reading Rocks - Fun reading exercises</li>
            <li>Word Play - Vocabulary building</li>
          </ul>
        </div>
        
        <div className="recommendation-card">
          <h4>💡 Learning Tips</h4>
          <ul>
            <li>Practice reading aloud for 15 minutes daily</li>
            <li>Use colored overlays when reading</li>
            <li>Break words into smaller chunks</li>
            <li>Play word games to improve vocabulary</li>
            <li>Take regular breaks during learning sessions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Progress;