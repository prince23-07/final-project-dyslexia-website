from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
import numpy as np
import os
import secrets
import time
import json
import pickle
from collections import defaultdict
import random

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dyslexia.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    user_type = db.Column(db.String(20), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    age = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    total_learning_time = db.Column(db.Integer, default=0)
    current_difficulty = db.Column(db.Float, default=1.0)
    performance_history = db.Column(db.Text, default='[]')
    
    children = db.relationship('User', 
                              backref=db.backref('parent', remote_side=[id]),
                              lazy=True)

class TestResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    test_type = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, nullable=False)
    words_per_minute = db.Column(db.Float, nullable=True)
    time_spent = db.Column(db.Integer, default=0)
    difficulty_level = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_type = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    level = db.Column(db.Integer, nullable=False)
    time_taken = db.Column(db.Float, nullable=True)
    time_spent = db.Column(db.Integer, default=0)
    difficulty_level = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LearningSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_type = db.Column(db.String(50), nullable=False)
    activity_id = db.Column(db.Integer, nullable=False)
    time_spent = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Check if scikit-learn is available
try:
    from sklearn.svm import SVC
    from sklearn.preprocessing import StandardScaler
    ML_AVAILABLE = True
    print("✓ ML Libraries Available")
    
    class AdaptiveDifficultySystem:
        def __init__(self):
            self.model_path = 'difficulty_model.pkl'
            self.model = self.load_or_create_model()
        
        def load_or_create_model(self):
            if os.path.exists(self.model_path):
                with open(self.model_path, 'rb') as f:
                    return pickle.load(f)
            else:
                # Create simple initial model
                model = SVC(kernel='linear', probability=True)
                # Train with dummy data
                X = np.array([[0.3, 0.2], [0.7, 0.1], [0.5, 0.0], [0.8, 0.3]])
                y = np.array([0, 1, 0, 1])
                model.fit(X, y)
                self.save_model(model)
                return model
        
        def save_model(self, model):
            with open(self.model_path, 'wb') as f:
                pickle.dump(model, f)
        
        def predict_adjustment(self, current_score, recent_trend):
            try:
                features = np.array([[current_score, recent_trend]])
                proba = self.model.predict_proba(features)[0]
                
                if proba[1] > 0.65:
                    return 1  # Increase
                elif proba[0] > 0.65:
                    return 0  # Decrease
                else:
                    return -1  # Maintain
            except:
                # Fallback to rule-based
                if current_score > 0.75:
                    return 1
                elif current_score < 0.45:
                    return 0
                return -1
        
        def update_model(self, X, y):
            try:
                self.model.fit(X, y)
                self.save_model(self.model)
            except:
                pass
    
    difficulty_system = AdaptiveDifficultySystem()
    
except ImportError:
    ML_AVAILABLE = False
    print("⚠ ML Libraries Not Available - Using Rule-Based System")
    
    class AdaptiveDifficultySystem:
        def predict_adjustment(self, current_score, recent_trend):
            if current_score > 0.75:
                return 1
            elif current_score < 0.45:
                return 0
            return -1
        
        def update_model(self, X, y):
            pass
    
    difficulty_system = AdaptiveDifficultySystem()

# Initialize database
with app.app_context():
    db.create_all()

# Helper functions
def calculate_new_difficulty(current_difficulty, adjustment, score):
    if adjustment == 1:  # Increase
        increase = 0.15 if score > 0.8 else 0.1
        return min(3.0, current_difficulty + increase)
    elif adjustment == 0:  # Decrease
        decrease = 0.15 if score < 0.4 else 0.1
        return max(0.5, current_difficulty - decrease)
    return current_difficulty

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    
    existing_user = User.query.filter_by(username=data['username']).first()
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400
    
    existing_email = User.query.filter_by(email=data['email']).first()
    if existing_email:
        return jsonify({'error': 'Email already registered'}), 400
    
    if data['user_type'] == 'child':
        parent_username = f"parent_{data['username']}"
        
        existing_parent = User.query.filter_by(username=parent_username).first()
        if not existing_parent:
            parent_password = f"{data['password']}@parent"
            email_parts = data['email'].split('@')
            parent_email = f"{email_parts[0]}+parent@{email_parts[1]}"
            
            existing_parent_email = User.query.filter_by(email=parent_email).first()
            if existing_parent_email:
                parent_email = f"{email_parts[0]}+parent{int(time.time())}@{email_parts[1]}"
            
            parent_user = User(
                username=parent_username,
                email=parent_email,
                password_hash=generate_password_hash(parent_password),
                user_type='parent'
            )
            
            try:
                db.session.add(parent_user)
                db.session.commit()
                parent_id = parent_user.id
            except Exception as e:
                db.session.rollback()
                return jsonify({'error': f'Failed to create parent account: {str(e)}'}), 400
        else:
            parent_id = existing_parent.id
        
        hashed_password = generate_password_hash(data['password'])
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password,
            user_type='child',
            parent_id=parent_id,
            age=data.get('age'),
            current_difficulty=1.0,
            performance_history='[]'
        )
    else:
        hashed_password = generate_password_hash(data['password'])
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password,
            user_type='parent'
        )
    
    try:
        db.session.add(user)
        db.session.commit()
        
        response_data = {
            'message': 'User created successfully', 
            'user_id': user.id,
            'user_type': user.user_type
        }
        
        if data['user_type'] == 'child':
            response_data['parent_username'] = parent_username
            response_data['parent_password'] = parent_password
            response_data['child_username'] = data['username']
            response_data['child_password'] = data['password']
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        user.last_active = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Login successful',
            'user_id': user.id,
            'user_type': user.user_type,
            'username': user.username,
            'email': user.email,
            'current_difficulty': user.current_difficulty
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/update-difficulty', methods=['POST'])
def update_difficulty():
    data = request.json
    user_id = data['user_id']
    score = data['score']
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        history = json.loads(user.performance_history or '[]')
        
        # Calculate trend
        recent_scores = [h['score'] for h in history[-3:]] if len(history) >= 3 else [0.5]
        recent_trend = score - np.mean(recent_scores) if recent_scores else 0
        
        # Predict adjustment using ML
        adjustment = difficulty_system.predict_adjustment(score, recent_trend)
        
        # Calculate new difficulty
        new_difficulty = calculate_new_difficulty(user.current_difficulty, adjustment, score)
        
        # Update user
        user.current_difficulty = new_difficulty
        
        # Add to history
        history.append({
            'timestamp': datetime.utcnow().isoformat(),
            'score': score,
            'difficulty': new_difficulty
        })
        
        if len(history) > 10:
            history = history[-10:]
        
        user.performance_history = json.dumps(history)
        
        # Update ML model if we have enough data
        if ML_AVAILABLE and len(history) >= 4:
            X = []
            y = []
            for i in range(len(history) - 1):
                if i + 1 < len(history):
                    prev_score = history[i]['score']
                    next_difficulty = history[i + 1]['difficulty']
                    current_difficulty = history[i]['difficulty']
                    
                    trend = next_difficulty - current_difficulty
                    X.append([prev_score, 0])  # Simple features
                    y.append(1 if trend > 0 else 0)
            
            if len(X) > 0:
                difficulty_system.update_model(np.array(X), np.array(y))
        
        db.session.commit()
        
        return jsonify({
            'new_difficulty': new_difficulty,
            'adjustment': adjustment,
            'ml_available': ML_AVAILABLE
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/speech-test', methods=['POST'])
def speech_test():
    try:
        data = request.json
        user_id = data['user_id']
        spoken_text = data['spoken_text']
        original_text = data['original_text']
        
        user = User.query.get(user_id)
        current_difficulty = user.current_difficulty if user else 1.0
        
        # Calculate accuracy
        original_words = original_text.lower().split()
        spoken_words = spoken_text.lower().split()
        
        correct_words = sum(1 for i, word in enumerate(spoken_words) 
                          if i < len(original_words) and word == original_words[i])
        accuracy = correct_words / len(original_words) if original_words else 0
        
        # Adjust for difficulty
        adjusted_accuracy = accuracy * (1.1 - (current_difficulty * 0.1))
        adjusted_accuracy = min(1.0, max(0, adjusted_accuracy))
        
        words_per_minute = len(spoken_words) * 2  # Simplified
        
        test_result = TestResult(
            user_id=user_id,
            test_type='speech',
            score=adjusted_accuracy * 100,
            accuracy=adjusted_accuracy,
            words_per_minute=words_per_minute,
            time_spent=30,
            difficulty_level=current_difficulty
        )
        db.session.add(test_result)
        
        # Update learning time
        if user:
            user.total_learning_time += 1
            user.last_active = datetime.utcnow()
        
        # Record session
        learning_session = LearningSession(
            user_id=user_id,
            session_type='test',
            activity_id=test_result.id,
            time_spent=30,
            date=date.today()
        )
        db.session.add(learning_session)
        
        # Update difficulty
        update_response = update_difficulty_internal(user_id, adjusted_accuracy)
        
        db.session.commit()
        
        return jsonify({
            'accuracy': adjusted_accuracy,
            'score': adjusted_accuracy * 100,
            'words_per_minute': words_per_minute,
            'difficulty_level': current_difficulty,
            'new_difficulty': update_response.get('new_difficulty', current_difficulty),
            'ml_available': ML_AVAILABLE
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/listening-test', methods=['POST'])
def listening_test():
    try:
        data = request.json
        user_id = data['user_id']
        typed_text = data['typed_text']
        original_text = data['original_text']
        
        user = User.query.get(user_id)
        current_difficulty = user.current_difficulty if user else 1.0
        
        original_words = original_text.lower().split()
        typed_words = typed_text.lower().split()
        
        correct_words = sum(1 for i, word in enumerate(typed_words) 
                          if i < len(original_words) and word == original_words[i])
        accuracy = correct_words / len(original_words) if original_words else 0
        
        adjusted_accuracy = accuracy * (1.1 - (current_difficulty * 0.1))
        adjusted_accuracy = min(1.0, max(0, adjusted_accuracy))
        
        test_result = TestResult(
            user_id=user_id,
            test_type='listening',
            score=adjusted_accuracy * 100,
            accuracy=adjusted_accuracy,
            time_spent=45,
            difficulty_level=current_difficulty
        )
        db.session.add(test_result)
        
        if user:
            user.total_learning_time += 1
            user.last_active = datetime.utcnow()
        
        learning_session = LearningSession(
            user_id=user_id,
            session_type='test',
            activity_id=test_result.id,
            time_spent=45,
            date=date.today()
        )
        db.session.add(learning_session)
        
        update_response = update_difficulty_internal(user_id, adjusted_accuracy)
        
        db.session.commit()
        
        return jsonify({
            'accuracy': adjusted_accuracy,
            'score': adjusted_accuracy * 100,
            'difficulty_level': current_difficulty,
            'new_difficulty': update_response.get('new_difficulty', current_difficulty),
            'ml_available': ML_AVAILABLE
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def update_difficulty_internal(user_id, score):
    try:
        user = User.query.get(user_id)
        if not user:
            return {'error': 'User not found'}
        
        history = json.loads(user.performance_history or '[]')
        
        recent_scores = [h['score'] for h in history[-3:]] if len(history) >= 3 else [0.5]
        recent_trend = score - np.mean(recent_scores) if recent_scores else 0
        
        adjustment = difficulty_system.predict_adjustment(score, recent_trend)
        
        new_difficulty = calculate_new_difficulty(user.current_difficulty, adjustment, score)
        
        user.current_difficulty = new_difficulty
        
        history.append({
            'timestamp': datetime.utcnow().isoformat(),
            'score': score,
            'difficulty': new_difficulty
        })
        
        if len(history) > 10:
            history = history[-10:]
        
        user.performance_history = json.dumps(history)
        
        return {
            'new_difficulty': new_difficulty,
            'adjustment': adjustment
        }
        
    except Exception as e:
        print(f"Error updating difficulty: {e}")
        return {'error': str(e)}

@app.route('/api/save-game-score', methods=['POST'])
def save_game_score():
    try:
        data = request.json
        user_id = data['user_id']
        game_type = data['game_type']
        score = data['score']
        level = data.get('level', 1)
        
        user = User.query.get(user_id)
        current_difficulty = user.current_difficulty if user else 1.0
        
        # Normalize score (0-1)
        max_scores = {
            'word_jumble': 100,
            'memory_match': 60,
            'spelling_bee': 100
        }
        max_score = max_scores.get(game_type, 100)
        normalized_score = min(score / max_score, 1.0)
        
        # Adjust score based on difficulty
        adjusted_score = int(score * (1.1 - (current_difficulty * 0.1)))
        
        game_score = GameScore(
            user_id=user_id,
            game_type=game_type,
            score=adjusted_score,
            level=level,
            time_spent=120,
            difficulty_level=current_difficulty
        )
        db.session.add(game_score)
        
        if user:
            user.total_learning_time += 2
            user.last_active = datetime.utcnow()
        
        learning_session = LearningSession(
            user_id=user_id,
            session_type='game',
            activity_id=game_score.id,
            time_spent=120,
            date=date.today()
        )
        db.session.add(learning_session)
        
        update_response = update_difficulty_internal(user_id, normalized_score)
        
        db.session.commit()
        
        # Check high score
        highest_score = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(
            user_id=user_id,
            game_type=game_type
        ).scalar() or 0
        
        is_new_high_score = adjusted_score > highest_score
        
        return jsonify({
            'message': 'Score saved successfully',
            'is_new_high_score': is_new_high_score,
            'previous_high_score': highest_score,
            'new_score': adjusted_score,
            'difficulty_level': current_difficulty,
            'new_difficulty': update_response.get('new_difficulty', current_difficulty),
            'ml_available': ML_AVAILABLE
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-adaptive-content/<string:content_type>', methods=['GET'])
def get_adaptive_content(content_type):
    try:
        user_id = request.args.get('user_id')
        difficulty = float(request.args.get('difficulty', 1.0))
        
        user = User.query.get(user_id) if user_id else None
        if user:
            difficulty = user.current_difficulty
        
        # Content based on difficulty
        if difficulty < 1.3:
            # Beginner
            if content_type == 'speech_test':
                sentences = [
                    "The cat sleeps",
                    "We eat food",
                    "Birds fly high",
                    "I love my family",
                    "The sun is bright"
                ]
            else:  # listening_test
                sentences = [
                    "Hello world",
                    "Good morning",
                    "How are you",
                    "Thank you very much",
                    "See you later"
                ]
        elif difficulty < 1.8:
            # Easy
            if content_type == 'speech_test':
                sentences = [
                    "The quick brown fox jumps over the lazy dog",
                    "She sells seashells by the seashore",
                    "My little brother loves to play with his red ball",
                    "We visit the library every Saturday to borrow books",
                    "The bright moon shines at night"
                ]
            else:
                sentences = [
                    "The library has many interesting books about animals",
                    "Children should eat healthy food and exercise regularly",
                    "Our planet Earth revolves around the sun",
                    "The curious explorer discovered ancient ruins",
                    "Musicians practice for hours to perfect their performances"
                ]
        elif difficulty < 2.3:
            # Medium
            if content_type == 'speech_test':
                sentences = [
                    "Despite the inclement weather conditions, the expedition team persevered",
                    "The astrophysicist postulated a revolutionary theory regarding quantum entanglement",
                    "Beneath the phosphorescent bioluminescence of the abyssal trench",
                    "Through meticulous anthropological analysis, researchers deciphered inscriptions",
                    "The symphony's crescendo evoked profound emotional resonance"
                ]
            else:
                sentences = [
                    "Quantum superposition allows particles to exist in multiple states simultaneously",
                    "The geopolitical implications of transcontinental trade agreements necessitate diplomacy",
                    "Neuroplasticity enables cognitive adaptation through synaptic reorganization",
                    "Photosynthetic organisms convert electromagnetic radiation into biochemical energy",
                    "Algorithmic complexity analysis evaluates computational efficiency"
                ]
        else:
            # Hard/Expert
            if content_type == 'speech_test':
                sentences = [
                    "The quintessential manifestation of existential phenomenology transcends conventional epistemological paradigms",
                    "Multifaceted interdisciplinary synergies catalyze unprecedented innovations in quantum computing architectures",
                    "Epistemological deconstruction of hegemonic narratives necessitates dialectical interrogation of ideological presuppositions",
                    "Biopsychosocial models of psychopathology integrate neurobiological, psychological, and sociocultural determinants",
                    "Poststructuralist literary criticism problematizes authorial intentionality and textual determinacy"
                ]
            else:
                sentences = [
                    "The ontological implications of quantum decoherence challenge classical metaphysical assumptions about reality",
                    "Epistemological relativism posits that knowledge claims are contingent upon specific cultural and historical contexts",
                    "Neurophenomenological approaches seek to bridge first-person subjective experience with third-person neuroscientific data",
                    "Sociolinguistic analysis reveals how power dynamics are encoded and reproduced through discursive practices",
                    "The hermeneutic circle describes the iterative process of understanding texts through the interplay of parts and whole"
                ]
        
        return jsonify({
            'content': sentences,
            'difficulty_level': difficulty,
            'ml_available': ML_AVAILABLE
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/parent-dashboard/<int:parent_id>', methods=['GET'])
def get_parent_dashboard(parent_id):
    try:
        parent = User.query.get(parent_id)
        if not parent or parent.user_type != 'parent':
            return jsonify({'error': 'Parent not found'}), 404
        
        children = User.query.filter_by(parent_id=parent_id).all()
        
        if not children:
            return jsonify({
                'message': 'No children registered yet', 
                'children': [],
                'parent_info': {
                    'parent_username': parent.username,
                    'parent_id': parent.id,
                    'email': parent.email,
                    'total_children': 0
                }
            }), 200
        
        children_data = []
        
        for child in children:
            highest_speech = db.session.query(db.func.max(TestResult.score))\
                .filter_by(user_id=child.id, test_type='speech').scalar() or 0
            
            highest_listening = db.session.query(db.func.max(TestResult.score))\
                .filter_by(user_id=child.id, test_type='listening').scalar() or 0
            
            highest_word_jumble = db.session.query(db.func.max(GameScore.score))\
                .filter_by(user_id=child.id, game_type='word_jumble').scalar() or 0
            
            highest_memory_match = db.session.query(db.func.max(GameScore.score))\
                .filter_by(user_id=child.id, game_type='memory_match').scalar() or 0
            
            highest_spelling_bee = db.session.query(db.func.max(GameScore.score))\
                .filter_by(user_id=child.id, game_type='spelling_bee').scalar() or 0
            
            recent_tests = TestResult.query.filter_by(user_id=child.id)\
                .order_by(TestResult.created_at.desc()).limit(5).all()
            
            recent_games = GameScore.query.filter_by(user_id=child.id)\
                .order_by(GameScore.created_at.desc()).limit(5).all()
            
            total_tests = TestResult.query.filter_by(user_id=child.id).count()
            total_games = GameScore.query.filter_by(user_id=child.id).count()
            
            sessions = LearningSession.query.filter_by(user_id=child.id)\
                .order_by(LearningSession.date.desc()).all()
            
            learning_dates = set(session.date for session in sessions)
            sorted_dates = sorted(learning_dates, reverse=True)
            
            current_streak = 0
            longest_streak = 0
            temp_streak = 0
            prev_date = None
            
            for learning_date in sorted_dates:
                if prev_date is None:
                    current_streak = 1
                    temp_streak = 1
                else:
                    days_diff = (prev_date - learning_date).days
                    if days_diff == 1:
                        if current_streak == temp_streak:
                            current_streak += 1
                        temp_streak += 1
                    else:
                        temp_streak = 1
                
                longest_streak = max(longest_streak, temp_streak)
                prev_date = learning_date
            
            today = date.today()
            today_sessions = LearningSession.query.filter_by(
                user_id=child.id, 
                date=today
            ).all()
            today_learning = sum(session.time_spent for session in today_sessions) // 60
            
            child_data = {
                'child_id': child.id,
                'child_name': child.username,
                'child_age': child.age,
                'child_email': child.email,
                'current_difficulty': child.current_difficulty,
                'total_learning_time': child.total_learning_time,
                'last_active': child.last_active.isoformat() if child.last_active else None,
                'streak': current_streak,
                'longest_streak': longest_streak,
                'today_learning': today_learning,
                'highest_scores': {
                    'speech_test': highest_speech,
                    'listening_test': highest_listening,
                    'word_jumble': highest_word_jumble,
                    'memory_match': highest_memory_match,
                    'spelling_bee': highest_spelling_bee
                },
                'recent_tests': [
                    {
                        'test_type': test.test_type,
                        'score': test.score,
                        'difficulty': test.difficulty_level,
                        'date': test.created_at.isoformat()
                    } for test in recent_tests
                ],
                'recent_games': [
                    {
                        'game_type': game.game_type,
                        'score': game.score,
                        'level': game.level,
                        'difficulty': game.difficulty_level,
                        'date': game.created_at.isoformat()
                    } for game in recent_games
                ],
                'total_tests': total_tests,
                'total_games': total_games,
                'learning_metrics': {
                    'streak': current_streak,
                    'longest_streak': longest_streak,
                    'total_learning_time': child.total_learning_time,
                    'today_learning': today_learning,
                    'current_difficulty': child.current_difficulty
                }
            }
            children_data.append(child_data)
        
        return jsonify({
            'parent_id': parent_id,
            'parent_username': parent.username,
            'parent_email': parent.email,
            'total_children': len(children),
            'children': children_data,
            'ml_available': ML_AVAILABLE
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard-data/<int:user_id>', methods=['GET'])
def get_dashboard_data(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        highest_speech = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='speech').scalar() or 0
        
        highest_listening = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='listening').scalar() or 0
        
        highest_memory_match = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='memory_match').scalar() or 0
        
        highest_word_jumble = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='word_jumble').scalar() or 0
        
        highest_spelling_bee = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='spelling_bee').scalar() or 0
        
        sessions = LearningSession.query.filter_by(user_id=user_id)\
            .order_by(LearningSession.date.desc()).all()
        
        learning_dates = set(session.date for session in sessions)
        sorted_dates = sorted(learning_dates, reverse=True)
        
        current_streak = 0
        longest_streak = 0
        temp_streak = 0
        prev_date = None
        
        for learning_date in sorted_dates:
            if prev_date is None:
                current_streak = 1
                temp_streak = 1
            else:
                days_diff = (prev_date - learning_date).days
                if days_diff == 1:
                    if current_streak == temp_streak:
                        current_streak += 1
                    temp_streak += 1
                else:
                    temp_streak = 1
            
            longest_streak = max(longest_streak, temp_streak)
            prev_date = learning_date
        
        today = date.today()
        today_sessions = LearningSession.query.filter_by(
            user_id=user_id, 
            date=today
        ).all()
        today_learning = sum(session.time_spent for session in today_sessions) // 60
        
        performance_history = json.loads(user.performance_history or '[]')
        recent_scores = [h['score'] for h in performance_history[-5:]] if performance_history else [0]
        improvement_rate = 0
        if len(recent_scores) >= 2:
            improvement_rate = ((recent_scores[-1] - recent_scores[0]) / recent_scores[0] * 100) if recent_scores[0] > 0 else 0
            improvement_rate = max(0, min(100, improvement_rate))
        
        blocks_earned = user.total_learning_time // 30
        daily_goal = today_learning >= 60
        
        end_date = date.today()
        start_date = end_date - timedelta(days=149)
        blocks_sessions = LearningSession.query.filter(
            LearningSession.user_id == user_id,
            LearningSession.date >= start_date,
            LearningSession.date <= end_date
        ).all()
        
        daily_learning = defaultdict(int)
        for session in blocks_sessions:
            daily_learning[session.date] += session.time_spent // 60
        
        learning_blocks = []
        for i in range(150):
            block_date = end_date - timedelta(days=149 - i)
            minutes = daily_learning.get(block_date, 0)
            
            if minutes == 0:
                intensity = 0
            elif minutes < 30:
                intensity = 1
            elif minutes < 60:
                intensity = 2
            else:
                intensity = 3
            
            learning_blocks.append({
                'date': block_date.isoformat(),
                'minutes': minutes,
                'intensity': intensity,
                'filled': minutes > 0
            })
        
        dashboard_data = {
            'user_info': {
                'username': user.username,
                'user_id': user.id,
                'email': user.email,
                'user_type': user.user_type,
                'age': user.age,
                'current_difficulty': user.current_difficulty,
                'performance_history': performance_history
            },
            'highest_scores': {
                'speech_test': highest_speech,
                'listening_test': highest_listening,
                'word_jumble': highest_word_jumble,
                'memory_match': highest_memory_match,
                'spelling_bee': highest_spelling_bee
            },
            'learning_metrics': {
                'streak': current_streak,
                'longest_streak': longest_streak,
                'total_learning_time': user.total_learning_time,
                'today_learning': today_learning,
                'improvement_rate': improvement_rate,
                'blocks_earned': blocks_earned,
                'daily_goal': daily_goal,
                'daily_goal_target': 60,
                'current_difficulty': user.current_difficulty,
                'last_active': user.last_active.isoformat() if user.last_active else None
            },
            'learning_blocks': learning_blocks,
            'ml_available': ML_AVAILABLE
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({
        'message': 'Backend is working!',
        'status': 'success',
        'ml_available': ML_AVAILABLE
    }), 200

if __name__ == '__main__':
    print(f"ML Available: {ML_AVAILABLE}")
    app.run(debug=True, port=5000)