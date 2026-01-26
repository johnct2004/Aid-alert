function acceptIncident(incidentId) {
    console.log('acceptIncident called with:', incidentId);

    if (!incidentId) {
        console.error('ERROR: incidentId is undefined or null!');
        alert('Error: Incident ID is missing. Please refresh the page and try again.');
        return;
    }

    if (confirm(`Are you sure you want to accept incident ${incidentId}?`)) {
        console.log('User confirmed acceptance');

        // Update availability toggle to unavailable when accepting incident
        const headerToggle = document.getElementById('header-availability-toggle');
        if (headerToggle) {
            headerToggle.checked = false;
            headerToggle.dispatchEvent(new Event('change'));
        }

        showNotification(`Incident ${incidentId} accepted! Redirecting...`);
        const redirectUrl = `/accept-incident/?id=${incidentId}`;
        console.log('About to redirect to:', redirectUrl);

        // Try immediate redirect first
        window.location.href = redirectUrl;

        // Fallback
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1000);
    } else {
        console.log('User cancelled acceptance');
    }
}

// Notification function
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'glass-alert';
    notification.innerHTML = `<span class="material-icons-round">check_circle</span> <span>${message}</span>`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.data-table tbody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Filter functionality
    const urgencyFilter = document.getElementById('urgency-filter');
    const typeFilter = document.getElementById('type-filter');
    const distanceFilter = document.getElementById('distance-filter');

    if (urgencyFilter) urgencyFilter.addEventListener('change', filterTable);
    if (typeFilter) typeFilter.addEventListener('change', filterTable);
    if (distanceFilter) distanceFilter.addEventListener('change', filterTable);
});

function filterTable() {
    const urgency = document.getElementById('urgency-filter').value;
    const type = document.getElementById('type-filter').value;
    const distance = document.getElementById('distance-filter').value;
    const rows = document.querySelectorAll('.data-table tbody tr');

    rows.forEach(row => {
        let show = true;

        if (urgency && !row.textContent.includes(urgency.charAt(0).toUpperCase() + urgency.slice(1))) {
            show = false;
        }

        if (type && !row.querySelector(`.incident-type.${type}`)) {
            show = false;
        }

        if (distance) {
            const distanceText = row.cells[3].textContent;
            const distanceValue = parseFloat(distanceText);
            if (distanceValue > parseFloat(distance)) {
                show = false;
            }
        }

        row.style.display = show ? '' : 'none';
    });
}
