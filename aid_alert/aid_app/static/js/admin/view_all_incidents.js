function openIncidentModal(btn) {
    const modal = document.getElementById('incidentModal');
    const form = document.getElementById('assignForm');

    // Get data from button attributes
    const id = btn.dataset.id;
    const type = btn.dataset.type;
    const location = btn.dataset.location;
    const time = btn.dataset.time;
    const reporter = btn.dataset.reporter;
    const description = btn.dataset.description;
    const status = btn.dataset.status;
    const assignedId = btn.dataset.assignedId;

    // Populate Modal
    document.getElementById('modalIncidentId').textContent = 'INC-' + id.toString().padStart(3, '0');
    document.getElementById('modalType').textContent = type;
    document.getElementById('modalLocation').textContent = location;
    document.getElementById('modalTime').textContent = time;
    document.getElementById('modalReporter').textContent = reporter;
    document.getElementById('modalDescription').textContent = description || 'No description provided.';
    document.getElementById('modalStatus').innerHTML = `<span class="badge badge-${status}">${status.replace('_', ' ').toUpperCase()}</span>`;

    // Set current assignment
    const select = document.getElementById('responderSelect');
    if (select) select.value = assignedId || '';

    // Set Form Action Context (store ID)
    if (form) form.dataset.incidentId = id;

    // Show Modal
    if (modal) modal.style.display = 'flex';
}

function closeIncidentModal() {
    const modal = document.getElementById('incidentModal');
    if (modal) modal.style.display = 'none';
}

function handleAssign(event) {
    event.preventDefault();
    const form = event.target;
    const incidentId = form.dataset.incidentId;
    const responderId = document.getElementById('responderSelect').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Assigning...';

    fetch(`/admin-panel/assign-incident/${incidentId}/`, {
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

function showNotification(message, type = 'success') {
    // Basic notification creation if not exists, similar to other files
    // But keeping it consistent with the file being refactored which didn't have showNotification defined inline
    // Wait, the original file DID NOT have showNotification defined! It was using it in handleAssign. 
    // This implies `showNotification` might be in base_admin.html or added here.
    // The original file code provided had no showNotification function definition, 
    // which means it might have been missing or I missed it. 
    // ACTUALLY, checking the `view_all_incidents.html` content I read...
    // It calls `showNotification` but I don't see it defined in the script block I extracted!
    // Ah, lines 236, 240, 247 call it. But no function definition in lines 175-268.
    // This suggests it's either in base_admin.html OR the code was broken/incomplete.
    // Since I'm refactoring, I should add it to be safe, or check base_admin.html.
    // I haven't seen base_admin.html content yet. I see `marketplace_monitor` had one.
    // I will add a simple one here to ensure it works.

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <span class="material-icons-round">check_circle</span>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    // Add keyframes if needed
    if (!document.getElementById('anim-styles')) {
        const style = document.createElement('style');
        style.id = 'anim-styles';
        style.textContent = `@keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        notification.remove();
    }, 3000);
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

window.openIncidentModal = openIncidentModal;
window.closeIncidentModal = closeIncidentModal;
window.handleAssign = handleAssign;
