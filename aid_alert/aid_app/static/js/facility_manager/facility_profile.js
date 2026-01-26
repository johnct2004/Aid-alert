// Scoped functions to handle section-specific editing
function toggleProfileEdit(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    container.querySelectorAll('.info-value').forEach(el => el.classList.add('hidden'));
    container.querySelectorAll('.info-input').forEach(el => el.classList.remove('hidden'));

    container.querySelectorAll('.edit-profile-btn').forEach(b => b.classList.add('hidden'));
    container.querySelectorAll('.save-profile-btn').forEach(b => b.classList.remove('hidden'));
    container.querySelectorAll('.cancel-profile-btn').forEach(b => b.classList.remove('hidden'));
}

function cancelProfileEdit(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    container.querySelectorAll('.info-input').forEach(el => el.classList.add('hidden'));
    container.querySelectorAll('.info-value').forEach(el => el.classList.remove('hidden'));

    container.querySelectorAll('.edit-profile-btn').forEach(b => b.classList.remove('hidden'));
    container.querySelectorAll('.save-profile-btn').forEach(b => b.classList.add('hidden'));
    container.querySelectorAll('.cancel-profile-btn').forEach(b => b.classList.add('hidden'));
}

function saveProfileInfo(btn) {
    const container = btn.closest('.glass-card');
    if (!container) return;

    const inputs = container.querySelectorAll('.info-input');
    const values = container.querySelectorAll('.info-value');

    // Simple UI update simulation
    inputs.forEach((input, index) => {
        if (values[index]) {
            if (input.tagName === 'SELECT') {
                values[index].textContent = input.value;
            } else if (input.value) {
                values[index].textContent = input.value;
            }
        }
    });

    cancelProfileEdit(btn);
    showNotification('Changes saved successfully!');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.innerHTML = `<span class="material-icons-round">check_circle</span> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
}
