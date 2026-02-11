import React, { useState, useEffect, useRef } from 'react';
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
  const [recognition, setRecognition] = useState(null);
  const [browserSupport, setBrowserSupport] = useState(true);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.lang = 'en-US';
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.maxAlternatives = 1;
      
      recognitionInstance.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        setSpokenText(transcript);
      };
      
      recognitionInstance.onend = () => {
        setIsRecording(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          alert('Please allow microphone access to use speech recognition.');
        }
      };
      
      setRecognition(recognitionInstance);
    } else {
      setBrowserSupport(false);
    }
  }, []);

  // Fetch adaptive content
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
      const fallbackContent = activeTab === 'speech' 
        ? ["The cat sleeps", "We eat food", "Birds fly high", "I love my family", "The sun is bright"]
        : ["Hello world", "Good morning", "How are you", "Thank you", "See you later"];
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
    if (!browserSupport) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (!recognition) {
      alert('Speech recognition is not initialized. Please refresh the page.');
      return;
    }

    setSpokenText('');
    setIsRecording(true);
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsRecording(false);
      alert('Error starting speech recognition. Please try again.');
    }
  };

  const stopSpeechTest = () => {
    if (recognition && isRecording) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    setIsRecording(false);
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
        original_text: originalText
      });

      setResult({
        type: 'speech',
        accuracy: response.data.accuracy,
        score: response.data.score,
        wordsPerMinute: response.data.words_per_minute,
        newDifficulty: response.data.new_difficulty
      });
      
      if (response.data.new_difficulty) {
        setCurrentDifficulty(response.data.new_difficulty);
      }
      
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
      utterance.pitch = 1;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
        alert('Error playing audio. Please try again.');
      };
      
      speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in your browser. Please use Chrome or Edge.');
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
      
      if (response.data.new_difficulty) {
        setCurrentDifficulty(response.data.new_difficulty);
      }
      
      setCurrentSentenceIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error submitting listening test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextSentence = () => {
    setResult(null);
    setSpokenText('');
    setTypedText('');
    setCurrentSentenceIndex(prev => prev + 1);
  };

  const resetTest = () => {
    setResult(null);
    setSpokenText('');
    setTypedText('');
    setCurrentSentenceIndex(0);
    fetchAdaptiveContent();
  };

  const getDifficultyLabel = (difficulty) => {
    if (!difficulty) return 'Beginner';
    if (difficulty < 1.3) return 'Beginner';
    if (difficulty < 1.8) return 'Easy';
    if (difficulty < 2.3) return 'Medium';
    if (difficulty < 2.8) return 'Hard';
    return 'Expert';
  };

  if (!browserSupport && activeTab === 'speech') {
    return (
      <div className="tests-container">
        <div className="tests-header">
          <h1>🧪 Adaptive Tests</h1>
          <p>Practice your speech and listening skills at your level</p>
        </div>
        <div className="error-message">
          <h3>Browser Not Supported</h3>
          <p>Speech recognition is not supported in your browser.</p>
          <p>Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for the best experience.</p>
          <div className="tests-tabs">
            <button 
              className={`tab-btn ${activeTab === 'listening' ? 'active' : ''}`}
              onClick={() => setActiveTab('listening')}
            >
              👂 Listening Test
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              style={{ width: `${((currentDifficulty - 0.5) / 2.5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="tests-tabs">
        <button 
          className={`tab-btn ${activeTab === 'speech' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('speech');
            resetTest();
          }}
        >
          🎤 Speech Test
        </button>
        <button 
          className={`tab-btn ${activeTab === 'listening' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('listening');
            resetTest();
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
                <li>Click "Start Recording" and allow microphone access</li>
                <li>Read the sentence below clearly and completely</li>
                <li>Click "Stop Recording" when you're finished</li>
                <li>Click "Submit Test" to see your score</li>
              </ol>
            </div>

            <div className="sentence-display">
              <h4>Read this sentence aloud:</h4>
              <div className="sentence-box">
                "{getCurrentSentence()}"
              </div>
              <div className="difficulty-info">
                Level: {getDifficultyLabel(currentDifficulty)} | 
                Sentence {currentSentenceIndex + 1} of {adaptiveContent.length}
              </div>
            </div>

            <div className="recording-section">
              <div className="recording-controls">
                <button 
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopSpeechTest : startSpeechTest}
                  disabled={loading}
                >
                  {isRecording ? '🔴 Stop Recording' : '🎤 Start Recording'}
                </button>
              </div>
              
              <div className="spoken-text">
                <h4>Your Speech:</h4>
                <div className="transcript-box">
                  {spokenText || 'Your spoken text will appear here as you speak...'}
                </div>
                <small className="hint-text">
                  {isRecording ? '🎤 Recording in progress...' : 'Recording stopped'}
                </small>
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
                <li>Listen carefully to the entire sentence</li>
                <li>Type exactly what you hear</li>
                <li>Click "Submit Test" to see your score</li>
              </ol>
            </div>

            <div className="sentence-display">
              <h4>Listen to this sentence:</h4>
              <div className="audio-controls">
                <button 
                  className="play-audio-btn"
                  onClick={playListeningAudio}
                  disabled={isPlaying || loading}
                >
                  {isPlaying ? '🔊 Playing...' : '▶️ Play Audio'}
                </button>
              </div>
              <div className="difficulty-info">
                Level: {getDifficultyLabel(currentDifficulty)} | 
                Sentence {currentSentenceIndex + 1} of {adaptiveContent.length}
              </div>
            </div>

            <div className="type-section">
              <h4>Type what you hear:</h4>
              <textarea 
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type the sentence you hear here..."
                rows="4"
                className="type-input"
                disabled={loading}
              />
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
              <div className="result-item">
                <span className="result-label">New Level:</span>
                <span className="result-value">{getDifficultyLabel(result.newDifficulty)}</span>
              </div>
            </div>
            <div className="result-actions">
              <button 
                className="try-again-btn"
                onClick={nextSentence}
              >
                Next Sentence
              </button>
              <button 
                className="reset-btn"
                onClick={resetTest}
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tests;