import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aid_alert.settings')
django.setup()

from aid_app.models import UserProfile, Facility, User

print("Checking Facility Data...")

profiles = UserProfile.objects.filter(role='facility')
print(f"Found {profiles.count()} UserProfiles with role='facility'.")

facilities = Facility.objects.all()
print(f"Found {facilities.count()} Facility objects.")

for p in profiles:
    user = p.user
    try:
        f = user.facility_profile
        print(f"User {user.username}: Has Facility Profile (ID: {f.id}, Name: {f.facility_name})")
    except Exception as e:
        print(f"User {user.username}: NO Facility Profile. Error: {e}")
