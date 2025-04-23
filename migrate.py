"""
Migration script to transfer data from transactions.json to SQLite database.
This script creates a default user and associates all transactions with them.
"""

import json
import os
import sys
from werkzeug.security import generate_password_hash

# Make sure to run this script from the correct directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

try:
    from app import db, Transaction, User, app
except ModuleNotFoundError:
    print("Error: Could not import from app.py")
    print("Make sure you are running this script from the same directory as app.py")
    sys.exit(1)

def migrate_json_to_sqlite():
    # Path to the transactions.json file
    json_file_path = 'transactions.json'
    
    # Check if the file exists
    if not os.path.exists(json_file_path):
        print(f"Error: {json_file_path} not found.")
        return
    
    try:
        # Load JSON data
        with open(json_file_path, 'r') as f:
            transactions_data = json.load(f)
        
        print(f"Found {len(transactions_data)} transactions in JSON file")
        
        # Create database context
        with app.app_context():
            # Create a default user for the existing transactions
            default_username = 'user'
            default_email = 'user@example.com'
            default_password = 'password'  # You should change this!
            
            # Check if the default user already exists
            user = User.query.filter_by(username=default_username).first()
            
            if not user:
                # Create the default user
                user = User(username=default_username, email=default_email)
                user.set_password(default_password)
                db.session.add(user)
                db.session.commit()
                print(f"Created default user: {default_username} with password: {default_password}")
            else:
                print(f"Using existing user: {default_username}")
            
            # Add each transaction to the database
            for data in transactions_data:
                try:
                    # Convert amount to float to be safe
                    amount = float(data['amount'])
                    
                    # Create a new Transaction object
                    transaction = Transaction(
                        title=data['title'],
                        amount=amount,
                        type=data['type'],
                        category=data['category'],
                        date=data['date'],
                        user_id=user.id  # Associate with the default user
                    )
                    
                    # Add to session
                    db.session.add(transaction)
                    
                except Exception as e:
                    print(f"Error processing transaction: {data} - {str(e)}")
            
            # Commit all changes
            db.session.commit()
            
            # Verify migration
            transaction_count = Transaction.query.filter_by(user_id=user.id).count()
            print(f"Migration complete. {transaction_count} transactions now in the database for user {default_username}.")
            print("\nYou can now log in with:")
            print(f"Username: {default_username}")
            print(f"Password: {default_password}")
    
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        if 'db' in locals():
            db.session.rollback()
        print("Migration rolled back due to error.")

if __name__ == '__main__':
    print("Starting migration from JSON to SQLite with user authentication...")
    migrate_json_to_sqlite()
    print("Migration process completed.")