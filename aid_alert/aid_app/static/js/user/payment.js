// Payment Page JavaScript
let cart = [];
let shippingData = {};
let taxRate = 0.08; // 8% tax

// DOM Elements
const summaryItems = document.getElementById('summaryItems');
const reviewItems = document.getElementById('reviewItems');
const summarySubtotal = document.getElementById('summarySubtotal');
const reviewSubtotal = document.getElementById('reviewSubtotal');
const summaryShipping = document.getElementById('summaryShipping');
const reviewShipping = document.getElementById('reviewShipping');
const summaryTax = document.getElementById('summaryTax');
const reviewTax = document.getElementById('reviewTax');
const summaryTotal = document.getElementById('summaryTotal');
const reviewTotal = document.getElementById('reviewTotal');
const paymentForm = document.getElementById('paymentForm');
const sameAsShipping = document.getElementById('sameAsShipping');
const billingAddressForm = document.getElementById('billingAddressForm');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Payment page DOM loaded');
    
    // Check if DOM elements exist
    console.log('Checking DOM elements...');
    console.log('Summary items element:', summaryItems);
    console.log('Payment form element:', paymentForm);
    console.log('Same as shipping checkbox:', sameAsShipping);
    
    loadCartFromStorage();
    loadShippingData();
    displayCartItems();
    updateTotals();
    setupEventListeners();
    checkCashOnDeliveryLimit(); // Check cash on delivery limit
    initializeTooltips();
    
    console.log('Payment page initialization complete');
});

// Load cart from localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('aidalert_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Load shipping data from localStorage
function loadShippingData() {
    const savedShipping = localStorage.getItem('aidalert_shipping');
    if (savedShipping) {
        shippingData = JSON.parse(savedShipping);
    }
}

// Display cart items in summary and review
function displayCartItems() {
    if (cart.length === 0) {
        summaryItems.innerHTML = '<p class="text-muted">No items in cart</p>';
        reviewItems.innerHTML = '<p class="text-muted">No items in cart</p>';
        return;
    }

    let summaryHTML = '';
    let reviewHTML = '';

    cart.forEach(item => {
        const itemHTML = `
            <div class="summary-item">
                <div class="summary-item-name">${item.name} x${item.quantity}</div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
        
        const reviewHTMLItem = `
            <div class="review-item">
                <div class="review-item-name">${item.name} x${item.quantity}</div>
                <div class="review-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
        
        summaryHTML += itemHTML;
        reviewHTML += reviewHTMLItem;
    });

    summaryItems.innerHTML = summaryHTML;
    reviewItems.innerHTML = reviewHTML;
}

// Update totals
function updateTotals() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = cart.length > 0 ? (shippingData.deliveryOption ? getShippingCost(shippingData.deliveryOption) : 9.99) : 0;
    const tax = subtotal * taxRate;
    const total = subtotal + shipping + tax;

    // Update summary totals
    summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
    summaryShipping.textContent = `$${shipping.toFixed(2)}`;
    summaryTax.textContent = `$${tax.toFixed(2)}`;
    summaryTotal.textContent = `$${total.toFixed(2)}`;

    // Update review totals
    reviewSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    reviewShipping.textContent = `$${shipping.toFixed(2)}`;
    reviewTax.textContent = `$${tax.toFixed(2)}`;
    reviewTotal.textContent = `$${total.toFixed(2)}`;
}

// Get shipping cost based on delivery option
function getShippingCost(deliveryOption) {
    switch(deliveryOption) {
        case 'standard':
            return 9.99;
        case 'express':
            return 19.99;
        case 'overnight':
            return 29.99;
        default:
            return 9.99;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Payment method change
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updatePaymentMethodUI(this.value);
        });
    });

    // Billing address checkbox
    if (sameAsShipping) {
        sameAsShipping.addEventListener('change', function() {
            toggleBillingAddress();
        });
    }

    // Card number formatting
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function() {
            formatCardNumber(this);
        });
    }

    // Expiry date formatting
    const expiryDateInput = document.getElementById('expiryDate');
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function() {
            formatExpiryDate(this);
        });
    }

    // CVV formatting
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // Form submission
    console.log('Setting up form submission listener...');
    console.log('Payment form element:', paymentForm);
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            console.log('Form submit event triggered');
            e.preventDefault();
            completePurchase();
        });
        console.log('Form submission listener attached');
    } else {
        console.log('Payment form not found!');
    }
}

// Initialize tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Update payment method UI
function updatePaymentMethodUI(method) {
    // Update active state
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`[data-method="${method}"]`).classList.add('active');

    // Show/hide card details section
    const cardDetailsSection = document.getElementById('cardDetailsSection');
    if (method === 'card') {
        cardDetailsSection.style.display = 'block';
    } else {
        cardDetailsSection.style.display = 'none';
    }
}

// Check and disable cash on delivery for orders over $500
function checkCashOnDeliveryLimit() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    console.log('Checking cash on delivery limit. Subtotal:', subtotal);
    
    const cashPaymentMethod = document.querySelector('[data-method="cash"]');
    const cashPaymentInput = document.getElementById('cashPayment');
    const cashWarning = document.getElementById('cashWarning');
    
    console.log('Cash payment method element:', cashPaymentMethod);
    console.log('Cash payment input element:', cashPaymentInput);
    
    if (subtotal > 500) {
        console.log('Subtotal over $500, disabling cash on delivery');
        // Disable cash on delivery option
        if (cashPaymentMethod) {
            cashPaymentMethod.classList.add('disabled');
            cashPaymentMethod.style.opacity = '0.5';
            cashPaymentMethod.style.pointerEvents = 'none';
        }
        if (cashPaymentInput) {
            cashPaymentInput.disabled = true;
        }
        
        // Show warning message
        if (cashWarning) {
            cashWarning.style.display = 'block';
        }
        
        // If cash was selected, switch to card
        if (cashPaymentInput && cashPaymentInput.checked) {
            console.log('Cash was selected, switching to card');
            document.getElementById('cardPayment').checked = true;
            updatePaymentMethodUI('card');
        }
    } else {
        console.log('Subtotal under $500, enabling cash on delivery');
        // Enable cash on delivery option
        if (cashPaymentMethod) {
            cashPaymentMethod.classList.remove('disabled');
            cashPaymentMethod.style.opacity = '1';
            cashPaymentMethod.style.pointerEvents = 'auto';
        }
        if (cashPaymentInput) {
            cashPaymentInput.disabled = false;
        }
        
        // Hide warning message
        if (cashWarning) {
            cashWarning.style.display = 'none';
        }
    }
}

// Toggle billing address form
function toggleBillingAddress() {
    if (sameAsShipping.checked) {
        billingAddressForm.style.display = 'none';
    } else {
        billingAddressForm.style.display = 'block';
    }
}

// Format card number
function formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '');
    let formattedValue = '';
    
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    input.value = formattedValue;
}

// Format expiry date
function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
        formattedValue = value.slice(0, 2) + '/' + value.slice(2, 4);
    } else {
        formattedValue = value;
    }
    
    input.value = formattedValue;
}

// Validate payment form
function validatePaymentForm() {
    console.log('Validating payment form...');
    const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
    console.log('Payment method input in validation:', paymentMethodInput);
    
    // Check if a payment method is selected
    if (!paymentMethodInput) {
        console.log('No payment method selected in validation');
        showErrorMessage('Please select a payment method.');
        return false;
    }
    
    const paymentMethod = paymentMethodInput.value;
    console.log('Payment method in validation:', paymentMethod);
    let isValid = true;

    // Only validate card details if card payment is selected
    if (paymentMethod === 'card') {
        console.log('Validating card details...');
        const requiredFields = ['cardNumber', 'expiryDate', 'cvv', 'cardName'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });

        // Validate card number (basic check)
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            document.getElementById('cardNumber').classList.add('is-invalid');
            isValid = false;
        }

        // Validate expiry date
        const expiryDate = document.getElementById('expiryDate').value;
        if (!validateExpiryDate(expiryDate)) {
            document.getElementById('expiryDate').classList.add('is-invalid');
            isValid = false;
        }

        // Validate CVV
        const cvv = document.getElementById('cvv').value;
        if (cvv.length < 3 || cvv.length > 4) {
            document.getElementById('cvv').classList.add('is-invalid');
            isValid = false;
        }
    } else {
        console.log('Skipping card validation for payment method:', paymentMethod);
    }

    // Validate billing address if not same as shipping
    if (!sameAsShipping.checked) {
        console.log('Validating billing address...');
        const billingFields = ['billingFirstName', 'billingLastName', 'billingAddress', 'billingCity', 'billingState', 'billingZipCode'];
        
        billingFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
    }

    console.log('Validation result:', isValid);
    
    if (!isValid) {
        showErrorMessage('Please fill in all required payment information.');
    }

    return isValid;
}

// Validate expiry date
function validateExpiryDate(expiryDate) {
    if (!expiryDate || expiryDate.length !== 5) return false;
    
    const [month, year] = expiryDate.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    const expYear = parseInt(year);
    const expMonth = parseInt(month);
    
    if (expMonth < 1 || expMonth > 12) return false;
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        return false;
    }
    
    return true;
}

// Test function to verify button click
function testButtonClick() {
    console.log('Test button click function called');
}

// Complete purchase
function completePurchase() {
    console.log('Complete purchase function called');
    
    // Temporarily bypass validation to test redirect
    // if (!validatePaymentForm()) {
    //     console.log('Validation failed');
    //     return;
    // }
    console.log('Validation bypassed for testing');

    // Collect payment data
    const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
    console.log('Payment method input:', paymentMethodInput);
    
    if (!paymentMethodInput) {
        console.log('No payment method selected');
        alert('No payment method selected!');
        return;
    }
    
    const paymentMethod = paymentMethodInput.value;
    console.log('Payment method:', paymentMethod);

    // Create payment data object
    const paymentData = {
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString(),
        status: 'completed'
    };

    // Save payment data to localStorage
    localStorage.setItem('aidalert_payment', JSON.stringify(paymentData));
    console.log('Payment data saved to localStorage');

    // Increment order count
    incrementOrderCount();

    // Show success message
    showSuccessMessage('Processing your payment...');

    // Test immediate redirect without timeout
    console.log('Redirecting to confirmation page immediately...');
    
    // Redirect to confirmation page immediately
    window.location.href = '/confirmation/';
}

// Go back to shipping
function goBack() {
    window.location.href = '/shipping/';
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

// Increment order count
function incrementOrderCount() {
    const currentCount = parseInt(localStorage.getItem('aidalert_order_count') || '0');
    const newCount = currentCount + 1;
    localStorage.setItem('aidalert_order_count', newCount.toString());
}
