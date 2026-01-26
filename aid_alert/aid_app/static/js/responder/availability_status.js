// Note: The header toggle logic is in base_responder.html
// We hook into it by listening to the global event or updating UI based on shared state

function updateMainStatus(status) {
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const statusDescription = document.getElementById('status-description');
    const statusTime = document.getElementById('status-time');
    const iconContainer = document.querySelector('.status-icon-large');

    const statusConfig = {
        'available': {
            icon: 'check_circle',
            text: 'Available',
            description: 'Ready to accept new incidents',
            color: 'var(--success-color)'
        },
        'unavailable': {
            icon: 'cancel',
            text: 'Unavailable',
            description: 'Not accepting new incidents',
            color: 'var(--warning-color)'
        },
        'on-duty': {
            icon: 'emergency',
            text: 'On Duty',
            description: 'Currently responding to an incident',
            color: '#f39c12'
        }
    };

    if (statusConfig[status]) {
        if (statusIcon) statusIcon.textContent = statusConfig[status].icon;
        if (statusText) statusText.textContent = statusConfig[status].text;
        if (statusDescription) statusDescription.textContent = statusConfig[status].description;
        if (statusTime) statusTime.textContent = 'Status updated: Just now';
        if (iconContainer) {
            iconContainer.style.backgroundColor = statusConfig[status].color;
            iconContainer.style.boxShadow = `0 10px 25px ${statusConfig[status].color}4d`; // 30% opacity
        }
    }
}

function toggleAvailability() {
    const headerToggle = document.getElementById('header-availability-toggle');
    if (headerToggle) {
        headerToggle.click(); // This triggers the change event on the header toggle
    }
}

function setAvailability(status) {
    const headerToggle = document.getElementById('header-availability-toggle');
    if (headerToggle) {
        if (status === 'available' && !headerToggle.checked) {
            headerToggle.click();
        } else if (status === 'unavailable' && headerToggle.checked) {
            headerToggle.click();
        }
    }
    updateMainStatus(status);
}

// Listen for changes from the header toggle if needed, or initialized state
window.addEventListener('load', function () {
    // Simple init based on what base_responder set up
    const headerToggle = document.getElementById('header-availability-toggle');
    if (headerToggle) {
        updateMainStatus(headerToggle.checked ? 'available' : 'unavailable');

        // Listen for future changes
        headerToggle.addEventListener('change', function () {
            updateMainStatus(this.checked ? 'available' : 'unavailable');
        });
    }

    // Also load local settings for switches
    const autoAvail = document.getElementById('auto-availability');
    const breakRem = document.getElementById('break-reminders');
    const priorityInc = document.getElementById('priority-incidents');

    if (autoAvail) autoAvail.checked = localStorage.getItem('autoAvailability') !== 'false';
    if (breakRem) breakRem.checked = localStorage.getItem('breakReminders') === 'true';
    if (priorityInc) priorityInc.checked = localStorage.getItem('priorityIncidents') !== 'false';

    // Settings functionality
    if (autoAvail) {
        autoAvail.addEventListener('change', function () {
            localStorage.setItem('autoAvailability', this.checked);
            showNotification(`Auto-availability ${this.checked ? 'enabled' : 'disabled'}`);
        });
    }

    if (breakRem) {
        breakRem.addEventListener('change', function () {
            localStorage.setItem('breakReminders', this.checked);
            showNotification(`Break reminders ${this.checked ? 'enabled' : 'disabled'}`);
        });
    }

    if (priorityInc) {
        priorityInc.addEventListener('change', function () {
            localStorage.setItem('priorityIncidents', this.checked);
            showNotification(`Priority incidents ${this.checked ? 'enabled' : 'disabled'}`);
        });
    }
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'glass-alert';
    notification.innerHTML = `<span class="material-icons-round">info</span> <span>${message}</span>`;
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
        backdrop-filter: blur(10px);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}
