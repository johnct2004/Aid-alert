// Confirmation Page JavaScript
let cart = [];
let shippingData = {};
let paymentData = {};
let currentRating = 0; // Track the current selected rating

// DOM Elements
const orderNumber = document.getElementById('orderNumber');
const orderDate = document.getElementById('orderDate');
const estimatedDelivery = document.getElementById('estimatedDelivery');
const orderItems = document.getElementById('orderItems');
const subtotal = document.getElementById('subtotal');
const shipping = document.getElementById('shipping');
const tax = document.getElementById('tax');
const total = document.getElementById('total');
const shippingDetails = document.getElementById('shippingDetails');
const paymentDetails = document.getElementById('paymentDetails');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadOrderData();
    displayOrderDetails();
    setupEventListeners();
    setupFeedbackSystem();
});

// Setup feedback system
function setupFeedbackSystem() {
    const starButtons = document.querySelectorAll('.star-btn');
    
    starButtons.forEach(button => {
        button.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            currentRating = rating; // Store the selected rating
            setRating(rating);
            console.log('Star clicked, rating set to:', rating);
        });
        
        button.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            previewRating(rating);
        });
    });
    
    // Reset to actual rating when mouse leaves
    const ratingStars = document.querySelector('.rating-stars');
    if (ratingStars) {
        ratingStars.addEventListener('mouseleave', function() {
            if (currentRating > 0) {
                setRating(currentRating);
            } else {
                clearRating();
            }
        });
    }
}

// Set rating
function setRating(rating) {
    const starButtons = document.querySelectorAll('.star-btn');
    starButtons.forEach((button, index) => {
        if (index < rating) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Preview rating on hover
function previewRating(rating) {
    const starButtons = document.querySelectorAll('.star-btn');
    starButtons.forEach((button, index) => {
        if (index < rating) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Get current active rating
function getActiveRating() {
    return currentRating;
}

// Clear rating
function clearRating() {
    const starButtons = document.querySelectorAll('.star-btn');
    starButtons.forEach(button => {
        button.classList.remove('active');
    });
}

// Submit feedback
function submitFeedback() {
    const rating = getActiveRating();
    const feedbackText = document.querySelector('.feedback-textarea').value.trim();
    
    if (rating === 0) {
        showFeedbackMessage('Please select a rating before submitting feedback.', 'warning');
        return;
    }
    
    // Create feedback data
    const feedbackData = {
        rating: rating,
        feedback: feedbackText,
        orderNumber: orderNumber ? orderNumber.textContent : '',
        timestamp: new Date().toISOString()
    };
    
    // Save feedback to localStorage (in a real app, this would be sent to a server)
    let existingFeedback = JSON.parse(localStorage.getItem('aidalert_feedback') || '[]');
    existingFeedback.push(feedbackData);
    localStorage.setItem('aidalert_feedback', JSON.stringify(existingFeedback));
    
    // Show success message
    showFeedbackMessage('Thank you for your feedback! We appreciate your input.', 'success');
    
    // Reset form
    setTimeout(() => {
        currentRating = 0; // Reset the rating
        clearRating();
        document.querySelector('.feedback-textarea').value = '';
    }, 2000);
}

// Show feedback message
function showFeedbackMessage(message, type) {
    // Remove any existing messages
    const existingMessage = document.querySelector('.feedback-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `feedback-message alert alert-${type === 'success' ? 'success' : 'warning'} alert-dismissible fade show`;
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert after feedback form
    const feedbackForm = document.querySelector('.feedback-form');
    if (feedbackForm) {
        feedbackForm.parentNode.insertBefore(messageDiv, feedbackForm.nextSibling);
    }
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Load order data from localStorage
function loadOrderData() {
    console.log('Loading order data...');
    
    const savedCart = localStorage.getItem('aidalert_cart');
    const savedShipping = localStorage.getItem('aidalert_shipping');
    const savedPayment = localStorage.getItem('aidalert_payment');
    
    console.log('Saved cart:', savedCart);
    console.log('Saved shipping:', savedShipping);
    console.log('Saved payment:', savedPayment);
    
    if (savedCart) {
        cart = JSON.parse(savedCart);
        console.log('Parsed cart:', cart);
    }
    
    if (savedShipping) {
        shippingData = JSON.parse(savedShipping);
        console.log('Parsed shipping data:', shippingData);
    }
    
    if (savedPayment) {
        paymentData = JSON.parse(savedPayment);
        console.log('Parsed payment data:', paymentData);
    }
}

// Display order details
function displayOrderDetails() {
    // Generate order number
    const orderNum = generateOrderNumber();
    orderNumber.textContent = orderNum;
    
    // Set order date
    const today = new Date();
    orderDate.textContent = formatDate(today);
    
    // Calculate estimated delivery
    const deliveryDate = calculateDeliveryDate(today, shippingData.deliveryOption);
    estimatedDelivery.textContent = formatDate(deliveryDate);
    
    // Display order items
    displayOrderItems();
    
    // Display order totals
    displayOrderTotals();
    
    // Display shipping information
    displayShippingInformation();
    
    // Display payment information
    displayPaymentInformation();
    
    // Clear cart data
    clearCartData();
}

// Generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

// Format date
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
}

// Calculate delivery date
function calculateDeliveryDate(orderDate, deliveryOption) {
    const deliveryDate = new Date(orderDate);
    
    switch(deliveryOption) {
        case 'standard':
            deliveryDate.setDate(deliveryDate.getDate() + 5); // 5 business days
            break;
        case 'express':
            deliveryDate.setDate(deliveryDate.getDate() + 2); // 2 business days
            break;
        case 'overnight':
            deliveryDate.setDate(deliveryDate.getDate() + 1); // 1 business day
            break;
        default:
            deliveryDate.setDate(deliveryDate.getDate() + 5); // Default to standard
    }
    
    return deliveryDate;
}

// Display order items
function displayOrderItems() {
    if (cart.length === 0) {
        orderItems.innerHTML = '<p class="text-muted">No items in order</p>';
        return;
    }
    
    let itemsHTML = '';
    
    cart.forEach(item => {
        itemsHTML += `
            <div class="order-item">
                <div class="order-item-name">${item.name} x${item.quantity}</div>
                <div class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `;
    });
    
    orderItems.innerHTML = itemsHTML;
}

// Display order totals
function displayOrderTotals() {
    console.log('Displaying order totals...');
    console.log('Cart:', cart);
    console.log('Payment data:', paymentData);
    
    // Calculate subtotal from cart
    let subtotalAmount = 0;
    if (cart && cart.length > 0) {
        subtotalAmount = cart.reduce((total, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 0;
            return total + (price * quantity);
        }, 0);
    }
    
    // Get shipping, tax, and total from payment data or calculate them
    let shippingAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;
    
    if (paymentData && Object.keys(paymentData).length > 0) {
        shippingAmount = parseFloat(paymentData.shipping) || 0;
        taxAmount = parseFloat(paymentData.tax) || 0;
        totalAmount = parseFloat(paymentData.total) || 0;
        
        // If total is not available, calculate it
        if (totalAmount === 0) {
            totalAmount = subtotalAmount + shippingAmount + taxAmount;
        }
    } else {
        // If no payment data, calculate values
        const taxRate = 0.08; // 8% tax rate
        shippingAmount = 10; // Default shipping
        taxAmount = subtotalAmount * taxRate;
        totalAmount = subtotalAmount + shippingAmount + taxAmount;
    }
    
    console.log('Calculated values:');
    console.log('Subtotal:', subtotalAmount);
    console.log('Shipping:', shippingAmount);
    console.log('Tax:', taxAmount);
    console.log('Total:', totalAmount);
    
    // Update DOM elements
    if (subtotal) {
        subtotal.textContent = `$${subtotalAmount.toFixed(2)}`;
    }
    if (shipping) {
        shipping.textContent = `$${shippingAmount.toFixed(2)}`;
    }
    if (tax) {
        tax.textContent = `$${taxAmount.toFixed(2)}`;
    }
    if (total) {
        total.textContent = `$${totalAmount.toFixed(2)}`;
    }
}

// Display shipping information
function displayShippingInformation() {
    if (!shippingData || Object.keys(shippingData).length === 0) {
        shippingDetails.innerHTML = '<p class="text-muted">No shipping information available</p>';
        return;
    }
    
    const shippingHTML = `
        <div class="shipping-detail">
            <strong>Name:</strong> ${shippingData.firstName} ${shippingData.lastName}
        </div>
        <div class="shipping-detail">
            <strong>Email:</strong> ${shippingData.email}
        </div>
        <div class="shipping-detail">
            <strong>Address:</strong> ${shippingData.address}
        </div>
        <div class="shipping-detail">
            <strong>City:</strong> ${shippingData.city}, ${shippingData.state} ${shippingData.zipCode}
        </div>
        ${shippingData.deliveryInstructions ? `
            <div class="shipping-detail">
                <strong>Delivery Instructions:</strong> ${shippingData.deliveryInstructions}
            </div>
        ` : ''}
        <div class="shipping-detail">
            <strong>Delivery Option:</strong> ${formatDeliveryOption(shippingData.deliveryOption)}
        </div>
    `;
    
    shippingDetails.innerHTML = shippingHTML;
}

// Display payment information
function displayPaymentInformation() {
    if (!paymentData || Object.keys(paymentData).length === 0) {
        paymentDetails.innerHTML = '<p class="text-muted">No payment information available</p>';
        return;
    }
    
    let paymentHTML = `
        <div class="payment-detail">
            <strong>Payment Method:</strong> ${formatPaymentMethod(paymentData.method)}
        </div>
    `;
    
    if (paymentData.method === 'card' && paymentData.card) {
        const lastFour = paymentData.card.number.slice(-4);
        const cardType = getCardType(paymentData.card.number);
        paymentHTML += `
            <div class="payment-detail">
                <strong>Card:</strong> ${cardType} ending in ${lastFour}
            </div>
            <div class="payment-detail">
                <strong>Cardholder:</strong> ${paymentData.card.name}
            </div>
        `;
    }
    
    paymentHTML += `
        <div class="payment-detail">
            <strong>Amount Paid:</strong> $${paymentData.total.toFixed(2)}
        </div>
    `;
    
    paymentDetails.innerHTML = paymentHTML;
}

// Format delivery option
function formatDeliveryOption(option) {
    switch(option) {
        case 'standard':
            return 'Standard Shipping (5-7 business days)';
        case 'express':
            return 'Express Shipping (2-3 business days)';
        case 'overnight':
            return 'Overnight Shipping (1 business day)';
        default:
            return 'Standard Shipping';
    }
}

// Format payment method
function formatPaymentMethod(method) {
    switch(method) {
        case 'card':
            return 'Credit/Debit Card';
        case 'paypal':
            return 'PayPal';
        case 'cash':
            return 'Cash on Delivery';
        default:
            return 'Unknown';
    }
}

// Get card type from card number
function getCardType(cardNumber) {
    const number = cardNumber.replace(/\s/g, '');
    
    if (number.startsWith('4')) {
        return 'Visa';
    } else if (number.startsWith('5')) {
        return 'Mastercard';
    } else if (number.startsWith('3')) {
        return 'American Express';
    } else if (number.startsWith('6')) {
        return 'Discover';
    } else {
        return 'Credit Card';
    }
}

// Clear cart data after successful order
function clearCartData() {
    // Clear cart
    localStorage.removeItem('aidalert_cart');
    
    // Clear shipping data
    localStorage.removeItem('aidalert_shipping');
    
    // Clear payment data
    localStorage.removeItem('aidalert_payment');
    
    // Update cart count in navigation (if it exists)
    updateCartCount();
}

// Update cart count in navigation
function updateCartCount() {
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = '0';
        cartCountElement.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add any additional event listeners if needed
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
