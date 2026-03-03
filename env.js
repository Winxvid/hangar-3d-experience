function buildEnvironment() {
    // Floor Reflector (simulating the glossy reflection)
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
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
    // This sits slightly above the reflector to give it a solid color but let the reflection peak through
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

    // Back Wall
    const wallGeo = new THREE.PlaneGeometry(200, 40);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 18, -40);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side Walls & Pillars
    [-100, 100].forEach(x => {
        const sideWall = new THREE.Mesh(wallGeo, wallMat);
        sideWall.position.set(x, 18, 0);
        sideWall.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
        scene.add(sideWall);

        [-80, -60, -40, -20, 0, 20, 40, 60, 80].forEach(z => {
            const pillarGeo = new THREE.BoxGeometry(2, 40, 2);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.2 });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(x + (x > 0 ? -1 : 1), 18, z);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            scene.add(pillar);
        });
    });

    // Ceiling Plane
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 38;
    scene.add(ceiling);

    // Structural Pillars (Yellow Striped) placed next to walls
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

    [-95, 95].forEach(x => { // Moved outward next to the walls rather than floating mid-room
        [-30, -15, 0, 15, 30].forEach(z => {
            const group = new THREE.Group();
            group.position.set(x, 3, z);

            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            pillar.castShadow = true;
            pillar.receiveShadow = true;

            const stripePlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0xfbbf24, map: stripeTex }));
            // Make the stripes face towards the center of the hangar
            stripePlane.position.set(x > 0 ? -0.51 : 0.51, -4, 0);
            stripePlane.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;

            group.add(pillar, stripePlane);
            scene.add(group);
        });
    });
}

function buildLights() {
    // Professional Studio Lighting
