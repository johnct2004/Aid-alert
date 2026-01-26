let map;
let userMarker;
let responderMarker;
let responderPath;

function initTrackResponder() {
    initMap();

    const centerBtn = document.getElementById('centerMap');
    if (centerBtn) {
        centerBtn.addEventListener('click', function () {
            if (userMarker) {
                map.setView(userMarker.getLatLng(), 15);
            }
        });
    }

    // Simulate Responder Movement
    setInterval(() => {
        if (userMarker && responderMarker) {
            const u = userMarker.getLatLng();
            const r = responderMarker.getLatLng();
            const newLat = r.lat + (u.lat - r.lat) * 0.05;
            const newLng = r.lng + (u.lng - r.lng) * 0.05;
            responderMarker.setLatLng([newLat, newLng]);
            responderPath.setLatLngs([[newLat, newLng], [u.lat, u.lng]]);
        }
    }, 2000);
}

function initMap() {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
        return;
    }

    // Default to New York for demo if geolocation fails or permission denied
    const defaultLat = 40.7128;
    const defaultLng = -74.0060;

    map = L.map('mapContainer').setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // User Marker
    const userIcon = L.divIcon({
        html: '<div class="custom-marker user-marker"><span class="material-icons-round">person</span></div>',
        iconSize: [30, 30],
        className: 'custom-div-icon'
    });
    userMarker = L.marker([defaultLat, defaultLng], { icon: userIcon }).addTo(map).bindPopup("Your Location");

    // Responder Marker
    const responderLat = defaultLat + 0.01;
    const responderLng = defaultLng + 0.01;
    const responderIcon = L.divIcon({
        html: '<div class="custom-marker responder-marker"><span class="material-icons-round">emergency</span></div>',
        iconSize: [30, 30],
        className: 'custom-div-icon'
    });
    responderMarker = L.marker([responderLat, responderLng], { icon: responderIcon }).addTo(map).bindPopup("Responder");

    // Polylines
    responderPath = L.polyline([[responderLat, responderLng], [defaultLat, defaultLng]], {
        color: '#ff6b35',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(map);

    // Geolocation attempt
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 15);
            userMarker.setLatLng([lat, lng]);
            // Update responder relative to user
            const rLat = lat + 0.005;
            const rLng = lng + 0.005;
            responderMarker.setLatLng([rLat, rLng]);
            responderPath.setLatLngs([[rLat, rLng], [lat, lng]]);
        }, error => {
            console.log('Geolocation unavailable:', error);
        });
    }
}
