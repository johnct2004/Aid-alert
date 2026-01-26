document.addEventListener('DOMContentLoaded', function () {
    const productSearch = document.getElementById('productSearch');
    const editForm = document.getElementById('editForm');
    const cancelEditBtns = document.querySelectorAll('.cancel-edit-btn');
    const productForm = document.querySelector('.product-form');

    // Product search functionality
    if (productSearch) {
        productSearch.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            const productCards = document.querySelectorAll('.product-card');

            productCards.forEach(card => {
                const productName = card.querySelector('.product-name').textContent.toLowerCase();
                // Search by name or category text (if available in card)
                if (productName.includes(searchTerm)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Edit product functionality (using Event Delegation for dynamic lists or just cleanliness)
    // The edit buttons have class .edit-btn and data-product-id
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const productId = this.dataset.productId;
            editProduct(productId);
        });
    });

    function editProduct(productId) {
        // Access the global productData object
        const products = window.productData || {};
        const product = products[productId];

        if (!product) return;

        // Show the edit form
        if (editForm) {
            editForm.style.display = 'block';

            // Populate form with product data
            const idInput = document.getElementById('editProductId');
            const nameInput = document.getElementById('editProductName');
            const categorySelect = document.getElementById('editProductCategory');
            const conditionSelect = document.getElementById('editProductCondition');
            const priceInput = document.getElementById('editProductPrice');
            const stockInput = document.getElementById('editProductStock');
            const descInput = document.getElementById('editProductDescription');
            const statusSelect = document.getElementById('editProductStatus');

            if (idInput) idInput.value = product.id;
            if (nameInput) nameInput.value = product.name;
            if (categorySelect) categorySelect.value = product.category;
            if (conditionSelect) conditionSelect.value = product.condition;
            if (priceInput) priceInput.value = product.price;
            if (stockInput) stockInput.value = product.stock;
            if (descInput) descInput.value = product.description;
            if (statusSelect) statusSelect.value = product.status;

            // Scroll to the edit form
            editForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Cancel edit functionality
    cancelEditBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            if (editForm) {
                editForm.style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
    // Check if a product was pre-selected (e.g. redirected from dashboard)
    if (window.selectedProductId) {
        const btn = document.querySelector(`.edit-btn[data-product-id="${window.selectedProductId}"]`);
        if (btn) {
            setTimeout(() => {
                btn.click();
            }, 100);
        }
    }
});
