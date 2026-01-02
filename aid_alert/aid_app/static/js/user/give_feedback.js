// Give Feedback Page JavaScript - Feedback History Only

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadFeedbackHistory();
});

// Load feedback history
function loadFeedbackHistory() {
    const feedbackHistory = document.getElementById('feedbackHistory');
    if (!feedbackHistory) return;
    
    const feedbackData = JSON.parse(localStorage.getItem('aidalert_feedback') || '[]');
    
    if (feedbackData.length === 0) {
        feedbackHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-slash"></i>
                <p>No feedback submitted yet.</p>
            </div>
        `;
        return;
    }
    
    let historyHTML = '';
    
    feedbackData.forEach(feedback => {
        const date = new Date(feedback.timestamp);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const typeLabel = getTypeLabel(feedback.type);
        const starsHTML = generateStars(feedback.rating);
        
        historyHTML += `
            <div class="feedback-item">
                <div class="feedback-item-header">
                    <div>
                        <span class="feedback-item-type">${typeLabel}</span>
                        <div class="feedback-item-subject">${feedback.subject}</div>
                    </div>
                    <div class="feedback-item-rating">
                        ${starsHTML}
                    </div>
                </div>
                <div class="feedback-item-message">${feedback.message}</div>
                ${feedback.email ? `<div class="feedback-item-email">Contact: ${feedback.email}</div>` : ''}
                <div class="feedback-item-date">Submitted: ${formattedDate}</div>
            </div>
        `;
    });
    
    feedbackHistory.innerHTML = historyHTML;
}

// Get type label
function getTypeLabel(type) {
    const labels = {
        'general': 'General Feedback',
        'bug': 'Bug Report',
        'feature': 'Feature Request',
        'complaint': 'Complaint',
        'compliment': 'Compliment'
    };
    return labels[type] || 'General Feedback';
}

// Generate star rating HTML
function generateStars(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += '<i class="fas fa-star star"></i>';
        } else {
            starsHTML += '<i class="far fa-star star"></i>';
        }
    }
    return starsHTML;
}
