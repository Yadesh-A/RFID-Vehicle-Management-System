from django.shortcuts import render, get_object_or_404
from rest_framework import generics, permissions, viewsets, status, filters
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, MyTokenObtainPairSerializer, VisitReportSerializer
# ... existing imports ...
from django.db.models import Count, Q, Subquery, OuterRef
from django.utils import timezone
from .models import Driver, Vehicle, RFIDTag, MovementLog, VehicleType, Notification, DriverRank, VehicleUnit, User
from .serializers import (
    DriverSerializer, VehicleSerializer, 
    RFIDTagSerializer, MovementLogSerializer, 
    VehicleTypeSerializer, NotificationSerializer,
    DriverRankSerializer, VehicleUnitSerializer,
    UserManagementSerializer, 
)
from rest_framework.views import APIView
from rest_framework.response import Response
from .services import process_scan
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action, api_view, permission_classes
import pandas as pd

User = get_user_model()

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsSuperAdmin

@api_view(['POST'])
@permission_classes([AllowAny]) # Change to IsAuthenticated if the reader sends a token
def scan_rfid(request):
    """
    Endpoint for RFID Reader Hardware.
    Payload: { "tag_id": "XYZ123", "gate_id": "ENTRY_GATE_01" }
    """
    tag_id = request.data.get('tag_id')
    gate = request.data.get('gate_id', 'Main Gate') # Default if missing
    action = request.data.get('action')  # Optional: 'ENTRY' or 'EXIT'
    
    # Simple logic to determine Entry vs Exit based on Gate ID
    # You can adjust this logic or send "action" in the payload
    # action = 'ENTRY' if 'ENTRY' in gate.upper() else 'EXIT'
    
    if not tag_id:
        return Response({'error': 'Tag ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Call the service logic
        result = process_scan(tag_id, action, location=gate)
        # print(result)
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminChangePasswordView(APIView):
    """
    Allows Super Admin to force-change another user's password.
    Requires Super Admin to verify THEIR OWN password first.
    """
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        # 1. Get the target user (the one getting a new password)
        target_user = get_object_or_404(User, pk=pk)
        
        # 2. Get inputs
        admin_password = request.data.get('admin_password')
        new_password = request.data.get('new_password')
        
        if not admin_password or not new_password:
            return Response({'error': 'Both admin_password and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Verify the Super Admin's credentials
        # request.user is the currently logged-in Super Admin
        if not request.user.check_password(admin_password):
            return Response({'error': 'Invalid Admin Password. Authorization failed.'}, status=status.HTTP_403_FORBIDDEN)

        # 4. Change the target user's password
        target_user.set_password(new_password)
        target_user.save()

        return Response({
            'status': 'success',
            'message': f'Password for user {target_user.username} has been changed.'
        })

class UserViewSet(viewsets.ModelViewSet):
    """
    API for User Management (CRUD).
    Only accessible by Admins/Super Admins (Recommended).
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserManagementSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    
    # Allow filtering by Role (e.g., ?role=Guard)
    filterset_fields = ['role', 'is_active', 'user_id']
    
    # Allow searching by Name/ID
    search_fields = ['username', 'user_id', 'email', 'phone_number']

    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'change_password':
            # Allow any authenticated user to change password
            permission_classes = [IsAuthenticated]
        elif self.action in ['list', 'retrieve']:
            # Allow any authenticated user to list and retrieve users
            permission_classes = [IsAuthenticated]
        else:
            # Only Super Admins can create, update, or delete users
            permission_classes = [IsAuthenticated, IsSuperAdmin]
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['patch'], url_path='change-password', permission_classes=[])
    def change_password(self, request, pk=None):
        """
        Allow any authenticated user to change their own password.
        PATCH /api/users/{id}/change-password/
        Body: { "password": "new_password" }
        """
        # Check authentication manually
        if not request.user or not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = self.get_object()
        
        # Users can only change their own password (unless they're Super Admin)
        if request.user.id != user.id and request.user.role != 'Super Admin':
            return Response(
                {'error': 'You can only change your own password'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_password = request.data.get('password')
        if not new_password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user.set_password(new_password)
        user.plain_password = new_password  # Also update plain_password
        user.save()
        
        return Response({
            'status': 'success',
            'message': 'Password updated successfully'
        })

class DriverRankViewSet(viewsets.ModelViewSet):
    queryset = DriverRank.objects.all().order_by('name')
    serializer_class = DriverRankSerializer
    pagination_class = None  # <--- DISABLE PAGINATION

# Update your ViewSets to include DjangoFilterBackend and filterset_fields
class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by('-created_at')
    serializer_class = DriverSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    # Allow exact match filtering on these fields
    filterset_fields = ['name', 'employee_id', 'phone_number', 'is_active', 'rank']
    search_fields = ['name', 'employee_id', 'phone_number', 'rank__name'] # Partial text search

class VehicleUnitViewSet(viewsets.ModelViewSet):
    queryset = VehicleUnit.objects.all().order_by('name')
    serializer_class = VehicleUnitSerializer
    pagination_class = None  # <--- DISABLE PAGINATION

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('-created_at')
    serializer_class = VehicleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    
    # Enable filtering by new fields
    filterset_fields = [
        'license_plate', 'make', 'model', 'color', 'status',
        'unit', 'year', 'flag_status', 'flag_category', 'vehicle_type', 'default_driver'
    ]

    search_fields = ['license_plate', 'make', 'model', 'unit__name', 'flag_category', 'default_driver__name', 'default_driver__employee_id', 'default_driver__phone_number', 'rfid_tag__tag_id', 'comment', 'default_driver__rank__name']

    @action(detail=False, methods=['get'], url_path='flagged')
    def flagged(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(flag_status=True))

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class VehicleTypeViewSet(viewsets.ModelViewSet):
    queryset = VehicleType.objects.all().order_by('name')
    serializer_class = VehicleTypeSerializer
    pagination_class = None  # <--- DISABLE PAGINATION


class VehicleImportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _normalize_header(self, value):
        return ''.join(str(value).strip().lower().replace('_', ' ').replace('-', ' ').split())

    def _build_header_alias_map(self, columns):
        normalized_to_original = {self._normalize_header(col): col for col in columns}

        aliases = {
            'driver_name': ['drivername', 'name', 'driver', 'driverfullname'],
            'driver_rank': ['driverrank', 'rank'],
            'driver_phone_number': ['driverphonenumber', 'phonenumber', 'mobileno', 'mobilenumber', 'phone', 'pno', 'mobilenumber1', 'phone1', 'contactnumber', 'contactno', 'mobile'],
            'employee_id': ['employeeid', 'empid', 'employeecode'],
            'license_plate': ['vehiclenumber', 'vehicleno', 'vechicleno', 'licenseplate', 'vehicle'],
            'unit': ['unit'],
            'vehicle_type': ['vehicletype', 'type'],
            'color': ['color', 'colour'],
            'make': ['make', 'brand'],
            'model': ['model'],
            'year': ['year'],
        }

        # Fallback: if driver phone header not found but MOBILENO exists, use it
        # (your sample file has both PNO and MOBILENO; this ensures no false negative)
        normalized_cols = {self._normalize_header(col): col for col in columns}

        mapped = {}
        for internal_name, keys in aliases.items():
            for key in keys:
                normalized_key = self._normalize_header(key)
                if normalized_key in normalized_to_original:
                    mapped[internal_name] = normalized_to_original[normalized_key]
                    break

        if 'driver_phone_number' not in mapped:
            if 'mobileno' in normalized_cols:
                mapped['driver_phone_number'] = normalized_cols['mobileno']
            elif 'pno' in normalized_cols:
                mapped['driver_phone_number'] = normalized_cols['pno']

        return mapped

    def post(self, request):
        upload_file = request.FILES.get('file')
        if not upload_file:
            return Response({'detail': 'Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        filename = upload_file.name.lower()
        if not (filename.endswith('.xlsx') or filename.endswith('.xls')):
            return Response({'detail': 'Only .xlsx or .xls files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(upload_file)
        except Exception as exc:
            return Response({'detail': f'Unable to read Excel file: {str(exc)}'}, status=status.HTTP_400_BAD_REQUEST)

        if df.empty:
            return Response({'detail': 'Excel file is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        mapped_headers = self._build_header_alias_map(df.columns)

        required_fields = ['driver_name', 'driver_phone_number', 'license_plate']
        missing_required = [field for field in required_fields if field not in mapped_headers]

        # Last-resort inferencing for noisy/merged headers from user Excel exports
        if 'driver_name' in missing_required:
            for col in df.columns:
                col_lower = str(col).strip().lower()
                if 'name' in col_lower and 'unit' not in col_lower:
                    mapped_headers['driver_name'] = col
                    break

        if 'driver_phone_number' in missing_required:
            for col in df.columns:
                col_lower = str(col).strip().lower()
                if any(k in col_lower for k in ['phone', 'mobile', 'pno', 'contact']):
                    mapped_headers['driver_phone_number'] = col
                    break

        if 'license_plate' in missing_required:
            for col in df.columns:
                col_lower = str(col).strip().lower().replace(' ', '')
                if any(k in col_lower for k in ['vehicle', 'plate', 'vehicleno', 'vechicleno', 'licence', 'license']):
                    mapped_headers['license_plate'] = col
                    break

        missing_required = [field for field in required_fields if field not in mapped_headers]
        if missing_required:
            return Response(
                {
                    'detail': 'Invalid template. Missing required columns.',
                    'missing_columns': missing_required,
                    'required_columns_info': {
                        'driver_name': ['Driver Name', 'Name'],
                        'driver_phone_number': ['Driver Phone Number', 'MobileNo', 'PNo', 'MOBILENO', 'PNO'],
                        'license_plate': ['Vehicle Number', 'VehicleNo', 'VechicleNo', 'License Plate', 'VECHICLENO'],
                    },
                    'detected_columns': [str(c) for c in df.columns],
                    'normalized_detected_columns': [self._normalize_header(c) for c in df.columns],
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        created_count = 0
        skipped_count = 0
        duplicate_count = 0
        failed_count = 0
        errors = []

        for index, row in df.iterrows():
            row_number = int(index) + 2

            try:
                data = {
                    'driver_name': '',
                    'driver_rank': '',
                    'driver_phone_number': '',
                    'employee_id': '',
                    'license_plate': '',
                    'unit': '',
                    'vehicle_type': '',
                    'color': '',
                    'make': '',
                    'model': '',
                    'year': '',
                }

                for internal_name, original_col in mapped_headers.items():
                    cell_value = row.get(original_col, '')
                    if pd.isna(cell_value):
                        cell_value = ''
                    data[internal_name] = str(cell_value).strip()

                uppercase_fields = [
                    'driver_name', 'driver_rank', 'driver_phone_number',
                    'employee_id', 'license_plate', 'unit',
                    'vehicle_type', 'color', 'make', 'model'
                ]
                for field in uppercase_fields:
                    if data.get(field):
                        data[field] = data[field].upper()

                if not data['license_plate']:
                    skipped_count += 1
                    errors.append({'row': row_number, 'message': 'Vehicle Number is required.'})
                    continue

                if not data['driver_name']:
                    skipped_count += 1
                    errors.append({'row': row_number, 'message': 'Driver Name is required.'})
                    continue

                if not data['driver_phone_number']:
                    skipped_count += 1
                    errors.append({'row': row_number, 'message': 'Driver Phone Number is required.'})
                    continue

                license_plate = data['license_plate'].replace(' ', '')
                if Vehicle.objects.filter(license_plate__iexact=license_plate).exists():
                    skipped_count += 1
                    duplicate_count += 1
                    errors.append({'row': row_number, 'message': f'Vehicle "{data["license_plate"]}" already exists.'})
                    continue

                rank_obj = None
                if data['driver_rank']:
                    rank_obj, _ = DriverRank.objects.get_or_create(name=data['driver_rank'])

                driver_obj = None
                if data['driver_name']:
                    if data['employee_id']:
                        driver_obj = Driver.objects.filter(employee_id=data['employee_id']).first()

                    if not driver_obj:
                        driver_query = Driver.objects.filter(name__iexact=data['driver_name'])
                        if data['driver_phone_number']:
                            driver_query = driver_query.filter(phone_number=data['driver_phone_number'])
                        driver_obj = driver_query.first()

                    if not driver_obj:
                        driver_payload = {
                            'name': data['driver_name'],
                            'phone_number': data['driver_phone_number'] or '0000000000',
                            'rank': rank_obj,
                            'employee_id': data['employee_id'] or None,
                        }
                        driver_obj = Driver.objects.create(**driver_payload)

                unit_obj = None
                if data['unit']:
                    unit_name = data['unit'].strip()
                    unit_obj = VehicleUnit.objects.filter(name__iexact=unit_name).first()
                    if not unit_obj:
                        unit_obj = VehicleUnit.objects.create(name=unit_name)

                vehicle_type_obj = None
                if data['vehicle_type']:
                    vehicle_type_obj, _ = VehicleType.objects.get_or_create(name=data['vehicle_type'])

                parsed_year = None
                if data['year']:
                    try:
                        parsed_year = int(float(data['year']))
                    except Exception:
                        parsed_year = None

                Vehicle.objects.create(
                    license_plate=license_plate,
                    unit=unit_obj,
                    vehicle_type=vehicle_type_obj,
                    color=data['color'] or '',
                    make=data['make'] or '',
                    model=data['model'] or '',
                    year=parsed_year if parsed_year else timezone.now().year,
                    default_driver=driver_obj,
                    status='OUT',
                    is_active=True,
                )
                created_count += 1

            except Exception as exc:
                skipped_count += 1
                failed_count += 1
                errors.append({'row': row_number, 'message': str(exc)})

        return Response(
            {
                'message': 'Import completed.',
                'total_rows': int(len(df)),
                'created': created_count,
                'imported_count': created_count,
                'skipped': skipped_count,
                'duplicate_count': duplicate_count,
                'failed_count': failed_count,
                'errors': errors[:100],
            },
            status=status.HTTP_200_OK
        )


class RFIDTagViewSet(viewsets.ModelViewSet):
    queryset = RFIDTag.objects.all().order_by('-issued_at')
    serializer_class = RFIDTagSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['tag_id', 'is_active', 'vehicle__license_plate']
    search_fields = ['tag_id']

class MovementLogViewSet(viewsets.ModelViewSet):
    queryset = MovementLog.objects.all().order_by('-timestamp')
    serializer_class = MovementLogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['action', 'location', 'vehicle__license_plate', 'driver__name', 'is_authorized']
    search_fields = ['vehicle__license_plate', 'driver__name']
    
    def create(self, request, *args, **kwargs):
        """
        Override create to handle custom timestamps for manual log entries.
        Accepts 'entry_time' or 'exit_time' and maps to 'timestamp'.
        Converts from IST (Asia/Kolkata) to UTC for storage.
        """
        from django.utils.dateparse import parse_datetime
        import pytz
        from datetime import datetime
        
        data = request.data.copy()
        custom_timestamp = None
        
        # Map entry_time or exit_time to timestamp based on action
        if 'entry_time' in data and data.get('action') == 'ENTRY':
            custom_timestamp = data.pop('entry_time')
        elif 'exit_time' in data and data.get('action') == 'EXIT':
            custom_timestamp = data.pop('exit_time')
        
        # Create the log with custom timestamp
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # If custom timestamp provided, use raw SQL to bypass auto_now_add
        if custom_timestamp:
            from django.db import connection
            
            vehicle_id = serializer.validated_data['vehicle'].id
            driver_id = serializer.validated_data.get('driver').id if serializer.validated_data.get('driver') else None
            rfid_tag_id = serializer.validated_data.get('rfid_tag').id if serializer.validated_data.get('rfid_tag') else None
            action = serializer.validated_data['action']
            location = serializer.validated_data.get('location', 'Main Gate')
            is_authorized = serializer.validated_data.get('is_authorized', True)
            notes = serializer.validated_data.get('notes', '')
            flag_status = serializer.validated_data.get('flag_status', False)
            flag_category = serializer.validated_data.get('flag_category', '')
            
            # Parse the timestamp
            if isinstance(custom_timestamp, str):
                timestamp = parse_datetime(custom_timestamp)
            else:
                timestamp = custom_timestamp
            
            # Convert from IST to UTC
            # The datetime-local input sends naive datetime (no timezone info)
            # We need to treat it as IST and convert to UTC
            if timestamp and timezone.is_naive(timestamp):
                # Assume the input is in IST (Asia/Kolkata)
                ist = pytz.timezone('Asia/Kolkata')
                timestamp = ist.localize(timestamp)
                # Convert to UTC
                timestamp = timestamp.astimezone(pytz.UTC)
            
            # Insert with custom timestamp using raw SQL
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO core_movementlog 
                    (vehicle_id, driver_id, rfid_tag_id, action, timestamp, location, is_authorized, notes, flag_status, flag_category)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, [vehicle_id, driver_id, rfid_tag_id, action, timestamp, location, is_authorized, notes, flag_status, flag_category])
                log_id = cursor.fetchone()[0]
            
            # Fetch the created log
            log = MovementLog.objects.get(id=log_id)
        else:
            # Use normal save for auto timestamp
            log = MovementLog.objects.create(
                vehicle=serializer.validated_data['vehicle'],
                driver=serializer.validated_data.get('driver'),
                rfid_tag=serializer.validated_data.get('rfid_tag'),
                action=serializer.validated_data['action'],
                location=serializer.validated_data.get('location', 'Main Gate'),
                is_authorized=serializer.validated_data.get('is_authorized', True),
                notes=serializer.validated_data.get('notes', ''),
                flag_status=serializer.validated_data.get('flag_status', False),
                flag_category=serializer.validated_data.get('flag_category', '')
            )
        
        # Update vehicle status
        if log.action == 'ENTRY':
            log.vehicle.status = 'IN'
            log.vehicle.save()
        elif log.action == 'EXIT':
            log.vehicle.status = 'OUT'
            log.vehicle.save()
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            MovementLogSerializer(log).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

# 2. Custom Dashboard API
class DashboardStatsView(APIView):
    """
    Returns high-level statistics for the dashboard.
    """
    def get(self, request):
        today = timezone.now().date()

        # Aggregate vehicle types
        vehicle_type_data = Vehicle.objects.values('vehicle_type__name').annotate(
            value=Count('id')
        ).filter(vehicle_type__name__isnull=False).order_by('-value')

        # Format as list of dicts
        vehicle_type_list = [
            {'name': item['vehicle_type__name'], 'value': item['value']}
            for item in vehicle_type_data
        ]

        # Get recent 5 entries/exits (most recent first)
        recent_logs = MovementLog.objects.select_related(
            'vehicle', 'driver'
        ).order_by('-timestamp')[:5]
        
        recent_entries = []
        for log in recent_logs:
            recent_entries.append({
                'id': log.id,
                'vehicleId': log.vehicle.id,
                'licensePlate': log.vehicle.license_plate,
                'driverName': log.driver.name if log.driver else 'N/A',
                'type': 'entry' if log.action == 'ENTRY' else 'exit',
                'timestamp': log.timestamp.isoformat(),
                'location': log.location
            })

        stats = {
            "total_vehicles": Vehicle.objects.count(),
            "vehicles_inside": Vehicle.objects.filter(status='IN').count(),
            "active_tags": RFIDTag.objects.filter(is_active=True).count(),
            "today_entries": MovementLog.objects.filter(
                action='ENTRY',
                timestamp__date=today
            ).count(),
            "vehicle_type_data": vehicle_type_list,
            "recent_entries": recent_entries
        }
        return Response(stats)

# 1. Custom Login View (uses our custom serializer)
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# 2. Registration View
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,) # Allow anyone to register (for now)
    serializer_class = RegisterSerializer

class RFIDScanView(APIView):
    """
    Hardware Reader Endpoint.
    Receives JSON: { "tag_id": "XYZ123", "gate": "ENTRY" }
    """
    # NOTE: In production, you might want to use a static API Key for hardware 
    # if it cannot handle JWT Refresh tokens. For now, we allow authenticated users.
    permission_classes = [permissions.AllowAny] # Uncomment for testing without token
    
    def post(self, request):
        tag_id = request.data.get('tag_id')
        gate = request.data.get('gate') # Expects 'ENTRY' or 'EXIT'
        location = request.data.get('location', 'Main Gate')

        if not tag_id or not gate:
            return Response(
                {"error": "Missing tag_id or gate parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Call the Service Layer
        result = process_scan(tag_id, gate.upper(), location)

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=result.get('code', 400))

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        """
        Users see notifications if:
        1. They are the sender.
        2. Their role is in 'target_roles'.
        """
        user = self.request.user
        if not user.is_authenticated:
            return Notification.objects.none()
            
        return Notification.objects.filter(
            Q(sender=user) | 
            Q(target_roles__contains=user.role)
        ).order_by('-sent_at')

    def perform_create(self, serializer):
        # Auto-set the sender to the current user
        serializer.save(sender=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Endpoint to mark a specific notification as read by the current user.
        POST /api/notifications/{id}/mark_read/
        """
        notification = self.get_object()
        notification.mark_as_read(request.user.id)
        return Response({'status': 'marked as read'})

class VisitReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lists 'Visits' instead of raw logs.
    Each row represents a full session (Entry -> Exit).
    """
    serializer_class = VisitReportSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['vehicle__license_plate', 'driver__name', 'vehicle__unit__name']
    filterset_fields = ['vehicle__license_plate', 'driver__name', 'driver', 'vehicle', 'flag_status']

    def get_queryset(self):
        # Simplified and corrected subquery to find the IMMEDIATE next exit
        # This finds the next EXIT that:
        # - Is for the same vehicle AND driver
        # - Occurs after this entry's timestamp
        # - Is the FIRST exit after this entry (no other exits in between)
        
        next_exit = MovementLog.objects.filter(
            vehicle=OuterRef('vehicle'),
            driver=OuterRef('driver'),  # Match the same driver
            action='EXIT',
            timestamp__gt=OuterRef('timestamp')
        ).order_by('timestamp').values('timestamp')[:1]

        # Main Query: Get all UNIQUE ENTRIES and attach the exit time
        queryset = MovementLog.objects.filter(action='ENTRY') \
            .annotate(exit_time=Subquery(next_exit)) \
            .order_by('-timestamp') \
            .select_related('vehicle', 'driver', 'vehicle__unit', 'driver__rank') \
            .distinct()  # CRITICAL: Ensure no duplicate entries
        
        # Filter for "currently inside" if requested
        currently_inside = self.request.query_params.get('currently_inside', None)
        if currently_inside and currently_inside.lower() == 'true':
            queryset = queryset.filter(exit_time__isnull=True)
        
        # Filter by date if requested
        date = self.request.query_params.get('date', None)
        if date:
            # Filter entries that occurred on the specified date
            queryset = queryset.filter(timestamp__date=date)
        
        return queryset
    
    @action(detail=True, methods=['post'], url_path='add-exit')
    def add_exit(self, request, pk=None):
        """
        Add an EXIT log for a specific ENTRY log.
        POST /api/visits/{entry_log_id}/add-exit/
        Body: { "exit_time": "2024-01-15T14:30:00Z" }
        """
        import pytz
        from django.utils.dateparse import parse_datetime
        
        entry_log = self.get_object()
        exit_time = request.data.get('exit_time')
        
        if not exit_time:
            return Response(
                {'error': 'exit_time is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse and convert exit_time from IST to UTC
        if isinstance(exit_time, str):
            parsed_exit_time = parse_datetime(exit_time)
        else:
            parsed_exit_time = exit_time
            
        # Convert from IST to UTC if naive
        if parsed_exit_time and timezone.is_naive(parsed_exit_time):
            ist = pytz.timezone('Asia/Kolkata')
            parsed_exit_time = ist.localize(parsed_exit_time)
            parsed_exit_time = parsed_exit_time.astimezone(pytz.UTC)
        
        # Find the IMMEDIATE next exit for THIS specific entry
        # This ensures we update the correct exit, not just any exit
        existing_exit = MovementLog.objects.filter(
            vehicle=entry_log.vehicle,
            driver=entry_log.driver,  # Same driver
            action='EXIT',
            timestamp__gt=entry_log.timestamp
        ).order_by('timestamp').first()
        
        # Also check if there's another entry between this entry and the exit
        # If so, this exit belongs to that entry, not this one
        if existing_exit:
            next_entry = MovementLog.objects.filter(
                vehicle=entry_log.vehicle,
                action='ENTRY',
                timestamp__gt=entry_log.timestamp,
                timestamp__lt=existing_exit.timestamp
            ).exists()
            
            if next_entry:
                # There's another entry between this entry and the exit
                # So this exit doesn't belong to this entry - create a new one
                existing_exit = None
        
        if existing_exit:
            # Update existing exit time using raw SQL to bypass auto_now_add
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE core_movementlog 
                    SET timestamp = %s
                    WHERE id = %s
                """, [parsed_exit_time, existing_exit.id])
            
            # Refresh the object
            existing_exit.refresh_from_db()
            
            return Response({
                'status': 'success',
                'message': 'Exit time updated',
                'exit_log_id': existing_exit.id
            })
        else:
            # Create new EXIT log using raw SQL to set custom timestamp
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO core_movementlog 
                    (vehicle_id, driver_id, rfid_tag_id, action, timestamp, location, is_authorized, notes, flag_status, flag_category)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, [
                    entry_log.vehicle.id,
                    entry_log.driver.id if entry_log.driver else None,
                    entry_log.rfid_tag.id if entry_log.rfid_tag else None,
                    'EXIT',
                    parsed_exit_time,
                    entry_log.location,
                    True,
                    '',
                    entry_log.flag_status,
                    entry_log.flag_category or ''
                ])
                exit_log_id = cursor.fetchone()[0]
            
            # Update vehicle status
            entry_log.vehicle.status = 'OUT'
            entry_log.vehicle.save()
            
            return Response({
                'status': 'success',
                'message': 'Exit log created',
                'exit_log_id': exit_log_id
            }, status=status.HTTP_201_CREATED)
