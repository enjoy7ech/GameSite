import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { state } from './state.js';
import { HOOP_POS, GLB_SCALE, RING_RADIUS, BALL_RADIUS } from './constants.js';
import { initPhysics, createPhysicalRing, createNet } from './physics.js';
import { loadAssets } from './assets.js';
import { toggleMenu, updateBuffUI, updateSidePunishUI, updateRewardUI } from './ui.js';
import { spawnNewBall, throwBall, checkGoals, startTimer, updateNet, startGame, startRush, restartGame, quitGame } from './game.js';

// 将按钮函数挂载到全局 window，供 HTML onclick 调用
window.startGame = startGame;
window.startRush = startRush;
window.restartGame = restartGame;
window.quitGame = quitGame;
window.toggleMenu = toggleMenu;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false, dragStart = { x: 0, y: 0 };
let bgm, remain30Audio; // 音频对象

function init() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x050510);

    state.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(0, 4, 10);

    state.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 开启软阴影
    state.renderer.outputEncoding = THREE.sRGBEncoding;
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 0.35; // 还原曝光
    document.body.appendChild(state.renderer.domElement);

    // 配置 OrbitControls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true; state.controls.dampingFactor = 0.05;
    state.controls.minDistance = 3; state.controls.maxDistance = 60;
    state.controls.minPolarAngle = 0;
    state.controls.maxPolarAngle = Math.PI;
    state.controls.enablePan = false;

    state.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
    };

    // 锁定偏航角（Yaw）
    const initialTheta = state.controls.getAzimuthalAngle();
    state.controls.minAzimuthAngle = initialTheta;
    state.controls.maxAzimuthAngle = initialTheta;

    // --- 追踪用户操作，防止自动视角补间争抢视角控制权 ---
    state.controls.addEventListener('start', () => {
        state.isCameraAnimating = false;
        state.isUserInteracting = true;

        // 点击/触摸改为只能调整俯仰角：在交互开始时立即重新锁定当前的偏航角
        const lockTheta = state.controls.getAzimuthalAngle();
        state.controls.minAzimuthAngle = lockTheta;
        state.controls.maxAzimuthAngle = lockTheta;
    });
    state.controls.addEventListener('end', () => {
        state.isUserInteracting = false;
    });

    // --- 环境与反射增强 ---
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111111, 0.2); 
    state.scene.add(hemiLight);

    const lightIntensity = 4.0; 
    const spreadX = 25;
    const createStadiumLight = (x, z) => {
        const spot = new THREE.SpotLight(0xffffff, lightIntensity);
        spot.position.set(x, 45, z);
        spot.target.position.set(0, 0, 10);
        spot.castShadow = true;
        spot.angle = Math.PI / 4;
        spot.penumbra = 0.8;
        spot.decay = 2;
        spot.distance = 250;
        spot.shadow.mapSize.set(512, 512);
        spot.shadow.bias = -0.0001;
        state.scene.add(spot);
        state.scene.add(spot.target);
    };
    createStadiumLight(spreadX, 40);
    createStadiumLight(-spreadX, 40);
    createStadiumLight(spreadX, -10);
    createStadiumLight(-spreadX, -10);

    initPhysics();

    state.floorBody = new CANNON.Body({ mass: 0, material: state.physMaterial });
    state.floorBody.addShape(new CANNON.Plane());
    state.floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    state.world.addBody(state.floorBody);

    // --- 重新设计瞄准系统：动力学引导弧 (Kinetic Arc) ---
    // 解决“看不到”和“太作弊”的问题：缩短引导线长度，增大元素体积
    
    // 1. 动力学点阵 (Kinetic Dots) - 只展示初始的一小段，不直接指向篮筐
    state.aimPathSegments = [];
    const dotGeo = new THREE.SphereGeometry(0.1, 16, 16); // 显著增大体积 (0.04 -> 0.1)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
    
    for(let i=0; i<12; i++) { // 缩短点数 (25 -> 12)，防止直接看到落点导致作弊感
        const dot = new THREE.Mesh(dotGeo, dotMat.clone());
        dot.visible = false;
        state.scene.add(dot);
        state.aimPathSegments.push(dot);
    }
    
    // 2. 移除落点准星 (防止直接“作弊”提示落点)
    state.aimMarker = new THREE.Group();
    state.scene.add(state.aimMarker);

    // 设置层级确保显示在最上方
    state.aimMarker.renderOrder = 1000;
    if (state.aimPathSegments) {
        state.aimPathSegments.forEach(seg => seg.renderOrder = 999);
    }



    state.renderer.domElement.addEventListener('mousedown', onDown);
    state.renderer.domElement.addEventListener('mouseup', onUp);
    state.renderer.domElement.addEventListener('mousemove', onMove);
    
    // --- 手机端触摸适配 ---
    window.addEventListener('touchstart', (e) => onDown(e.touches[0]), { passive: false });
    window.addEventListener('touchend', (e) => onUp(e.changedTouches[0]), { passive: false });
    window.addEventListener('touchmove', (e) => {
        onMove(e.touches[0]);
        e.preventDefault(); // 防止移动端滑动干扰
    }, { passive: false });

    window.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggleMenu();
        if (e.key.toLowerCase() === 'm') window.toggleManual();
    });
    window.addEventListener('resize', () => {
        state.camera.aspect = window.innerWidth / window.innerHeight;
        state.camera.updateProjectionMatrix(); state.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    updateBuffUI();
    loadAssets(() => {
        const boardW = GLB_SCALE * 1.8, boardH = GLB_SCALE * 1.05;
        state.boardBody = new CANNON.Body({ mass: 0, material: state.physMaterial });
        state.boardBody.addShape(new CANNON.Box(new CANNON.Vec3(boardW / 2, boardH / 2, 0.05)));
        state.boardBody.position.set(HOOP_POS.x, HOOP_POS.y + 1, HOOP_POS.z - 1.2);
        state.world.addBody(state.boardBody);

        const boardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(boardW, boardH, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.8 })
        );
        boardMesh.position.copy(state.boardBody.position);
        // state.scene.add(boardMesh); // 隐藏篮板视觉
        createPhysicalRing(HOOP_POS.y, HOOP_POS.z, RING_RADIUS);
        const rimMesh = new THREE.Mesh(
            new THREE.TorusGeometry(RING_RADIUS, 0.06, 16, 64),
            new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.2 })
        );
        rimMesh.rotation.x = Math.PI / 2; rimMesh.position.set(HOOP_POS.x, HOOP_POS.y, HOOP_POS.z);
        state.scene.add(rimMesh);
        createNet(0, HOOP_POS.y, HOOP_POS.z, RING_RADIUS);

        // --- 音频加载 ---
        const listener = new THREE.AudioListener();
        state.camera.add(listener);
        bgm = new THREE.Audio(listener);
        bgm.name = 'bgm'; // 给 BGM 命名以便识别
        state.bgm = bgm;  // 存入 state 以便全局调用
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('assets/audio/bgm.mp3', (buffer) => {
            bgm.setBuffer(buffer);
            bgm.setLoop(true);
            bgm.setVolume(0.08); // BGM 音量再次调低 50%
        });

        remain30Audio = new THREE.Audio(listener);
        audioLoader.load('assets/audio/remain30.mp3', (buffer) => {
            remain30Audio.setBuffer(buffer);
            remain30Audio.setVolume(0.8);
        });

        // 加载失败音效集
        state.failAudios = [];
        ['f_1', 'f_2', 'f_3', 'f_4'].forEach(name => {
            const audio = new THREE.Audio(listener);
            audioLoader.load(`assets/audio/fail/${name}.mp3`, (buffer) => {
                audio.setBuffer(buffer);
                audio.setVolume(0.4); // 降低失分音效默认音量
                state.failAudios.push(audio);
            });
        });

        // 加载成功类音效
        state.succAudios = [];
        ['s_1', 's_2', 's_3'].forEach(name => {
            const audio = new THREE.Audio(listener);
            audioLoader.load(`assets/audio/succ/${name}.mp3`, (buffer) => {
                audio.setBuffer(buffer);
                audio.setVolume(0.4); // 降低成功音效默认音量
                state.succAudios.push(audio);
            });
        });

        state.extAudios = [];
        ['ex_1'].forEach(name => {
            const audio = new THREE.Audio(listener);
            audioLoader.load(`assets/audio/ext/${name}.mp3`, (buffer) => {
                audio.setBuffer(buffer);
                audio.setVolume(0.4); // 降低高分奖励音效默认音量
                state.extAudios.push(audio);
            });
        });

        // 加载连击开始音效
        const comboAudioObj = new THREE.Audio(listener);
        audioLoader.load('assets/audio/combo/com_1.mp3', (buffer) => {
            comboAudioObj.setBuffer(buffer);
            comboAudioObj.setVolume(0.4); // 降低连击音效默认音量
            state.comboAudio = comboAudioObj;
        });

        // 加载撞击篮板和篮筐音效集
        const hitB = new THREE.Audio(listener);
        audioLoader.load('assets/audio/hit/hit_board.mp3', (buffer) => {
            hitB.setBuffer(buffer);
            hitB.setVolume(0.2); // 调低篮板撞击音量
            state.hitBoardAudio = hitB;
        });

        state.hitRimAudios = [];
        ['1', '2', '3'].forEach(idx => {
            const hitM = new THREE.Audio(listener);
            audioLoader.load(`assets/audio/hit/hit_m_${idx}.mp3`, (buffer) => {
                hitM.setBuffer(buffer);
                hitM.setVolume(0.4);
                state.hitRimAudios.push(hitM);
            });
        });

        // 加载狂热模式背景音
        state.defenseAudio = new THREE.Audio(listener);
        audioLoader.load('assets/audio/defense.mp3', (buffer) => {
            state.defenseAudio.setBuffer(buffer);
            state.defenseAudio.setLoop(true);
            state.defenseAudio.setVolume(0.5);
        });

        const hitNet = new THREE.Audio(listener);
        audioLoader.load('assets/in_mesh.mp3', (buffer) => {
            hitNet.setBuffer(buffer);
            hitNet.setVolume(1.5); // 大幅提升刷网音量
            state.hitNetAudio = hitNet;
        });

        state.hitGroundAudios = [];
        ['1', '2', '3'].forEach(idx => {
            const hitG = new THREE.Audio(listener);
            audioLoader.load(`assets/audio/hit/hit_ground_${idx}.mp3`, (buffer) => {
                hitG.setBuffer(buffer);
                hitG.setVolume(0.4);
                state.hitGroundAudios.push(hitG);
            });
        });

        const endA = new THREE.Audio(listener);
        audioLoader.load('assets/end.mp3', (buffer) => {
            endA.setBuffer(buffer);
            endA.setVolume(0.8);
            state.endAudio = endA;
        });

        spawnNewBall();
    });

    // --- 背景音乐音量控制 ---
    const volSlider = document.getElementById('bgm-volume');
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (state.bgm) state.bgm.setVolume(val);
        });
    }

    // --- 游戏速度控制 ---
    const speedSlider = document.getElementById('speed-scale');
    const speedValText = document.getElementById('speed-value');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            state.timeScale = val;
            if (speedValText) speedValText.innerText = (val / 1.5).toFixed(1) + 'x';
        });
    }
}

function onDown(e) {
    if (state.gameState !== 'playing') return;
    // --- 兼容移动端 (touch 模式 button 为 undefined，视为左键) ---
    const isPrimary = (e.button === 0 || e.button === undefined);
    
    if (isPrimary && state.currentBall) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, state.camera);
        const intersects = raycaster.intersectObject(state.currentBall.mesh, true);
        if (intersects.length > 0) {
            isDragging = true; dragStart = { x: e.clientX, y: e.clientY };
            if (state.controls) state.controls.enabled = false;
        }
    }
}

function onUp(e) {
    const isPrimary = (e.button === 0 || e.button === undefined);
    if (isPrimary && isDragging) {
        isDragging = false; 
        if (state.controls) state.controls.enabled = true;
        
        if (state.aimBeam) state.aimBeam.visible = false;
        if (state.aimBeamGlow) state.aimBeamGlow.visible = false;
        if (state.aimMarker) state.aimMarker.visible = false;
        if (state.aimRipples) state.aimRipples.forEach(r => r.visible = false);
        if (state.aimPathSegments) state.aimPathSegments.forEach(s => s.visible = false);
        
        if (e.clientY - dragStart.y > 0) {
            throwBall({ x: dragStart.x - e.clientX, y: e.clientY - dragStart.y });
        }
    }
}

function onMove(e) {
    if (!state.currentBall || state.gameState !== 'playing') return;
    if (isDragging) {
        const dx = (e.clientX - dragStart.x), dy = (e.clientY - dragStart.y);
        const start = state.currentBall.mesh.position;
        
        // --- 核心修复：采用投影法实现 1:1 拖拽感 ---
        const ballNDC = start.clone().project(state.camera);
        const mouseNDC = new THREE.Vector3(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1,
            ballNDC.z 
        );
        const visualTarget = mouseNDC.unproject(state.camera);

        const dist = start.distanceTo(visualTarget);
        // --- 核心算法：实时轨迹预测 (Trajectory Prediction) ---
        if (state.aimPathSegments && isDragging) {
            const dragVector = { x: dragStart.x - e.clientX, y: e.clientY - dragStart.y };
            
            // 镜像 throwBall 的物理参数
            const b = state.currentBall;
            const camDir = new THREE.Vector3(); state.camera.getWorldDirection(camDir);
            const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(camDir.x, 0, camDir.z).normalize(), new THREE.Vector3(0, 1, 0)).normalize();
            
            const travelTime = 2.02;
            const sensitivity = 0.0292;
            const baseForward = (b.spawnDist / travelTime);
            const forwardForce = baseForward + (dragVector.y * sensitivity);
            const upForce = 8.44 + (dragVector.y * 0.0232);
            const sideForce = dragVector.x * 0.027 * 1.5;
            
            const startVel = camDir.clone().multiplyScalar(forwardForce).add(camRight.multiplyScalar(sideForce));
            startVel.y += upForce;
            
            const gravity = -22.0; // 对应 constants.js
            const isVisible = (state.punishMode !== 'blind');
            const lerpFactor = Math.min(1.0, Math.sqrt(dragVector.x*dragVector.x + dragVector.y*dragVector.y) / 300);
            
            // 预测未来的位置 (只展示前 0.6s)
            state.aimPathSegments.forEach((dot, i) => {
                const t = i * 0.05; // 缩短步长，展示更紧密的初始路径
                const x = start.x + startVel.x * t;
                const y = start.y + startVel.y * t + 0.5 * gravity * t * t;
                const z = start.z + startVel.z * t;
                
                // 增加一点“张力抖动”
                const jitter = (Math.random() - 0.5) * 0.02 * lerpFactor;
                dot.position.set(x + jitter, y + jitter, z + jitter);
                dot.visible = isVisible;
                
                // 颜色更鲜艳：从高亮青色渐变到亮橘色
                const finalColor = new THREE.Color().setHSL(0.5 - lerpFactor * 0.4, 1.0, 0.6);
                dot.material.color.copy(finalColor);
                dot.scale.setScalar(1.2 - (i / 15)); 
            });

            if (state.aimMarker) state.aimMarker.visible = false; // 隐藏落点标志以防作弊
        }
    } else {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, state.camera);
        const intersects = raycaster.intersectObject(state.currentBall.mesh, true);
        if (intersects.length > 0) document.body.style.cursor = 'pointer';
        else document.body.style.cursor = 'default';
    }
}

let lastFrameTime = performance.now();
const fixedStep = 1 / 60;
let accumulator = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    if (!currentTime) currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    if (state.gameState === 'playing' || state.gameState === 'paused') {
        const timeScale = state.timeScale || 1.0;
        accumulator += (deltaTime / 1000) * timeScale;
        
        while (accumulator >= fixedStep) {
            state.world.step(fixedStep);
            accumulator -= fixedStep;
            
            if (state.gameState === 'playing') {
                if (state.sidePunishTime > 0) {
                    state.sidePunishTime -= fixedStep;
                    if (state.sidePunishTime <= 0) {
                        state.sidePunishTime = 0;
                        if (state.punishMode === 'side') {
                            state.punishMode = null; state.punishBalls = 0; state.missCount = 0;
                            if (state.aimLine) state.aimLine.visible = true;
                            const hPos = new THREE.Vector3(HOOP_POS.x, HOOP_POS.y, HOOP_POS.z);
                            state.cameraTargetPos.set(0, HOOP_POS.y + 1, HOOP_POS.z + 10);
                            state.controlsTargetPos.copy(hPos);
                            state.isCameraAnimating = true;
                        }
                    }
                    updateSidePunishUI();
                }

                if (state.isRewardPhase && state.rewardTimeLeft > 0) {
                    state.rewardTimeLeft -= fixedStep;
                    
                    // --- 狂热模式背景音控制 ---
                    if (state.defenseAudio && !state.defenseAudio.isPlaying) {
                        state.defenseAudio.play();
                    }

                    if (state.rewardTimeLeft <= 0) {
                        state.rewardTimeLeft = 0;
                        state.isRewardPhase = false;
                        
                        if (state.defenseAudio && state.defenseAudio.isPlaying) {
                            state.defenseAudio.stop();
                        }
                    }
                    updateRewardUI();
                }
            }
        }
    }

    if (state.isCameraAnimating) {
        state.camera.position.lerp(state.cameraTargetPos, 0.08);
        state.controls.target.lerp(state.controlsTargetPos, 0.08);
        if (state.camera.position.distanceTo(state.cameraTargetPos) < 0.05) {
            state.isCameraAnimating = false;
            const relX = state.camera.position.x - state.controls.target.x;
            const relZ = state.camera.position.z - state.controls.target.z;
            const finalTheta = Math.atan2(relX, relZ);
            state.controls.minAzimuthAngle = finalTheta;
            state.controls.maxAzimuthAngle = finalTheta;
        }
    } else if (state.currentBall && !state.isUserInteracting) {
        state.controls.target.copy(state.currentBall.mesh.position);
    }

    state.controls.update();

    if (state.currentBall) state.currentBall.mesh.position.copy(state.currentBall.body.position);
    state.activeBalls.forEach(b => { 
        b.mesh.position.copy(b.body.position); 
        b.mesh.quaternion.copy(b.body.quaternion); 
        
        // --- 狂热模式强光特效 (恒定高亮，不闪烁) ---
        if (state.isRewardPhase) {
            b.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.emissiveIntensity = 1.2;
                    // 设置自发光颜色为球体本身的颜色
                    if (!child.material.emissive.getHex()) {
                        child.material.emissive.copy(child.material.color);
                    }
                }
            });
        } else {
            // 重置自发光
            b.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.emissiveIntensity = (b.type === 'rainbow' ? 1.0 : 0.0);
                }
            });
        }
        
        // --- 彩虹球动态变色效果 ---
        if (b.type === 'rainbow') {
            const time = Date.now() * 0.002;
            const color = new THREE.Color().setHSL((time % 1.0), 1.0, 0.5);
            b.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.color.copy(color);
                    child.material.emissive.copy(color);
                }
            });
        }
    });
    
    // --- 当前球处理 ---
    if (state.currentBall) {
        // 狂热模式当前球也强光
        if (state.isRewardPhase) {
            state.currentBall.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.emissiveIntensity = 1.2;
                    if (!child.material.emissive.getHex()) {
                        child.material.emissive.copy(child.material.color);
                    }
                }
            });
        }
        
        if (state.currentBall.type === 'rainbow') {
            const time = Date.now() * 0.002;
            const color = new THREE.Color().setHSL((time % 1.0), 1.0, 0.5);
            state.currentBall.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.color.copy(color);
                    child.material.emissive.copy(color);
                }
            });
        }
    }

    if (state.gameState === 'playing') checkGoals();
    updateNet();

    // --- 抛物线动态动画 (Trajectory Animation) ---
    if (isDragging && state.aimPathSegments && state.aimPathSegments.length > 0) {
        const time = Date.now() * 0.001;
        
        // 轨迹点流动效果 (加速脉冲)
        state.aimPathSegments.forEach((dot, i) => {
            const pulse = 0.7 + Math.sin(time * 25 - i * 1.5) * 0.3;
            dot.material.opacity = pulse;
            // 随力量增加的轻微震颤
            if (Math.random() > 0.8) {
                dot.position.x += (Math.random() - 0.5) * 0.01;
            }
        });
    }

    state.renderer.render(state.scene, state.camera);
}

init(); animate();

