document.addEventListener('DOMContentLoaded', () => {
    // Combine OTP inputs into single field before submission
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function (e) {
            const otpInputs = document.querySelectorAll('.otp-field');
            let otpCode = '';
            otpInputs.forEach(input => {
                otpCode += input.value;
            });
            const combinedInput = document.getElementById('otp_code_combined');
            if (combinedInput) combinedInput.value = otpCode;
        });
    }

    // Auto-focus next input
    document.querySelectorAll('.otp-field').forEach((input, index) => {
        input.addEventListener('input', function (e) {
            if (e.target.value.length === 1) {
                if (index < 5) {
                    document.querySelectorAll('.otp-field')[index + 1].focus();
                }
            }
        });

        // Handle backspace
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                document.querySelectorAll('.otp-field')[index - 1].focus();
            }
        });
    });
});
