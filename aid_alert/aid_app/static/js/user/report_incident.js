function resetForm() {
    document.getElementById('incidentForm').reset();
    showNotification('Form cleared successfully');
}

function callEmergency(number) {
    if (confirm(`Are you sure you want to call emergency number ${number}?`)) {
        showNotification(`Calling ${number}...`);
        // In a real app, this would initiate a phone call
        setTimeout(() => {
            showNotification(`Emergency dial initiated for ${number}`);
        }, 1000);
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'glass-card'; // Reuse glass card style for notification
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(230, 57, 70, 0.9);
        backdrop-filter: blur(10px);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        font-weight: 500;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Form submission
    const incidentForm = document.getElementById('incidentForm');
    if (incidentForm) {
        incidentForm.addEventListener('submit', function (e) {
            const formData = new FormData(this);
            const incidentData = Object.fromEntries(formData);

            // Validate required fields
            if (!incidentData.incidentType || !incidentData.severity || !incidentData.location || !incidentData.description) {
                e.preventDefault();
                showNotification('Please fill in all required fields');
                return;
            }

            // Validate phone number - exactly 10 digits
            if (!incidentData.contactPhone || incidentData.contactPhone.length !== 10 || !/^[0-9]{10}$/.test(incidentData.contactPhone)) {
                e.preventDefault();
                showNotification('Please enter a valid 10-digit phone number');
                return;
            }

            // Allow form to submit normally
            showNotification('Submitting report...');
        });
    }

    // Phone number validation - only allow numbers and limit to 10 digits
    const phoneInput = document.getElementById('contactPhone');

    if (phoneInput) {
        phoneInput.addEventListener('input', function () {
            // Remove any non-numeric characters
            this.value = this.value.replace(/[^0-9]/g, '');

            // Limit to 10 digits
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });

        // Prevent paste of non-numeric characters
        phoneInput.addEventListener('paste', function (e) {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const numericData = pastedData.replace(/[^0-9]/g, '').slice(0, 10);
            this.value = numericData;
        });
    }

    // Location detection functionality
    const detectLocationBtn = document.getElementById('detectLocation');
    const locationInput = document.getElementById('location');

    if (detectLocationBtn && locationInput) {
        detectLocationBtn.addEventListener('click', function () {
            // Check if geolocation is supported
            if (!navigator.geolocation) {
                showNotification('Geolocation is not supported by your browser');
                return;
            }

            // Show loading state
            this.disabled = true;
            this.innerHTML = '<span class="material-icons-round">hourglass_empty</span>';
            showNotification('Detecting your location...');

            // Get current position
            navigator.geolocation.getCurrentPosition(
                // Success callback
                function (position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    // Reverse geocoding
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data && data.display_name) {
                                locationInput.value = data.display_name;
                                showNotification('Location detected successfully!');
                            } else {
                                locationInput.value = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
                                showNotification('Coordinates detected.');
                            }
                        })
                        .catch(error => {
                            locationInput.value = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
                            showNotification('Coordinates detected.');
                        })
                        .finally(() => {
                            detectLocationBtn.disabled = false;
                            detectLocationBtn.innerHTML = '<span class="material-icons-round">my_location</span>';
                        });
                },
                // Error callback
                function (error) {
                    showNotification('Unable to detect location. Please allow access.');
                    detectLocationBtn.disabled = false;
                    detectLocationBtn.innerHTML = '<span class="material-icons-round">my_location</span>';
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });

        locationInput.addEventListener('click', function () {
            if (!this.value) {
                detectLocationBtn.click();
            }
        });
    }
});
