import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Tests.css';

const Tests = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('speech'); // 'speech' or 'listening'
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sample test sentences
  const speechSentences = [
    "The quick brown fox jumps over the lazy dog",
    "She sells seashells by the seashore",
    "Peter Piper picked a peck of pickled peppers",
    "How much wood would a woodchuck chuck"
  ];

  const listeningSentences = [
    "Twenty when you hear the beep sound",
    "The cat sat on the mat near the window",
    "My favorite color is blue like the ocean",
    "Please pass the salt and pepper to me"
  ];

  const [currentSentence, setCurrentSentence] = useState(speechSentences[0]);

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
      const response = await axios.post('http://localhost:5000/api/speech-test', {
        user_id: user.user_id,
        spoken_text: spokenText,
        original_text: currentSentence,
        time_taken: 30 // Example time
      });

      setResult({
        type: 'speech',
        accuracy: response.data.accuracy,
        score: response.data.score,
        wordsPerMinute: response.data.words_per_minute
      });
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
      const utterance = new SpeechSynthesisUtterance(currentSentence);
      utterance.rate = 0.8; // Slower for better comprehension
      
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
      const response = await axios.post('http://localhost:5000/api/listening-test', {
        user_id: user.user_id,
        typed_text: typedText,
        original_text: currentSentence
      });

      setResult({
        type: 'listening',
        accuracy: response.data.accuracy,
        score: response.data.score
      });
    } catch (error) {
      console.error('Error submitting listening test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getNewSentence = () => {
    const sentences = activeTab === 'speech' ? speechSentences : listeningSentences;
    const currentIndex = sentences.indexOf(currentSentence);
    const nextIndex = (currentIndex + 1) % sentences.length;
    setCurrentSentence(sentences[nextIndex]);
    setResult(null);
    setSpokenText('');
    setTypedText('');
  };

  return (
    <div className="tests-container">
      <div className="tests-header">
        <h1>🧪 Tests</h1>
        <p>Practice your speech and listening skills</p>
      </div>

      <div className="tests-tabs">
        <button 
          className={`tab-btn ${activeTab === 'speech' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('speech');
            setCurrentSentence(speechSentences[0]);
            setResult(null);
          }}
        >
          🎤 Speech Test
        </button>
        <button 
          className={`tab-btn ${activeTab === 'listening' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('listening');
            setCurrentSentence(listeningSentences[0]);
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
                "{currentSentence}"
              </div>
              <button 
                className="new-sentence-btn"
                onClick={getNewSentence}
              >
                🔄 New Sentence
              </button>
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
            </div>

            <div className="hint-section">
              <button 
                className="new-sentence-btn"
                onClick={getNewSentence}
              >
                🔄 New Sentence
              </button>
              <p className="hint-text">Can't hear clearly? Try again or request a new sentence.</p>
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
            </div>
            <button 
              className="try-again-btn"
              onClick={() => {
                setResult(null);
                if (activeTab === 'speech') {
                  setSpokenText('');
                } else {
                  setTypedText('');
                }
              }}
            >
              Try Another Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tests;