window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('chess-canvas');
    const container = document.getElementById('canvas-container');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('reset-btn');

    const game = new ChessGame();

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16213e);
    scene.fog = new THREE.Fog(0x16213e, 25, 55);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 15, 13);
    camera.lookAt(0, 0, 0);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 7;
    controls.maxDistance = 28;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const sun = new THREE.DirectionalLight(0xfff5e0, 0.9);
    sun.position.set(6, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -8;
    sun.shadow.camera.right = sun.shadow.camera.top = 8;
    scene.add(sun);

    scene.add(Object.assign(new THREE.DirectionalLight(0x8899cc, 0.3), { position: new THREE.Vector3(-6, 4, -6) }));

    // --- Materials ---
    const mats = {
        light: () => new THREE.MeshLambertMaterial({ color: 0xf0d9b5 }),
        dark:  () => new THREE.MeshLambertMaterial({ color: 0xb58863 }),
        border: new THREE.MeshLambertMaterial({ color: 0x7a4a1e }),
        whitePiece: new THREE.MeshPhongMaterial({ color: 0xf2eedc, shininess: 90, specular: 0x999999 }),
        blackPiece: new THREE.MeshPhongMaterial({ color: 0x1e1e2e, shininess: 90, specular: 0x334466 }),
    };

    // --- Board ---
    const borderGeo = new THREE.BoxGeometry(9.4, 0.22, 9.4);
    const borderMesh = new THREE.Mesh(borderGeo, mats.border);
    borderMesh.position.y = -0.12;
    borderMesh.receiveShadow = true;
    scene.add(borderMesh);

    // Underside glow plane
    const glowGeo = new THREE.PlaneGeometry(11, 11);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x0a0a1a });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.25;
    scene.add(glow);

    const squareMeshes = new Array(64);
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const idx = row * 8 + col;
            const isLight = (row + col) % 2 === 0;
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.12, 1),
                isLight ? mats.light() : mats.dark()
            );
            mesh.position.set(col - 3.5, 0, row - 3.5);
            mesh.receiveShadow = true;
            mesh.userData = { squareIndex: idx, isLight };
            scene.add(mesh);
            squareMeshes[idx] = mesh;
        }
    }

    // --- Piece geometry builders ---
    function cyl(rTop, rBot, h, seg = 12) { return new THREE.CylinderGeometry(rTop, rBot, h, seg); }
    function sph(r, seg = 10) { return new THREE.SphereGeometry(r, seg, seg); }
    function box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
    function cone(r, h, seg = 8) { return new THREE.ConeGeometry(r, h, seg); }

    function addPart(group, geo, y, mat, extraProps) {
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y;
        if (extraProps) Object.assign(m.position, extraProps.pos || {});
        if (extraProps && extraProps.rot) Object.assign(m.rotation, extraProps.rot);
        m.castShadow = true;
        group.add(m);
        return m;
    }

    function buildPiece(type, mat) {
        const g = new THREE.Group();
        switch (type) {
            case PIECES.PAWN:
                addPart(g, cyl(0.28, 0.36, 0.11), 0.055, mat);
                addPart(g, cyl(0.16, 0.24, 0.38), 0.30, mat);
                addPart(g, sph(0.20), 0.64, mat);
                break;
            case PIECES.ROOK:
                addPart(g, cyl(0.30, 0.38, 0.11), 0.055, mat);
                addPart(g, cyl(0.23, 0.28, 0.62), 0.42, mat);
                addPart(g, cyl(0.29, 0.24, 0.14), 0.80, mat);
                // battlements
                for (let i = 0; i < 4; i++) {
                    const bm = new THREE.Mesh(box(0.10, 0.14, 0.10), mat);
                    bm.position.set(Math.cos(i * Math.PI / 2) * 0.18, 0.93, Math.sin(i * Math.PI / 2) * 0.18);
                    bm.castShadow = true;
                    g.add(bm);
                }
                break;
            case PIECES.KNIGHT: {
                addPart(g, cyl(0.29, 0.37, 0.11), 0.055, mat);
                addPart(g, cyl(0.14, 0.25, 0.46), 0.38, mat);
                const head = new THREE.Mesh(box(0.26, 0.42, 0.30), mat);
                head.position.set(0.06, 0.84, 0);
                head.rotation.z = -0.18;
                head.castShadow = true;
                g.add(head);
                const snout = new THREE.Mesh(box(0.14, 0.14, 0.22), mat);
                snout.position.set(0.13, 0.68, 0);
                snout.castShadow = true;
                g.add(snout);
                break;
            }
            case PIECES.BISHOP:
                addPart(g, cyl(0.28, 0.36, 0.11), 0.055, mat);
                addPart(g, cyl(0.11, 0.26, 0.78), 0.50, mat);
                addPart(g, sph(0.14), 0.98, mat);
                addPart(g, cone(0.07, 0.20), 1.18, mat);
                break;
            case PIECES.QUEEN:
                addPart(g, cyl(0.33, 0.40, 0.11), 0.055, mat);
                addPart(g, cyl(0.13, 0.29, 0.86), 0.54, mat);
                addPart(g, sph(0.19), 1.04, mat);
                addPart(g, new THREE.TorusGeometry(0.17, 0.048, 8, 16), 1.25, mat);
                for (let i = 0; i < 5; i++) {
                    const sp = new THREE.Mesh(sph(0.06), mat);
                    const a = (i / 5) * Math.PI * 2;
                    sp.position.set(Math.cos(a) * 0.17, 1.36, Math.sin(a) * 0.17);
                    sp.castShadow = true;
                    g.add(sp);
                }
                break;
            case PIECES.KING:
                addPart(g, cyl(0.33, 0.40, 0.11), 0.055, mat);
                addPart(g, cyl(0.15, 0.29, 0.96), 0.59, mat);
                addPart(g, sph(0.18), 1.13, mat);
                addPart(g, cyl(0.22, 0.22, 0.14), 1.29, mat);
                // cross
                addPart(g, box(0.26, 0.07, 0.07), 1.47, mat);
                addPart(g, box(0.07, 0.22, 0.07), 1.51, mat);
                break;
        }
        return g;
    }

    // --- Piece mesh management ---
    const pieceMeshes = new Array(64).fill(null);

    function placePieces() {
        pieceMeshes.forEach(m => { if (m) scene.remove(m); });
        pieceMeshes.fill(null);
        for (let i = 0; i < 64; i++) {
            const piece = game.board[i];
            if (!piece) continue;
            const mat = (piece.color === COLORS.WHITE ? mats.whitePiece : mats.blackPiece).clone();
            const group = buildPiece(piece.type, mat);
            group.traverse(child => {
                if (child.isMesh) child.userData = { squareIndex: i };
            });
            group.userData = { squareIndex: i };
            const { row, col } = game.indexToRowCol(i);
            group.position.set(col - 3.5, 0.06, row - 3.5);
            scene.add(group);
            pieceMeshes[i] = group;
        }
    }

    function updateHighlights() {
        const checkKingIdx = game.isInCheck(game.turn)
            ? game.board.findIndex(p => p && p.type === PIECES.KING && p.color === game.turn)
            : -1;

        for (let i = 0; i < 64; i++) {
            const mesh = squareMeshes[i];
            const isLight = mesh.userData.isLight;
            if (i === game.selectedSquare) {
                mesh.material.color.setHex(0x5ebd6e);
            } else if (game.validMoves.includes(i)) {
                mesh.material.color.setHex(0xe8d44d);
            } else if (i === checkKingIdx) {
                mesh.material.color.setHex(0xcc3333);
            } else {
                mesh.material.color.setHex(isLight ? 0xf0d9b5 : 0xb58863);
            }
        }

        // Elevate selected piece
        for (let i = 0; i < 64; i++) {
            if (pieceMeshes[i]) {
                const { col, row } = game.indexToRowCol(i);
                pieceMeshes[i].position.set(col - 3.5, i === game.selectedSquare ? 0.35 : 0.06, row - 3.5);
            }
        }
    }

    function updateStatus() {
        if (game.gameOver) {
            statusEl.textContent = game.winner
                ? `${cap(game.winner)} wins! ♚`
                : 'Stalemate — Draw';
            statusEl.className = 'game-over';
        } else if (game.isInCheck(game.turn)) {
            statusEl.textContent = `${cap(game.turn)} is in Check!`;
            statusEl.className = 'check';
        } else {
            statusEl.textContent = `${cap(game.turn)}'s Turn`;
            statusEl.className = game.turn === COLORS.WHITE ? 'white-turn' : 'black-turn';
        }
    }

    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    // --- Input ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragStart = new THREE.Vector2();

    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => { if (e.button === 0) dragStart.set(e.clientX, e.clientY); });

    canvas.addEventListener('click', e => {
        if (game.gameOver) return;
        if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 6) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const targets = [...squareMeshes];
        pieceMeshes.forEach(g => g && g.traverse(c => { if (c.isMesh) targets.push(c); }));

        const hits = raycaster.intersectObjects(targets, false);
        if (!hits.length) {
            if (game.selectedSquare !== null) {
                game.selectedSquare = null;
                game.validMoves = [];
                updateHighlights();
            }
            return;
        }

        const squareIndex = hits[0].object.userData.squareIndex;
        if (squareIndex === undefined) return;

        const result = game.selectSquare(squareIndex);
        if (result.type === 'moved') placePieces();
        updateHighlights();
        updateStatus();
    });

    resetBtn.addEventListener('click', () => {
        game.reset();
        placePieces();
        updateHighlights();
        updateStatus();
    });

    // --- Resize ---
    function resize() {
        const w = container.clientWidth, h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    // --- Init & Loop ---
    placePieces();
    updateHighlights();
    updateStatus();

    (function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    })();
});
