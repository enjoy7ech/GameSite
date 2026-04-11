import * as THREE from 'three';
import { state } from './state.js';
import { HOOP_POS, BALL_RADIUS, RING_RADIUS, LEVELS, MESSAGES, BALL_COLORS, PUNISH_COLORS, BALL_DESCRIPTIONS } from './constants.js';
import { updateScoreDisplay, updateBuffUI, showPraise, triggerScreenShake, updateRewardUI } from './ui.js';

export function spawnNewBall() {
    const factor = Math.min(1, (state.level - 1) / (LEVELS.length - 1));
    const minWidth = 4 + factor * 8;
    const maxWidth = 12 + factor * 32;
    const width = minWidth + Math.random() * (maxWidth - minWidth);

    let yPos = 5.0 + factor * 1.5 + Math.random() * 3.5;
    if (state.level >= 5 && Math.random() < 0.2) yPos = HOOP_POS.y;

    // --- 位置计算：受惩罚模式影响 ---
    let spawnPos;
    if (state.gameMode === 'rush') {
        // --- Rush 模式难度区间设计 ---
        const ranges = {
            'D': { dist: [4, 8], height: [4.5, 6.5], x: 3 },
            'C': { dist: [8, 16], height: [5.5, 8], x: 7 },
            'B': { dist: [16, 28], height: [6.5, 9.5], x: 15 },
            'A': { dist: [28, 42], height: [7.5, 11], x: 25 },
            'S': { dist: [42, 58], height: [8.5, 12.5], x: 40 }
        };
        const r = ranges[state.rushDifficulty] || ranges['C'];
        const depth = r.dist[0] + Math.random() * (r.dist[1] - r.dist[0]);
        const y = r.height[0] + Math.random() * (r.height[1] - r.height[0]);
        spawnPos = new THREE.Vector3((Math.random() - 0.5) * r.x * 2.0, y, HOOP_POS.z + depth);
    } else if (state.isJailMode) {
        // --- 地狱挑战模式：篮球出生在篮板后方 (Z < 0)，拉近距离以便操作 ---
        const rHeight = 7 + Math.random() * 3;
        const rDepth = -2 - Math.random() * 3; // 篮板后 2m 到 5m
        spawnPos = new THREE.Vector3((Math.random() - 0.5) * 8, rHeight, HOOP_POS.z + rDepth);
    } else if (state.punishMode === 'side') {
        // --- 死角惩罚模式：强制生成在垂直于篮板的侧边 (X 轴) ---
        const rX = Math.random() < 0.5 ? -18 - Math.random() * 5 : 18 + Math.random() * 5;
        spawnPos = new THREE.Vector3(rX, 7 + Math.random() * 3, HOOP_POS.z + 1 + Math.random() * 3);
    } else {
        const minDepth = 4 + factor * 8;
        const maxDepth = 14 + factor * 26;
        const depth = minDepth + Math.random() * (maxDepth - minDepth);
        spawnPos = new THREE.Vector3((Math.random() - 0.5) * width, yPos, HOOP_POS.z + depth);
    }

    let ballType = 'normal';
    let ballColor = BALL_COLORS.NORMAL;

    // --- 特殊球判定抽离 ---
    if (state.gameMode === 'rush') {
        ballType = 'normal';
    } else if (state.isRewardPhase) {
        // --- 疯狂奖励阶段：强制只生成奖励球 ---
        const types = ['time', 'gold', 'combo', 'buff'];
        ballType = types[Math.floor(Math.random() * types.length)];
    } else if (state.isJailMode || state.punishMode) {
        ballType = 'normal';
    } else {
        // 1. 判断是否进入连续 5 个不进，触发惩罚球
        if (state.missCount >= 5) {
            const pTypes = ['side', 'jail', 'blind', 'timer'];
            ballType = pTypes[Math.floor(Math.random() * pTypes.length)];
            state.missCount = 0; // 成功产生惩罚种球，重置计数
        } else {
            // 2. 只有在非惩罚且没进入失球爆发时，才生成普通奖励球
            const rand = Math.random();
            if (state.giveRewardNext || rand < 0.15) {
                const types = ['time', 'gold', 'combo', 'buff'];
                ballType = types[Math.floor(Math.random() * types.length)];
                state.giveRewardNext = false;
            }
        }
    }

    // 设置球的颜色
    if (BALL_COLORS[ballType.toUpperCase()]) ballColor = BALL_COLORS[ballType.toUpperCase()];
    else if (PUNISH_COLORS[ballType.toUpperCase()]) ballColor = PUNISH_COLORS[ballType.toUpperCase()];

    let mesh;
    let baseScale = 1.0;
    if (state.basketballTemplate) {
        mesh = state.basketballTemplate.clone();
        mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.castShadow = true;
                child.material = child.material.clone();
                child.material.color.set(ballColor);
                if (ballType !== 'normal') {
                    child.material.emissive = new THREE.Color(ballColor);
                    child.material.emissiveIntensity = 1.0;
                }
            }
        });
        mesh.scale.set(1, 1, 1);
        const box = new THREE.Box3().setFromObject(mesh);
        baseScale = (BALL_RADIUS * 2.0) / box.getSize(new THREE.Vector3()).x;
        mesh.scale.set(baseScale, baseScale, baseScale);
    } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 32, 32), new THREE.MeshStandardMaterial({ color: ballColor }));
    }
    mesh.userData.baseScale = baseScale;
    state.scene.add(mesh);

    const body = new CANNON.Body({ mass: 0.6, shape: new CANNON.Sphere(BALL_RADIUS), material: state.physMaterial });
    body.position.copy(spawnPos); body.type = CANNON.Body.STATIC;
    body.collisionFilterGroup = 1; body.collisionFilterMask = 1 | 2;
    state.world.addBody(body);

    const ballRef = {
        mesh, body, scored: false, enteredRim: false, hasHitRimOrBoard: false, airballed: false,
        spawnDist: spawnPos.distanceTo(new THREE.Vector3(HOOP_POS.x, spawnPos.y, HOOP_POS.z)),
        spawnHeight: spawnPos.y,
        spawnX: spawnPos.x,
        spawnZ: spawnPos.z - HOOP_POS.z,
        type: ballType,
        label: null,
        bounceCount: 0
    };
    state.currentBall = ballRef;

    // --- 保存难度分记录 ---
    state.currentBallDiff = calculateDifficulty(ballRef);
    updateScoreDisplay(); // 确保 HUD 同步更新

    // --- 创建场景文字说明 ---
    if (ballType !== 'normal') {
        const str = BALL_DESCRIPTIONS[ballType];
        const label = createTextLabel(str, ballColor);
        label.position.set(spawnPos.x, spawnPos.y + 0.8, spawnPos.z);
        state.scene.add(label);
        ballRef.label = label;
    }

    const hPos = new THREE.Vector3(HOOP_POS.x, HOOP_POS.y, HOOP_POS.z);
    const relPos = new THREE.Vector3().subVectors(state.camera.position, state.controls.target);
    const sphere = new THREE.Spherical().setFromVector3(relPos);
    const hDir = new THREE.Vector3(spawnPos.x - hPos.x, 0, spawnPos.z - hPos.z).normalize();
    const planarDist = sphere.radius * Math.sin(sphere.phi);
    const heightDist = sphere.radius * Math.cos(sphere.phi);
    const newCamPos = new THREE.Vector3(spawnPos.x + hDir.x * planarDist, spawnPos.y + heightDist, spawnPos.z + hDir.z * planarDist);

    state.cameraTargetPos.copy(newCamPos);
    state.controlsTargetPos.copy(spawnPos);
    state.isCameraAnimating = true;

    // --- 核心修复：切换视角动画开始时解除偏航角锁定，允许动画顺畅执行 ---
    if (state.controls) {
        state.controls.minAzimuthAngle = -Infinity;
        state.controls.maxAzimuthAngle = Infinity;
    }

    body.addEventListener('collide', (e) => {
        if (e.body === state.floorBody) {
            // --- 落地音效：随碰撞次数增加而逐渐减弱 ---
            ballRef.bounceCount++;
            if (state.hitGroundAudios && state.hitGroundAudios.length > 0 && ballRef.bounceCount < 10) {
                const volume = Math.max(0, 0.4 * Math.pow(0.6, ballRef.bounceCount - 1));
                if (volume > 0.05) {
                    const bounceSound = state.hitGroundAudios[Math.floor(Math.random() * state.hitGroundAudios.length)];
                    if (bounceSound.isPlaying) bounceSound.stop();
                    bounceSound.setVolume(volume);
                    bounceSound.play();
                }
            }

            // --- 未进球处理逻辑 (只在球第一次撞地时触发一次) ---
            if (ballRef && !ballRef.scored && ballRef.bounceCount === 1) {
                // --- NEW: 奖励阶段连击不掉 ---
                if (!state.isRewardPhase) {
                    state.comboCount = 0; // 正常模式落地重置连击
                }

                // --- NEW: 奖励阶段不累计惩罚进度 ---
                if (!state.isRewardPhase) {
                    state.missCount++;    // 增加连续未进球计数
                }

                // --- 惩罚球未进逻辑判定 ---
                if (ballRef.type === 'side') { state.punishMode = 'side'; state.sidePunishTime = 30.0; showPraise("边际生存惩罚已启动 - 30s!"); }
                else if (ballRef.type === 'jail') { state.isJailMode = true; showPraise("逆流挑战模式已开启!"); }
                else if (ballRef.type === 'blind') { state.punishMode = 'blind'; state.punishBalls = 3; if (state.aimLine) state.aimLine.visible = false; showPraise("视觉脱钩判定生效!"); }
                else if (ballRef.type === 'timer') { state.startTime -= 10000; showPraise("检测到时间塌缩 -10s!"); triggerScreenShake(); }

                // --- 三不沾反馈 ---
                if (!ballRef.hasHitRimOrBoard && !ballRef.airballed) {
                    ballRef.airballed = true;
                    if (state.failAudios && state.failAudios.length > 0) {
                        const rnd = state.failAudios[Math.floor(Math.random() * state.failAudios.length)];
                        if (!rnd.isPlaying) rnd.play();
                    }
                }

                updateScoreDisplay();

                // 延迟销毁
                if (ballRef.label) { state.scene.remove(ballRef.label); ballRef.label = null; }
                setTimeout(() => destroyBall(ballRef), 3000);

                // --- 核心修改：判定为未进（落地）后，大幅缩短发球时延 (500ms) ---
                if (state.ballTimeout) clearTimeout(state.ballTimeout);
                state.ballTimeout = setTimeout(() => spawnNewBall(), 500);
            }
        }
        if (state.ringBodies.includes(e.body) || e.body === state.boardBody) {
            ballRef.hasHitRimOrBoard = true;

            // --- 进球/碰撞音效增强 ---
            // 获取碰撞瞬间的相对速度（沿法线方向）
            const impactVel = e.contact.getImpactVelocityAlongNormal();
            if (impactVel > 1.5) { // 阈值：防止极轻微滚动触发噪音
                if (e.body === state.boardBody) {
                    if (state.hitBoardAudio) {
                        if (state.hitBoardAudio.isPlaying) state.hitBoardAudio.stop();
                        state.hitBoardAudio.play();
                    }
                } else {
                    if (state.hitRimAudios && state.hitRimAudios.length > 0) {
                        const rnd = state.hitRimAudios[Math.floor(Math.random() * state.hitRimAudios.length)];
                        if (rnd.isPlaying) rnd.stop();
                        rnd.play();
                    }
                }
            }
        }
    });
}

function createTextLabel(text, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 80;

    // 绘制高亮白底
    ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(10, 10, 236, 60, 15);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 36px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // 文字颜色：主文字使用对应球种颜色
    const textColor = '#' + new THREE.Color(color).getHexString();
    ctx.fillStyle = textColor;
    ctx.fillText(text, 128, 40);

    // 叠加一个深色描边防止在亮白色背景上不清晰
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
    ctx.strokeText(text, 128, 40);

    const tex = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
}

function destroyBall(ball) {
    if (!ball) return;
    if (ball.label) { state.scene.remove(ball.label); ball.label = null; }
    state.world.removeBody(ball.body);
    state.scene.remove(ball.mesh);
    const idx = state.activeBalls.indexOf(ball);
    if (idx > -1) state.activeBalls.splice(idx, 1);
}

export function startGame() {
    state.gameMode = 'career';
    state.gameState = 'playing';
    document.getElementById('cover-screen').style.display = 'none';
    startTimer();
    if (state.bgm && !state.bgm.isPlaying) state.bgm.play();
}

export function startRush(diff) {
    state.gameMode = 'rush';
    state.rushDifficulty = diff;
    state.gameState = 'playing';
    state.maxDifficultyHit = 0;
    // 重复显式赋值到 window，防止模块异步加载带来的引用错误
    window.startRush = startRush;
    document.getElementById('cover-screen').style.display = 'none';

    // Rush 模式下特殊的 UI 初始化
    const el = document.getElementById('level-info');
    if (el) el.innerText = `OVERCLOCK CHALLENGE [${diff}] // 60s LIMIT`;

    // --- 核心修复：Rush 模式启动时，摧毁已有的职业模式起始球，强制按难度重新生成 ---
    if (state.currentBall) {
        state.world.removeBody(state.currentBall.body);
        state.scene.remove(state.currentBall.mesh);
        if (state.currentBall.label) state.scene.remove(state.currentBall.label);
        state.currentBall = null;
    }

    spawnNewBall();
    startTimer();
    if (state.bgm && !state.bgm.isPlaying) state.bgm.play();
}

export function restartGame() { location.reload(); }
export function quitGame() { window.parent.postMessage('close-game', '*'); }

export function throwBall(dragVector) {
    if (!state.currentBall) return;
    const b = state.currentBall;
    b.body.type = CANNON.Body.DYNAMIC; b.body.wakeUp();

    // 隐藏说明文字
    if (b.label) { state.scene.remove(b.label); b.label = null; }

    state.shotsTaken++;
    updateScoreDisplay();

    const camDir = new THREE.Vector3(); state.camera.getWorldDirection(camDir);
    const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(camDir.x, 0, camDir.z).normalize(), new THREE.Vector3(0, 1, 0)).normalize();

    // --- 黄金折中线性模型 (Golden Midpoint Model) ---
    // 目标：兼具灵动感与精准微调，处于紧绷与柔顺的平衡点。
    const travelTime = 2.02; // 黄金滞空比
    const sensitivity = 0.0292; // 折中灵敏度：每像素对应 5.8cm，控制感极佳
    
    // 1. 基于距离的基准水平推力 (刚好能飞到篮筐所在平面)
    const baseForward = (b.spawnDist / travelTime);
    
    // 2. 总推力：基准力 + 折中型线性拉力
    const forwardForce = baseForward + (dragVector.y * sensitivity);
    
    // 3. 纵向力：平衡基准底座，中量线性随拉拽变化。
    const upForce = 8.44 + (dragVector.y * 0.0232);
    
    const sideForce = dragVector.x * 0.027 * 1.5;

    const velocity = camDir.clone().multiplyScalar(forwardForce).add(camRight.multiplyScalar(sideForce));
    b.body.velocity.set(velocity.x, velocity.y + upForce, velocity.z);
    state.activeBalls.push(b); state.currentBall = null; state.controls.enabled = true;

    // 惩罚球计数递减
    if (state.punishBalls > 0) {
        state.punishBalls--;
        if (state.punishBalls <= 0) {
            state.punishMode = null;
            if (state.aimLine) state.aimLine.visible = true;
        }
    }

    state.ballTimeout = setTimeout(() => {
        if (!state.currentBall && state.activeBalls.length > 0) {
            spawnNewBall();
        }
    }, 4000);
}

export function checkGoals() {
    for (let ball of state.activeBalls) {
        if (ball.scored) continue;
        const bPos = ball.mesh.position;
        const distToHoop = Math.sqrt(Math.pow(bPos.x - HOOP_POS.x, 2) + Math.pow(bPos.z - HOOP_POS.z, 2));

        if (distToHoop < RING_RADIUS * 0.9) {
            // 优化：进入篮圈即便略低于篮筐水平面（只要在篮圈正上方附近）也判定为合法进入
            if (bPos.y > HOOP_POS.y - 0.2) ball.enteredRim = true;

            if (bPos.y < HOOP_POS.y && bPos.y > HOOP_POS.y - 1.2 && ball.enteredRim) {
                ball.scored = true;
                state.missCount = 0; // 只要进球一次就清空连续未进球计数

                if (state.hitNetAudio) {
                    if (state.hitNetAudio.isPlaying) state.hitNetAudio.stop();
                    state.hitNetAudio.play();
                }
                state.shotsMade++;
                state.comboCount += 1;

                if (state.comboCount >= 2 && state.comboAudio) {
                    if (state.comboAudio.isPlaying) state.comboAudio.stop();
                    state.comboAudio.play();
                }

                const comboMult = 1 + (state.comboCount - 1) * 0.2;

                // --- 进球难度分 (Difficulty Score) 核心算法 ---
                let difficultyPts = calculateDifficulty(ball);

                // --- 核心调整：得分现在纯粹与难度挂钩，且高难度得分呈非线性增长 (指数级膨胀) ---
                // 算法逻辑：(难度/10)^1.5 * 10，当难度越高，分值跳跃越快
                let scaledPts = Math.pow(difficultyPts / 10, 1.5) * 10;
                let pts = Math.floor(scaledPts * comboMult);

                if (!ball.hasHitRimOrBoard) {
                    pts = Math.floor(pts * 2.5); // 空心入网：赋予极高的 2.5 倍难度乘数 (取整)
                    state.startTime += 8000;

                    // --- NEW: 触发 15s 疯狂奖励时间 (支持累加) ---
                    state.isRewardPhase = true;
                    state.rewardTimeLeft = Math.min(60, (state.rewardTimeLeft || 0) + 15);
                    updateRewardUI();

                    triggerScreenShake();
                    showPraise(`SWISH!! 核心连贯奖励! 同步时长 +${(8000/1000).toFixed(0)}s`);

                    // --- NEW: 空进优先播放空进特效音效, 增加 fallback ---
                    if (state.extAudios && state.extAudios.length > 0) {
                        const rnd = state.extAudios[Math.floor(Math.random() * state.extAudios.length)];
                        if (!rnd.isPlaying) rnd.play();
                    } else if (state.succAudios && state.succAudios.length > 0) {
                        // 如果没有 ext 音效，也要有 succ 音效作为保底
                        const rnd = state.succAudios[Math.floor(Math.random() * state.succAudios.length)];
                        if (!rnd.isPlaying) rnd.play();
                    }
                } else {
                    // --- 非空进进球，判定结算难度是否 > 25 ---
                    if (difficultyPts > 25) {
                        if (state.succAudios && state.succAudios.length > 0) {
                            const rnd = state.succAudios[Math.floor(Math.random() * state.succAudios.length)];
                            if (!rnd.isPlaying) rnd.play();
                        }
                    }

                    const randomPraise = MESSAGES.PRAISE[Math.floor(Math.random() * MESSAGES.PRAISE.length)];
                    showPraise(randomPraise);
                }

                // 对超高难度进球给与额外文案反馈
                if (difficultyPts > 50) showPraise(`序列同步完美！系数:${difficultyPts.toFixed(0)}`);

                if (ball.type === 'time') {
                    state.startTime += 15000;
                } else if (ball.type === 'gold') {
                    pts = Math.floor(pts * 5);
                } else if (ball.type === 'combo') {
                    state.comboCount += 3;
                    pts = Math.floor(pts * 1.5);
                } else if (ball.type === 'buff') {
                    state.distCoeff += 0.08;
                    state.heightCoeff += 0.04;
                }

                // --- 惩罚解除逻辑：进球即恢复正常 (视角 & 进度归0) ---
                if (state.isJailMode || state.punishMode) {
                    const wasPerspectiveChanged = state.isJailMode || state.punishMode === 'side';

                    if (state.isJailMode) {
                        pts *= 8; // 地狱挑战奖励
                        showPraise("已重连至主序列!");
                        state.isJailMode = false;
                    }

                    if (state.punishMode) {
                        state.punishMode = null;
                        state.punishBalls = 0;
                        state.sidePunishTime = 0;
                        if (state.aimLine) state.aimLine.visible = true;
                    }

                    state.missCount = 0; // 惩罚进度归0

                    // 视角恢复：如果处于死角或地狱模式，立即平滑转回正前视角
                    if (wasPerspectiveChanged) {
                        const hPos = new THREE.Vector3(HOOP_POS.x, HOOP_POS.y, HOOP_POS.z);
                        // 计算一个标准的前方视角位置
                        state.cameraTargetPos.set(0, HOOP_POS.y + 1, HOOP_POS.z + 10);
                        state.controlsTargetPos.copy(hPos);
                        state.isCameraAnimating = true;
                        if (state.controls) {
                            state.controls.minAzimuthAngle = -Infinity;
                            state.controls.maxAzimuthAngle = Infinity;
                        }
                    } else {
                        showPraise("异常同步已清除!");
                    }
                    triggerScreenShake();
                }

                if (Math.random() < 0.25) state.giveRewardNext = true;

                state.score += pts;
                state.maxCombo = Math.max(state.maxCombo, state.comboCount);
                if (state.gameMode === 'rush') {
                    state.maxDifficultyHit = Math.max(state.maxDifficultyHit, difficultyPts);
                }
                updateScoreDisplay(pts); // 传入本次得分以显示动效
                if (state.gameMode === 'career' && state.score >= state.targetScore) nextLevel();

                // --- 核心修改：判定为进球后，大幅缩短发球时延 (500ms) ---
                if (state.ballTimeout) clearTimeout(state.ballTimeout);
                state.ballTimeout = setTimeout(() => spawnNewBall(), 500);

                setTimeout(() => destroyBall(ball), 3000);
            }
        }
    }
}

export function nextLevel() {
    state.level++; if (state.level > LEVELS.length) { endGame(true); return; }
    state.remain30Used = false;
    state.targetScore = LEVELS[state.level - 1].target; state.startTime += 90000;
    const el = document.getElementById('level-info');
    if (el) el.innerText = MESSAGES.LEVEL_INFO(state.level, state.targetScore);
    showPraise(MESSAGES.LEVEL_UP);
    triggerScreenShake();
}

export function endGame(win) {
    state.gameState = 'result'; clearInterval(state.timerInterval);
    if (state.bgm && state.bgm.isPlaying) state.bgm.stop();
    if (state.endAudio) {
        if (state.endAudio.isPlaying) state.endAudio.stop();
        state.endAudio.play();
    }
    const scoreVal = document.getElementById('final-score');
    if (scoreVal) scoreVal.innerText = state.score;
    const overlay = document.getElementById('result-overlay');
    if (overlay) overlay.classList.remove('hidden');

    const msg = document.getElementById('result-msg');

    if (state.gameMode === 'rush') {
        const hitRate = state.shotsTaken > 0 ? ((state.shotsMade / state.shotsTaken) * 100).toFixed(1) : "0.0";
        msg.innerHTML = `[RUSH 结束] 难度评级: ${state.rushDifficulty}<br>命中率: ${hitRate}%<br>最高命中难度分: ${state.maxDifficultyHit.toFixed(0)}`;
        document.getElementById('result-status').innerText = "超频协议执行完毕";
    } else {
        msg.innerText = win ? MESSAGES.RESULT_WIN : MESSAGES.RESULT_LOSE;
        document.getElementById('result-status').innerText = win ? "同步序列达成" : "连接已中断";
    }
}

export function startTimer() {
    state.startTime = Date.now();
    state.timerInterval = setInterval(() => {
        if (state.gameState !== 'playing') return;

        let remaining;
        if (state.gameMode === 'rush') {
            remaining = 60 - Math.floor((Date.now() - state.startTime) / 1000);
        } else {
            remaining = LEVELS[state.level - 1].time - Math.floor((Date.now() - state.startTime) / 1000);
            if (remaining === 30 && !state.remain30Used) {
                const audio = state.camera.children.find(c => c instanceof THREE.Audio && c.buffer && c.name !== 'bgm' && c.getVolume() > 0.3 && c.getVolume() < 0.5);
                if (audio && !audio.isPlaying) audio.play();
                state.remain30Used = true;
            }
        }

        if (remaining <= 0) endGame(false);
        const m = Math.max(0, Math.floor(remaining / 60)).toString().padStart(2, '0');
        const s = Math.max(0, remaining % 60).toString().padStart(2, '0');
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.innerText = `${m}:${s}`;
    }, 1000);
}

export function updateNet() {
    if (!state.netLinesGeo) return;
    const pos = state.netLinesGeo.attributes.position.array;
    let ptr = 0;
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 14; c++) {
            const b = state.netParticles[r * 14 + c], rb = state.netParticles[r * 14 + ((c + 1) % 14)];
            pos[ptr++] = b.position.x; pos[ptr++] = b.position.y; pos[ptr++] = b.position.z;
            pos[ptr++] = rb.position.x; pos[ptr++] = rb.position.y; pos[ptr++] = rb.position.z;
            if (r < 5) {
                const db = state.netParticles[(r + 1) * 14 + c];
                pos[ptr++] = b.position.x; pos[ptr++] = b.position.y; pos[ptr++] = b.position.z;
                pos[ptr++] = db.position.x; pos[ptr++] = db.position.y; pos[ptr++] = db.position.z;
            }
        }
    }
    state.netLinesGeo.attributes.position.needsUpdate = true;
}

/**
 * 核心难度分数算法：根据起始位置计算进球的基础分
 */
export function calculateDifficulty(ball) {
    if (!ball) return 10;
    // 1. 距离因子 D：以 4m 为基点，距离越远分数呈指数上升
    const dScore = Math.pow(ball.spawnDist / 4, 1.8);

    // 2. 高度因子 H：相对于篮筐 (8.1m) 的高度落差带来的视觉和弧线压力
    const hScore = Math.abs(ball.spawnHeight - HOOP_POS.y) * 4.0;

    // 3. 角度因子 A：侧方死角 (Corner Shot) 由于视野变窄，难度显著高于正面
    const angleFactor = Math.abs(ball.spawnX || 0) / (Math.abs(ball.spawnZ || 1) + 2.0);
    const aScore = angleFactor * 15.0;

    return 10 + dScore + hScore + aScore;
}
