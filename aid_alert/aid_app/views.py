from django.shortcuts import render, redirect, get_object_or_404
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.db.models import Sum, Count, Avg, F, Min, Q
from django.db.models.functions import TruncHour, TruncDay, TruncMonth
from django.utils import timezone
from .models import UserProfile, MedicalKit, Responder, KitItem, Product, Incident, Order, Feedback, SystemReport, Facility, IncidentStatusHistory, ResponderAvailabilityHistory, Notification
from .forms import ProductForm, MedicalKitForm
from datetime import timedelta, datetime
import random
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import json

# Create your views here.

def home_view(request):
    """Renders the home page of the AidAlert application."""
    return render(request, 'common/home.html')



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
    try:
        user_role = request.user.profile.role
        if user_role == 'responder':
            return redirect('aid_app:responder_dashboard')
        elif user_role == 'facility' or user_role == 'facility_manager':
            return redirect('aid_app:facility_dashboard')
    except UserProfile.DoesNotExist:
        pass
    
    # Regular user dashboard
    # Fetch real data for dashboard stats
    active_incidents = Incident.objects.filter(user=request.user).exclude(status__in=['resolved', 'closed'])
    active_orders = Order.objects.filter(customer=request.user).exclude(status__in=['delivered', 'cancelled', 'returned'])
    
    active_reports_count = active_incidents.count()
    active_orders_count = active_orders.count()
    # Count incidents that have a responder assigned
    booked_responders_count = active_incidents.filter(assigned_responder__isnull=False).count()
    
    # Emergency contacts count
    emergency_contacts_count = 0
    try:
        if request.user.profile.emergency_contacts:
            # Check if likely comma or newline separated
            contacts_text = request.user.profile.emergency_contacts
            if ',' in contacts_text:
                emergency_contacts_count = len([c for c in contacts_text.split(',') if c.strip()])
            else:
                emergency_contacts_count = len([c for c in contacts_text.split('\n') if c.strip()])
    except:
        pass

    recent_incidents = Incident.objects.filter(user=request.user).order_by('-created_at')[:5]
    recent_orders = Order.objects.filter(customer=request.user).order_by('-created_at')[:5]

    context = {
        'active_reports_count': active_reports_count,
        'booked_responders_count': booked_responders_count, 
        'active_orders_count': active_orders_count,
        'emergency_contacts_count': emergency_contacts_count,
        'recent_incidents': recent_incidents,
        'recent_orders': recent_orders,
        'user': request.user,
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
    
    # Get all products for this seller
    seller_products = Product.objects.filter(seller=request.user)
    
    # Get all orders for this seller's products
    seller_orders = Order.objects.filter(product__seller=request.user)
    
    # Calculate stats
    total_revenue = seller_orders.exclude(status='cancelled').aggregate(total=Sum('total_price'))['total'] or 0
    total_orders = seller_orders.count()
    active_products = seller_products.filter(status='active').count()
    pending_deliveries = seller_orders.filter(status__in=['pending', 'processing', 'shipped']).count()
    
    # Get recent orders
    recent_orders = seller_orders.order_by('-created_at')[:5]
    
    # Get top performing products
    top_products = []
    for product in seller_products:
        product_orders = seller_orders.filter(product=product)
        units_sold = sum(order.quantity for order in product_orders)
        revenue = sum(order.total_price for order in product_orders)
        
        if units_sold > 0:
            top_products.append({
                'product': product,
                'units_sold': units_sold,
                'revenue': revenue
            })
    
    # Sort by revenue and take top 3
    top_products.sort(key=lambda x: x['revenue'], reverse=True)
    top_products = top_products[:3]
    
    context = {
        'total_revenue': total_revenue,
        'total_orders': total_orders,
        'active_products': active_products,
        'pending_deliveries': pending_deliveries,
        'recent_orders': recent_orders,
        'top_products': top_products,
        'user': request.user,
    }
    
    return render(request, 'seller/seller_dashboard.html', context)

def seller_report_view(request):
    """Renders the seller sales report page with real data."""
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

    # Helper to calculate metrics for a given date range
    def get_metrics(start_date, end_date):
        orders = Order.objects.filter(
            product__seller=request.user,
            created_at__range=(start_date, end_date)
        ).exclude(status='cancelled')
        
        total_revenue = orders.aggregate(total=Sum('total_price'))['total'] or 0
        total_orders = orders.count()
        # Avg Order Value & Unique Customers (already calculated effectively, but let's be explicitly robust)
        unique_customer_ids = list(orders.values_list('customer_id', flat=True).distinct())
        unique_customers_count = len(unique_customer_ids)
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # --- Customer Segments ---
        # 1. New vs Returning
        # New: First order ever is within this period (and they bought in this period)
        # Returning: First order ever was BEFORE this period
        
        # We need to look at the global first order for these specific active customers
        
        # Get these customers' global first order dates
        # optimized: filter orders by these customers, group by customer, get min created_at
        customer_first_orders = Order.objects.filter(
            customer_id__in=unique_customer_ids,
            product__seller=request.user 
        ).values('customer_id').annotate(first_seen=Min('created_at'))
        
        new_count = 0
        returning_count = 0
        
        for cdict in customer_first_orders:
            if cdict['first_seen'] >= start_date:
                new_count += 1
            else:
                returning_count += 1
                
        # VIP: Top 10% by spend in this period
        # Calculate spend per customer in this period
        customer_spends = orders.values('customer').annotate(
            spent=Sum('total_price')
        ).order_by('-spent')
        
        # Basic VIP def: top 10% of active customers
        vip_threshold_count = max(1, int(unique_customers_count * 0.1))
        vip_count = 0
        # If we have customers, the top N are VIPs. 
        # But this is just a count for the dashboard stats. 
        # Actually, "VIP" segment usually implies a persistent status, but let's base it on high spenders for now.
        if unique_customers_count > 0:
             # Count how many are in top 10%
             vip_count = vip_threshold_count # Simplified/Circular logic but fits "Top 10%" display
        
        # Calculate Percentages
        total_active_cust = unique_customers_count if unique_customers_count > 0 else 1
        segments = {
            'new_customers_pct': (new_count / total_active_cust) * 100,
            'returning_pct': (returning_count / total_active_cust) * 100,
            'vip_pct': (vip_count / total_active_cust) * 100
        }
        
        # --- Top Customers List ---
        # Reuse customer_spends, get top 3 with details
        top_customers_data = []
        top_qs = customer_spends[:3]
        for item in top_qs:
            # Need to fetch user object/name efficiently
            # We have customer ID.
            try:
                u = User.objects.get(id=item['customer'])
                name = u.get_full_name() or u.username
                top_customers_data.append({
                    'name': name,
                    'total_spent': item['spent']
                })
            except User.DoesNotExist:
                continue

        # Product Performance Aggregation
        product_stats = orders.values(
            'product__name', 'product__id'
        ).annotate(
            units_sold=Sum('quantity'),
            revenue=Sum('total_price')
        ).order_by('-revenue')[:5] # Top 5 products
        
        products_list = []
        for p in product_stats:
            products_list.append({
                'name': p['product__name'],
                'id': p['product__id'],
                'units_sold': p['units_sold'],
                'revenue': p['revenue'],
                'growth': '+0%', # Placeholder as product-level growth comparison is complex
                'trend': 'Stable'
            })

        return {
            'revenue': total_revenue,
            'orders': total_orders,
            'avg_order': avg_order_value,
            'customers': unique_customers_count,
            'orders_qs': orders, # Return queryset for chart data
            'products': products_list,
            'customer_segments': segments,
            'top_customers': top_customers_data
        }

    # Handle AJAX request for filtered data
    if request.headers.get('change_period') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        period = request.GET.get('period', 'today')
        today = timezone.now().date()
        
        # Determine date range
        if period == 'today':
            start_date = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = timezone.now()
            prev_start = start_date - timedelta(days=1)
            prev_end = end_date - timedelta(days=1)
            chart_labels = ["4 AM", "8 AM", "12 PM", "4 PM", "8 PM"] # Simplified for daily view
        elif period == 'week':
            start_date = timezone.now() - timedelta(days=7)
            end_date = timezone.now()
            prev_start = start_date - timedelta(days=7)
            prev_end = start_date
            chart_labels = [(end_date - timedelta(days=i)).strftime('%a') for i in range(6, -1, -1)]
        elif period == 'month':
            start_date = timezone.now() - timedelta(days=30)
            end_date = timezone.now()
            prev_start = start_date - timedelta(days=30)
            prev_end = start_date
            chart_labels = [(end_date - timedelta(days=i*5)).strftime('%d %b') for i in range(5, -1, -1)]
        elif period == 'year':
            start_date = timezone.now() - timedelta(days=365)
            end_date = timezone.now()
            prev_start = start_date - timedelta(days=365)
            prev_end = start_date
            chart_labels = [(end_date - timedelta(days=i*30)).strftime('%b') for i in range(11, -1, -1)]
        else:
            # Custom range or default
            start_date = timezone.now() - timedelta(days=30)
            end_date = timezone.now()
            prev_start = start_date - timedelta(days=30) # simplistic previous period
            prev_end = start_date
            chart_labels = []

        # Current Period Metrics
        current = get_metrics(start_date, end_date)
        
        # Previous Period Metrics
        previous = get_metrics(prev_start, prev_end)
        
        def calc_growth(current_val, prev_val):
            if prev_val == 0:
                return 100 if current_val > 0 else 0
            return ((current_val - prev_val) / prev_val) * 100

        metrics_data = {
            'revenue': current['revenue'],
            'orders': current['orders'],
            'avg_order': current['avg_order'],
            'customers': current['customers'],
            'growth': {
                'revenue': calc_growth(current['revenue'], previous['revenue']),
                'orders': calc_growth(current['orders'], previous['orders']),
                'avg_order': calc_growth(current['avg_order'], previous['avg_order']),
                'customers': calc_growth(current['customers'], previous['customers'])
            }
        }
        
        # Chart Data Construction
        chart_revenue = []
        chart_orders = []
        chart_customers = []
        chart_labels = [] 

        # We need to aggregate based on the period
        orders_for_chart = current['orders_qs']
        
        if period == 'today':
            # Hourly aggregation for today (or the selected single day)
            # Use 'hour' truncation
            chart_data = orders_for_chart.annotate(
                period_label=TruncHour('created_at')
            ).values('period_label').annotate(
                revenue=Sum('total_price'),
                orders_count=Count('id'),
                customers_count=Count('customer', distinct=True)
            ).order_by('period_label')
            
            # Categories: 4 AM, 8 AM, 12 PM, 4 PM, 8 PM
            relevant_hours = [4, 8, 12, 16, 20]
            chart_labels = ["4 AM", "8 AM", "12 PM", "4 PM", "8 PM"]
            chart_revenue = [0] * len(chart_labels)
            chart_orders = [0] * len(chart_labels)
            chart_customers = [0] * len(chart_labels)
            
            # Map DB results to these buckets (approximate)
            for entry in chart_data:
                hour = entry['period_label'].hour
                # Find closest bucket
                for i, target_hour in enumerate(relevant_hours):
                    if abs(hour - target_hour) <= 2: # Window of +/- 2 hours
                       chart_revenue[i] += float(entry['revenue'] or 0)
                       chart_orders[i] += int(entry['orders_count'] or 0)
                       chart_customers[i] += int(entry['customers_count'] or 0)
                       
        elif period == 'week':
            # Daily aggregation for the last 7 days
            chart_data = orders_for_chart.annotate(
                period_label=TruncDay('created_at')
            ).values('period_label').annotate(
                revenue=Sum('total_price'),
                orders_count=Count('id'),
                customers_count=Count('customer', distinct=True)
            ).order_by('period_label')
            
            # Generate last 7 days labels
            days_map = {}
            chart_labels = []
            chart_revenue = []
            chart_orders = []
            chart_customers = []
            
            for i in range(6, -1, -1):
                day_date = (timezone.now() - timedelta(days=i)).date()
                label = day_date.strftime('%a')
                chart_labels.append(label)
                days_map[day_date] = 0
                chart_revenue.append(0)
                chart_orders.append(0)
                chart_customers.append(0)

            # Fill data
            for entry in chart_data:
                d = entry['period_label'].date()
                if d in days_map:
                    # Find index
                    idx = list(days_map.keys()).index(d)
                    chart_revenue[idx] = float(entry['revenue'] or 0)
                    chart_orders[idx] = int(entry['orders_count'] or 0)
                    chart_customers[idx] = int(entry['customers_count'] or 0)

        elif period == 'month':
            # Interval aggregation (e.g., every 5 days)
            chart_data = orders_for_chart.annotate(
                period_label=TruncDay('created_at')
            ).values('period_label').annotate(
                revenue=Sum('total_price'),
                orders_count=Count('id'),
                customers_count=Count('customer', distinct=True)
            ).order_by('period_label')
            
            # 6 data points: 30 days / 5 = 6 points
            chart_labels = []
            chart_revenue = [0] * 6
            chart_orders = [0] * 6
            chart_customers = [0] * 6
            intervals = []
            
            now = timezone.now().date()
            for i in range(5, -1, -1):
                d = now - timedelta(days=i*5)
                chart_labels.append(d.strftime('%d %b'))
                intervals.append(d)
                
            for entry in chart_data:
                d = entry['period_label'].date()
                # Find which interval this belongs too
                for i, interval_start in enumerate(intervals):
                    # Check if date is within [interval_start - 2 days, interval_start + 2 days]
                    delta = (d - interval_start).days
                    if -2 <= delta <= 2:
                        chart_revenue[i] += float(entry['revenue'] or 0)
                        chart_orders[i] += int(entry['orders_count'] or 0)
                        chart_customers[i] += int(entry['customers_count'] or 0)

        elif period == 'year':
             # Monthly aggregation
            chart_data = orders_for_chart.annotate(
                period_label=TruncMonth('created_at')
            ).values('period_label').annotate(
                revenue=Sum('total_price'),
                orders_count=Count('id'),
                customers_count=Count('customer', distinct=True)
            ).order_by('period_label')
            
            chart_labels = []
            months_map = {}
            chart_revenue = []
            chart_orders = []
            chart_customers = []
            
            now = timezone.now().date()
            for i in range(11, -1, -1):
                # Approximation of months back
                d = (now.replace(day=1) - timedelta(days=i*30))
                label = d.strftime('%b')
                chart_labels.append(label)
                # Key is (year, month) tuple
                key = (d.year, d.month)
                months_map[key] = 0
                chart_revenue.append(0)
                chart_orders.append(0)
                chart_customers.append(0)

            for entry in chart_data:
                d = entry['period_label'].date()
                key = (d.year, d.month)
                lbl = d.strftime('%b')
                if lbl in chart_labels:
                    try:
                        idx = chart_labels.index(lbl)
                        chart_revenue[idx] = float(entry['revenue'] or 0)
                        chart_orders[idx] = int(entry['orders_count'] or 0)
                        chart_customers[idx] = int(entry['customers_count'] or 0)
                    except ValueError:
                         pass
        
        else:
            # Fallback / Custom Range
            chart_labels = ["Total"]
            chart_revenue = [float(current['revenue'])]
            chart_orders = [int(current['orders'])]
            chart_customers = [int(current['customers'])]
        
        data = {
            'success': True,
            'metrics': metrics_data,
            'chart': {
                'labels': chart_labels,
                'revenue': chart_revenue,
                'orders': chart_orders,
                'customers': chart_customers
            },
            'products': current['products'],
            'customer_segments': current['customer_segments'],
            'top_customers': current['top_customers']
        }
        return JsonResponse(data)

    # Initial Page Load (Defaults to 'today' or 'month' logic, but purely template render for now)
    # Most data comes via the initial AJAX call on page load or we can pre-populate context.
    # To avoid flicker, let's pre-populate "Today" stats.
    
    start_date = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = timezone.now()
    metrics = get_metrics(start_date, end_date)

    context = {
        'user': request.user,
        'user_profile': getattr(request.user, 'profile', None),
        'total_revenue': metrics['revenue'],
        'total_orders': metrics['orders'],
        'average_order_value': metrics['avg_order'],
        'unique_customers': metrics['customers'],
        'product_performance': metrics['products'],
        'customer_segments': metrics['customer_segments'],
        'top_customers': metrics['top_customers'],
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
        # Create a sample product if none exists so users can test immediately
        product = Product.objects.create(
            seller=request.user,
            name="Sample Medical Kit",
            description="Auto-generated sample product for demonstration.",
            price=49.99,
            stock_quantity=100,
            status='active',
            category='Medical Supplies',
            condition='New'
        )
        messages.info(request, 'Created a sample product "Sample Medical Kit" to generate orders.')
        seller_products = [product]
    else:
        # Convert queryset to list/iterable if not already
        pass
    
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
            product.status = 'active' # Explicitly set to active to ensure visibility
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

def update_product_view(request, product_id=None):
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
        product = get_object_or_404(Product, id=product_id, seller=request.user)
        
        form = ProductForm(request.POST, request.FILES, instance=product)
        if form.is_valid():
            form.save()
            messages.success(request, f'Product "{product.name}" updated successfully!')
            return redirect('aid_app:update_product')
        else:
            messages.error(request, 'Error updating product. Please check the form.')
    
    # Get all products for this seller
    products = Product.objects.filter(seller=request.user).order_by('-created_at')
    
    context = {
        'products': products,
        'user': request.user,
        'selected_product_id': product_id,
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
    
    # Check if user is seller or admin
    is_admin = request.user.is_staff or request.user.is_superuser
    
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller' and not is_admin:
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        if not is_admin:
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    
    # Get all orders
    if is_admin:
        orders = Order.objects.all().order_by('-created_at')
    else:
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
    
    if is_admin:
        return render(request, 'admin/view_orders.html', context)
    
    return render(request, 'seller/view_orders.html', context)

@login_required
def update_order_status(request, order_id, status):
    """Updates order status for Sellers/Admins."""
    ALLOWED_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
    
    if status not in ALLOWED_STATUSES:
        messages.error(request, 'Invalid status code.')
        return redirect('aid_app:view_orders')

    # Permission check: Admin or Seller owning the product
    order = get_object_or_404(Order, id=order_id)
    
    # Check if user is admin OR seller of the product
    is_admin = request.user.is_staff or request.user.is_superuser
    is_seller = order.product.seller == request.user
    
    if not (is_admin or is_seller):
        messages.error(request, 'Permission denied. You cannot update this order.')
        return redirect('aid_app:view_orders')
        
    # Logic Checks
    if status == 'cancelled' and order.status in ['shipped', 'delivered']:
         messages.error(request, 'Cannot cancel an order that has already been shipped or delivered.')
         return redirect(request.META.get('HTTP_REFERER', 'aid_app:view_orders'))

    order.status = status
    order.save()
    
    messages.success(request, f'Order #{order.order_id} status updated to {status.title()}.')
    return redirect(request.META.get('HTTP_REFERER', 'aid_app:view_orders'))

@login_required
def schedule_pickup_view(request):
    """Bulk updates 'pending' orders to 'processing' for the seller."""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
    
    try:
        # Get orders for this seller that are pending
        # Note: Order.product.seller is the owner
        updated_count = Order.objects.filter(
            product__seller=request.user, 
            status='pending'
        ).update(status='processing')
        
        if updated_count > 0:
            return JsonResponse({
                'status': 'success', 
                'message': f'Successfully scheduled pickup for {updated_count} orders.',
                'count': updated_count
            })
        else:
             return JsonResponse({
                'status': 'info', 
                'message': 'No pending orders found to schedule.',
                'count': 0
            })
            
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
def bulk_ship_view(request):
    """Bulk updates 'processing' orders to 'shipped' for the seller."""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
        
    try:
        # Get orders for this seller that are processing
        updated_count = Order.objects.filter(
            product__seller=request.user, 
            status='processing'
        ).update(status='shipped')
        
        if updated_count > 0:
            return JsonResponse({
                'status': 'success', 
                'message': f'Successfully shipped {updated_count} orders.',
                'count': updated_count
            })
        else:
             return JsonResponse({
                'status': 'info', 
                'message': 'No orders ready for shipping (must be in processing status).',
                'count': 0
            })

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def update_delivery_location(request):
    """Updates the location and status of a delivery."""
    try:
        import json
        data = json.loads(request.body)
        order_id = data.get('order_id')
        current_location = data.get('current_location')
        status = data.get('status')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        # Verify ownership
        order = Order.objects.get(id=order_id, product__seller=request.user)
        
        if current_location:
            order.current_location = current_location
        if status:
            order.status = status
        if latitude is not None:
            order.latitude = float(latitude)
        if longitude is not None:
            order.longitude = float(longitude)
            
        order.save()
        
        return JsonResponse({'status': 'success', 'message': 'Delivery location updated'})
    except Order.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Order not found or permission denied'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
def get_delivery_data(request):
    """Returns real-time delivery data for the map."""
    try:
        orders = Order.objects.filter(
            product__seller=request.user,
            status__in=['pending', 'processing', 'shipped', 'delivered']
        ).exclude(latitude__isnull=True, longitude__isnull=True)
        
        deliveries = []
        for order in orders:
            deliveries.append({
                'id': order.order_id,
                'status': order.status,
                'driver_name': order.carrier, # Using carrier as proxy for driver name
                'customer_name': order.customer.username,
                'current_lat': order.latitude,
                'current_lng': order.longitude,
                'location_name': order.current_location,
                # For demo purposes, we can simulate pickup/delivery coords if not set, 
                # but ideally these would be real.
                'pickup_lat': order.latitude, 
                'pickup_lng': order.longitude,
                'delivery_lat': order.latitude,
                'delivery_lng': order.longitude,
                'progress': 50 if order.status == 'shipped' else 0
            })
            
        return JsonResponse({'deliveries': deliveries})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
def manage_delivery_view(request):
    """Handles delivery management for seller users."""
    try:
        user_profile = request.user.profile
        if user_profile.role != 'seller':
            messages.error(request, 'Access denied. This page is for seller users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for seller users only.')
        return redirect('aid_app:dashboard')
    
    # Get all orders for this seller
    orders = Order.objects.filter(product__seller=request.user).order_by('-created_at')
    
    # Calculate delivery statistics
    total_deliveries = orders.count()
    pending_shipments = orders.filter(status='pending').count()
    in_transit = orders.filter(status__in=['processing', 'shipped']).count()
    delivered_today = orders.filter(status='delivered', updated_at__date=timezone.now().date()).count()
    
    context = {
        'deliveries': orders, # Pass actual queryset
        'total_deliveries': total_deliveries,
        'pending_shipments': pending_shipments,
        'in_transit': in_transit,
        'delivered_today': delivered_today,
    }
    
    return render(request, 'seller/manage_delivery.html', context)

def facility_dashboard_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your dashboard.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
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

    # Get Recent Activity
    recent_activity = []

    # 1. Incident Updates
    incident_updates = IncidentStatusHistory.objects.all().select_related('incident').order_by('-timestamp')[:5]
    for update in incident_updates:
        recent_activity.append({
            'type': 'incident',
            'title': f"Incident Update: {update.incident.get_incident_type_display()}",
            'description': update.notes,
            'timestamp': update.timestamp,
            'icon': 'assignment',
            'icon_color': 'blue'
        })

    # 2. Responder Updates
    responder_updates = ResponderAvailabilityHistory.objects.all().select_related('responder__user').order_by('-timestamp')[:5]
    for update in responder_updates:
        recent_activity.append({
            'type': 'responder',
            'title': 'Responder Status Update',
            'description': f"{update.responder.user.username}: {update.description}",
            'timestamp': update.timestamp,
            'icon': 'person',  # Generic person icon
            'icon_color': 'yellow'
        })

    # 3. New Kits
    new_kits = MedicalKit.objects.all().order_by('-created_at')[:5]
    for kit in new_kits:
        recent_activity.append({
            'type': 'kit',
            'title': 'New Kit Added',
            'description': f"Kit {kit.kit_id} added to inventory",
            'timestamp': kit.created_at,
            'icon': 'check_circle',
            'icon_color': 'green'
        })

    # Sort combined list by timestamp desc
    recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
    recent_activity = recent_activity[:5]
    
    context = {
        'total_kits': total_kits,
        'in_stock': available_kits,
        'low_stock': low_stock_kits,
        'active_responders': active_responders,
        'capacity_utilization': 78,
        'average_response_time': 8.5,
        'user': request.user,
        'recent_activity': recent_activity,
    }
    
    return render(request, 'facility manager/facility_dashboard.html', context)

def manage_kits_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    # Get real data from database
    kits_list = MedicalKit.objects.all().order_by('kit_id') # Order for consistent pagination
    available_kits = kits_list.filter(status='available').count()
    maintenance_kits = kits_list.filter(status='maintenance').count()
    
    # Pagination
    from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
    paginator = Paginator(kits_list, 10) # 10 kits per page
    page = request.GET.get('page')
    
    try:
        kits = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        kits = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        kits = paginator.page(paginator.num_pages)

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
        'form': MedicalKitForm(),
    }
    return render(request, 'facility manager/manage_kits.html', context)

@require_http_methods(["POST"])
def add_kit_api(request):
    try:
        data = json.loads(request.body)
        form = MedicalKitForm(data)
        if form.is_valid():
            kit = form.save()
            return JsonResponse({'success': True, 'message': 'Kit added successfully'})
        else:
            return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

@require_http_methods(["GET", "POST"])
def edit_kit_api(request, kit_id):
    kit = get_object_or_404(MedicalKit, kit_id=kit_id)
    
    if request.method == "GET":
        data = {
            'kit_id': kit.kit_id,
            'name': kit.name,
            'kit_type': kit.kit_type,
            'location': kit.location,
            'status': kit.status,
            'expiry_date': kit.expiry_date.strftime('%Y-%m-%d') if kit.expiry_date else None,
        }
        return JsonResponse({'success': True, 'kit': data})
    
    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            # Update fields manually or bind form with instance (if fields match)
            # Since kit_id is PK-like (unique), we might strictly control it, but let's allow updating common fields
            kit.name = data.get('name', kit.name)
            kit.kit_type = data.get('kit_type', kit.kit_type)
            kit.location = data.get('location', kit.location)
            kit.status = data.get('status', kit.status)
            if 'expiry_date' in data and data['expiry_date']:
                 kit.expiry_date = data['expiry_date']
            
            kit.save()
            return JsonResponse({'success': True, 'message': 'Kit updated successfully'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

@require_http_methods(["GET"])
def view_kit_api(request, kit_id):
    kit = get_object_or_404(MedicalKit, kit_id=kit_id)
    data = {
        'kit_id': kit.kit_id,
        'name': kit.name,
        'kit_type': kit.get_kit_type_display(),
        'location': kit.location,
        'status': kit.get_status_display(),
        'last_checked': kit.last_checked.strftime('%Y-%m-%d %H:%M'),
        'expiry_date': kit.expiry_date.strftime('%Y-%m-%d') if kit.expiry_date else 'N/A',
        'items_count': kit.items.count()
    }
    return JsonResponse({'success': True, 'kit': data})

@require_http_methods(["POST"])
def check_kit_api(request, kit_id):
    kit = get_object_or_404(MedicalKit, kit_id=kit_id)
    kit.save() # Updates auto_now=True field 'last_checked' / 'updated_at'
    return JsonResponse({'success': True, 'message': 'Kit checked successfully', 'last_checked': kit.updated_at.strftime('%Y-%m-%d %H:%M')})

def stock_tracking_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    from django.db.models import F # Fix UnboundLocalError by importing at top of function logic
    
    # Calculate stats
    kit_items = KitItem.objects.all().select_related('kit')
    total_items = kit_items.count()
    in_stock = kit_items.filter(quantity__gt=F('min_quantity')).count()
    low_stock = kit_items.filter(quantity__lte=F('min_quantity'), quantity__gt=0).count()
    out_of_stock = kit_items.filter(quantity=0).count()
    
    # Calculate chart data (Stock Distribution by Kit Type)
    chart_data = list(KitItem.objects.values('kit__kit_type')
                      .annotate(total_qty=Sum('quantity'))
                      .order_by('-total_qty'))
    
    # Map kit types to readable names
    kit_type_labels = dict(MedicalKit.KIT_TYPE_CHOICES)
    
    # Prepare data for template (and calculate max for scaling)
    processed_chart_data = []
    max_val = 0
    for entry in chart_data:
        qty = entry['total_qty'] or 0 # Handle None if no items
        if qty > max_val:
            max_val = qty
        processed_chart_data.append({
            'label': kit_type_labels.get(entry['kit__kit_type'], entry['kit__kit_type']),
            'value': qty
        })
    
    # Calculate percentages for bar heights
    for entry in processed_chart_data:
        entry['height_percent'] = (entry['value'] / max_val * 100) if max_val > 0 else 0
        
    # Get all unique kit names for the category filter
    categories = KitItem.objects.values_list('kit__name', flat=True).distinct().order_by('kit__name')

    # FILTERING
    selected_category = request.GET.get('category', '')
    selected_status = request.GET.get('status', '')

    if selected_category:
        kit_items = kit_items.filter(kit__name=selected_category)
    
    if selected_status:
        if selected_status == 'out-of-stock':
            kit_items = kit_items.filter(quantity=0)
        elif selected_status == 'low-stock':
             # This is a bit complex in basic Django filtering without F expressions annotation given min_quantity is a field
             # We can iterate or use F object. Let's use F object for efficiency.
             from django.db.models import F
             kit_items = kit_items.filter(quantity__lte=F('min_quantity'), quantity__gt=0)
        elif selected_status == 'in-stock':
             from django.db.models import F
             kit_items = kit_items.filter(quantity__gt=F('min_quantity'))

    # PAGE PAGINATION 
    from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
    page = request.GET.get('page', 1)
    paginator = Paginator(kit_items, 10) # Show 10 items per page
    try:
        items_page = paginator.page(page)
    except PageNotAnInteger:
        items_page = paginator.page(1)
    except EmptyPage:
        items_page = paginator.page(paginator.num_pages)

    context = {
        'user': request.user,
        'items': items_page, # Pass the page object instead of full list
        'total_items': total_items, # Note: statistics (charts/cards) still reflect TOTAL inventory, not filtered view, which is usually desired behavior
        'in_stock': in_stock,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
        'chart_data': processed_chart_data,
        'max_val': max_val,
        'categories': categories,
        'selected_category': selected_category,
        'selected_status': selected_status,
    }
    return render(request, 'facility manager/stock_tracking.html', context)


@login_required
@require_http_methods(["POST"])
def update_stock_api(request):
    try:
        data = json.loads(request.body)
        item_id = data.get('item_id')
        new_quantity = data.get('quantity')

        if not item_id or new_quantity is None:
            return JsonResponse({'success': False, 'message': 'Missing item_id or quantity'})

        # Facility manager check (optional stricter check here)
        
        item = get_object_or_404(KitItem, id=item_id)
        
        # Ensure item belongs to detailed facility check if needed, but Kits are linked to location
        
        item.quantity = int(new_quantity)
        item.save()

        status = 'In Stock'
        status_class = 'status-available'
        if item.quantity == 0:
            status = 'Out of Stock'
            status_class = 'status-expired'
        elif item.quantity <= item.min_quantity:
            status = 'Low Stock'
            status_class = 'status-maintenance'

        return JsonResponse({
            'success': True,
            'message': 'Stock updated successfully',
            'new_status': status,
            'status_class': status_class,
            'updated_at': timezone.now().strftime("%I:%M %p") # or similar format
        })
    except ValueError:
         return JsonResponse({'success': False, 'message': 'Invalid quantity format'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@login_required # Ideally should be here
def assign_responders_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    # Fetch Responders
    # To support server-side filtering combined with pagination if needed later (or now if we want to be thorough),
    # we can filter here. For now, just pagination on the full list as requested + basic search if param exists.
    responders_list = Responder.objects.all().order_by('-status', 'user__username') 
    
    # Optional: Basic backend filter support (works with pagination)
    search_query = request.GET.get('search', '')
    status_filter = request.GET.get('status', '')
    
    if search_query:
        from django.db.models import Q
        responders_list = responders_list.filter(
            Q(user__first_name__icontains=search_query) | 
            Q(user__last_name__icontains=search_query) | 
            Q(user__username__icontains=search_query) 
            # Add role search if role was a model field, it's a choice field so simpler string match might not work directly for display value easily in DB query without annotations
        )
    
    if status_filter and status_filter in ['available', 'on_duty', 'unavailable']:
         responders_list = responders_list.filter(status=status_filter.replace('-', '_')) # e.g. on-duty -> on_duty

    # Calculate stats (Always based on FULL list)
    all_responders = Responder.objects.all()
    total_responders = all_responders.count()
    available_responders = all_responders.filter(status='available').count()
    on_duty_responders = all_responders.filter(status='on_duty').count()
    unavailable_responders = all_responders.filter(status='unavailable').count()
    
    # Pagination
    from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
    page_number = request.GET.get('page', 1)
    paginator = Paginator(responders_list, 15) # 15 items per page (5 rows x 3 cols)
    
    try:
        responders = paginator.page(page_number)
    except PageNotAnInteger:
        responders = paginator.page(1)
        page_number = 1
    except EmptyPage:
        responders = paginator.page(paginator.num_pages)
        page_number = paginator.num_pages

    # Get elided page range (1, 2, ..., 10)
    custom_page_range = paginator.get_elided_page_range(responders.number, on_each_side=1, on_ends=1)

    # Fetch Active Assignments (Incidents that are active and have a responder)
    active_statuses = ['en_route', 'on_scene', 'providing_aid', 'transporting']
    active_assignments = Incident.objects.filter(
        assigned_responder__isnull=False,
        status__in=active_statuses
    ).select_related('assigned_responder', 'assigned_responder__user').order_by('-updated_at')
    
    context = {
        'user': request.user,
        'responders': responders, # This is now a Page object
        'custom_page_range': custom_page_range, # For ellipses pagination
        'total_responders': total_responders,
        'available_responders': available_responders,
        'on_duty_responders': on_duty_responders,
        'unavailable_responders': unavailable_responders,
        'active_assignments': active_assignments,
        'search_query': search_query,
        'status_filter': status_filter,
    }
    return render(request, 'facility manager/assign_responders.html', context)

@require_http_methods(["POST"])
def create_assignment_api(request):
    try:
        data = json.loads(request.body)
        incident_type = data.get('incident_type')
        severity = data.get('severity')
        location = data.get('location')
        description = data.get('description')
        responder_id = data.get('responder_id')
        
        # Create Incident
        incident = Incident.objects.create(
            user=request.user, # Facility manager as reporter
            incident_type=incident_type,
            severity=severity,
            location=location,
            description=description,
            contact_phone=request.user.profile.phone or 'N/A', # Use facility phone
            status='open'
        )
        
        # Assign Responder if selected
        if responder_id:
            responder = Responder.objects.get(pk=responder_id)
            incident.assigned_responder = responder
            incident.status = 'en_route' # Assume en route upon immediate assignment
            incident.save()
            
            # Update Responder Status
            responder.status = 'on_duty'
            responder.save()
            
        return JsonResponse({'success': True, 'message': 'Assignment created successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@login_required
def facility_incident_log_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    # Calculate Stats
    today = timezone.now().date()
    all_incidents = Incident.objects.all()
    
    total_incidents = all_incidents.count()
    critical_incidents = all_incidents.filter(severity='critical').count()
    high_priority_incidents = all_incidents.filter(severity='high').count()
    resolved_today = all_incidents.filter(status='resolved', updated_at__date=today).count()
    
    # Chart Data 1: Incidents by Type
    from django.db.models import Count
    type_counts = all_incidents.values('incident_type').annotate(count=Count('incident_type')).order_by('-count')
    
    # Process for template (calculate percentages)
    incidents_by_type = []
    max_count = 0
    if type_counts:
        max_count = type_counts[0]['count']
        
    for item in type_counts:
        count = item['count']
        percentage = (count / total_incidents * 100) if total_incidents > 0 else 0
        incidents_by_type.append({
            'type': item['incident_type'],
            'label': dict(Incident.INCIDENT_TYPE_CHOICES).get(item['incident_type'], item['incident_type']),
            'count': count,
            'percentage': percentage,
            'width_percentage': (count / max_count * 100) if max_count > 0 else 0
        })
        
    # Chart Data 2: Severity Distribution
    severity_counts = all_incidents.values('severity').annotate(count=Count('severity'))
    severity_map = {item['severity']: item['count'] for item in severity_counts}
    
    severity_distribution = {
        'critical': severity_map.get('critical', 0),
        'high': severity_map.get('high', 0),
        'medium': severity_map.get('medium', 0),
        'low': severity_map.get('low', 0),
    }

    # Main Incident List
    incidents = all_incidents.order_by('-created_at')

    context = {
        'user': request.user,
        'incidents': incidents,
        'total_incidents': total_incidents,
        'critical_incidents': critical_incidents,
        'high_priority_incidents': high_priority_incidents,
        'resolved_today': resolved_today,
        'incidents_by_type': incidents_by_type,
        'severity_distribution': severity_distribution,
    }
    return render(request, 'facility manager/facility_incident_log.html', context)

def facility_reports_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    if not hasattr(request.user, 'profile') or (request.user.profile.role != 'facility' and request.user.profile.role != 'facility_manager'):
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')

    # Date Filtering Logic
    period = request.GET.get('period', 'month')
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    
    today = timezone.now().date()
    end_date = today
    start_date = today - timedelta(days=30) # Default to month

    if period == 'week':
        start_date = today - timedelta(days=7)
    elif period == 'month':
        start_date = today - timedelta(days=30)
    elif period == 'quarter':
        start_date = today - timedelta(days=90)
    elif period == 'year':
        start_date = today - timedelta(days=365)
    elif period == 'custom' and start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass # Fallback to default
            
    # Previous Period for Comparison (simple logic: same duration shifted back)
    duration = (end_date - start_date).days
    prev_end_date = start_date - timedelta(days=1)
    prev_start_date = prev_end_date - timedelta(days=duration)

    # Base Queryset
    incidents = Incident.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
    prev_incidents = Incident.objects.filter(created_at__date__gte=prev_start_date, created_at__date__lte=prev_end_date)

    # --- CSV Export ---
    if request.GET.get('export') == 'csv':
        import csv
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="facility_report_{start_date}_{end_date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Incident ID', 'Type', 'Severity', 'Location', 'Status', 'Reported At', 'Resolved At', 'Responder'])
        
        for inc in incidents:
            writer.writerow([
                inc.incident_id,
                inc.get_incident_type_display(),
                inc.get_severity_display(),
                inc.location,
                inc.get_status_display(),
                inc.created_at.strftime('%Y-%m-%d %H:%M'),
                inc.resolved_at.strftime('%Y-%m-%d %H:%M') if inc.resolved_at else '-',
                inc.assigned_responder.user.get_full_name() if inc.assigned_responder else 'Unassigned'
            ])
        return response

    # --- Statistics Calculation ---
    total_incidents = incidents.count()
    prev_total = prev_incidents.count()
    
    # Critical Incidents
    critical_incidents = incidents.filter(severity='critical').count()
    prev_critical = prev_incidents.filter(severity='critical').count()
    
    # Response Rate (Resolved / Total)
    resolved_count = incidents.filter(status='resolved').count()
    response_rate = (resolved_count / total_incidents * 100) if total_incidents > 0 else 0
    
    prev_resolved = prev_incidents.filter(status='resolved').count()
    prev_rate = (prev_resolved / prev_total * 100) if prev_total > 0 else 0
    
    # Avg Response Time (only for resolved incidents with response time)
    response_times = []
    for inc in incidents:
        if inc.resolved_at and inc.created_at:
            mins = (inc.resolved_at - inc.created_at).total_seconds() / 60
            response_times.append(mins)
    
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    
    prev_times = []
    for inc in prev_incidents:
        if inc.resolved_at and inc.created_at:
            mins = (inc.resolved_at - inc.created_at).total_seconds() / 60
            prev_times.append(mins)
    prev_avg_time = sum(prev_times) / len(prev_times) if prev_times else 0

    # formatting changes
    total_change = ((total_incidents - prev_total) / prev_total * 100) if prev_total > 0 else 0
    critical_change = critical_incidents - prev_critical # Absolute change provided in design
    rate_change = response_rate - prev_rate
    time_change = avg_response_time - prev_avg_time

    # --- Charts Data ---
    
    # 1. Distribution by Type
    type_stats = incidents.values('incident_type').annotate(count=Count('id')).order_by('-count')
    # Initialize with all model choices to ensure 0-counts are shown if desired, or at least consistent color mapping order
    dist_data = {t: 0 for t in ['medical', 'fire', 'accident', 'crime', 'natural', 'other']}
    for stat in type_stats:
        t_key = stat['incident_type']
        dist_data[t_key] = stat['count']
    
    dist_list = []
    current_rotation = 0
    for key, count in dist_data.items():
        if count > 0: # Only show non-zero in distribution list/pie? Or all? 
                      # HTML Legend handles empty check? No, loop shows all unless filtered.
                      # Let's show all for clarity or filter 0? 
                      # Prompt doesn't specify. Standard is exclude 0 from Pie, include in table. 
                      # I'll keep all for now to match chart keys.
            pct = (count / total_incidents * 100) if total_incidents > 0 else 0
            dist_list.append({
                'label': key.capitalize() if key != 'crime' else 'Security/Crime', # Nicer label
                'key': key, 
                'count': count,
                'pct': round(pct, 1),
            })
    
    # Sort dist_list by count desc
    dist_list.sort(key=lambda x: x['count'], reverse=True)

    # 2. Trends (Vol Over Time) - Last 7 days of the selected range (or filtered view)
    chart_start = end_date - timedelta(days=6)
    chart_incidents = Incident.objects.filter(created_at__date__gte=chart_start, created_at__date__lte=end_date)
    
    daily_stats = {} 
    d_ptr = chart_start
    while d_ptr <= end_date:
        daily_stats[d_ptr.strftime('%Y-%m-%d')] = {t: 0 for t in ['medical', 'fire', 'accident', 'crime', 'natural', 'other']}
        d_ptr += timedelta(days=1)
        
    for inc in chart_incidents:
        d_key = inc.created_at.strftime('%Y-%m-%d')
        t_key = inc.incident_type
        if d_key in daily_stats and t_key in daily_stats[d_key]:
            daily_stats[d_key][t_key] += 1
            
    trend_chart_data = []
    # Find global max for scaling
    max_daily = 1
    for counts in daily_stats.values():
        total = sum(counts.values())
        if total > max_daily: max_daily = total

    for d_str, counts in daily_stats.items():
        dt = datetime.strptime(d_str, '%Y-%m-%d')
        # Calculate height percentages relative to max_daily
        display_counts = {}
        for t, c in counts.items():
            display_counts[t] = int((c / max_daily * 100) if max_daily > 0 else 0)
            
        trend_chart_data.append({
            'label': dt.strftime('%a'),
            'counts': display_counts, # These are now percentages for CSS height
            'raw_counts': counts
        })

    # --- Top Performers ---
    # Annotate with resolved count for now
    top_responders = Responder.objects.annotate(
        completed_count=Count('assigned_incidents', filter=Q(assigned_incidents__status='resolved'))
    ).order_by('-completed_count')[:4]
    
    context = {
        'user': request.user,
        'period': period,
        'start_date': start_date,
        'end_date': end_date,
        'filters': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d')
        },
        
        # Stats
        'total_incidents': total_incidents,
        'total_change': round(abs(total_change), 1),
        'total_change_val': total_change, # Signed
        'total_change_pos': total_change >= 0,
        
        'response_rate': round(response_rate, 1),
        'rate_change': round(abs(rate_change), 1),
        'rate_change_pos': rate_change >= 0,
        
        'avg_response_time': round(avg_response_time, 1),
        'time_change': round(abs(time_change), 1),
        'time_change_pos': time_change <= 0, # Faster is better (neg change in time is good)
        
        'critical_incidents': critical_incidents,
        'critical_change': abs(critical_change),
        'critical_change_pos': critical_change <= 0, # Fewer criticals is good
        
        # Charts
        'trend_data': trend_chart_data,
        'dist_list': dist_list,
        'top_responders': top_responders,
        'max_daily_incidents': max_daily # For Y-Axis labels if needed
    }
    return render(request, 'facility manager/facility_reports.html', context)

@login_required
def facility_notifications_view(request):
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    # Get user's notifications
    all_notifs = Notification.objects.filter(recipient=request.user).order_by('-created_at')
    
    # Active = Unread
    active_notifications = all_notifs.filter(is_read=False)
    
    # History = Read (Last 20)
    history_notifications = all_notifs.filter(is_read=True)[:20]

    # Stats
    critical_alerts = active_notifications.filter(notification_type='critical').count()
    high_priority = active_notifications.filter(notification_type='high').count()
    info_alerts = active_notifications.filter(notification_type='info').count()
    
    # Resolved Today (Incidents)
    today = timezone.now().date()
    resolved_today = Incident.objects.filter(resolved_at__date=today).count()

    context = {
        'notifications': active_notifications,
        'history_notifications': history_notifications,
        'critical_alerts': critical_alerts,
        'high_priority': high_priority,
        'info_alerts': info_alerts,
        'resolved_today': resolved_today,
    }
    return render(request, 'facility manager/facility_notifications.html', context)

@login_required
def mark_notification_read(request, notification_id):
    if request.method == 'POST':
        notif = get_object_or_404(Notification, id=notification_id, recipient=request.user)
        notif.is_read = True
        notif.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def mark_all_notifications_read(request):
    if request.method == 'POST':
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)

def facility_profile_view(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
            messages.error(request, 'Access denied. This page is for facility users only.')
            return redirect('aid_app:dashboard')
    except:
        messages.error(request, 'Access denied. This page is for facility users only.')
        return redirect('aid_app:dashboard')
    
    if request.method == 'POST':
        try:
            # 1. Handle Password Change
            new_password = request.POST.get('password')
            if new_password:
                import re
                if len(new_password) < 8:
                     messages.error(request, 'Password must be at least 8 characters long.')
                elif request.user.check_password(new_password):
                     messages.error(request, 'New password cannot be the same as your old password.')
                elif not re.search(r"[!@#$%^&*(),.?\":{}|<>]", new_password):
                     messages.error(request, 'Password must contain at least one special character.')
                else:
                    request.user.set_password(new_password)
                    request.user.save()
                    from django.contrib.auth import update_session_auth_hash
                    update_session_auth_hash(request, request.user)
                    messages.success(request, 'Password updated successfully.')

            # 2. Handle Facility Info Update
            facility_name = request.POST.get('facility_name')
            address = request.POST.get('address')
            contact_number = request.POST.get('contact_number')
            capacity = request.POST.get('capacity')

            # Update User Profile
            if hasattr(request.user, 'facility_profile'):
                facility_profile = request.user.facility_profile
                
                # Check keys in POST instead of values to allow clearing fields
                if 'facility_name' in request.POST:
                    facility_profile.facility_name = request.POST.get('facility_name')
                if 'address' in request.POST:
                    facility_profile.address = request.POST.get('address')
                if 'phone' in request.POST:
                    request.user.profile.phone = request.POST.get('phone')
                    request.user.profile.save()
                if 'capacity' in request.POST:
                    facility_profile.capacity = request.POST.get('capacity')
                
                facility_profile.save()
                messages.success(request, 'Facility information updated successfully.')
                
            return redirect('aid_app:facility_profile')
            
        except Exception as e:
            messages.error(request, f'Error updating profile: {str(e)}')
            
    context = {
        'user': request.user,
    }
    return render(request, 'facility manager/facility_profile.html', context)

@login_required
@require_http_methods(["POST"])
def delete_facility_account(request):
    from django.contrib.auth import logout
    user = request.user
    logout(request)
    user.delete()
    return redirect('aid_app:login')

@login_required
def add_guide_view(request):
    """View to add a new First Aid Guide."""
    from .models import FirstAidGuide
    
    # Check if user is facility
    try:
        user_profile = request.user.profile
        if user_profile.role != 'facility' and user_profile.role != 'facility_manager':
            messages.error(request, 'Access denied. Only facility managers can add guides.')
            return redirect('aid_app:facility_dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. Only facility managers can add guides.')
        return redirect('aid_app:facility_dashboard')

    if request.method == 'POST':
        title = request.POST.get('title')
        urgency = request.POST.get('urgency')
        icon = request.POST.get('icon')
        steps = request.POST.get('steps')
        
        if title and urgency and steps:
            try:
                FirstAidGuide.objects.create(
                    created_by=request.user,
                    title=title,
                    urgency=urgency,
                    icon=icon if icon else 'health_and_safety',
                    steps=steps
                )
                messages.success(request, 'First Aid Guide added successfully!')
                return redirect('aid_app:facility_dashboard')
            except Exception as e:
                messages.error(request, f'Error adding guide: {str(e)}')
        else:
            messages.error(request, 'Please fill in all required fields.')
            
    return render(request, 'facility manager/add_guide_new.html')

def responder_dashboard_view(request):
    """Renders the responder dashboard."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access your dashboard.')
        return redirect('aid_app:login')
    
    # Check if user is responder using profile role
    try:
        user_role = request.user.profile.role
        if user_role != 'responder':
            messages.error(request, 'Access denied. This dashboard is for responders only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This dashboard is for responders only.')
        return redirect('aid_app:dashboard')
    
    today = timezone.now().date()
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    try:
        # data is created if not exists
        responder, created = Responder.objects.get_or_create(
            user=request.user,
            defaults={
                'responder_id': f'RES-{request.user.id:04d}',
                'phone': request.user.profile.phone or 'Pending',
                'status': 'available'
            }
        )
    except Exception as e:
        messages.error(request, f'Error loading responder profile: {str(e)}')
        return redirect('aid_app:dashboard')

    # Real Data Fetching
    # Active assignment: assigned and NOT in [open, resolved, closed]. 'Open' usually implies not yet accepted/en-route.
    active_assignment = Incident.objects.filter(
        assigned_responder=responder
    ).exclude(status__in=['open', 'resolved', 'closed']).first()
    
    recent_activity = Incident.objects.filter(
        assigned_responder=responder, 
        status__in=['resolved', 'closed']
    ).order_by('-updated_at')[:3]

    # --- Stats Calculation ---
    
    # 1. Available Today Calculation
    # Fetch history overlapping with today
    # We need history created today OR the last status before today
    history_today = ResponderAvailabilityHistory.objects.filter(
        responder=responder, 
        timestamp__gte=today_start
    ).order_by('timestamp')
    
    # Get status at start of day
    last_status_before_today = ResponderAvailabilityHistory.objects.filter(
        responder=responder,
        timestamp__lt=today_start
    ).order_by('-timestamp').first()
    
    initial_status = last_status_before_today.status if last_status_before_today else 'unavailable'
    
    current_time = timezone.now()
    total_available_seconds = 0
    
    # Calculate intervals
    timeline = []
    # Add start of day
    timeline.append({'time': today_start, 'status': initial_status})
    
    for h in history_today:
        timeline.append({'time': h.timestamp, 'status': h.status})
        
    # Add current moment
    timeline.append({'time': current_time, 'status': responder.status}) # responder.status should match last history if logic is consistent
    
    # Sum up 'available' intervals
    for i in range(len(timeline) - 1):
        segment_start = timeline[i]['time']
        segment_end = timeline[i+1]['time']
        segment_status = timeline[i]['status']
        
        if segment_status == 'available':
            total_available_seconds += (segment_end - segment_start).total_seconds()
            
    # Format availability
    avail_hours = int(total_available_seconds // 3600)
    avail_mins = int((total_available_seconds % 3600) // 60)
    available_today_str = f"{avail_hours}h {avail_mins}m"
    
    # 2. Incidents Handled Today
    incidents_handled_today = Incident.objects.filter(
        assigned_responder=responder, 
        status__in=['resolved', 'closed'],
        resolved_at__date=today
    ).count()
    
    # 3. Avg Response Time (Today)
    # Response Time = Time from Created to On Scene (or Resolved if no on scene)
    handled_incidents = Incident.objects.filter(
        assigned_responder=responder,
        status__in=['resolved', 'closed'],
        resolved_at__date=today
    )
    
    total_response_seconds = 0
    response_count = 0
    
    for inc in handled_incidents:
        start_time = inc.created_at
        end_time = inc.resolved_at # Default fall back
        
        # Try to find 'on_scene' time from history
        on_scene_history = inc.status_history.filter(status='on_scene').order_by('timestamp').first()
        if on_scene_history:
            end_time = on_scene_history.timestamp
            
        if start_time and end_time:
             diff = (end_time - start_time).total_seconds()
             total_response_seconds += diff
             response_count += 1
             
    avg_response_str = "0 min"
    if response_count > 0:
        avg_minutes = (total_response_seconds / response_count) / 60
        avg_response_str = f"{round(avg_minutes, 1)} min"

    # 4. Today's Rating
    from django.db.models import Avg
    todays_rating_val = Feedback.objects.filter(
        incident__assigned_responder=responder,
        created_at__date=today
    ).aggregate(Avg('rating'))['rating__avg']
    
    todays_rating_str = f"{round(todays_rating_val, 1)}/5" if todays_rating_val else "No Ratings"

    stats = {
        'available_today': available_today_str,
        'incidents_handled': incidents_handled_today,
        'avg_response_time': avg_response_str,
        'todays_rating': todays_rating_str,
        'total_completed': Incident.objects.filter(assigned_responder=responder, status__in=['resolved', 'closed']).count(), # Keep for generic if needed
    }
    
    context = {
        'stats': stats,
        'active_assignment': active_assignment,
        'recent_activity': recent_activity,
        'availability_status': responder.status,
        'user': request.user,
    }
    
    return render(request, 'responder/responder_dashboard.html', context)

def available_incidents_view(request):
    """Renders the available incidents page for responders."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    try:
        user_role = request.user.profile.role
        if user_role != 'responder':
            messages.error(request, 'Access denied. This page is for responders only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    try:
        responder, created = Responder.objects.get_or_create(
            user=request.user,
            defaults={
                'responder_id': f'RES-{request.user.id:04d}',
                'phone': request.user.profile.phone or 'Pending',
                'status': 'available'
            }
        )
    except Exception:
        return redirect('aid_app:dashboard')
    
    # Fetch open incidents that are not assigned
    incidents = Incident.objects.filter(status='open', assigned_responder__isnull=True).order_by('-created_at')
    
    context = {
        'incidents': incidents,
        'user': request.user,
        'responder': responder,
    }
    return render(request, 'responder/available_incidents.html', context)

def accept_incident_view(request):
    """Handles accepting an incident."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # 1. Get Responder Profile first
    try:
        responder, created = Responder.objects.get_or_create(
            user=request.user,
            defaults={
                'responder_id': f'RES-{request.user.id:04d}',
                'phone': request.user.profile.phone or 'Pending',
                'status': 'available'
            }
        )
    except Exception as e:
        messages.error(request, f'Error loading responder profile: {str(e)}')
        return redirect('aid_app:dashboard')

    # 2. Check for Active Assignment immediately
    # If they are already working on an incident, take them there.
    active_assignment = Incident.objects.filter(
        assigned_responder=responder
    ).exclude(status__in=['open', 'resolved', 'closed']).first()

    if active_assignment:
        # User already has an assignment, redirect to status update page
        return redirect('aid_app:update_incident_status')

    incident_id_str = request.GET.get('id') # Expecting full ID like INC-004 or just ID
    
    if not incident_id_str:
        messages.error(request, 'No incident ID provided.')
        return redirect('aid_app:available_incidents')

    # Extract numeric ID if string format is used (e.g. INC-001) or use as is
    incident_pk = incident_id_str.replace('INC-', '') if 'INC-' in incident_id_str else incident_id_str

    try:
        incident = Incident.objects.get(id=int(incident_pk))
    except (Incident.DoesNotExist, ValueError) as e:
        messages.error(request, 'Incident not found.')
        return redirect('aid_app:available_incidents')



    if incident.assigned_responder:
        messages.error(request, 'Incident already assigned to another responder.')
        return redirect('aid_app:available_incidents')

    # Assign
    incident.assigned_responder = responder
    incident.status = 'en_route' # Initial status when accepted
    incident.save()
    
    # Update responder status
    responder.status = 'on_duty' # or unavailable? usually 'on_duty' implies working on something
    responder.save()

    messages.success(request, f'Incident {incident.incident_id} accepted. Proceed to location.')
    return redirect('aid_app:responder_dashboard')

def update_incident_status_view(request):
    """Renders the update incident status page and handles updates."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    try:
        responder, created = Responder.objects.get_or_create(
            user=request.user,
            defaults={
                'responder_id': f'RES-{request.user.id:04d}',
                'phone': request.user.profile.phone or 'Pending',
                'status': 'available'
            }
        )
    except Exception:
        return redirect('aid_app:dashboard')

    # Get Active Assignment
    active_assignment = Incident.objects.filter(
        assigned_responder=responder
    ).exclude(status__in=['open', 'resolved', 'closed']).first()

    if request.method == 'POST':
        if not active_assignment:
            messages.error(request, 'No active assignment to update.')
            return redirect('aid_app:responder_dashboard')
            
        new_status = request.POST.get('status')
        notes = request.POST.get('notes', '')
        
        # Process Additional Actions
        actions = []
        if request.POST.get('backup_requested'):
            actions.append("Backup Requested")
        if request.POST.get('equipment_needed'):
            actions.append("Additional Equipment Needed")
        if request.POST.get('family_notified'):
            actions.append("Family Notified")
            
        if actions:
            action_str = " | Actions: " + ", ".join(actions)
            if notes:
                notes += f"\n{action_str}"
            else:
                notes = action_str

        # Map generic form values if necessary, but model now has granular ones suited for form values
        # Form values from template: en-route, on-scene, providing-aid, transporting, completed
        # Model choices: en_route, on_scene, providing_aid, transporting, resolved
        
        status_map = {
            'en-route': 'en_route',
            'on-scene': 'on_scene',
            'providing-aid': 'providing_aid',
            'transporting': 'transporting',
            'completed': 'resolved'
        }
        
        mapped_status = status_map.get(new_status)
        
        if mapped_status:
            active_assignment.status = mapped_status
            if notes:
                active_assignment._history_notes = notes
            active_assignment.save()
            messages.success(request, f'Status updated to {active_assignment.get_status_display()}.')
            
            if mapped_status == 'resolved':
                responder.status = 'available'
                responder.save()
                return redirect('aid_app:responder_dashboard')
        else:
            messages.error(request, 'Invalid status selected.')
            
        return redirect('aid_app:update_incident_status')

    # Fetch status history
    history = []
    if active_assignment:
        history = active_assignment.status_history.all()

    context = {
        'incident': active_assignment,
        'history': history,
        'user': request.user,
    }
    return render(request, 'responder/update_incident_status.html', context)

def responder_history_view(request):
    """Renders the responder history page."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    try:
        user_role = request.user.profile.role
        if user_role != 'responder':
            messages.error(request, 'Access denied. This page is for responders only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        return redirect('aid_app:dashboard')
    
    try:
        responder, created = Responder.objects.get_or_create(
            user=request.user,
            defaults={
                'responder_id': f'RES-{request.user.id:04d}',
                'phone': request.user.profile.phone or 'Pending',
                'status': 'available'
            }
        )
    except Exception:
        return redirect('aid_app:dashboard')
    
    # Fetch all assigned incidents
    incidents = Incident.objects.filter(assigned_responder=responder).order_by('-created_at')
    
    # Calculate stats
    total_incidents = incidents.count()
    completed = incidents.filter(status__in=['resolved', 'closed']).count()
    
    # Calculate Avg Response Time (Resolved Incidents)
    resolved_incidents = incidents.filter(status__in=['resolved', 'closed'], resolved_at__isnull=False)
    avg_response_str = "0m"
    
    if resolved_incidents.exists():
        total_minutes = 0
        count_time = 0
        for inc in resolved_incidents:
            if inc.created_at and inc.resolved_at:
                diff = inc.resolved_at - inc.created_at
                total_minutes += diff.total_seconds() / 60
                count_time += 1
        
        if count_time > 0:
            avg_minutes = total_minutes / count_time
            if avg_minutes >= 60:
                hours = int(avg_minutes // 60)
                mins = int(avg_minutes % 60)
                avg_response_str = f"{hours}h {mins}m"
            else:
                avg_response_str = f"{int(avg_minutes)}m"

    # Calculate Avg Rating (based on approved feedback)
    from django.db.models import Avg
    feedback_qs = Feedback.objects.filter(
        incident__assigned_responder=responder
    ).exclude(status='pending')
    
    avg_rating = feedback_qs.aggregate(Avg('rating'))['rating__avg']
    rating_val = round(avg_rating, 1) if avg_rating else "No Ratings"

    context = {
        'incidents': incidents,
        'stats': {
            'total': total_incidents,
            'completed': completed,
            'avg_response': avg_response_str,
            'rating': rating_val
        },
        'user': request.user,
    }
    return render(request, 'responder/responder_history.html', context)

def availability_status_view(request):
    """Renders the availability status page for responders."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    try:
        user_role = request.user.profile.role
        if user_role != 'responder':
            messages.error(request, 'Access denied. This page is for responders only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
        messages.error(request, 'Access denied. This page is for responders only.')
        return redirect('aid_app:dashboard')
    
    try:
        responder, created = Responder.objects.get_or_create(
            user=request.user,
            defaults={
                'responder_id': f'RES-{request.user.id:04d}',
                'phone': request.user.profile.phone or 'Pending',
                'status': 'available'
            }
        )
    except Exception:
        return redirect('aid_app:dashboard')
    
    # Fetch status history
    history = responder.status_history.all()[:5]

    context = {
        'user': request.user,
        'responder': responder,
        'history': history
    }
    return render(request, 'responder/availability_status.html', context)

from django.http import JsonResponse
from django.views.decorators.http import require_POST

@require_POST
def toggle_responder_status(request):
    """API endpoint to toggle responder status between 'available' and 'unavailable'."""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=401)
        
    try:
        responder, created = Responder.objects.get_or_create(
            user=request.user,
            defaults={
                'responder_id': f'RES-{request.user.id:04d}',
                'phone': request.user.profile.phone or 'Pending',
                'status': 'available'
            }
        )
        
        # Parse body or simpler: just toggle based on current state
        # If currently available -> make unavailable
        # If currently unavailable -> make available
        # If on_duty -> do not allow toggle (must complete incident first)
        
        if responder.status == 'on_duty':
            return JsonResponse({'success': False, 'error': 'Cannot change status while on duty.'})
            
        import json
        data = json.loads(request.body)
        desired_active = data.get('active', False)
        
        new_status = 'available' if desired_active else 'unavailable'
        responder.status = new_status
        responder.save()
        
        return JsonResponse({'success': True, 'status': new_status})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def responder_profile_view(request):
    """Renders the responder profile page."""
    if not request.user.is_authenticated:
        messages.error(request, 'Please login to access this page.')
        return redirect('aid_app:login')
    
    try:
        user_role = request.user.profile.role
        if user_role != 'responder':
            messages.error(request, 'Access denied. This page is for responders only.')
            return redirect('aid_app:dashboard')
    except UserProfile.DoesNotExist:
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
    
    try:
        # Check role
        if request.user.profile.role != 'responder':
            messages.error(request, 'Access denied. This page is for responders only.')
            return redirect('aid_app:dashboard')
        
        # Get Responder Profile
        responder, created = Responder.objects.get_or_create(user=request.user, defaults={
            'responder_id': f'RES-{request.user.id:04d}',
            'phone': request.user.profile.phone or 'Pending'
        })
    except Exception:
        messages.error(request, 'Error accessing responder profile.')
        return redirect('aid_app:dashboard')
    
    # Handle Reply POST
    if request.method == 'POST':
        feedback_id = request.POST.get('feedback_id')
        reply_message = request.POST.get('reply_message')
        
        if feedback_id and reply_message:
            try:
                # Ensure the feedback is for an incident assigned to this responder
                # This prevents deleting/modifying others' feedback, and enforces "Reply Only"
                feedback = Feedback.objects.get(id=feedback_id, incident__assigned_responder=responder)
                feedback.reply = reply_message
                feedback.replied_at = timezone.now()
                feedback.status = 'replied'
                feedback.save()
                messages.success(request, 'Reply sent successfully.')
            except Feedback.DoesNotExist:
                messages.error(request, 'Feedback not found or you are not authorized to reply.')
            except Exception as e:
                messages.error(request, f'Error sending reply: {str(e)}')
        return redirect('aid_app:feedback_received')

    # Fetch Feedback linked to this responder's incidents
    from django.db.models import Avg, Count
    
    feedback_qs = Feedback.objects.filter(incident__assigned_responder=responder).select_related('user', 'incident').order_by('-created_at')
    
    # Calculate Stats
    total_feedback = feedback_qs.count()
    avg_rating_val = feedback_qs.aggregate(Avg('rating'))['rating__avg'] or 0.0
    
    positive_reviews = feedback_qs.filter(rating__gte=4).count()
    positive_rate = int((positive_reviews / total_feedback) * 100) if total_feedback > 0 else 0
    
    # Recent (last 30 days)
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    recent_count = feedback_qs.filter(created_at__gte=thirty_days_ago).count()
    
    stats = {
        'total': total_feedback,
        'rating': round(avg_rating_val, 1),
        'positive_rate': positive_rate,
        'recent': recent_count
    }
    
    context = {
        'user': request.user,
        'feedback_list': feedback_qs,
        'stats': stats,
        'responder': responder
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
            elif user_role == 'facility' or user_role == 'facility_manager':
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
        email = request.POST.get('email')
        username = email # Use email as username
        phone = request.POST.get('phone')
        country_code = request.POST.get('country_code', '+91')
        gender = request.POST.get('gender')
        user_role = request.POST.get('user_role')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        
        # Strip potential trailing whitespace usually caused by mobile autocorrect
        if password:
            password = password.strip()
        if confirm_password:
            confirm_password = confirm_password.strip()

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
        if not all([first_name, last_name, email, phone, user_role, password, confirm_password]):
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
                full_phone = f"{country_code} {phone}" if phone else None
                
                # Auto-detect country from phone code
                country_map = {
                    '+91': 'India',
                    '+1': 'USA',
                    '+44': 'UK',
                    '+61': 'Australia',
                    '+81': 'Japan'
                }
                country_name = country_map.get(country_code)

                profile = UserProfile.objects.create(
                    user=user,
                    role=user_role if user_role else 'user',
                    gender=gender if gender else None,
                    phone=full_phone,
                    address=None,
                    country=country_name
                )
                print(f"REGISTER DEBUG: UserProfile created successfully - Role: {profile.role}")
            except Exception as profile_error:
                print(f"REGISTER DEBUG: Error creating UserProfile - {str(profile_error)}")
                # Continue even if profile creation fails, but log the error
            
            # Handle specific role profiles
            if user_role == 'seller':
                try:
                    shop_name = request.POST.get('shop_name')
                    license_no = request.POST.get('license_no')
                    if shop_name and license_no:
                        from .models import Seller
                        Seller.objects.create(
                            user=user,
                            shop_name=shop_name,
                            license_no=license_no
                        )
                except Exception as e:
                    print(f"REGISTER DEBUG: Error creating Seller profile: {str(e)}")
            
            elif user_role == 'facility':
                try:
                    facility_name = request.POST.get('facility_name')
                    capacity = request.POST.get('capacity', 0)
                    contact_number = f"{country_code} {phone}" if phone else ''
                    
                    if facility_name:
                        from .models import Facility
                        Facility.objects.create(
                            user=user,
                            facility_name=facility_name,
                            address='',
                            contact_number=contact_number,
                            capacity=int(capacity) if capacity else 0
                        )
                except Exception as e:
                    print(f"REGISTER DEBUG: Error creating Facility profile: {str(e)}")
            
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
    
    # Get email from session
    reset_email = request.session.get('reset_email')
    if not reset_email:
        messages.error(request, 'Session expired. Please start the password reset process again.')
        return redirect('aid_app:forgot_password')
    
    if request.method == 'POST':
        new_password = request.POST.get('new_password')
        confirm_password = request.POST.get('confirm_password')
        
        if not new_password or not confirm_password:
            messages.error(request, 'Please fill in all fields.')
            return render(request, 'common/change_password.html')
        
        if new_password != confirm_password:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'common/change_password.html')
        
        if len(new_password) < 8:
            messages.error(request, 'Password must be at least 8 characters long.')
            return render(request, 'common/change_password.html')
        
        try:
            user = User.objects.get(email=reset_email)
            user.set_password(new_password)
            user.save()
            
            # Clear session
            request.session.flush()
            
            messages.success(request, 'Password changed successfully. Please login with your new password.')
            return redirect('aid_app:login')
        except User.DoesNotExist:
            messages.error(request, 'User not found.')
            return redirect('aid_app:forgot_password')
        except Exception as e:
            messages.error(request, f'Error changing password: {str(e)}')
            return render(request, 'common/change_password.html')
    
    # GET request - show the change password form
    return render(request, 'common/change_password.html')

@login_required
@require_http_methods(["POST"])
def trigger_medical_alert(request):
    """Responder triggers an urgent medical alert (e.g., blood loss)."""
    try:
        data = json.loads(request.body)
        incident_id = data.get('incident_id')
        alert_type = data.get('alert_type', 'critical')
        notes = data.get('notes', 'Urgent medical attention required.')

        incident = get_object_or_404(Incident, incident_id=incident_id)
        
        # Verify responder is assigned
        if not request.user.profile.role == 'responder':
             return JsonResponse({'success': False, 'message': 'Only responders can trigger alerts.'}, status=403)

        # Create critical notifications for ALL facility managers
        facility_managers = UserProfile.objects.filter(role='facility_manager')
        notification_count = 0
        
        for manager in facility_managers:
            title = f"URGENT: Blood Loss Reported - {incident.incident_id}" if alert_type == 'blood_loss' else f"URGENT: Critical Alert - {incident.incident_id}"
            
            Notification.objects.create(
                recipient=manager.user,
                title=title,
                message=f"Responder reported critical condition: {notes}. Location: {incident.location}",
                notification_type='critical',
                category='incident',
                related_incident=incident
            )
            notification_count += 1
            
        return JsonResponse({'success': True, 'message': f'Alert sent to {notification_count} facility managers.'})

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def forward_medical_alert(request):
    """Facility Manager forwards alert to Admins."""
    try:
        data = json.loads(request.body)
        incident_id = data.get('incident_id')
        
        incident = get_object_or_404(Incident, id=incident_id)
        
        # Verify user is facility manager
        if not request.user.profile.role == 'facility_manager':
             return JsonResponse({'success': False, 'message': 'Access denied.'}, status=403)

        # Notify Admins
        admins = User.objects.filter(is_staff=True)
        count = 0
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title=f"ESCALATED: Blood Donor Required - {incident.incident_id}",
                message=f"Facility Manager escalated urgent blood request. Incident at {incident.location}. Please check donor availability.",
                notification_type='critical',
                category='system',
                related_incident=incident
            )
            count += 1
            
        return JsonResponse({'success': True, 'message': f'Escalated to {count} admins.'})

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
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
            return redirect('aid_app:incident_history')
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
        
    from .models import FirstAidGuide
    dynamic_guides = FirstAidGuide.objects.all()
    
    return render(request, 'user/first_aid_guides_complete.html', {'dynamic_guides': dynamic_guides})

def buy_products_view(request):
    """Renders the buy products page with medical supplies and equipment."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Get all active products from both sellers and facility managers
    products = Product.objects.filter(status='active').order_by('-created_at')
    
    # Debug: Print product count to console
    print(f"DEBUG: Found {products.count()} active products")
    for product in products:
        print(f"DEBUG: Product - {product.name} by {product.seller.username} (Status: {product.status})")
    
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
    """Renders the order confirmation page."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    context = {
        'user': request.user,
    }
    return render(request, 'user/confirmation.html', context)

@login_required
def process_checkout(request):
    """Handles order processing from checkout page via AJAX."""
    if request.method == 'POST':
        import json
        try:
            data = json.loads(request.body)
            cart = data.get('cart', [])
            
            if not cart:
                return JsonResponse({'success': False, 'message': 'Cart is empty'}, status=400)
                
            # First pass: Validate all stock
            for item in cart:
                try:
                    product = Product.objects.get(id=item.get('id'))
                    quantity = int(item.get('quantity', 0))
                    if product.stock_quantity < quantity:
                        return JsonResponse({
                            'success': False, 
                            'message': f'Insufficient stock for {product.name}. Available: {product.stock_quantity}'
                        }, status=400)
                except Product.DoesNotExist:
                    return JsonResponse({'success': False, 'message': 'One or more products not found'}, status=400)
            
            # Second pass: Process orders
            order_ids = []
            for item in cart:
                product = Product.objects.get(id=item.get('id'))
                quantity = int(item.get('quantity', 0))
                
                # Deduct stock
                product.stock_quantity -= quantity
                product.save()
                
                # Create Order
                order = Order.objects.create(
                    customer=request.user,
                    product=product,
                    quantity=quantity,
                    total_price=product.price * quantity,
                    status='processing'
                )
                order_ids.append(order.order_id)
                
                # Check for low stock alert (simplified)
                if product.stock_quantity < 5:
                    # In a real app, send notification to admin
                    pass
            
            return JsonResponse({'success': True, 'order_ids': order_ids})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)

def book_responder_view(request):
    """Book responder page for emergency medical services."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    return render(request, 'user/book_responder_new.html')

def track_responder_view(request):
    """Track responder page for monitoring emergency responders."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    return render(request, 'user/track_responder_new.html')

@login_required
def order_history_view(request):
    """Renders the order history page with all user orders."""
    # Fetch all orders (active and history)
    orders = Order.objects.filter(customer=request.user).order_by('-created_at')
    
    # Calculate stats
    total_orders = orders.count()
    in_transit = orders.filter(status='shipped').count()
    delivered = orders.filter(status='delivered').count()
    processing = orders.filter(status__in=['pending', 'processing']).count()
    
    context = {
        'orders': orders,
        'user': request.user,
        'stats': {
            'total': total_orders,
            'in_transit': in_transit,
            'delivered': delivered,
            'processing': processing
        }
    }
    return render(request, 'user/order_history_new.html', context)

def profile_view(request):
    """Renders the profile page based on the user's role."""
    if not request.user.is_authenticated:
        return redirect('aid_app:login')
    
    # Check for staff/superuser first
    if request.user.is_staff or request.user.is_superuser:
        return redirect('aid_app:admin_dashboard')
    
    # Check roles from UserProfile
    try:
        user_role = request.user.profile.role
        if user_role == 'facility' or user_role == 'facility_manager':
            return redirect('aid_app:facility_profile')
        elif user_role == 'seller':
            return redirect('aid_app:seller_profile')
        elif user_role == 'responder':
            return redirect('aid_app:responder_profile')
    except:
        pass # Default to standard user profile
        
    return render(request, 'user/user_profile.html', {'user': request.user})

@require_http_methods(["POST"])
@login_required
def update_profile_api(request):
    """API to update user profile details via AJAX."""
    try:
        profile = request.user.profile
        
        # Get data from POST
        address = request.POST.get('address')
        city = request.POST.get('city')
        state = request.POST.get('state')
        postal_code = request.POST.get('postal_code')
        country = request.POST.get('country')
        emergency_contact = request.POST.get('emergency_contact')
        emergency_phone = request.POST.get('emergency_phone')
        blood_type = request.POST.get('blood_type')
        allergies = request.POST.get('allergies')
        
        # Update fields if provided
        if address is not None: profile.address = address
        if city is not None: profile.city = city
        if state is not None: profile.state = state
        if postal_code is not None: profile.postal_code = postal_code
        if country is not None: profile.country = country
        if emergency_contact is not None: profile.emergency_contact = emergency_contact
        if emergency_phone is not None: profile.emergency_phone = emergency_phone
        if blood_type is not None: profile.blood_type = blood_type
        if allergies is not None: profile.allergies = allergies
        
        # Also update the legacy emergency_contacts field if needed
        if emergency_contact and emergency_phone:
             current_contacts = profile.emergency_contacts or ""
             new_contact_str = f"{emergency_contact} ({emergency_phone})"
             if new_contact_str not in current_contacts:
                 if current_contacts:
                     profile.emergency_contacts = current_contacts + "\n" + new_contact_str
                 else:
                     profile.emergency_contacts = new_contact_str

        profile.save()
        
        return JsonResponse({'status': 'success', 'message': 'Profile updated successfully!'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_http_methods(["POST"])
@login_required
def delete_account_view(request):
    """Permanently deletes the user account."""
    try:
        user = request.user
        logout(request)
        user.delete()
        messages.success(request, 'Your account has been successfully deleted.')
        return redirect('aid_app:login')
    except Exception as e:
        messages.error(request, f'Error deleting account: {str(e)}')
        return redirect('aid_app:profile')


@login_required
def processing_view(request):
    """Renders the order processing page for active orders."""
    # Fetch active orders (pending, processing, shipped) and recently delivered/cancelled/returned
    orders = Order.objects.filter(customer=request.user).order_by('-created_at')
    
    # Filter for "active processing" display logic
    # We want to show everything but maybe visually separate or filter in template
    # For now, let's pass all orders and handle filtering in template or pass specific sets
    
    context = {
        'orders': orders,
        'user': request.user,
    }
    return render(request, 'user/processing.html', context)

@login_required
def cancel_order(request, order_id):
    order = get_object_or_404(Order, id=order_id, customer=request.user)
    
    if order.status in ['pending', 'processing']:
        order.status = 'cancelled'
        order.save()
        messages.success(request, f"Order #{order.order_id} has been cancelled.")
    else:
        messages.error(request, "This order cannot be cancelled.")
        
    return redirect('aid_app:processing')

@login_required
def return_order(request, order_id):
    order = get_object_or_404(Order, id=order_id, customer=request.user)
    
    if order.status == 'delivered':
        order.status = 'returned'
        order.save()
        messages.success(request, f"Return request for #{order.order_id} has been initiated.")
    else:
        messages.error(request, "This order cannot be returned.")
        
    return redirect('aid_app:processing')

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
    
    incident = None
    incident_id = request.GET.get('incident_id')
    
    # Pre-fetch incident if provided in URL (entry from history page)
    if incident_id:
        try:
            incident = Incident.objects.get(id=incident_id, user=request.user)
        except (Incident.DoesNotExist, ValueError):
            messages.error(request, 'Invalid incident specified.')
            return redirect('aid_app:incident_history')

    if request.method == 'POST':
        try:
            rating = request.POST.get('rating')
            message = request.POST.get('message')
            tags = request.POST.get('feedbackType', 'General')
            posted_incident_id = request.POST.get('incident_id')
            
            # Re-fetch incident for POST to ensure security
            linked_incident = None
            if posted_incident_id:
                try:
                    linked_incident = Incident.objects.get(id=posted_incident_id, user=request.user)
                except Incident.DoesNotExist:
                    pass # Ignore invalid ID silently or handle error

            # Simple sentiment analysis mock
            sentiment = 'neutral'
            if int(rating) >= 4:
                sentiment = 'positive'
            elif int(rating) <= 2:
                sentiment = 'negative'
                
            Feedback.objects.create(
                user=request.user,
                incident=linked_incident,
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
        'incident': incident, # Pass incident to template context
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
    
    # System uptime / Health (Calculate as % of responders currently available/on-duty)
    total_incidents = Incident.objects.count()
    total_responders = Responder.objects.count()
    active_responders_count = Responder.objects.filter(status__in=['available', 'on_duty']).count()
    
    if total_responders > 0:
        # Base of 95% + variance based on responder availability
        # This makes it look like a realistic "System Health" metric
        availability_ratio = active_responders_count / total_responders
        system_uptime = 95.0 + (availability_ratio * 4.9)
        system_uptime = round(system_uptime, 1)
    else:
        system_uptime = 99.9  # Default if no responders yet

    # Fetch Recent Activity Data
    recent_incidents = Incident.objects.order_by('-created_at')[:5]
    pending_sellers_count = UserProfile.objects.filter(role='seller', user__is_active=False).count()
    recent_feedback = Feedback.objects.order_by('-created_at')[:5]
    
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
        'recent_incidents': recent_incidents,
        'pending_sellers_count': pending_sellers_count,
        'recent_feedback': recent_feedback,
        'user': request.user,
    }
    
    return render(request, 'admin/admin_dashboard.html', context)

# New admin page views
@login_required
def manage_users_view(request):
    """Renders the manage users page for admin users."""
    if not request.user.is_superuser and not request.user.is_staff:
        messages.error(request, 'Access denied. Admin privileges required.')
        return redirect('aid_app:home')
        
    # Get filters
    role_filter = request.GET.get('role', 'all')
    status_filter = request.GET.get('status', 'all')
    search_query = request.GET.get('search', '')
    
    # Base query
    users = User.objects.all().select_related('profile').prefetch_related('feedback').order_by('-date_joined')
    
    # Apply filters
    if role_filter != 'all':
        if role_filter == 'admin':
            users = users.filter(is_staff=True)
        else:
            users = users.filter(profile__role=role_filter)
            
    if status_filter != 'all':
        if status_filter == 'active':
            users = users.filter(is_active=True)
        elif status_filter == 'inactive':
            users = users.filter(is_active=False)
            
    if search_query:
        from django.db.models import Q
        users = users.filter(
            Q(username__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query)
        )

    # Pagination
    paginator = Paginator(users, 10) # 10 users per page
    page = request.GET.get('page')
    try:
        users = paginator.page(page)
    except PageNotAnInteger:
        users = paginator.page(1)
    except EmptyPage:
        users = paginator.page(paginator.num_pages)

    # Statistics
    now = timezone.now()
    seven_days_ago = now - timezone.timedelta(days=7)
    twenty_four_hours_ago = now - timezone.timedelta(days=1)
    
    context = {
        'users': users,
        'total_users': User.objects.count(),
        'recently_active': User.objects.filter(last_login__gte=seven_days_ago).count(),
        'new_users_today': User.objects.filter(date_joined__gte=twenty_four_hours_ago).count(),
        'admin_users': User.objects.filter(is_staff=True).count(),
        'current_filters': {
            'role': role_filter,
            'status': status_filter,
            'search': search_query
        }
    }
    
    return render(request, 'admin/manage_users.html', context)

@login_required
def add_user_view(request):
    """Handles adding a new user from the admin panel."""
    if not request.user.is_superuser and not request.user.is_staff:
        return JsonResponse({'success': False, 'message': 'Access denied'}, status=403)
        
    if request.method == 'POST':
        import json
        try:
            data = json.loads(request.body)
            
            # Extract data
            first_name = data.get('firstName')
            last_name = data.get('lastName')
            email = data.get('email')
            username = data.get('username')
            password = data.get('password')
            role = data.get('role')
            phone = data.get('phone')
            is_active = data.get('isActive', True)
            
            # Validation
            if User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'message': 'Username already exists'})
            
            if User.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'message': 'Email already exists'})
                
            # Create User
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=is_active
            )
            
            # Set staff status for admin/hr
            if role in ['admin', 'hr']:
                user.is_staff = True
                user.save()
            
            # Create Profile
            UserProfile.objects.create(
                user=user,
                role=role,
                phone=phone
            )
            
            # Create Role Specific Models
            if role == 'seller':
                # Create placeholder seller profile
                from .models import Seller
                Seller.objects.create(
                    user=user, 
                    shop_name=f"{first_name}'s Shop",  # Placeholder
                    license_no="PENDING" # Placeholder
                )
            elif role == 'facility' or role == 'facility_manager':
                # Create placeholder facility profile
                from .models import Facility
                Facility.objects.create(
                    user=user,
                    facility_name=f"{first_name}'s Facility", # Placeholder
                    address="Update Address",
                    contact_number=phone if phone else ""
                )
            
            return JsonResponse({'success': True, 'message': 'User created successfully'})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
            
    return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)

@login_required
@require_http_methods(["POST"])
def bulk_action_users_view(request):
    """Handles bulk actions (activate, suspend, delete) for users."""
    if not request.user.is_superuser and not request.user.is_staff:
        return JsonResponse({'success': False, 'message': 'Access denied'}, status=403)
        
    try:
        data = json.loads(request.body)
        action = data.get('action')
        user_ids = data.get('user_ids', [])
        
        if not action or not user_ids:
            return JsonResponse({'success': False, 'message': 'Missing action or user IDs'})
            
        users = User.objects.filter(id__in=user_ids)
        count = users.count()
        
        if count == 0:
             return JsonResponse({'success': False, 'message': 'No matching users found'})

        if action == 'activate':
            users.update(is_active=True)
            message = f'Successfully activated {count} users.'
            
        elif action == 'suspend':
            # Prevent suspending oneself
            if request.user.id in user_ids:
                 return JsonResponse({'success': False, 'message': 'You cannot suspend your own account.'})
            users.update(is_active=False)
            message = f'Successfully suspended {count} users.'
            
        elif action == 'delete':
            # Prevent deleting oneself
            if request.user.id in user_ids:
                 return JsonResponse({'success': False, 'message': 'You cannot delete your own account.'})
            
            # Superuser check for deletion might be wise, but staff logic prevails here
            users.delete()
            message = f'Successfully deleted {count} users.'
            
        else:
            return JsonResponse({'success': False, 'message': 'Invalid action'})
            
        return JsonResponse({'success': True, 'message': message})
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

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
    
    facilities = UserProfile.objects.filter(role='facility').select_related('user')
    
    # Attach real Facility object safely to avoid template errors
    for f_profile in facilities:
        try:
            f_profile.real_facility = f_profile.user.facility_profile
        except Facility.DoesNotExist:
            f_profile.real_facility = None

    context = {
        'total_facilities': total_facilities,
        'operational_facilities': operational_facilities,
        'capacity_utilization': 78, # Placeholder
        'facilities': facilities,
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
        'incidents': Incident.objects.select_related('assigned_responder', 'user').all().order_by('-created_at'),
        'responders': Responder.objects.filter(status__in=['available', 'on_duty']),
        'user': request.user,
    }
    return render(request, 'admin/view_all_incidents.html', context)

@login_required
def assign_incident_view(request, incident_id):
    """Assigns a responder to an incident via AJAX."""
    import json # Ensure import
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
        
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid method'}, status=405)
        
    try:
        data = json.loads(request.body)
        responder_id = data.get('responder_id')
        
        incident = get_object_or_404(Incident, id=incident_id)
        
        if responder_id:
            responder = get_object_or_404(Responder, id=responder_id)
            incident.assigned_responder = responder
            
            # Auto-update status if it was open
            if incident.status == 'open':
                incident.status = 'in_progress'
                
            incident.save()
            return JsonResponse({'success': True, 'message': f'Assigned to {responder.user.get_full_name()}'})
        else:
            # Allow unassigning
            incident.assigned_responder = None
            incident.save()
            return JsonResponse({'success': True, 'message': 'Incident unassigned'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

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
        'reports': Incident.objects.select_related('assigned_responder', 'user').all().order_by('-created_at'),
        'user': request.user,
    }
    return render(request, 'admin/incident_reports.html', context)

@login_required
@require_http_methods(["POST"])
def update_responder_view(request, responder_id):
    """API endpoint to update responder details."""
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)
        
    try:
        data = json.loads(request.body)
        responder = Responder.objects.get(id=responder_id)
        
        if 'specialization' in data:
            responder.specialization = data['specialization']
        if 'phone' in data:
            responder.phone = data['phone']
        if 'location' in data:
            responder.current_location = data['location']
        if 'status' in data:
            responder.status = data['status']
            
        responder.save()
        return JsonResponse({'success': True, 'message': 'Responder updated successfully.'})
        
    except Responder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Responder not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def update_facility_view(request, profile_id):
    """API endpoint to update facility details."""
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)
        
    try:
        data = json.loads(request.body)
        profile = UserProfile.objects.get(id=profile_id)
        user = profile.user
        
        # Get or Create Facility profile
        facility, created = Facility.objects.get_or_create(user=user, defaults={
            'facility_name': f"{user.username}'s Facility",
            'address': profile.address or 'Unknown Address',
            'contact_number': profile.phone or '000-000-0000',
            'status': 'active'
        })
        
        if 'name' in data:
            facility.facility_name = data['name']
        if 'address' in data:
            facility.address = data['address']
            profile.address = data['address']
            profile.save()
        if 'status' in data:
            facility.status = data['status']
            user.is_active = (data['status'] == 'active')
            user.save()
        if 'capacity' in data:
             try:
                 facility.capacity = int(data['capacity'])
             except:
                 pass

        facility.save()
        return JsonResponse({'success': True, 'message': 'Facility updated successfully.'})
        
    except UserProfile.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Facility Profile not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def generate_report_view(request):
    """API endpoint to generate a new system report."""
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)
        
    try:
        data = json.loads(request.body)
        report_type = data.get('type', 'system_performance')
        
        # Generate Report ID
        import uuid
        today_str = datetime.now().strftime('%Y%m%d')
        # Simple unique ID
        report_id = f"RPT-{today_str}-{random.randint(1000, 9999)}"
        
        # Determine Title based on Type
        titles = {
            'user_activity': 'Weekly User Activity Analysis',
            'incident_summary': 'Monthly Incident Overview',
            'system_performance': 'System Health & Performance Log',
            'marketplace_stats': 'Marketplace Transaction Report'
        }
        title = titles.get(report_type, 'General System Report')
        
        # Create Report
        report = SystemReport.objects.create(
            report_id=report_id,
            report_type=report_type,
            title=title,
            status='completed', # Auto-complete for now
            data=json.dumps({'summary': 'Report generated successfully based on current system metrics.'})
        )
        
        return JsonResponse({
            'success': True, 
            'message': 'Report generated successfully.',
            'report': {
                'id': report.report_id,
                'title': report.title,
                'date': report.generated_at.strftime('%Y-%m-%d %H:%M'),
                'status': report.status,
                'type': report.get_report_type_display()
            }
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def update_product_image_view(request, product_id):
    """API endpoint to update product image."""
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)
        
    try:
        product = Product.objects.get(id=product_id)
        
        if 'image' in request.FILES:
            product.image = request.FILES['image']
            product.save()
            return JsonResponse({
                'success': True, 
                'message': 'Image updated successfully.',
                'image_url': product.image.url
            })
        
        return JsonResponse({'success': False, 'message': 'No image provided.'}, status=400)
        
    except Product.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Product not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def update_responder_view(request, responder_id):
    """API endpoint to update responder details."""
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'Permission denied.'}, status=403)
        
    try:
        data = json.loads(request.body)
        responder = Responder.objects.get(id=responder_id)
        
        # Update fields
        # Note: 'type' in frontend seems to map to 'specialization' or just a UI label.
        # Based on typical usage, we'll map 'Type' -> 'specialization' 
        # and 'Contact' -> 'phone'.
        
        if 'specialization' in data:
            responder.specialization = data['specialization']
        if 'phone' in data:
            responder.phone = data['phone']
        if 'location' in data:
            responder.current_location = data['location']
        if 'status' in data:
            responder.status = data['status']
            
        responder.save()
        return JsonResponse({'success': True, 'message': 'Responder updated successfully.'})
        
    except Responder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Responder not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

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
    
    # Calculate user growth
    users_this_month = User.objects.filter(date_joined__gte=month_start).count()
    users_last_month = User.objects.filter(date_joined__gte=last_month_start, date_joined__lte=last_month_end).count()
    
    if users_last_month > 0:
        user_growth = ((users_this_month - users_last_month) / users_last_month) * 100
    else:
        user_growth = 100.0 if users_this_month > 0 else 0.0

    display_dates = []
    incident_data = []
    user_data = []
    order_data = [] # New: Track orders if Order model exists/is imported
    
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        display_dates.append(date.strftime('%b %d')) # e.g. "Jan 01"
        
        # Count for this day
        incident_data.append(Incident.objects.filter(created_at__range=(day_start, day_end)).count())
        user_data.append(User.objects.filter(date_joined__range=(day_start, day_end)).count())
        order_data.append(Order.objects.filter(created_at__range=(day_start, day_end)).count())

    # Incident Status Distribution
    open_incidents = Incident.objects.filter(status='open').count()
    resolved_incidents = Incident.objects.filter(status='resolved').count()
    
    # Get recent reports
    reports = SystemReport.objects.all().order_by('-generated_at')[:10]

    context = {
        'total_users': total_users,
        'user_growth': round(user_growth, 1),
        'total_incidents': total_incidents,
        'incident_change': incident_change,
        'active_responders': Responder.objects.filter(status__in=['available', 'on_duty']).count(),
        'marketplace_items': Product.objects.count(),
        
        # Chart Data
        'chart_dates': json.dumps(display_dates),
        'incident_trend': json.dumps(incident_data),
        'user_trend': json.dumps(user_data),
        'order_trend': json.dumps(order_data),
        'incident_open': open_incidents,
        'incident_resolved': resolved_incidents,
        
        # Reports
        'reports': reports,
        
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

@login_required
@require_http_methods(["POST"])
def delete_seller_account(request):
    """Deletes seller account."""
    if not request.user.is_authenticated:
        messages.error(request, "Permission Denied")
        return redirect("aid_app:login")

    try:
        user = request.user
        logout(request) # Logout before deleting
        user.delete()
        messages.success(request, "Your account has been deleted successfully.")
        return redirect("aid_app:home")
    except Exception as e:
        messages.error(request, f"Error deleting account: {str(e)}")
        return redirect("aid_app:seller_profile")
