import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Tests.css';

const SpeechTest = () => {
  const { user } = useAuth();
  const [paragraph, setParagraph] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [browserSupport, setBrowserSupport] = useState(true);
  const [error, setError] = useState('');
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const paragraphs = [
    // Easy & Simple Sentences
    "The cat sleeps on the soft mat near the warm fireplace every afternoon.",
    "My little brother loves to play with his red ball in the green garden.",
    "We eat breakfast together every morning before going to school and work.",
    "The sun rises in the east and sets in the west every single day.",
    "Birds build nests in trees to lay eggs and raise their young babies.",

    // Daily Activities
    "After finishing homework, the children went outside to play with their friends.",
    "My mother prepares delicious meals for our family in the kitchen every evening.",
    "We visit the library every Saturday to borrow new books and read stories.",
    "The students listen carefully to their teacher during the mathematics lesson.",
    "Every weekend, our family enjoys watching movies together in the living room.",

    // Nature & Animals
    "Butterflies with colorful wings fly from flower to flower in the garden.",
    "The tall trees sway gently in the wind during the peaceful summer afternoon.",
    "Dolphins swim gracefully in the deep blue ocean near the coral reef.",
    "Farmers work hard in the fields to grow crops like wheat and corn.",
    "The bright moon shines at night, surrounded by thousands of twinkling stars.",

    // School & Learning
    "Students practice writing letters and numbers in their notebooks every day.",
    "The science teacher showed interesting experiments with water and colors.",
    "Reading books helps children learn new words and improve their vocabulary.",
    "Mathematics teaches us how to solve problems using numbers and logic.",
    "Art class allows students to express their creativity through painting.",

    // Food & Health
    "Eating fresh fruits and vegetables helps keep our bodies strong and healthy.",
    "Drinking plenty of water is important for staying hydrated throughout the day.",
    "Exercise makes our muscles strong and helps us feel energetic and happy.",
    "Sleeping well at night helps our brains rest and prepares us for tomorrow.",
    "Washing hands before meals prevents germs from making us sick.",

    // Family & Friends
    "Grandparents tell wonderful stories about their childhood to their grandchildren.",
    "Friends share toys and play games together in the school playground.",
    "Families celebrate birthdays with cakes, presents, and happy songs.",
    "Brothers and sisters sometimes argue but always love each other deeply.",
    "Neighbors help each other with gardening and watching houses during vacations.",

    // Weather & Seasons
    "Rain falls from gray clouds and helps plants grow in the spring season.",
    "Snow covers the ground like a white blanket during cold winter months.",
    "Bright sunshine warms the earth during hot summer days at the beach.",
    "Colorful leaves fall from trees during the beautiful autumn season.",
    "Strong winds blow during storms, making tree branches sway wildly.",

    // Transportation
    "Cars and buses drive on roads to take people to different places.",
    "Airplanes fly high in the sky, carrying passengers to faraway countries.",
    "Trains travel on tracks between cities, moving people and goods quickly.",
    "Boats sail on rivers and oceans, using wind or engines for power.",
    "Bicycles are healthy transportation that helps keep the environment clean.",

    // Hobbies & Fun
    "Children enjoy drawing pictures with crayons and colored pencils.",
    "Playing musical instruments like piano and guitar brings joy to people.",
    "Sports like soccer and basketball help children learn teamwork and cooperation.",
    "Building with blocks and LEGO develops creativity and problem-solving skills.",
    "Dancing to music is a fun way to exercise and express happiness.",

    // Community & World
    "Doctors and nurses work in hospitals to help sick people feel better.",
    "Police officers keep our communities safe by protecting people from danger.",
    "Firefighters bravely rescue people from burning buildings and emergencies.",
    "Teachers educate children and help them learn important life skills.",
    "Farmers grow the food that we eat every day for breakfast, lunch, and dinner.",

    // Advanced Sentences
    "The curious explorer discovered ancient ruins hidden deep in the jungle.",
    "Scientists conduct experiments to understand how the universe works.",
    "Musicians practice for hours to perfect their performances on stage.",
    "Astronauts float in space stations while orbiting around our planet Earth.",
    "Engineers design amazing bridges and buildings that are strong and beautiful.",

    // Educational & Moral
    "Being honest and telling the truth is important for building trust with others.",
    "Sharing with friends shows kindness and makes everyone feel included.",
    "Working hard and never giving up helps us achieve our dreams and goals.",
    "Listening carefully to others shows respect and helps us learn new things.",
    "Being patient means waiting calmly for things we really want to have.",

    // Fun & Imaginative
    "Magical dragons fly over castles in fairy tales that children love to read.",
    "Pirates search for treasure chests filled with gold coins and jewels.",
    "Superheroes use their special powers to save people from dangerous villains.",
    "Space aliens might live on other planets far away in distant galaxies.",
    "Mermaids swim in the ocean with beautiful fish and colorful coral reefs."
  ];

  // Initialize speech recognition
  useEffect(() => {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setBrowserSupport(false);
      setError('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onresult = (event) => {
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

      setTranscript(prev => (finalTranscript + interimTranscript).trim());
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and try again.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try speaking again.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopMicrophone();
    };
  }, []);

  useEffect(() => {
    const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
    setParagraph(randomParagraph);
  }, []);

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

  const startRecording = async () => {
    setError('');
    
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    try {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
    stopMicrophone();
    setIsRecording(false);
  };

  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const submitTest = async () => {
    const textToSubmit = transcript || manualText;
    
    if (!textToSubmit.trim()) {
      setError('Please speak something or enter text manually');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/speech-test', {
        user_id: user.user_id,
        spoken_text: textToSubmit,
        original_text: paragraph
      });

      setResults(response.data);
      
    } catch (error) {
      console.error('Error submitting test:', error);
      setError(error.response?.data?.error || 'Failed to submit test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
    setParagraph(randomParagraph);
    setTranscript('');
    setManualText('');
    setResults(null);
    setError('');
    stopRecording();
  };

  if (!browserSupport) {
    return (
      <div className="test-container">
        <div className="error-message">
          <h3>Browser Not Supported</h3>
          <p>Speech recognition is not supported in your browser.</p>
          <p>Please use <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Safari</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="test-container">
      <h2>Speech Test</h2>
      
      {!results && (
        <div className="test-instructions">
          <h3>Instructions:</h3>
          <ol>
            <li>Read the sentence below aloud</li>
            <li>Click "Start Recording" and allow microphone access</li>
            <li>Speak clearly and at a normal pace</li>
            <li>Click "Stop Recording" when finished</li>
            <li>Review your speech and click "Submit Test"</li>
          </ol>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="sentence-display">
            <h4>Read this sentence aloud:</h4>
            <div className="sentence-box">
              "{paragraph}"
            </div>
          </div>

          <div className="recording-section">
            <div className="recording-controls">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="record-btn"
                  disabled={loading}
                >
                  🎤 Start Recording
                </button>
              ) : (
                <button 
                  onClick={stopRecording}
                  className="record-btn recording"
                >
                  🔴 Stop Recording
                </button>
              )}
            </div>
            
            <div className="spoken-text">
              <h4>Your Speech:</h4>
              <div className="transcript-box">
                {transcript || 'Your spoken words will appear here...'}
              </div>
              {isRecording && (
                <small className="hint-text">🎤 Recording in progress... Speak clearly</small>
              )}
            </div>
          </div>

          <div className="manual-input-section">
            <h4>Manual Input (if speech isn't working):</h4>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type what you spoke here..."
              rows="3"
              className="type-input"
              disabled={loading}
            />
          </div>

          <button 
            onClick={submitTest}
            className="submit-test-btn"
            disabled={loading || (!transcript && !manualText)}
          >
            {loading ? 'Processing...' : '📤 Submit Test'}
          </button>
        </div>
      )}

      {results && (
        <div className="test-result speech">
          <h3>Test Results</h3>
          <div className="result-details">
            <div className="result-item">
              <span className="result-label">Accuracy</span>
              <span className="result-value">{(results.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="result-item">
              <span className="result-label">Words per Minute</span>
              <span className="result-value">{results.words_per_minute?.toFixed(1)}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Score</span>
              <span className="result-value">{results.score.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="comparison-section">
            <h4>Comparison:</h4>
            <p><strong>Original:</strong> {paragraph}</p>
            <p><strong>You said:</strong> {transcript || manualText}</p>
          </div>
          
          <button onClick={resetTest} className="try-again-btn">
            Try Another Test
          </button>
        </div>
      )}
    </div>
  );
};

export default SpeechTest;