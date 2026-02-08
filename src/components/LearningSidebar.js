import React, { useState } from 'react';
import './LearningSidebar.css';

const LearningSidebar = () => {
  const [activeTab, setActiveTab] = useState('alphabet');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const alphabetData = [
    { letter: 'A a', sound: 'short /a/ as in apple', example: 'Apple, Ant, Alligator', category: 'vowel' },
    { letter: 'B b', sound: '/b/ as in ball', example: 'Ball, Boy, Butterfly', category: 'consonant' },
    { letter: 'C c', sound: '/k/ as in cat', example: 'Cat, Cake, Circle', category: 'consonant' },
    { letter: 'D d', sound: '/d/ as in dog', example: 'Dog, Duck, Door', category: 'consonant' },
    { letter: 'E e', sound: 'short /e/ as in egg', example: 'Egg, Elephant, Eagle', category: 'vowel' },
    { letter: 'F f', sound: '/f/ as in fish', example: 'Fish, Flower, Family', category: 'consonant' },
    { letter: 'G g', sound: '/g/ as in goat', example: 'Goat, Girl, Garden', category: 'consonant' },
    { letter: 'H h', sound: '/h/ as in house', example: 'House, Hat, Horse', category: 'consonant' },
    { letter: 'I i', sound: 'short /i/ as in igloo', example: 'Igloo, Ink, Insect', category: 'vowel' },
    { letter: 'J j', sound: '/j/ as in jump', example: 'Jump, Jar, Jellyfish', category: 'consonant' },
    { letter: 'K k', sound: '/k/ as in kite', example: 'Kite, Kangaroo, Key', category: 'consonant' },
    { letter: 'L l', sound: '/l/ as in lion', example: 'Lion, Lemon, Lamp', category: 'consonant' },
    { letter: 'M m', sound: '/m/ as in moon', example: 'Moon, Monkey, Mouse', category: 'consonant' },
    { letter: 'N n', sound: '/n/ as in nest', example: 'Nest, Nurse, Newspaper', category: 'consonant' },
    { letter: 'O o', sound: 'short /o/ as in octopus', example: 'Octopus, Orange, Ostrich', category: 'vowel' },
    { letter: 'P p', sound: '/p/ as in pig', example: 'Pig, Pizza, Penguin', category: 'consonant' },
    { letter: 'Q q', sound: '/kw/ as in queen', example: 'Queen, Quilt, Question', category: 'consonant' },
    { letter: 'R r', sound: '/r/ as in rabbit', example: 'Rabbit, Rainbow, Robot', category: 'consonant' },
    { letter: 'S s', sound: '/s/ as in sun', example: 'Sun, Star, Snake', category: 'consonant' },
    { letter: 'T t', sound: '/t/ as in tiger', example: 'Tiger, Table, Turtle', category: 'consonant' },
    { letter: 'U u', sound: 'short /u/ as in umbrella', example: 'Umbrella, Up, Under', category: 'vowel' },
    { letter: 'V v', sound: '/v/ as in van', example: 'Van, Violin, Volcano', category: 'consonant' },
    { letter: 'W w', sound: '/w/ as in window', example: 'Window, Water, Whale', category: 'consonant' },
    { letter: 'X x', sound: '/ks/ as in box', example: 'Box, Fox, Six', category: 'consonant' },
    { letter: 'Y y', sound: '/j/ as in yellow', example: 'Yellow, Yogurt, Yo-yo', category: 'semi-vowel' },
    { letter: 'Z z', sound: '/z/ as in zebra', example: 'Zebra, Zoo, Zipper', category: 'consonant' }
  ];

  const commonWords = [
    { word: 'the', type: 'article', example: 'the cat' },
    { word: 'and', type: 'conjunction', example: 'and then' },
    { word: 'is', type: 'verb', example: 'he is happy' },
    { word: 'was', type: 'verb', example: 'she was here' },
    { word: 'were', type: 'verb', example: 'they were happy' },
    { word: 'are', type: 'verb', example: 'we are friends' },
    { word: 'for', type: 'preposition', example: 'for you' },
    { word: 'with', type: 'preposition', example: 'play with me' },
    { word: 'this', type: 'pronoun', example: 'this book' },
    { word: 'that', type: 'pronoun', example: 'that ball' },
    { word: 'have', type: 'verb', example: 'I have a pen' },
    { word: 'from', type: 'preposition', example: 'from home' },
    { word: 'or', type: 'conjunction', example: 'yes or no' },
    { word: 'one', type: 'number', example: 'one apple' },
    { word: 'had', type: 'verb', example: 'he had fun' },
    { word: 'by', type: 'preposition', example: 'by the door' },
    { word: 'word', type: 'noun', example: 'a new word' },
    { word: 'but', type: 'conjunction', example: 'but why?' },
    { word: 'not', type: 'adverb', example: 'not now' },
    { word: 'what', type: 'pronoun', example: 'what time?' },
    { word: 'all', type: 'adjective', example: 'all students' },
    { word: 'can', type: 'verb', example: 'I can do it' }
  ];

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
      };
      
      speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech not supported. Please use Chrome or Edge.');
    }
  };

  const playLetterSound = (letter) => {
    speakText(letter + ' says ' + alphabetData.find(l => l.letter.includes(letter)).sound);
  };

  const playWordSound = (word) => {
    speakText(word.word + ' - ' + word.type + ' - Example: ' + word.example);
  };

  return (
    <div className="learning-sidebar">
      <div className="learning-header">
        <h3>🔤 Learning Hub</h3>
        <p className="learning-subtitle">Practice letters & words</p>
      </div>

      <div className="learning-tabs">
        <button 
          className={`learning-tab-btn ${activeTab === 'alphabet' ? 'active' : ''}`}
          onClick={() => setActiveTab('alphabet')}
        >
          ABC Letters
        </button>
        <button 
          className={`learning-tab-btn ${activeTab === 'words' ? 'active' : ''}`}
          onClick={() => setActiveTab('words')}
        >
          Common Words
        </button>
      </div>

      {activeTab === 'alphabet' ? (
        <div className="alphabet-section">
          <div className="section-header">
            <h4>Alphabet Sounds</h4>
            <p className="help-text">Click any letter to hear its sound</p>
          </div>
          
          <div className="alphabet-grid">
            {alphabetData.map((item, index) => (
              <button
                key={index}
                className={`letter-card ${selectedLetter?.letter === item.letter ? 'active' : ''} ${item.category}`}
                onClick={() => {
                  setSelectedLetter(item);
                  playLetterSound(item.letter.split(' ')[0]);
                }}
              >
                <div className="letter-display">{item.letter}</div>
                <div className="letter-info">
                  <small>{item.sound}</small>
                </div>
              </button>
            ))}
          </div>

          {selectedLetter && (
            <div className="letter-detail">
              <h4>Letter Details</h4>
              <div className="detail-content">
                <div className="big-letter">{selectedLetter.letter}</div>
                <div className="sound-info">
                  <p><strong>Sound:</strong> {selectedLetter.sound}</p>
                  <p><strong>Examples:</strong> {selectedLetter.example}</p>
                  <p><strong>Type:</strong> <span className={`type-badge ${selectedLetter.category}`}>{selectedLetter.category}</span></p>
                </div>
                <div className="letter-actions">
                  <button 
                    className="play-btn"
                    onClick={() => speakText(selectedLetter.letter.split(' ')[0])}
                    disabled={isPlaying}
                  >
                    🔊 Say Letter
                  </button>
                  <button 
                    className="play-btn"
                    onClick={() => speakText(selectedLetter.sound)}
                    disabled={isPlaying}
                  >
                    🔊 Say Sound
                  </button>
                  <button 
                    className="play-btn"
                    onClick={() => speakText(selectedLetter.example)}
                    disabled={isPlaying}
                  >
                    🔊 Say Examples
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="words-section">
          <div className="section-header">
            <h4>Common Words</h4>
            <p className="help-text">Click any word to hear it</p>
          </div>

          <div className="words-grid">
            {commonWords.map((word, index) => (
              <button
                key={index}
                className={`word-card ${selectedWord?.word === word.word ? 'active' : ''}`}
                onClick={() => {
                  setSelectedWord(word);
                  playWordSound(word);
                }}
              >
                <div className="word-display">{word.word}</div>
                <div className="word-info">
                  <small>{word.type}</small>
                </div>
              </button>
            ))}
          </div>

          {selectedWord && (
            <div className="word-detail">
              <h4>Word Details</h4>
              <div className="detail-content">
                <div className="big-word">{selectedWord.word}</div>
                <div className="word-info-detail">
                  <p><strong>Type:</strong> {selectedWord.type}</p>
                  <p><strong>Example:</strong> "{selectedWord.example}"</p>
                </div>
                <div className="word-actions">
                  <button 
                    className="play-btn"
                    onClick={() => speakText(selectedWord.word)}
                    disabled={isPlaying}
                  >
                    🔊 Say Word
                  </button>
                  <button 
                    className="play-btn"
                    onClick={() => speakText(selectedWord.example)}
                    disabled={isPlaying}
                  >
                    🔊 Say Example
                  </button>
                  <button 
                    className="play-btn"
                    onClick={() => speakText("Spelling: " + selectedWord.word.split('').join(' '))}
                    disabled={isPlaying}
                  >
                    🔊 Spell It
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="learning-tips">
        <h5>💡 Learning Tips:</h5>
        <ul>
          <li>Listen carefully to each sound</li>
          <li>Repeat after the audio</li>
          <li>Practice daily for 10 minutes</li>
          <li>Use in sentences</li>
        </ul>
      </div>
    </div>
  );
};

export default LearningSidebar;