import pytest
import json
from datetime import datetime
import os
from app import app, db, User, Transaction


@pytest.fixture
def client():
    """Create a test client for the app."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def auth_client(client):
    """Create an authenticated test client."""
    # Create a test user
    with app.app_context():
        user = User(username='testuser', email='test@example.com')
        user.set_password('testpass')
        db.session.add(user)
        db.session.commit()
    
    # Login with the test user
    client.post('/login', data={
        'username': 'testuser',
        'password': 'testpass'
    })
    
    return client


@pytest.fixture
def sample_transactions(auth_client):
    """Add sample transactions for the test user."""
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        
        transactions = [
            Transaction(
                title='Grocery Shopping',
                amount=-75.50,
                type='expense',
                category='Food',
                date='2025-04-15',
                user_id=user.id
            ),
            Transaction(
                title='Salary',
                amount=2000.00,
                type='income',
                category='Salary',
                date='2025-04-01',
                user_id=user.id
            ),
            Transaction(
                title='Internet Bill',
                amount=-60.00,
                type='expense',
                category='Utilities',
                date='2025-04-10',
                user_id=user.id
            )
        ]
        
        for transaction in transactions:
            db.session.add(transaction)
        
        db.session.commit()


# Test User Model
def test_user_creation():
    """Test User model creation and password hashing."""
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    
    assert user.username == 'testuser'
    assert user.email == 'test@example.com'
    assert user.password_hash is not None
    assert user.password_hash != 'password123'
    assert user.check_password('password123')
    assert not user.check_password('wrongpassword')


# Test Transaction Model
def test_transaction_creation():
    """Test Transaction model creation and to_dict method."""
    transaction = Transaction(
        title='Test Transaction',
        amount=100.50,
        type='income',
        category='Other',
        date='2025-04-20',
        user_id=1
    )
    
    assert transaction.title == 'Test Transaction'
    assert transaction.amount == 100.50
    assert transaction.type == 'income'
    assert transaction.category == 'Other'
    assert transaction.date == '2025-04-20'
    assert transaction.user_id == 1
    
    # Test to_dict method
    transaction_dict = transaction.to_dict()
    assert transaction_dict['title'] == 'Test Transaction'
    assert transaction_dict['amount'] == 100.50
    assert transaction_dict['type'] == 'income'
    assert transaction_dict['category'] == 'Other'
    assert transaction_dict['date'] == '2025-04-20'


# Test Authentication Routes
def test_register(client):
    """Test user registration."""
    response = client.post('/register', data={
        'username': 'newuser',
        'email': 'newuser@example.com',
        'password': 'password123',
        'confirm_password': 'password123'
    }, follow_redirects=True)
    
    assert response.status_code == 200
    assert b'Registration successful!' in response.data
    
    # Check that user was created in the database
    with app.app_context():
        user = User.query.filter_by(username='newuser').first()
        assert user is not None
        assert user.email == 'newuser@example.com'


def test_register_existing_username(client):
    """Test registration with an existing username."""
    # First create a user
    with app.app_context():
        user = User(username='existinguser', email='existing@example.com')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
    
    # Try to register with the same username
    response = client.post('/register', data={
        'username': 'existinguser',
        'email': 'new@example.com',
        'password': 'password456',
        'confirm_password': 'password456'
    })
    
    assert response.status_code == 200
    assert b'Username already exists' in response.data


def test_register_password_mismatch(client):
    """Test registration with mismatched passwords."""
    response = client.post('/register', data={
        'username': 'mismatchuser',
        'email': 'mismatch@example.com',
        'password': 'password123',
        'confirm_password': 'differentpassword'
    })
    
    assert response.status_code == 200
    assert b'Passwords do not match' in response.data


def test_login_success(client):
    """Test successful login."""
    # Create a user first
    with app.app_context():
        user = User(username='loginuser', email='login@example.com')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
    
    # Try to login
    response = client.post('/login', data={
        'username': 'loginuser',
        'password': 'password123'
    }, follow_redirects=True)
    
    assert response.status_code == 200
    # Check if redirected to dashboard
    assert b'dashboard' in response.request.path.encode()


def test_login_invalid_credentials(client):
    """Test login with invalid credentials."""
    response = client.post('/login', data={
        'username': 'nonexistentuser',
        'password': 'wrongpassword'
    })
    
    assert response.status_code == 200
    assert b'Invalid username or password' in response.data


def test_logout(auth_client):
    """Test logout functionality."""
    response = auth_client.get('/logout', follow_redirects=True)
    
    assert response.status_code == 200
    assert b'You have been logged out' in response.data
    assert b'login' in response.request.path.encode()


# Test Transaction Routes
def test_get_transactions(auth_client, sample_transactions):
    """Test getting all transactions."""
    response = auth_client.get('/transactions')
    
    assert response.status_code == 200
    
    # Parse response data
    data = json.loads(response.data)
    
    # Check that we have all 3 sample transactions
    assert len(data) == 3
    
    # Check that data includes expected transactions
    transaction_titles = [t['title'] for t in data]
    assert 'Grocery Shopping' in transaction_titles
    assert 'Salary' in transaction_titles
    assert 'Internet Bill' in transaction_titles


def test_get_transactions_with_filters(auth_client, sample_transactions):
    """Test getting transactions with filters."""
    # Test date filter
    response = auth_client.get('/transactions?start_date=2025-04-10')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert len(data) == 2  # Should only include transactions on or after April 10
    
    # Test category filter
    response = auth_client.get('/transactions?category=Food')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]['title'] == 'Grocery Shopping'
    
    # Test type filter
    response = auth_client.get('/transactions?type=income')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]['title'] == 'Salary'


def test_add_transaction(auth_client):
    """Test adding a new transaction."""
    transaction_data = {
        'title': 'New Test Transaction',
        'amount': 50.25,
        'type': 'income',
        'category': 'Freelance',
        'date': '2025-04-20'
    }
    
    response = auth_client.post('/transactions', 
                               json=transaction_data,
                               content_type='application/json')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['transaction']['title'] == 'New Test Transaction'
    
    # Verify transaction was added to database
    with app.app_context():
        transaction = Transaction.query.filter_by(title='New Test Transaction').first()
        assert transaction is not None
        assert transaction.amount == 50.25


def test_add_transaction_missing_fields(auth_client):
    """Test adding a transaction with missing required fields."""
    # Missing title
    transaction_data = {
        'amount': 30.00,
        'date': '2025-04-22'
    }
    
    response = auth_client.post('/transactions', 
                               json=transaction_data,
                               content_type='application/json')
    
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'Missing required fields' in data['message']


def test_update_transaction(auth_client, sample_transactions):
    """Test updating a transaction."""
    # First get the ID of a transaction
    response = auth_client.get('/transactions')
    transactions = json.loads(response.data)
    transaction_id = transactions[0]['id']
    
    # Update the transaction
    update_data = {
        'title': 'Updated Transaction',
        'amount': 100.00
    }
    
    response = auth_client.put(f'/transactions/{transaction_id}', 
                              json=update_data,
                              content_type='application/json')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['transaction']['title'] == 'Updated Transaction'
    assert data['transaction']['amount'] == 100.00
    
    # Verify changes in database
    with app.app_context():
        transaction = Transaction.query.get(transaction_id)
        assert transaction.title == 'Updated Transaction'
        assert transaction.amount == 100.00


def test_update_nonexistent_transaction(auth_client):
    """Test updating a transaction that doesn't exist."""
    update_data = {
        'title': 'This Should Fail',
        'amount': 999.99
    }
    
    response = auth_client.put('/transactions/9999', 
                              json=update_data,
                              content_type='application/json')
    
    assert response.status_code == 404
    
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'Transaction not found' in data['message']


def test_delete_transaction(auth_client, sample_transactions):
    """Test deleting a transaction."""
    # First get the ID of a transaction
    response = auth_client.get('/transactions')
    transactions = json.loads(response.data)
    transaction_id = transactions[0]['id']
    transaction_title = transactions[0]['title']
    
    # Delete the transaction
    response = auth_client.delete(f'/transactions/{transaction_id}')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['transaction']['title'] == transaction_title
    
    # Verify transaction was deleted from database
    with app.app_context():
        transaction = Transaction.query.get(transaction_id)
        assert transaction is None
    
    # Verify the transaction count is now one less
    response = auth_client.get('/transactions')
    transactions = json.loads(response.data)
    assert len(transactions) == 2


def test_delete_nonexistent_transaction(auth_client):
    """Test deleting a transaction that doesn't exist."""
    response = auth_client.delete('/transactions/9999')
    
    assert response.status_code == 404
    
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'Transaction not found' in data['message']


# Test Summary Route
def test_get_summary(auth_client, sample_transactions):
    """Test getting financial summary."""
    response = auth_client.get('/summary')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    
    # Check summary values
    assert data['total_income'] == 2000.00
    assert data['total_expenses'] == 135.50  # 75.50 + 60.00
    assert data['balance'] == 1864.50  # 2000.00 - 135.50
    
    # Check category breakdowns
    assert len(data['expense_breakdown']) == 2  # Food and Utilities
    assert len(data['income_breakdown']) == 1  # Salary
    
    # Check specific categories
    expense_categories = [item['category'] for item in data['expense_breakdown']]
    assert 'Food' in expense_categories
    assert 'Utilities' in expense_categories
    
    income_categories = [item['category'] for item in data['income_breakdown']]
    assert 'Salary' in income_categories


def test_get_summary_with_date_filter(auth_client, sample_transactions):
    """Test getting financial summary with date filters."""
    response = auth_client.get('/summary?start_date=2025-04-10')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    
    # Should only include transactions on or after April 10
    # Internet bill (-60.00) and Grocery Shopping (-75.50)
    assert data['total_income'] == 0
    assert data['total_expenses'] == 135.50
    assert data['balance'] == -135.50

    def test_transaction_with_notes(auth_client):
    """Test adding a transaction with notes."""
    transaction_data = {
        'title': 'Transaction with Notes',
        'amount': 75.00,
        'type': 'expense',
        'category': 'Entertainment',
        'date': '2025-04-25',
        'notes': 'Movie night with friends'
    }
    
    response = auth_client.post('/transactions', 
                              json=transaction_data,
                              content_type='application/json')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['transaction']['notes'] == 'Movie night with friends'