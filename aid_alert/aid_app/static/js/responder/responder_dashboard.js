document.addEventListener('DOMContentLoaded', () => {
    // Availability toggle functionality (matches base template id)
    const headerToggle = document.getElementById('header-availability-toggle');

    if (headerToggle) {
        headerToggle.addEventListener('change', function () {
            const isChecked = this.checked;
            const toggleText = this.nextElementSibling.querySelector('.toggle-text');

            // Update UI
            if (toggleText) toggleText.textContent = isChecked ? 'Available' : 'Unavailable';

            // Save to localStorage
            localStorage.setItem('responderAvailability', isChecked ? 'available' : 'unavailable');

            // Show notification
            showNotification(`Status changed to ${isChecked ? 'Available' : 'Unavailable'}`);
        });

        // Initialize state
        const savedAvailability = localStorage.getItem('responderAvailability');
        if (savedAvailability === 'unavailable') {
            headerToggle.checked = false;
            // update text if present
        }
    }
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'glass-alert notification-toast';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Navigate to location using Google Maps
function navigateToLocation(location) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(mapsUrl, '_blank');
    showNotification(`Opening navigation to: ${location}`);
}

// Contact user via phone
function contactUser(phoneNumber) {
    if (phoneNumber && phoneNumber !== 'Pending') {
        window.open(`tel:${phoneNumber}`, '_self');
        showNotification(`Dialing: ${phoneNumber}`);
    } else {
        showNotification('Phone number not available');
    }
}
