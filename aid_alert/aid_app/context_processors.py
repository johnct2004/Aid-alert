from .models import UserProfile

def user_profile_context(request):
    """
    Context processor to make user profile data available in all templates.
    """
    if request.user.is_authenticated:
        try:
            profile = request.user.profile
            return {
                'user_profile': profile,
                'user_role': profile.role,
                'user_gender': profile.gender,
                'user_full_name': request.user.get_full_name() or request.user.username,
                'profile_icon': get_profile_icon(profile.gender, profile.role),
            }
        except UserProfile.DoesNotExist:
            # Create a profile if it doesn't exist
            profile = UserProfile.objects.create(user=request.user)
            return {
                'user_profile': profile,
                'user_role': profile.role,
                'user_gender': profile.gender,
                'user_full_name': request.user.get_full_name() or request.user.username,
                'profile_icon': get_profile_icon(profile.gender, profile.role),
            }
    else:
        return {
            'user_profile': None,
            'user_role': None,
            'user_gender': None,
            'user_full_name': None,
            'profile_icon': 'person',
        }

def get_profile_icon(gender, role):
    """
    Returns the appropriate icon based on gender and role.
    """
    if gender == 'male':
        return 'man'
    elif gender == 'female':
        return 'woman'
    elif role == 'admin':
        return 'admin_panel_settings'
    elif role == 'seller':
        return 'store'
    elif role == 'responder':
        return 'emergency'
    elif role == 'facility':
        return 'local_hospital'
    else:
        return 'person'
