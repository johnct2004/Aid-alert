function openIncidentModal(btn) {
    const modal = document.getElementById('incidentModal');

    // Get data from button attributes
    const id = btn.dataset.id;
    const type = btn.dataset.type;
    const location = btn.dataset.location;
    const time = btn.dataset.time;
    const reporter = btn.dataset.reporter;
    const description = btn.dataset.description;
    const status = btn.dataset.status;
    const assignedName = btn.dataset.assignedName;

    // Populate Modal
    document.getElementById('modalIncidentId').textContent = 'INC-' + id.toString().padStart(3, '0');
    document.getElementById('modalType').textContent = type;
    document.getElementById('modalLocation').textContent = location;
    document.getElementById('modalTime').textContent = time;
    document.getElementById('modalReporter').textContent = reporter;
    document.getElementById('modalDescription').textContent = description || 'No description provided.';
    const statusHtml = `<span class="badge badge-${status}">${status.replace('_', ' ').toUpperCase()}</span>`;
    document.getElementById('modalStatus').innerHTML = statusHtml;

    // Set Assigned Responder (Read Only)
    const container = document.getElementById('modalResponder');
    if (container) {
        if (assignedName && assignedName !== 'Not Assigned' && assignedName.trim() !== '') {
            container.textContent = assignedName;
            container.style.color = 'var(--primary-color)';
        } else {
            container.textContent = 'Not Assigned';
            container.style.color = '#999';
        }
    }

    // Show Modal
    modal.style.display = 'flex';
}

function closeIncidentModal() {
    const modal = document.getElementById('incidentModal');
    modal.style.display = 'none';
}

function handleAssign(event) {
    event.preventDefault();
    const form = event.target;
    const incidentId = form.dataset.incidentId;
    const responderSelect = document.getElementById('responderSelect');
    const responderId = responderSelect ? responderSelect.value : null;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Assigning...';

    // Note: The URL logic needs to be robust. We might need a config object.
    const url = `/admin-panel/assign-incident/${incidentId}/`;

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ responder_id: responderId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                closeIncidentModal();
                setTimeout(() => location.reload(), 1000);
            } else {
                showNotification(data.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Assignment';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Assignment';
        });
}

// Helper to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showNotification(message, type = 'success') {
    // Basic alert if the toast system isn't globally available
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.bottom = '20px';
    notif.style.right = '20px';
    notif.style.padding = '12px 24px';
    notif.style.borderRadius = '8px';
    notif.style.background = type === 'success' ? '#10b981' : '#ef4444';
    notif.style.color = 'white';
    notif.style.zIndex = '100000';
    notif.innerText = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Export functions
window.openIncidentModal = openIncidentModal;
window.closeIncidentModal = closeIncidentModal;
window.handleAssign = handleAssign;
window.getCookie = getCookie;
window.showNotification = showNotification;
