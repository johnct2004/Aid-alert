from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from .models import UserProfile, MedicalKit, Responder, KitItem, Product, Incident, Order, Feedback, SystemReport, FirstAidGuide
from .forms import ProductForm
from datetime import timedelta, datetime
import random
from django.template.loader import render_to_string
from django.utils.html import strip_tags

# Create your views here.

def home_view(request):
    """Renders the home page of the AidAlert application."""
    return render(request, 'common/home.html')

def about_view(request):
    """Renders the about page with information about AidAlert."""
    return render(request, 'common/about.html')

def contact_view(request):
    """Renders the contact page with contact information."""
    return render(request, 'common/contact.html')

def dashboard_view(request):
    """Renders the appropriate dashboard based on user role."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your dashboard.')
        return redirect('aid_app:login')
    
    # Check if user is admin and redirect to admin dashboard
    if request.user.is_staff or request.user.is_superuser:
        return redirect('aid_app:admin_dashboard')
    
    # Check if user is responder and redirect to responder dashboard
    if request.session.get('user_role') == 'responder':
        return redirect('aid_app:responder_dashboard')
    
    # Regular user dashboard
    context = {
        'incident_count': 0,  # Will be updated by JavaScript from localStorage
        'responder_count': 0,  # Will be updated by JavaScript from localStorage  
        'order_count': 0,  # Will be updated by JavaScript from localStorage
        'recent_incidents': [],  # Will be populated from actual incidents model
        'user': request.user,  # Add user to context
    }

    return render(request, 'user/user_dashboard.html', context)

def seller_dashboard_view(request):
    """Renders the seller dashboard for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your dashboard.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This dashboard is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This dashboard is for seller users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'total_products': 156,
        'active_listings': 45,
        'pending_orders': 12,
        'completed_orders': 234,
        'total_revenue': 45678.90,
        'average_rating': 4.8,
        'user': request.user,
    }
    
    return render(request, 'seller/seller_dashboard.html', context)

def seller_report_view(request):
    """Renders the seller sales report page for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your sales report.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
        'user_profile': getattr(request.user, 'profile', None),
    }
    
    return render(request, 'seller/sales_report.html', context)

def seller_profile_view(request):
    """Renders the seller profile page for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your profile.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
        'user_profile': getattr(request.user, 'profile', None),
    }
    
    return render(request, 'seller/seller_profile.html', context)

def sales_report_redirect_view(request):
    """Redirect old hardcoded URL to correct seller report page."""
    return redirect('aid_app:seller_report')

def create_sample_orders_view(request):
    """Create sample orders for testing seller reports."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This is for seller testing only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This is for seller testing only.')
        return redirect('aid_app:dashboard')
    
    # Get seller's products
    seller_products = Product.objects.filter(seller=request.user)
    
    if not seller_products.exists():
        messages.warning(request, 'Please add some products first to generate sample orders.')
        return redirect('aid_app:seller_report')
    
    # Create sample orders
    from django.contrib.auth.models import User
    import random
    
    # Get some sample customers (all users except current seller)
    customers = User.objects.exclude(id=request.user.id)[:5]
    
    created_count = 0
    for product in seller_products:
        for customer in customers:
            # Create 1-3 orders per product per customer
            for i in range(random.randint(1, 3)):
                quantity = random.randint(1, 5)
                total_price = product.price * quantity
                
                Order.objects.create(
                    customer=customer,
                    product=product,
                    quantity=quantity,
                    total_price=total_price,
                    status=random.choice(['pending', 'processing', 'shipped', 'delivered'])
                )
                created_count += 1
    
    messages.success(request, f'Created {created_count} sample orders for testing.')
    return redirect('aid_app:seller_report')

def generate_seller_report_view(request):
    """Generate a downloadable sales report for the seller."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This is for seller users only.')
        return redirect('aid_app:dashboard')
    
    # Get the same data as the seller report view
    try:
        seller_products = Product.objects.filter(seller=request.user)
        seller_orders = Order.objects.filter(product__seller=request.user)
        
        # Calculate metrics
        total_products = seller_products.count()
        total_orders = seller_orders.count()
        total_revenue = sum(order.total_price for order in seller_orders)
        average_order_value = total_revenue / total_orders if total_orders > 0 else 0
        unique_customers = seller_orders.values('customer').distinct().count()
        
        # Customer segmentation
        customer_segments = {'new': 0, 'returning': 0, 'vip': 0}
        customer_order_counts = {}
        
        for order in seller_orders:
            customer_id = order.customer.id
            if customer_id not in customer_order_counts:
                customer_order_counts[customer_id] = 0
            customer_order_counts[customer_id] += 1
        
        total_customers_with_orders = len(customer_order_counts)
        if total_customers_with_orders > 0:
            for customer_id, order_count in customer_order_counts.items():
                if order_count == 1:
                    customer_segments['new'] += 1
                elif order_count <= 3:
                    customer_segments['returning'] += 1
                else:
                    customer_segments['vip'] += 1
        
        # Calculate percentages
        new_customers_pct = (customer_segments['new'] / total_customers_with_orders * 100) if total_customers_with_orders > 0 else 0
        returning_pct = (customer_segments['returning'] / total_customers_with_orders * 100) if total_customers_with_orders > 0 else 0
        vip_pct = (customer_segments['vip'] / total_customers_with_orders * 100) if total_customers_with_orders > 0 else 0
        
        # Top customers
        customer_spending = {}
        for order in seller_orders:
            customer_id = order.customer.id
            if customer_id not in customer_spending:
                customer_spending[customer_id] = {
                    'customer': order.customer,
                    'total_spent': 0
                }
            customer_spending[customer_id]['total_spent'] += order.total_price
        
        sorted_customers = sorted(customer_spending.values(), key=lambda x: x['total_spent'], reverse=True)[:5]
        
        # Product performance
        product_performance = []
        for product in seller_products:
            product_orders = Order.objects.filter(product=product)
            units_sold = sum(order.quantity for order in product_orders)
            revenue = sum(order.total_price for order in product_orders)
            
            product_performance.append({
                'product': product,
                'units_sold': units_sold,
                'revenue': revenue,
                'growth': '+12%',
                'trend': 'Rising' if units_sold > 10 else 'Stable'
            })
        
        product_performance.sort(key=lambda x: x['revenue'], reverse=True)
        
    except Exception as e:
        # Fallback data
        seller_products = []
        seller_orders = []
        total_products = 0
        total_orders = 0
        total_revenue = 0
        average_order_value = 0
        unique_customers = 0
        new_customers_pct = returning_pct = vip_pct = 0
        sorted_customers = []
        product_performance = []
    
    # Generate report HTML
    report_data = {
        'seller_name': request.user.get_full_name() or request.user.username,
        'report_date': datetime.now().strftime('%B %d, %Y'),
        'total_products': total_products,
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'average_order_value': average_order_value,
        'unique_customers': unique_customers,
        'new_customers_pct': new_customers_pct,
        'returning_pct': returning_pct,
        'vip_pct': vip_pct,
        'top_customers': sorted_customers,
        'product_performance': product_performance[:10],
        'seller_products': seller_products,
    }
    
    # Return JSON response for AJAX requests
    return JsonResponse({
        'success': True,
        'message': 'Report generated successfully',
        'data': report_data
    })

def add_product_view(request):
    """Handles product submission for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to add products.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            product.seller = request.user
            product.save()
            messages.success(request, f'Product "{product.name}" has been successfully added!')
            return redirect('aid_app:seller_dashboard')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = ProductForm()
    
    context = {
        'form': form,
        'categories': [
            'Medical Supplies', 'Emergency Equipment', 'First Aid Kits',
            'Diagnostic Tools', 'Personal Protective Equipment', 'Other'
        ],
        'conditions': ['New', 'Like New', 'Good', 'Fair'],
        'user': request.user,
    }
    
    return render(request, 'seller/add_product.html', context)

def update_product_view(request):
    """Handles product updating for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to update products.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    if request.method == 'POST':
        product_id = request.POST.get('product_id')
        if not product_id:
            messages.error(request, 'Invalid product selection.')
            return redirect('aid_app:update_product')
            
        try:
            product = Product.objects.get(id=product_id, seller=request.user)
        except Product.DoesNotExist:
            messages.error(request, 'Product not found or access denied.')
            return redirect('aid_app:update_product')
            
        form = ProductForm(request.POST, request.FILES, instance=product)
        if form.is_valid():
            form.save()
            messages.success(request, f'Product "{product.name}" updated successfully!')
            return redirect('aid_app:update_product')
        else:
            messages.error(request, 'Error updating product. Please check the form.')
    
    # Get all products for this seller
    products = Product.objects.filter(seller=request.user).order_by('-created_at')
    
    # Serialize for JS
    import json
    from django.core.serializers.json import DjangoJSONEncoder
    
    products_data = {}
    for p in products:
        products_data[p.id] = {
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'category': p.category,
            'condition': p.condition,
            'price': float(p.price),
            'stock': p.stock_quantity,
            'status': p.status,
            'image_url': p.image.url if p.image else '',
        }
        
    context = {
        'products': products,
        'products_json': json.dumps(products_data, cls=DjangoJSONEncoder),
        'user': request.user,
    }
    
    return render(request, 'seller/update_product.html', context)

def view_products_view(request):
    """Handles viewing products for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to view products.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    # Get all products for this seller
    products = Product.objects.filter(seller=request.user).order_by('-created_at')
    
    # Calculate product statistics
    total_products = products.count()
    active_products = products.filter(status='active').count()
    low_stock_products = products.filter(stock_quantity__lt=10).count()
    featured_products = products.filter(status='featured').count() if products.filter(status='featured').exists() else 0
    
    context = {
        'products': products,
        'total_products': total_products,
        'active_products': active_products,
        'low_stock_products': low_stock_products,
        'featured_products': featured_products,
        'user': request.user,
    }
    
    return render(request, 'seller/view_products.html', context)

def view_orders_view(request):
    """Handles viewing orders for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to view orders.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    # Get all orders for this seller's products
    orders = Order.objects.filter(product__seller=request.user).order_by('-created_at')
    
    # Calculate statistics
    total_orders = orders.count()
    pending_orders = orders.filter(status='pending').count()
    in_transit_orders = orders.filter(status='shipped').count()
    total_revenue = orders.exclude(status='cancelled').aggregate(
        total=Sum('total_price'))['total'] or 0
    
    context = {
        'orders': orders,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'in_transit_orders': in_transit_orders,
        'total_revenue': total_revenue,
        'user': request.user,
    }
    
    return render(request, 'seller/view_orders.html', context)

def manage_delivery_view(request):
    """Handles delivery management for seller users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to manage deliveries.')
        return redirect('aid_app:login')
    
    # Check if user is seller
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    # Get all orders for this seller with delivery information
    orders = Order.objects.filter(product__seller=request.user).order_by('-created_at')
    
    # Calculate delivery statistics
    total_deliveries = orders.count()
    pending_shipments = orders.filter(status='pending').count()
    in_transit = orders.filter(status='shipped').count()
    delivered_today = orders.filter(status='delivered', created_at__date=timezone.now().date()).count()
    
    # Add mock delivery data for demonstration (in real app, this would come from a Delivery model)
    deliveries_with_info = []
    for order in orders:
        delivery_info = {
            'order': order,
            'carrier': get_random_carrier(),
            'tracking_number': generate_tracking_number(get_random_carrier()),
            'priority': get_random_priority(),
        }
        deliveries_with_info.append(delivery_info)
    
    context = {
        'deliveries': deliveries_with_info,
        'total_deliveries': total_deliveries,
        'pending_shipments': pending_shipments,
        'in_transit': in_transit,
        'delivered_today': delivered_today,
        'user': request.user,
    }
    
    return render(request, 'seller/manage_delivery.html', context)

def facility_dashboard_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your dashboard.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This dashboard is for facility users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This dashboard is for facility users only.')
        return redirect('aid_app:dashboard')
    
    # Get real data from database
    total_kits = MedicalKit.objects.count()
    available_kits = MedicalKit.objects.filter(status='available').count()
    
    # Calculate low stock items - count kits where any item is below minimum quantity
    low_stock_kits = 0
    for kit in MedicalKit.objects.all():
        for item in kit.items.all():
            if item.quantity <= item.min_quantity:
                low_stock_kits += 1
                break  # Count each kit only once
    
    # Count active responders
    active_responders = Responder.objects.filter(
        status__in=['available', 'on_duty']
    ).count()
    
    context = {
        'total_kits': total_kits,
        'in_stock': available_kits,
        'low_stock': low_stock_kits,
        'active_responders': active_responders,
        'capacity_utilization': 78,
        'average_response_time': 8.5,
        'user': request.user,
    }
    
    return render(request, 'facility manager/facility_dashboard.html', context)

def manage_kits_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    # Get real data from database
    kits = MedicalKit.objects.all()
    available_kits = kits.filter(status='available').count()
    maintenance_kits = kits.filter(status='maintenance').count()
    
    # Calculate low stock kits
    low_stock_kits = 0
    for kit in kits:
        for item in kit.items.all():
            if item.quantity <= item.min_quantity:
                low_stock_kits += 1
                break
    
    context = {
        'user': request.user,
        'kits': kits,
        'available_kits': available_kits,
        'maintenance_kits': maintenance_kits,
        'low_stock_kits': low_stock_kits,
    }
    return render(request, 'facility manager/manage_kits.html', context)

def stock_tracking_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'facility manager/stock_tracking.html', context)

def assign_responders_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
        'responders': [],  # Add responders data here
    }
    return render(request, 'facility manager/assign_responders.html', context)

def facility_incident_log_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    # Get all incidents for facility log
    incidents = Incident.objects.all().order_by('-created_at')

    context = {
        'user': request.user,
        'incidents': incidents,
    }
    return render(request, 'facility manager/facility_incident_log.html', context)

def facility_reports_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'facility manager/facility_reports.html', context)

def facility_notifications_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
        'notifications': [],  # Add notifications data here
    }
    return render(request, 'facility manager/facility_notifications.html', context)

def facility_profile_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'facility manager/facility_profile.html', context)

def responder_dashboard_view(request):
    """Renders the responder dashboard."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your dashboard.')
        return redirect('aid_app:login')
    
    # Check if user is responder
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This dashboard is for responders only.')
        return redirect('aid_app:dashboard')
    
    # Get real incident counts
    available_incidents = Incident.objects.filter(status='open').count()
    active_incidents = Incident.objects.filter(status='in_progress').count()
    
    context = {
        'available_incidents': available_incidents,
        'active_incidents': active_incidents,
        'completed_today': 8, # Placeholder
        'average_rating': 4.8, # Placeholder
        'availability_status': 'online',
        'current_location': 'Downtown Area',
        'last_update': '2 mins ago',
        'user': request.user,
    }
    
    return render(request, 'responder/responder_dashboard.html', context)

def available_incidents_view(request):
    """Renders the available incidents page for responders."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    # Get available incidents (open status)
    incidents = Incident.objects.filter(status='open').order_by('-created_at')
    
    context = {
        'user': request.user,
        'incidents': incidents,
    }
    return render(request, 'responder/available_incidents.html', context)

def accept_incident_view(request):
    """Renders the accept incident page for responders."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'responder/accept_incident.html', context)

def update_incident_status_view(request):
    """Renders the update incident status page for responders."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'responder/update_incident_status.html', context)

def responder_history_view(request):
    """Renders the responder history page."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'responder/responder_history.html', context)

def availability_status_view(request):
    """Renders the availability status page for responders."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'responder/availability_status.html', context)

def responder_profile_view(request):
    """Renders the responder profile page."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'responder/responder_profile.html', context)

def feedback_received_view(request):
    """Renders the feedback received page for responders."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if request.session.get('user_role') != 'responder':
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    context = {
        'user': request.user,
    }
    return render(request, 'responder/feedback_received.html', context)

def login_view(request):
    """Handles user login."""
    if request.method == 'POST':
        identifier = (request.POST.get('username') or '').strip()
        password = request.POST.get('password')
        remember_me = request.POST.get('remember')
        
        print(f"LOGIN DEBUG: Identifier='{identifier}', Password length={len(password) if password else 0}")

        # Allow login with either username OR email
        username_to_auth = identifier
        if identifier:
            try:
                username_to_auth = User.objects.only('username').get(username=identifier).username
                print(f"LOGIN DEBUG: Found user by username: {username_to_auth}")
            except User.DoesNotExist:
                try:
                    username_to_auth = User.objects.only('username').get(email=identifier).username
                    print(f"LOGIN DEBUG: Found user by email: {username_to_auth}")
                except User.DoesNotExist:
                    print(f"LOGIN DEBUG: User not found, using identifier as-is: {identifier}")
                    username_to_auth = identifier

        user = authenticate(request, username=username_to_auth, password=password)
        print(f"LOGIN DEBUG: Authentication result: {user}")
        
        if user is not None:
            login(request, user)
            print(f"LOGIN DEBUG: User logged in successfully, checking user role")
            
            # Handle remember me
            if not remember_me:
                request.session.set_expiry(0)  # Session expires on browser close
            else:
                request.session.set_expiry(1209600)  # 2 weeks in seconds
            
            # Clear any existing messages to prevent repetition
            messages.get_messages(request).used = True
            
            # Get user role from UserProfile
            try:
                user_profile = user.profile
                user_role = user_profile.role
                print(f"LOGIN DEBUG: User role from database: {user_role}")
            except UserProfile.DoesNotExist:
                user_role = 'user'  # Default role if no profile exists
                print(f"LOGIN DEBUG: No UserProfile found, defaulting to: {user_role}")
            
            # Redirect based on user role
            if user.is_staff or user.is_superuser:
                print(f"LOGIN DEBUG: Admin user detected, redirecting to admin dashboard")
                return redirect('aid_app:admin_dashboard')
            elif user_role == 'responder':
                print(f"LOGIN DEBUG: Responder user detected, redirecting to responder dashboard")
                return redirect('aid_app:responder_dashboard')
            elif user_role == 'facility':
                print(f"LOGIN DEBUG: Facility user detected, redirecting to facility dashboard")
                return redirect('aid_app:facility_dashboard')
            elif user_role == 'seller':
                print(f"LOGIN DEBUG: Seller user detected, redirecting to seller dashboard")
                return redirect('aid_app:seller_dashboard')
            else:
                print(f"LOGIN DEBUG: Regular user detected, redirecting to user dashboard")
                return redirect('aid_app:dashboard')
        else:
            print(f"LOGIN DEBUG: Authentication failed")
            messages.error(request, 'Invalid username/email or password. Please try again.')
    
    return render(request, 'common/login.html')

def register_view(request):
    """Handles user registration."""
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        username = request.POST.get('username')
        email = request.POST.get('email')
        phone = request.POST.get('phone')
        gender = request.POST.get('gender')
        user_role = request.POST.get('user_role')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        terms = request.POST.get('terms')
        
        print(f"REGISTER DEBUG: Received registration for username='{username}', email='{email}'")
        print(f"REGISTER DEBUG: All received data:")
        print(f"  first_name: '{first_name}'")
        print(f"  last_name: '{last_name}'")
        print(f"  username: '{username}'")
        print(f"  email: '{email}'")
        print(f"  phone: '{phone}'")
        print(f"  gender: '{gender}'")
        print(f"  user_role: '{user_role}'")
        print(f"  password: {'*' * len(password) if password else 'None'}")
        print(f"  confirm_password: {'*' * len(confirm_password) if confirm_password else 'None'}")
        print(f"  terms: '{terms}'")
        
        # Validation
        if not all([first_name, last_name, username, email, phone, user_role, password, confirm_password]):
            print(f"REGISTER DEBUG: Validation failed - missing required fields")
            messages.error(request, 'All fields are required. Please fill in all details including your role.')
            return render(request, 'common/register.html')
        
        # Validate user_role is one of the allowed choices
        valid_roles = ['user', 'seller', 'facility', 'responder']
        if user_role not in valid_roles:
            print(f"REGISTER DEBUG: Validation failed - invalid user role: {user_role}")
            messages.error(request, 'Please select a valid role.')
            return render(request, 'common/register.html')
        
        if password != confirm_password:
            print(f"REGISTER DEBUG: Validation failed - passwords don't match")
            messages.error(request, 'Passwords do not match.')
            return render(request, 'common/register.html')
        
        # Password requirements validation
        if len(password) < 8:
            print(f"REGISTER DEBUG: Validation failed - password too short")
            messages.error(request, 'Password must be at least 8 characters long.')
            return render(request, 'common/register.html')
        
        if not any(c.isupper() for c in password):
            messages.error(request, 'Password must contain at least one uppercase letter.')
            return render(request, 'common/register.html')
        
        if not any(c.islower() for c in password):
            messages.error(request, 'Password must contain at least one lowercase letter.')
            return render(request, 'common/register.html')
        
        if not any(c.isdigit() for c in password):
            messages.error(request, 'Password must contain at least one number.')
            return render(request, 'common/register.html')
        
        # Basic phone number validation - exactly 10 digits required
        if len(phone) != 10 or not phone.isdigit():
            print(f"REGISTER DEBUG: Validation failed - invalid phone number: {phone}")
            messages.error(request, 'Phone number must be exactly 10 digits.')
            return render(request, 'common/register.html')
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            print(f"REGISTER DEBUG: Username '{username}' already exists")
            messages.error(request, 'Username is already taken. Please choose another one.')
            return render(request, 'common/register.html')
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            print(f"REGISTER DEBUG: Email '{email}' already registered")
            messages.error(request, 'Email is already registered. Please use another email.')
            return render(request, 'common/register.html')
        
        # Create new user
        try:
            print(f"REGISTER DEBUG: Creating user '{username}'...")
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            print(f"REGISTER DEBUG: User created successfully - ID: {user.id}, Username: {user.username}")
            
            # Create UserProfile with additional information
            try:
                profile = UserProfile.objects.create(
                    user=user,
                    role=user_role if user_role else 'user',
                    gender=gender if gender else None,
                    phone=phone if phone else None,
                    address=request.POST.get('address', '') if request.POST.get('address') else None
                )
                print(f"REGISTER DEBUG: UserProfile created successfully - Role: {profile.role}")

                # Auto-create Responder entry if role is responder
                if profile.role == 'responder':
                    try:
                        import random
                        # Generate a random responder ID
                        resp_id = f"RESP-{random.randint(100, 999)}"
                        Responder.objects.create(
                            user=user,
                            responder_id=resp_id,
                            phone=phone if phone else 'N/A',
                            specialization='General Emergency', # Default
                            status='available'
                        )
                        print(f"REGISTER DEBUG: Responder profile auto-created: {resp_id}")
                    except Exception as r_err:
                        print(f"REGISTER DEBUG: Failed to create Responder profile: {r_err}")
                        # Don't fail the whole registration for this, but log it

            except Exception as profile_error:
                print(f"REGISTER DEBUG: Error creating UserProfile - {str(profile_error)}")
                # Continue even if profile creation fails, but log the error
            
            print(f"REGISTER DEBUG: Redirecting to login page")
            messages.success(request, 'Account created successfully! Please login to continue.')
            return redirect('aid_app:login')
            
        except Exception as e:
            print(f"REGISTER DEBUG: Error creating user - {type(e).__name__}: {str(e)}")
            messages.error(request, f'An error occurred while creating your account: {str(e)}')
            return render(request, 'common/register.html')
    
    return render(request, 'common/register.html')

def forgot_password_view(request):
    """
    Handle forgot password requests
    """
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        
        # Basic email validation
        if not email:
            messages.error(request, 'Please enter your email address.')
            return render(request, 'common/forgot_password.html')
        
        # Check if user exists with this email
        try:
            user = User.objects.get(email=email)
            # In a real application, you would:
            # 1. Generate a password reset token
            # 2. Send an email with reset link
            # 3. Store the token with expiration
            # For demo, we'll use a fixed OTP code
            fixed_otp = "123456"
            request.session['reset_email'] = email
            request.session['otp_demo_code'] = fixed_otp  # Fixed demo code
            messages.info(request, f'Verification code has been sent to {email}. Demo code: {fixed_otp}')
            return redirect('aid_app:otp_verification')
            
        except User.DoesNotExist:
            # For security, don't reveal that the email doesn't exist
            # Still redirect to OTP page but with the fixed demo code
            fixed_otp = "123456"
            request.session['reset_email'] = email
            request.session['otp_demo_code'] = fixed_otp  # Fixed demo code
            messages.info(request, f'Verification code has been sent to {email}. Demo code: {fixed_otp}')
            return redirect('aid_app:otp_verification')
            
        except Exception as e:
            messages.error(request, 'An error occurred. Please try again.')
            return render(request, 'common/forgot_password.html')
    
    return render(request, 'common/forgot_password.html')

def otp_verification_view(request):
    """
    Handle OTP verification for password reset
    """
    # Check if user came from forgot password flow
    reset_email = request.session.get('reset_email')
    if not reset_email:
        messages.error(request, 'Please start the password reset process again.')
        return redirect('aid_app:forgot_password')
    
    if request.method == 'POST':
        otp_code = request.POST.get('otp_code', '').strip()
        
        # Basic OTP validation
        if not otp_code:
            messages.error(request, 'Please enter the verification code.')
            return render(request, 'common/otp.html', {'email': reset_email})
        
        if len(otp_code) != 6 or not otp_code.isdigit():
            messages.error(request, 'Please enter a valid 6-digit verification code.')
            return render(request, 'common/otp.html', {'email': reset_email})
        
        # Verify OTP (demo logic - in real app, check against stored OTP)
        stored_otp = request.session.get('otp_demo_code')
        print(f"DEBUG: Submitted OTP: {otp_code}, Stored OTP: {stored_otp}")
        if otp_code == stored_otp:
            # OTP is valid, mark as verified in session
            request.session['otp_verified'] = True
            messages.success(request, 'Email verified successfully!')
            print("DEBUG: OTP verified, redirecting to change_password")
            return redirect('aid_app:change_password')
        else:
            messages.error(request, 'Invalid verification code. Please try again.')
            print("DEBUG: OTP verification failed")
            return render(request, 'common/otp.html', {'email': reset_email})
    
    return render(request, 'common/otp.html', {'email': reset_email})

def change_password_view(request):
    """
    Handle password reset after OTP verification
    """
    print("DEBUG: change_password_view reached")
    # Check if user has verified OTP
    if not request.session.get('otp_verified'):
        print("DEBUG: OTP not verified in session")
        messages.error(request, 'Please complete the verification process first.')
        return redirect('aid_app:forgot_password')
    
    # Get the email from session
    reset_email = request.session.get('reset_email')
    if not reset_email:
        messages.error(request, 'Session expired. Please start the password reset process again.')
        return redirect('aid_app:forgot_password')
    
    if request.method == 'POST':
        new_password = request.POST.get('new_password', '').strip()
        confirm_password = request.POST.get('confirm_password', '').strip()
        
        # Basic validation
        if not new_password:
            messages.error(request, 'Please enter a new password.')
            return render(request, 'common/change_password.html', {'email': reset_email})
        
        # Password requirements validation
        if len(new_password) < 8:
            messages.error(request, 'Password must be at least 8 characters long.')
            return render(request, 'common/change_password.html', {'email': reset_email})
        
        if not any(c.isupper() for c in new_password):
            messages.error(request, 'Password must contain at least one uppercase letter.')
            return render(request, 'common/change_password.html', {'email': reset_email})
        
        if not any(c.islower() for c in new_password):
            messages.error(request, 'Password must contain at least one lowercase letter.')
            return render(request, 'common/change_password.html', {'email': reset_email})
        
        if not any(c.isdigit() for c in new_password):
            messages.error(request, 'Password must contain at least one number.')
            return render(request, 'common/change_password.html', {'email': reset_email})
        
        if new_password != confirm_password:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'common/change_password.html', {'email': reset_email})
        
        # Update user password
        try:
            user = User.objects.get(email=reset_email)
            user.set_password(new_password)
            user.save()
            
            # Clear session data
            request.session.pop('reset_email', None)
            request.session.pop('otp_demo_code', None)
            request.session.pop('otp_verified', None)
            
            messages.success(request, 'Password has been reset successfully! Please login with your new password.')
            return redirect('aid_app:login')
            
        except User.DoesNotExist:
            messages.error(request, 'User not found. Please try again.')
            return redirect('aid_app:forgot_password')
            
        except Exception as e:
            messages.error(request, 'An error occurred. Please try again.')
            return render(request, 'common/change_password.html', {'email': reset_email})
    
    return render(request, 'common/change_password.html', {'email': reset_email})

def logout_view(request):
    """Handle user logout."""
    from django.contrib.auth import logout
    logout(request)
    return redirect('aid_app:home')

# Placeholder views for dashboard navigation
def report_incident_view(request):
    """Renders the report incident page for users to report emergencies."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to report an incident.')
        return redirect('aid_app:login')
    
    if request.method == 'POST':
        # Get form data
        incident_type = request.POST.get('incidentType')
        severity = request.POST.get('severity')
        location = request.POST.get('location')
        contact_phone = request.POST.get('contactPhone')
        people_involved = request.POST.get('peopleInvolved', '1')
        description = request.POST.get('description')
        immediate_action = request.POST.get('immediateAction', '')
        
        # Validate required fields
        if not all([incident_type, severity, location, contact_phone, description]):
            messages.error(request, 'Please fill in all required fields.')
            return render(request, 'user/report_incident_new.html', {'user': request.user})
        
        # Validate phone number (exactly 10 digits)
        if len(contact_phone) != 10 or not contact_phone.isdigit():
            messages.error(request, 'Please enter a valid 10-digit phone number.')
            return render(request, 'user/report_incident_new.html', {'user': request.user})
        
        # Create incident
        try:
            incident = Incident.objects.create(
                user=request.user,
                incident_type=incident_type,
                severity=severity,
                location=location,
                description=description,
                contact_phone=contact_phone,
                people_involved=int(people_involved) if people_involved else 1,
                immediate_action=immediate_action,
                status='open'
            )
            messages.success(request, f'Incident {incident.incident_id} reported successfully! Emergency services have been notified.')
            return redirect('aid_app:report_incident')
        except Exception as e:
            messages.error(request, 'An error occurred while reporting the incident. Please try again.')
            return render(request, 'user/report_incident_new.html', {'user': request.user})
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/report_incident_new.html', context)

def first_aid_guides_view(request):
    """First aid guides page with emergency procedures and medical information."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Fetch dynamic guides
    dynamic_guides = FirstAidGuide.objects.all()
    
    context = {
        'user': request.user,
        'dynamic_guides': dynamic_guides,
    }
    return render(request, 'user/first_aid_guides_complete.html', context)

def buy_products_view(request):
    """Renders the buy products page with medical supplies and equipment."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Get all active products from both sellers and facility managers
    products = Product.objects.filter(status='active').order_by('-created_at')
    
    context = {
        'user': request.user,
        'products': products,
    }
    return render(request, 'user/buy_products_new.html', context)

def checkout_view(request):
    """Renders the checkout page for completing purchases."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/check_out.html', context)

def shipping_view(request):
    """Renders the shipping information page for checkout."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/shipping.html', context)

def payment_view(request):
    """Renders the payment information page for checkout."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/payment.html', context)

def confirmation_view(request):
    """Renders the order confirmation page after successful purchase."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/confirmation.html', context)

def book_responder_view(request):
    """Book responder page for emergency medical services."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    """Book responder page for emergency medical services."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    if request.method == 'POST':
        # Map booking form fields to Incident model
        emergency_type = request.POST.get('emergencyType')
        urgency = request.POST.get('urgencyLevel')
        location = request.POST.get('location')
        contact_number = request.POST.get('contactNumber')
        victims = request.POST.get('victimsCount')
        description = request.POST.get('description')
        special_instructions = request.POST.get('specialInstructions', '')
        
        full_description = f"{description}\n\nSpecial Instructions: {special_instructions}"
        
        # Severity mapping
        severity_map = {
            'critical': 'critical',
            'urgent': 'high',
            'moderate': 'medium',
            'low': 'low'
        }
        severity_val = severity_map.get(urgency, 'medium')

        try:
            incident = Incident.objects.create(
                user=request.user,
                incident_type=emergency_type,
                severity=severity_val,
                location=location,
                description=full_description,
                contact_phone=contact_number,
                people_involved=int(victims) if victims else 1,
                status='open'
            )
            messages.success(request, f'Responder requested! Incident {incident.incident_id} created successfully.')
            return redirect('aid_app:track_responder')
        except Exception as e:
            messages.error(request, f'Error processing request: {str(e)}')
    
    # Get available responders for UI display
    responders = Responder.objects.filter(status='available')
    
    # Get recent bookings (incidents)
    recent_bookings = Incident.objects.filter(user=request.user).order_by('-created_at')[:5]
    
    context = {
        'responders': responders,
        'recent_bookings': recent_bookings,
    }
    return render(request, 'user/book_responder_new.html', context)

def track_responder_view(request):
    """Track responder page for monitoring emergency responders."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    return render(request, 'user/track_responder_new.html')

def profile_view(request):
    """Renders the profile page based on the user's role."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Check for staff/superuser first
    if request.user.is_staff or request.user.is_superuser:
        return render(request, 'admin/admin_profile.html', {'user': request.user})
    
    # Check roles from UserProfile
    try:
        user_role = request.user.profile.role
        if user_role == 'facility':
            return redirect('aid_app:facility_profile')
        elif user_role == 'seller':
            return redirect('aid_app:seller_profile')
        elif user_role == 'responder':
            return redirect('aid_app:responder_profile')
    except:
        pass # Default to standard user profile
        
    return render(request, 'user/user_profile.html', {'user': request.user})

def order_history_view(request):
    """Renders the order history page for users to view their past orders."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/order_history_new.html', context)

def create_order_view(request):
    """Creates new orders from checkout."""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'message': 'Please login to place an order.'}, status=401)
    
    if request.method == 'POST':
        import json
        try:
            data = json.loads(request.body)
            items = data.get('items', [])
            payment_method = data.get('payment_method', 'cod')
            
            if not items:
                return JsonResponse({'success': False, 'message': 'No items in cart.'}, status=400)
            
            # Create an order content for each item (simplest approach for now based on model)
            for item in items:
                # In a real app we'd verify price from DB, but for now trust/verify minimal
                try:
                    product = Product.objects.get(id=item.get('id'))
                    # Determine status based on simulator
                    # For real app, it starts as pending
                    
                    Order.objects.create(
                        customer=request.user,
                        product=product,
                        quantity=item.get('quantity', 1),
                        total_price=float(item.get('price', 0)) * int(item.get('quantity', 1)),
                        status='pending'
                    )
                    
                    # Update stock
                    if product.stock_quantity >= int(item.get('quantity', 1)):
                        product.stock_quantity -= int(item.get('quantity', 1))
                        product.save()
                        
                except Exception:
                    # Skip invalid items
                    continue
            
            return JsonResponse({'success': True, 'redirect_url': '/processing/'})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

def processing_view(request):
    """Renders the order processing page with real user orders."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Fetch active orders for the user
    orders = Order.objects.filter(
        customer=request.user
    ).exclude(
        status__in=['delivered', 'cancelled']
    ).order_by('-created_at')
    
    context = {
        'orders': orders,
        'user': request.user,
    }
    return render(request, 'user/processing.html', context)

def cancel_order_view(request, order_id):
    """Allows user to cancel an order."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login.')
        return redirect('aid_app:login')
        
    try:
        order = Order.objects.get(id=order_id, customer=request.user)
        if order.status in ['pending', 'processing']:
            order.status = 'cancelled'
            order.save()
            
            # Restore stock
            order.product.stock_quantity += order.quantity
            order.product.save()
            
            messages.success(request, f'Order #{order.order_id} cancelled successfully.')
        else:
            messages.error(request, 'Cannot cancel this order (it may be shipped or already cancelled).')
            
    except Order.DoesNotExist:
        messages.error(request, 'Order not found.')
        
    return redirect('aid_app:processing')

def admin_orders_view(request):
    """Admin view to manage all orders."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
        
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'Access denied.')
        return redirect('aid_app:dashboard')
        
    if request.method == 'POST':
        order_id = request.POST.get('order_id')
        new_status = request.POST.get('status')
        try:
            order = Order.objects.get(id=order_id)
            order.status = new_status
            order.save()
            messages.success(request, f'Order {order.order_id} updated to {new_status}.')
        except Order.DoesNotExist:
            messages.error(request, 'Order not found.')
            
    orders = Order.objects.all().order_by('-created_at')
    
    context = {
        'orders': orders,
        'user': request.user
    }
    return render(request, 'admin/view_orders.html', context)

def incident_history_view(request):
    """Renders the incident history page for users to view their reported incidents."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to view incident history.')
        return redirect('aid_app:login')
    
    # Get incidents only for the logged-in user
    user_incidents = Incident.objects.filter(user=request.user)
    
    # Calculate statistics
    total_incidents = user_incidents.count()
    resolved_incidents = user_incidents.filter(status='resolved').count()
    in_progress_incidents = user_incidents.filter(status='in_progress').count()
    critical_incidents = user_incidents.filter(severity='critical', status__in=['open', 'in_progress']).count()
    
    context = {
        'user': request.user,
        'incidents': user_incidents,
        'total_incidents': total_incidents,
        'resolved_incidents': resolved_incidents,
        'in_progress_incidents': in_progress_incidents,
        'critical_incidents': critical_incidents,
    }
    return render(request, 'user/incident_history.html', context)

def give_feedback_view(request):
    """Renders the give feedback page and handles submission."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to give feedback.')
        return redirect('aid_app:login')
    
    if request.method == 'POST':
        try:
            rating = request.POST.get('rating')
            message = request.POST.get('message')
            tags = request.POST.get('feedbackType', 'General')
            
            # Simple sentiment analysis mock
            sentiment = 'neutral'
            if int(rating) >= 4:
                sentiment = 'positive'
            elif int(rating) <= 2:
                sentiment = 'negative'
                
            Feedback.objects.create(
                user=request.user,
                rating=rating,
                message=message,
                sentiment=sentiment,
                tags=tags,
                status='pending'
            )
            messages.success(request, 'Thank you for your feedback! We will review it shortly.')
            return redirect('aid_app:my_feedback')
        except Exception as e:
            messages.error(request, f'Error submitting feedback: {str(e)}')
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/feedback_new.html', context)

def my_feedback_view(request):
    """(New) Display user's feedback history."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to view your feedback.')
        return redirect('aid_app:login')
        
    context = {
        'feedbacks': Feedback.objects.filter(user=request.user).order_by('-created_at'),
        'user': request.user
    }
    return render(request, 'user/my_feedback.html', context)

def reply_feedback_view(request, feedback_id):
    """(New) Handle admin replies to feedback."""
    if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
        messages.error(request, 'Unauthorized access.')
        return redirect('aid_app:home')
        
    if request.method == 'POST':
        try:
            feedback = Feedback.objects.get(id=feedback_id)
            reply_text = request.POST.get('reply')
            
            feedback.reply = reply_text
            feedback.replied_at = timezone.now()
            feedback.status = 'replied' # Or 'resolved' based on workflow
            feedback.save()
            
            messages.success(request, 'Reply sent successfully.')
        except Feedback.DoesNotExist:
            messages.error(request, 'Feedback not found.')
        except Exception as e:
            messages.error(request, f'Error sending reply: {str(e)}')
            
    return redirect('aid_app:feedback_analysis')

def admin_dashboard_view(request):
    """Renders the admin dashboard for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access the admin dashboard.')
        return redirect('aid_app:login')
    
    # Check if user is admin (you may want to add more sophisticated role checking)
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access the admin dashboard.')
        return redirect('aid_app:dashboard')
    
    # Calculate real performance metrics
    # Average response time for resolved incidents (in minutes)
    resolved_incidents = Incident.objects.filter(status='resolved')
    total_response_time = 0
    response_count = 0
    
    for incident in resolved_incidents:
        if incident.resolved_at and incident.created_at:
            response_minutes = (incident.resolved_at - incident.created_at).total_seconds() / 60
            total_response_time += response_minutes
            response_count += 1
    
    avg_response_time = round(total_response_time / response_count, 1) if response_count > 0 else 0.0
    
    # User satisfaction (average rating from feedback)
    feedback_ratings = Feedback.objects.filter(rating__isnull=False)
    total_rating = sum(feedback.rating for feedback in feedback_ratings)
    feedback_count = feedback_ratings.count()
    avg_satisfaction = round(total_rating / feedback_count, 1) if feedback_count > 0 else 0.0
    
    # System uptime (mock calculation - in real scenario this would be from monitoring)
    total_incidents = Incident.objects.count()
    resolved_incident_count = resolved_incidents.count()
    system_uptime = round((resolved_incident_count / total_incidents * 100), 1) if total_incidents > 0 else 100.0
    
    context = {
        'total_users': User.objects.count(),
        'active_alerts': Incident.objects.filter(status__in=['open', 'in_progress']).count(),
        'total_incidents': total_incidents,
        'response_time': avg_response_time, 
        'active_responders': Responder.objects.filter(status='on_duty').count(),
        'marketplace_items': Product.objects.filter(status='active').count(),
        'avg_satisfaction': avg_satisfaction,
        'system_uptime': system_uptime,
        'feedback_count': feedback_count,
        'user': request.user,
    }
    
    return render(request, 'admin/admin_dashboard.html', context)

# New admin page views
def manage_users_view(request):
    """Renders the manage users page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    # Calculate user statistics
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    admin_users = User.objects.filter(is_staff=True).count()
    
    # New users in last 24 hours
    yesterday = timezone.now() - timedelta(days=1)
    new_users_today = User.objects.filter(date_joined__gte=yesterday).count()
    
    # Active users (logged in within last 7 days)
    seven_days_ago = timezone.now() - timedelta(days=7)
    recently_active = User.objects.filter(last_login__gte=seven_days_ago).count()
    
    # Get all users with detailed information
    users = User.objects.select_related('profile').all().order_by('-date_joined')
    
    context = {
        'total_users': total_users,
        'active_users': active_users,
        'new_users_today': new_users_today,
        'recently_active': recently_active,
        'admin_users': admin_users,
        'users': users,
        'user': request.user,
    }
    return render(request, 'admin/manage_users.html', context)

def manage_responders_view(request):
    """Renders the manage responders page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    context = {
        'total_responders': Responder.objects.count(),
        'available_responders': Responder.objects.filter(status='available').count(),
        'on_duty_responders': Responder.objects.filter(status='on_duty').count(),
        'responders': Responder.objects.all().order_by('responder_id'),
        'user': request.user,
    }
    return render(request, 'admin/manage_responders.html', context)

def manage_facilities_view(request):
    """Renders the manage facilities page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    # Count facility users
    total_facilities = UserProfile.objects.filter(role='facility').count()
    # Assume operational if active
    operational_facilities = User.objects.filter(profile__role='facility', is_active=True).count()
    
    context = {
        'total_facilities': total_facilities,
        'operational_facilities': operational_facilities,
        'capacity_utilization': 78, # Placeholder
        'facilities': UserProfile.objects.filter(role='facility').select_related('user'),
        'user': request.user,
    }
    return render(request, 'admin/manage_facilities.html', context)

def view_all_incidents_view(request):
    """Renders the view all incidents page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    context = {
        'active_incidents': Incident.objects.filter(status__in=['open', 'in_progress']).count(),
        'total_today': Incident.objects.filter(created_at__date=datetime.now().date()).count(),
        'critical_incidents': Incident.objects.filter(severity='critical').count(),
        'incidents': Incident.objects.all().order_by('-created_at'),
        'user': request.user,
    }
    return render(request, 'admin/view_all_incidents.html', context)

def incident_reports_view(request):
    """Renders the incident reports page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    today = datetime.now()
    # Get statistics for user-reported incidents
    context = {
        'total_reports': Incident.objects.count(),  # Total user-reported incidents
        'reports_this_month': Incident.objects.filter(created_at__month=today.month, created_at__year=today.year).count(),
        'pending_reviews': Incident.objects.filter(status='open').count(),
        'downloads_today': 0,  # Placeholder, as we don't track downloads yet
        'reports': Incident.objects.all().order_by('-created_at'),
        'user': request.user,
    }
    return render(request, 'admin/incident_reports.html', context)

def approve_sellers_view(request):
    """Renders the approve sellers page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    context = {
        'pending_applications': UserProfile.objects.filter(role='seller', user__is_active=False).count(),
        'approved_today': UserProfile.objects.filter(role='seller', user__is_active=True, user__date_joined__date=datetime.now().date()).count(), # Approximation
        'rejected_today': 0, # No rejection tracking in model
        'total_sellers': UserProfile.objects.filter(role='seller').count(),
        'sellers': UserProfile.objects.filter(role='seller').select_related('user').order_by('-user__date_joined'),
        'user': request.user,
    }
    return render(request, 'admin/approve_sellers.html', context)

def marketplace_monitor_view(request):
    """Renders the marketplace monitor page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    total_revenue = Order.objects.aggregate(Sum('total_price'))['total_price__sum'] or 0
    
    context = {
        'total_orders': Order.objects.count(),
        'total_revenue': total_revenue,
        'active_listings': Product.objects.filter(status='active').count(),
        'active_sellers': UserProfile.objects.filter(role='seller').count(),
        'products': Product.objects.all().select_related('seller'),
        'user': request.user,
    }
    return render(request, 'admin/marketplace_monitor.html', context)

def system_reports_view(request):
    """Renders the system reports page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    today = datetime.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate stats
    total_incidents = Incident.objects.count()
    incidents_this_month = Incident.objects.filter(created_at__gte=month_start).count()
    
    # Calculate actual incident change percentage
    last_month_start = (month_start - timedelta(days=32)).replace(day=1)
    last_month_end = month_start - timedelta(days=1)
    incidents_last_month = Incident.objects.filter(created_at__gte=last_month_start, created_at__lte=last_month_end).count()
    
    if incidents_last_month > 0:
        incident_change = ((incidents_this_month - incidents_last_month) / incidents_last_month) * 100
    else:
        incident_change = 0.0
    
    total_users = User.objects.count()
    
    context = {
        'total_users': total_users,
        'user_growth': 12.5, # Mock
        'total_incidents': total_incidents,
        'incident_change': incident_change,
        'active_responders': Responder.objects.filter(status__in=['available', 'on_duty']).count(),
        'marketplace_items': Product.objects.count(),
        'reports': SystemReport.objects.all().order_by('-generated_at'),
        'user': request.user,
    }
    return render(request, 'admin/system_reports.html', context)

# Helper functions for delivery management
def get_random_carrier():
    """Generate a random carrier for demonstration."""
    carriers = ['FedEx', 'UPS', 'DHL', 'Local', 'USPS']
    return random.choice(carriers)

def generate_tracking_number(carrier):
    """Generate a mock tracking number based on carrier."""
    if carrier == 'FedEx':
        return f"FX{random.randint(100000000, 999999999)}"
    elif carrier == 'UPS':
        return f"1Z{random.randint(100000000000000000, 999999999999999999)}"
    elif carrier == 'DHL':
        return f"DLH{random.randint(100000000, 999999999)}"
    elif carrier == 'Local':
        return f"LOC{random.randint(100000000, 999999999)}"
    elif carrier == 'USPS':
        return f"USPS{random.randint(100000000, 999999999)}"
    return f"TRACK{random.randint(100000000, 999999999)}"

def get_random_priority():
    """Generate a random priority level."""
    priorities = ['Standard', 'Express', 'Overnight', 'Same Day']
    return random.choice(priorities)

def feedback_analysis_view(request):
    """Renders the feedback analysis page for admin users."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('aid_app:dashboard')
    
    # Calculate feedback stats
    total_feedback = Feedback.objects.count()
    positive = Feedback.objects.filter(rating__gte=4).count()
    neutral = Feedback.objects.filter(rating=3).count()
    negative = Feedback.objects.filter(rating__lte=2).count()
    
    context = {
        'total_feedback': total_feedback,
        'positive_feedback': positive,
        'neutral_feedback': neutral,
        'negative_feedback': negative,
        'feedbacks': Feedback.objects.all().select_related('user').order_by('-created_at'),
        'user': request.user,
    }
    return render(request, 'admin/feedback_analysis.html', context)

def add_guide_view(request):
    """View for facility managers to add new first aid guides."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Verify user is a facility manager
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'facility':
        messages.error(request, 'Access denied. Facility Manager privileges required.')
        return redirect('aid_app:dashboard')

    if request.method == 'POST':
        title = request.POST.get('title')
        urgency = request.POST.get('urgency')
        icon = request.POST.get('icon', 'health_and_safety')
        steps = request.POST.get('steps')
        
        if title and urgency and steps:
            try:
                FirstAidGuide.objects.create(
                    title=title,
                    urgency=urgency,
                    icon=icon,
                    steps=steps,
                    created_by=request.user
                )
                messages.success(request, 'New First Aid Guide added successfully!')
                return redirect('aid_app:facility_dashboard')
            except Exception as e:
                messages.error(request, f'Error adding guide: {e}')
        else:
            messages.error(request, 'Please fill in all required fields.')
            
    return render(request, 'facility_manager/add_guide_new.html')
