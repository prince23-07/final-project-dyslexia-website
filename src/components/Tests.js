import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Tests.css';

const Tests = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('speech');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState(1.0);
  const [adaptiveContent, setAdaptiveContent] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  // Fetch adaptive content based on difficulty
  useEffect(() => {
    if (user && user.user_type === 'child') {
      fetchAdaptiveContent();
    }
  }, [user, activeTab]);

  const fetchAdaptiveContent = async () => {
    try {
      const contentType = activeTab === 'speech' ? 'speech_test' : 'listening_test';
      const response = await axios.get(`http://localhost:5000/api/get-adaptive-content/${contentType}`, {
        params: {
          user_id: user.user_id,
          difficulty: currentDifficulty
        }
      });
      
      setAdaptiveContent(response.data.content);
      setCurrentDifficulty(response.data.difficulty_level);
    } catch (error) {
      console.error('Error fetching adaptive content:', error);
      // Fallback content
      const fallbackContent = activeTab === 'speech' 
        ? ["The cat sleeps", "We eat food", "Birds fly high"]
        : ["Hello world", "Good morning", "How are you"];
      setAdaptiveContent(fallbackContent);
    }
  };

  const getCurrentSentence = () => {
    if (adaptiveContent.length > 0) {
      return adaptiveContent[currentSentenceIndex % adaptiveContent.length];
    }
    return activeTab === 'speech' 
      ? "The quick brown fox jumps over the lazy dog"
      : "Please type what you hear";
  };

  const startSpeechTest = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setIsRecording(true);
        setSpokenText('');
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.start();
    } else {
      alert('Speech recognition not supported in this browser. Try Chrome or Edge.');
    }
  };

  const submitSpeechTest = async () => {
    if (!spokenText.trim()) {
      alert('Please speak something first!');
      return;
    }

    setLoading(true);
    try {
      const originalText = getCurrentSentence();
      const response = await axios.post('http://localhost:5000/api/speech-test', {
        user_id: user.user_id,
        spoken_text: spokenText,
        original_text: originalText,
        time_spent: 30
      });

      setResult({
        type: 'speech',
        accuracy: response.data.accuracy,
        score: response.data.score,
        wordsPerMinute: response.data.words_per_minute,
        newDifficulty: response.data.new_difficulty
      });
      
      // Update difficulty
      if (response.data.new_difficulty) {
        setCurrentDifficulty(response.data.new_difficulty);
      }
      
      // Move to next sentence
      setCurrentSentenceIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error submitting speech test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const playListeningAudio = () => {
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      const sentence = getCurrentSentence();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 0.8;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech not supported in this browser. Try Chrome or Edge.');
    }
  };

  const submitListeningTest = async () => {
    if (!typedText.trim()) {
      alert('Please type what you heard!');
      return;
    }

    setLoading(true);
    try {
      const originalText = getCurrentSentence();
      const response = await axios.post('http://localhost:5000/api/listening-test', {
        user_id: user.user_id,
        typed_text: typedText,
        original_text: originalText
      });

      setResult({
        type: 'listening',
        accuracy: response.data.accuracy,
        score: response.data.score,
        newDifficulty: response.data.new_difficulty
      });
      
      // Update difficulty
      if (response.data.new_difficulty) {
        setCurrentDifficulty(response.data.new_difficulty);
      }
      
      // Move to next sentence
      setCurrentSentenceIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error submitting listening test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextSentence = () => {
    setCurrentSentenceIndex(prev => prev + 1);
    setResult(null);
    setSpokenText('');
    setTypedText('');
  };

  const getDifficultyLabel = (difficulty) => {
    if (difficulty < 1.3) return 'Beginner';
    if (difficulty < 1.8) return 'Easy';
    if (difficulty < 2.3) return 'Medium';
    if (difficulty < 2.8) return 'Hard';
    return 'Expert';
  };

  return (
    <div className="tests-container">
      <div className="tests-header">
        <h1>🧪 Adaptive Tests</h1>
        <p>Practice your speech and listening skills at your level</p>
        <div className="difficulty-indicator">
          <span className="difficulty-label">Current Level:</span>
          <span className="difficulty-value">{getDifficultyLabel(currentDifficulty)}</span>
          <div className="difficulty-bar">
            <div 
              className="difficulty-fill" 
              style={{ width: `${(currentDifficulty - 0.5) / 2.5 * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="tests-tabs">
        <button 
          className={`tab-btn ${activeTab === 'speech' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('speech');
            setCurrentSentenceIndex(0);
            setResult(null);
          }}
        >
          🎤 Speech Test
        </button>
        <button 
          className={`tab-btn ${activeTab === 'listening' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('listening');
            setCurrentSentenceIndex(0);
            setResult(null);
          }}
        >
          👂 Listening Test
        </button>
      </div>

      <div className="test-content">
        {activeTab === 'speech' ? (
          <div className="speech-test">
            <div className="test-instructions">
              <h3>Speech Test Instructions</h3>
              <ol>
                <li>Click "Start Recording" to begin</li>
                <li>Read the sentence below clearly</li>
                <li>Click "Stop Recording" when finished</li>
                <li>Submit your test to see your score</li>
              </ol>
            </div>

            <div className="sentence-display">
              <h4>Read this sentence:</h4>
              <div className="sentence-box">
                "{getCurrentSentence()}"
              </div>
              <div className="difficulty-info">
                Level: {getDifficultyLabel(currentDifficulty)} | 
                Sentence {currentSentenceIndex + 1} of {adaptiveContent.length}
              </div>
            </div>

            <div className="recording-section">
              <button 
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={startSpeechTest}
                disabled={isRecording}
              >
                {isRecording ? '🔴 Recording...' : '🎤 Start Recording'}
              </button>
              
              <div className="spoken-text">
                <h4>Your Speech:</h4>
                <textarea 
                  value={spokenText}
                  onChange={(e) => setSpokenText(e.target.value)}
                  placeholder="Your spoken text will appear here..."
                  rows="3"
                />
              </div>
            </div>

            <button 
              className="submit-test-btn"
              onClick={submitSpeechTest}
              disabled={loading || !spokenText.trim()}
            >
              {loading ? 'Processing...' : '📤 Submit Test'}
            </button>
          </div>
        ) : (
          <div className="listening-test">
            <div className="test-instructions">
              <h3>Listening Test Instructions</h3>
              <ol>
                <li>Click "Play Audio" to hear the sentence</li>
                <li>Type exactly what you hear</li>
                <li>Submit your test to see your score</li>
              </ol>
            </div>

            <div className="audio-section">
              <button 
                className="play-audio-btn"
                onClick={playListeningAudio}
                disabled={isPlaying}
              >
                {isPlaying ? '🔊 Playing...' : '▶️ Play Audio'}
              </button>
              
              <div className="type-section">
                <h4>Type what you hear:</h4>
                <textarea 
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Type the sentence you hear..."
                  rows="4"
                />
              </div>
              
              <div className="difficulty-info">
                Level: {getDifficultyLabel(currentDifficulty)} | 
                Sentence {currentSentenceIndex + 1} of {adaptiveContent.length}
              </div>
            </div>

            <button 
              className="submit-test-btn"
              onClick={submitListeningTest}
              disabled={loading || !typedText.trim()}
            >
              {loading ? 'Processing...' : '📤 Submit Test'}
            </button>
          </div>
        )}

        {result && (
          <div className={`test-result ${result.type}`}>
            <h3>Test Results</h3>
            <div className="result-details">
              <div className="result-item">
                <span className="result-label">Accuracy:</span>
                <span className="result-value">{(result.accuracy * 100).toFixed(1)}%</span>
              </div>
              <div className="result-item">
                <span className="result-label">Score:</span>
                <span className="result-value">{result.score.toFixed(1)}%</span>
              </div>
              {result.type === 'speech' && result.wordsPerMinute && (
                <div className="result-item">
                  <span className="result-label">Words per Minute:</span>
                  <span className="result-value">{result.wordsPerMinute.toFixed(1)}</span>
                </div>
              )}
              {result.newDifficulty && (
                <div className="result-item">
                  <span className="result-label">New Level:</span>
                  <span className="result-value">{getDifficultyLabel(result.newDifficulty)}</span>
                </div>
              )}
            </div>
            <button 
              className="try-again-btn"
              onClick={nextSentence}
            >
              Next Sentence
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tests;