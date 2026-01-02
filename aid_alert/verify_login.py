import os
import django
from django.test import RequestFactory, Client
from django.urls import reverse

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aid_alert.settings')
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS += ['testserver']

from django.contrib.auth import get_user_model
from aid_app.models import UserProfile

User = get_user_model()

def verify_login_redirect():
    print("Verifying Login Redirection Logic...")
    client = Client()
    password = 'Password123!'

    # Define test cases: (username, role, expected_url_name)
    test_cases = [
        ('redirect_test_seller', 'seller', 'aid_app:seller_dashboard'),
        ('redirect_test_facility', 'facility', 'aid_app:facility_dashboard'),
        ('redirect_test_responder', 'responder', 'aid_app:responder_dashboard'),
        ('redirect_test_user', 'user', 'aid_app:dashboard')
    ]

    for username, role, expected_url_name in test_cases:
        print(f"\nTesting {role} login...")
        
        # cleanup
        User.objects.filter(username=username).delete()
        
        # Create user
        user = User.objects.create_user(username=username, email=f'{username}@example.com', password=password)
        UserProfile.objects.create(user=user, role=role)
        
        # Attempt login
        response = client.post(reverse('aid_app:login'), {
            'username': username,
            'password': password
        })
        
        expected_url = reverse(expected_url_name)
        
        if response.status_code == 302:
            redirect_url = response.url
            print(f"  Redirection: {redirect_url}")
            if expected_url in redirect_url:
                print("  SUCCESS: Redirected to correct dashboard.")
            else:
                print(f"  FAIL: Expected {expected_url}, got {redirect_url}")
        else:
            print(f"  FAIL: Login did not redirect. Status: {response.status_code}")
            # print(response.content.decode('utf-8')) # Debug if needed

    # Cleanup
    print("\nCleaning up...")
    for username, _, _ in test_cases:
        User.objects.filter(username=username).delete()

if __name__ == '__main__':
    try:
        verify_login_redirect()
    except Exception as e:
        print(f"Error: {e}")
