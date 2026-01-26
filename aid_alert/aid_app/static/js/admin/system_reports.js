document.addEventListener('DOMContentLoaded', function () {
    // Check if systemReportData exists
    if (typeof window.systemReportData === 'undefined') {
        console.error('System Report Data not initialized');
        return;
    }

    const { chartDates, incidentTrend, userTrend, orderTrend, incidentOpen, incidentResolved } = window.systemReportData;

    // --- 1. Activity Trend Chart ---
    const activityChartEl = document.getElementById('activityChart');
    if (activityChartEl) {
        const ctxActivity = activityChartEl.getContext('2d');
        new Chart(ctxActivity, {
            type: 'line',
            data: {
                labels: chartDates,
                datasets: [
                    {
                        label: 'Incidents Reported',
                        data: incidentTrend,
                        borderColor: '#e74c3c', // Red
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'New Users',
                        data: userTrend,
                        borderColor: '#4361ee', // Blue
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Marketplace Orders',
                        data: orderTrend,
                        borderColor: '#f1c40f', // Yellow
                        backgroundColor: 'rgba(241, 196, 15, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // --- 2. Incident Status Doughnut Chart ---
    const statusChartEl = document.getElementById('statusChart');
    if (statusChartEl) {
        const ctxStatus = statusChartEl.getContext('2d');
        new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Open', 'Resolved'],
                datasets: [{
                    data: [incidentOpen, incidentResolved],
                    backgroundColor: [
                        '#e74c3c', // Red for Open
                        '#10b981'  // Green for Resolved
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                cutout: '70%'
            }
        });
    }
});

function updateReportStatus(select) {
    const newStatus = select.value;
    const row = select.closest('tr');
    const reportId = row.querySelector('td:first-child').textContent;
    // Optionally update styling class
    showNotification(`Report ${reportId} status updated!`);
}

function viewReport(btn) {
    // Populate modal with report data
    document.getElementById('modalReportId').textContent = btn.dataset.id;
    document.getElementById('modalReportType').textContent = btn.dataset.type;
    document.getElementById('modalReportTitle').textContent = btn.dataset.title;
    document.getElementById('modalReportDate').textContent = btn.dataset.date;

    const status = btn.dataset.status;
    document.getElementById('modalReportStatus').textContent = status.charAt(0).toUpperCase() + status.slice(1);

    // Show modal
    document.getElementById('reportModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function downloadReport() {
    const reportId = document.getElementById('modalReportId').textContent;
    showNotification(`Downloading report ${reportId}...`);
    setTimeout(() => {
        showNotification(`Report ${reportId} downloaded successfully!`);
    }, 1500);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background-color: var(--primary-color); color: white;
        padding: 12px 20px; border-radius: 8px; z-index: 1000;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    // Slight style adjustment for error if needed, but keeping simple
    if (type === 'error') notification.style.backgroundColor = '#e74c3c';

    notification.innerHTML = `<span class="material-icons-round">check_circle</span> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
}

// --- Generate Report Logic ---
function openGenerateModal() {
    document.getElementById('generateReportModal').style.display = 'flex';
}

function closeGenerateModal() {
    document.getElementById('generateReportModal').style.display = 'none';
}

function handleGenerateReport() {
    const type = document.getElementById('newReportType').value;
    const btn = document.getElementById('generateBtn');

    btn.innerHTML = 'Generating...';
    btn.disabled = true;

    // Get CSRF token helper
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


    fetch('/admin-panel/generate-report/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ type: type })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Report generated successfully!');
                closeGenerateModal();
                setTimeout(() => location.reload(), 1000); // Reload to show new report
            } else {
                showNotification(data.message || 'Error generating report', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showNotification('An error occurred', 'error');
        })
        .finally(() => {
            btn.innerHTML = 'Generate';
            btn.disabled = false;
        });
}

// Global exposure
window.updateReportStatus = updateReportStatus;
window.viewReport = viewReport;
window.closeModal = closeModal;
window.downloadReport = downloadReport;
window.openGenerateModal = openGenerateModal;
window.closeGenerateModal = closeGenerateModal;
window.handleGenerateReport = handleGenerateReport;
