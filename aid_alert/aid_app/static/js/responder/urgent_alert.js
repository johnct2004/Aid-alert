function triggerUrgentAlert(incidentId) {
    if (!confirm("CRITICAL ALERT: Are you sure you want to report URGENT BLOOD LOSS for this incident? This will notify all Facility Managers immediately.")) {
        return;
    }

    const csrftoken = getCookie('csrftoken');

    // Show temporary feedback
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Sending Alert...';
    btn.disabled = true;

    fetch('/api/trigger-medical-alert/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({
            incident_id: incidentId,
            alert_type: 'blood_loss',
            notes: 'Patient showing signs of severe blood loss. Immediate blood donor match required.'
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("ALERT SENT: Facility Managers have been notified. Please stabilize patient and wait for updates.");
            } else {
                alert("Error sending alert: " + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Network error. Alert may not have been sent.");
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
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
