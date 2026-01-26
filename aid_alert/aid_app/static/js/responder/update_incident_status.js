document.addEventListener('DOMContentLoaded', () => {
    const statusForm = document.getElementById('statusUpdateForm');
    if (statusForm) {
        statusForm.addEventListener('submit', function (e) {
            const selectedStatus = document.querySelector('input[name="status"]:checked');

            if (!selectedStatus) {
                e.preventDefault();
                alert('Please select a status update.');
                return;
            }

            // Form will submit normally to the backend
            showNotification('Updating status...');
        });
    }
});

function cancelUpdate() {
    if (confirm('Are you sure you want to cancel the status update?')) {
        const form = document.getElementById('statusUpdateForm');
        if (form) form.reset();
    }
}

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
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function emergencyCall() { if (confirm('Call emergency services?')) showNotification('Connecting to emergency dispatch...'); }
function requestBackup() { if (confirm('Request backup support?')) showNotification('Backup request sent.'); }
function contactHospital() { if (confirm('Contact hospital?')) showNotification('Connecting to hospital...'); }
function updateLocation() {
    showNotification('Location updated successfully!');
}
