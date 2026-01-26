document.addEventListener('DOMContentLoaded', () => {
    // Password requirements validation
    const passwordInput = document.getElementById('new-password');
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
                    listItem.style.color = '#2ecc71'; // Green color (matches theme logic)
                    listItem.style.textDecoration = 'line-through';
                } else {
                    listItem.style.color = '#666'; // Default color
                    listItem.style.textDecoration = 'none';
                }
            });
        });
    }
});
