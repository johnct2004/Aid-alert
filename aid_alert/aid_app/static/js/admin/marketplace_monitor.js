function toggleEdit(button) {
    const row = button.closest('tr');
    const editables = row.querySelectorAll('.editable');
    const isEditing = button.textContent === 'Save';

    editables.forEach(cell => {
        cell.contentEditable = !isEditing;
        if (!isEditing) {
            cell.style.backgroundColor = 'rgba(108, 92, 231, 0.1)';
            cell.style.border = '1px solid var(--primary-color)';
            cell.style.padding = '8px';
            cell.style.borderRadius = '4px';
            cell.focus();
        } else {
            cell.style.backgroundColor = 'transparent';
            cell.style.border = 'none';
            cell.style.padding = '12px'; /* Updated to match new table padding if needed or reset */
            cell.style.borderRadius = '0';
        }
    });

    button.textContent = isEditing ? 'Edit' : 'Save';
    button.className = isEditing ? 'btn-edit' : 'btn-save';

    if (isEditing) {
        showNotification('Product updated successfully!');
    }
}

function uploadPhoto(button) {
    const row = button.closest('tr');
    const photoContainer = row.querySelector('.product-photo');
    const img = photoContainer.querySelector('.product-img');


    const idText = row.children[1].textContent.trim();
    const productId = parseInt(idText.replace('PRD-', ''), 10);
    console.log('Uploading for Product ID:', productId); // Debug

    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = function (e) {
        const file = e.target.files[0];
        if (file) {
            // Show loading state
            button.textContent = 'Uploading...';
            button.disabled = true;

            const formData = new FormData();
            formData.append('image', file);

            // Use global config for CSRF or getCookie
            const csrfToken = getCookie('csrftoken');

            fetch(`/admin-panel/update-product-image/${productId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update image src with returned URL
                        img.src = data.image_url;
                        showNotification('Photo updated and saved!');
                    } else {
                        showNotification(data.message || 'Upload failed', 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showNotification('Error uploading photo', 'error');
                })
                .finally(() => {
                    button.textContent = 'Photo';
                    button.disabled = false;
                });
        }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
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

function updateStatus(select) {
    const newStatus = select.value;
    const row = select.closest('tr');
    const productId = row.querySelector('td:nth-child(2)').textContent;

    // Update the select styling based on status
    select.className = `status-select status-${newStatus}`;

    // Show notification
    const statusText = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    showNotification(`Product ${productId} status updated to ${statusText}!`);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<span class="material-icons-round" style="margin-right:8px;">${type === 'error' ? 'error_outline' : 'check_circle'}</span> ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'error' ? '#e74c3c' : 'var(--primary-color)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        display: flex;
        align-items: center;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Global exposure
window.toggleEdit = toggleEdit;
window.uploadPhoto = uploadPhoto;
window.updateStatus = updateStatus;
