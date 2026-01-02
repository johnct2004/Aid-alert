import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// 1. SCENE SETUP
const scene = new THREE.Scene();
// White Fog for depth (Clinical look)
scene.fog = new THREE.FogExp2(0xf5f7fa, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Mount to container if it exists, otherwise document body (fallback)
const container = document.getElementById('canvas-container');
if (container) {
    container.appendChild(renderer.domElement);
} else {
    document.body.appendChild(renderer.domElement);
}

// 2. CREATE FLOATING MEDICAL CROSSES
const crosses = [];
const crossCount = 60; // How many crosses

// Define the Cross Shape Geometry
// We make a helper function to create a cross mesh
function createCrossMesh() {
    const group = new THREE.Group();
    
    // Material: Medical Red with a little shine
    const material = new THREE.MeshPhongMaterial({
        color: 0xe63946,
        shininess: 100,
        specular: 0xffffff,
    });

    // Vertical bar
    const vGeo = new THREE.BoxGeometry(0.6, 2, 0.4);
    const vMesh = new THREE.Mesh(vGeo, material);
    
    // Horizontal bar
    const hGeo = new THREE.BoxGeometry(2, 0.6, 0.4);
    const hMesh = new THREE.Mesh(hGeo, material);

    group.add(vMesh);
    group.add(hMesh);
    return group;
}

// Add lights so the crosses look 3D and plastic/clean
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Generate the crosses scattered in space
for (let i = 0; i < crossCount; i++) {
    const cross = createCrossMesh();
    
    // Random position
    cross.position.x = (Math.random() - 0.5) * 40;
    cross.position.y = (Math.random() - 0.5) * 40;
    cross.position.z = (Math.random() - 0.5) * 30;

    // Random rotation speed
    cross.userData = {
        rotX: (Math.random() - 0.5) * 0.02,
        rotY: (Math.random() - 0.5) * 0.02,
        speedY: (Math.random() * 0.02) + 0.01 // Floating up speed
    };

    scene.add(cross);
    crosses.push(cross);
}

camera.position.z = 15;

// 3. MOUSE INTERACTIVITY
let mouseX = 0;
let mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX) * 0.05;
    mouseY = (event.clientY - windowHalfY) * 0.05;
});

// 4. ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);

    // Move Camera slightly based on mouse
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    // Animate each cross
    crosses.forEach(cross => {
        cross.rotation.x += cross.userData.rotX;
        cross.rotation.y += cross.userData.rotY;
        
        // Make them float slowly upwards like bubbles
        cross.position.y += cross.userData.speedY;

        // If they go too high, reset to bottom
        if(cross.position.y > 20) {
            cross.position.y = -20;
        }
    });

    renderer.render(scene, camera);
}

animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
