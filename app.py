from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Change this to a random secure key in production

# SQLite Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'finance_tracker.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    transactions = db.relationship('Transaction', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Transaction Model - Modified to avoid 'transaction' reserved keyword
class Transaction(db.Model):
    __tablename__ = 'transactions'  # Explicitly set table name to avoid reserved keyword
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.String(10), nullable=False)  # Format: YYYY-MM-DD
    created_at = db.Column(db.DateTime, default=datetime.now)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'amount': self.amount,
            'type': self.type,
            'category': self.category,
            'date': self.date
        }

# Create the database tables
with app.app_context():
    db.create_all()

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Authentication routes
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Simple form validation
        if not username or not email or not password:
            flash('Please fill in all fields', 'error')
            return render_template('register.html')
            
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('register.html')
        
        # Check if username or email already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already exists', 'error')
            return render_template('register.html')
            
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            flash('Email already registered', 'error')
            return render_template('register.html')
        
        # Create new user
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        
        # Save to database
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Please fill in all fields', 'error')
            return render_template('login.html')
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            flash('Invalid username or password', 'error')
            return render_template('login.html')
        
        # User authenticated - store in session
        session['user_id'] = user.id
        session['username'] = user.username
        
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    # Clear the session
    session.pop('user_id', None)
    session.pop('username', None)
    flash('You have been logged out', 'success')
    return redirect(url_for('login'))

# Main application routes
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('index.html')

@app.route('/transactions', methods=['GET'])
@login_required
def get_transactions():
    user_id = session['user_id']
    
    # Get filter parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    transaction_type = request.args.get('type')
    
    # Build the query
    query = Transaction.query.filter_by(user_id=user_id)
    
    # Apply filters if they exist
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    if category and category != 'all':
        query = query.filter(Transaction.category == category)
    
    if transaction_type and transaction_type != 'all':
        query = query.filter(Transaction.type == transaction_type)
    
    # Execute the query and convert to list of dictionaries
    transactions = [transaction.to_dict() for transaction in query.all()]
    
    return jsonify(transactions)

@app.route('/transactions', methods=['POST'])
@login_required
def add_transaction():
    user_id = session['user_id']
    
    # Get transaction data from request
    data = request.json
    
    # Validate input
    if not data or 'title' not in data or 'amount' not in data or 'date' not in data:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    try:
        # Convert amount to float
        amount = float(data['amount'])
        
        # Determine transaction type if not explicitly set
        transaction_type = data.get('type')
        if not transaction_type:
            transaction_type = 'income' if amount >= 0 else 'expense'
        
        # Determine category if not explicitly set
        category = data.get('category')
        if not category:
            category = 'Other Income' if transaction_type == 'income' else 'Other Expense'
        
        # Create new transaction object
        transaction = Transaction(
            title=data['title'],
            amount=amount,
            type=transaction_type,
            category=category,
            date=data['date'],
            user_id=user_id
        )
        
        # Add to database and commit
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'transaction': transaction.to_dict()
        })
    
    except Exception as e:
        print(f"Error adding transaction: {str(e)}")
        db.session.rollback()  # Roll back the session in case of error
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/transactions/<int:transaction_id>', methods=['PUT'])
@login_required
def update_transaction(transaction_id):
    user_id = session['user_id']
    data = request.json
    
    # Validate input
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    try:
        # Find the transaction by ID and make sure it belongs to the current user
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        
        if not transaction:
            return jsonify({'success': False, 'message': 'Transaction not found or unauthorized'}), 404
        
        # Update transaction attributes
        if 'title' in data:
            transaction.title = data['title']
        
        if 'amount' in data:
            transaction.amount = float(data['amount'])
            # Ensure amount matches type
            if 'type' in data:
                transaction.type = data['type']
                if transaction.type == 'expense' and transaction.amount > 0:
                    transaction.amount = -abs(transaction.amount)
                elif transaction.type == 'income' and transaction.amount < 0:
                    transaction.amount = abs(transaction.amount)
        
        if 'category' in data:
            transaction.category = data['category']
        
        if 'date' in data:
            transaction.date = data['date']
        
        # Commit the changes
        db.session.commit()
        
        return jsonify({'success': True, 'transaction': transaction.to_dict()})
    
    except Exception as e:
        print(f"Error updating transaction: {str(e)}")
        db.session.rollback()  # Roll back the session in case of error
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/transactions/<int:transaction_id>', methods=['DELETE'])
@login_required
def delete_transaction(transaction_id):
    user_id = session['user_id']
    
    try:
        # Find the transaction by ID and make sure it belongs to the current user
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        
        if not transaction:
            return jsonify({'success': False, 'message': 'Transaction not found or unauthorized'}), 404
        
        # Store transaction data for the response
        transaction_data = transaction.to_dict()
        
        # Delete the transaction
        db.session.delete(transaction)
        db.session.commit()
        
        return jsonify({'success': True, 'transaction': transaction_data})
    
    except Exception as e:
        print(f"Error deleting transaction: {str(e)}")
        db.session.rollback()  # Roll back the session in case of error
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/summary', methods=['GET'])
@login_required
def get_summary():
    user_id = session['user_id']
    
    # Get filter parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Build the query
    query = Transaction.query.filter_by(user_id=user_id)
    
    # Apply date filters if they exist
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    # Execute the query
    transactions = query.all()
    
    # Calculate summary data
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
    
    # Calculate category breakdowns
    expense_categories = {}
    income_categories = {}
    
    for transaction in transactions:
        if transaction.amount < 0:
            category = transaction.category
            if category in expense_categories:
                expense_categories[category] += abs(transaction.amount)
            else:
                expense_categories[category] = abs(transaction.amount)
        else:
            category = transaction.category
            if category in income_categories:
                income_categories[category] += transaction.amount
            else:
                income_categories[category] = transaction.amount
    
    # Convert to lists for easier processing in frontend
    expense_breakdown = [{'category': cat, 'amount': amt} for cat, amt in expense_categories.items()]
    income_breakdown = [{'category': cat, 'amount': amt} for cat, amt in income_categories.items()]
    
    return jsonify({
        'total_income': total_income,
        'total_expenses': total_expenses,
        'balance': total_income - total_expenses,
        'expense_breakdown': expense_breakdown,
        'income_breakdown': income_breakdown
    })

if __name__ == '__main__':
    app.run(debug=True)