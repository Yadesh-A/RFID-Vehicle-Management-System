from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db import transaction
# ... existing imports ...
from .models import Driver, Vehicle, RFIDTag, MovementLog, VehicleType, Notification, DriverRank, VehicleUnit

class DriverRankSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverRank
        fields = '__all__'

class DriverSerializer(serializers.ModelSerializer):
    driver_rank = serializers.CharField(source='rank.name', read_only=True, default='N/A')
    vehicle_number = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Driver
        fields = '__all__'
    
    def get_vehicle_number(self, obj):
        """
        Get the license plate of the vehicle assigned to this driver.
        Uses reverse lookup from Vehicle model's default_driver field.
        """
        try:
            vehicle = obj.vehicles.first()  # Get the first vehicle where this driver is default_driver
            return vehicle.license_plate if vehicle else 'N/A'
        except Exception:
            return 'N/A'

class VehicleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleType
        fields = '__all__'

class VehicleUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleUnit
        fields = '__all__'

# class VehicleSerializer(serializers.ModelSerializer):
#     driver_name = serializers.CharField(source='default_driver.name', read_only=True)
#     vehicle_type_name = serializers.CharField(source='vehicle_type.name', read_only=True)
#     flagged_by_name = serializers.CharField(source='flagged_by.username', read_only=True) # Show who flagged it
#     unit_name = serializers.CharField(source='unit.name', read_only=True)

#     # This allows the frontend to send "tag_id": "XYZ" when creating/updating
#     tag_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
#     # Read-only field to show the current tag in the response
#     current_tag_id = serializers.CharField(source='rfid_tag.tag_id', read_only=True)
    
#     class Meta:
#         model = Vehicle
#         # Explicitly list fields or use __all__
#         fields = [
#             'id', 'license_plate', 'vehicle_type', 'vehicle_type_name',
#             'tag_id', 'current_tag_id',
#             'unit', 'unit_name', 'year', 'make', 'model', 'color', 
#             'status', 'default_driver', 'driver_name',
#             'flag_status', 'flag_category', 'comment', 'flagged_by', 'flagged_by_name',
#             'is_active', 'created_at'
#         ]
class VehicleSerializer(serializers.ModelSerializer):
    # keep existing flat fields
    vehicle_type_name = serializers.CharField(source='vehicle_type.name', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    flagged_by_name = serializers.CharField(source='flagged_by.username', read_only=True)

    # Virtual field for Tag ID (from previous step)
    tag_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    current_tag_id = serializers.CharField(source='rfid_tag.tag_id', read_only=True)

    # --- NEW: Nested Driver Details ---
    # This will use your DriverSerializer to show the full object (Name, Rank, Phone, etc.)
    driver = DriverSerializer(source='default_driver', read_only=True)
    # ----------------------------------

    # Additional fields for frontend compatibility
    vehicle_number = serializers.CharField(source='license_plate', read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'license_plate', 'vehicle_number',
            'tag_id', 'current_tag_id',
            'vehicle_type', 'vehicle_type_name',
            'unit', 'unit_name',
            'year', 'make', 'model', 'color',
            'status',
            'default_driver', # Keeps ID for updating (e.g., set driver=5)
            'driver',         # Returns FULL object for reading
            'flag_status', 'flag_category', 'comment', 'flagged_by', 'flagged_by_name',
            'is_active', 'created_at'
        ]
          
    def create(self, validated_data):
        # 1. Pop the tag_id so it doesn't break the Vehicle creation
        tag_id = validated_data.pop('tag_id', None)
        
        # 2. Create the Vehicle
        with transaction.atomic(): # Ensure both save or neither
            vehicle = super().create(validated_data)
            
            # 3. If tag_id was provided, create/assign the RFIDTag
            if tag_id:
                # Deactivate any old tag with this ID (optional safety)
                RFIDTag.objects.filter(tag_id=tag_id).update(is_active=False)
                
                # Create the new tag link
                RFIDTag.objects.create(tag_id=tag_id, vehicle=vehicle, is_active=True)
                
        return vehicle

    def update(self, instance, validated_data):
        # 1. Pop tag_id
        tag_id = validated_data.pop('tag_id', None)
        
        # 2. Update Vehicle details
        with transaction.atomic():
            vehicle = super().update(instance, validated_data)
            
            # 3. Handle Tag Update
            if tag_id is not None: 
                # If tag_id is empty string "", remove the tag
                if tag_id == "":
                    if hasattr(vehicle, 'rfid_tag'):
                        vehicle.rfid_tag.delete() # Or set is_active=False
                
                # If tag_id has a value, update or create
                else:
                    # Check if this tag is already assigned to THIS vehicle
                    if hasattr(vehicle, 'rfid_tag') and vehicle.rfid_tag.tag_id == tag_id:
                        pass # No change needed
                    else:
                        # Delete old tag for this vehicle
                        if hasattr(vehicle, 'rfid_tag'):
                            vehicle.rfid_tag.delete()
                        
                        # Check if tag is taken by ANOTHER vehicle
                        if RFIDTag.objects.filter(tag_id=tag_id).exists():
                            raise serializers.ValidationError({"tag_id": "This Tag ID is already in use by another vehicle."})

                        # Assign new tag
                        RFIDTag.objects.create(tag_id=tag_id, vehicle=vehicle, is_active=True)
                        
        return vehicle

class RFIDTagSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.license_plate', read_only=True)
    
    class Meta:
        model = RFIDTag
        fields = '__all__'

class MovementLogSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.license_plate', read_only=True)
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    driver_phone = serializers.CharField(source='driver.phone_number', read_only=True)
    unit = serializers.CharField(source='vehicle.unit.name', read_only=True)
    rank = serializers.CharField(source='driver.rank.name', read_only=True)
    
    class Meta:
        model = MovementLog
        fields = '__all__'

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Standard serializer for User model.
    Used for reading user data.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'first_name', 'last_name')

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for User Registration.
    Ensures password is hashed and role is set.
    """
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'role', 'first_name', 'last_name')

    def create(self, validated_data):
        # This securely hashes the password using standard Django hashing
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            role=validated_data.get('role', 'STAFF'),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user
# ... existing imports ...

class UserManagementSerializer(serializers.ModelSerializer):
    """
    Serializer for Admins to Manage Users (Create/Update/Delete).
    Handles password hashing automatically.
    """
    password = serializers.CharField(write_only=True, required=False) # Optional on update
    plain_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'user_id', 'username', 'email', 'role', 'phone_number', 'password', 'plain_password', 'is_active', 'date_joined']
        read_only_fields = ['user_id', 'date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.plain_password = password  # Store plain password for Super Admin
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.plain_password = password  # Update plain password for Super Admin
            user.save()
        return user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer.
    1. Adds 'role' inside the encrypted token (for Frontend security).
    2. Adds 'role', 'user_id', 'username' to the JSON response (for easy access).
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims to the encrypted token
        token['username'] = user.username
        token['level'] = user.role
        token['name'] = f"{user.first_name} {user.last_name}".strip()
        token['display_id'] = user.user_id
        
        return token

    def validate(self, attrs):
        # standard validation (checks password)
        data = super().validate(attrs)

        # Add extra fields to the JSON response body
        data['level'] = self.user.role
        data['user_id'] = self.user.user_id
        data['username'] = self.user.username
        data['name'] = self.user.first_name + " " + self.user.last_name
        # You can add the User PK (primary key) if needed
        data['id'] = self.user.id 

        return data

class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'sender', 'sender_name', 'target_roles', 'sent_at', 'is_read']
        read_only_fields = ['sender', 'sent_at']

    def get_is_read(self, obj):
        # Checks if the current request user is in the 'read_by' list
        user = self.context['request'].user
        if user.is_authenticated:
            return user.id in obj.read_by
        return False


# core/serializers.py

class VisitReportSerializer(serializers.ModelSerializer):
    # Flattened Fields (same as before)
    license_plate = serializers.CharField(source='vehicle.license_plate', read_only=True)
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    driver_phone = serializers.CharField(source='driver.phone_number', read_only=True)
    unit = serializers.CharField(source='vehicle.unit.name', read_only=True)
    rank = serializers.CharField(source='driver.rank.name', read_only=True)
    
    # Time Fields
    entry_time = serializers.DateTimeField(source='timestamp', read_only=True)
    exit_time = serializers.DateTimeField(read_only=True) # This will come from our custom query
    
    # Snapshot of security status at Entry
    flag_status = serializers.BooleanField(read_only=True)
    
    # Add vehicle and driver IDs for frontend navigation
    vehicle = serializers.IntegerField(source='vehicle.id', read_only=True)
    driver = serializers.IntegerField(source='driver.id', read_only=True)

    class Meta:
        model = MovementLog
        fields = [
            'id', 
            'vehicle',  # Added vehicle ID
            'driver',   # Added driver ID
            'license_plate', 
            'driver_name',
            'driver_phone',  # Added phone number
            'unit', 
            'rank', 
            'entry_time', 
            'exit_time', 
            'flag_status',
            'location'
        ]
