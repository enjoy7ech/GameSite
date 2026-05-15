import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { state } from './state.js';
import { PADDLE_RADIUS, PADDLE_THICKNESS, TABLE_HEIGHT, PADDLE_CONFIG } from './constants.js';

export function initPaddles() {
    state.playerPaddle = {
        mesh: null,
        body: null
    };

    // 1. Create Physics Body (Kinematic)
    // Kinematic means we control its position/velocity directly (e.g. via mouse),
    // and it pushes other objects (like the ball) but isn't pushed by them.
    const paddleMaterial = new CANNON.Material('paddle');
    
    // Ball vs Paddle: Configurable in constants (for shop system upgrades)
    state.world.addContactMaterial(new CANNON.ContactMaterial(
        state.physMaterial.ball, paddleMaterial, { 
            friction: PADDLE_CONFIG.physics.friction, 
            restitution: PADDLE_CONFIG.physics.restitution 
        }
    ));

    // We use a CANNON.Box instead of CANNON.Cylinder for the paddle!
    // Why? Because Cannon.js implements Cylinder as a ConvexPolyhedron, and ConvexPolyhedron vs Sphere 
    // collision detection is notoriously unstable for very thin objects.
    // Box vs Sphere is bulletproof.
    // VERY IMPORTANT: physicsThickness is set to 0.1 (10cm) instead of 0.01.
    // Because the paddle swings forward at extremely high speeds (0.24m per frame), a thin box will completely
    // teleport past the ball between frames (Tunneling). A thick box ensures it catches the ball.
    const paddleShape = new CANNON.Box(new CANNON.Vec3(PADDLE_RADIUS, PADDLE_RADIUS, PADDLE_THICKNESS / 2));
    const paddleBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        material: paddleMaterial,
        collisionFilterGroup: 2,
        collisionFilterMask: 0 // DISABLE NATIVE COLLISIONS! We use custom distance checking now.
    });
    paddleBody.addShape(paddleShape);
    
    // Initial position: Floating slightly above and behind the table on player side
    paddleBody.position.set(0, TABLE_HEIGHT + 0.4, PADDLE_CONFIG.basePosition.z);
    state.world.addBody(paddleBody);
    
    state.playerPaddle.body = paddleBody;

    // --- AI PADDLE PHYSICS BODY ---
    state.opponentPaddle = { body: null, mesh: null };
    const aiPaddleBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        material: paddleMaterial,
        collisionFilterGroup: 2,
        collisionFilterMask: 0 // DISABLE NATIVE COLLISIONS
    });
    aiPaddleBody.addShape(paddleShape);
    aiPaddleBody.position.set(0, TABLE_HEIGHT + 0.4, -PADDLE_CONFIG.basePosition.z);
    state.world.addBody(aiPaddleBody);
    state.opponentPaddle.body = aiPaddleBody;

    // --- Mouse Controls & Interaction State ---
    state.paddleControl = {
        targetX: 0,
        targetY: TABLE_HEIGHT + 0.2,
        targetZ: PADDLE_CONFIG.basePosition.z,
        currentPitch: 0,
        currentYaw: 0,
        currentRoll: 0,
        swingVelocity: 0,
        lastTime: performance.now()
    };

    // Use a vertical plane at the paddle's fixed base Z position.
    const playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PADDLE_CONFIG.basePosition.z);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Track mouse clicks for manual Pitch (tilt) control
    state.paddleControl.isLeftDown = false;
    state.paddleControl.isRightDown = false;
    
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0) state.paddleControl.isLeftDown = true;
        if (e.button === 2) state.paddleControl.isRightDown = true;
    });
    
    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) state.paddleControl.isLeftDown = false;
        if (e.button === 2) state.paddleControl.isRightDown = false;
    });
    
    // Prevent default right-click menu so we can use it for gameplay
    window.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('mousemove', (event) => {
        // Convert mouse position to normalized device coordinates (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (state.camera && state.playerPaddle.body) {
            raycaster.setFromCamera(mouse, state.camera);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(playPlane, intersectPoint);
            
            if (intersectPoint) {
                state.paddleControl.targetX = intersectPoint.x;
                state.paddleControl.targetY = intersectPoint.y; 
                
                // 简化交互：去除鼠标上滑的向前突进逻辑
                const now = performance.now();
                state.paddleControl.lastMouseY = event.clientY;
                state.paddleControl.lastTime = now;
            }
        }
    });

    // 2. Load Visual Model
    const loader = new GLTFLoader();
    loader.load(
        './assets/models/球拍.glb',
        (gltf) => {
            const model = gltf.scene;
            
            // 1. Auto-Scale the model to realistic ping pong paddle dimensions (approx 25cm total length)
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetLength = 0.25; // 25cm
            const scale = targetLength / maxDim;
            model.scale.set(scale, scale, scale);
            
            // 2. Auto-Center the model so its origin matches the physics body
            const boxScaled = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            boxScaled.getCenter(center);
            model.position.sub(center);
            
            // 3. We need a hierarchy to rotate the centered model
            const centeredWrapper = new THREE.Group();
            centeredWrapper.add(model);
            
            // Apply the manual configuration offset to perfectly align the visual rubber with the physics cylinder
            centeredWrapper.position.set(
                PADDLE_CONFIG.cosmetics.modelOffset.x,
                PADDLE_CONFIG.cosmetics.modelOffset.y,
                PADDLE_CONFIG.cosmetics.modelOffset.z
            );
            
            // Stand the paddle up vertically (it was lying flat)
            centeredWrapper.rotation.x = -Math.PI / 2;
            
            // 4. Main wrapper that syncs with physics
            const wrapper = new THREE.Group();
            wrapper.add(centeredWrapper);
            
            // Keep references to rubber materials for future skin changes
            state.playerPaddle.materials = {
                forehand: null,
                backhand: null
            };

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material) {
                        const mat = child.material;
                        // Heuristic detection based on default colors
                        // If it's predominantly red -> Forehand rubber
                        if (mat.color.r > 0.5 && mat.color.g < 0.3 && mat.color.b < 0.3) {
                            mat.color.setHex(PADDLE_CONFIG.cosmetics.forehandColor);
                            state.playerPaddle.materials.forehand = mat;
                        }
                        // If it's predominantly dark/black -> Backhand rubber
                        else if (mat.color.r < 0.2 && mat.color.g < 0.2 && mat.color.b < 0.2) {
                            mat.color.setHex(PADDLE_CONFIG.cosmetics.backhandColor);
                            state.playerPaddle.materials.backhand = mat;
                        }
                    }
                }
            });
            
            state.scene.add(wrapper);
            state.playerPaddle.mesh = wrapper;

            // --- AI PADDLE VISUAL MESH ---
            // Clone the wrapper for the AI opponent
            const aiWrapper = wrapper.clone();
            
            // Flip colors for AI (Black on forehand, Red on backhand)
            aiWrapper.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (child.material.color.getHex() === PADDLE_CONFIG.cosmetics.forehandColor) {
                        child.material = child.material.clone();
                        child.material.color.setHex(PADDLE_CONFIG.cosmetics.backhandColor);
                    } else if (child.material.color.getHex() === PADDLE_CONFIG.cosmetics.backhandColor) {
                        child.material = child.material.clone();
                        child.material.color.setHex(PADDLE_CONFIG.cosmetics.forehandColor);
                    }
                }
            });
            
            // Face the AI paddle towards the player
            aiWrapper.rotation.y = Math.PI;
            
            state.scene.add(aiWrapper);
            state.opponentPaddle.mesh = aiWrapper;
        },
        undefined,
        (error) => console.error('Error loading paddle model:', error)
    );
}

export function updatePaddles() {
    if (!state.playerPaddle || !state.playerPaddle.body) return;
    
    // Very important: Set velocity so Cannon.js knows how hard the paddle is hitting the ball!
    const dt = 1 / 60; // Assuming ~60fps
    
    updatePlayerPaddle(dt);
    updateAIPaddle(dt);
}

function updatePlayerPaddle(dt) {
    const ctrl = state.paddleControl;
    const body = state.playerPaddle.body;

    // 1. 简化交互：去掉向前突进的击球动作，Z轴固定在底线
    const restingZ = PADDLE_CONFIG.basePosition.z;
    ctrl.targetZ = restingZ;

    // 2. Smooth Position Interpolation & Velocity Calculation
    const nextX = body.position.x + (ctrl.targetX - body.position.x) * 0.3;
    const nextY = body.position.y + (ctrl.targetY - body.position.y) * 0.3;
    const nextZ = body.position.z + (ctrl.targetZ - body.position.z) * 0.4; // Reverted back to 0.4 (fast physical tracking)

    // Very important: Set velocity so Cannon.js knows how hard the paddle is hitting the ball!
    const vx = (nextX - body.position.x) / dt;
    const vy = (nextY - body.position.y) / dt;
    const vz = (nextZ - body.position.z) / dt;
    
    // Safety clamp: Prevent instantaneous mouse teleportation from creating infinite velocity
    body.velocity.set(vx, vy, vz);
    const maxVelocity = 15.0; // 15 m/s is a very fast pro smash
    if (body.velocity.length() > maxVelocity) {
        body.velocity.normalize();
        body.velocity.scale(maxVelocity, body.velocity);
    }

    // DONT teleport position directly, let the physics engine move the kinematic body via velocity!
    // body.position.set(nextX, nextY, nextZ);

    // 3. Dynamic Angles Calculation
    // A. Pitch (Vertical Angle) is now strictly controlled by mouse clicks
    // Left click = tilt backward (for slices/backspin - 挑球)
    // Right click = tilt forward (for smashes/topspin - 下压)
    // No click = perfectly straight (0 degrees)
    let targetPitch = 0;
    if (ctrl.isLeftDown) {
        targetPitch = -PADDLE_CONFIG.pitch.maxAngle; // 左键挑球 (后仰)
    } else if (ctrl.isRightDown) {
        targetPitch = PADDLE_CONFIG.pitch.maxAngle; // 右键下压 (前倾)
    }

    // B. Yaw (Horizontal Angle) for Forehand vs Backhand
    let targetYaw = 0;
    if (body.position.x > 0.05) {
        // Right side: Forehand
        targetYaw = -Math.PI / 16; 
    } else if (body.position.x < -0.05) {
        // Left side: Backhand (Paddle flipped 180 degrees)
        targetYaw = Math.PI + Math.PI / 16;
    } else {
        targetYaw = ctrl.currentYaw; 
    }

    // C. Roll (Z-axis Angle) for Handle pointing towards center
    const targetRoll = -Math.min(PADDLE_CONFIG.roll.maxAngle, Math.abs(body.position.x) * PADDLE_CONFIG.roll.intensity);

    // Smooth angle interpolation
    ctrl.currentPitch += (targetPitch - ctrl.currentPitch) * 0.2;
    ctrl.currentRoll += (targetRoll - (ctrl.currentRoll || 0)) * 0.2;
    
    // Handle Yaw wrap-around for smooth flipping
    let diffYaw = targetYaw - ctrl.currentYaw;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    ctrl.currentYaw += diffYaw * 0.15;

    // 4. Apply Rotations to Physics Body
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(ctrl.currentPitch, ctrl.currentYaw, ctrl.currentRoll, 'XYZ');
    body.quaternion.copy(quat);

    // 5. Sync Visual Mesh
    if (state.playerPaddle.mesh) {
        state.playerPaddle.mesh.position.copy(body.position);
        state.playerPaddle.mesh.quaternion.copy(body.quaternion);
    }
}

function updateAIPaddle(dt) {
    if (!state.opponentPaddle || !state.opponentPaddle.body || !state.ball || !state.ball.body) return;
    
    const aiPaddle = state.opponentPaddle;
    const aiBody = aiPaddle.body;
    const ballBody = state.ball.body;
    
    // 1. AI Positioning Logic
    const baseX = 0;
    const baseY = TABLE_HEIGHT + 0.2;
    const baseZ = -PADDLE_CONFIG.basePosition.z; // Opposite side of the table
    
    let targetX = baseX;
    let targetY = baseY;
    let targetZ = baseZ;
    
    // Default AI Difficulty parameters
    const aiSpeedMultiplier = 4.0;
    const swingDistance = -0.5; // Z distance where AI starts swinging
    
    // Only track if ball is moving towards AI (z velocity < 0) and is on AI's half (z < 0.5)
    if (ballBody.velocity.z < 0 && ballBody.position.z < 1.0) {
        // Track the ball's X position with a slight delay/smoothness
        targetX = ballBody.position.x;
        // Track the ball's height, but don't go below table
        targetY = Math.max(TABLE_HEIGHT + 0.1, ballBody.position.y);
        
        // If ball gets close, swing forward!
        if (ballBody.position.z < swingDistance) {
            targetZ = -0.5; // Push towards the net
        }
    }
    
    // 2. Smooth Movement Integration
    aiBody.position.x += (targetX - aiBody.position.x) * aiSpeedMultiplier * dt;
    aiBody.position.y += (targetY - aiBody.position.y) * aiSpeedMultiplier * dt;
    aiBody.position.z += (targetZ - aiBody.position.z) * (aiSpeedMultiplier * 2.0) * dt;
    
    // 3. Simple AI Rotation (Pitch and Yaw)
    // Pitch slightly forward when swinging
    let targetPitch = 0;
    if (targetZ === -0.5) targetPitch = Math.PI / 6; // Tilt forward 30 degrees
    
    // Yaw towards the center to keep ball on table
    let targetYaw = aiBody.position.x * 0.2;
    
    // Set quaternion directly (Instant snap for AI is fine and avoids slerp version issues)
    aiBody.quaternion.setFromEuler(targetPitch, targetYaw, 0, 'YXZ');
    
    // Sync Visuals (Only if the async GLTF model has finished loading)
    if (aiPaddle.mesh) {
        aiPaddle.mesh.position.copy(aiBody.position);
        aiPaddle.mesh.quaternion.copy(aiBody.quaternion);
    }
}
