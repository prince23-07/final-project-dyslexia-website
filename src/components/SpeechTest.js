import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Tests.css';

const SpeechTest = () => {
  const { user } = useAuth();
  const [paragraph, setParagraph] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [browserSupport, setBrowserSupport] = useState(true);

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

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Check browser support
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setBrowserSupport(false);
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    if (!testStarted) {
      const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
      setParagraph(randomParagraph);
    }
  }, [testStarted]);

  const startTest = () => {
    if (!browserSupport) {
      alert('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }

    setTestStarted(true);
    resetTranscript();
    
    // Try different speech recognition methods
    try {
      SpeechRecognition.startListening({ 
        continuous: true, 
        language: 'en-US' 
      });
    } catch (error) {
      console.error('Speech recognition error:', error);
      alert('Error starting speech recognition. Please check your microphone permissions.');
    }
  };

  const stopTest = async () => {
    try {
      SpeechRecognition.stopListening();
      setLoading(true);

      // If no speech was detected, show a message
      if (!transcript.trim()) {
        setLoading(false);
        alert('No speech detected. Please make sure your microphone is working and try again.');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/speech-test', {
        user_id: user.user_id,
        spoken_text: transcript,
        original_text: paragraph,
        time_taken: 60 // In a real app, calculate actual time
      });

      setResults(response.data);
      
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Error submitting test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    setTestStarted(false);
    setResults(null);
    resetTranscript();
  };

  // Manual transcript input for testing
  const ManualInput = () => {
    const [manualText, setManualText] = useState('');

    const submitManual = async () => {
      if (!manualText.trim()) {
        alert('Please enter some text');
        return;
      }

      setLoading(true);
      try {
        const response = await axios.post('http://localhost:5000/api/speech-test', {
          user_id: user.user_id,
          spoken_text: manualText,
          original_text: paragraph,
          time_taken: 60
        });
        setResults(response.data);
      } catch (error) {
        console.error('Error submitting test:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="manual-input" style={{ marginTop: '20px' }}>
        <h4>Manual Input (Fallback)</h4>
        <p>If speech recognition isn't working, type what you spoke:</p>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Type what you spoke here..."
          rows="4"
          className="child-friendly-input"
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <button onClick={submitManual} className="test-button">
          Submit Manual Input
        </button>
      </div>
    );
  };

  if (!browserSupport) {
    return (
      <div className="test-container">
        <div className="error-message">
          <h3>Browser Not Supported</h3>
          <p>Speech recognition is not supported in your browser.</p>
          <p>Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for the best experience.</p>
          <ManualInput />
        </div>
      </div>
    );
  }

  return (
    <div className="test-container">
      <h2>Speech Test</h2>
      
      {!testStarted && !results && (
        <div className="test-instructions">
          <h3>Instructions:</h3>
          <p>1. Click "Start Test" to begin</p>
          <p>2. <strong>Allow microphone access</strong> when prompted</p>
          <p>3. Read the paragraph aloud clearly</p>
          <p>4. Click "Stop Test" when finished</p>
          <p>5. <strong>Use Chrome or Edge</strong> for best results</p>
          
          <button onClick={startTest} className="test-button">
            Start Test
          </button>
        </div>
      )}

      {testStarted && !results && (
        <div className="test-active">
          <div className="paragraph-display">
            <h3>Read this paragraph aloud:</h3>
            <div className="paragraph-text">{paragraph}</div>
          </div>
          
          <div className="speech-status">
            <div className={`status-indicator ${listening ? 'listening' : 'not-listening'}`}>
              {listening ? '🎤 Listening... Speak now!' : '⏸️ Paused - Click Start again'}
            </div>
            
            {!listening && (
              <div style={{ 
                background: '#fef3c7', 
                padding: '10px', 
                borderRadius: '8px', 
                margin: '10px 0',
                color: '#92400e'
              }}>
                <strong>Not listening:</strong> Click below to restart listening
                <button 
                  onClick={startTest} 
                  className="test-button"
                  style={{ margin: '10px 0' }}
                >
                  Restart Listening
                </button>
              </div>
            )}
            
            <h4>Your speech will appear here:</h4>
            <div style={{ 
              background: '#f8fafc', 
              padding: '15px', 
              borderRadius: '10px', 
              minHeight: '60px',
              border: '2px dashed #cbd5e1',
              marginTop: '10px'
            }}>
              {transcript || 'Start speaking... your words will appear here.'}
            </div>
          </div>

          <button onClick={stopTest} className="test-button stop">
            Stop Test
          </button>

          {/* Show manual input as fallback */}
          <ManualInput />
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Analyzing your speech...</p>
        </div>
      )}

      {results && (
        <div className="test-results">
          <h3>Test Results</h3>
          <div className="result-item">
            <span>Accuracy:</span>
            <span>{(results.accuracy * 100).toFixed(1)}%</span>
          </div>
          <div className="result-item">
            <span>Words per Minute:</span>
            <span>{results.words_per_minute.toFixed(1)}</span>
          </div>
          <div className="result-item">
            <span>Overall Score:</span>
            <span>{results.score.toFixed(1)}/100</span>
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '10px' }}>
            <h4>What you spoke:</h4>
            <p style={{ fontStyle: 'italic' }}>{transcript}</p>
          </div>
          
          <button onClick={resetTest} className="test-button">
            Try Another Test
          </button>
        </div>
      )}
    </div>
  );
};

export default SpeechTest;