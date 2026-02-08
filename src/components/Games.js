import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Games.css';

const Games = () => {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);

  const games = [
    {
      id: 1,
      name: "Word Jumble",
      description: "Unscramble the words to form correct sentences",
      icon: "🔤",
      component: WordJumbleGame
    },
    {
      id: 2,
      name: "Memory Match",
      description: "Match words with their pictures",
      icon: "🧩",
      component: MemoryMatchGame
    },
    {
      id: 3,
      name: "Spelling Bee",
      description: "Spell the words you hear correctly",
      icon: "🐝",
      component: SpellingBeeGame
    }
  ];

  // Function to save game scores to the backend
  const saveGameScore = async (gameType, score, level, timeTaken = null) => {
    try {
      await axios.post('http://localhost:5000/api/save-game-score', {
        user_id: user.user_id,
        game_type: gameType,
        score: score,
        level: level,
        time_taken: timeTaken
      });
      console.log('Final game score saved successfully');
    } catch (error) {
      console.error('Error saving game score:', error);
    }
  };

  const GameComponent = activeGame?.component;

  if (activeGame) {
    return (
      <div className="games-container">
        <button 
          onClick={() => setActiveGame(null)}
          className="back-button"
        >
          ← Back to Games
        </button>
        <GameComponent saveGameScore={saveGameScore} />
      </div>
    );
  }

  return (
    <div className="games-container">
      <h2>Learning Games</h2>
      <p className="games-subtitle">Choose a game to improve your skills!</p>
      
      <div className="games-grid">
        {games.map(game => (
          <div 
            key={game.id} 
            className="game-card"
            onClick={() => setActiveGame(game)}
          >
            <div className="game-icon">{game.icon}</div>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Word Jumble Game Component
function WordJumbleGame({ saveGameScore }) {
  const [currentSentence, setCurrentSentence] = useState('');
  const [scrambledWords, setScrambledWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [moves, setMoves] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [correctSentences, setCorrectSentences] = useState([]);
  const [allSentences, setAllSentences] = useState([]);
  const [showAnswers, setShowAnswers] = useState(false);

  const sentences = [
    // Simple & Basic Sentences
    "The cat sleeps on the soft mat",
    "My dog plays with a red ball",
    "We eat breakfast every morning",
    "The sun shines in the sky",
    "Birds fly high above trees",
    "I love my family very much",
    "Children play in the park",
    "The fish swim in water",
    "We read books every day",
    "Mother cooks delicious food",

    // Family & Home Life
    "My father reads the newspaper",
    "We watch television together",
    "The baby sleeps in the crib",
    "Our house has a big garden",
    "We clean our rooms daily",
    "Grandma tells wonderful stories",
    "We eat dinner at the table",
    "My sister plays the piano",
    "Brothers share their toys",
    "We help with household chores",

    // School & Learning
    "Students learn in the classroom",
    "Teachers write on the board",
    "We use pencils for writing",
    "The library has many books",
    "Children raise their hands",
    "We solve math problems together",
    "Science class is very interesting",
    "We draw pictures with crayons",
    "Students listen to stories",
    "We practice spelling words",

    // Nature & Animals
    "Butterflies fly among flowers",
    "Rabbits hop in the grass",
    "Bees make sweet honey",
    "Trees grow tall and strong",
    "Flowers bloom in spring",
    "The moon shines at night",
    "Stars twinkle in the sky",
    "Rain falls from clouds",
    "Snow covers the ground",
    "Wind blows through trees",

    // Food & Health
    "We eat fruits for health",
    "Vegetables make us strong",
    "Drinking water is important",
    "We brush our teeth daily",
    "Exercise keeps us fit",
    "Sleep helps us grow",
    "We wash our hands often",
    "Milk makes bones strong",
    "We eat three meals daily",
    "Healthy food gives energy",

    // Activities & Hobbies
    "We play games with friends",
    "Children ride their bicycles",
    "We swim in the pool",
    "Friends jump rope together",
    "We build with toy blocks",
    "Children sing happy songs",
    "We dance to fun music",
    "Friends play hide and seek",
    "We run in the playground",
    "Children climb on equipment",

    // Weather & Seasons
    "The sun warms the earth",
    "Rain helps plants grow",
    "Snow is cold and white",
    "Wind blows leaves around",
    "Clouds float in sky",
    "Summer days are hot",
    "Winter brings cold weather",
    "Spring has pretty flowers",
    "Autumn leaves change color",
    "Weather changes every day",

    // Community & Helpers
    "Doctors help sick people",
    "Police officers protect us",
    "Firefighters put out fires",
    "Teachers educate children",
    "Farmers grow our food",
    "Nurses care for patients",
    "Drivers operate vehicles",
    "Chefs cook delicious meals",
    "Artists create beautiful paintings",
    "Musicians play lovely music",

    // Transportation
    "Cars drive on roads",
    "Buses carry many people",
    "Trains run on tracks",
    "Airplanes fly high",
    "Boats sail on water",
    "Bicycles have two wheels",
    "Trucks deliver goods",
    "Ships cross the ocean",
    "Motorcycles go fast",
    "Helicopters hover above",

    // Colors & Shapes
    "The sky is blue",
    "Grass is green",
    "Apples can be red",
    "Bananas are yellow",
    "Oranges are orange",
    "Circles are round shapes",
    "Squares have four sides",
    "Triangles have three corners",
    "Hearts mean love",
    "Stars have five points",

    // Numbers & Counting
    "We count from one to ten",
    "Two plus two equals four",
    "Numbers help us measure",
    "We learn to add numbers",
    "Counting is fun to do",
    "We subtract to find difference",
    "Multiplication makes numbers bigger",
    "Division shares things equally",
    "We use numbers every day",
    "Mathematics is everywhere",

    // Feelings & Emotions
    "Happy people smile often",
    "Sad feelings make us cry",
    "Anger is a strong emotion",
    "Love makes us feel warm",
    "We feel excited about surprises",
    "Fear helps keep us safe",
    "Pride comes from achievement",
    "Kindness helps other people",
    "Friendship is very important",
    "We share our feelings openly",

    // Moral Values
    "We should always be honest",
    "Sharing makes us good friends",
    "Helping others is kind",
    "We say please and thank you",
    "Being polite shows respect",
    "We take turns when playing",
    "Listening is important too",
    "We apologize for mistakes",
    "Working hard brings success",
    "We should never give up"
  ];

  const scrambleSentence = (sentence) => {
    if (!sentence || typeof sentence !== 'string') {
      console.error('Invalid sentence in scrambleSentence:', sentence);
      return [];
    }
    const words = sentence.split(' ');
    return [...words].sort(() => Math.random() - 0.5);
  };

  const startNewRound = () => {
    if (moves >= 11) {
      endGame();
      return;
    }

    // Make sure sentences array exists and has items
    if (!sentences || sentences.length === 0) {
      console.error('Sentences array is empty or undefined');
      setFeedback('❌ Game error: No sentences available');
      return;
    }

    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    if (!sentence) {
      console.error('Selected sentence is undefined');
      return;
    }
    
    setCurrentSentence(sentence);
    setScrambledWords(scrambleSentence(sentence));
    setSelectedWords([]);
    setFeedback('');
    
    // Track all sentences shown
    setAllSentences(prev => {
      if (!prev.some(s => s.sentence === sentence)) {
        return [...prev, {
          sentence,
          correct: false,
          userAnswer: null,
          completed: false
        }];
      }
      return prev;
    });
  };

  const selectWord = (word) => {
    if (gameCompleted) return;
    setSelectedWords([...selectedWords, word]);
  };

  const removeWord = (index) => {
    if (gameCompleted) return;
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
  };

  const checkAnswer = () => {
    if (gameCompleted || !currentSentence) return;

    const userSentence = selectedWords.join(' ');
    const newMoves = moves + 1;
    setMoves(newMoves);

    // Update the allSentences array with user's attempt
    setAllSentences(prev => prev.map(item => 
      item.sentence === currentSentence 
        ? { 
            ...item, 
            userAnswer: userSentence,
            correct: userSentence === currentSentence,
            completed: true
          }
        : item
    ));

    if (userSentence === currentSentence) {
      const newScore = score + 10;
      setScore(newScore);
      setFeedback('🎉 Correct! Well done!');
      
      // Add to correct sentences list
      setCorrectSentences(prev => [...prev, currentSentence]);
      
      if (newMoves >= 11) {
        endGame();
      } else {
        setTimeout(startNewRound, 1500);
      }
    } else {
      setFeedback('❌ Not quite right! Try again!');
      if (newMoves >= 11) {
        endGame();
      }
    }
  };

  const skipSentence = () => {
    if (gameCompleted) return;
    
    const newMoves = moves + 1;
    setMoves(newMoves);
    setFeedback('⏭️ Sentence skipped!');
    
    // Mark as completed but incorrect
    setAllSentences(prev => prev.map(item => 
      item.sentence === currentSentence 
        ? { 
            ...item, 
            userAnswer: null,
            correct: false,
            completed: true
          }
        : item
    ));
    
    if (newMoves >= 11) {
      endGame();
    } else {
      setTimeout(startNewRound, 1000);
    }
  };

  const endGame = () => {
    setGameCompleted(true);
    const level = Math.floor(score / 50) + 1;
    saveGameScore('word_jumble', score, level);
  };

  const downloadResults = () => {
    const content = `Word Jumble Game Results\n\n` +
                    `Final Score: ${score}\n` +
                    `Correct Sentences: ${Math.floor(score / 10)}\n` +
                    `Total Moves: ${moves}\n\n` +
                    `ALL SENTENCES WITH ANSWERS:\n\n` +
                    allSentences.map((item, index) => {
                      const status = item.correct ? '✅ CORRECT' : '❌ INCORRECT';
                      const userAnswer = item.userAnswer ? `Your answer: "${item.userAnswer}"` : 'Skipped';
                      const correctAnswer = `Correct answer: "${item.sentence}"`;
                      return `${index + 1}. ${item.sentence}\n   ${status}\n   ${userAnswer}\n   ${correctAnswer}\n`;
                    }).join('\n') +
                    `\n\nCORRECT SENTENCES ONLY:\n\n` +
                    correctSentences.map((sentence, index) => 
                      `${index + 1}. ${sentence}`
                    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `word_jumble_results_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const restartGame = () => {
    setScore(0);
    setMoves(0);
    setGameCompleted(false);
    setFeedback('');
    setCorrectSentences([]);
    setAllSentences([]);
    setShowAnswers(false);
    startNewRound();
  };

  // Initialize first round
  React.useEffect(() => {
    if (sentences && sentences.length > 0) {
      startNewRound();
    } else {
      console.error('Cannot start game: sentences array is empty');
      setFeedback('❌ Game error: No sentences available');
    }
  }, []);

  const completedSentences = allSentences.filter(s => s.completed);
  const correctCount = allSentences.filter(s => s.correct).length;

  return (
    <div className="game-screen">
      <h3>Word Jumble</h3>
      <div className="score">Score: {score} | Moves: {moves}/11 | Correct: {correctCount}/{completedSentences.length}</div>
      
      {gameCompleted && (
        <div className="game-completed">
          <h4>Game Completed! 🎉</h4>
          <p>Final Score: {score}</p>
          <p>Correct Sentences: {Math.floor(score / 10)}</p>
          <p>Total Moves: {moves}</p>
          
          {/* Toggle Answers Button */}
          <button 
            onClick={() => setShowAnswers(!showAnswers)} 
            className="answers-toggle-btn"
          >
            {showAnswers ? '🙈 Hide Answers' : '👁️ Show All Answers'}
          </button>
          
          {/* Answers Display - Collapsible */}
          {showAnswers && (
            <div className="answers-section">
              <h5>All Sentences with Answers:</h5>
              <div className="answers-list">
                {allSentences.map((item, index) => (
                  <div key={index} className={`answer-item ${item.correct ? 'correct' : 'incorrect'}`}>
                    <div className="sentence-number">{index + 1}.</div>
                    <div className="sentence-content">
                      <div className="original-sentence">"{item.sentence}"</div>
                      <div className="answer-status">
                        {item.correct ? (
                          <span className="status-correct">✅ You got this right!</span>
                        ) : item.userAnswer ? (
                          <>
                            <span className="status-incorrect">❌ Your answer: "{item.userAnswer}"</span>
                            <span className="correct-answer">Correct: "{item.sentence}"</span>
                          </>
                        ) : (
                          <span className="status-skipped">⏭️ Skipped - Answer: "{item.sentence}"</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="download-controls">
            <button onClick={downloadResults} className="download-button">
              📥 Download Results (.txt)
            </button>
            <button onClick={restartGame} className="restart-button">
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
      
      {!gameCompleted && (
        <>
          <div className="game-area">
            <div className="scrambled-words">
              <h4>Scrambled Words:</h4>
              <div className="words-container">
                {scrambledWords.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => selectWord(word)}
                    className="word-bubble"
                    disabled={selectedWords.includes(word) || gameCompleted}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>

            <div className="selected-words">
              <h4>Your Sentence:</h4>
              <div className="sentence-container">
                {selectedWords.map((word, index) => (
                  <span 
                    key={index} 
                    className="selected-word"
                    onClick={() => removeWord(index)}
                  >
                    {word}
                  </span>
                ))}
                {selectedWords.length === 0 && (
                  <span className="placeholder">Click words above to build your sentence</span>
                )}
              </div>
            </div>

            {feedback && (
              <div className={`feedback ${feedback.includes('🎉') ? 'correct' : 'incorrect'}`}>
                {feedback}
              </div>
            )}

            <div className="game-controls">
              <button onClick={checkAnswer} className="check-button" disabled={selectedWords.length === 0}>
                Check Answer
              </button>
              <button onClick={skipSentence} className="skip-button">
                Skip Sentence
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Memory Match Game Component
function MemoryMatchGame({ saveGameScore }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Dynamic word-emoji pairs that change every game
  const generateWordPairs = () => {
    const allPairs = [
      { word: "CAT", emoji: "🐱" },
      { word: "DOG", emoji: "🐶" },
      { word: "SUN", emoji: "☀️" },
      { word: "STAR", emoji: "⭐" },
      { word: "BOOK", emoji: "📚" },
      { word: "BALL", emoji: "⚽" },
      { word: "FISH", emoji: "🐠" },
      { word: "BIRD", emoji: "🐦" },
      { word: "CAKE", emoji: "🍰" },
      { word: "TREE", emoji: "🌳" },
      { word: "MOON", emoji: "🌙" },
      { word: "BEAR", emoji: "🐻" },
      { word: "DUCK", emoji: "🦆" },
      { word: "FROG", emoji: "🐸" },
      { word: "LION", emoji: "🦁" },
      { word: "APPLE", emoji: "🍎" },
      { word: "HEART", emoji: "❤️" },
      { word: "HOUSE", emoji: "🏠" },
      { word: "CAR", emoji: "🚗" },
      { word: "SHIP", emoji: "🚢" }
    ];

    // Shuffle and pick 6 random pairs
    return [...allPairs]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
  };

  const initializeGame = () => {
    const wordPairs = generateWordPairs();
    const gameCards = [...wordPairs, ...wordPairs]
      .map((pair, index) => ({
        ...pair,
        id: index,
        type: index < wordPairs.length ? 'word' : 'emoji'
      }))
      .sort(() => Math.random() - 0.5);
    
    setCards(gameCards);
    setFlipped([]);
    setMatched([]);
    setScore(0);
    setMoves(0);
    setGameCompleted(false);
  };

  React.useEffect(() => {
    initializeGame();
  }, []);

  React.useEffect(() => {
    // Check if game should end (11 moves or all matched)
    if (moves >= 11 || (matched.length === cards.length && cards.length > 0)) {
      endGame();
    }
  }, [moves, matched, cards.length]);

  const handleCardClick = (index) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index) || gameCompleted) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const newMoves = moves + 1;
      setMoves(newMoves);
      
      const [first, second] = newFlipped;
      if (cards[first].word === cards[second].word) {
        const newMatched = [...matched, first, second];
        setMatched(newMatched);
        const newScore = score + 10;
        setScore(newScore);
      }
      setTimeout(() => setFlipped([]), 1000);
    }
  };

  const endGame = () => {
    setGameCompleted(true);
    const level = Math.floor(score / 60) + 1;
    saveGameScore('memory_match', score, level);
  };

  return (
    <div className="game-screen">
      <h3>Memory Match</h3>
      <div className="score">Score: {score} | Moves: {moves}/11 | Matched: {matched.length/2}/6</div>
      
      {gameCompleted && (
        <div className="game-completed">
          <h4>Game Completed! 🎉</h4>
          <p>Final Score: {score}</p>
          <p>Pairs Matched: {matched.length / 2} out of 6</p>
        </div>
      )}
      
      <div className="memory-grid">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`memory-card ${
              flipped.includes(index) || matched.includes(index) ? 'flipped' : ''
            } ${gameCompleted ? 'completed' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <div className="card-front">?</div>
            <div className="card-back">
              {card.type === 'word' ? card.word : card.emoji}
            </div>
          </div>
        ))}
      </div>

      <div className="game-controls">
        <button onClick={initializeGame} className="restart-button">
          New Game
        </button>
      </div>
    </div>
  );
}

// Spelling Bee Game Component
function SpellingBeeGame({ saveGameScore }) {
  const [currentWord, setCurrentWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [moves, setMoves] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);

  const words = [
    "cat", "dog", "sun", "book", "ball", "tree", "house", "water",
    "happy", "friend", "school", "family", "animal", "garden",
    "flower", "mother", "father", "sister", "brother", "color",
    "apple", "banana", "orange", "grape", "lemon", "peach",
    "table", "chair", "window", "door", "floor", "ceiling",
    "pencil", "paper", "eraser", "ruler", "crayon", "marker"
  ];

  const speakWord = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.7;
    utterance.pitch = 1.2;
    speechSynthesis.speak(utterance);
  };

  const getNewWord = () => {
    return words[Math.floor(Math.random() * words.length)];
  };

  const startNewWord = () => {
    if (moves >= 11) {
      endGame();
      return;
    }

    const word = getNewWord();
    setCurrentWord(word);
    setUserInput('');
    setFeedback('');
    setTimeout(() => speakWord(word), 500);
  };

  const checkSpelling = () => {
    if (gameCompleted) return;

    const newMoves = moves + 1;
    setMoves(newMoves);

    if (userInput.toLowerCase() === currentWord.toLowerCase()) {
      const newScore = score + 10;
      setScore(newScore);
      setFeedback('🎉 Correct spelling!');
      
      if (newMoves >= 11) {
        endGame();
      } else {
        setTimeout(startNewWord, 1500);
      }
    } else {
      setFeedback('❌ Try again!');
      if (newMoves >= 11) {
        endGame();
      }
    }
  };

  const skipWord = () => {
    if (gameCompleted) return;

    const newMoves = moves + 1;
    setMoves(newMoves);
    setFeedback('⏭️ Word skipped!');

    if (newMoves >= 11) {
      endGame();
    } else {
      setTimeout(startNewWord, 1000);
    }
  };

  const endGame = () => {
    setGameCompleted(true);
    const level = Math.floor(score / 100) + 1;
    saveGameScore('spelling_bee', score, level);
  };

  const restartGame = () => {
    setScore(0);
    setMoves(0);
    setGameCompleted(false);
    setFeedback('');
    startNewWord();
  };

  React.useEffect(() => {
    startNewWord();
  }, []);

  return (
    <div className="game-screen">
      <h3>Spelling Bee</h3>
      <div className="score">Score: {score} | Moves: {moves}/11</div>
      
      {gameCompleted && (
        <div className="game-completed">
          <h4>Game Completed! 🎉</h4>
          <p>Final Score: {score}</p>
          <p>Correct Words: {Math.floor(score / 10)}</p>
        </div>
      )}
      
      <div className="spelling-area">
        {!gameCompleted && (
          <>
            <button onClick={() => speakWord(currentWord)} className="listen-button">
              🔊 Listen Again
            </button>

            <div className="input-group">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type the word you hear..."
                className="spelling-input"
                onKeyPress={(e) => e.key === 'Enter' && checkSpelling()}
                disabled={gameCompleted}
              />
              <button onClick={checkSpelling} className="check-button" disabled={gameCompleted}>
                Check
              </button>
            </div>
          </>
        )}

        {feedback && (
          <div className={`feedback ${feedback.includes('🎉') ? 'correct' : 'incorrect'}`}>
            {feedback}
          </div>
        )}

        <div className="game-controls">
          {!gameCompleted ? (
            <>
              <button onClick={skipWord} className="new-word-button">
                Skip Word
              </button>
            </>
          ) : (
            <button onClick={restartGame} className="restart-button">
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Games;