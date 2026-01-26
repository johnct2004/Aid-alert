document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', filterIncidents);

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', filterIncidents);

    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) typeFilter.addEventListener('change', filterIncidents);

    const severityFilter = document.getElementById('severityFilter');
    if (severityFilter) severityFilter.addEventListener('change', filterIncidents);

    // Close modal on outside click
    window.onclick = function (event) {
        const modal = document.getElementById('incidentModal');
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});

function filterIncidents() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const severityFilter = document.getElementById('severityFilter');

    if (!searchInput || !statusFilter || !typeFilter || !severityFilter) return;

    const searchTerm = searchInput.value.toLowerCase();
    const statusVal = statusFilter.value;
    const typeVal = typeFilter.value;
    const severityVal = severityFilter.value;

    const rows = document.querySelectorAll('#incidentsTableBody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        if (row.cells.length < 2) return; // Skip empty state row

        const id = row.cells[0]?.textContent.toLowerCase() || '';
        const type = row.cells[1]?.textContent.toLowerCase() || '';
        const severity = row.cells[2]?.textContent.toLowerCase() || '';
        const location = row.cells[3]?.textContent.toLowerCase() || '';
        const status = row.cells[5]?.textContent.toLowerCase() || '';

        const matchesSearch = id.includes(searchTerm) ||
            location.includes(searchTerm) ||
            type.includes(searchTerm);
        const matchesStatus = !statusVal || status.includes(statusVal.toLowerCase());
        const matchesType = !typeVal || type.includes(typeVal.toLowerCase());
        const matchesSeverity = !severityVal || severity.includes(severityVal.toLowerCase());

        if (matchesSearch && matchesStatus && matchesType && matchesSeverity) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Update pagination info
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = visibleCount === 0 ? 'No results found' : `Showing ${visibleCount} incident(s)`;
    }
}

function viewIncident(button) {
    const incidentId = button.getAttribute('data-incident-id');
    const modal = document.getElementById('incidentModal');
    if (modal) {
        modal.style.display = 'block';
        // In a real app, fetch details via AJAX
        document.getElementById('modalBody').innerHTML = `<p>Details for Incident ${incidentId}</p>`;
    }
}

function closeModal() {
    const modal = document.getElementById('incidentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function exportIncidents() {
    alert('Export functionality simulation... Data exported!');
}

function previousPage() {
    // Placeholder
}

function nextPage() {
    // Placeholder
}

// Global functions for inline onclicks
window.viewIncident = viewIncident;
window.closeModal = closeModal;
window.exportIncidents = exportIncidents;
window.previousPage = previousPage;
window.nextPage = nextPage;
