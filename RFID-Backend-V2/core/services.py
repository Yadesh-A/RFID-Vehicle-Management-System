from django.utils import timezone
from .models import RFIDTag, Vehicle, MovementLog, Notification, User

def process_scan(tag_id, gate_type, location='Main Gate'):
    """
    Core logic for handling RFID scans.
    1. Validates the tag and vehicle.
    2. Checks for duplicate scans (Debouncing).
    3. Enforces Anti-Passback (Can't enter if already inside).
    4. Logs the movement.
    """
    # 1. Validation
    try:
        tag = RFIDTag.objects.select_related('vehicle', 'vehicle__default_driver').get(tag_id=tag_id)
        # print(tag)
    except RFIDTag.DoesNotExist:
        return {"success": False, "error": "Unknown Tag ID", "code": 404}

    if not tag.is_active:
        return {"success": False, "error": "Tag is Inactive", "code": 403}

    vehicle = tag.vehicle
    if not vehicle.is_active:
        return {"success": False, "error": "Vehicle is Suspended", "code": 403}

    # 2. Debouncing (Duplicate Prevention)
    # If the exact same action happened < 30 seconds ago, ignore it.
    last_log = vehicle.logs.first() # Gets the most recent log
    if last_log:
        time_since_last = (timezone.now() - last_log.timestamp).total_seconds()
        if time_since_last < 30 and last_log.action == gate_type:
             return {
                 "success": False, 
                 "error": f"Duplicate Scan. Ignored. (Last scan {int(time_since_last)}s ago)",
                 "code": 429
             }

    # 3. Anti-Passback Logic
    # Ensure the vehicle isn't teleporting (Entering when already IN)
    if gate_type == 'ENTRY':
        if vehicle.status == 'IN':
            # Option: You could allow it but flag it. For strict security, we deny.
            return {"success": False, "error": "Anti-Passback Violation: Vehicle is already Inside", "code": 409}
        new_status = 'IN'
        
    elif gate_type == 'EXIT':
        if vehicle.status == 'OUT':
            return {"success": False, "error": "Anti-Passback Violation: Vehicle is already Outside", "code": 409}
        new_status = 'OUT'
        
    else:
        return {"success": False, "error": "Invalid Gate Type (Must be ENTRY or EXIT)", "code": 400}

    # SECURITY ALERT: If vehicle is flagged, notify guards!
    if vehicle.flag_status:
        # Find a system admin to be the "sender" (or just the first admin found)
        system_sender = User.objects.filter(role='ADMIN').first()
        
        Notification.objects.create(
            title=f"SECURITY ALERT: {vehicle.flag_category}",
            message=f"Flagged Vehicle {vehicle.license_plate} attempting {gate_type} at {location}. Notes: {vehicle.comment}",
            sender=system_sender if system_sender else vehicle.default_driver.user, # Fallback
            target_roles=['ADMIN', 'GUARD', 'STAFF']
        )

    # 4. Execute Transaction
    # We save the log and update the vehicle status atomically
    MovementLog.objects.create(
        vehicle=vehicle,
        rfid_tag=tag,
        driver=vehicle.default_driver,
        action=gate_type,
        location=location,
        
        # Snapshot security status
        flag_status=vehicle.flag_status,
        flag_category=vehicle.flag_category,
        notes=vehicle.comment if vehicle.flag_status else ""
    )
    
    vehicle.status = new_status
    vehicle.save()
    
    response_data = {
        "success": True, 
        "vehicle": vehicle.license_plate,
        "driver": vehicle.default_driver.name if vehicle.default_driver else "Unknown",
        "status": new_status,
        "timestamp": timezone.now()
    }

    # Add warning if flagged
    if vehicle.flag_status:
        response_data["warning"] = f"VEHICLE FLAGGED: {vehicle.flag_category}"
    
    return response_data