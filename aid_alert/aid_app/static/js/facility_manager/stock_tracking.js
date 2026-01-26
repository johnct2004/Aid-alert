/* Stock Tracking JS */

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

let currentItemId = null;

function openUpdateModal(itemId, itemName, currentQty, kitName) {
    console.log('Opening modal for:', itemId, itemName); // Debug log
    currentItemId = itemId;
    const nameEl = document.getElementById('modalItemName');
    const kitEl = document.getElementById('modalKitName');
    const qtyInput = document.getElementById('updateQuantity');

    if (nameEl) nameEl.textContent = itemName;
    if (kitEl) kitEl.textContent = kitName;
    if (qtyInput) qtyInput.value = currentQty;

    // Show modal
    const modal = document.getElementById('updateStockModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Force reflow
        void modal.offsetWidth;
        modal.classList.add('visible');
    } else {
        console.error('Modal element not found');
    }
}

function closeUpdateModal() {
    const modal = document.getElementById('updateStockModal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.classList.add('hidden');
            currentItemId = null;
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('Stock Tracking JS Loaded'); // Debug log

    // Event Delegation for Update Buttons
    document.body.addEventListener('click', function (e) {
        const btn = e.target.closest('.update-stock-btn');
        if (btn) {
            const { id, name, quantity, kit } = btn.dataset;
            openUpdateModal(id, name, quantity, kit);
        }

        // Close modal on outside click (delegated or direct listener on modal)
        const modal = document.getElementById('updateStockModal');
        if (e.target === modal) {
            closeUpdateModal();
        }
    });

    // Handle form submission
    const form = document.getElementById('updateStockForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!currentItemId) {
                console.error('No item selected');
                return;
            }

            const newQty = document.getElementById('updateQuantity').value;
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            // Loading state
            btn.innerHTML = '<span class="material-icons-round spin">sync</span> Updating...';
            btn.disabled = true;

            fetch('/api/stock/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    item_id: currentItemId,
                    quantity: parseInt(newQty)
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        console.log('Update success:', data);

                        // Update the row in the table using ID
                        const row = document.getElementById(`item-row-${currentItemId}`);
                        if (row) {
                            row.cells[3].textContent = newQty; // Quantity column
                            row.cells[5].innerHTML = `<span class="status-badge ${data.status_class}">${data.new_status}</span>`; // Status column
                            row.cells[6].textContent = 'Just now'; // Last updated

                            // Update the button's data attribute so opening it again shows new qty
                            const btnArg = row.querySelector('.update-stock-btn');
                            if (btnArg) btnArg.dataset.quantity = newQty;
                        } else {
                            console.warn('Could not find row to update for ID:', currentItemId);
                        }

                        closeUpdateModal();
                    } else {
                        alert('Error: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while updating stock. Check console for details.');
                })
                .finally(() => {
                    if (btn) {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                    }
                });
        });
    } else {
        console.error('Update form not found');
    }
});
