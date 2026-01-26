document.addEventListener('DOMContentLoaded', () => {
    // View Facility functionality
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const cells = row.getElementsByTagName('td');
            const facilityId = cells[0].textContent;
            const facilityName = cells[1].textContent.trim();
            const facilityType = cells[2].textContent;

            // Layout assumption based on template:
            // 0: ID, 1: Name, 2: Type, 3: Address, 4: Capacity, 5: Status
            const facilityAddress = cells[3].textContent.trim();
            const facilityStatus = row.querySelector('.badge').textContent.trim();

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Facility Details</h2>
                        <button class="modal-close" onclick="closeViewModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="facility-detail-card">
                            <div class="detail-header" style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
                                <div class="detail-avatar" style="width:50px; height:50px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                                    <span class="material-icons-round" style="font-size:30px; color:#555;">apartment</span>
                                </div>
                                <div class="detail-info">
                                    <h3 style="margin:0;">${facilityName}</h3>
                                    <p style="margin:0; color:#666;">ID: ${facilityId}</p>
                                    <div class="detail-badges" style="margin-top:5px;">
                                        <span class="badge">${facilityStatus}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="detail-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                                <div class="detail-item">
                                    <label style="font-weight:600; font-size:0.9rem;">Facility Type</label>
                                    <p style="margin:5px 0;">${facilityType}</p>
                                </div>
                                <div class="detail-item">
                                    <label style="font-weight:600; font-size:0.9rem;">Address</label>
                                    <p style="margin:5px 0;">${facilityAddress}</p>
                                </div>
                                <div class="detail-item">
                                    <label style="font-weight:600; font-size:0.9rem;">Status</label>
                                    <p style="margin:5px 0;">${facilityStatus}</p>
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

    // Edit Facility functionality
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const cells = row.getElementsByTagName('td');
            const facilityId = cells[0].textContent;
            const facilityName = cells[1].textContent.trim();
            const facilityType = cells[2].textContent;
            const facilityAddress = cells[3].textContent.trim();
            const statusElement = row.querySelector('.badge');
            let currentStatus = 'active';
            if (statusElement.classList.contains('badge-inactive')) currentStatus = 'inactive';

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Edit Facility</h2>
                        <button class="modal-close" onclick="closeEditModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editFacilityForm">
                            <div class="form-group">
                                <label for="editId">Facility ID</label>
                                <input type="text" id="editId" name="id" value="${facilityId}" readonly style="background:#f5f5f5;">
                            </div>
                            <div class="form-group">
                                <label for="editName">Facility Name</label>
                                <input type="text" id="editName" name="name" value="${facilityName}" required>
                            </div>
                            <div class="form-group">
                                <label for="editType">Facility Type</label>
                                <select id="editType" name="type" required>
                                    <option value="Hospital" ${facilityType === 'Hospital' ? 'selected' : ''}>Hospital</option>
                                    <option value="Fire Station" ${facilityType === 'Fire Station' ? 'selected' : ''}>Fire Station</option>
                                    <option value="Police Station" ${facilityType === 'Police Station' ? 'selected' : ''}>Police Station</option>
                                    <option value="Emergency Center" ${facilityType === 'Emergency Center' ? 'selected' : ''}>Emergency Center</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editAddress">Address</label>
                                <textarea id="editAddress" name="address" rows="3" required>${facilityAddress}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="editStatus">Status</label>
                                <select id="editStatus" name="status" required>
                                    <option value="active" ${currentStatus === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${currentStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" style="padding:8px 15px; border:1px solid #ddd; background:white; border-radius:6px; cursor:pointer;" onclick="closeEditModal()">Cancel</button>
                        <button class="btn btn-primary" style="padding:8px 15px; border:none; background:var(--primary-color); color:white; border-radius:6px; cursor:pointer;" onclick="submitEditFacility()">Save Changes</button>
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

function submitEditFacility() {
    // Simulate submission
    showNotification(`Facility updated successfully!`, 'success');
    closeEditModal();
    setTimeout(() => { location.reload(); }, 1500);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white; padding: 12px 24px; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
        display: flex; align-items: center; gap: 10px; font-weight: 500;
    `;
    notification.innerHTML = `<span class="material-icons-round">check_circle</span><span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
}

// Export global functions for inline onclick handlers if any remain (though we attached listeners above)
// But wait, the edit button onclicks in template might still be there or we removed them?
// The template uses `onclick="openViewModal(this)"` but the script adds event listeners. 
// We should standardize. The template has inline `onclick` handlers on buttons: `onclick="openViewModal(this)"`
// The extracted JS also has `document.querySelectorAll` which adds listeners. This is redundant.
// I will keep the event listener approach in JS and REMOVE the inline onclicks from HTML in the next step.
// However, the View button in template calls `openViewModal(this)`. 
// I will expose `openViewModal` and `openEditModal` globally if I keep inline handlers, 
// OR I will remove inline handlers and rely on class selectors.
// To be safe and clean, I'll rely on class selectors and remove inline handlers from HTML.

// For now, exposing helpers just in case.
window.closeViewModal = closeViewModal;
window.closeEditModal = closeEditModal;
window.submitEditFacility = submitEditFacility;
window.showNotification = showNotification;
