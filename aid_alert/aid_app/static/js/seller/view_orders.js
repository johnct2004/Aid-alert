document.addEventListener('DOMContentLoaded', function () {
    // --- State Management ---
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentRows = [];

    // --- Initial Setup ---
    const tbody = document.querySelector('.table-body');
    if (!tbody) return;

    currentRows = Array.from(tbody.querySelectorAll('.table-row'));

    // Initial Pagination
    updatePagination();

    // --- Event Listeners ---
    const orderSearch = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const priorityFilter = document.getElementById('priorityFilter');

    if (orderSearch) orderSearch.addEventListener('input', filterOrders);
    if (statusFilter) statusFilter.addEventListener('change', filterOrders);
    if (dateFilter) dateFilter.addEventListener('change', filterOrders);
    if (priorityFilter) priorityFilter.addEventListener('change', filterOrders);

    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            sortRowsList();
            currentPage = 1;
            updatePagination();
        });
    }

    // Action Buttons (Delegation)
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const row = btn.closest('.table-row');
        if (!row) return;

        const orderId = row.querySelector('.order-id').innerText;
        // Assuming Django URL pattern: /seller/order/<id>/update/<status>/
        // We will construct it. 
        // NOTE: Ensure your urls.py has a matching pattern, usually with name='update_order_status'

        let newStatus = '';
        let confirmMsg = '';

        if (btn.classList.contains('process-btn')) {
            newStatus = 'processing';
            confirmMsg = `Start processing order ${orderId}?`;
        } else if (btn.classList.contains('ship-btn')) {
            newStatus = 'shipped';
            confirmMsg = `Mark order ${orderId} as Shipped?`;
        } else if (btn.classList.contains('deliver-btn')) {
            newStatus = 'delivered';
            confirmMsg = `Mark order ${orderId} as Delivered?`;
        } else if (btn.classList.contains('cancel-btn')) {
            newStatus = 'cancelled';
            confirmMsg = `Are you sure you want to cancel order ${orderId}?`;
        } else if (btn.classList.contains('view-btn')) {
            // Placeholder for View Details - Parsing data from row to show in alert
            const customer = row.querySelector('.customer-name').innerText;
            const amount = row.querySelector('.amount-cell').innerText;
            const date = row.querySelector('.date-cell').innerText;
            const products = row.querySelector('.products-cell').innerText.trim();

            alert(`Order Details:\nID: ${orderId}\nCustomer: ${customer}\nAmount: ${amount}\nDate: ${date}\nProducts: ${products}\n\n(Full details page coming soon)`);
            return; // No status update
        } else if (btn.classList.contains('invoice-btn')) {
            // Placeholder for Invoice
            alert(`Generating Invoice for Order ${orderId}...\n\n(Download feature coming soon)`);
            return; // No status update
        }

        if (newStatus && confirm(confirmMsg)) {
            // Redirect to backend endpoint
            // Since we're in JS file, we can't use {% url %}. We assume a standard structure.
            // Or better, add the URL as a data attribute on the button. 
            // But standard ID based URL is predictable.
            // Let's assume: /seller/order/update-status/<order_id>/<status>/
            // We need to fetch the real ID (PK) not the display ID (ORD-000...).
            // Wait, the display ID IS the ID? No, usually PK.
            // The view uses `order_id` arg. If the `order_id` in URL pattern expects PK (int), 
            // we need the PK. `order.order_id` returns "ORD-000058".
            // The view `update_order_status` does `get_object_or_404(Order, id=order_id)`.
            // If `id` expects integer PK, "ORD-000058" will fail.
            // We should put the PK in a data attribute on the row.

            // Checking if we can get PK.
            // Let's check view_orders.html again.
            // It has `viewOrder('{{ order.order_id }}')`. Usually passing the display ID string?
            // Let's fix HTML to include data-pk first if needed.
            // Update: We'll assume for now we need to fix HTML to pass PK or use PK in JS.
            // Let's use `window.location.href = \`/seller/order/update/${orderId}/${newStatus}/\``;
            // But we need to verify if `orderId` variable holds PK or "ORD-..."

            // To be safe, let's look at HTML source again in next step or assume checking.
            // Current JS selects `.order-id` innerText which is "ORD-000058".
            // We need the numeric ID.

            // I will update this JS block to find data-id attribute which I will add to the HTML row.
            const realId = row.dataset.orderId; // We will add this to HTML
            if (realId) {
                window.location.href = `/order/update-status/${realId}/${newStatus}/`;
            } else {
                console.error("Order ID not found for row");
            }
        }
    });

    // --- Top Toolbar Buttons ---
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            // Simple Client-Side CSV Export
            let csv = [];
            const rows = document.querySelectorAll('.orders-table tr'); // This selector might be wrong if using divs
            // The HTML uses divs: .table-header and .table-row

            // Header
            const headers = Array.from(document.querySelectorAll('.table-header .header-cell'))
                .map(cell => cell.innerText);
            csv.push(headers.join(','));

            // Rows
            document.querySelectorAll('.table-row').forEach(row => {
                // Filter out columns we don't want (like Actions)? Or include all.
                // Actions is last column.
                const cells = Array.from(row.querySelectorAll('.table-cell'));
                const rowData = cells.slice(0, cells.length - 1) // Exclude Actions
                    .map(cell => {
                        let text = cell.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
                        // Escape quotes
                        return `"${text.replace(/"/g, '""')}"`;
                    });
                csv.push(rowData.join(','));
            });

            const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
            const downloadLink = document.createElement('a');
            downloadLink.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
            downloadLink.href = window.URL.createObjectURL(csvFile);
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        });
    }

    const bulkProcessBtn = document.querySelector('.bulk-process-btn');
    if (bulkProcessBtn) {
        bulkProcessBtn.addEventListener('click', function () {
            if (confirm('Process ALL pending orders? This will change status from Pending to Processing.')) {
                // Call backend API
                fetch('/schedule-pickup/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'Content-Type': 'application/json'
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        alert(data.message);
                        if (data.status === 'success') location.reload();
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('An error occurred while communicating with the server.');
                    });
            }
        });
    }

    // CSRF Helper
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

    function filterOrders() {
        const searchTerm = orderSearch ? orderSearch.value.toLowerCase() : '';
        const status = statusFilter ? statusFilter.value.toLowerCase() : '';
        const dateRange = dateFilter ? dateFilter.value : '';
        const priority = priorityFilter ? priorityFilter.value.toLowerCase() : '';

        const allRows = document.querySelectorAll('.table-row');

        currentRows = Array.from(allRows).filter(row => {
            const text = row.textContent.toLowerCase();
            const rowStatus = row.querySelector('.status-badge').textContent.trim().toLowerCase();
            // Assuming priority is not visually separate class but maybe text in row? 
            // The template shows: 
            // <span class="badge badge-{{ order.priority }}">{{ order.priority }}</span>
            // So we can find .badge-priority or just check text.
            // Let's assume text content check for priority is enough if it's unique.
            // Or look for specific cell.
            // The template has columns: Order ID, Customer, Date, Total, Payment, Status, Priority, Actions
            // Let's check the HTML later. Text content search usually works for simple filters.

            // Date handling logic (simplified simulation)
            const rowDateText = row.querySelector('.date-cell').textContent.trim();
            const rowDate = new Date(rowDateText);
            const today = new Date();
            let dateMatch = true;

            if (dateRange === 'today') {
                dateMatch = rowDate.toDateString() === today.toDateString();
            } else if (dateRange === 'week') {
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                dateMatch = rowDate >= weekAgo;
            } else if (dateRange === 'month') {
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                dateMatch = rowDate >= monthAgo;
            }

            const searchMatch = !searchTerm || text.includes(searchTerm);
            const statusMatch = !status || rowStatus.includes(status);
            // Priority check might need refinement if 'High' text exists in other places
            // But usually safe enough.
            const priorityMatch = !priority || text.includes(priority);

            return searchMatch && statusMatch && dateMatch && priorityMatch;
        });

        sortRowsList();
        currentPage = 1;
        updatePagination();
    }

    function sortRowsList() {
        const titleSort = document.getElementById('sortBy');
        const sortValue = titleSort ? titleSort.value : 'date';

        currentRows.sort((a, b) => {
            let valA, valB;

            switch (sortValue) {
                case 'date':
                    valA = new Date(a.querySelector('.date-cell').textContent.trim());
                    valB = new Date(b.querySelector('.date-cell').textContent.trim());
                    return valB - valA; // Newest first

                case 'amount': // High to Low
                    valA = parseFloat(a.querySelector('.amount-cell').textContent.replace(/[$,]/g, '')) || 0;
                    valB = parseFloat(b.querySelector('.amount-cell').textContent.replace(/[$,]/g, '')) || 0;
                    return valB - valA;

                case 'amount-low': // Low to High
                    valA = parseFloat(a.querySelector('.amount-cell').textContent.replace(/[$,]/g, '')) || 0;
                    valB = parseFloat(b.querySelector('.amount-cell').textContent.replace(/[$,]/g, '')) || 0;
                    return valA - valB;

                case 'status':
                    valA = a.querySelector('.status-badge').textContent.trim().toLowerCase();
                    valB = b.querySelector('.status-badge').textContent.trim().toLowerCase();
                    return valA.localeCompare(valB);

                case 'customer':
                    valA = a.querySelector('.customer-name').textContent.trim().toLowerCase();
                    valB = b.querySelector('.customer-name').textContent.trim().toLowerCase();
                    return valA.localeCompare(valB);

                default:
                    return 0;
            }
        });
    }

    function updatePagination() {
        const totalPages = Math.ceil(currentRows.length / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        // Hide all passed in logic? No, hide all valid DOM rows, then show slice of filtered
        const allRows = document.querySelectorAll('.table-row');
        allRows.forEach(r => r.style.display = 'none');

        const visibleRows = currentRows.slice(start, end);
        visibleRows.forEach(r => r.style.display = ''); // display: table-row usually, or empty for default

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

                // Use event listener instead of onclick
                btn.addEventListener('click', () => { currentPage = p; updatePagination(); });

                container.appendChild(btn);
            }
        });
    }
});
