// Dashboard Statistics Tracking

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    updateDashboardStatistics();
});

// Get statistics from localStorage
function getDashboardStats() {
    const stats = {
        incidents: parseInt(localStorage.getItem('aidalert_incident_count') || '0'),
        responders: parseInt(localStorage.getItem('aidalert_responder_count') || '0'),
        orders: parseInt(localStorage.getItem('aidalert_order_count') || '0')
    };
    return stats;
}

// Update dashboard statistics display
function updateDashboardStatistics() {
    const stats = getDashboardStats();
    
    // Update incident count
    const incidentElement = document.getElementById('incidentCount');
    if (incidentElement) {
        incidentElement.textContent = stats.incidents;
    }
    
    // Update responder count
    const responderElement = document.getElementById('responderCount');
    if (responderElement) {
        responderElement.textContent = stats.responders;
    }
    
    // Update order count
    const orderElement = document.getElementById('orderCount');
    if (orderElement) {
        orderElement.textContent = stats.orders;
    }
}

// Increment incident count
function incrementIncidentCount() {
    const currentCount = parseInt(localStorage.getItem('aidalert_incident_count') || '0');
    const newCount = currentCount + 1;
    localStorage.setItem('aidalert_incident_count', newCount.toString());
    updateDashboardStatistics();
}

// Increment responder count
function incrementResponderCount() {
    const currentCount = parseInt(localStorage.getItem('aidalert_responder_count') || '0');
    const newCount = currentCount + 1;
    localStorage.setItem('aidalert_responder_count', newCount.toString());
    updateDashboardStatistics();
}

// Increment order count
function incrementOrderCount() {
    const currentCount = parseInt(localStorage.getItem('aidalert_order_count') || '0');
    const newCount = currentCount + 1;
    localStorage.setItem('aidalert_order_count', newCount.toString());
    updateDashboardStatistics();
}

// Export functions for global access
window.incrementIncidentCount = incrementIncidentCount;
window.incrementResponderCount = incrementResponderCount;
window.incrementOrderCount = incrementOrderCount;
