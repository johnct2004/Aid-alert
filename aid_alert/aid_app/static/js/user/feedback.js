document.addEventListener('DOMContentLoaded', () => {
    // Simple interactions for better UX
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('focus', function () {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function () {
            this.parentElement.classList.remove('focused');
        });
    });
});
