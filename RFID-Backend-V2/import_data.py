import os
import sys
import django
import pandas as pd

from django.db import connection

# =============================================================================
# DJANGO SETUP
# =============================================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import (
    Driver,
    Vehicle,
    VehicleType,
    VehicleUnit,
)

# =============================================================================
# CONFIG
# =============================================================================

EXCEL_PATH = os.path.join(
    BASE_DIR,
    "django_vehicle",
    "data",
    "vehicle_data.xlsx"
)

# =============================================================================
# UTILITIES
# =============================================================================

def banner(title):
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)

def step(num, title):
    banner(f"STEP {num}: {title}")

def clean_phone(value, max_length=20):
    if value is None or pd.isna(value):
        return ""

    phone = str(value).strip()
    for ch in [" ", "-", ",", "/", "\\"]:
        phone = phone.replace(ch, "")

    return phone[:max_length]

# =============================================================================
# STEP 1: CLEAR DATABASE (KEEP USERS)
# =============================================================================

def clear_database():
    step(1, "CLEARING DATABASE (KEEPING USERS)")

    Vehicle.objects.all().delete()
    Driver.objects.all().delete()
    VehicleType.objects.all().delete()
    VehicleUnit.objects.all().delete()

    print("✅ Database cleared (users preserved)")

# =============================================================================
# STEP 2: RESET SEQUENCES
# =============================================================================

def reset_sequences():
    step(2, "RESETTING SEQUENCES (AUTO-DETECTED)")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT sequence_name
            FROM information_schema.sequences
            WHERE sequence_schema = 'public'
        """)
        sequences = cursor.fetchall()

        for (seq,) in sequences:
            try:
                cursor.execute(f'ALTER SEQUENCE "{seq}" RESTART WITH 1;')
            except Exception:
                pass

# =============================================================================
# STEP 3: IMPORT DRIVERS + MAP VEHICLES
# =============================================================================

def import_drivers():
    step(3, "IMPORTING DRIVERS FROM EXCEL")

    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"Excel file not found: {EXCEL_PATH}")

    df = pd.read_excel(EXCEL_PATH)

    required_columns = ["Name", "PNO", "MOBILENO", "VECHICLENO"]
    for col in required_columns:
        if col not in df.columns:
            raise Exception(f"Missing required column: {col}")

    if "UNIT" not in df.columns:
        df["UNIT"] = ""

    driver_vehicle_map = {}
    created = reused = 0

    for _, row in df.iterrows():
        employee_id = str(row["PNO"]).strip()

        driver, is_created = Driver.objects.get_or_create(
            employee_id=employee_id,
            defaults={
                "name": str(row["Name"]).strip(),
                "phone_number": clean_phone(row["MOBILENO"]),
            }
        )

        created += int(is_created)
        reused += int(not is_created)

        plate = str(row["VECHICLENO"]).strip()
        unit_name = str(row["UNIT"]).strip()

        if plate:
            driver_vehicle_map.setdefault(driver.id, []).append({
                "plate": plate,
                "unit_name": unit_name,
            })

    print(f"✅ Drivers created: {created}")
    print(f"♻️ Drivers reused: {reused}")
    print(f"🚗 Vehicle rows processed: {sum(len(v) for v in driver_vehicle_map.values())}")

    return driver_vehicle_map

# =============================================================================
# STEP 4: CREATE VEHICLES (FIXED)
# =============================================================================

def create_vehicles(driver_vehicle_map):
    step(4, "CREATING VEHICLES")

    vehicle_type, _ = VehicleType.objects.get_or_create(
        name="Unknown",
        defaults={"description": "Imported from Excel"}
    )

    created = 0

    for driver_id, vehicles in driver_vehicle_map.items():
        driver = Driver.objects.get(id=driver_id)

        for data in vehicles:
            unit = None

            if data["unit_name"]:
                unit, _ = VehicleUnit.objects.get_or_create(
                    name=data["unit_name"]
                )

            Vehicle.objects.get_or_create(
                license_plate=data["plate"],
                defaults={
                    "default_driver": driver,
                    "vehicle_type": vehicle_type,
                    "unit": unit,
                    "status": "OUT",
                }
            )
            created += 1

    print(f"✅ Vehicles created/linked: {created}")

# =============================================================================
# MAIN
# =============================================================================

def main():
    banner("FRESH IMPORT + MULTI-VEHICLE FIX (NEW MODELS, FK SAFE)")

    clear_database()
    reset_sequences()
    mapping = import_drivers()
    create_vehicles(mapping)

    banner("IMPORT COMPLETED SUCCESSFULLY")

if __name__ == "__main__":
    main()
