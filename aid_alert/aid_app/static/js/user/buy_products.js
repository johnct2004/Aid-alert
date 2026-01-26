let cart = [];
let currentCategory = 'all';
let globalProducts = []; // To be initialized

function initBuyProducts(productsData) {
    globalProducts = productsData;
    renderProducts();
    updateCartSummary();
}

function renderProducts(category = 'all') {
    const grid = document.getElementById('productsGrid');
    const filteredProducts = category === 'all'
        ? globalProducts
        : globalProducts.filter(p => p.category === category);

    grid.innerHTML = '';

    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="no-products glass-card">
                <div class="no-products-icon">
                    <span class="material-icons-round">shopping_bag</span>
                </div>
                <h3>No Products Available</h3>
                <p>No products have been added by sellers or facility managers yet.</p>
            </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'glass-card product-card';

        const stockStatus = product.inStock
            ? '<span class="status-badge in-stock">In Stock</span>'
            : '<span class="status-badge out-of-stock">Out of Stock</span>';

        // Escape checks should be handled by server, but basic JS escapes are here if needed.
        // Assuming data is relatively safe or we trust the source.

        const buttonText = product.inStock ? 'Add to Cart' : 'Out of Stock';
        const buttonDisabled = product.inStock ? '' : 'disabled';

        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
                ${stockStatus}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-meta">
                    <div class="rating">
                        <span class="material-icons-round">star</span>
                        <span>${product.rating}</span>
                        <span class="reviews">(${product.reviews})</span>
                    </div>
                    <div class="price">$${product.price}</div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="addToCart('${product.id}')" ${buttonDisabled}>
                        <span class="material-icons-round">add_shopping_cart</span>
                        ${buttonText}
                    </button>
                    <button class="btn btn-secondary" onclick="buyNow('${product.id}')" ${buttonDisabled}>
                        <span class="material-icons-round">bolt</span>
                        Buy Now
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(productCard);
    });
}

function filterCategory(category) {
    currentCategory = category;

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Check if event exists (called from click)
    if (event && event.target) {
        const btn = event.target.closest('.category-btn');
        if (btn) btn.classList.add('active');
    }

    renderProducts(category);
}

function addToCart(productId) {
    const product = globalProducts.find(p => p.id === productId);
    if (!product || !product.inStock) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    updateCartSummary();
    showNotification(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartSummary();
    renderCart();
}

function buyNow(productId) {
    const product = globalProducts.find(p => p.id === productId);
    if (!product || !product.inStock) return;

    // Add single item to cart and go to checkout
    cart = [{
        ...product,
        quantity: 1
    }];

    // Store cart data in sessionStorage for checkout page
    sessionStorage.setItem('checkoutCart', JSON.stringify(cart));

    // Redirect to existing checkout page
    // Note: The URL is set in a global variable or passed in? 
    // We can't access Django tags here. We need the URL passed in initialization.
    if (window.checkoutUrl) {
        showNotification('Redirecting to checkout...');
        window.location.href = window.checkoutUrl;
    } else {
        console.error("Checkout URL not found");
    }
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartSummary();
            renderCart();
        }
    }
}

function updateCartSummary() {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Floating cart update
    const badgeCount = document.querySelector('.cart-badge-count');
    if (badgeCount) badgeCount.textContent = itemCount;

    const cartTotalValue = document.querySelector('.cart-total-value');
    if (cartTotalValue) cartTotalValue.textContent = `$${total.toFixed(2)}`;

    // Update modal summary
    const cartSubtotalEl = document.getElementById('cartSubtotal');
    if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    const cartTaxEl = document.getElementById('cartTax');
    if (cartTaxEl) cartTaxEl.textContent = `$${tax.toFixed(2)}`;

    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) cartTotalEl.textContent = `$${total.toFixed(2)}`;
}

function openCart() {
    document.getElementById('cartModal').style.display = 'flex';
    renderCart();
}

function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');

    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart"><span class="material-icons-round">shopping_cart</span><p>Your cart is empty</p></div>';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>$${item.price.toFixed(2)}</p>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                <span class="material-icons-round">delete</span>
            </button>
        </div>
    `).join('');
}

function clearCart() {
    if (cart.length > 0 && confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        updateCartSummary();
        renderCart();
        showNotification('Cart cleared');
    }
}

function checkout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }

    // Store cart data in sessionStorage for checkout page
    sessionStorage.setItem('checkoutCart', JSON.stringify(cart));

    // Redirect to checkout page
    if (window.checkoutUrl) {
        window.location.href = window.checkoutUrl;
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'glass-card notification';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.background = 'var(--primary-color)';
    notification.style.color = 'white';
    notification.style.padding = '15px 25px';
    notification.style.borderRadius = '10px';
    notification.style.zIndex = '10000';
    notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('cartModal');
    if (event && event.target === modal) {
        closeCart();
    }
}
