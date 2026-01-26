// Global variables for elements
let searchInput, kitModal, viewKitModal, kitForm, kitModalTitle, statusField;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize elements
    searchInput = document.querySelector('.search-input');
    kitModal = document.getElementById('kitModal');
    viewKitModal = document.getElementById('viewKitModal');
    kitForm = document.getElementById('kitForm');
    kitModalTitle = document.getElementById('kitModalTitle');
    statusField = document.getElementById('statusField');

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.kit-row');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Filter functionality
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            const rows = document.querySelectorAll('.kit-row');

            rows.forEach(row => {
                const status = row.getAttribute('data-status');
                if (filter === 'all' || status === filter) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });

    // Form Submission
    if (kitForm) {
        kitForm.addEventListener('submit', handleFormSubmit);
    }
});

// --- Helper: CSRF Token from Cookie ---
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
const csrftoken = getCookie('csrftoken');

// --- Modal Helper Functions ---
function openModal(modal) {
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Global functions for onclick handlers
function closeKitModal() {
    closeModal(kitModal);
}

function closeViewModal() {
    closeModal(viewKitModal);
}

function showAddKitModal() {
    if (!kitForm) return;
    kitForm.reset();
    if (kitModalTitle) kitModalTitle.textContent = "Add New Kit";
    kitForm.dataset.mode = 'add';
    delete kitForm.dataset.kitId;

    if (statusField) statusField.classList.add('hidden');

    const idField = kitForm.querySelector('[name="kit_id"]');
    if (idField) idField.disabled = false;

    openModal(kitModal);
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (kitModal && event.target == kitModal) {
        closeKitModal();
    }
    if (viewKitModal && event.target == viewKitModal) {
        closeViewModal();
    }
}

// --- Async Actions ---
async function editKit(kitId) {
    try {
        const response = await fetch(`/api/kit/${kitId}/edit/`);
        const data = await response.json();

        if (data.success) {
            const kit = data.kit;

            if (kitForm.querySelector('[name="kit_id"]')) kitForm.querySelector('[name="kit_id"]').value = kit.kit_id;
            if (kitForm.querySelector('[name="name"]')) kitForm.querySelector('[name="name"]').value = kit.name;
            if (kitForm.querySelector('[name="kit_type"]')) kitForm.querySelector('[name="kit_type"]').value = kit.kit_type;
            if (kitForm.querySelector('[name="location"]')) kitForm.querySelector('[name="location"]').value = kit.location;
            if (kit.expiry_date && kitForm.querySelector('[name="expiry_date"]')) kitForm.querySelector('[name="expiry_date"]').value = kit.expiry_date;

            if (statusField) statusField.classList.remove('hidden');
            const statusSelect = kitForm.querySelector('[name="status"]');
            if (statusSelect) statusSelect.value = kit.status;

            if (kitForm.querySelector('[name="kit_id"]')) kitForm.querySelector('[name="kit_id"]').disabled = true;

            if (kitModalTitle) kitModalTitle.textContent = "Edit Kit: " + kit.kit_id;
            kitForm.dataset.mode = 'edit';
            kitForm.dataset.kitId = kit.kit_id;

            openModal(kitModal);
        } else {
            alert('Error fetching kit details: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to fetch kit details.');
    }
}

async function viewKit(kitId) {
    try {
        const response = await fetch(`/api/kit/${kitId}/view/`);
        const data = await response.json();

        if (data.success) {
            const kit = data.kit;
            document.getElementById('viewKitId').textContent = kit.kit_id;
            document.getElementById('viewKitName').textContent = kit.name;
            document.getElementById('viewKitType').textContent = kit.kit_type;
            document.getElementById('viewKitLocation').textContent = kit.location;

            const statusBadge = document.getElementById('viewKitStatus');
            statusBadge.textContent = kit.status;
            statusBadge.className = `info-value status-badge status-${kit.status.toLowerCase().replace(' ', '_')}`;

            document.getElementById('viewKitLastChecked').textContent = kit.last_checked;
            document.getElementById('viewKitExpiry').textContent = kit.expiry_date || 'N/A';

            openModal(viewKitModal);
        } else {
            alert('Error fetching details.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function checkKit(kitId) {
    if (!confirm(`Mark kit ${kitId} as checked just now?`)) return;

    try {
        const response = await fetch(`/api/kit/${kitId}/check/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.success) {
            alert('Kit checked successfully!');
            location.reload();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to check kit.');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(kitForm);
    const formJSON = Object.fromEntries(formData.entries());
    const mode = kitForm.dataset.mode;

    let url = '/api/kit/add/';
    if (mode === 'edit') {
        const kitId = kitForm.dataset.kitId;
        url = `/api/kit/${kitId}/edit/`;
        formJSON['kit_id'] = kitId;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formJSON)
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            closeKitModal();
            location.reload();
        } else {
            if (result.errors) {
                let msg = 'Validation Error:\n';
                for (let field in result.errors) {
                    msg += `${field}: ${result.errors[field].join(', ')}\n`;
                }
                alert(msg);
            } else {
                alert('Error: ' + (result.message || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to save kit.');
    }
}
