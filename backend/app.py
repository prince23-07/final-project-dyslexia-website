from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
import numpy as np
import os
import secrets
import time
from collections import defaultdict

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
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    total_learning_time = db.Column(db.Integer, default=0)  # in minutes

class TestResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    test_type = db.Column(db.String(50), nullable=False)  # 'speech' or 'listening'
    score = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, nullable=False)
    words_per_minute = db.Column(db.Float, nullable=True)
    time_spent = db.Column(db.Integer, default=0)  # in seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_type = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    level = db.Column(db.Integer, nullable=False)
    time_taken = db.Column(db.Float, nullable=True)
    time_spent = db.Column(db.Integer, default=0)  # in seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LearningSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_type = db.Column(db.String(50), nullable=False)  # 'test' or 'game'
    activity_id = db.Column(db.Integer, nullable=False)  # test_result_id or game_score_id
    time_spent = db.Column(db.Integer, nullable=False)  # in seconds
    date = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Simple rule-based dyslexia prediction
def predict_dyslexia(speech_accuracy, listening_accuracy, words_per_minute):
    score = 0
    
    if speech_accuracy < 0.5:
        score += 0.4
    elif speech_accuracy < 0.7:
        score += 0.2
    
    if listening_accuracy < 0.5:
        score += 0.4
    elif listening_accuracy < 0.7:
        score += 0.2
    
    if words_per_minute < 20:
        score += 0.2
    elif words_per_minute < 30:
        score += 0.1
    
    return min(score, 1.0)

# Routes

# Authentication Routes
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
                return jsonify({'error': 'Failed to create parent account: ' + str(e)}), 400
        else:
            parent_id = existing_parent.id
        
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
        return jsonify({'error': 'Registration failed: ' + str(e)}), 400

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
            'email': user.email
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
    
    reset_token = secrets.token_urlsafe(32)
    
    return jsonify({
        'message': 'Password reset instructions sent', 
        'reset_token': reset_token
    }), 200

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('new_password')
    
    user = User.query.first()
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

# Test Routes
@app.route('/api/speech-test', methods=['POST'])
def speech_test():
    try:
        data = request.json
        user_id = data['user_id']
        spoken_text = data['spoken_text']
        original_text = data['original_text']
        time_spent = data.get('time_spent', 30)  # in seconds
        
        original_words = original_text.lower().split()
        spoken_words = spoken_text.lower().split()
        
        correct_words = sum(1 for i, word in enumerate(spoken_words) 
                          if i < len(original_words) and word == original_words[i])
        accuracy = correct_words / len(original_words) if original_words else 0
        words_per_minute = len(spoken_words) / (time_spent / 60)
        
        test_result = TestResult(
            user_id=user_id,
            test_type='speech',
            score=accuracy * 100,
            accuracy=accuracy,
            words_per_minute=words_per_minute,
            time_spent=time_spent
        )
        db.session.add(test_result)
        db.session.commit()
        
        # Update user's total learning time
        user = User.query.get(user_id)
        if user:
            user.total_learning_time += time_spent // 60  # Convert to minutes
            user.last_active = datetime.utcnow()
        
        # Record learning session
        learning_session = LearningSession(
            user_id=user_id,
            session_type='test',
            activity_id=test_result.id,
            time_spent=time_spent,
            date=date.today()
        )
        db.session.add(learning_session)
        db.session.commit()
        
        return jsonify({
            'accuracy': accuracy,
            'words_per_minute': words_per_minute,
            'score': accuracy * 100,
            'time_spent': time_spent
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
        time_spent = data.get('time_spent', 45)  # in seconds
        
        original_words = original_text.lower().split()
        typed_words = typed_text.lower().split()
        
        correct_words = sum(1 for i, word in enumerate(typed_words) 
                          if i < len(original_words) and word == original_words[i])
        accuracy = correct_words / len(original_words) if original_words else 0
        
        test_result = TestResult(
            user_id=user_id,
            test_type='listening',
            score=accuracy * 100,
            accuracy=accuracy,
            time_spent=time_spent
        )
        db.session.add(test_result)
        db.session.commit()
        
        # Update user's total learning time
        user = User.query.get(user_id)
        if user:
            user.total_learning_time += time_spent // 60  # Convert to minutes
            user.last_active = datetime.utcnow()
        
        # Record learning session
        learning_session = LearningSession(
            user_id=user_id,
            session_type='test',
            activity_id=test_result.id,
            time_spent=time_spent,
            date=date.today()
        )
        db.session.add(learning_session)
        db.session.commit()
        
        return jsonify({
            'accuracy': accuracy,
            'score': accuracy * 100,
            'time_spent': time_spent
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Game Routes - FIXED GAME TYPE NAMES
@app.route('/api/save-game-score', methods=['POST'])
def save_game_score():
    try:
        data = request.json
        print(f"Saving game score: {data}")  # Debug logging
        
        user_id = data['user_id']
        game_type = data['game_type']
        score = data['score']
        level = data.get('level', 1)
        time_spent = data.get('time_spent', 120)  # in seconds
        
        game_score = GameScore(
            user_id=user_id,
            game_type=game_type,
            score=score,
            level=level,
            time_spent=time_spent
        )
        db.session.add(game_score)
        db.session.commit()
        
        # Update user's total learning time
        user = User.query.get(user_id)
        if user:
            user.total_learning_time += time_spent // 60  # Convert to minutes
            user.last_active = datetime.utcnow()
        
        # Record learning session
        learning_session = LearningSession(
            user_id=user_id,
            session_type='game',
            activity_id=game_score.id,
            time_spent=time_spent,
            date=date.today()
        )
        db.session.add(learning_session)
        db.session.commit()
        
        # Check if this is a new high score
        highest_score = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(
            user_id=user_id,
            game_type=game_type
        ).scalar() or 0
        
        is_new_high_score = score > highest_score
        
        return jsonify({
            'message': 'Score saved successfully',
            'is_new_high_score': is_new_high_score,
            'previous_high_score': highest_score,
            'new_score': score
        }), 200
    except Exception as e:
        print(f"Error saving game score: {str(e)}")  # Debug logging
        return jsonify({'error': str(e)}), 500

# NEW: Learning Metrics Routes
@app.route('/api/learning-metrics/<int:user_id>', methods=['GET'])
def get_learning_metrics(user_id):
    """Get comprehensive learning metrics for dashboard"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get learning sessions for streak calculation
        sessions = LearningSession.query.filter_by(user_id=user_id)\
            .order_by(LearningSession.date.desc()).all()
        
        # Calculate streak
        streak_data = calculate_streak(sessions)
        
        # Get today's learning time
        today = date.today()
        today_sessions = LearningSession.query.filter_by(
            user_id=user_id, 
            date=today
        ).all()
        today_learning = sum(session.time_spent for session in today_sessions) // 60  # minutes
        
        # Get improvement rate (based on test scores from last 7 days vs previous 7 days)
        improvement_rate = calculate_improvement_rate(user_id)
        
        # Calculate blocks earned (1 block = 30 minutes of learning)
        blocks_earned = user.total_learning_time // 30
        
        # Get daily goal status (60 minutes target)
        daily_goal = today_learning >= 60
        
        # Get recent test scores for improvement calculation
        recent_tests = TestResult.query.filter_by(user_id=user_id)\
            .order_by(TestResult.created_at.desc()).limit(10).all()
        
        test_improvement = calculate_test_improvement(recent_tests) if len(recent_tests) > 1 else 0
        
        metrics = {
            'streak': streak_data['current_streak'],
            'longest_streak': streak_data['longest_streak'],
            'total_learning_time': user.total_learning_time,  # in minutes
            'today_learning': today_learning,
            'improvement_rate': improvement_rate,
            'test_improvement': test_improvement,
            'blocks_earned': blocks_earned,
            'daily_goal': daily_goal,
            'daily_goal_target': 60,
            'last_active': user.last_active.isoformat() if user.last_active else None
        }
        
        return jsonify(metrics), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_streak(sessions):
    """Calculate current streak and longest streak"""
    if not sessions:
        return {'current_streak': 0, 'longest_streak': 0}
    
    # Get unique dates with learning activity
    learning_dates = set(session.date for session in sessions)
    sorted_dates = sorted(learning_dates, reverse=True)
    
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    prev_date = None
    
    for learning_date in sorted_dates:
        if prev_date is None:
            # First day of current streak
            current_streak = 1
            temp_streak = 1
        else:
            days_diff = (prev_date - learning_date).days
            if days_diff == 1:
                # Consecutive day
                if current_streak == temp_streak:
                    current_streak += 1
                temp_streak += 1
            else:
                # Streak broken
                temp_streak = 1
        
        longest_streak = max(longest_streak, temp_streak)
        prev_date = learning_date
    
    return {
        'current_streak': current_streak,
        'longest_streak': longest_streak
    }

def calculate_improvement_rate(user_id):
    """Calculate improvement rate based on recent test scores"""
    # Get tests from last 14 days
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    recent_tests = TestResult.query.filter(
        TestResult.user_id == user_id,
        TestResult.created_at >= fourteen_days_ago
    ).all()
    
    if len(recent_tests) < 2:
        return 0
    
    # Split into two weeks
    midpoint = len(recent_tests) // 2
    week1_tests = recent_tests[:midpoint]
    week2_tests = recent_tests[midpoint:]
    
    if not week1_tests or not week2_tests:
        return 0
    
    week1_avg = sum(test.score for test in week1_tests) / len(week1_tests)
    week2_avg = sum(test.score for test in week2_tests) / len(week2_tests)
    
    if week1_avg == 0:
        return 100 if week2_avg > 0 else 0
    
    improvement = ((week2_avg - week1_avg) / week1_avg) * 100
    return max(0, min(100, improvement))  # Cap between 0-100%

def calculate_test_improvement(recent_tests):
    """Calculate improvement from oldest to newest test"""
    if len(recent_tests) < 2:
        return 0
    
    oldest_score = recent_tests[-1].score
    newest_score = recent_tests[0].score
    
    if oldest_score == 0:
        return 100 if newest_score > 0 else 0
    
    improvement = ((newest_score - oldest_score) / oldest_score) * 100
    return max(0, min(100, improvement))

# NEW: Learning Blocks Data
@app.route('/api/learning-blocks/<int:user_id>', methods=['GET'])
def get_learning_blocks(user_id):
    """Get learning blocks data for visualization (like GitHub contributions)"""
    try:
        # Get learning sessions from last 150 days (for 150 blocks visualization)
        end_date = date.today()
        start_date = end_date - timedelta(days=149)
        
        sessions = LearningSession.query.filter(
            LearningSession.user_id == user_id,
            LearningSession.date >= start_date,
            LearningSession.date <= end_date
        ).all()
        
        # Group sessions by date and calculate daily learning time
        daily_learning = defaultdict(int)
        for session in sessions:
            daily_learning[session.date] += session.time_spent // 60  # Convert to minutes
        
        # Create blocks data for 150 days
        blocks = []
        for i in range(150):
            block_date = end_date - timedelta(days=149 - i)
            minutes = daily_learning.get(block_date, 0)
            
            # Determine intensity level
            if minutes == 0:
                intensity = 0
            elif minutes < 30:
                intensity = 1
            elif minutes < 60:
                intensity = 2
            else:
                intensity = 3
            
            blocks.append({
                'date': block_date.isoformat(),
                'minutes': minutes,
                'intensity': intensity,
                'filled': minutes > 0
            })
        
        return jsonify({'blocks': blocks}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# FIXED: Highest Scores Route - Corrected game type queries
@app.route('/api/user-highest-scores/<int:user_id>', methods=['GET'])
def get_user_highest_scores(user_id):
    """Get highest scores for a user across all tests and games"""
    try:
        print(f"Fetching highest scores for user: {user_id}")  # Debug logging
        
        # Get highest test scores
        highest_speech = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='speech').scalar() or 0
        
        highest_listening = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='listening').scalar() or 0
        
        # Get highest game scores - FIXED: Using correct game type names
        highest_memory_match = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='memory_match').scalar() or 0
        
        highest_word_jumble = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='word_jumble').scalar() or 0
        
        highest_spelling_bee = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='spelling_bee').scalar() or 0
        
        # Debug logging
        print(f"Memory Match high: {highest_memory_match}")
        print(f"Word Jumble high: {highest_word_jumble}")
        print(f"Spelling Bee high: {highest_spelling_bee}")
        
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
        print(f"Error in get_user_highest_scores: {str(e)}")  # Debug logging
        return jsonify({'error': str(e)}), 500

# NEW: Combined Dashboard Data Route
@app.route('/api/dashboard-data/<int:user_id>', methods=['GET'])
def get_dashboard_data(user_id):
    """Get all dashboard data in one request"""
    try:
        print(f"Fetching dashboard data for user: {user_id}")  # Debug logging
        
        # Get user info
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get highest scores
        highest_speech = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='speech').scalar() or 0
        
        highest_listening = db.session.query(
            db.func.max(TestResult.score)
        ).filter_by(user_id=user_id, test_type='listening').scalar() or 0
        
        # Get highest game scores
        highest_memory_match = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='memory_match').scalar() or 0
        
        highest_word_jumble = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='word_jumble').scalar() or 0
        
        highest_spelling_bee = db.session.query(
            db.func.max(GameScore.score)
        ).filter_by(user_id=user_id, game_type='spelling_bee').scalar() or 0
        
        # Get learning sessions for streak calculation
        sessions = LearningSession.query.filter_by(user_id=user_id)\
            .order_by(LearningSession.date.desc()).all()
        
        # Calculate streak
        streak_data = calculate_streak(sessions)
        
        # Get today's learning time
        today = date.today()
        today_sessions = LearningSession.query.filter_by(
            user_id=user_id, 
            date=today
        ).all()
        today_learning = sum(session.time_spent for session in today_sessions) // 60  # minutes
        
        # Get improvement rate
        improvement_rate = calculate_improvement_rate(user_id)
        
        # Calculate blocks earned (1 block = 30 minutes of learning)
        blocks_earned = user.total_learning_time // 30
        
        # Get daily goal status (60 minutes target)
        daily_goal = today_learning >= 60
        
        # Get recent test scores for improvement calculation
        recent_tests = TestResult.query.filter_by(user_id=user_id)\
            .order_by(TestResult.created_at.desc()).limit(10).all()
        
        test_improvement = calculate_test_improvement(recent_tests) if len(recent_tests) > 1 else 0
        
        # Get learning blocks data
        end_date = date.today()
        start_date = end_date - timedelta(days=149)
        blocks_sessions = LearningSession.query.filter(
            LearningSession.user_id == user_id,
            LearningSession.date >= start_date,
            LearningSession.date <= end_date
        ).all()
        
        # Group sessions by date and calculate daily learning time
        daily_learning = defaultdict(int)
        for session in blocks_sessions:
            daily_learning[session.date] += session.time_spent // 60  # Convert to minutes
        
        # Create blocks data for 150 days
        learning_blocks = []
        for i in range(150):
            block_date = end_date - timedelta(days=149 - i)
            minutes = daily_learning.get(block_date, 0)
            
            # Determine intensity level
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
                'age': user.age
            },
            'highest_scores': {
                'speech_test': highest_speech,
                'listening_test': highest_listening,
                'word_jumble': highest_word_jumble,
                'memory_match': highest_memory_match,
                'spelling_bee': highest_spelling_bee
            },
            'learning_metrics': {
                'streak': streak_data['current_streak'],
                'longest_streak': streak_data['longest_streak'],
                'total_learning_time': user.total_learning_time,
                'today_learning': today_learning,
                'improvement_rate': improvement_rate,
                'test_improvement': test_improvement,
                'blocks_earned': blocks_earned,
                'daily_goal': daily_goal,
                'daily_goal_target': 60,
                'last_active': user.last_active.isoformat() if user.last_active else None
            },
            'learning_blocks': learning_blocks
        }
        
        print(f"Dashboard data: {dashboard_data}")  # Debug logging
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        print(f"Error in get_dashboard_data: {str(e)}")  # Debug logging
        return jsonify({'error': str(e)}), 500

# Progress Routes
@app.route('/api/progress/<int:user_id>', methods=['GET'])
def get_progress(user_id):
    test_results = TestResult.query.filter_by(user_id=user_id).all()
    game_scores = GameScore.query.filter_by(user_id=user_id).all()
    learning_sessions = LearningSession.query.filter_by(user_id=user_id).all()
    
    progress_data = {
        'test_results': [
            {
                'test_type': tr.test_type,
                'score': tr.score,
                'time_spent': tr.time_spent,
                'date': tr.created_at.isoformat()
            } for tr in test_results
        ],
        'game_scores': [
            {
                'game_type': gs.game_type,
                'score': gs.score,
                'level': gs.level,
                'time_spent': gs.time_spent,
                'date': gs.created_at.isoformat()
            } for gs in game_scores
        ],
        'learning_sessions': [
            {
                'session_type': ls.session_type,
                'time_spent': ls.time_spent,
                'date': ls.date.isoformat()
            } for ls in learning_sessions
        ],
        'total_learning_time': sum(ls.time_spent for ls in learning_sessions) // 60
    }
    
    return jsonify(progress_data), 200

@app.route('/api/child-progress/<int:parent_id>', methods=['GET'])
def get_child_progress(parent_id):
    children = User.query.filter_by(parent_id=parent_id).all()
    progress_data = []
    
    for child in children:
        test_results = TestResult.query.filter_by(user_id=child.id).all()
        game_scores = GameScore.query.filter_by(user_id=child.id).all()
        learning_sessions = LearningSession.query.filter_by(user_id=child.id).all()
        
        # Get learning metrics for each child
        metrics_response = get_learning_metrics(child.id)
        metrics_data = metrics_response.get_json() if metrics_response.status_code == 200 else {}
        
        child_data = {
            'child_id': child.id,
            'child_name': child.username,
            'child_age': child.age,
            'test_results': [{'test_type': tr.test_type, 'score': tr.score, 'date': tr.created_at.isoformat()} for tr in test_results],
            'game_scores': [{'game_type': gs.game_type, 'score': gs.score, 'level': gs.level} for gs in game_scores],
            'learning_metrics': metrics_data if 'error' not in metrics_data else {},
            'total_tests': len(test_results),
            'total_games': len(game_scores),
            'total_learning_time': sum(ls.time_spent for ls in learning_sessions) // 60
        }
        progress_data.append(child_data)
    
    return jsonify(progress_data), 200

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
            
            # Get learning metrics
            metrics_response = get_learning_metrics(child.id)
            metrics_data = metrics_response.get_json() if metrics_response.status_code == 200 else {}
            
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
                'learning_metrics': metrics_data,
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
                'total_games': GameScore.query.filter_by(user_id=child.id).count(),
                'total_learning_time': child.total_learning_time if child.total_learning_time else 0
            }
            children_data.append(child_data)
        
        return jsonify({
            'parent_id': parent_id,
            'children': children_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict-dyslexia', methods=['POST'])
def predict_dyslexia_route():
    data = request.json
    user_id = data['user_id']
    
    test_results = TestResult.query.filter_by(user_id=user_id).all()
    
    if len(test_results) < 2:
        return jsonify({'error': 'Insufficient test data'}), 400
    
    speech_scores = [tr.accuracy for tr in test_results if tr.test_type == 'speech']
    listening_scores = [tr.accuracy for tr in test_results if tr.test_type == 'listening']
    speech_wpm = [tr.words_per_minute for tr in test_results if tr.test_type == 'speech' and tr.words_per_minute]
    
    avg_speech = np.mean(speech_scores) if speech_scores else 0
    avg_listening = np.mean(listening_scores) if listening_scores else 0
    avg_wpm = np.mean(speech_wpm) if speech_wpm else 30
    
    dyslexia_probability = predict_dyslexia(avg_speech, avg_listening, avg_wpm)
    
    return jsonify({
        'dyslexia_probability': dyslexia_probability,
        'is_at_risk': dyslexia_probability > 0.7,
        'speech_score': avg_speech,
        'listening_score': avg_listening,
        'words_per_minute': avg_wpm
    }), 200

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
        words_per_minute=45.2,
        time_spent=180
    )
    db.session.add(test_result)
    
    # Create sample game score
    game_score = GameScore(
        user_id=user.id,
        game_type='word_jumble',
        score=100,
        level=2,
        time_spent=300
    )
    db.session.add(game_score)
    
    # Update user's learning time
    user.total_learning_time = 8  # 8 minutes
    
    # Create learning session
    learning_session = LearningSession(
        user_id=user.id,
        session_type='test',
        activity_id=test_result.id,
        time_spent=180,
        date=date.today()
    )
    db.session.add(learning_session)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Sample data created', 
        'user_id': user.id,
        'test_results': 1,
        'game_scores': 1,
        'learning_sessions': 1
    }), 200

# Initialize database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)