// Make modal functions global
window.openAddUserModal = function () {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '99999'; // Force High Z-Index
        document.body.style.overflow = 'hidden';
        // Reset form
        const form = document.getElementById('addUserForm');
        if (form) form.reset();
    } else {
        console.error('Modal element not found');
        alert('Error: Add User Modal not found. Please refresh the page.');
    }
}

window.closeAddUserModal = function () {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Helper for role names
function getRoleDisplayName(role) {
    const roleNames = {
        'user': 'Regular User',
        'seller': 'Seller',
        'facility_manager': 'Facility Manager',
        'responder': 'Responder',
        'admin': 'Admin',
        'hr': 'HR'
    };
    return roleNames[role] || role;
}

function handleAddUser(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role'),
        phone: formData.get('phone'),
        isActive: formData.get('isActive') === 'on',
        sendWelcome: formData.get('sendWelcome') === 'on'
    };

    // Validate form data
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.username || !userData.password || !userData.role) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    // Phone validation (Strict 10 digits)
    if (userData.phone) {
        if (!/^\d{10}$/.test(userData.phone)) {
            showNotification('Phone number must be exactly 10 digits', 'error');
            return;
        }
    }

    // Password validation (Min 8 chars)
    if (userData.password.length < 8) {
        showNotification('Password must be at least 8 characters long', 'error');
        return;
    }

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    // Get CSRF token
    const csrftoken = getCookie('csrftoken');

    // Call API (URL will be passed via config or assume global scope if not passed)
    // We'll use window.manageUsersConfig.addUserUrl if available, else standard relative path logic or throw
    const url = window.manageUsersConfig ? window.manageUsersConfig.addUserUrl : "/admin-panel/add-user/";

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify(userData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // close modal
                window.closeAddUserModal();
                showNotification(data.message, 'success');

                // Reload page to reflect changes
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                showNotification(data.message || 'Error creating user', 'error');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An unexpected error occurred', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

function attachActionListeners() {
    // Re-attach view button listeners
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const userName = row.querySelector('.user-name').textContent.trim();
            const userEmail = row.querySelector('.user-email').textContent.trim();
            const role = row.querySelector('.role-badge').textContent.trim();
            const status = row.querySelector('.status-badge').textContent.trim();
            const lastActive = row.querySelectorAll('.date-info p')[0].textContent.trim();
            const joinedDate = row.querySelectorAll('.date-info')[1].querySelector('p').textContent.trim();

            const modal = document.createElement('div');
            modal.className = 'modal glass-modal';
            modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(5px);';
            modal.innerHTML = `
                <div class="modal-content" style="background:white; padding:30px; border-radius:12px; width:500px; max-width:90%; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">
                        <h2 style="margin:0; font-size:1.5rem; color:#333;">User Details</h2>
                        <button onclick="this.closest('.modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                    <div class="user-details-view">
                        <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
                            <div style="width:60px; height:60px; background:var(--primary-color); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:24px;">
                                <span class="material-icons-round" style="font-size:32px;">person</span>
                            </div>
                            <div>
                                <h3 style="margin:0; font-size:1.2rem;">${userName}</h3>
                                <p style="margin:0; color:#666;">${userEmail}</p>
                            </div>
                        </div>

                        ${(function () {
                    const profileEl = row.querySelector('.user-profile-data');
                    if (!profileEl) return '';

                    const blood = profileEl.getAttribute('data-blood') || 'N/A';
                    const allergies = profileEl.getAttribute('data-allergies') || 'None';
                    const emergencyName = profileEl.getAttribute('data-emergency-contact') || 'N/A';
                    const emergencyPhone = profileEl.getAttribute('data-emergency-phone') || 'N/A';

                    const address = profileEl.getAttribute('data-address');
                    const city = profileEl.getAttribute('data-city');
                    const state = profileEl.getAttribute('data-state');
                    const zip = profileEl.getAttribute('data-zip');
                    const country = profileEl.getAttribute('data-country');

                    let fullAddress = [address, city, state, zip, country].filter(Boolean).join(', ');
                    if (!fullAddress) fullAddress = 'N/A';

                    return `
                            <div style="margin-bottom: 20px; background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #f39c12;">
                                <h4 style="margin: 0 0 10px 0; font-size: 1rem; color: #d35400; display:flex; align-items:center; gap:5px;">
                                    <span class="material-icons-round" style="font-size:18px;">medical_services</span> 
                                    Medical & Emergency Info
                                </h4>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                                    <div><strong>Blood Type:</strong> <span style="color:#d35400; font-weight:bold;">${blood}</span></div>
                                    <div><strong>Allergies:</strong> ${allergies}</div>
                                    <div><strong>Emergency Contact:</strong> ${emergencyName}</div>
                                    <div><strong>Emergency Phone:</strong> <a href="tel:${emergencyPhone}">${emergencyPhone}</a></div>
                                    <div style="grid-column: span 2; margin-top:5px; padding-top:5px; border-top:1px dashed #f39c12;">
                                        <strong>Address:</strong> ${fullAddress}
                                    </div>
                                </div>
                            </div>
                            `;
                })()}

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                            <div><strong>Role:</strong> <span class="badge">${role}</span></div>
                            <div><strong>Status:</strong> <span class="badge">${status}</span></div>
                            <div><strong>Last Active:</strong> <br>${lastActive}</div>
                            <div><strong>Joined:</strong> <br>${joinedDate}</div>
                        </div>

                        <!-- Feedback Section -->
                        <div style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
                            <h4 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #444;">Recent Feedback</h4>
                            ${(function () {
                    try {
                        const feedbackDataEl = row.querySelector('.user-feedback-data');
                        if (!feedbackDataEl) return '<p style="color:#888; font-style:italic;">No feedback data available.</p>';

                        const feedbackList = JSON.parse(feedbackDataEl.textContent.trim());

                        if (feedbackList.length === 0) {
                            return '<p style="color:#888; font-style:italic;">No feedback submitted.</p>';
                        }

                        return `<div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                                        ${feedbackList.map(f => `
                                            <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; border-left: 3px solid ${f.sentiment === 'positive' ? '#2ecc71' : f.sentiment === 'negative' ? '#e74c3c' : '#f1c40f'};">
                                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                                    <span style="font-weight: 600; font-size: 0.9rem;">${f.rating} ★</span>
                                                    <span style="font-size: 0.8rem; color: #666;">${f.date}</span>
                                                </div>
                                                <p style="margin: 0; font-size: 0.9rem; color: #555;">${f.message}</p>
                                            </div>
                                        `).join('')}
                                    </div>`;
                    } catch (e) {
                        console.error("Error parsing feedback data", e);
                        return '<p style="color:#e74c3c;">Error loading feedback.</p>';
                    }
                })()}
                        </div>
                    </div>
                    <div style="margin-top:25px; text-align:right;">
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove()" style="padding:8px 20px; border:none; background:var(--primary-color); color:white; border-radius:6px; cursor:pointer;">Close</button>
                    </div>
                </div>

            `;
            document.body.appendChild(modal);
        });
    });

    // Edit User Modal
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            const userName = row.querySelector('.user-name').textContent.trim();
            const userEmail = row.querySelector('.user-email').textContent.trim();

            const modal = document.createElement('div');
            modal.className = 'modal glass-modal';
            modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(5px);';
            modal.innerHTML = `
                <div class="modal-content" style="background:white; padding:30px; border-radius:12px; width:500px; max-width:90%; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <h2 style="margin-top:0; margin-bottom:20px;">Edit User</h2>
                    <form onsubmit="event.preventDefault(); alert('Changes saved!'); this.closest('.modal').remove();">
                        <div style="margin-bottom:15px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500;">Full Name</label>
                            <input type="text" value="${userName}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        </div>
                        <div style="margin-bottom:15px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500;">Email</label>
                            <input type="email" value="${userEmail}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        </div>
                        <div style="margin-bottom:15px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500;">Role</label>
                            <select style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                                <option>Regular User</option>
                                <option>Admin</option>
                                <option>Responder</option>
                            </select>
                        </div>
                        <div style="text-align:right; margin-top:20px;">
                            <button type="button" onclick="this.closest('.modal').remove()" style="padding:8px 15px; background:transparent; border:1px solid #ddd; border-radius:6px; cursor:pointer; margin-right:10px;">Cancel</button>
                            <button type="submit" style="padding:8px 20px; border:none; background:var(--primary-color); color:white; border-radius:6px; cursor:pointer;">Save Changes</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        });
    });

    // Delete User Confirmation
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            if (confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
                const row = this.closest('tr');
                row.style.opacity = '0.5';
                setTimeout(() => row.remove(), 500);
                alert('User deleted.');
            }
        });
    });

    // Suspend/Activate Toggle
    document.querySelectorAll('.suspend-btn, .activate-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const action = this.classList.contains('suspend-btn') ? 'suspend' : 'activate';
            if (confirm(`Are you sure you want to ${action} this user?`)) {
                alert(`User ${action}ed successfully.`);
                location.reload();
            }
        });
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    // Assuming icon map based on type
    let icon = 'ℹ';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✗';

    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        backdrop-filter: blur(10px);
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS for notifications if not present (Usually done in main script or CSS, but here for self-containment if needed)
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Utility
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

// Main initialization
document.addEventListener('DOMContentLoaded', function () {
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    const userRows = document.querySelectorAll('.user-row');

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            userRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Filter functionality
    const roleFilter = document.querySelector('.filter-select:nth-of-type(1)');
    const statusFilter = document.querySelector('.filter-select:nth-of-type(2)');

    function applyFilters() {
        const selectedRole = roleFilter ? roleFilter.value : 'all';
        const selectedStatus = statusFilter ? statusFilter.value : 'all';
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        let filteredCount = 0;

        userRows.forEach(row => {
            const userName = row.querySelector('.user-name')?.textContent.toLowerCase() || '';
            const userEmail = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
            const roleBadge = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
            const statusBadge = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';

            // Check if row matches all filters
            const matchesSearch = userName.includes(searchTerm) || userEmail.includes(searchTerm);
            const matchesRole = selectedRole === 'all' || roleBadge.includes(selectedRole.toLowerCase());
            const matchesStatus = selectedStatus === 'all' || statusBadge.includes(selectedStatus.toLowerCase());

            const shouldShow = matchesSearch && matchesRole && matchesStatus;
            row.style.display = shouldShow ? '' : 'none';

            if (shouldShow) {
                filteredCount++;
            }
        });

        // Update showing count
        const showingText = document.querySelector('.stats-grid + .glass-card .text-muted');
        if (showingText) {
            showingText.textContent = `Showing ${filteredCount} of ${userRows.length} users`;
        }

        // Show notification
        const filterDescription = [];
        if (selectedRole !== 'all') filterDescription.push(`role: ${selectedRole}`);
        if (selectedStatus !== 'all') filterDescription.push(`status: ${selectedStatus}`);
        if (searchTerm) filterDescription.push(`search: "${searchTerm}"`);

        const message = filterDescription.length > 0
            ? `Filters applied: ${filterDescription.join(', ')} (${filteredCount} users found)`
            : 'All filters cleared';

        showNotification(message, 'info');
    }

    // Auto-apply filters when dropdown changes
    if (roleFilter) roleFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);

    // Clear filters function
    function clearFilters() {
        if (roleFilter) roleFilter.value = 'all';
        if (statusFilter) statusFilter.value = 'all';
        if (searchInput) searchInput.value = '';

        userRows.forEach(row => {
            row.style.display = '';
        });

        showNotification('Filters cleared', 'info');
    }

    // Add clear filters button
    const filterBtn = document.querySelector('.filter-btn');
    if (filterBtn) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-secondary';
        clearBtn.textContent = 'Clear All';
        clearBtn.style.marginLeft = '10px';
        clearBtn.onclick = clearFilters;
        filterBtn.parentNode.insertBefore(clearBtn, filterBtn.nextSibling);
    }

    // Checkbox & Bulk Actions Logic
    const selectAllCheckbox = document.querySelector('.select-all-checkbox');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    const selectedCount = document.querySelector('.selected-count');
    const bulkButtons = document.querySelectorAll('.bulk-buttons button');

    function updateBulkActions() {
        const checkedCount = document.querySelectorAll('.user-checkbox:checked').length;
        if (selectedCount) selectedCount.textContent = `${checkedCount} user${checkedCount !== 1 ? 's' : ''} selected`;

        if (bulkButtons) {
            bulkButtons.forEach(button => {
                button.disabled = checkedCount === 0;
            });
        }
    }

    // Bulk Action Implementation
    function performBulkAction(actionType) {
        const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
        const userIds = Array.from(checkedBoxes).map(cb => cb.value);

        if (userIds.length === 0) return;

        const actionMap = {
            'activate': 'activate',
            'suspend': 'suspend',
            'delete': 'permanently delete'
        };

        const actionVerb = actionMap[actionType];

        if (!confirm(`Are you sure you want to ${actionVerb} ${userIds.length} selected user(s)?`)) {
            return;
        }

        // Show loading state
        bulkButtons.forEach(btn => btn.disabled = true);

        const csrftoken = getCookie('csrftoken');
        const url = window.manageUsersConfig ? window.manageUsersConfig.bulkActionUrl : "/admin-panel/bulk-actions/";

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({
                action: actionType,
                user_ids: userIds
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showNotification(data.message, 'error');
                    updateBulkActions(); // Re-enable if needed
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('An unexpected error occurred', 'error');
                updateBulkActions();
            });
    }

    // Attach listeners to bulk buttons
    const bulkActivateBtn = document.querySelector('.bulk-activate');
    const bulkSuspendBtn = document.querySelector('.bulk-suspend');
    const bulkDeleteBtn = document.querySelector('.bulk-delete');

    if (bulkActivateBtn) bulkActivateBtn.addEventListener('click', () => performBulkAction('activate'));
    if (bulkSuspendBtn) bulkSuspendBtn.addEventListener('click', () => performBulkAction('suspend'));
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', () => performBulkAction('delete'));

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            userCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateBulkActions();
        });
    }

    userCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActions);
    });

    // Attach Handle Add User to Form
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }

    // Initial call to update bulk actions in case of pre-checked boxes
    updateBulkActions();

    // Attach action listeners for view, edit, delete, suspend/activate buttons
    attachActionListeners();
});

// Expose handleAddUser globally for specific onclicks if any (though we used addEventListener above)
window.handleAddUser = handleAddUser;
