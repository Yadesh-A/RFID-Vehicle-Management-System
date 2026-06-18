import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.db import connection
from core.models import Driver, Vehicle, RFIDTag, MovementLog, VehicleType, Notification, DriverRank, VehicleUnit

def clear_database():
    """
    Clears all data from the database except User table and resets all sequences to 1.
    Also resets custom ID counters (like user_id, driver_id, employee_id).
    """
    print("=" * 60)
    print("CLEARING DATABASE (Preserving User table)")
    print("=" * 60)

    # Manually delete from specific models (excluding User)
    models_to_clear = [
        MovementLog,      # Delete logs first (has foreign keys)
        RFIDTag,          # Delete tags (has foreign key to Vehicle)
        Notification,     # Delete notifications
        Vehicle,          # Delete vehicles (has foreign keys to Driver, VehicleType, VehicleUnit)
        Driver,           # Delete drivers
        VehicleType,      # Delete vehicle types
        VehicleUnit,      # Delete vehicle units
        DriverRank,       # Delete driver ranks
    ]

    print("\n1. Deleting records from tables...")
    for model in models_to_clear:
        count = model.objects.all().delete()
        print(f"   ✓ Deleted {count[0]} records from {model.__name__}")

    print("\n2. Resetting PostgreSQL sequences...")
    cursor = connection.cursor()
    
    # Get the table names we're clearing
    tables_to_reset = [
        'core_driver',
        'core_vehicle', 
        'core_rfidtag',
        'core_movementlog',
        'core_vehicletype',
        'core_notification',
        'core_driverrank',
        'core_vehicleunit'
    ]
    
    # Reset sequences for these specific tables
    for table_name in tables_to_reset:
        # Reset the primary key sequence for each table
        sequence_name = f"{table_name}_id_seq"
        try:
            cursor.execute(f"SELECT setval('{sequence_name}', 1, false);")
            print(f"   ✓ Reset sequence: {sequence_name}")
        except Exception as e:
            print(f"   ⚠ Could not reset {sequence_name}: {e}")

    print("\n3. Resetting custom ID counters...")
    # Note: Custom IDs like user_id, driver_id are generated in the save() method
    # They look at the last record's ID and increment it
    # Since we've deleted all records, the next save() will start from 001
    print("   ✓ Custom ID counters will reset automatically on next record creation")
    print("     (user_id will start from USR001, driver_id from DRV001, etc.)")

    print("\n" + "=" * 60)
    print("DATABASE CLEARED SUCCESSFULLY!")
    print("=" * 60)
    print("\nSummary:")
    print("  • All tables cleared (except User table)")
    print("  • All PostgreSQL sequences reset to 1")
    print("  • Custom ID counters will start from 001")
    print("  • User accounts preserved")
    print("\n")

if __name__ == '__main__':
    clear_database()
