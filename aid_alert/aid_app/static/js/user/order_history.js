let ordersData = [];
let currentFilter = 'all';

function initOrderHistory(orders) {
    ordersData = orders;
    renderOrders();
    setupEventListeners();
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            searchOrders(e.target.value);
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderOrders();
        });
    });

    // Close modal when clicking outside
    window.onclick = function (event) {
        const modal = document.getElementById('orderModal');
        if (event && event.target === modal) {
            closeModal();
        }
    }
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('tableContainer');
    const filteredOrders = filterOrders();

    if (!tbody || !emptyState || !tableContainer) return;

    if (filteredOrders.length === 0) {
        emptyState.style.display = 'flex';
        tableContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = filteredOrders.map(order => `
        <tr>
            <td><span class="order-id">#${order.id}</span></td>
            <td>${order.displayDate}</td>
            <td>${order.items[0].name} (x${order.items[0].quantity})</td>
            <td class="order-total">$${order.total.toFixed(2)}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>
                <button class="action-btn" onclick="viewOrderDetails('${order.id}')" title="View Details">
                    <span class="material-icons-round">visibility</span>
                </button>
                ${order.status === 'shipped' ? `
                <button class="action-btn" onclick="trackOrder('${order.id}')" title="Track Order">
                    <span class="material-icons-round">location_on</span>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function filterOrders() {
    if (currentFilter === 'all') return ordersData;
    return ordersData.filter(order => order.status === currentFilter);
}

function searchOrders(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = ordersData.filter(order =>
        order.id.toLowerCase().includes(lowerQuery) ||
        order.status.toLowerCase().includes(lowerQuery) ||
        order.items.some(item => item.name.toLowerCase().includes(lowerQuery))
    );

    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(order => `
        <tr>
            <td><span class="order-id">#${order.id}</span></td>
            <td>${order.displayDate}</td>
            <td>${order.items[0].name} (x${order.items[0].quantity})</td>
            <td class="order-total">$${order.total.toFixed(2)}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>
                <button class="action-btn" onclick="viewOrderDetails('${order.id}')">
                    <span class="material-icons-round">visibility</span>
                </button>
                 ${order.status === 'shipped' ? `
                <button class="action-btn" onclick="trackOrder('${order.id}')">
                    <span class="material-icons-round">location_on</span>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;

    // Use absolute URL paths or passed config for dynamic URLs if needed.
    // For now assuming the simple concatenation works as in original.

    modalBody.innerHTML = `
        <div class="order-info-grid">
            <div class="info-group">
                <label>Order ID</label>
                <p>#${order.id}</p>
            </div>
            <div class="info-group">
                <label>Date</label>
                <p>${order.displayDate}</p>
            </div>
            <div class="info-group">
                <label>Status</label>
                <p class="status-text ${order.status}">${order.status.toUpperCase()}</p>
            </div>
            <div class="info-group">
                <label>Total Amount</label>
                <p>$${order.total.toFixed(2)}</p>
            </div>
        </div>
        
        <div class="products-list">
            <h4>Items</h4>
            ${order.items.map(item => `
                <div class="product-row">
                    <span>${item.name}</span>
                    <span>x${item.quantity}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
             ${(order.status === 'pending' || order.status === 'processing') ? `
                <a href="/aid_app/order/cancel/${order.db_id}/" class="btn btn-danger" onclick="return confirm('Cancel this order?')">Cancel Order</a>
             ` : ''}
             ${(order.status === 'delivered') ? `
                <a href="/aid_app/order/return/${order.db_id}/" class="btn btn-warning" onclick="return confirm('Return this order?')">Return Order</a>
             ` : ''}
        </div>
    `;
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
}

function trackOrder(id) {
    alert("Tracking #" + id);
}

// Global exposure
window.viewOrderDetails = viewOrderDetails;
window.trackOrder = trackOrder;
window.closeModal = closeModal;
