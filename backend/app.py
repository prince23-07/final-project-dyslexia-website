from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import numpy as np
import os
import secrets
import time

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
    user_type = db.Column(db.String(20), nullable=False)  # 'parent' or 'child'
    parent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    age = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class TestResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    test_type = db.Column(db.String(50), nullable=False)  # 'speech' or 'listening'
    score = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, nullable=False)
    words_per_minute = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_type = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    level = db.Column(db.Integer, nullable=False)
    time_taken = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Simple rule-based dyslexia prediction (no scikit-learn needed)
def predict_dyslexia(speech_accuracy, listening_accuracy, words_per_minute):
    # Simple scoring system
    score = 0
    
    # Speech accuracy contributes 40%
    if speech_accuracy < 0.5:
        score += 0.4
    elif speech_accuracy < 0.7:
        score += 0.2
    
    # Listening accuracy contributes 40%
    if listening_accuracy < 0.5:
        score += 0.4
    elif listening_accuracy < 0.7:
        score += 0.2
    
    # Words per minute contributes 20%
    if words_per_minute < 20:
        score += 0.2
    elif words_per_minute < 30:
        score += 0.1
    
    return min(score, 1.0)  # Cap at 1.0

# Routes

# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    
    # Check if username already exists
    existing_user = User.query.filter_by(username=data['username']).first()
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Check if email already exists
    existing_email = User.query.filter_by(email=data['email']).first()
    if existing_email:
        return jsonify({'error': 'Email already registered'}), 400
    
    # Auto-generate parent account if child is being registered
    if data['user_type'] == 'child':
        parent_username = f"parent_{data['username']}"
        
        # Check if parent already exists
        existing_parent = User.query.filter_by(username=parent_username).first()
        if not existing_parent:
            # Create parent account automatically using child's password + @parent
            parent_password = f"{data['password']}@parent"
            
            # Generate unique parent email by adding +parent suffix
            email_parts = data['email'].split('@')
            parent_email = f"{email_parts[0]}+parent@{email_parts[1]}"
            
            # Check if parent email already exists
            existing_parent_email = User.query.filter_by(email=parent_email).first()
            if existing_parent_email:
                # If parent email exists, use a different approach - add timestamp
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
                return jsonify({'error': 'Failed to create parent account: ' + str(e)}), 400
        else:
            parent_id = existing_parent.id
        
        # Create child account with provided password
        hashed_password = generate_password_hash(data['password'])
        
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password,
            user_type='child',
            parent_id=parent_id,
            age=data.get('age')
        )
    else:
        # Parent registration - use provided password
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
        
        # Add parent info for child registration
        if data['user_type'] == 'child':
            response_data['parent_username'] = parent_username
            response_data['parent_password'] = parent_password
            response_data['child_username'] = data['username']
            response_data['child_password'] = data['password']
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed: ' + str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        return jsonify({
            'message': 'Login successful',
            'user_id': user.id,
            'user_type': user.user_type,
            'username': user.username
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

# Password Management Routes
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Email not found'}), 404
    
    # Generate reset token (in real app, send email)
    reset_token = secrets.token_urlsafe(32)
    # In production, save this token to database with expiration
    
    return jsonify({
        'message': 'Password reset instructions sent', 
        'reset_token': reset_token  # In real app, send via email
    }), 200

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('new_password')
    
    # In real app, verify token from database
    # For now, we'll reset any user's password (demo only)
    
    user = User.query.first()  # Get first user for demo
    if user:
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        return jsonify({'message': 'Password reset successful'}), 200
    
    return jsonify({'error': 'Invalid token'}), 400

@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.json
    user_id = data.get('user_id')
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not check_password_hash(user.password_hash, current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200

# Admin Routes for User Management
@app.route('/api/admin/reset-password', methods=['POST'])
def admin_reset_password():
    data = request.json
    username = data.get('username')
    new_password = data.get('new_password')
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({'message': f'Password reset for {username}'}), 200

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    users_data = []
    for user in users:
        users_data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'age': user.age,
            'parent_id': user.parent_id,
            'created_at': user.created_at.isoformat()
        })
    return jsonify(users_data), 200

# Test Routes
@app.route('/api/speech-test', methods=['POST'])
def speech_test():
    try:
        data = request.json
        user_id = data['user_id']
        spoken_text = data['spoken_text']
        original_text = data['original_text']
        
        # Calculate accuracy
        original_words = original_text.lower().split()
        spoken_words = spoken_text.lower().split()
        
        correct_words = sum(1 for i, word in enumerate(spoken_words) 
                          if i < len(original_words) and word == original_words[i])
        accuracy = correct_words / len(original_words) if original_words else 0
        words_per_minute = len(spoken_words) / (data.get('time_taken', 60) / 60)
        
        # Save test result
        test_result = TestResult(
            user_id=user_id,
            test_type='speech',
            score=accuracy * 100,
            accuracy=accuracy,
            words_per_minute=words_per_minute
        )
        db.session.add(test_result)
        db.session.commit()
        
        return jsonify({
            'accuracy': accuracy,
            'words_per_minute': words_per_minute,
            'score': accuracy * 100
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
        
        # Calculate accuracy
        original_words = original_text.lower().split()
        typed_words = typed_text.lower().split()
        
        correct_words = sum(1 for i, word in enumerate(typed_words) 
                          if i < len(original_words) and word == original_words[i])
        accuracy = correct_words / len(original_words) if original_words else 0
        
        # Save test result
        test_result = TestResult(
            user_id=user_id,
            test_type='listening',
            score=accuracy * 100,
            accuracy=accuracy
        )
        db.session.add(test_result)
        db.session.commit()
        
        return jsonify({
            'accuracy': accuracy,
            'score': accuracy * 100
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict-dyslexia', methods=['POST'])
def predict_dyslexia_route():
    data = request.json
    user_id = data['user_id']
    
    # Get user's test results
    test_results = TestResult.query.filter_by(user_id=user_id).all()
    
    if len(test_results) < 2:
        return jsonify({'error': 'Insufficient test data'}), 400
    
    # Calculate average scores
    speech_scores = [tr.accuracy for tr in test_results if tr.test_type == 'speech']
    listening_scores = [tr.accuracy for tr in test_results if tr.test_type == 'listening']
    speech_wpm = [tr.words_per_minute for tr in test_results if tr.test_type == 'speech' and tr.words_per_minute]
    
    avg_speech = np.mean(speech_scores) if speech_scores else 0
    avg_listening = np.mean(listening_scores) if listening_scores else 0
    avg_wpm = np.mean(speech_wpm) if speech_wpm else 30
    
    # Predict dyslexia probability
    dyslexia_probability = predict_dyslexia(avg_speech, avg_listening, avg_wpm)
    
    return jsonify({
        'dyslexia_probability': dyslexia_probability,
        'is_at_risk': dyslexia_probability > 0.7,
        'speech_score': avg_speech,
        'listening_score': avg_listening,
        'words_per_minute': avg_wpm
    }), 200

# Game Routes
@app.route('/api/save-game-score', methods=['POST'])
def save_game_score():
    data = request.json
    game_score = GameScore(
        user_id=data['user_id'],
        game_type=data['game_type'],
        score=data['score'],
        level=data['level'],
        time_taken=data.get('time_taken')
    )
    db.session.add(game_score)
    db.session.commit()
    
    return jsonify({'message': 'Score saved successfully'}), 200

# Progress Routes
@app.route('/api/progress/<int:user_id>', methods=['GET'])
def get_progress(user_id):
    test_results = TestResult.query.filter_by(user_id=user_id).all()
    game_scores = GameScore.query.filter_by(user_id=user_id).all()
    
    progress_data = {
        'test_results': [
            {
                'test_type': tr.test_type,
                'score': tr.score,
                'date': tr.created_at.isoformat()
            } for tr in test_results
        ],
        'game_scores': [
            {
                'game_type': gs.game_type,
                'score': gs.score,
                'level': gs.level,
                'date': gs.created_at.isoformat()
            } for gs in game_scores
        ]
    }
    
    return jsonify(progress_data), 200

@app.route('/api/child-progress/<int:parent_id>', methods=['GET'])
def get_child_progress(parent_id):
    children = User.query.filter_by(parent_id=parent_id).all()
    progress_data = []
    
    for child in children:
        test_results = TestResult.query.filter_by(user_id=child.id).all()
        game_scores = GameScore.query.filter_by(user_id=child.id).all()
        
        child_data = {
            'child_id': child.id,
            'child_name': child.username,
            'test_results': [{'test_type': tr.test_type, 'score': tr.score, 'date': tr.created_at.isoformat()} for tr in test_results],
            'game_scores': [{'game_type': gs.game_type, 'score': gs.score, 'level': gs.level} for gs in game_scores]
        }
        progress_data.append(child_data)
    
    return jsonify(progress_data), 200

# Highest Scores Route
@app.route('/api/user-highest-scores/<int:user_id>', methods=['GET'])
def get_user_highest_scores(user_id):
    """Get highest scores for a user across all tests and games"""
    try:
        # Get highest test scores
        highest_speech = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='speech').scalar() or 0
        
        highest_listening = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='listening').scalar() or 0
        
        # Get highest game scores
        highest_word_jumble = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='word_jumble').scalar() or 0
        
        highest_memory_match = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='memory_match').scalar() or 0
        
        highest_spelling_bee = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='spelling_bee').scalar() or 0
        
        return jsonify({
            'highest_scores': {
                'speech_test': highest_speech,
                'listening_test': highest_listening,
                'word_jumble': highest_word_jumble,
                'memory_match': highest_memory_match,
                'spelling_bee': highest_spelling_bee
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/parent-dashboard/<int:parent_id>', methods=['GET'])
def get_parent_dashboard(parent_id):
    """Get parent dashboard with all children's progress"""
    try:
        children = User.query.filter_by(parent_id=parent_id).all()
        
        if not children:
            return jsonify({'message': 'No children found for this parent', 'children': []}), 200
        
        children_data = []
        
        for child in children:
            # Get child's highest scores
            highest_scores = {
                'speech_test': db.session.query(db.func.max(TestResult.score))
                    .filter_by(user_id=child.id, test_type='speech').scalar() or 0,
                'listening_test': db.session.query(db.func.max(TestResult.score))
                    .filter_by(user_id=child.id, test_type='listening').scalar() or 0,
                'word_jumble': db.session.query(db.func.max(GameScore.score))
                    .filter_by(user_id=child.id, game_type='word_jumble').scalar() or 0,
                'memory_match': db.session.query(db.func.max(GameScore.score))
                    .filter_by(user_id=child.id, game_type='memory_match').scalar() or 0,
                'spelling_bee': db.session.query(db.func.max(GameScore.score))
                    .filter_by(user_id=child.id, game_type='spelling_bee').scalar() or 0
            }
            
            # Get recent activity
            recent_tests = TestResult.query.filter_by(user_id=child.id)\
                .order_by(TestResult.created_at.desc()).limit(5).all()
            
            recent_games = GameScore.query.filter_by(user_id=child.id)\
                .order_by(GameScore.created_at.desc()).limit(5).all()
            
            child_data = {
                'child_id': child.id,
                'child_name': child.username,
                'child_age': child.age,
                'highest_scores': highest_scores,
                'recent_tests': [
                    {
                        'test_type': test.test_type,
                        'score': test.score,
                        'date': test.created_at.isoformat()
                    } for test in recent_tests
                ],
                'recent_games': [
                    {
                        'game_type': game.game_type,
                        'score': game.score,
                        'level': game.level,
                        'date': game.created_at.isoformat()
                    } for game in recent_games
                ],
                'total_tests': TestResult.query.filter_by(user_id=child.id).count(),
                'total_games': GameScore.query.filter_by(user_id=child.id).count()
            }
            children_data.append(child_data)
        
        return jsonify({
            'parent_id': parent_id,
            'children': children_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Development & Testing Routes
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Backend is working!', 'status': 'success'}), 200

@app.route('/api/test-microphone', methods=['GET'])
def test_microphone():
    return jsonify({
        'message': 'Backend is ready for speech tests',
        'status': 'active'
    }), 200

@app.route('/api/create-test-user', methods=['GET'])
def create_test_user():
    # Check if test user already exists
    user = User.query.filter_by(username='testuser').first()
    if not user:
        hashed_password = generate_password_hash('test123')
        user = User(
            username='testuser',
            email='test@test.com',
            password_hash=hashed_password,
            user_type='parent'
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Test user created', 'user_id': user.id}), 200
    return jsonify({'message': 'Test user already exists', 'user_id': user.id}), 200

@app.route('/api/create-sample-data', methods=['GET'])
def create_sample_data():
    # Create a test user if doesn't exist
    user = User.query.filter_by(username='testuser').first()
    if not user:
        hashed_password = generate_password_hash('test123')
        user = User(
            username='testuser',
            email='test@test.com',
            password_hash=hashed_password,
            user_type='parent'
        )
        db.session.add(user)
        db.session.commit()
    
    # Create sample test results
    test_result = TestResult(
        user_id=user.id,
        test_type='speech',
        score=85.5,
        accuracy=0.855,
        words_per_minute=45.2
    )
    db.session.add(test_result)
    
    # Create sample game score
    game_score = GameScore(
        user_id=user.id,
        game_type='word_jumble',
        score=100,
        level=2
    )
    db.session.add(game_score)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Sample data created', 
        'user_id': user.id,
        'test_results': 1,
        'game_scores': 1
    }), 200

# Initialize database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)