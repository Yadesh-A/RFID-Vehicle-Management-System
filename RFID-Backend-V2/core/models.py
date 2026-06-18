from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    Standard Custom User Model with Original System Roles.
    """
    # Original Roles from your old code
    ROLE_CHOICES = (
        ('Quarter Master', 'Quarter Master'),
        ('Employee', 'Employee'),
        ('Admin', 'Admin'),
        ('Super Admin', 'Super Admin'),
    )
    
    # New Field: Original ID format (USR001)
    user_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    
    # We use 'role' instead of 'user_level' for standard naming, but map to your values
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='Quarter Master')
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Plain text password for Super Admin to view/edit (security consideration: only for internal use)
    plain_password = models.CharField(max_length=128, blank=True, null=True)

    def save(self, *args, **kwargs):
        # Auto-generate user_id like USR001 if missing
        if not self.user_id:
            last_user = User.objects.all().order_by('id').last()
            if last_user and last_user.user_id and last_user.user_id.startswith('USR'):
                try:
                    last_num = int(last_user.user_id.replace('USR', ''))
                    self.user_id = f'USR{str(last_num + 1).zfill(3)}'
                except ValueError:
                    self.user_id = 'USR001'
            else:
                self.user_id = 'USR001'

        # Set is_staff and is_superuser based on role
        if self.role == 'Super Admin':
            self.is_staff = True
            self.is_superuser = True
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user_id or 'No ID'} - {self.username} ({self.role})"
    
class DriverRank(models.Model):
    """
    Dynamic Driver Ranks (e.g., Civilian, Sergeant, Officer).
    Allows admins to manage ranks without code changes.
    """
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Driver(models.Model):
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50, unique=False, blank=True, null=True)
    rank = models.ForeignKey(DriverRank, on_delete=models.SET_NULL, null=True, blank=True, related_name='drivers', help_text="Rank of the driver")
    phone_number = models.CharField(max_length=50, blank=False, null=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Handle case where rank might be None
        rank_name = self.rank.name if self.rank else "N/A"
        return f"{self.name} ({rank_name})"
    
class VehicleUnit(models.Model):
    """
    Dynamic Vehicle Units (e.g., HQ, Logistics, Transport).
    """
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class VehicleType(models.Model):
    """
    Dynamic Vehicle Types (e.g., Car, Bike, Truck).
    Allows admins to add new types without changing code.
    """
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.name

class Vehicle(models.Model):
    STATUS_CHOICES = (
        ('IN', 'Inside'),
        ('OUT', 'Outside'),
    )

    license_plate = models.CharField(max_length=200, unique=True, db_index=True)
    
    # --- RESTORED FIELDS ---
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    unit = models.ForeignKey(VehicleUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles', help_text="Unit/Department of the vehicle")
    year = models.IntegerField(null=True, blank=True)
    
    # --- FLAGGING SYSTEM (RESTORED) ---
    flag_status = models.BooleanField(default=False, help_text="Is this vehicle flagged as suspicious?")
    flag_category = models.CharField(max_length=100, blank=True, null=True, help_text="Reason (e.g., Stolen, Expired)")
    comment = models.TextField(blank=True, null=True, help_text="Security notes")
    flagged_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='flagged_vehicles')
    # -----------------------

    make = models.CharField(max_length=200, blank=True)
    model = models.CharField(max_length=200, blank=True)
    color = models.CharField(max_length=200, blank=True)
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OUT')
    default_driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.license_plate} ({self.status})"

class RFIDTag(models.Model):
    """
    Decoupled Tag model. 
    Allows re-assigning tags without deleting vehicle history.
    """
    tag_id = models.CharField(max_length=100, unique=True, db_index=True)
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='rfid_tag')
    is_active = models.BooleanField(default=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tag: {self.tag_id} -> {self.vehicle.license_plate}"

class MovementLog(models.Model):
    ACTION_CHOICES = (
        ('ENTRY', 'Entry'),
        ('EXIT', 'Exit'),
    )
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='logs')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True)
    rfid_tag = models.ForeignKey(RFIDTag, on_delete=models.SET_NULL, null=True, blank=True)
    
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    location = models.CharField(max_length=100, default='Main Gate')
    
    is_authorized = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)

    # --- LOG FLAGGING (Snapshot of vehicle status at time of scan) ---
    flag_status = models.BooleanField(default=False)
    flag_category = models.CharField(max_length=100, blank=True, null=True)
    # ---------------------------------------------------------------

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.vehicle.license_plate} - {self.action} at {self.timestamp}"

class Notification(models.Model):
    """
    System-wide notifications (e.g., 'Blocked Vehicle Attempted Entry').
    Targeted to specific roles (e.g., only Admin and Guards).
    """
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Who sent it? (System or specific Admin)
    sender = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='sent_notifications')
    
    # Who should see it? Stores a list like ['ADMIN', 'GUARD']
    target_roles = models.JSONField(default=list) 
    
    # Who has read it? Stores a list of User IDs like [1, 5, 20]
    read_by = models.JSONField(default=list)
    
    sent_at = models.DateTimeField(auto_now_add=True)

    def mark_as_read(self, user_id):
        if user_id not in self.read_by:
            self.read_by.append(user_id)
            self.save()

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.title} ({self.sent_at})"