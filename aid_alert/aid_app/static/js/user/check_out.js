// Checkout Page JavaScript
let cart = [];
let currentStep = 1;
let shippingCost = 9.99;
let taxRate = 0.08; // 8% tax

// DOM Elements
const checkoutCartItems = document.getElementById('checkoutCartItems');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartShipping = document.getElementById('cartShipping');
const cartTax = document.getElementById('cartTax');
const cartTotal = document.getElementById('cartTotal');
const summaryItems = document.getElementById('summaryItems');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryShipping = document.getElementById('summaryShipping');
const summaryTax = document.getElementById('summaryTax');
const summaryTotal = document.getElementById('summaryTotal');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCartFromStorage();
    displayCartItems();
    updateTotals();
    setupEventListeners();
});

// Load cart from localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('aidalert_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Display cart items
function displayCartItems() {
    if (cart.length === 0) {
        checkoutCartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <a href="{% url 'aid_app:buy_products' %}" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i> Continue Shopping
                </a>
            </div>
        `;
        summaryItems.innerHTML = '<p class="text-muted">No items in cart</p>';
        return;
    }

    let cartHTML = '';
    let summaryHTML = '';

    cart.forEach(item => {
        // Cart items HTML
        cartHTML += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="cart-item-total">
                    $${(item.price * item.quantity).toFixed(2)}
                </div>
            </div>
        `;

        // Summary items HTML
        summaryHTML += `
            <div class="summary-item">
                <div class="summary-item-name">${item.name} x${item.quantity}</div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
    });

    checkoutCartItems.innerHTML = cartHTML;
    summaryItems.innerHTML = summaryHTML;
}

// Update item quantity
function updateQuantity(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== itemId);
        }
        
        saveCartToStorage();
        displayCartItems();
        updateTotals();
    }
}

// Update totals
function updateTotals() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = cart.length > 0 ? shippingCost : 0;
    const tax = subtotal * taxRate;
    const total = subtotal + shipping + tax;

    // Update cart totals
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartShipping.textContent = `$${shipping.toFixed(2)}`;
    cartTax.textContent = `$${tax.toFixed(2)}`;
    cartTotal.textContent = `$${total.toFixed(2)}`;

    // Update summary totals
    summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
    summaryShipping.textContent = `$${shipping.toFixed(2)}`;
    summaryTax.textContent = `$${tax.toFixed(2)}`;
    summaryTotal.textContent = `$${total.toFixed(2)}`;
}

// Save cart to localStorage
function saveCartToStorage() {
    localStorage.setItem('aidalert_cart', JSON.stringify(cart));
}

// Setup event listeners
function setupEventListeners() {
    // Payment method selection
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('.payment-method').forEach(method => {
                method.classList.remove('active');
            });
            this.closest('.payment-method').classList.add('active');
            
            // Show/hide card details based on payment method
            const cardDetails = document.getElementById('cardDetails');
            if (this.value === 'card') {
                cardDetails.style.display = 'block';
            } else {
                cardDetails.style.display = 'none';
            }
        });
    });

    // Card number formatting
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }

    // Expiry date formatting
    const expiryDateInput = document.getElementById('expiryDate');
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }

    // CVV validation
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
}

// Checkout step navigation
function proceedToShipping() {
    if (cart.length === 0) {
        showErrorMessage('Your cart is empty. Please add products before proceeding.');
        return;
    }
    
    // Redirect to shipping page
    window.location.href = '/shipping/';
}

function backToCart() {
    showStep(1);
}

function proceedToPayment() {
    if (!validateShippingForm()) {
        return;
    }
    showStep(3);
}

function backToShipping() {
    showStep(2);
}

function proceedToConfirmation() {
    if (!validatePaymentForm()) {
        return;
    }
    
    // Process order (in real app, this would send data to server)
    processOrder();
}

function showStep(stepNumber) {
    // Hide all sections
    document.querySelectorAll('.checkout-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show current section
    document.getElementById(`step${stepNumber}-section`).classList.add('active');
    
    // Update progress steps
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index < stepNumber) {
            step.classList.add('completed');
        } else {
            step.classList.remove('completed');
        }
        
        if (index === stepNumber - 1) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    currentStep = stepNumber;
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Form validation
function validateShippingForm() {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    if (!isValid) {
        showErrorMessage('Please fill in all required shipping information.');
    }
    
    return isValid;
}

function validatePaymentForm() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    if (paymentMethod === 'card') {
        const requiredFields = ['cardNumber', 'expiryDate', 'cvv', 'cardName'];
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        if (!isValid) {
            showErrorMessage('Please fill in all required payment information.');
            return false;
        }
        
        // Validate card number (basic check)
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            document.getElementById('cardNumber').classList.add('is-invalid');
            showErrorMessage('Please enter a valid card number.');
            return false;
        }
        
        // Validate expiry date
        const expiryDate = document.getElementById('expiryDate').value;
        const [month, year] = expiryDate.split('/');
        const currentDate = new Date();
        const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
        
        if (expiry < currentDate) {
            document.getElementById('expiryDate').classList.add('is-invalid');
            showErrorMessage('Card has expired. Please use a valid card.');
            return false;
        }
    }
    
    return true;
}

// Process order
function processOrder() {
    // Generate order number
    const orderNumber = 'ORD' + Date.now();
    const orderDate = new Date().toLocaleDateString();
    const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString();
    
    // Update confirmation page
    document.getElementById('orderNumber').textContent = orderNumber;
    document.getElementById('orderDate').textContent = orderDate;
    document.getElementById('estimatedDelivery').textContent = estimatedDelivery;
    
    // Clear cart
    cart = [];
    saveCartToStorage();
    
    // Show confirmation
    showStep(4);
}

// Utility functions
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #dc3545;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}
