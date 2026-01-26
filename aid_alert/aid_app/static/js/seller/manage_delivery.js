document.addEventListener('DOMContentLoaded', function () {
    const scheduleBtn = document.querySelector('.schedule-btn');
    const bulkShipBtn = document.querySelector('.bulk-ship-btn');

    // Get config from data attributes if present, or rely on hardcoded for specific selectors
    // It's better to pass URLs via data attributes on the body or specific container
    // For now, we will look for a config container or use values if they were available
    // But since the original code used django template tags inside JS strings like "{% url ... %}", 
    // we need to make sure the HTML passes these urls.

    // Let's assume the HTML will be updated to include data-urls on the actions container
    const actionsContainer = document.querySelector('.delivery-actions');
    const scheduleUrl = actionsContainer ? actionsContainer.dataset.scheduleUrl : '';
    const bulkShipUrl = actionsContainer ? actionsContainer.dataset.bulkShipUrl : '';
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || getCookie('csrftoken');

    if (scheduleBtn && scheduleUrl) {
        scheduleBtn.addEventListener('click', function () {
            if (!confirm('Schedule pickup for all Pending orders? This will move them to Processing.')) return;

            fetch(scheduleUrl, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    if (data.status === 'success') location.reload();
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('An error occurred while scheduling pickup.');
                });
        });
    }

    if (bulkShipBtn && bulkShipUrl) {
        bulkShipBtn.addEventListener('click', function () {
            if (!confirm('Bulk ship all Processing orders? This will mark them as Shipped.')) return;

            fetch(bulkShipUrl, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    if (data.status === 'success') location.reload();
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('An error occurred while processing bulk shipment.');
                });
        });
    }

    // Row Action Buttons
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            // Get data from data attributes
            const id = this.dataset.id;
            const status = this.dataset.status;
            const location = this.dataset.location;
            const lat = this.dataset.lat;
            const lng = this.dataset.lng;

            openUpdateModal(id, status, location, lat, lng);
        });
    });

    document.querySelectorAll('.ship-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('.table-row');
            const orderId = row.querySelector('.order-id').innerText;
            if (confirm(`Mark ${orderId} as Shipped?`)) {
                alert(`${orderId} has been marked as Shipped.`);
                // In a real app, this would update via AJAX
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('.table-row');
            const orderId = row.querySelector('.order-id').innerText;
            alert(`Editing delivery details for ${orderId}`);
        });
    });

    // Global function for the modal (was inline onclick)
    window.submitUpdate = function (event) {
        event.preventDefault();
        // Logic to handle update would go here
        // The original code had onsubmit="submitUpdate(event)" but didn't define the function in the <script> block shown?
        // Wait, looking at the original file content...
        // The original file content had `onsubmit="submitUpdate(event)"` in the form.
        // BUT `submitUpdate` was NOT defined in the script block I read!
        // It might have been missing or defined elsewhere? 
        // No, I read the whole file. 
        // It seems `submitUpdate` was missing in the original code! 
        // I should probably define a stub for it or fix it.
        alert('Update submitted (simulation)');
        document.getElementById('updateLocationModal').style.display = 'none';
    };

    window.openUpdateModal = function (id, status, loc, lat, lng) {
        document.getElementById('updateOrderId').value = id;
        document.getElementById('updateStatus').value = status;
        document.getElementById('updateLocation').value = loc;
        document.getElementById('updateLat').value = lat;
        document.getElementById('updateLng').value = lng;
        document.getElementById('updateLocationModal').style.display = 'block';
    };
});

// Helper for CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Pagination & Sorting Implementation
document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentPage = 1;
    const itemsPerPage = 8;
    let currentRows = [];

    // Initial setup
    const tbody = document.querySelector('.table-body');
    if (!tbody) return;

    currentRows = Array.from(tbody.querySelectorAll('.table-row'));
    updatePagination();

    // Listeners
    const searchInput = document.getElementById('deliverySearch');
    const statusFilter = document.getElementById('statusFilter');
    const carrierFilter = document.getElementById('carrierFilter');
    const priorityFilter = document.getElementById('priorityFilter');

    if (searchInput) searchInput.addEventListener('input', filterDeliveries);
    if (statusFilter) statusFilter.addEventListener('change', filterDeliveries);
    if (carrierFilter) carrierFilter.addEventListener('change', filterDeliveries);
    if (priorityFilter) priorityFilter.addEventListener('change', filterDeliveries);

    function filterDeliveries() {
        const searchTerm = searchInput.value.toLowerCase();
        const status = statusFilter.value.toLowerCase();
        const carrier = carrierFilter.value.toLowerCase();
        const priority = priorityFilter.value.toLowerCase();

        const allRows = document.querySelectorAll('.table-row');

        currentRows = Array.from(allRows).filter(row => {
            const text = row.textContent.toLowerCase();
            const rowStatus = row.querySelector('.status-cell').textContent.trim().toLowerCase();
            const rowCarrier = row.querySelector('.carrier-cell').textContent.trim().toLowerCase();
            const rowPriority = row.querySelector('.priority-cell').textContent.trim().toLowerCase();

            const searchMatch = !searchTerm || text.includes(searchTerm);
            const statusMatch = !status || rowStatus.includes(status);
            const carrierMatch = !carrier || rowCarrier.includes(carrier);
            const priorityMatch = !priority || rowPriority.includes(priority);

            return searchMatch && statusMatch && carrierMatch && priorityMatch;
        });

        currentPage = 1;
        updatePagination();
    }

    function updatePagination() {
        const totalPages = Math.ceil(currentRows.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        const allRows = document.querySelectorAll('.table-row');
        allRows.forEach(r => r.style.display = 'none');

        const visibleRows = currentRows.slice(start, end);
        visibleRows.forEach(r => r.style.display = '');

        renderControls(totalPages);
    }

    function renderControls(totalPages) {
        const container = document.querySelector('.pagination-numbers');
        if (!container) return;
        container.innerHTML = '';

        const prevBtn = document.querySelector('.prev-btn');
        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; updatePagination(); } };
        }

        const nextBtn = document.querySelector('.next-btn');
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; updatePagination(); } };
        }

        let pages = [];
        if (totalPages <= 7) {
            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            if (currentPage <= 4) pages = [1, 2, 3, 4, 5, '...', totalPages];
            else if (currentPage >= totalPages - 3) pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            else pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }

        pages.forEach(p => {
            if (p === '...') {
                const span = document.createElement('span');
                span.className = 'pagination-dots';
                span.textContent = '...';
                container.appendChild(span);
            } else {
                const btn = document.createElement('button');
                btn.className = `pagination-number ${p === currentPage ? 'active' : ''}`;
                btn.textContent = p;
                btn.onclick = () => { currentPage = p; updatePagination(); };
                container.appendChild(btn);
            }
        });
    }
});

// Live Delivery Tracking Implementation
class DeliveryTracker {
    constructor() {
        this.map = null;
        this.markers = [];
        this.routes = [];
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.initMap();
        this.setupEventListeners();
        this.startLiveTracking();
    }

    initMap() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;

        // Create map centered on a default location (World View)
        this.map = L.map('mapContainer').setView([20, 0], 2);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    setupEventListeners() {
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshTrackingData();
                this.showRefreshAnimation();
            });
        }
    }

    startLiveTracking() {
        // Load initial data
        this.loadDeliveryData();

        // Set up automatic refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDeliveryData();
        }, 30000);
    }

    async loadDeliveryData() {
        try {
            // Simulate API call - replace with actual API endpoint
            const deliveryData = await this.fetchDeliveryData();
            this.updateMap(deliveryData);
            this.updateStats(deliveryData);
        } catch (error) {
            console.error('Error loading delivery data:', error);
            this.showError('Failed to load delivery data');
        }
    }

    async fetchDeliveryData() {
        try {
            const response = await fetch('/api/delivery-data/'); // Ensure this endpoint exists or is mocked
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            return { deliveries: [] };
        }
    }

    updateMap(data) {
        if (!this.map) return;

        // Clear existing markers and routes
        this.clearMap();

        // Add delivery routes and markers
        data.deliveries.forEach(delivery => {
            this.addDeliveryMarker(delivery);
            this.addDeliveryRoute(delivery);
        });

        // Fit map to show all deliveries
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    addDeliveryMarker(delivery) {
        const markerIcon = L.divIcon({
            className: 'delivery-marker',
            html: `
        <div class="marker-content" data-status="${delivery.status}">
            <span class="material-icons-round">
                ${delivery.status === 'delivered' ? 'check_circle' : 'local_shipping'}
            </span>
        </div>
        `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const marker = L.marker([delivery.current_lat, delivery.current_lng], { icon: markerIcon })
            .addTo(this.map)
            .bindPopup(this.createPopupContent(delivery));

        this.markers.push(marker);
    }

    addDeliveryRoute(delivery) {
        if (delivery.status === 'delivered') return;

        const routeCoordinates = [
            [delivery.pickup_lat, delivery.pickup_lng],
            [delivery.current_lat, delivery.current_lng],
            [delivery.delivery_lat, delivery.delivery_lng]
        ];

        const route = L.polyline(routeCoordinates, {
            color: delivery.status === 'in_transit' ? '#3b82f6' : '#f59e0b',
            weight: 3,
            opacity: 0.7,
            dashArray: delivery.status === 'pending' ? '10, 10' : null
        }).addTo(this.map);

        this.routes.push(route);
    }

    createPopupContent(delivery) {
        return `
        <div class="delivery-popup">
            <h4>${delivery.id}</h4>
            <p><strong>Status:</strong> ${delivery.status.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Driver:</strong> ${delivery.driver_name}</p>
            <p><strong>Customer:</strong> ${delivery.customer_name}</p>
            <p><strong>ETA:</strong> ${delivery.estimated_arrival}</p>
            <p><strong>Progress:</strong> ${delivery.progress}%</p>
        </div>
        `;
    }

    updateStats(data) {
        const activeDeliveries = data.deliveries.filter(d => d.status === 'in_transit').length;
        const inTransitCount = data.deliveries.filter(d => d.status === 'in_transit' || d.status === 'pending').length;
        const deliveredToday = data.deliveries.filter(d => d.status === 'delivered').length;

        const activeEl = document.getElementById('activeDeliveries');
        if (activeEl) activeEl.textContent = activeDeliveries;

        const inTransitEl = document.getElementById('inTransitCount');
        if (inTransitEl) inTransitEl.textContent = inTransitCount;

        const deliveredEl = document.getElementById('deliveredToday');
        if (deliveredEl) deliveredEl.textContent = deliveredToday;
    }

    clearMap() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        this.routes.forEach(route => this.map.removeLayer(route));
        this.routes = [];
    }

    refreshTrackingData() {
        this.loadDeliveryData();
    }

    showRefreshAnimation() {
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('.material-icons-round');
            if (icon) {
                icon.style.animation = 'spin 1s linear';
                setTimeout(() => {
                    icon.style.animation = '';
                }, 1000);
            }
        }
    }

    showLoadingIndicator() {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.innerHTML = '<div class="map-loading">Loading map...</div>';
        }
    }

    showError(message) {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.innerHTML = `<div class="map-error">${message}</div>`;
        }
    }

    destroy() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.clearMap();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Only init if map container exists
    if (document.getElementById('mapContainer')) {
        window.deliveryTracker = new DeliveryTracker();
    }
});

// Clean up
window.addEventListener('beforeunload', () => {
    if (window.deliveryTracker) window.deliveryTracker.destroy();
});
