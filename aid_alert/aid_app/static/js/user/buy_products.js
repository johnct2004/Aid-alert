// Shopping Cart functionality
let cart = [];
let cartCount = 0;
let cartTotal = 0;

// DOM Elements
const cartIcon = document.getElementById('cartIcon');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const closeCart = document.getElementById('closeCart');
const cartCountElement = document.getElementById('cartCount');
const cartItemsElement = document.getElementById('cartItems');
const cartTotalElement = document.getElementById('cartTotal');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const checkoutBtn = document.querySelector('.checkout-btn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCartFromStorage();
    updateCartUI();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Cart toggle
    cartIcon.addEventListener('click', openCart);
    closeCart.addEventListener('click', closeCartSidebar);
    cartOverlay.addEventListener('click', closeCartSidebar);
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', addToCart);
    });
    
    // Search and filters
    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
    sortFilter.addEventListener('change', sortProducts);
    
    // Load more
    loadMoreBtn.addEventListener('click', loadMoreProducts);
    
    // Buy Now buttons
    document.querySelectorAll('.buy-now').forEach(button => {
        button.addEventListener('click', buyNow);
    });
    
    // Checkout button
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', proceedToCheckout);
    }
}

// Buy Now function
function buyNow(e) {
    const button = e.currentTarget;
    const productId = button.dataset.productId;
    const productName = button.closest('.product-card').querySelector('.product-title').textContent;
    const productPrice = button.closest('.product-card').querySelector('.current-price').textContent.replace('$', '');
    
    // Add product to cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: parseFloat(productPrice),
            quantity: 1,
            image: `https://via.placeholder.com/60x60/667eea/ffffff?text=${encodeURIComponent(productName.substring(0, 10))}`
        });
    }
    
    updateCartUI();
    saveCartToStorage();
    
    // Animate button
    button.innerHTML = '<i class="fas fa-check"></i> Added!';
    button.classList.add('btn-success');
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = 'Buy Now';
        button.classList.remove('btn-success');
        button.disabled = false;
        // Redirect to checkout page
        window.location.href = '/checkout/';
    }, 1000);
}

// Proceed to Checkout function
function proceedToCheckout(e) {
    e.preventDefault();
    
    // Check if cart is empty
    if (cart.length === 0) {
        showErrorMessage('Your cart is empty. Please add some products before checkout.');
        return;
    }
    
    // Redirect to checkout page
    window.location.href = '/checkout/';
}

// Cart Functions
function openCart(e) {
    e.preventDefault();
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function addToCart(e) {
    const button = e.currentTarget;
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    const productPrice = parseFloat(button.dataset.price);
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1,
            image: `https://via.placeholder.com/60x60/667eea/ffffff?text=${encodeURIComponent(productName.substring(0, 10))}`
        });
    }
    
    updateCartUI();
    saveCartToStorage();
    showSuccessMessage('Product added to cart!');
    
    // Animate button
    button.innerHTML = '<i class="fas fa-check"></i> Added!';
    button.classList.add('btn-success');
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        button.classList.remove('btn-success');
        button.disabled = false;
    }, 1500);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToStorage();
    showSuccessMessage('Product removed from cart!');
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
            saveCartToStorage();
        }
    }
}

function updateCartUI() {
    // Update cart count
    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartCountElement.textContent = cartCount;
    
    // Update cart total
    cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    cartTotalElement.textContent = `$${cartTotal.toFixed(2)}`;
    
    // Update cart items
    if (cart.length === 0) {
        cartItemsElement.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
            </div>
        `;
    } else {
        cartItemsElement.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
}

// Storage Functions
function saveCartToStorage() {
    localStorage.setItem('aidalert_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('aidalert_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Product Filtering and Sorting
function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const productItems = document.querySelectorAll('.product-item');
    
    productItems.forEach(item => {
        const title = item.querySelector('.product-title').textContent.toLowerCase();
        const description = item.querySelector('.product-description').textContent.toLowerCase();
        const category = item.dataset.category;
        
        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = !selectedCategory || category === selectedCategory;
        
        if (matchesSearch && matchesCategory) {
            item.style.display = 'block';
            item.classList.remove('hidden');
        } else {
            item.style.display = 'none';
            item.classList.add('hidden');
        }
    });
}

function sortProducts() {
    const sortValue = sortFilter.value;
    const productsGrid = document.getElementById('productsGrid');
    const productItems = Array.from(productsGrid.querySelectorAll('.product-item'));
    
    productItems.sort((a, b) => {
        switch(sortValue) {
            case 'name':
                const titleA = a.querySelector('.product-title').textContent;
                const titleB = b.querySelector('.product-title').textContent;
                return titleA.localeCompare(titleB);
                
            case 'price-low':
                const priceA = parseFloat(a.querySelector('.current-price').textContent.replace('$', ''));
                const priceB = parseFloat(b.querySelector('.current-price').textContent.replace('$', ''));
                return priceA - priceB;
                
            case 'price-high':
                const priceHighA = parseFloat(a.querySelector('.current-price').textContent.replace('$', ''));
                const priceHighB = parseFloat(b.querySelector('.current-price').textContent.replace('$', ''));
                return priceHighB - priceHighA;
                
            case 'rating':
                const ratingA = parseFloat(a.querySelector('.product-rating span').textContent.replace('(', '').replace(')', ''));
                const ratingB = parseFloat(b.querySelector('.product-rating span').textContent.replace('(', '').replace(')', ''));
                return ratingB - ratingA;
                
            default:
                return 0;
        }
    });
    
    // Re-append sorted items
    productItems.forEach(item => productsGrid.appendChild(item));
}

// Load More Products
function loadMoreProducts() {
    // Show loading spinner
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    loadMoreBtn.disabled = true;
    
    // Simulate loading more products
    setTimeout(() => {
        const productsGrid = document.getElementById('productsGrid');
        const newProducts = generateMoreProducts();
        
        newProducts.forEach(productHTML => {
            productsGrid.insertAdjacentHTML('beforeend', productHTML);
        });
        
        // Re-attach event listeners to new products
        document.querySelectorAll('.add-to-cart:not([data-attached])').forEach(button => {
            button.addEventListener('click', addToCart);
            button.setAttribute('data-attached', 'true');
        });
        
        document.querySelectorAll('.quick-view:not([data-attached])').forEach(button => {
            button.addEventListener('click', showQuickView);
            button.setAttribute('data-attached', 'true');
        });
        
        loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Load More Products';
        loadMoreBtn.disabled = false;
        
        showSuccessMessage('More products loaded!');
    }, 1500);
}

function generateMoreProducts() {
    const products = [
        {
            id: 7,
            name: 'Digital Thermometer',
            description: 'Accurate digital thermometer for quick temperature readings',
            price: 19.99,
            category: 'emergency-equipment',
            rating: 4.1,
            badge: 'Popular'
        },
        {
            id: 8,
            name: 'Emergency Blanket',
            description: 'Thermal emergency blanket for body heat retention',
            price: 8.99,
            category: 'emergency-equipment',
            rating: 4.3,
            badge: null
        },
        {
            id: 9,
            name: 'Medical Gloves Box',
            description: 'Box of 100 disposable medical gloves',
            price: 14.99,
            category: 'personal-protective',
            rating: 4.4,
            badge: null
        }
    ];
    
    return products.map(product => `
        <div class="col-lg-4 col-md-6 mb-4 product-item fade-in" data-category="${product.category}">
            <div class="product-card">
                <div class="product-image">
                    <img src="https://via.placeholder.com/300x200/667eea/ffffff?text=${encodeURIComponent(product.name.replace(' ', '+'))}" alt="${product.name}">
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-rating">
                        ${generateStarRating(product.rating)}
                        <span>(${product.rating})</span>
                    </div>
                    <div class="product-price">
                        <span class="current-price">$${product.price}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary add-to-cart" data-product-id="${product.id}" data-product-name="${product.name}" data-price="${product.price}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                        <button class="btn btn-outline-secondary buy-now" data-product-id="${product.id}">
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Quick View Modal
function showQuickView(e) {
    const button = e.currentTarget;
    const productId = button.dataset.productId;
    
    // Find product data
    const productCard = button.closest('.product-card');
    const productName = productCard.querySelector('.product-title').textContent;
    const productDescription = productCard.querySelector('.product-description').textContent;
    const productPrice = productCard.querySelector('.current-price').textContent;
    const productImage = productCard.querySelector('.product-image img').src;
    const productRating = productCard.querySelector('.product-rating span').textContent;
    
    // Create modal
    const modalHTML = `
        <div class="quick-view-modal show" id="quickViewModal">
            <div class="quick-view-content">
                <button class="quick-view-close" onclick="closeQuickView()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="row">
                    <div class="col-md-6">
                        <img src="${productImage}" alt="${productName}" style="width: 100%; border-radius: 10px;">
                    </div>
                    <div class="col-md-6">
                        <h2>${productName}</h2>
                        <div class="product-rating mb-3">
                            ${productCard.querySelector('.product-rating').innerHTML}
                        </div>
                        <p>${productDescription}</p>
                        <div class="product-price mb-4">
                            <span class="current-price" style="font-size: 2rem;">${productPrice}</span>
                        </div>
                        <button class="btn btn-primary btn-lg w-100 add-to-cart" data-product-id="${productId}" data-product-name="${productName}" data-price="${productPrice.replace('$', '')}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Attach event listener to modal add to cart button
    document.querySelector('#quickViewModal .add-to-cart').addEventListener('click', function(e) {
        addToCart(e);
        closeQuickView();
    });
}

function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    if (modal) {
        modal.remove();
    }
}

// Success Message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(successDiv);
    successDiv.style.display = 'flex';
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(errorDiv);
    errorDiv.style.display = 'flex';
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Checkout functionality
document.querySelector('.checkout-btn')?.addEventListener('click', function() {
    if (cart.length === 0) {
        showSuccessMessage('Your cart is empty!');
        return;
    }
    
    // Here you would typically redirect to a checkout page
    showSuccessMessage('Proceeding to checkout...');
    
    // For demo purposes, clear cart after "checkout"
    setTimeout(() => {
        cart = [];
        updateCartUI();
        saveCartToStorage();
        closeCartSidebar();
        showSuccessMessage('Order placed successfully!');
    }, 2000);
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close cart
    if (e.key === 'Escape' && cartSidebar.classList.contains('open')) {
        closeCartSidebar();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
});
