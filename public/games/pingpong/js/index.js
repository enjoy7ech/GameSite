import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { state } from './state.js';
import { TABLE_HEIGHT, RENDER_CONFIG, PADDLE_RADIUS, PADDLE_THICKNESS, BALL_CONFIG } from './constants.js';
import { initPhysics } from './physics.js';
import { buildEnvironment } from './environment.js';
import { initPaddles, updatePaddles } from './paddle.js';
import { initBall, updateBall } from './ball.js';

function init() {
    // 1. Scene setup
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x020205);
    state.scene.fog = new THREE.Fog(0x020205, 5, 30);

    // 2. Camera setup
    state.camera = new THREE.PerspectiveCamera(RENDER_CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(
        RENDER_CONFIG.camera.position.x, 
        RENDER_CONFIG.camera.position.y, 
        RENDER_CONFIG.camera.position.z
    ); 
    state.camera.lookAt(0, RENDER_CONFIG.camera.lookAtY, 0);

    // 3. Renderer setup
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.outputEncoding = THREE.sRGBEncoding;
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(state.renderer.domElement);

    // 3.5 Post-Processing (Bloom)
    const renderScene = new RenderPass(state.scene, state.camera);
    if (RENDER_CONFIG.bloom.enabled) {
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight), 
            RENDER_CONFIG.bloom.strength, 
            RENDER_CONFIG.bloom.radius, 
            RENDER_CONFIG.bloom.threshold
        );
        state.composer = new EffectComposer(state.renderer);
        state.composer.addPass(renderScene);
        state.composer.addPass(bloomPass);
    } else {
        state.composer = null;
    }

    // 4. Controls (OrbitControls removed for paddle tracking)

    // 5. Lighting (Moved to environment.js)

    // 6. Physics
    initPhysics();

    // 7. Environment Building
    buildEnvironment();

    // 7.5 Load Paddles & Ball
    initPaddles();
    initBall();

    // 7.8 Physics Debug Wireframes
    initPhysicsDebug();

    // 8. Event Listeners
    window.addEventListener('resize', onWindowResize);
    
    // Serve logic: Press Spacebar to toss the ball (Only if it's player's turn)
    window.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && state.game && state.game.isServing && state.game.server === 'player' && state.ball) {
            state.game.isServing = false;
            // Toss the ball up using the configured velocity
            state.ball.body.velocity.set(0, BALL_CONFIG.serve.tossVelocity, 0);
            
            // Hide the controls hint
            const hint = document.getElementById('controls-hint');
            if (hint) hint.style.opacity = '0';
        }
    });
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 500);
    }, 1000);

    animate();
}

function initPhysicsDebug() {
    if (!RENDER_CONFIG.debugPhysics) return;

    const debugGroup = new THREE.Group();
    
    // Green wireframe for Table
    const tableMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, depthTest: false, transparent: true, opacity: 0.8 });
    if (state.physicsBodies && state.physicsBodies.tableBody) {
        const body = state.physicsBodies.tableBody;
        const shape = body.shapes[0];
        const geo = new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2);
        const mesh = new THREE.Mesh(geo, tableMat);
        mesh.position.copy(body.position);
        debugGroup.add(mesh);
    }

    // Red wireframe for Net
    const netMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, depthTest: false, transparent: true, opacity: 0.8 });
    if (state.physicsBodies && state.physicsBodies.netBody) {
        const body = state.physicsBodies.netBody;
        const shape = body.shapes[0];
        const geo = new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2);
        const mesh = new THREE.Mesh(geo, netMat);
        mesh.position.copy(body.position);
        debugGroup.add(mesh);
    }

    // Blue wireframe for Paddle (Dynamic)
    const paddleMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true, depthTest: false, transparent: true, opacity: 0.8 });
    if (state.playerPaddle && state.playerPaddle.body) {
        const body = state.playerPaddle.body;
        const shape = body.shapes[0]; 
        
        let geo;
        if (shape instanceof CANNON.Box) {
            geo = new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2);
        } else if (shape instanceof CANNON.ConvexPolyhedron || shape.vertices) {
            // Build geometry directly from Cannon.js vertices and faces to guarantee 100% exact match
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            
            for (let i = 0; i < shape.vertices.length; i++) {
                const v = shape.vertices[i];
                vertices.push(v.x, v.y, v.z);
            }
            
            for (let i = 0; i < shape.faces.length; i++) {
                const face = shape.faces[i];
                // Triangulate the polygon face
                for (let j = 1; j < face.length - 1; j++) {
                    indices.push(face[0], face[j], face[j + 1]);
                }
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            geo = geometry;
        } else {
            geo = new THREE.BoxGeometry(0.1, 0.1, 0.1); // Fallback
        }
        
        const mesh = new THREE.Mesh(geo, paddleMat);
        state.debugPaddleMesh = mesh; // Save reference to update it every frame
        debugGroup.add(mesh);
    }

    // White wireframe for Ball (Dynamic)
    const ballMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, depthTest: false, transparent: true, opacity: 0.8 });
    if (state.ball && state.ball.body) {
        const body = state.ball.body;
        const shape = body.shapes[0];
        let geo;
        if (shape instanceof CANNON.Sphere) {
            geo = new THREE.SphereGeometry(shape.radius, 16, 16);
        } else {
            geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        }
        const mesh = new THREE.Mesh(geo, ballMat);
        state.debugBallMesh = mesh; // Save reference
        debugGroup.add(mesh);
    }

    state.scene.add(debugGroup);
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    if (state.composer) {
        state.composer.setSize(window.innerWidth, window.innerHeight);
    }
}

let lastRenderTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    
    const now = performance.now();
    const dt = (now - lastRenderTime) / 1000;
    lastRenderTime = now;
    
    // Step physics world with sub-stepping for high-speed collision stability
    if (state.world) {
        // Run internal physics integration at 120Hz (1/120s) instead of 60Hz.
        state.world.step(1 / 120, dt, 10);
    }
    
    // Update Game Objects
    updatePaddles();
    updateBall();
    updateCamera(dt);
    
    // Sync paddle debug wireframe
    if (state.debugPaddleMesh && state.playerPaddle && state.playerPaddle.body) {
        state.debugPaddleMesh.position.copy(state.playerPaddle.body.position);
        state.debugPaddleMesh.quaternion.copy(state.playerPaddle.body.quaternion);
    }

    // Sync ball debug wireframe
    if (state.debugBallMesh && state.ball && state.ball.body) {
        state.debugBallMesh.position.copy(state.ball.body.position);
        state.debugBallMesh.quaternion.copy(state.ball.body.quaternion);
    }

    if (state.composer) {
        state.composer.render();
    } else {
        state.renderer.render(state.scene, state.camera);
    }
}

function updateCamera(dt) {
    // 简化交互：固定视角，相机不再移动
    return;
}

init();
