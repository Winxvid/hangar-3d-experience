import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import gsap from 'gsap';

// Configuration
const PAGES = {
    about: {
        id: 'about',
        title: 'HOME',
        doorImage: './assets/why_choose.png',
        color: 0x3b82f6, // hex
        cssColor: '#3b82f6',
        position: new THREE.Vector3(-22, -2, -149.5), // Snug against the back wall (z is -150)
        description: 'Return to the main hangar view.',
        externalUrl: 'airprotectdetail/index.html'
    },
    booking: {
        id: 'booking',
        title: 'Request Consult',
        doorImage: './assets/airprotect_logo.jpg',
        color: 0xf59e0b,
        cssColor: '#f59e0b',
        position: new THREE.Vector3(22, -2, -149.5), // Snug against the back wall, almost touching HOME
        description: 'Schedule your professional detailing consultation.',
        content: `
            <div class="relative h-[40vh] flex items-center justify-center text-white overflow-hidden" style="background-color: #f59e0b">
                <div class="absolute inset-0 opacity-20">
                    <div class="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent"></div>
                    <img src="https://picsum.photos/id/1071/1920/1080" class="w-full h-full object-cover" />
                </div>
                <div class="relative z-10 text-center">
                    <h1 class="text-6xl font-bold tracking-tighter uppercase">BOOKING</h1>
                </div>
            </div>
            <div class="max-w-2xl mx-auto px-8 py-16">
                <form id="booking-form" class="space-y-6">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                            <input required type="text" class="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 outline-none" placeholder="John Doe" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                            <input required type="email" class="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 outline-none" placeholder="john@example.com" />
                        </div>
                    </div>
                    <div class="space-y-2">
                            <label class="text-sm font-bold text-slate-700 uppercase tracking-wider">Vehicle Model</label>
                            <input required type="text" class="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 outline-none" placeholder="e.g. Porsche 911 GT3" />
                        </div>
                    <button type="submit" class="w-full py-5 rounded-2xl bg-amber-500 text-white font-black text-xl uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all">Request Appointment</button>
                </form>
            </div>
        `
    }
};

let scene, camera, renderer, controls;
let raycaster, mouse;
let doors = [];
let hoveredDoor = null;
let selectedPage = null;

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const hoverInfo = document.getElementById('hover-info');
const hoverTitle = document.getElementById('hover-title');
const hoverDesc = document.getElementById('hover-desc');
const pagesContainer = document.getElementById('pages-container');
const pageContent = document.getElementById('page-content');
const uiOverlay = document.getElementById('ui-overlay');
const backBtn = document.getElementById('back-btn');

try { init(); } catch (e) { document.body.innerHTML = e.stack; }
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    // Removed fog for a clean, professional studio look

    // Camera setup
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5.5, 180); // Move back considerably to see the massive scale

    // Renderer setup
    const canvas = document.getElementById('webgl-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Controls setup for first-person feel from the floor but still orbiting
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    
    // Vertical rotation limits (prevent going through floor or ceiling)
    controls.minPolarAngle = Math.PI / 3; // Prevent looking from too high up
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going below the floor
    
    // Horizontal rotation limits (prevent orbiting behind the back wall)
    controls.minAzimuthAngle = -Math.PI / 3; // Limit looking too far left
    controls.maxAzimuthAngle = Math.PI / 3; // Limit looking too far right
    
    // Zoom limits (keep inside the hangar bounds)
    controls.minDistance = 20;
    controls.maxDistance = 330; // Allow zooming back practically to the front wall
    
    controls.target.set(0, 5.5, -150); // Look all the way to the back wall
    controls.update();

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    buildEnvironment();
    buildLights();
    buildDoors();

    // Events
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('click', onClick);
    backBtn.addEventListener('click', onBackToHangar);

    // Hide Loading
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 1000);
    }, 1500); // Simulate load time
}

function buildEnvironment() {
    // Floor Reflector (simulating the glossy reflection)
    const floorGeometry = new THREE.PlaneGeometry(600, 600);
    const floor = new Reflector(floorGeometry, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: 0x888888,
        recursion: 1
    });
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.01;
    scene.add(floor);

    // Semitransparent Epoxy Floor Surface
    const epoxyMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a, 
        roughness: 0.2, 
        metalness: 0.1, 
        transparent: true, 
        opacity: 0.85 
    });
    const epoxyFloor = new THREE.Mesh(floorGeometry, epoxyMat);
    epoxyFloor.rotation.x = -Math.PI / 2;
    epoxyFloor.position.y = -2.0;
    epoxyFloor.receiveShadow = true;
    scene.add(epoxyFloor);

    // Floor Decal (Sticker / Painted Logo)
    const textureLoader = new THREE.TextureLoader();
    const decalTex = textureLoader.load('./assets/favicon.png');
    // Using an aspect ratio preserving plane (assuming square logo, adjust dimensions if needed)
    const decalSize = 60; 
    const decalGeo = new THREE.PlaneGeometry(decalSize, decalSize);
    const decalMat = new THREE.MeshStandardMaterial({ 
        map: decalTex, 
        transparent: true, 
        roughness: 0.8, 
        emissive: 0xffffff,
        emissiveMap: decalTex,
        emissiveIntensity: 0.1 // Just enough to make the logo pop against the dark floor
    });
    const floorDecal = new THREE.Mesh(decalGeo, decalMat);
    floorDecal.rotation.x = -Math.PI / 2;
    // Set Y just slightly above the epoxy floor (-2.0) to prevent z-fighting
    floorDecal.position.set(0, -1.98, -40); 
    // It shouldn't cast shadows, but can receive them to feel grounded
    floorDecal.receiveShadow = true; 
    scene.add(floorDecal);

    // Wall parameters
    const hangarWidth = 400; // side walls at -200, 200
    const hangarDepth = 400; // back wall at -150, front at 250
    const hangarHeight = 60; // 
    const wallY = 28; // center of 60 height from floor -2 is 28

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.7, metalness: 0.3 });
    const wallGeo = new THREE.PlaneGeometry(hangarWidth, hangarHeight);
    const sideWallGeo = new THREE.PlaneGeometry(hangarDepth, hangarHeight);

    // Back Wall
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, wallY, -150);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Structural Support Pillars for Back Wall
    for (let x = -180; x <= 180; x += 45) {
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(4, hangarHeight, 6), 
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 })
        );
        pillar.position.set(x, wallY, -149);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
    }

    // Horizontal Beams along the back wall
    for (let y = 8; y <= 55; y += 12) {
        const beam = new THREE.Mesh(
            new THREE.BoxGeometry(hangarWidth, 1.5, 2), 
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.5 })
        );
        beam.position.set(0, y, -149);
        beam.castShadow = true;
        scene.add(beam);
    }

    // Side Walls & Pillars
    [-200, 200].forEach(x => {
        const sideWall = new THREE.Mesh(sideWallGeo, wallMat);
        sideWall.position.set(x, wallY, 50); // Center is halfway between -150 and 250
        sideWall.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
        sideWall.receiveShadow = true;
        scene.add(sideWall);

        // Structural Support Pillars for Sidewalls
        for (let z = -150; z <= 250; z += 40) {
            const pillar = new THREE.Mesh(
                new THREE.BoxGeometry(6, hangarHeight, 4), 
                new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 })
            );
            pillar.position.set(x + (x > 0 ? -1 : 1), wallY, z);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            scene.add(pillar);
        }

        // Horizontal Structural Beams along side walls
        for (let y = 8; y <= 55; y += 12) {
            const beam = new THREE.Mesh(
                new THREE.BoxGeometry(2, 1.5, hangarDepth), 
                new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.5 })
            );
            beam.position.set(x + (x > 0 ? -2 : 2), y, 50);
            beam.castShadow = true;
            scene.add(beam);
        }
    });

    // Ceiling Plane
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(hangarWidth, hangarDepth), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 58, 50);
    scene.add(ceiling);

    // Structural Pillars (Yellow Striped)
    const stripeCanvas = document.createElement('canvas');
    stripeCanvas.width = 128;
    stripeCanvas.height = 128;
    const ctx = stripeCanvas.getContext('2d');
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(64, 0); ctx.lineTo(128, 64); ctx.lineTo(128, 128);
    ctx.lineTo(64, 128); ctx.lineTo(0, 64); ctx.fill();

    const stripeTex = new THREE.CanvasTexture(stripeCanvas);
    stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
    stripeTex.repeat.set(1, 4);

    [-185, 185].forEach(x => { 
        for (let z = -110; z <= 210; z += 40) {
            const group = new THREE.Group();
            group.position.set(x, 3, z);

            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 10, 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            pillar.castShadow = true;
            pillar.receiveShadow = true;

            const stripePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), new THREE.MeshStandardMaterial({ color: 0xfbbf24, map: stripeTex }));
            stripePlane.position.set(x > 0 ? -0.76 : 0.76, -3.75, 0);
            stripePlane.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;

            group.add(pillar, stripePlane);
            scene.add(group);
        }
    });
}

function buildLights() {
    // Professional Studio Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.5)); // Brighter base

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005; // Prevent shadow acne
    scene.add(dirLight);

    // Cool fill light to illuminate opposite sides smoothly
    const fillLight = new THREE.DirectionalLight(0xe0eaff, 1.0);
    fillLight.position.set(-20, 20, -30);
    scene.add(fillLight);

    // Linear Light fixtures (Keep models for context)
    [-120, -60, 0, 60, 120].forEach(x => {
        [-100, -20, 60, 140].forEach(z => {
            const fixture = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5 }));
            fixture.position.set(x, 56.5, z);
            scene.add(fixture);

            const pl = new THREE.PointLight(0xffffff, 150, 120);
            pl.position.set(x, 56, z);
            scene.add(pl);
        });
    });
}

function buildDoors() {
    const doorWidth = 40;
    const doorHeight = 20;

    const fontLoader = new FontLoader();
    fontLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_bold.typeface.json', (font) => {

        Object.values(PAGES).forEach(data => {
            const group = new THREE.Group();
            group.position.copy(data.position);
            group.userData = { id: data.id, pageData: data };

            // Casing
            const casing = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 4, 20, 0.5), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 }));
            casing.position.set(0, doorHeight + 10, 0.15);
            group.add(casing);

            // Banner needs to stick out past the vertical pillars (which sit at ~ -149 width 6 so they stick out to -146)
            const banner = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 2, 3, 0.8), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 }));
            // Offset banner forward to clear the structural girders
            banner.position.set(0, doorHeight + 1.5 + 0.2, 4.45);
            group.add(banner);

            // Text
            const textGeo = new TextGeometry(data.title.toUpperCase(), {
                font: font,
                size: 1.2,
                depth: 0.1
            });
            textGeo.computeBoundingBox();
            const textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
            const text = new THREE.Mesh(textGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
            text.position.set(-textWidth / 2, doorHeight + 1.1, 4.86); // Push text forward to stay on the banner
            group.add(text);

            // Door Mesh itself (this will move up)
            const doorGroup = new THREE.Group();
            doorGroup.position.set(0, doorHeight / 2, 0.05);

            let mat;
            if (data.doorImage) {
                const textureLoader = new THREE.TextureLoader();
                const doorTex = textureLoader.load(data.doorImage);
                // Adjust texture to fit properly (optional depending on image aspect)
                // doorTex.repeat.set(1, 1);
                mat = new THREE.MeshStandardMaterial({ 
                    map: doorTex, 
                    roughness: 0.5, 
                    metalness: 0.2 
                });
            } else {
                mat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.5, metalness: 0.2 });
            }

            const doorMesh = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth, doorHeight), mat);
            doorMesh.castShadow = true;
            doorGroup.add(doorMesh);

            // Roll mechanism
            const roll = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, doorWidth, 16), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 }));
            roll.position.set(0, doorHeight / 2, -0.5);
            roll.rotation.x = Math.PI / 2;
            roll.rotation.z = Math.PI / 2;
            doorGroup.add(roll);

            group.add(doorGroup);

            // Glow Light
            const glow = new THREE.PointLight(data.color, 0, 20); // Intensity 0 initially
            glow.position.set(0, doorHeight / 2, 2);
            group.add(glow);

            // References
            group.userData.doorGroup = doorGroup;
            group.userData.doorMesh = doorMesh;
            group.userData.glow = glow;
            group.userData.banner = banner;
            group.userData.baseY = doorHeight / 2;
            group.userData.open = false; // Add state tracker

            scene.add(group);
            doors.push(group);
        });
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Attempt to resize reflector
    scene.children.forEach(c => {
        if (c.type === 'Reflector' && c.getRenderTarget) {
            const rt = c.getRenderTarget();
            rt.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);
        }
    });
}

function onPointerMove(event) {
    if (selectedPage) return; // Disable hover if locked into a page

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Intersect the main door groups
    let found = null;
    let intersects = [];

    // Check meshes inside door groups
    doors.forEach(door => {
        const hits = raycaster.intersectObject(door, true);
        if (hits.length > 0) {
            found = door;
        }
    });

    if (found !== hoveredDoor) {
        // Reset old
        if (hoveredDoor) {
            hoveredDoor.userData.glow.intensity = 0;
            hoveredDoor.userData.doorMesh.material.emissive.setHex(0x000000);
            hoveredDoor.userData.banner.material.color.setHex(0x1e293b);
            document.body.style.cursor = 'default';
        }
        hoveredDoor = found;
        // Apply new
        if (hoveredDoor) {
            const data = hoveredDoor.userData.pageData;
            hoveredDoor.userData.glow.intensity = 50; // New Three.js intensity system requires higher numbers
            hoveredDoor.userData.doorMesh.material.emissive.setHex(data.color);
            hoveredDoor.userData.doorMesh.material.emissiveIntensity = 0.2;
            hoveredDoor.userData.banner.material.color.setHex(data.color);
            document.body.style.cursor = 'pointer';

            // Show UI
            hoverTitle.innerText = data.title;
            hoverDesc.innerText = data.description;
            hoverInfo.style.opacity = '1';
        } else {
            hoverInfo.style.opacity = '0';
        }
    }
}

function onClick(event) {
    if (hoveredDoor && !selectedPage && !hoveredDoor.userData.open) {
        const data = hoveredDoor.userData.pageData;
        selectedPage = data.id;

        hoverInfo.style.opacity = '0';
        uiOverlay.style.opacity = '0';
        controls.enabled = false;

        hoveredDoor.userData.open = true;

        // Animate door opening
        gsap.to(hoveredDoor.userData.doorGroup.position, {
            y: hoveredDoor.userData.baseY + 20, // move up by doorHeight
            duration: 2.5,
            ease: "power2.inOut",
            onComplete: () => {
                walkThrough(data);
            }
        });
    }
}

function walkThrough(data) {
    // Camera walk through
    const targetPos = new THREE.Vector3(data.position.x, 5.5, data.position.z - 10);
    const lookAtPos = new THREE.Vector3(data.position.x, 5.5, data.position.z - 40);

    // We can animate the camera position and a dummy object for lookAt
    const dummyLook = { x: controls.target.x, y: controls.target.y, z: controls.target.z };

    gsap.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => {
            camera.lookAt(dummyLook.x, dummyLook.y, dummyLook.z);
        }
    });

    gsap.to(dummyLook, {
        x: lookAtPos.x,
        y: lookAtPos.y,
        z: lookAtPos.z,
        duration: 2,
        ease: "power2.inOut",
        onComplete: () => {
            if (data.externalUrl) {
                window.location.href = data.externalUrl;
            } else {
                showPage(data);
            }
        }
    });

    // Add head bobbing effect using an onUpdate wrapper on an empty tween
    gsap.to({}, {
        duration: 2,
        onUpdate: function () {
            camera.position.y += Math.sin(this.progress() * Math.PI * 4) * 0.05;
        }
    });
}

function showPage(data) {
    pageContent.innerHTML = data.content;
    pagesContainer.classList.remove('hidden');

    // Add event listener dynamically to form if it exists
    const form = document.getElementById('booking-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            form.parentElement.innerHTML = `<div class="text-center py-20">
                <h2 class="text-3xl font-bold text-slate-900 mb-2">Request Sent!</h2>
                <p class="text-slate-600">We'll contact you within 24 hours to confirm your appointment.</p>
            </div>`;
        });
    }

    // Small delay to allow display block to apply before opacity transition
    requestAnimationFrame(() => {
        pagesContainer.style.opacity = '1';
    });
}

function onBackToHangar() {
    pagesContainer.style.opacity = '0';

    setTimeout(() => {
        pagesContainer.classList.add('hidden');
        pageContent.innerHTML = '';

        // Reset Camera
        const originPos = { x: 0, y: 5.5, z: 180 }; // Push the reset view back even further
        const originLook = { x: 0, y: 5.5, z: -150 }; // Look all the way back into the hangar at reset
        const dummyLook = { ...originLook }; // Starting point doesn't matter much as we will animate it

        // Actually look from current to origin over time
        gsap.to(camera.position, {
            ...originPos,
            duration: 1.5,
            ease: "power2.out",
            onUpdate: () => {
                camera.lookAt(controls.target);
            }
        });

        gsap.to(controls.target, {
            ...originLook,
            duration: 1.5,
            ease: "power2.out",
            onComplete: () => {
                controls.enabled = true;
                selectedPage = null;
                uiOverlay.style.opacity = '1';

                // Close doors
                doors.forEach(d => {
                    if (d.userData.open) {
                        d.userData.open = false;
                        gsap.to(d.userData.doorGroup.position, {
                            y: d.userData.baseY,
                            duration: 1.5,
                            ease: "bounce.out"
                        });
                    }
                });
            }
        });

    }, 500); // Wait for fade out
}

function animate() {
    requestAnimationFrame(animate);

    // Hover door bobbing / mechanical subtle effect
    doors.forEach(door => {
        if (hoveredDoor === door && !door.userData.open) {
            // Very subtle vibration/bobbing or we could let it sit still. React code had no active movement, only door rolling up.
        }
    });

    if (controls.enabled) {
        controls.update();
        
        // Hangar Boundary Constraints
        // Side walls: -200 to 200, Back wall: -150, Front: 250, Ceiling: 58, Floor: -2
        const margin = 10;
        camera.position.x = Math.max(-200 + margin, Math.min(200 - margin, camera.position.x));
        camera.position.z = Math.max(-150 + margin, Math.min(250 - margin, camera.position.z));
        camera.position.y = Math.max(-2 + 2, Math.min(58 - margin, camera.position.y));
    }
    renderer.render(scene, camera);
}
