function openReplyModal(btn) {
    const id = btn.dataset.id;
    const existingReply = btn.dataset.reply;
    const modal = document.getElementById('replyModal');
    const form = document.getElementById('replyForm');
    const textarea = form.querySelector('textarea[name="reply"]');

    // Set the form action dynamically logic needs to be handled.
    // Since we can't easily replace the URL server-side string in JS, we might need a data attribute on the form or build it carefully.
    // However, the original code had: form.action = "{% url 'aid_app:reply_feedback' 0 %}".replace('0', id);
    // We should pass the base URL as a config or data attribute on the container.
    // For now, let's assume the base URL pattern or pass it via init.

    // Better approach: User init function pattern.
    if (window.feedbackConfig && window.feedbackConfig.replyUrlBase) {
        form.action = window.feedbackConfig.replyUrlBase.replace('0', id);
    }

    // Pre-fill existing reply if any
    textarea.value = existingReply || '';

    // Update modal title logic if needed (optional)
    const title = modal.querySelector('h3');
    title.textContent = existingReply ? 'Edit Reply' : 'Reply to Feedback';

    modal.style.display = 'flex';
}

function closeReplyModal() {
    const modal = document.getElementById('replyModal');
    if (modal) modal.style.display = 'none';
}

function markAsResolved(btn) {
    const id = btn.dataset.id;
    if (confirm("Mark Feedback #" + id + " as resolved?")) {
        const item = btn.closest('.feedback-item');
        item.style.opacity = '0.7';
        btn.textContent = 'Resolved';
        btn.disabled = true;
        // In a real app, you would make an AJAX request here
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('replyModal');
    if (event.target == modal) {
        closeReplyModal();
    }
}

// Export functions
window.openReplyModal = openReplyModal;
window.closeReplyModal = closeReplyModal;
window.markAsResolved = markAsResolved;
