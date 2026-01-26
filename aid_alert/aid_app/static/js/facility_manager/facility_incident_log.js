document.addEventListener('DOMContentLoaded', function () {
    const viewButtons = document.querySelectorAll('.view-details-btn');
    const modal = document.getElementById('viewDetailsModal');
    const closeBtn = document.getElementById('closeViewModalBtn');

    if (!modal) return;

    viewButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // Populate modal data
            const id = this.dataset.id;
            const type = this.dataset.type;
            const severity = this.dataset.severity;
            const location = this.dataset.location;
            const status = this.dataset.status;
            const assigned = this.dataset.assigned;
            const time = this.dataset.time;
            const description = this.dataset.description;

            document.getElementById('viewId').textContent = id || '-';
            document.getElementById('viewType').textContent = type || '-';
            document.getElementById('viewSeverity').textContent = severity || '-';
            document.getElementById('viewLocation').textContent = location || '-';
            document.getElementById('viewStatus').textContent = status || '-';
            document.getElementById('viewResponder').textContent = assigned || 'Unassigned';
            document.getElementById('viewTime').textContent = time || '-';
            document.getElementById('viewDescription').textContent = description || 'No description provided.';

            // Show modal
            modal.style.display = 'flex';
        });
    });

    // Close Modal Logic
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Check for open_incident URL param
    const urlParams = new URLSearchParams(window.location.search);
    const incidentIdToOpen = urlParams.get('open_incident');
    if (incidentIdToOpen) {
        const btnToClick = document.querySelector(`.view-details-btn[data-id="${incidentIdToOpen}"]`);
        if (btnToClick) {
            btnToClick.click();
            // Optional: scroll into view
            btnToClick.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
});
