// Enhanced phone number validation
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');

    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            const value = e.target.value;
            e.target.value = value.replace(/\D/g, ''); // Only numbers
            const wrapper = e.target.closest('.phone-input-wrapper');

            if (e.target.value.length === 10) {
                e.target.setCustomValidity('');
                if (wrapper) wrapper.style.borderColor = '#2ecc71'; // Green
            } else if (e.target.value.length > 0) {
                e.target.setCustomValidity('Please enter exactly 10 digits');
                if (wrapper) wrapper.style.borderColor = '#e74c3c'; // Red
            } else {
                e.target.setCustomValidity('');
                if (wrapper) wrapper.style.borderColor = 'rgba(255, 255, 255, 0.4)'; // Default glass border
            }
        });
    }

    // Password requirements validation
    const passwordInput = document.getElementById('password');
    const requirementsList = document.querySelector('.requirements-list');

    if (passwordInput && requirementsList) {
        const requirements = [
            { regex: /.{8,}/, text: 'At least 8 characters' },
            { regex: /[A-Z]/, text: 'At least one uppercase letter' },
            { regex: /[a-z]/, text: 'At least one lowercase letter' },
            { regex: /[0-9]/, text: 'At least one number' }
        ];

        passwordInput.addEventListener('input', function () {
            const password = this.value;
            const listItems = requirementsList.querySelectorAll('li');

            requirements.forEach((req, index) => {
                const listItem = listItems[index];
                if (req.regex.test(password)) {
                    listItem.style.color = '#2ecc71'; // Green
                    listItem.style.textDecoration = 'line-through';
                } else {
                    listItem.style.color = '#666'; // Default
                    listItem.style.textDecoration = 'none';
                }
            });
        });
    }

    // Initial call to set state if page reloads with values
    const userRole = document.getElementById('user_role');
    if (userRole && userRole.value) {
        toggleRoleFields();
    }
});

function toggleRoleFields() {
    const roleSelect = document.getElementById('user_role');
    if (!roleSelect) return;

    const role = roleSelect.value;
    const sellerFields = document.getElementById('seller_fields');
    const facilityFields = document.getElementById('facility_fields');
    const shopName = document.getElementById('shop_name');
    const licenseNo = document.getElementById('license_no');
    const facilityName = document.getElementById('facility_name');
    const capacity = document.getElementById('capacity');

    // Reset all first
    if (sellerFields) sellerFields.style.display = 'none';
    if (facilityFields) facilityFields.style.display = 'none';

    // Remove required attributes to avoid validation errors on hidden fields
    if (shopName) shopName.required = false;
    if (licenseNo) licenseNo.required = false;
    if (facilityName) facilityName.required = false;
    if (capacity) capacity.required = false;

    if (role === 'seller') {
        if (sellerFields) sellerFields.style.display = 'block';
        if (shopName) shopName.required = true;
        if (licenseNo) {
            licenseNo.required = true;
            licenseNo.setAttribute('maxlength', '15');
        }
    } else if (role === 'facility') {
        if (facilityFields) facilityFields.style.display = 'block';
        if (facilityName) facilityName.required = true;
        if (capacity) capacity.required = true;
        if (licenseNo) licenseNo.removeAttribute('maxlength');
    } else {
        if (licenseNo) licenseNo.removeAttribute('maxlength');
    }
}
