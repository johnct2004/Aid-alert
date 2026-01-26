function toggleAdminEdit(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    container.querySelectorAll('.info-value').forEach(el => el.classList.add('hidden'));
    container.querySelectorAll('.info-input').forEach(el => el.classList.remove('hidden'));

    // Toggle buttons within this container
    container.querySelectorAll('.edit-admin-btn').forEach(b => b.classList.add('hidden'));
    container.querySelectorAll('.save-admin-btn').forEach(b => b.classList.remove('hidden'));
    container.querySelectorAll('.cancel-admin-btn').forEach(b => b.classList.remove('hidden'));
}

function cancelAdminEdit(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    container.querySelectorAll('.info-input').forEach(el => el.classList.add('hidden'));
    container.querySelectorAll('.info-value').forEach(el => el.classList.remove('hidden'));

    // Toggle buttons within this container
    container.querySelectorAll('.edit-admin-btn').forEach(b => b.classList.remove('hidden'));
    container.querySelectorAll('.save-admin-btn').forEach(b => b.classList.add('hidden'));
    container.querySelectorAll('.cancel-admin-btn').forEach(b => b.classList.add('hidden'));
}

function saveAdminInfo(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    // Map of text ID -> Input ID for possible fields
    const fieldMap = {
        'overview-name': 'overview-name-input',
        'overview-email': 'overview-email-input',
        'overview-role': 'overview-role-input',
        'overview-department': 'overview-department-input',
        'full-name': 'full-name-input',
        'official-email': 'official-email-input',
        'phone-ext': 'phone-ext-input',
        'department': 'department-input',
        'office-location': 'office-location-input',
        'timezone': 'timezone-input'
    };

    // Update values only for fields present in this container
    for (const [textId, inputId] of Object.entries(fieldMap)) {
        const textEl = container.querySelector('#' + textId);
        const inputEl = container.querySelector('#' + inputId);
        if (textEl && inputEl) {
            textEl.textContent = inputEl.value;
        }
    }

    cancelAdminEdit(btn);
    showNotification('Changes saved successfully!');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.innerHTML = `<span class="material-icons-round">check_circle</span> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
}

// Global exposure
window.toggleAdminEdit = toggleAdminEdit;
window.cancelAdminEdit = cancelAdminEdit;
window.saveAdminInfo = saveAdminInfo;
window.showNotification = showNotification;
