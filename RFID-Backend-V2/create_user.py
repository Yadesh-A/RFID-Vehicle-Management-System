import os
import sys
import django

# ✅ STEP 1: Setup Django environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# ✅ STEP 2: Import your custom User model
from core.models import User


def create_user():
    print("\n=== Create New User ===\n")

    username = input("Enter username: ").strip()
    email = input("Enter email: ").strip()
    phone_number = input("Enter phone number: ").strip()

    print("\nUser Roles:")
    print("1. Quarter Master")
    print("2. Employee")
    print("3. Admin")
    print("4. Super Admin")

    role_choice = input("Select role (1-4): ").strip()

    ROLE_MAP = {
        '1': 'Quarter Master',
        '2': 'Employee',
        '3': 'Admin',
        '4': 'Super Admin',
    }

    role = ROLE_MAP.get(role_choice, 'Quarter Master')
    password = input("Enter password: ").strip()

    try:
        # ✅ STEP 3: Create user using CORRECT fields
        user = User(
            username=username,
            email=email,
            phone_number=phone_number,
            role=role,              # ✅ CORRECT FIELD
        )
        user.set_password(password)
        user.save()

        print("\n✅ User created successfully!")
        print(f"User ID   : {user.user_id}")
        print(f"Username  : {user.username}")
        print(f"Email     : {user.email}")
        print(f"Role      : {user.role}")
        print("\nYou can now login using:")
        print(f"Username: {username}")
        print(f"Password: {password}")

    except Exception as e:
        print("\n❌ Error creating user:")
        print(e)


if __name__ == "__main__":
    create_user()
