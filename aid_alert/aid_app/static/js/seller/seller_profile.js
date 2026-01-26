document.addEventListener('DOMContentLoaded', function () {
    // --- Profile Overview Logic ---
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const saveProfileBtn = document.querySelector('.save-profile-btn');
    const cancelProfileBtn = document.querySelector('.cancel-profile-btn');

    if (editProfileBtn) editProfileBtn.addEventListener('click', toggleProfileEdit);
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfileInfo);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', cancelProfileEdit);

    function toggleProfileEdit() {
        const profileCard = document.querySelector('.profile-overview').closest('.glass-card');

        // Hide display values
        profileCard.querySelectorAll('.info-value').forEach(el => el.style.display = 'none');

        // Show inputs
        document.getElementById('business-name-input').classList.remove('hidden');
        document.getElementById('business-name-input').style.display = 'block';

        const nameInputs = document.querySelector('.name-inputs');
        nameInputs.classList.remove('hidden');
        nameInputs.style.display = 'flex';

        document.getElementById('email-input').classList.remove('hidden');
        document.getElementById('email-input').style.display = 'block';

        document.getElementById('phone-input').classList.remove('hidden');
        document.getElementById('phone-input').style.display = 'block';

        // Toggle Buttons
        editProfileBtn.classList.add('hidden');
        saveProfileBtn.classList.remove('hidden');
        cancelProfileBtn.classList.remove('hidden');

        profileCard.classList.add('edit-mode');
    }

    function cancelProfileEdit() {
        const profileCard = document.querySelector('.profile-overview').closest('.glass-card');

        // Show display values
        profileCard.querySelectorAll('.info-value').forEach(el => el.style.display = 'block');

        // Hide inputs
        document.getElementById('business-name-input').style.display = 'none';
        document.querySelector('.name-inputs').style.display = 'none';
        document.getElementById('email-input').style.display = 'none';
        document.getElementById('phone-input').style.display = 'none';

        // Toggle Buttons
        editProfileBtn.classList.remove('hidden');
        saveProfileBtn.classList.add('hidden');
        cancelProfileBtn.classList.add('hidden');

        profileCard.classList.remove('edit-mode');
    }

    function saveProfileInfo() {
        // In a real app, you would gather data and send via fetch/ajax here.
        // For now, updating the DOM to reflect changes as before.

        const companyName = document.getElementById('business-name-input').value;
        const firstName = document.getElementById('first-name-input').value;
        const lastName = document.getElementById('last-name-input').value;
        const email = document.getElementById('email-input').value;
        const phone = document.getElementById('phone-input').value;

        // Update Text
        document.getElementById('business-name').textContent = companyName || 'Not Provided';
        document.getElementById('contact-person').textContent = `${firstName} ${lastName}`;
        document.getElementById('email').textContent = email;
        document.getElementById('phone').textContent = phone ? phone : 'Not Provided';

        // Sync company name to Business Info section if exists
        const businessNameEl = document.getElementById('company-name');
        if (businessNameEl) {
            businessNameEl.textContent = companyName || 'Not Provided';
            const businessNameInput = document.getElementById('company-name-input');
            if (businessNameInput) businessNameInput.value = companyName || '';
        }

        cancelProfileEdit();
        showMessage('Profile Overview updated successfully!', 'success');
    }


    // --- Business Information Logic ---
    const editBusinessBtn = document.querySelector('.edit-business-btn');
    const saveBusinessBtn = document.querySelector('.save-business-btn');
    const cancelBusinessBtn = document.querySelector('.cancel-business-btn');

    if (editBusinessBtn) editBusinessBtn.addEventListener('click', toggleBusinessEdit);
    if (saveBusinessBtn) saveBusinessBtn.addEventListener('click', saveBusinessInfo);
    if (cancelBusinessBtn) cancelBusinessBtn.addEventListener('click', cancelBusinessEdit);

    function toggleBusinessEdit() {
        const businessCard = document.querySelector('.business-info').closest('.glass-card');

        // Hide display values
        businessCard.querySelectorAll('.info-value').forEach(el => el.style.display = 'none');

        // Show inputs
        businessCard.querySelectorAll('.info-input').forEach(el => el.style.display = 'block');

        // Toggle Buttons
        editBusinessBtn.classList.add('hidden');
        saveBusinessBtn.classList.remove('hidden');
        cancelBusinessBtn.classList.remove('hidden');

        businessCard.classList.add('edit-mode');
    }

    function cancelBusinessEdit() {
        const businessCard = document.querySelector('.business-info').closest('.glass-card');

        // Show display values, Hide inputs
        businessCard.querySelectorAll('.info-value').forEach(el => el.style.display = 'block');
        businessCard.querySelectorAll('.info-input').forEach(el => el.style.display = 'none');

        // Toggle Buttons
        editBusinessBtn.classList.remove('hidden');
        saveBusinessBtn.classList.add('hidden');
        cancelBusinessBtn.classList.add('hidden');

        businessCard.classList.remove('edit-mode');
    }

    function saveBusinessInfo() {
        const companyName = document.getElementById('company-name-input').value;
        const businessType = document.getElementById('business-type-input').value;
        const taxId = document.getElementById('tax-id-input').value;
        const licenseNumber = document.getElementById('license-number-input').value;
        const city = document.getElementById('city-input').value;
        const state = document.getElementById('state-input').value;
        const postalCode = document.getElementById('postal-code-input').value;
        const country = document.getElementById('country-input').value;

        // Update Text
        document.getElementById('company-name').textContent = companyName || 'Not Provided';
        document.getElementById('business-type').textContent = businessType;
        document.getElementById('tax-id').textContent = taxId;
        document.getElementById('license-number').textContent = licenseNumber;
        document.getElementById('city').textContent = city || 'Not Provided';
        document.getElementById('state').textContent = state || 'Not Provided';
        document.getElementById('postal-code').textContent = postalCode || 'Not Provided';
        document.getElementById('country').textContent = country || 'Not Provided';

        // Sync back to profile overview
        const profileNameEl = document.getElementById('business-name');
        if (profileNameEl) {
            profileNameEl.textContent = companyName || 'Not Provided';
            const profileNameInput = document.getElementById('business-name-input');
            if (profileNameInput) profileNameInput.value = companyName || '';
        }

        cancelBusinessEdit();
        showMessage('Business Information updated successfully!', 'success');
    }

    // --- Toast Message Helper ---
    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type} message-toast`;
        messageDiv.textContent = message;

        if (type === 'success') messageDiv.classList.add('message-success');
        else if (type === 'error') messageDiv.classList.add('message-error');
        else messageDiv.classList.add('message-info');

        document.body.appendChild(messageDiv);

        // Animate out
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }
});
