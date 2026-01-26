from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

# Create your models here.

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('seller', 'Seller'),
        ('facility', 'Facility'),
        ('responder', 'Responder'),
    ]
    
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    shipping_address = models.TextField(blank=True, null=True)
    emergency_contacts = models.TextField(blank=True, null=True, help_text="Emergency contact details")
    # Specific fields for primary contact
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    emergency_phone = models.CharField(max_length=20, blank=True, null=True)
    blood_type = models.CharField(max_length=10, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

class Product(models.Model):
    CATEGORY_CHOICES = [
        ('medical_supplies', 'Medical Supplies'),
        ('emergency_equipment', 'Emergency Equipment'),
        ('first_aid_kits', 'First Aid Kits'),
        ('diagnostic_tools', 'Diagnostic Tools'),
        ('protective_equipment', 'Personal Protective Equipment'),
        ('other', 'Other'),
    ]
    
    CONDITION_CHOICES = [
        ('new', 'New'),
        ('like_new', 'Like New'),
        ('good', 'Good'),
        ('fair', 'Fair'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('sold', 'Sold'),
        ('inactive', 'Inactive'),
    ]
    
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=1)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.seller.username}"
    
    class Meta:
        ordering = ['-created_at']

class Facility(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('maintenance', 'Maintenance'),
        ('closed', 'Closed'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='facility_profile')
    facility_name = models.CharField(max_length=200)
    address = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=20)
    available_kits = models.PositiveIntegerField(default=0)
    capacity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.facility_name

class Seller(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='seller_profile')
    shop_name = models.CharField(max_length=200)
    license_no = models.CharField(max_length=50)
    total_products = models.PositiveIntegerField(default=0)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    rating = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.shop_name

# Facility Manager Models
class MedicalKit(models.Model):
    KIT_TYPE_CHOICES = [
        ('basic', 'Basic First Aid'),
        ('advanced', 'Advanced Medical'),
        ('emergency', 'Emergency Response'),
        ('trauma', 'Trauma Care'),
        ('pediatric', 'Pediatric Care'),
    ]
    
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('maintenance', 'Under Maintenance'),
        ('expired', 'Expired'),
        ('lost', 'Lost'),
    ]
    
    kit_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    kit_type = models.CharField(max_length=20, choices=KIT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    location = models.CharField(max_length=200, blank=True)
    last_checked = models.DateTimeField(auto_now=True)
    expiry_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.kit_id} - {self.name}"
    
    class Meta:
        ordering = ['kit_id']

class Responder(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('on_duty', 'On Duty'),
        ('off_duty', 'Off Duty'),
        ('unavailable', 'Unavailable'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='responder_profile')
    responder_id = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=20)
    specialization = models.CharField(max_length=200, blank=True)
    certification = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    current_location = models.CharField(max_length=200, blank=True)
    rating = models.FloatField(default=0.0)
    handled_incidents = models.PositiveIntegerField(default=0)
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.responder_id} - {self.user.username}"
    
    class Meta:
        ordering = ['responder_id']

class KitItem(models.Model):
    kit = models.ForeignKey(MedicalKit, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    min_quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=50, default='pieces')
    expiry_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.kit.kit_id}"
    
    @property
    def is_low_stock(self):
        return self.quantity <= self.min_quantity
    
    class Meta:
        ordering = ['name']

class Incident(models.Model):
    INCIDENT_TYPE_CHOICES = [
        ('medical', 'Medical Emergency'),
        ('fire', 'Fire Hazard'),
        ('accident', 'Accident'),
        ('crime', 'Crime/Security'),
        ('natural', 'Natural Disaster'),
        ('other', 'Other'),
    ]
    
    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('en_route', 'En Route'),
        ('on_scene', 'On Scene'),
        ('providing_aid', 'Providing Aid'),
        ('transporting', 'Transporting'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incidents')
    assigned_responder = models.ForeignKey('Responder', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    location = models.TextField()
    description = models.TextField()
    contact_phone = models.CharField(max_length=20)
    people_involved = models.PositiveIntegerField(default=1)
    immediate_action = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"INC-{self.id:03d} - {self.get_incident_type_display()}"
    
    @property
    def incident_id(self):
        return f"INC-{self.id:03d}"

    class Meta:
        ordering = ['-created_at']



class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('returned', 'Returned'),
    ]
    
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_orders')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Delivery Tracking Fields
    carrier = models.CharField(max_length=50, default='Local', blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    priority = models.CharField(max_length=20, default='Standard')
    current_location = models.CharField(max_length=200, blank=True, help_text="Current city or facility")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"ORD-{self.id:06d} - {self.product.name}"
    
    @property
    def order_id(self):
        return f"ORD-{self.id:06d}"
    
    class Meta:
        ordering = ['-created_at']

class Feedback(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('replied', 'Replied'),
        ('resolved', 'Resolved'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedback')
    incident = models.ForeignKey('Incident', on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback')
    rating = models.IntegerField()
    message = models.TextField()
    sentiment = models.CharField(max_length=20, blank=True) # positive, negative, neutral
    tags = models.CharField(max_length=200, blank=True) # e.g. "Feature Request, Bug"
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reply = models.TextField(blank=True, null=True)
    replied_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Feedback from {self.user.username} ({self.rating}/5)"
    
    class Meta:
        ordering = ['-created_at']

class SystemReport(models.Model):
    TYPE_CHOICES = [
        ('user_activity', 'User Activity'),
        ('incident_summary', 'Incident Summary'),
        ('system_performance', 'System Performance'),
        ('marketplace_stats', 'Marketplace Stats'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    report_id = models.CharField(max_length=20, unique=True)
    report_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    generated_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    data = models.TextField(blank=True) # JSON or text summary
    
    def __str__(self):
        return f"{self.report_id} - {self.title}"
    
    class Meta:
        ordering = ['-generated_at']



class FirstAidGuide(models.Model):
    URGENCY_CHOICES = [
        ('critical', 'Life-Threatening'),
        ('urgent', 'Urgent'),
        ('moderate', 'Moderate'),
    ]

    title = models.CharField(max_length=200)
    icon = models.CharField(max_length=50, default='health_and_safety', help_text="Material Icon name")
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='moderate')
    steps = models.TextField(help_text="Enter each step on a new line")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['title']
    
    def get_steps_list(self):
        return [step.strip() for step in self.steps.split('\n') if step.strip()]

class ResponderAvailabilityHistory(models.Model):
    responder = models.ForeignKey(Responder, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=20, choices=Responder.STATUS_CHOICES)
    description = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.responder.responder_id} - {self.status} at {self.timestamp}"

# Signals to track status changes
@receiver(pre_save, sender=Responder)
def store_previous_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Responder.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Responder.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=Responder)
def create_status_history(sender, instance, created, **kwargs):
    status_descriptions = {
        'available': 'Ready for new incidents',
        'unavailable': 'Not accepting new incidents',
        'on_duty': 'Responding to active incident',
        'off_duty': 'Shift ended',
    }
    
    # If created, log initial status
    if created:
        ResponderAvailabilityHistory.objects.create(
            responder=instance,
            status=instance.status,
            description=status_descriptions.get(instance.status, 'Initial status')
        )
    # If updating and status changed
    elif hasattr(instance, '_old_status') and instance.status != instance._old_status:
        ResponderAvailabilityHistory.objects.create(
            responder=instance,
            status=instance.status,
            description=status_descriptions.get(instance.status, f'Changed to {instance.get_status_display()}')
        )

class IncidentStatusHistory(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=20, choices=Incident.STATUS_CHOICES)
    notes = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.incident.incident_id} - {self.status} at {self.timestamp}"

# Signals for Incident Status History
@receiver(pre_save, sender=Incident)
def store_previous_incident_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Incident.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Incident.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=Incident)
def create_incident_history(sender, instance, created, **kwargs):
    status_descriptions = {
        'open': 'Incident reported and open',
        'en_route': 'Responder is en route',
        'on_scene': 'Responder arrived on scene',
        'providing_aid': 'Responder is providing aid',
        'transporting': 'Transporting patient to hospital',
        'resolved': 'Incident resolved',
        'closed': 'Case closed',
    }
    
    current_desc = status_descriptions.get(instance.status, f'Status updated to {instance.get_status_display()}')
    
    # Check for custom notes provided by the view
    if hasattr(instance, '_history_notes') and instance._history_notes:
        current_desc = instance._history_notes

    if created:
        IncidentStatusHistory.objects.create(
            incident=instance,
            status=instance.status,
            notes=current_desc
        )
    elif hasattr(instance, '_old_status') and instance.status != instance._old_status:
        # If we have custom notes passed via some other way, we might want to capture them, 
        # but for automatic tracking, we use standard descriptions. 
        # Manual updates with notes will be handled in the view creating the history entry explicitly if needed,
        # or we rely on this signal for simple status changes. 
        # For this requirement, we'll let the signal handle it.
        IncidentStatusHistory.objects.create(
            incident=instance,
            status=instance.status,
            notes=current_desc
        )

@receiver(pre_save, sender=Incident)
def update_resolved_at(sender, instance, **kwargs):
    if instance.status == 'resolved' and instance.resolved_at is None:
        instance.resolved_at = timezone.now()
    elif instance.status != 'resolved' and instance.resolved_at is not None:
        pass # Optional: Reset if reopened? For now, keep it simple or strictly sticky? 
             # Let's keep it simple: if it goes strictly to 'resolved' we set it. 
             # If it reopens, we might want to clear it? 
             # Standard practice: if not resolved, clear it.
        if instance.status in ['open', 'en_route', 'on_scene', 'providing_aid', 'transporting']:
             instance.resolved_at = None

class Notification(models.Model):
    TYPE_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High Priority'),
        ('medium', 'Medium Priority'),
        ('low', 'Low Priority'),
        ('info', 'Information'),
    ]
    
    CATEGORY_CHOICES = [
        ('incident', 'Incident'),
        ('system', 'System'),
        ('maintenance', 'Maintenance'),
        ('staff', 'Staff'),
        ('equipment', 'Equipment'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='system')
    related_incident = models.ForeignKey(Incident, on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type.upper()}: {self.title}"

# Signals for Notifications
@receiver(post_save, sender=Incident)
def create_incident_notification(sender, instance, created, **kwargs):
    if created:
        # Notify Facility Managers for Critical/High incidents
        if instance.severity in ['critical', 'high']:
            # Find facility managers
            facility_profiles = UserProfile.objects.filter(role='facility') 
            
            for profile in facility_profiles:
                Notification.objects.create(
                    recipient=profile.user,
                    title=f"New {instance.get_severity_display()} Incident",
                    message=f"Type: {instance.get_incident_type_display()}. Location: {instance.location}",
                    notification_type=instance.severity,
                    category='incident',
                    related_incident=instance
                )

class FirstAidGuide(models.Model):
    URGENCY_CHOICES = [
        ('moderate', 'Moderate'),
        ('urgent', 'Urgent'),
        ('critical', 'Critical (Life-Threatening)'),
    ]

    title = models.CharField(max_length=200)
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='moderate')
    icon = models.CharField(max_length=50, default='health_and_safety', help_text="Material Icons name")
    steps = models.TextField(help_text="Enter steps separated by newlines")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_guides', null=True, blank=True)

    def __str__(self):
        return self.title

    @property
    def get_steps_list(self):
        return [step.strip() for step in self.steps.split('\n') if step.strip()]

    class Meta:
        ordering = ['-created_at']
