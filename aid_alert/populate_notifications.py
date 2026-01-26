import os
import django
import sys

# Setup Django environment
# sys.path.append(r'C:\Users\johnc\OneDrive\Desktop\Aidalert\aid_alert') # Not needed if running from root with manage.py shell context? 
# Actually best to run as standalone script setting env var
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aid_alert.settings')
django.setup()

from aid_app.models import Incident, Notification, UserProfile
from django.utils import timezone
from datetime import timedelta

try:
    facility_managers = list(UserProfile.objects.filter(role='facility'))
    users = [p.user for p in facility_managers]
    print(f"Found {len(users)} facility managers.")
    
    if not users:
        # Fallback: Find superusers or just first user if no facility manager
        from django.contrib.auth.models import User
        users = User.objects.filter(is_superuser=True)
        print(f"Fallback to {len(users)} superusers.")

    incidents = Incident.objects.filter(severity__in=['critical', 'high'])
    print(f"Found {incidents.count()} critical/high incidents.")
    
    count = 0 
    for inc in incidents:
        for u in users:
            if not Notification.objects.filter(recipient=u, related_incident=inc).exists():
                Notification.objects.create(
                    recipient=u,
                    title=f"New {inc.get_severity_display()} Incident",
                    message=f"Type: {inc.get_incident_type_display()}. Location: {inc.location}",
                    notification_type=inc.severity,
                    category='incident',
                    related_incident=inc,
                    is_read=False
                )
                count += 1
    print(f"Successfully created {count} notifications.")

except Exception as e:
    print(f"Error: {e}")
