// Filter functionality
document.addEventListener('DOMContentLoaded', () => {
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function () {
            // In a real app, this would fetch filtered data or filter the DOM
            console.log('Filter changed:', this.value);

            // Simulating a refresh/filter effect
            const feedbackList = document.querySelector('.feedback-list');
            if (feedbackList) {
                feedbackList.style.opacity = '0.5';
                setTimeout(() => {
                    feedbackList.style.opacity = '1';
                }, 300);
            }
        });
    });
});
