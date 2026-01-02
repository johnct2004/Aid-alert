// Shipping Page JavaScript
let cart = [];
let shippingCost = 9.99;
let taxRate = 0.08; // 8% tax

// DOM Elements
const summaryItems = document.getElementById('summaryItems');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryShipping = document.getElementById('summaryShipping');
const summaryTax = document.getElementById('summaryTax');
const summaryTotal = document.getElementById('summaryTotal');
const shippingForm = document.getElementById('shippingForm');

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

// Display cart items in summary
function displayCartItems() {
    if (cart.length === 0) {
        summaryItems.innerHTML = '<p class="text-muted">No items in cart</p>';
        return;
    }

    let summaryHTML = '';

    cart.forEach(item => {
        summaryHTML += `
            <div class="summary-item">
                <div class="summary-item-name">${item.name} x${item.quantity}</div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
    });

    summaryItems.innerHTML = summaryHTML;
}

// Update totals
function updateTotals() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = cart.length > 0 ? shippingCost : 0;
    const tax = subtotal * taxRate;
    const total = subtotal + shipping + tax;

    // Update summary totals
    summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
    summaryShipping.textContent = `$${shipping.toFixed(2)}`;
    summaryTax.textContent = `$${tax.toFixed(2)}`;
    summaryTotal.textContent = `$${total.toFixed(2)}`;
}

// Setup event listeners
function setupEventListeners() {
    // Delivery option change
    document.querySelectorAll('input[name="deliveryOption"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateShippingCost(this.value);
        });
    });

    // Form submission
    if (shippingForm) {
        shippingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            proceedToPayment();
        });
    }
}

// Update shipping cost based on delivery option
function updateShippingCost(deliveryOption) {
    let shippingCost = 0;
    
    switch(deliveryOption) {
        case 'standard':
            shippingCost = 9.99;
            break;
        case 'express':
            shippingCost = 19.99;
            break;
        case 'overnight':
            shippingCost = 29.99;
            break;
    }
    
    // Update display
    document.getElementById('summaryShipping').textContent = `$${shippingCost.toFixed(2)}`;
    
    // Recalculate total
    updateTotals();
}

// Validate shipping form
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

// Proceed to payment
function proceedToPayment() {
    if (!validateShippingForm()) {
        return;
    }
    
    // Save shipping data to localStorage
    const shippingData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zipCode: document.getElementById('zipCode').value,
        deliveryInstructions: document.getElementById('deliveryInstructions').value,
        deliveryOption: document.querySelector('input[name="deliveryOption"]:checked').value
    };
    
    localStorage.setItem('aidalert_shipping', JSON.stringify(shippingData));
    
    // Redirect to payment page
    window.location.href = '/payment/';
}

// Go back to cart
function goBack() {
    window.location.href = '/checkout/';
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
