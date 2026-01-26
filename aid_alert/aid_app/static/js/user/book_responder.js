// Responder assignment logic
function assignResponder(bookingData) {
    // Mock logic
    return {
        name: "Dr. Sarah Johnson",
        status: 'Dispatched',
        eta: '10-15 min'
    };
}

let currentResponderName = "";

function openProfileModal(name, role, status, id, spec) {
    document.getElementById('modalName').textContent = name;
    document.getElementById('modalRole').textContent = role;
    document.getElementById('modalStatus').textContent = status;
    document.getElementById('modalId').textContent = id;
    document.getElementById('modalSpec').textContent = spec || "General Emergency";

    currentResponderName = name;

    document.getElementById('profileModal').style.display = "block";
}

function closeModal() {
    document.getElementById('profileModal').style.display = "none";
}

function bookResponder(name, id) {
    // Scroll to form
    const bookingFormSection = document.querySelector('form.booking-form').closest('section');
    if (bookingFormSection) {
        bookingFormSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Pre-fill special instructions
    const instructionsField = document.getElementById('specialInstructions');
    const currentVal = instructionsField.value;
    instructionsField.value = `REQUESTING RESPONDER: ${name} (ID: ${id})\n` + currentVal;

    // Highlight field
    instructionsField.style.borderColor = "var(--primary-color)";
    setTimeout(() => instructionsField.style.borderColor = "", 2000);

    // Show alert
    alert(`You have selected ${name}. Please complete the emergency details and submit the form.`);
}

function bookFromModal() {
    const id = document.getElementById('modalId').textContent;
    bookResponder(currentResponderName, id);
    closeModal();
}

document.addEventListener('DOMContentLoaded', () => {
    // Form handling
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            // Allow form to submit normally
            if (!confirm('Confirm booking request? This will alert emergency services.')) {
                e.preventDefault();
            }
        });
    }

    // Clear form
    const clearBtn = document.querySelector('.btn-secondary');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (confirm('Clear form?')) {
                document.getElementById('bookingForm').reset();
            }
        });
    }

    // Close modal when clicking outside
    window.onclick = function (event) {
        if (event.target == document.getElementById('profileModal')) {
            closeModal();
        }
    }
});
