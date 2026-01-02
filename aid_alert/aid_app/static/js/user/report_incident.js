// Report Incident Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    setupIncidentForm();
});

function setupIncidentForm() {
    const form = document.getElementById('incidentForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            submitIncident();
        });
    }
}

function submitIncident() {
    // Get form data
    const incidentType = document.getElementById('incidentType').value;
    const description = document.getElementById('description').value;
    const location = document.getElementById('location').value;
    const severity = document.getElementById('severity').value;
    
    // Validation
    if (!incidentType || !description || !location || !severity) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Create incident data
    const incidentData = {
        id: Date.now().toString(),
        type: incidentType,
        description: description,
        location: location,
        severity: severity,
        timestamp: new Date().toISOString(),
        status: 'reported'
    };
    
    // Save incident to localStorage
    let existingIncidents = JSON.parse(localStorage.getItem('aidalert_incidents') || '[]');
    existingIncidents.unshift(incidentData);
    localStorage.setItem('aidalert_incidents', JSON.stringify(existingIncidents));
    
    // Increment incident count
    incrementIncidentCount();
    
    // Show success message
    showSuccessMessage('Incident reported successfully! Help is on the way.');
    
    // Reset form
    document.getElementById('incidentForm').reset();
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
        window.location.href = '/dashboard/';
    }, 2000);
}

function incrementIncidentCount() {
    const currentCount = parseInt(localStorage.getItem('aidalert_incident_count') || '0');
    const newCount = currentCount + 1;
    localStorage.setItem('aidalert_incident_count', newCount.toString());
}

function showSuccessMessage(message) {
    // Remove any existing messages
    const existingMessage = document.querySelector('.alert-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create success message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success alert-dismissible fade show';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    messageDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}
