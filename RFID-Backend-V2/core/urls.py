from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, MyTokenObtainPairView, RFIDScanView,
    DashboardStatsView, DriverViewSet, VehicleViewSet, 
    RFIDTagViewSet, MovementLogViewSet, VehicleTypeViewSet,
    NotificationViewSet, DriverRankViewSet, VehicleUnitViewSet,
    UserViewSet, AdminChangePasswordView, scan_rfid, VisitReportViewSet,
    VehicleImportAPIView
)
# from .views import DashboardStatsView, RegisterView, MyTokenObtainPairView
# from .views import RegisterView, MyTokenObtainPairView, RFIDScanView..

# Create a Router for the CRUD ViewSets
router = DefaultRouter()
router.register(r'drivers', DriverViewSet)
router.register(r'driver-ranks', DriverRankViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'tags', RFIDTagViewSet)
router.register(r'logs', MovementLogViewSet)  # Raw movement logs (ENTRY/EXIT separately)
router.register(r'vehicle-types', VehicleTypeViewSet)
router.register(r'vehicle-units', VehicleUnitViewSet)
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'users', UserViewSet)
router.register(r'visits', VisitReportViewSet, basename='visit-report')  # Entry-Exit paired visits




urlpatterns = [
    # Auth Endpoints
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Operations
    path('scan/', scan_rfid, name='scan_rfid'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('vehicles/import/', VehicleImportAPIView.as_view(), name='vehicle_import'),

    # Password Change Endpoint
    path('users/<int:pk>/admin-change-password/', AdminChangePasswordView.as_view(), name='admin_change_password'),

    # Standard CRUD (Includes /drivers/, /vehicles/, etc.)
    path('', include(router.urls)),
]