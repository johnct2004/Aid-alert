document.addEventListener('DOMContentLoaded', () => {
    // Initial setup for charts if needed
    // Apply widths from data attributes (fixes CSS linter errors)
    document.querySelectorAll('.segment-fill[data-width]').forEach(el => {
        setTimeout(() => { // Small delay for transition effect
            el.style.width = el.dataset.width;
        }, 100);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Action Buttons
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportToPDF);

    const trendBtn = document.querySelector('.generate-trend-btn'); // If exists, or generic generate
    // The HTML has .generate-btn for generateSampleOrders and generateSellerReport
    // They share class .generate-btn but differ in onclick.
    // HTML:
    // <button class="btn-secondary generate-btn" onclick="generateSampleOrders()">
    // <button class="btn-action generate-btn" onclick="generateSellerReport()">
    // We need specific classes or specific selectors.
    // Let's add specific classes to HTML first or use what distinguishes them.
    // One is .btn-secondary, one is .btn-action.
    // Better: Add specific classes in HTML update or rely on text content? No, dangerous.
    // I will assume I update HTML to add classes: .generate-sample-btn and .generate-report-btn.

    // Wait, I cannot update JS to use classes that don't exist yet.
    // I will update HTML first? No, I can write JS to look for them.

    const sampleBtn = document.querySelector('.generate-sample-btn');
    if (sampleBtn) sampleBtn.addEventListener('click', generateSampleOrders);

    const reportBtn = document.querySelector('.generate-report-btn');
    if (reportBtn) reportBtn.addEventListener('click', generateSellerReport);
});

function generateSellerReport() {
    // PDF Export action
    window.print();
}

function exportToPDF() {
    window.print();
}


// Helper to get URLs from DOM
function getSellerUrls() {
    const section = document.querySelector('.content-card[data-seller-report-url]');
    return {
        createSampleOrders: section ? section.dataset.createSampleUrl : '',
        sellerReport: section ? section.dataset.sellerReportUrl : ''
    };
}

function generateSampleOrders() {
    const urls = getSellerUrls();
    const button = document.querySelector('.generate-btn');
    const originalContent = button.innerHTML;
    button.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Generating...';
    button.disabled = true;
    if (urls.createSampleOrders) {
        window.location.href = urls.createSampleOrders;
    } else {
        console.error('Create Sample Orders URL not found');
        button.disabled = false;
        button.innerHTML = originalContent;
    }
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px;
        border-radius: 4px; color: white; font-weight: 500; z-index: 1000;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: slideIn 0.3s ease forwards;
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => document.body.removeChild(messageDiv), 300);
    }, 3000);
}

// Filter Logic
const periodBtns = document.querySelectorAll('.period-btn:not(.custom-btn)');
periodBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.custom-btn').classList.remove('active');
        this.classList.add('active');
        document.getElementById('customRange').classList.remove('show');

        fetchData({ period: this.dataset.period });
    });
});

function fetchData(params) {
    const urls = getSellerUrls();
    if (!urls.sellerReport) {
        console.error('Seller Report URL not found');
        return;
    }

    const query = new URLSearchParams(params).toString();
    fetch(`${urls.sellerReport}?${query}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) updateDashboard(data);
        });
}

let currentMetric = 'revenue';
let currentData = null;

function updateDashboard(data) {
    currentData = data; // Store data for switching

    // Update Metrics
    animateValue('totalRevenue', parseFloat(document.getElementById('totalRevenue').textContent.replace(/[$,]/g, '')), data.metrics.revenue, '$');
    updateGrowth('totalRevenue', data.metrics.growth.revenue);

    animateValue('totalOrders', parseInt(document.getElementById('totalOrders').textContent), data.metrics.orders, '');
    updateGrowth('totalOrders', data.metrics.growth.orders);

    document.getElementById('avgOrderValue').textContent = '$' + data.metrics.avg_order.toFixed(2);
    updateGrowth('avgOrderValue', data.metrics.growth.avg_order);

    document.getElementById('uniqueCustomers').textContent = data.metrics.customers;
    updateGrowth('uniqueCustomers', data.metrics.growth.customers);

    renderChart();
    updateProductTable(data.products);
    updateCustomerAnalytics(data);
}

function updateCustomerAnalytics(data) {
    // Segments
    const seg = data.customer_segments;
    if (seg) {
        updateSegment('Original', seg.new_customers_pct);
        updateSegment('Returning', seg.returning_pct);
        updateSegment('VIP', seg.vip_pct);
    }

    // Top Customers
    const list = document.querySelector('.top-customers');
    if (list) {
        list.innerHTML = '';
        if (!data.top_customers || data.top_customers.length === 0) {
            list.innerHTML = '<div class="customer-item empty-state">No customer data available yet.</div>';
        } else {
            data.top_customers.forEach(c => {
                const html = `
                <div class="customer-item">
                    <span class="customer-name">${c.name}</span>
                    <span class="customer-spent">$${parseFloat(c.total_spent).toFixed(2)}</span>
                </div>`;
                list.insertAdjacentHTML('beforeend', html);
            });
        }
    }
}

function updateSegment(label, pct) {
    // Find segment item by label text
    const items = document.querySelectorAll('.segment-item');
    items.forEach(item => {
        const lbl = item.querySelector('.segment-label');
        if (lbl && lbl.textContent.trim() === label) {
            const pctEl = item.querySelector('.segment-percentage');
            const fillEl = item.querySelector('.segment-fill');
            if (pctEl) pctEl.textContent = Math.round(pct) + '%';
            if (fillEl) fillEl.style.width = pct + '%';
        }
    });
}

function updateProductTable(products) {
    const tableBody = document.querySelector('.table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!products || products.length === 0) {
        tableBody.innerHTML = `
            <div class="table-row">
                <div class="table-cell empty-state" colspan="5">
                    No active orders in this period.
                </div>
            </div>
        `;
        return;
    }

    products.forEach(p => {
        const html = `
            <div class="table-row">
                <div class="table-cell product-cell">
                    <div class="product-info">
                        <div class="product-image">
                            <span class="material-icons-round">medical_services</span>
                        </div>
                        <div class="product-details">
                            <h4 class="product-name">${p.name}</h4>
                            <p class="product-sku">${String(p.id).padStart(6, '0')}</p>
                        </div>
                    </div>
                </div>
                <div class="table-cell units-cell">${p.units_sold}</div>
                <div class="table-cell revenue-cell">$${parseFloat(p.revenue).toFixed(2)}</div>
                <div class="table-cell growth-cell">
                    <span class="growth positive">${p.growth}</span>
                </div>
            </div>
        `;
        tableBody.insertAdjacentHTML('beforeend', html);
    });
}

function renderChart() {
    if (!currentData) return;

    const chartContainer = document.querySelector('.chart-bars');
    const labelsContainer = document.querySelector('.chart-labels');
    chartContainer.innerHTML = '';
    labelsContainer.innerHTML = '';

    const dataArray = currentData.chart[currentMetric];
    const maxVal = Math.max(...dataArray, 10) * 1.1; // Add 10% headroom

    dataArray.forEach((val, index) => {
        const height = (val / maxVal) * 100;
        const label = currentData.chart.labels[index];
        const prefix = currentMetric === 'revenue' ? '$' : '';

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}%`;
        bar.innerHTML = `<span class="bar-value">${prefix}${currentMetric === 'revenue' ? val.toFixed(0) : val}</span>`;
        chartContainer.appendChild(bar);

        const lbl = document.createElement('span');
        lbl.textContent = label;
        labelsContainer.appendChild(lbl);
    });
}

// Chart Metric Switching
document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Map button text to metric key
        const text = this.textContent.trim().toLowerCase();
        if (text.includes('revenue')) currentMetric = 'revenue';
        else if (text.includes('orders')) currentMetric = 'orders';
        else if (text.includes('customers')) currentMetric = 'customers';

        renderChart();
    });
});

function updateGrowth(metricId, growthValue) {
    const card = document.getElementById(metricId).closest('.stat-card');
    const changeEl = card.querySelector('.stat-change');
    const icon = changeEl.querySelector('.material-icons-round');
    const text = changeEl.querySelector('span:last-child');

    const isPositive = growthValue >= 0;
    const absValue = Math.abs(growthValue).toFixed(1);

    // Update Class
    changeEl.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;

    // Update Icon
    icon.textContent = isPositive ? 'trending_up' : 'trending_down';

    // Update Text
    text.textContent = `${isPositive ? '+' : '-'}${absValue}%`;
}

function animateValue(id, start, end, prefix) {
    const obj = document.getElementById(id);
    if (!obj || start === end) return;
    const range = end - start;
    const duration = 500;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const val = start + (range * progress);
        obj.textContent = prefix + (prefix === '$' ? val.toFixed(2) : Math.floor(val));
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.textContent = prefix + (prefix === '$' ? end.toFixed(2) : end);
    }
    window.requestAnimationFrame(step);
}

// Toggle custom range
const customBtn = document.querySelector('[data-period="custom"]');
const customRange = document.getElementById('customRange');

if (customBtn) {
    customBtn.addEventListener('click', function () {
        customRange.classList.toggle('show');
        if (customRange.classList.contains('show')) {
            const startInput = document.getElementById('startDate');
            const endInput = document.getElementById('endDate');
            const checkDates = () => {
                if (startInput.value && endInput.value) {
                    fetchData({ start_date: startInput.value, end_date: endInput.value });
                }
            };
            startInput.addEventListener('change', checkDates);
            endInput.addEventListener('change', checkDates);
        }
    });
}
