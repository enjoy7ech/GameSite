import * as THREE from 'three';
import { state } from './state.js';
import { BALL_RADIUS, TABLE_HEIGHT, BALL_CONFIG, PADDLE_RADIUS, PADDLE_CONFIG } from './constants.js';

export function initBall() {
    // 1. Visual Mesh
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    
    // Create a simple texture with a stripe so we can visually SEE the spin
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#e63946'; // Red stripe/logo for spin visibility
    ctx.fillRect(0, 50, 128, 28);
    ctx.font = "20px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("★★★", 35, 70);
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    state.scene.add(mesh);

    // 2. Physics Body
    const shape = new CANNON.Sphere(BALL_RADIUS);
    const body = new CANNON.Body({
        mass: 0.0027, // 2.7 grams
        material: state.physMaterial.ball,
        linearDamping: 0.1, // 自然空气阻力让球速逐渐变慢
        angularDamping: 0.4 // 让夸张的旋转随时间自然衰减
    });
    body.addShape(shape);
    state.world.addBody(body);

    state.ball = { mesh, body };
    resetBall();
    
    // --- Rule Engine: Table Bounce Listener ---
    body.addEventListener("collide", (e) => {
        if (!state.physicsBodies || !state.physicsBodies.tableBody) return;
        
        // If ball hits the table
        if (e.body === state.physicsBodies.tableBody) {
            // --- Spin-Bounce Interaction ---
            // When a spinning ball hits the table, the spin is converted to linear velocity.
            // This makes topspin balls kick forward and backspin balls slow down.
            const spin = body.angularVelocity;
            const radius = BALL_RADIUS;
            
            // X-axis spin (Top/Back) affects Z velocity
            // Topspin (negative X omega) -> increases speed in direction of travel (usually -Z)
            // Backspin (positive X omega) -> decreases speed
            const kickZ = spin.x * radius * 1.5; 
            body.velocity.z += kickZ;
            
            // Y-axis spin (Side) affects X velocity
            const kickX = -spin.y * radius * 1.5;
            body.velocity.x += kickX;
            
            // Friction also reduces spin on bounce
            body.angularVelocity.scale(0.6, body.angularVelocity);

            if (body.position.z > 0) {
                state.game.bouncesOnPlayer++;
                if (state.game.bouncesOnPlayer > 1) {
                    scorePoint('ai', '双跳失分！ (Double Bounce)');
                }
            } else {
                state.game.bouncesOnAI++;
                if (state.game.bouncesOnAI > 1) {
                    scorePoint('player', '好球！ (Winner)');
                }
            }
        }
    });
}

function showMessage(text, color) {
    const el = document.getElementById('game-message');
    if (!el) return;
    el.innerText = text;
    el.style.color = color;
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.opacity = '0';
    }, 2000);
}

function updateScoreboard() {
    document.getElementById('score-player').innerText = state.score.player;
    document.getElementById('score-ai').innerText = state.score.ai;
}

function scorePoint(winner, reason) {
    if (state.game.status !== 'playing') return;
    
    state.game.status = 'point_scored';
    
    if (winner === 'player') {
        state.score.player++;
        showMessage(reason, '#00aaff');
    } else {
        state.score.ai++;
        showMessage(reason, '#ff3366');
    }
    
    updateScoreboard();
    
    // Setup for next serve
    setTimeout(() => {
        state.game.server = winner === 'player' ? 'player' : 'ai';
        state.game.isServing = true;
        state.game.status = 'playing';
        state.game.lastHitBy = null;
        state.game.bouncesOnPlayer = 0;
        state.game.bouncesOnAI = 0;
        resetBall();
        
        if (state.game.server === 'player') {
            document.getElementById('controls-hint').style.opacity = '1';
        } else {
            // AI serves automatically after a short delay
            setTimeout(() => {
                if(state.game.isServing && state.game.server === 'ai') {
                    state.game.isServing = false;
                    state.game.lastHitBy = 'ai';
                    // 发球必须先在自己半场跳一下，然后过网。
                    // 抛物线瞄准受高度影响容易不过网，直接给一个标准的下砸+向前的发球速度最稳妥
                    state.ball.body.velocity.set((Math.random() - 0.5) * 1.5, -2.5, 4.0);
                }
            }, 1000);
        }
    }, 2500);
}

function checkOutOfBounds() {
    if (state.game.status !== 'playing') return;
    
    const ball = state.ball.body;
    // If ball drops below table height significantly, it's out of play
    if (ball.position.y < TABLE_HEIGHT - 0.2) {
        if (state.game.lastHitBy === 'player') {
            if (state.game.bouncesOnAI > 0) {
                // It bounced on AI side and fell off -> Player wins the point
                scorePoint('player', '漂亮！ (Nice Shot)');
            } else {
                // It didn't bounce on AI side -> Player hit it out or into net
                scorePoint('ai', '界外球！ (Out of Bounds)');
            }
        } else if (state.game.lastHitBy === 'ai') {
            if (state.game.bouncesOnPlayer > 0) {
                scorePoint('ai', 'AI 得分！ (AI Point)');
            } else {
                scorePoint('player', 'AI 失误！ (AI Error)');
            }
        } else {
            // Nobody hit it? (e.g., serve fault)
            scorePoint(state.game.server === 'player' ? 'ai' : 'player', '发球失误！ (Serve Fault)');
        }
    }
}

export function resetBall() {
    if (!state.game) state.game = {};
    state.game.isServing = true;
    state.game.status = 'playing';
    state.game.bouncesOnPlayer = 0;
    state.game.bouncesOnAI = 0;
    state.game.lastHitBy = null;
    
    if (state.ball.body) {
        state.ball.body.velocity.set(0, 0, 0);
        state.ball.body.angularVelocity.set(0, 0, 0);
    }
}

export function updateBall() {
    if (!state.ball || !state.ball.body) return;

    const ballBody = state.ball.body;
    
    // Serve Mode: Ball hovers and follows the player's paddle
    if (state.game.isServing && state.playerPaddle && state.playerPaddle.body) {
        const paddlePos = state.playerPaddle.body.position;
        // Hover the ball exactly at the configured offset relative to the paddle
        ballBody.position.set(
            paddlePos.x + BALL_CONFIG.serve.offset.x,           
            paddlePos.y + BALL_CONFIG.serve.offset.y,    
            paddlePos.z + BALL_CONFIG.serve.offset.z            
        );
        // Reset velocities so it doesn't build up momentum while hovering
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        
        // If AI is serving, position ball over AI paddle
        if (state.game.server === 'ai' && state.opponentPaddle && state.opponentPaddle.body) {
            const aiPaddlePos = state.opponentPaddle.body.position;
            ballBody.position.set(
                aiPaddlePos.x + BALL_CONFIG.serve.offset.x,           
                aiPaddlePos.y + BALL_CONFIG.serve.offset.y,    
                aiPaddlePos.z - BALL_CONFIG.serve.offset.z // Flipped Z for opponent
            );
        }
    } else {
        // --- Custom Arcade Collision Detection ---
        if (state.playerPaddle && state.playerPaddle.body) {
            const paddleBody = state.playerPaddle.body;
            const dist = ballBody.position.distanceTo(paddleBody.position);
            
            // 判定距离：球拍半径 + 球半径 + 容错距离
            const HIT_DISTANCE = PADDLE_RADIUS + BALL_RADIUS + PADDLE_CONFIG.physics.hitTolerance; 
            
            // 只有当球向玩家飞来 (z >= 0) 并且进入判定范围时，才触发击球！
            // 这里用 >= -0.1 是为了兼容发球时球直上直下 (z=0) 的情况，同时防止球被打出后 (z变负) 被连击
            if (dist < HIT_DISTANCE && ballBody.velocity.z >= -0.1) {
                
                const isServe = (state.game.lastHitBy === null);
                
                state.game.lastHitBy = 'player';
                state.game.bouncesOnPlayer = 0;
                state.game.bouncesOnAI = 0;
                
                // 1. 获取球拍当前的面朝向 (Normal)
                const normal = new CANNON.Vec3(0, 0, -1); // 默认朝向球网
                paddleBody.quaternion.vmult(normal, normal);
                
                // 乒乓球拍是双面的！反手时球拍旋转了 180 度，normal 会朝后 (z > 0)。
                // 此时应该翻转法线，因为我们是用反面击球的。
                let isBackhand = false;
                if (normal.z > 0) {
                    normal.negate(normal);
                    isBackhand = true;
                }
                
                // --- 终极辅助算法 (Game Design Aim Assist) ---
                // 原生的物理受力叠加很容易导致球稍微一偏就飞出界外。
                // 真正的体育游戏（如 Wii Sports）在底层都是靠“预测落点+抛物线逆运算”来实现“怎么打都能上桌”的爽快感。
                
                const swingX = paddleBody.velocity.x;
                const swingY = paddleBody.velocity.y;
                const swingZ = Math.abs(paddleBody.velocity.z); // 向前的推力
                
                // 1. 判断是否是“无效击打”
                // 比如球拍完全背对球网 (normal.z > -0.2)，或者乱挥拍
                if (normal.z > -0.2) {
                    // 惩罚球：往天上弹，或者软弱无力地掉网
                    ballBody.velocity.set((Math.random() - 0.5), 2.0, 1.0);
                } else {
                    // 2. 合法击球，开启辅助瞄准！
                    // 计算目标落点 (Target X, Z)
                    // X轴：根据鼠标横滑的速度来定，限制在桌宽范围内 (+- 0.76 是桌子边缘，留点安全区)
                    let targetX = swingX * 0.2;
                    targetX = Math.max(-0.65, Math.min(0.65, targetX));
                    
                    // 1. Z轴落点 (Target Z) 和 飞行时间 (timeToTarget)
                    let targetZ = -1.25; 
                    let timeToTarget = 0.65; 
                    
                    if (isServe) {
                        // 发球：必须先在自己半场跳一下
                        targetZ = 0.6; 
                        timeToTarget = 0.35; // 落点近，抛物线时间短
                    } else if (isBackhand) {
                        // 反手球（反横板）：高但是旋转快
                        timeToTarget = 0.8; 
                    } else {
                        // 正手球（横板）：快且飞得低
                        timeToTarget = 0.5;
                    }
                    
                    // 3. 物理抛物线逆运算 (仅对对拉生效，发球单独处理)
                    if (isServe) {
                        // 发球：直接给一个固定的“下砸且向前”的速度，确保它必定先在自己半场弹跳，然后有足够的动能过网
                        ballBody.velocity.set(targetX * 2, -2.5, -4.0);
                    } else {
                        const dx = targetX - ballBody.position.x;
                        const dy = TABLE_HEIGHT - ballBody.position.y;
                        const dz = targetZ - ballBody.position.z;
                        
                        const gravity = -7.5; // 微调重力，兼顾手感与真实抛物线
                        const vx = dx / timeToTarget;
                        const vz = dz / timeToTarget;
                        const vy = (dy - 0.5 * gravity * timeToTarget * timeToTarget) / timeToTarget;
                        
                        ballBody.velocity.set(vx, vy, vz);
                    }
                    
                    // 5. 附加物理旋转 (Spin)
                    let spinX = 0;
                    if (state.paddleControl.isLeftDown) {
                        spinX = 40 + Math.abs(swingZ) * 5;  // 强烈下旋
                    } else if (state.paddleControl.isRightDown) {
                        spinX = -50 - Math.abs(swingZ) * 8; // 强烈上旋
                    } else {
                        spinX = -10; // 默认带一点点自然上旋
                    }
                    
                    // 侧旋 (Sidespin)：受水平挥拍速度影响
                    let spinY = swingX * 8;
                    
                    if (!isServe && isBackhand) {
                        // 反手旋转快
                        spinX *= 2.0;
                        spinY *= 2.0;
                    }
                    
                    ballBody.angularVelocity.set(spinX, spinY, 0);
                }
            }
        }
        
        // --- Custom Arcade Collision Detection (AI) ---
        if (state.opponentPaddle && state.opponentPaddle.body) {
            const aiBody = state.opponentPaddle.body;
            const dist = ballBody.position.distanceTo(aiBody.position);
            const HIT_DISTANCE = PADDLE_RADIUS + BALL_RADIUS + PADDLE_CONFIG.physics.hitTolerance; 
            
            // AI is at negative Z, ball moving towards AI means velocity.z < 0.1
            if (dist < HIT_DISTANCE && ballBody.velocity.z <= 0.1) {
                state.game.lastHitBy = 'ai';
                state.game.bouncesOnPlayer = 0;
                state.game.bouncesOnAI = 0;
                
                // --- 终极辅助算法 (AI 版本) ---
                // AI 同样应用了抛物线魔法，保证它能稳定和你对拉回合！
                const swingX = aiBody.velocity.x;
                
                // 1. 决定 AI 的落点
                // 随机左右落点，稍微增加难度
                let targetX = (Math.random() - 0.5) * 1.2; 
                targetX = Math.max(-0.65, Math.min(0.65, targetX));
                
                // 简化：AI 也固定把球打到你的底线附近
                let targetZ = 1.25; 
                
                // 2. 决定 AI 的击球节奏 (时间)
                // 配合重力缩短时间，节奏会稍微紧凑一些但不会太快
                let timeToTarget = 0.7; 
                
                // 3. 物理逆推抛物线
                const dx = targetX - ballBody.position.x;
                const dy = TABLE_HEIGHT - ballBody.position.y;
                const dz = targetZ - ballBody.position.z;
                
                const gravity = -7.5; // 配合物理世界重力
                const vx = dx / timeToTarget;
                const vz = dz / timeToTarget;
                const vy = (dy - 0.5 * gravity * timeToTarget * timeToTarget) / timeToTarget;
                
                ballBody.velocity.set(vx, vy, vz);
                
                // 随机给点旋转
                ballBody.angularVelocity.set(
                    (Math.random() - 0.5) * 30,
                    swingX * 5, 
                    0
                );
            }
        }
    }

    // Check if ball fell off the table
    checkOutOfBounds();

    // --- Magnus Effect (Curve Ball) ---
    // F = S * (omega x v)
    // 根据要求：等球落地一次（bounces > 0）再执行这个马格努斯效应
    if (!state.game.isServing && (state.game.bouncesOnPlayer + state.game.bouncesOnAI) > 0) {
        const vel = ballBody.velocity;
        const omega = ballBody.angularVelocity;
        const magnusForce = new CANNON.Vec3();
        omega.cross(vel, magnusForce);
        
        // Magnus coefficient
        const S = 0.00012; 
        magnusForce.scale(S, magnusForce);
        ballBody.applyForce(magnusForce, ballBody.position);
    }

    // Sync Visual Mesh
    state.ball.mesh.position.copy(ballBody.position);
    state.ball.mesh.quaternion.copy(ballBody.quaternion);
}
