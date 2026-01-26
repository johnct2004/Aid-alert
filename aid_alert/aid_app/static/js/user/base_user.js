document.addEventListener('DOMContentLoaded', () => {
    console.log('Base user JS loaded');
    
    const profileTrigger = document.querySelector('.user-profile-trigger');
    const menu = document.getElementById('profileDropdown');
    
    console.log('Profile trigger found:', !!profileTrigger);
    console.log('Dropdown menu found:', !!menu);
    
    if (profileTrigger && menu) {
        profileTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Profile clicked - toggling menu');
            menu.classList.toggle('show');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const container = document.querySelector('.profile-dropdown-container');
        if (container && menu && !container.contains(e.target)) {
            menu.classList.remove('show');
            console.log('Dropdown closed (clicked outside)');
        }
    });
});
