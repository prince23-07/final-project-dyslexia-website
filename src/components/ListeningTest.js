import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Tests.css';

const ListeningTest = () => {
  const { user } = useAuth();
  const [audioText, setAudioText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(true);

  const audioSamples = [
    // Simple & Basic Sentences
    "The sun shines bright in the clear blue sky today",
    "My dog likes to play fetch with a red rubber ball",
    "We eat three meals every day breakfast lunch and dinner",
    "Children love to run and jump in the playground",
    "Books help us learn new things and imagine stories",

    // Family & Home
    "My family eats dinner together at the kitchen table",
    "Mother reads bedtime stories to the children every night",
    "We clean our room and put toys away in the box",
    "Father helps with homework after coming home from work",
    "Grandma bakes delicious cookies for us on weekends",

    // School & Learning
    "Students raise their hands to answer teacher questions",
    "We use pencils and crayons to draw colorful pictures",
    "The library has many interesting books about animals",
    "Mathematics teaches us how to count and solve problems",
    "Science class shows us how plants grow from tiny seeds",

    // Food & Eating
    "Fruits and vegetables are healthy foods for our bodies",
    "We drink milk to make our bones and teeth strong",
    "Pizza and pasta are delicious Italian foods we enjoy",
    "Breakfast is the most important meal of the entire day",
    "We should chew our food slowly and not eat too fast",

    // Animals & Nature
    "Butterflies have colorful wings and fly among flowers",
    "Birds build nests in trees to lay their small eggs",
    "Fish swim in water using their fins and tails",
    "Rabbits hop quickly and eat carrots and lettuce",
    "Bees collect nectar from flowers to make sweet honey",

    // Weather & Seasons
    "Rain falls from clouds and helps plants grow tall",
    "Snow covers the ground during cold winter weather",
    "We wear warm coats and gloves when it is freezing",
    "Summer days are perfect for swimming in the pool",
    "Spring brings beautiful flowers and green leaves",

    // Daily Activities
    "We brush our teeth every morning and before bedtime",
    "Children should get plenty of sleep each and every night",
    "Exercise helps keep our bodies healthy and very strong",
    "Washing hands removes germs that can make us sick",
    "We say please and thank you to be polite to others",

    // Transportation
    "Cars and buses take people to work and to school",
    "Airplanes fly high in the sky above the clouds",
    "Trains travel on tracks between different cities",
    "Bicycles are good exercise and help the environment",
    "Boats sail on rivers lakes and across the ocean",

    // Colors & Shapes
    "The rainbow has seven colors red orange yellow green",
    "Circles are round shapes without any corners or edges",
    "Squares have four equal sides and four right angles",
    "Primary colors are red blue and yellow for painting",
    "We mix colors to create new and different shades",

    // Numbers & Counting
    "We learn to count from one to one hundred in school",
    "Addition means putting numbers together to get more",
    "Subtraction means taking away to make numbers smaller",
    "Multiplication is like adding the same number many times",
    "Division means sharing things equally between friends",

    // Time & Calendar
    "There are seven days in one week Monday through Sunday",
    "A clock tells us what time it is during the day",
    "Morning afternoon evening and night are parts of day",
    "There are twelve months in one complete whole year",
    "We celebrate birthdays on the same date every year",

    // Feelings & Emotions
    "Happy people smile and laugh when they feel good",
    "Sad feelings sometimes make us cry and want hugs",
    "Being angry is normal but we should not hurt others",
    "Surprise can be exciting or sometimes a little scary",
    "Love is the strongest feeling for family and friends",

    // Community Helpers
    "Doctors help sick people feel better and get well",
    "Police officers keep our neighborhoods safe and secure",
    "Firefighters put out fires and rescue people in danger",
    "Teachers help children learn reading writing and math",
    "Farmers grow the food that we eat every single day",

    // Hobbies & Fun
    "Drawing and painting are fun ways to be creative",
    "Playing sports helps children learn about teamwork",
    "Reading books takes us on adventures in our minds",
    "Singing and dancing make us feel happy and joyful",
    "Building with blocks develops our thinking skills",

    // Health & Safety
    "We look both ways before crossing any busy street",
    "Wearing seatbelts in cars keeps everyone much safer",
    "Healthy food gives us energy to play and to learn",
    "Exercise makes our hearts strong and bodies healthy",
    "We should always tell adults if we feel scared or hurt",

    // Advanced Sentences
    "The curious kitten chased the bouncing ball around the room",
    "Children should drink water instead of sugary soda drinks",
    "Our planet Earth revolves around the sun once each year",
    "Electricity powers lights computers and kitchen appliances",
    "Libraries are quiet places where people read and study",

    // Moral Lessons
    "Sharing toys with friends makes playing more fun for everyone",
    "Being honest is always better than telling any kind of lie",
    "We should help others when they need our assistance",
    "Saying sorry when we make mistakes shows we are sorry",
    "Working together helps us accomplish difficult tasks",

    // Science & Nature
    "Plants need sunlight water and soil to grow properly",
    "The moon orbits around our planet Earth every month",
    "Butterflies go through metamorphosis from caterpillars",
    "Water exists in three forms solid liquid and as gas",
    "Gravity pulls everything down toward the ground below"
  ];

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSpeechSynthesisSupported(false);
      setError('Text-to-speech is not supported in your browser. Please use Chrome, Edge, or Safari.');
    }
    resetTest();
  }, []);

  const playAudio = () => {
    if (!speechSynthesisSupported) return;

    setError('');
    setIsPlaying(true);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(audioText);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
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

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError('Error playing audio. Please try again.');
      setIsPlaying(false);
    };

    // Some browsers need a small delay
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const submitTest = async () => {
    if (!userInput.trim()) {
      setError('Please type what you heard');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/listening-test', {
        user_id: user.user_id,
        typed_text: userInput,
        original_text: audioText
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
    const randomText = audioSamples[Math.floor(Math.random() * audioSamples.length)];
    setAudioText(randomText);
    setUserInput('');
    setResults(null);
    setError('');
    // Cancel any playing audio
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  if (!speechSynthesisSupported) {
    return (
      <div className="test-container">
        <div className="error-message">
          <h3>Browser Not Supported</h3>
          <p>Text-to-speech is not supported in your browser.</p>
          <p>Please use <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Safari</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="test-container">
      <h2>Listening Test</h2>
      
      {!results && (
        <div className="test-instructions">
          <h3>Instructions:</h3>
          <ol>
            <li>Click "Play Audio" to hear the sentence</li>
            <li>Listen carefully to the entire sentence</li>
            <li>You can replay the audio multiple times</li>
            <li>Type exactly what you hear</li>
            <li>Click "Submit Test" when finished</li>
          </ol>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="sentence-display">
            <h4>Listen to this sentence:</h4>
            <div className="audio-controls">
              <button 
                onClick={playAudio}
                className="play-audio-btn"
                disabled={isPlaying || loading}
              >
                {isPlaying ? '🔊 Playing...' : '▶️ Play Audio'}
              </button>
              {isPlaying && <span className="playing-indicator">🔊 Speaking...</span>}
            </div>
          </div>

          <div className="type-section">
            <h4>Type what you hear:</h4>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type the sentence you hear here..."
              rows="4"
              className="type-input"
              disabled={loading}
            />
          </div>

          <div className="test-actions">
            <button 
              onClick={submitTest}
              className="submit-test-btn"
              disabled={loading || !userInput.trim()}
            >
              {loading ? 'Processing...' : '📤 Submit Test'}
            </button>
            <button 
              onClick={resetTest}
              className="reset-btn"
              disabled={loading}
            >
              🔄 New Sentence
            </button>
          </div>
        </div>
      )}

      {results && (
        <div className="test-result listening">
          <h3>Test Results</h3>
          <div className="result-details">
            <div className="result-item">
              <span className="result-label">Accuracy</span>
              <span className="result-value">{(results.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="result-item">
              <span className="result-label">Score</span>
              <span className="result-value">{results.score.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="comparison-section">
            <h4>Comparison:</h4>
            <p><strong>Original:</strong> {audioText}</p>
            <p><strong>You typed:</strong> {userInput}</p>
          </div>
          
          <div className="result-actions">
            <button onClick={resetTest} className="try-again-btn">
              Try Another Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListeningTest;