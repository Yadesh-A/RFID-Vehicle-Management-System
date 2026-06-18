from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to users with the role 'Super Admin'.
    """
    def has_permission(self, request, view):
        # 1. User must be logged in
        if not request.user or not request.user.is_authenticated:
            return False
            
        # 2. User must specifically be a 'Super Admin'
        return request.user.role == 'Super Admin'