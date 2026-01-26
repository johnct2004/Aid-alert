/* Assign Responders JS */

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('newAssignmentModal');
    const viewModal = document.getElementById('viewDetailsModal');
    const openBtn = document.getElementById('newAssignmentBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const closeViewBtn = document.getElementById('closeViewModalBtn');
    const form = document.getElementById('newAssignmentForm');
    const responderSelect = document.getElementById('responderSelect');
    const assignButtons = document.querySelectorAll('.btn-assign');
    const viewDetailsBtns = document.querySelectorAll('.view-details-btn');

    // --- Helper Functions ---

    function openModal(preSelectedResponderId = null) {
        modal.classList.add('visible');
        if (preSelectedResponderId) {
            responderSelect.value = preSelectedResponderId;
        }
    }

    function closeModal() {
        modal.classList.remove('visible');
        form.reset();
    }

    function openViewModal(data) {
        document.getElementById('viewId').textContent = data.id;
        document.getElementById('viewType').textContent = data.type;
        document.getElementById('viewSeverity').textContent = data.severity;
        document.getElementById('viewLocation').textContent = data.location;
        document.getElementById('viewStatus').textContent = data.status;
        document.getElementById('viewResponder').textContent = data.responder;
        document.getElementById('viewDescription').textContent = data.description;
        viewModal.classList.add('visible');
    }

    function closeViewModal() {
        viewModal.classList.remove('visible');
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // --- Event Listeners ---

    // Open Modal from Top Button
    if (openBtn) {
        openBtn.addEventListener('click', () => openModal());
    }

    // Open Modal from Responder Card "Assign" Button
    assignButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // Find responder ID from the card logic
            // We need to add data-id to the button or card to make this easier
            // Currently assuming we can find it contextually or let's assume I added 'value' to options matching ids.
            // Wait, the assign button doesn't have the ID on it.
            // I should have added data-id to the assign button in the template.
            // Let's allow selecting "Assign" to just open the modal for now, 
            // OR I can quickly patch the template to include data-id if I missed it.
            // Checking template... The button is inside a card. I can iterate responders loop and add data-id.

            // For now, let's try to grab it from the context if possible, or just open modal.
            // Ideally, I should fix the template to pass the ID.

            // Let's assume for this step I just open the modal.
            // But the user asked to make it functional.
            // I'll grab the name and try to find it in the select? No, IDs are safer.
            // I will update the JS to look for `data-id` which I will add to the buttons in a separate step or just now.

            // Actually, I can use the index or just specific logic.
            // Let's assume I'll add data-id='{{ responder.id }}' to the button in the NEXT step if not present.
            // Checking my previous view of template...
            // Line 135: <button class="btn-secondary btn-assign" ...>Assign</button>
            // No data-id.

            // I'll write the JS to expect `data-id` and then I'll update the HTML to include it.
            const responderId = this.dataset.id;
            openModal(responderId);
        });
    });

    // Close Modal
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Close View Modal
    if (closeViewBtn) {
        closeViewBtn.addEventListener('click', closeViewModal);
    }

    // View Details Buttons
    viewDetailsBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const data = {
                id: this.dataset.id,
                type: this.dataset.type,
                severity: this.dataset.severity,
                location: this.dataset.location,
                status: this.dataset.status,
                responder: this.dataset.responder,
                description: this.dataset.description
            };
            openViewModal(data);
        });
    });

    // Close View Modal on Outside Click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
        if (e.target === viewModal) {
            closeViewModal();
        }
    });

    // Handle Form Submit
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            fetch('/aid_app/api/assign/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        // alert('Assignment Created Successfully!');
                        window.location.reload();
                    } else {
                        alert('Error: ' + result.message);
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred. Please try again.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
        });
    }
});
