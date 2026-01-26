let globalOrderData = {};

function initConfirmation(orderData) {
    globalOrderData = orderData;
    populateOrderDetails();
    renderOrderItems();
    updateOrderSummary();

    // Simulate order status update (mock)
    setTimeout(() => {
        const statusElement = document.querySelector('.status-processing');
        if (statusElement) {
            statusElement.textContent = 'Confirmed';
            statusElement.className = 'value status-confirmed';
        }
    }, 5000);
}

function populateOrderDetails() {
    // Update order information
    if (globalOrderData.orderDate) {
        const dateEl = document.getElementById('orderDate');
        if (dateEl) dateEl.textContent = formatDate(globalOrderData.orderDate);
    }

    if (globalOrderData.expectedDelivery) {
        const deliveryEl = document.getElementById('deliveryDate');
        if (deliveryEl) deliveryEl.textContent = formatDate(globalOrderData.expectedDelivery);
    }
}

function renderOrderItems() {
    const itemsContainer = document.getElementById('orderItems');
    if (!itemsContainer || !globalOrderData.items) return;

    itemsContainer.innerHTML = globalOrderData.items.map(item => `
        <div class="order-item">
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="item-details">
                <h4>${item.name}</h4>
                <p>Quantity: ${item.quantity}</p>
            </div>
            <div class="item-price">
                $${(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');
}

function updateOrderSummary() {
    if (!globalOrderData.items) return;

    const subtotal = globalOrderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * (globalOrderData.taxRate || 0.1);
    const shipping = globalOrderData.shippingCost || 9.99;
    const discount = globalOrderData.discount || 0;
    const total = subtotal + shipping + tax - discount;

    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    const shippingEl = document.getElementById('shipping');
    if (shippingEl) shippingEl.textContent = `$${shipping.toFixed(2)}`;

    const taxEl = document.getElementById('tax');
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;

    if (discount > 0) {
        const discountEl = document.getElementById('discount');
        if (discountEl) discountEl.textContent = `-$${discount.toFixed(2)}`;
        const discountRow = document.getElementById('discountRow');
        if (discountRow) discountRow.style.display = 'flex';
    }

    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

function formatDate(date) {
    // Check if date is Date object or string
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function printOrder() {
    window.print();
}

function continueShopping() {
    window.location.href = window.buyProductsUrl || 'buy_products_new.html';
}

function viewOrderHistory() {
    window.location.href = window.orderHistoryUrl || 'order_history.html';
}
