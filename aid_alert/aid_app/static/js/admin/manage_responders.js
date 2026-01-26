document.addEventListener('DOMContentLoaded', () => {
    // View Responder functionality
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const cells = row.getElementsByTagName('td');
            const responderId = cells[0].textContent;
            const responderName = cells[1].textContent;
            const responderType = cells[2].textContent;
            const responderContact = cells[3].textContent;
            const responderLocation = cells[4].textContent;
            const responderStatus = row.querySelector('.badge').textContent.trim();

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Responder Details</h2>
                        <button class="modal-close" onclick="closeViewModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="responder-detail-card">
                            <div class="detail-header" style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
                                <div class="detail-avatar" style="width:50px; height:50px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                                    <span class="material-icons-round" style="font-size:30px; color:#555;">local_shipping</span>
                                </div>
                                <div class="detail-info">
                                    <h3 style="margin:0;">${responderName}</h3>
                                    <p style="margin:0; color:#666;">ID: ${responderId}</p>
                                    <p style="margin:0; color:#888;">Type: ${responderType}</p>
                                </div>
                            </div>
                            <div class="detail-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                                <div class="detail-item">
                                    <label style="font-weight:600; font-size:0.9rem;">Contact</label>
                                    <p style="margin:5px 0;">${responderContact}</p>
                                </div>
                                <div class="detail-item">
                                    <label style="font-weight:600; font-size:0.9rem;">Location</label>
                                    <p style="margin:5px 0;">${responderLocation}</p>
                                </div>
                                <div class="detail-item">
                                    <label style="font-weight:600; font-size:0.9rem;">Status</label>
                                    <p style="margin:5px 0;">${responderStatus}</p>
                                </div>
                                <div class="detail-item">
                                    <label style="font-weight:600; font-size:0.9rem;">Response Time</label>
                                    <p style="margin:5px 0;">Average: 8 minutes</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" style="padding:8px 15px; border:1px solid #ddd; background:white; border-radius:6px; cursor:pointer;" onclick="closeViewModal()">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
        });
    });

    // Edit Responder functionality
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const cells = row.getElementsByTagName('td');
            const responderId = cells[0].textContent;
            const responderName = cells[1].textContent;
            const responderType = cells[2].textContent;
            const responderContact = cells[3].textContent;
            const responderLocation = cells[4].textContent;
            const statusElement = row.querySelector('.badge');

            let currentStatus = 'available';
            if (statusElement.classList.contains('badge-on-duty')) currentStatus = 'on_duty';
            if (statusElement.classList.contains('badge-off-duty')) currentStatus = 'off_duty';
            if (statusElement.classList.contains('badge-unavailable')) currentStatus = 'unavailable';

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Edit Responder</h2>
                        <button class="modal-close" onclick="closeEditModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editResponderForm">
                            <div class="form-group">
                                <label for="editId">Responder ID</label>
                                <input type="text" id="editId" name="id" value="${responderId}" readonly style="background:#f5f5f5;">
                            </div>
                            <div class="form-group">
                                <label for="editName">Full Name</label>
                                <input type="text" id="editName" name="name" value="${responderName}" required>
                            </div>
                            <div class="form-group">
                                <label for="editType">Type</label>
                                <select id="editType" name="type" required>
                                    <option value="Medical" ${responderType.trim() === 'Medical' ? 'selected' : ''}>Medical</option>
                                    <option value="Fire" ${responderType.trim() === 'Fire' ? 'selected' : ''}>Fire</option>
                                    <option value="Police" ${responderType.trim() === 'Police' ? 'selected' : ''}>Police</option>
                                    <option value="Rescue" ${responderType.trim() === 'Rescue' ? 'selected' : ''}>Rescue</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editContact">Contact</label>
                                <input type="text" id="editContact" name="contact" value="${responderContact}" required>
                            </div>
                            <div class="form-group">
                                <label for="editLocation">Location</label>
                                <input type="text" id="editLocation" name="location" value="${responderLocation}" required>
                            </div>
                            <div class="form-group">
                                <label for="editStatus">Status</label>
                                <select id="editStatus" name="status" required>
                                    <option value="available" ${currentStatus === 'available' ? 'selected' : ''}>Available</option>
                                    <option value="on_duty" ${currentStatus === 'on_duty' ? 'selected' : ''}>On Duty</option>
                                    <option value="off_duty" ${currentStatus === 'off_duty' ? 'selected' : ''}>Off Duty</option>
                                    <option value="unavailable" ${currentStatus === 'unavailable' ? 'selected' : ''}>Unavailable</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" style="padding:8px 15px; border:1px solid #ddd; background:white; border-radius:6px; cursor:pointer;" onclick="closeEditModal()">Cancel</button>
                        <button class="btn btn-primary" style="padding:8px 15px; border:none; background:var(--primary-color); color:white; border-radius:6px; cursor:pointer;" onclick="submitEditResponder()">Save Changes</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
        });
    });
});

// Modal functions
function closeViewModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
    }
}

function closeEditModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
    }
}

function submitEditResponder() {
    showNotification('Responder updated successfully!', 'success');
    closeEditModal();

    setTimeout(() => {
        location.reload();
    }, 1500);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
    `;
    notification.innerHTML = `
        <span class="material-icons-round">check_circle</span>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export global functions
window.closeViewModal = closeViewModal;
window.closeEditModal = closeEditModal;
window.submitEditResponder = submitEditResponder;
window.showNotification = showNotification;
