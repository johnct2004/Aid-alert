document.addEventListener('DOMContentLoaded', function () {
    // --- State Management ---
    let currentPage = 1;
    const itemsPerPage = 8;
    let currentRows = [];

    // --- Initial Setup ---
    const tbody = document.querySelector('.table-body');
    if (tbody) {
        currentRows = Array.from(tbody.querySelectorAll('.table-row'));
        updatePagination();
    }

    // --- Event Listeners: Search & Filter ---
    const productSearch = document.getElementById('productSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const stockFilter = document.getElementById('stockFilter');

    if (productSearch) productSearch.addEventListener('input', filterProducts);
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
    if (statusFilter) statusFilter.addEventListener('change', filterProducts);
    if (stockFilter) stockFilter.addEventListener('change', filterProducts);

    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            sortRowsList();
            currentPage = 1;
            updatePagination();
        });
    }

    // --- Action Buttons (Delegation) ---
    const tableBody = document.querySelector('.table-body');
    if (tableBody) {
        tableBody.addEventListener('click', function (e) {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;

            // View & Edit buttons usually navigate. 
            // If they have data-url, navigate there.
            if (btn.dataset.url) {
                window.location.href = btn.dataset.url;
                return;
            }

            if (btn.classList.contains('view-btn') && !btn.dataset.url) {
                const row = btn.closest('.table-row');
                const productName = row ? row.querySelector('.product-name').textContent.trim() : 'Product';
                alert(`Viewing details for ${productName}`);
                return;
            }

            // Delete Button
            if (btn.classList.contains('delete-btn')) {
                const row = btn.closest('.table-row');
                const productName = row.querySelector('.product-name').textContent.trim();

                if (confirm(`Are you sure you want to delete ${productName}?`)) {
                    alert(`${productName} has been deleted.`);
                    // Simulate removal
                    row.remove();
                    // Update currentRows state and re-paginate
                    currentRows = Array.from(tbody.querySelectorAll('.table-row'));
                    filterProducts(); // Re-apply filters/pagination
                }
            }
        });
    }

    // --- Core Functions ---

    function filterProducts() {
        const searchTerm = productSearch ? productSearch.value.toLowerCase() : '';
        const category = categoryFilter ? categoryFilter.value.toLowerCase() : '';
        const status = statusFilter ? statusFilter.value.toLowerCase() : '';
        const stock = stockFilter ? stockFilter.value : '';

        const allRows = document.querySelectorAll('.table-row');

        currentRows = Array.from(allRows).filter(row => {
            const text = row.textContent.toLowerCase();
            const rowCategory = row.querySelector('.category-badge').textContent.toLowerCase();
            const rowStatus = row.querySelector('.status-badge').textContent.toLowerCase();
            const rowStockText = row.querySelector('.stock-cell').textContent.trim();
            const rowStock = parseInt(rowStockText) || 0;

            const searchMatch = !searchTerm || text.includes(searchTerm);
            const categoryMatch = !category || rowCategory.includes(category);
            const statusMatch = !status || rowStatus.includes(status);

            let stockMatch = true;
            if (stock === 'low') {
                stockMatch = rowStock < 10;
            } else if (stock === 'out') {
                stockMatch = rowStock === 0;
            } else if (stock === 'in') {
                stockMatch = rowStock > 0;
            }

            return searchMatch && categoryMatch && statusMatch && stockMatch;
        });

        sortRowsList();
        currentPage = 1;
        updatePagination();
    }

    function sortRowsList() {
        const titleSort = document.getElementById('sortBy');
        const sortValue = titleSort ? titleSort.value : 'name';

        currentRows.sort((a, b) => {
            let valA, valB;

            switch (sortValue) {
                case 'name':
                    valA = a.querySelector('.product-name').textContent.trim().toLowerCase();
                    valB = b.querySelector('.product-name').textContent.trim().toLowerCase();
                    return valA.localeCompare(valB);

                case 'price-low':
                    valA = parseFloat(a.querySelector('.price-cell').textContent.replace(/[$,]/g, '')) || 0;
                    valB = parseFloat(b.querySelector('.price-cell').textContent.replace(/[$,]/g, '')) || 0;
                    return valA - valB;

                case 'price-high':
                    valA = parseFloat(a.querySelector('.price-cell').textContent.replace(/[$,]/g, '')) || 0;
                    valB = parseFloat(b.querySelector('.price-cell').textContent.replace(/[$,]/g, '')) || 0;
                    return valB - valA;

                case 'stock':
                    valA = parseInt(a.querySelector('.stock-count').textContent) || 0;
                    valB = parseInt(b.querySelector('.stock-count').textContent) || 0;
                    return valA - valB;

                case 'sales':
                    // If sales count is not visible, this might need data attribute or removal
                    return 0;

                case 'date':
                    // If date is not visible/parsable, this defaults to 0
                    return 0;

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

                btn.addEventListener('click', () => { currentPage = p; updatePagination(); });

                container.appendChild(btn);
            }
        });
    }
});
