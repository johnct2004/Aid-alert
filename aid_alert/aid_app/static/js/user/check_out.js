let cartItems = [];
let checkoutConfig = {};

let shippingCost = 9.99;
let taxRate = 0.1;
let discount = 0;

function initCheckout(config) {
    checkoutConfig = config;
    // Load cart from sessionStorage
    cartItems = JSON.parse(sessionStorage.getItem('checkoutCart')) || [];

    if (cartItems.length === 0) {
        // Redirect back if empty
        if (checkoutConfig.buyProductsUrl) {
            window.location.href = checkoutConfig.buyProductsUrl;
        }
        return;
    }
    renderCartItems();
    updateOrderSummary();
    setupEventListeners();
}

function setupEventListeners() {
    // Form submission
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    // Payment method toggle
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', togglePaymentMethod);
    });

    // Go back button
    // Note: onclick handling in HTML calls 'goBack()'. We should define it globally or attach listener.
    // Ideally attach listener if element has ID. It doesn't have ID but has class btn-secondary and text 'Back to Cart'
    // Or we keep goBack as global function.
}

function goBack() {
    if (checkoutConfig.cartUrl) {
        window.location.href = checkoutConfig.cartUrl;
    } else {
        history.back();
    }
}

function renderCartItems() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;

    cartContainer.innerHTML = cartItems.map(item => `
            <div class="cart-item">
                <div class="item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Qty: ${item.quantity}</p>
                </div>
                <div class="item-price">
                    $${(item.price * item.quantity).toFixed(2)}
                </div>
            </div>
        `).join('');
}

function updateOrderSummary() {
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * taxRate;
    const total = subtotal + shippingCost + tax - discount;

    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    const shippingEl = document.getElementById('shipping');
    if (shippingEl) shippingEl.textContent = `$${shippingCost.toFixed(2)}`;

    const taxEl = document.getElementById('tax');
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;

    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

function togglePaymentMethod() {
    const methodInput = document.querySelector('input[name="paymentMethod"]:checked');
    if (!methodInput) return;

    const method = methodInput.value;
    const cardPayment = document.getElementById('cardPayment');

    if (method === 'card') {
        cardPayment.style.display = 'block';
        document.querySelectorAll('#cardPayment input').forEach(i => i.required = true);
    } else {
        cardPayment.style.display = 'none';
        document.querySelectorAll('#cardPayment input').forEach(i => i.required = false);
    }
}

function applyPromo() {
    const promoCodeInput = document.getElementById('promoCode');
    if (!promoCodeInput) return;

    const promoCode = promoCodeInput.value.toUpperCase();
    if (promoCode === 'SAVE10') {
        discount = 10;
        showNotification('Applied!');
    }
    updateOrderSummary();
}

async function handleCheckout(event) {
    event.preventDefault();

    // Basic validation
    const form = document.getElementById('checkoutForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    showNotification('Processing your order...');

    // Prepare data for backend
    const checkoutData = {
        cart: cartItems.map(item => ({
            id: item.id,
            quantity: item.quantity
        })),
        shipping: {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            country: document.getElementById('country').value,
            zipCode: document.getElementById('zipCode').value
        }
    };

    try {
        const response = await fetch(checkoutConfig.processCheckoutUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': checkoutConfig.csrfToken
            },
            body: JSON.stringify(checkoutData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Order placed successfully!');
            // Clear cart
            sessionStorage.removeItem('checkoutCart');
            // Redirect
            setTimeout(() => {
                window.location.href = checkoutConfig.processingUrl;
            }, 1500);
        } else {
            showNotification(result.message || 'Order failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.');
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Expose goBack to global scope if needed for inline onclick
window.goBack = goBack;
window.applyPromo = applyPromo; // Expose applyPromo as well
