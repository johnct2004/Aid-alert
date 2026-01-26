function viewOrder(orderId) {
    // Implement view details logic (modal or page redirect)
    alert(`Viewing details for Order #${orderId}`);
}

function updateAdminStatus(id, currentStatus) {
    const newStatus = prompt(`Update status for Order #${id} (pending, processing, shipped, delivered, cancelled):`, currentStatus);
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (newStatus && validStatuses.includes(newStatus) && newStatus !== currentStatus) {
        // Use the config URL
        if (window.orderConfig && window.orderConfig.updateStatusUrlData) {
            // We can't really dynamically replace arguments in a Django URL already rendered unless we use a pattern
            // The template had: url = "{% url 'aid_app:update_order_status' 999999 'placeholder' %}";
            // We need to pass this base URL pattern from the template.

            let url = window.orderConfig.updateStatusUrlPattern;
            url = url.replace('999999', id).replace('placeholder', newStatus);
            window.location.href = url;
        } else {
            console.error("Order config missing");
        }
    } else if (newStatus) {
        alert('Invalid status or no change.');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Search functionality
    const searchInput = document.getElementById('orderSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.table-row');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Filter functionality
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterOrders);
    }
});

function filterOrders() {
    const status = document.getElementById('statusFilter').value;
    const rows = document.querySelectorAll('.table-row');

    rows.forEach(row => {
        // Find status badge inside the row
        const badge = row.querySelector('.status-badge');
        if (badge) {
            const statusText = badge.textContent.trim().toLowerCase();
            const statusMatch = !status || statusText.includes(status.toLowerCase());

            if (row.style.display !== 'none') {
                row.style.display = statusMatch ? '' : 'none';
            }
        }
    });
}

// Global exposure
window.viewOrder = viewOrder;
window.updateAdminStatus = updateAdminStatus;
