function viewDetails(incidentId, description) {
    alert(`Incident Details: ${incidentId}\n\nDescription: ${description}`);
}

document.addEventListener('DOMContentLoaded', () => {
    // Simple client-side search (optional enhancement for existing rows)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#historyTableBody tr');

            rows.forEach(row => {
                if (row.classList.contains('empty-state')) return;
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
});
