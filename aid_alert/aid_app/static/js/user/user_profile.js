// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Personal information buttons
    const editPersonalBtn = document.querySelector('.edit-personal-btn');
    const savePersonalBtn = document.querySelector('.save-personal-btn');
    const cancelPersonalBtn = document.querySelector('.cancel-personal-btn');
    
    if (editPersonalBtn) editPersonalBtn.addEventListener('click', togglePersonalEdit);
    if (savePersonalBtn) savePersonalBtn.addEventListener('click', savePersonalInfo);
    if (cancelPersonalBtn) cancelPersonalBtn.addEventListener('click', cancelPersonalEdit);
    
    // Emergency information buttons
    const editEmergencyBtn = document.querySelector('.edit-emergency-btn');
    const saveEmergencyBtn = document.querySelector('.save-emergency-btn');
    const cancelEmergencyBtn = document.querySelector('.cancel-emergency-btn');
    
    if (editEmergencyBtn) editEmergencyBtn.addEventListener('click', toggleEmergencyEdit);
    if (saveEmergencyBtn) saveEmergencyBtn.addEventListener('click', saveEmergencyInfo);
    if (cancelEmergencyBtn) cancelEmergencyBtn.addEventListener('click', cancelEmergencyEdit);
});

function togglePersonalEdit() {
    document.querySelectorAll('#first-name, #last-name, #email, #phone, #home-address, #city, #state, #postal-code, #country').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#first-name-input, #last-name-input, #email-input, #phone-input, #home-address-input, #city-input, #state-input, #postal-code-input, #country-input').forEach(el => el.classList.remove('hidden'));

    document.querySelector('.edit-personal-btn').classList.add('hidden');
    document.querySelector('.save-personal-btn').classList.remove('hidden');
    document.querySelector('.cancel-personal-btn').classList.remove('hidden');
}

function cancelPersonalEdit() {
    document.querySelectorAll('#first-name-input, #last-name-input, #email-input, #phone-input, #home-address-input, #city-input, #state-input, #postal-code-input, #country-input').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#first-name, #last-name, #email, #phone, #home-address, #city, #state, #postal-code, #country').forEach(el => el.classList.remove('hidden'));

    document.querySelector('.edit-personal-btn').classList.remove('hidden');
    document.querySelector('.save-personal-btn').classList.add('hidden');
    document.querySelector('.cancel-personal-btn').classList.add('hidden');
}

function savePersonalInfo() {
    // Mock save implementation
    document.getElementById('first-name').textContent = document.getElementById('first-name-input').value || 'Not Provided';
    // Add other field updates here...

    cancelPersonalEdit();
    showMessage('Personal information updated successfully!', 'success');
}

function toggleEmergencyEdit() {
    document.querySelectorAll('#primary-contact, #primary-contact-phone, #blood-type, #allergies').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#primary-contact-input, #primary-contact-phone-input, #blood-type-input, #allergies-input').forEach(el => el.classList.remove('hidden'));

    document.querySelector('.edit-emergency-btn').classList.add('hidden');
    document.querySelector('.save-emergency-btn').classList.remove('hidden');
    document.querySelector('.cancel-emergency-btn').classList.remove('hidden');
}

function cancelEmergencyEdit() {
    document.querySelectorAll('#primary-contact-input, #primary-contact-phone-input, #blood-type-input, #allergies-input').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#primary-contact, #primary-contact-phone, #blood-type, #allergies').forEach(el => el.classList.remove('hidden'));

    document.querySelector('.edit-emergency-btn').classList.remove('hidden');
    document.querySelector('.save-emergency-btn').classList.add('hidden');
    document.querySelector('.cancel-emergency-btn').classList.add('hidden');
}

function saveEmergencyInfo() {
    document.getElementById('primary-contact').textContent = document.getElementById('primary-contact-input').value || 'Not Provided';

    cancelEmergencyEdit();
    showMessage('Emergency information updated successfully!', 'success');
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}
