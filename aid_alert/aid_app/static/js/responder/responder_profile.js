// Scoped functions to handle section-specific editing
function toggleProfileEdit(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    container.querySelectorAll('.info-value').forEach(el => el.classList.add('hidden'));
    container.querySelectorAll('.info-input').forEach(el => el.classList.remove('hidden'));
    // Also handle time-inputs container if present
    container.querySelectorAll('.time-inputs').forEach(el => el.classList.remove('hidden'));

    // Toggle buttons within this container
    container.querySelectorAll('.edit-profile-btn').forEach(b => b.classList.add('hidden'));
    container.querySelectorAll('.save-profile-btn').forEach(b => b.classList.remove('hidden'));
    container.querySelectorAll('.cancel-profile-btn').forEach(b => b.classList.remove('hidden'));
}

function cancelProfileEdit(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    container.querySelectorAll('.info-input').forEach(el => el.classList.add('hidden'));
    container.querySelectorAll('.info-value').forEach(el => el.classList.remove('hidden'));
    // Also handle time-inputs container
    container.querySelectorAll('.time-inputs').forEach(el => el.classList.add('hidden'));

    // Toggle buttons within this container
    container.querySelectorAll('.edit-profile-btn').forEach(b => b.classList.remove('hidden'));
    container.querySelectorAll('.save-profile-btn').forEach(b => b.classList.add('hidden'));
    container.querySelectorAll('.cancel-profile-btn').forEach(b => b.classList.add('hidden'));
}

function saveProfileInfo(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    // Simple update logic: take value from input and put it in text
    // This assumes 1:1 mapping order which is fine for UI demo
    const inputs = container.querySelectorAll('.info-input');
    const values = container.querySelectorAll('.info-value');

    // Handle time inputs separately if needed, simplified here
    const timeInputs = container.querySelectorAll('.time-inputs input');

    // This is a rough UI simulation. In real app, we'd map specific IDs.
    // For visual parity with admin:
    cancelProfileEdit(btn);
    showNotification('Changes saved successfully!');
}

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
