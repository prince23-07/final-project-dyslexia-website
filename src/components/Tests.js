import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Tests.css';

const Tests = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('speech');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState(1.0);
  const [adaptiveContent, setAdaptiveContent] = useState([]);
  const [recognition, setRecognition] = useState(null);
  const [browserSupport, setBrowserSupport] = useState(true);
  const [error, setError] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);

  const mediaStreamRef = useRef(null);

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
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentAnswer(prev => (finalTranscript + interimTranscript).trim());
      };
      
      recognitionInstance.onend = () => {
        setIsRecording(false);
        stopMicrophone();
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        stopMicrophone();
        
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please try speaking again.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };
      
      setRecognition(recognitionInstance);
    } else {
      setBrowserSupport(false);
      setError('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
    }

    return () => {
      if (recognition) {
        try {
          recognition.abort();
        } catch (e) {
          console.error('Error aborting recognition:', e);
        }
      }
      stopMicrophone();
    };
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
          user_id: user.user_id
        }
      });
      
      setAdaptiveContent(response.data.content);
      setCurrentDifficulty(response.data.difficulty_level);
      
      // Initialize with first 5 sentences
      const testSentences = response.data.content.slice(0, 5);
      setSentences(testSentences);
      setUserAnswers(new Array(5).fill(''));
      setCurrentAnswer('');
      setCurrentSentenceIndex(0);
      setTestStarted(false);
      setTestCompleted(false);
      setResults(null);
    } catch (error) {
      console.error('Error fetching adaptive content:', error);
      const fallbackContent = activeTab === 'speech' 
        ? [
            "The cat sleeps on the soft mat",
            "We eat breakfast every morning",
            "Birds fly high in the sky",
            "I love my family very much",
            "The sun is bright today"
          ]
        : [
            "Hello world",
            "Good morning",
            "How are you",
            "Thank you",
            "See you later"
          ];
      setAdaptiveContent(fallbackContent);
      setSentences(fallbackContent.slice(0, 5));
      setUserAnswers(new Array(5).fill(''));
    }
  };

  const startTest = () => {
    setTestStarted(true);
    setCurrentSentenceIndex(0);
    setCurrentAnswer('');
    setError('');
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setError('');
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setError('Microphone access denied. Please allow microphone access to use speech recognition.');
      return false;
    }
  };

  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!browserSupport) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (!recognition) {
      setError('Speech recognition is not initialized. Please refresh the page.');
      return;
    }

    setError('');
    setCurrentAnswer('');
    
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    setIsRecording(true);
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsRecording(false);
      stopMicrophone();
      setError('Error starting speech recognition. Please try again.');
    }
  };

  const stopRecording = () => {
    if (recognition && isRecording) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    setIsRecording(false);
  };

  const playAudio = () => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    setError('');
    setIsPlaying(true);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const sentence = sentences[currentSentenceIndex];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.lang = 'en-US';

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.includes('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    utterance.onerror = () => {
      setIsPlaying(false);
      setError('Error playing audio. Please try again.');
    };
    
    // Some browsers need a small delay
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const saveCurrentAnswer = () => {
    if (activeTab === 'speech') {
      if (!currentAnswer.trim()) {
        setError('Please speak something before moving to next sentence');
        return;
      }
    } else {
      if (!currentAnswer.trim()) {
        setError('Please type your answer before moving to next sentence');
        return;
      }
    }

    // Save current answer
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentSentenceIndex] = currentAnswer;
    setUserAnswers(updatedAnswers);

    // Check if this was the last sentence
    if (currentSentenceIndex === sentences.length - 1) {
      setTestCompleted(true);
      setTestStarted(false);
    } else {
      // Move to next sentence
      setCurrentSentenceIndex(prev => prev + 1);
      setCurrentAnswer('');
    }
    setError('');
  };

  const submitTest = async () => {
    setLoading(true);
    setError('');

    try {
      // Calculate average accuracy
      let totalAccuracy = 0;
      const results = [];

      for (let i = 0; i < sentences.length; i++) {
        const endpoint = activeTab === 'speech' ? 'speech-test' : 'listening-test';
        
        const response = await axios.post(`http://localhost:5000/api/${endpoint}`, {
          user_id: user.user_id,
          [activeTab === 'speech' ? 'spoken_text' : 'typed_text']: userAnswers[i],
          original_text: sentences[i]
        });

        results.push(response.data);
        totalAccuracy += response.data.accuracy;
      }

      const averageAccuracy = totalAccuracy / sentences.length;
      const averageScore = results.reduce((sum, r) => sum + r.score, 0) / sentences.length;

      // Update difficulty based on average performance
      const difficultyResponse = await axios.post('http://localhost:5000/api/update-difficulty', {
        user_id: user.user_id,
        score: averageAccuracy
      });

      setResults({
        type: activeTab,
        averageAccuracy,
        averageScore,
        individualResults: results,
        newDifficulty: difficultyResponse.data.new_difficulty
      });

      setCurrentDifficulty(difficultyResponse.data.new_difficulty);
      
    } catch (error) {
      console.error('Error submitting test:', error);
      setError(error.response?.data?.error || 'Failed to submit test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    setTestStarted(false);
    setTestCompleted(false);
    setCurrentSentenceIndex(0);
    setCurrentAnswer('');
    setUserAnswers(new Array(5).fill(''));
    setResults(null);
    setError('');
    fetchAdaptiveContent();
    stopRecording();
  };

  const getDifficultyLabel = (difficulty) => {
    if (!difficulty) return 'Beginner';
    if (difficulty < 1.3) return 'Beginner';
    if (difficulty < 1.8) return 'Easy';
    if (difficulty < 2.3) return 'Medium';
    if (difficulty < 2.8) return 'Hard';
    return 'Expert';
  };

  const getDifficultyColor = (difficulty) => {
    if (!difficulty) return '#10b981';
    if (difficulty < 1.3) return '#10b981';
    if (difficulty < 1.8) return '#3b82f6';
    if (difficulty < 2.3) return '#f59e0b';
    if (difficulty < 2.8) return '#ef4444';
    return '#8b5cf6';
  };

  const getProgressPercentage = () => {
    const answered = userAnswers.filter(a => a.trim() !== '').length;
    return (answered / sentences.length) * 100;
  };

  return (
    <div className="tests-container">
      <div className="tests-header">
        <h1>🧪 Adaptive Tests</h1>
        <p>Complete 5 sentences to get your score and advance to the next level</p>
        <div className="difficulty-indicator">
          <span className="difficulty-label">Current Level:</span>
          <span 
            className="difficulty-value"
            style={{ backgroundColor: getDifficultyColor(currentDifficulty) }}
          >
            {getDifficultyLabel(currentDifficulty)}
          </span>
          <div className="difficulty-bar">
            <div 
              className="difficulty-fill" 
              style={{ 
                width: `${((currentDifficulty - 0.5) / 2.5) * 100}%`,
                background: `linear-gradient(90deg, ${getDifficultyColor(currentDifficulty)}80, ${getDifficultyColor(currentDifficulty)})`
              }}
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
        {!testStarted && !testCompleted && !results && (
          <div className="test-start">
            <h2>Ready to begin?</h2>
            <p>You will complete 5 sentences at your current level.</p>
            <p>After completing all 5, we'll calculate your average score and adjust your level.</p>
            <button onClick={startTest} className="start-test-btn">
              🚀 Start Test
            </button>
          </div>
        )}

        {testStarted && !testCompleted && (
          <div className="test-active">
            <div className="test-progress">
              <div className="progress-info">
                <span>Sentence {currentSentenceIndex + 1} of {sentences.length}</span>
                <span>{Math.round(getProgressPercentage())}% Complete</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {activeTab === 'speech' ? (
              // SPEECH TEST - Show the sentence
              <div className="speech-test-section">
                <div className="sentence-display">
                  <h4>Read this sentence aloud:</h4>
                  <div className="sentence-box">
                    "{sentences[currentSentenceIndex]}"
                  </div>
                  <div className="difficulty-info">
                    <span style={{ color: getDifficultyColor(currentDifficulty) }}>
                      Level: {getDifficultyLabel(currentDifficulty)}
                    </span>
                  </div>
                </div>

                <div className="speech-section">
                  <div className="recording-controls">
                    {!isRecording ? (
                      <button 
                        className="record-btn"
                        onClick={startRecording}
                        disabled={loading}
                      >
                        🎤 Start Recording
                      </button>
                    ) : (
                      <button 
                        className="record-btn recording"
                        onClick={stopRecording}
                      >
                        🔴 Stop Recording
                      </button>
                    )}
                  </div>
                  
                  <div className="spoken-text">
                    <h4>Your Speech:</h4>
                    <div className="transcript-box">
                      {currentAnswer || 'Your spoken words will appear here...'}
                    </div>
                    {isRecording && (
                      <small className="hint-text">🎤 Recording in progress... Speak clearly</small>
                    )}
                  </div>

                  <div className="manual-input">
                    <h4>Or type manually:</h4>
                    <textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      rows="3"
                      className="type-input"
                      disabled={isRecording || loading}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // LISTENING TEST - DON'T show the sentence
              <div className="listening-test-section">
                <div className="listening-header">
                  <h4>Listen carefully and type what you hear:</h4>
                  <div className="audio-controls">
                    <button 
                      className="play-audio-btn"
                      onClick={playAudio}
                      disabled={isPlaying || loading}
                    >
                      {isPlaying ? '🔊 Playing...' : '▶️ Play Audio'}
                    </button>
                  </div>
                  <div className="difficulty-info" style={{ marginTop: '10px', textAlign: 'center' }}>
                    <span style={{ color: getDifficultyColor(currentDifficulty) }}>
                      Level: {getDifficultyLabel(currentDifficulty)}
                    </span>
                  </div>
                </div>

                <div className="type-section">
                  <textarea 
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type what you hear here..."
                    rows="5"
                    className="type-input"
                    disabled={loading}
                    style={{ fontSize: '1.1rem', marginTop: '20px' }}
                  />
                </div>
              </div>
            )}

            <button 
              className="next-btn"
              onClick={saveCurrentAnswer}
              disabled={loading || (activeTab === 'speech' && isRecording)}
            >
              {currentSentenceIndex === sentences.length - 1 ? '✅ Finish' : '➡️ Next Sentence'}
            </button>
          </div>
        )}

        {testCompleted && !results && (
          <div className="test-complete">
            <h2>🎉 Great job!</h2>
            <p>You've completed all 5 sentences.</p>
            <p>Click submit to see your results and advance to the next level.</p>
            <div className="answers-review">
              <h3>Your Answers:</h3>
              {sentences.map((sentence, index) => (
                <div key={index} className="answer-review-item">
                  <p><strong>Sentence {index + 1}:</strong> {sentence}</p>
                  <p><strong>Your answer:</strong> {userAnswers[index] || 'Not answered'}</p>
                </div>
              ))}
            </div>
            <button 
              className="submit-test-btn"
              onClick={submitTest}
              disabled={loading}
            >
              {loading ? 'Processing...' : '📤 Submit Test'}
            </button>
            <button 
              className="reset-btn"
              onClick={resetTest}
              disabled={loading}
            >
              🔄 Start Over
            </button>
          </div>
        )}

        {results && (
          <div className={`test-result ${results.type}`}>
            <h2>📊 Test Results</h2>
            <div className="result-summary">
              <div className="result-card">
                <span className="result-label">Average Accuracy</span>
                <span className="result-value">{(results.averageAccuracy * 100).toFixed(1)}%</span>
              </div>
              <div className="result-card">
                <span className="result-label">Average Score</span>
                <span className="result-value">{results.averageScore.toFixed(1)}%</span>
              </div>
              <div className="result-card">
                <span className="result-label">New Level</span>
                <span 
                  className="result-value"
                  style={{ color: getDifficultyColor(results.newDifficulty) }}
                >
                  {getDifficultyLabel(results.newDifficulty)}
                </span>
              </div>
            </div>

            <div className="individual-results">
              <h3>Individual Sentence Results:</h3>
              {results.individualResults.map((result, index) => (
                <div key={index} className="individual-result">
                  <p><strong>Sentence {index + 1}:</strong> {(result.accuracy * 100).toFixed(1)}% accuracy</p>
                  <p className="small">Score: {result.score.toFixed(1)}%</p>
                </div>
              ))}
            </div>

            <div className="result-actions">
              <button onClick={resetTest} className="try-again-btn">
                Try Another Test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tests;