from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from aid_app.models import MedicalKit, Responder, KitItem, UserProfile
from datetime import datetime, timedelta
import random

class Command(BaseCommand):
    help = 'Create sample data for facility manager dashboard'

    def handle(self, *args, **options):
        # Create sample medical kits
        kit_types = [
            ('KIT-001', 'Basic First Aid Kit', 'basic'),
            ('KIT-002', 'Advanced Medical Kit', 'advanced'),
            ('KIT-003', 'Emergency Response Kit', 'emergency'),
            ('KIT-004', 'Trauma Care Kit', 'trauma'),
            ('KIT-005', 'Pediatric Care Kit', 'pediatric'),
            ('KIT-006', 'Basic First Aid Kit', 'basic'),
            ('KIT-007', 'Advanced Medical Kit', 'advanced'),
            ('KIT-008', 'Emergency Response Kit', 'emergency'),
            ('KIT-009', 'Basic First Aid Kit', 'basic'),
            ('KIT-010', 'Trauma Care Kit', 'trauma'),
            ('KIT-011', 'Advanced Medical Kit', 'advanced'),
            ('KIT-012', 'Basic First Aid Kit', 'basic'),
            ('KIT-013', 'Emergency Response Kit', 'emergency'),
            ('KIT-014', 'Pediatric Care Kit', 'pediatric'),
            ('KIT-015', 'Advanced Medical Kit', 'advanced'),
            ('KIT-016', 'Basic First Aid Kit', 'basic'),
            ('KIT-017', 'Emergency Response Kit', 'emergency'),
            ('KIT-018', 'Trauma Care Kit', 'trauma'),
            ('KIT-019', 'Basic First Aid Kit', 'basic'),
            ('KIT-020', 'Advanced Medical Kit', 'advanced'),
            ('KIT-021', 'Emergency Response Kit', 'emergency'),
            ('KIT-022', 'Basic First Aid Kit', 'basic'),
            ('KIT-023', 'Trauma Care Kit', 'trauma'),
            ('KIT-024', 'Advanced Medical Kit', 'advanced'),
        ]

        for kit_id, name, kit_type in kit_types:
            kit, created = MedicalKit.objects.get_or_create(
                kit_id=kit_id,
                defaults={
                    'name': name,
                    'kit_type': kit_type,
                    'status': 'available',
                    'location': f'Room {random.randint(100, 999)}'
                }
            )
            
            if created:
                # Add kit items
                items = [
                    ('Bandages', random.randint(5, 20), 5),
                    ('Gauze Pads', random.randint(3, 15), 3),
                    ('Antiseptic Wipes', random.randint(10, 30), 10),
                    ('Medical Tape', random.randint(2, 8), 2),
                    ('Scissors', random.randint(1, 3), 1),
                ]
                
                for item_name, quantity, min_qty in items:
                    KitItem.objects.create(
                        kit=kit,
                        name=item_name,
                        quantity=quantity,
                        min_quantity=min_qty
                    )

        # Create sample responders
        responders_data = [
            ('RESP-001', 'John Smith', 'EMT-Basic', 'available'),
            ('RESP-002', 'Sarah Johnson', 'Paramedic', 'on_duty'),
            ('RESP-003', 'Mike Wilson', 'EMT-Advanced', 'available'),
            ('RESP-004', 'Emily Brown', 'Paramedic', 'on_duty'),
            ('RESP-005', 'David Lee', 'EMT-Basic', 'available'),
            ('RESP-006', 'Lisa Garcia', 'Paramedic', 'on_duty'),
            ('RESP-007', 'James Taylor', 'EMT-Advanced', 'available'),
            ('RESP-008', 'Anna Martinez', 'EMT-Basic', 'on_duty'),
            ('RESP-009', 'Robert Anderson', 'Paramedic', 'available'),
            ('RESP-010', 'Jennifer White', 'EMT-Advanced', 'on_duty'),
            ('RESP-011', 'Michael Thomas', 'EMT-Basic', 'available'),
            ('RESP-012', 'Maria Rodriguez', 'Paramedic', 'on_duty'),
            ('RESP-013', 'William Jackson', 'EMT-Advanced', 'available'),
            ('RESP-014', 'Patricia Moore', 'EMT-Basic', 'on_duty'),
            ('RESP-015', 'Christopher Martin', 'Paramedic', 'available'),
            ('RESP-016', 'Nancy Thompson', 'EMT-Advanced', 'on_duty'),
            ('RESP-017', 'Daniel Garcia', 'EMT-Basic', 'available'),
            ('RESP-018', 'Karen Martinez', 'Paramedic', 'on_duty'),
            ('RESP-019', 'Paul Robinson', 'EMT-Advanced', 'available'),
            ('RESP-020', 'Susan Clark', 'EMT-Basic', 'on_duty'),
            ('RESP-021', 'Kevin Lewis', 'Paramedic', 'available'),
            ('RESP-022', 'Betty Walker', 'EMT-Advanced', 'on_duty'),
            ('RESP-023', 'Thomas Hall', 'EMT-Basic', 'available'),
        ]

        for resp_id, name, cert, status in responders_data:
            # Create user if doesn't exist
            username = name.lower().replace(' ', '.')
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': name.split()[0],
                    'last_name': name.split()[1] if len(name.split()) > 1 else '',
                    'email': f'{username}@example.com'
                }
            )
            
            if created:
                user.set_password('password123')
                user.save()
                
                # Create user profile
                UserProfile.objects.create(
                    user=user,
                    role='responder',
                    phone=f'555-{random.randint(100, 999)}-{random.randint(1000, 9999)}'
                )
            
            # Create responder profile
            Responder.objects.get_or_create(
                responder_id=resp_id,
                defaults={
                    'user': user,
                    'phone': f'555-{random.randint(100, 999)}-{random.randint(1000, 9999)}',
                    'specialization': cert,
                    'certification': f'{cert} Certified',
                    'status': status,
                    'current_location': f'Zone {random.choice(["A", "B", "C", "D"])}'
                }
            )

        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))
