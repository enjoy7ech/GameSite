import { prepareUI, puzzle, events, PolyPiece } from '../core/Engine.js';
import { ItemSystem } from './ItemSystem.js';

export const Levels = [
    // --- 第一章：锦绣入画 ---
    { id: '1-1', chapter: 1, name: '初窥门径', pieces: 15, rotate: false, evt: 'normal', img: 'assets/painting1.png', desc: '简单的15片入门，在碎裂的绢布中寻回画意。', time: 120 },
    { id: '1-2', chapter: 1, name: '渐入佳境', pieces: 30, rotate: false, evt: 'normal', img: 'assets/painting2.png', desc: '提升碎片数量，打磨基本功，修复残破的山水。', time: 240 },
    { id: '1-3', chapter: 1, name: '小试牛刀', pieces: 30, rotate: true, evt: 'normal', img: 'assets/painting3.png', desc: '原画方位错乱，考验你对构图的感知力。', time: 300 },
    { id: '1-4', chapter: 1, name: '熟能生巧', pieces: 50, rotate: true, evt: 'normal', img: 'assets/painting4.webp', desc: '50片复杂碎片，运用道具还原这幅传世名作。', time: 480 },

    // --- 第二章：丹青幻境 ---
    { id: '2-1', chapter: 2, name: '遮眼迷途', pieces: 80, rotate: true, evt: 'fog', img: 'assets/painting5.webp', desc: '受迷雾遮蔽，唯有点亮琉璃灯方可看清全局。', time: 600 },
    { id: '2-2', chapter: 2, name: '偷天换日', pieces: 120, rotate: true, evt: 'fake', img: 'assets/painting6.webp', desc: '大量伪造残片混入，请用明心鉴识破。', time: 720 },
    { id: '2-3', chapter: 2, name: '登峰造极', pieces: 160, rotate: true, evt: 'fake', img: 'assets/painting7.webp', desc: '乱像丛生，在重重虚假中重现传世名作的荣光。', time: 900 },

    // --- 第三章：风卷残云 ---
    { id: '3-1', chapter: 3, name: '朔风初起', pieces: 80, rotate: true, evt: 'drifting+fog', img: 'assets/painting8.webp', desc: '飞沙迷眼，你的洛阳铲无法使用。在迷雾中稳住并寻找第一批碎片。', time: 720 },
    { id: '3-2', chapter: 3, name: '飞沙走沙', pieces: 100, rotate: true, evt: 'drifting+fog', img: 'assets/painting9.webp', desc: '飞沙迷眼，你的洛阳铲无法使用。风沙渐大且浓雾锁江，寻找“定风珠”是破局之钥。', time: 900 },
    { id: '3-3', chapter: 3, name: '乱云深处', pieces: 130, rotate: true, evt: 'drifting+fog+fake', img: 'assets/painting10.webp', desc: '沙尘、浓雾与伪造碎片齐聚，考验极度紧致的观察力。', time: 1200 },
    { id: '3-4', chapter: 3, name: '锦绣重光', pieces: 180, rotate: true, evt: 'drifting+fog', img: 'assets/painting11.webp', desc: '飞沙迷眼，你的洛阳铲无法使用。在这迷失之雾中，直面穿越朔风的终极修复。', time: 1500 },

    // --- 第四章：墨染烟雨 ---
    { id: '4-1', chapter: 4, name: '烟雨初临', pieces: 100, rotate: true, evt: 'blurring', img: 'assets/painting12.webp', desc: '雨点打湿了边缘，在变模糊前完成合并。', time: 900 },
    { id: '4-2', chapter: 4, name: '润物无声', pieces: 130, rotate: true, evt: 'blurring+fake', img: 'assets/painting13.webp', desc: '雨势加重，墨迹化开。似乎还有伪影在干扰视线。', time: 1200 },
    { id: '4-3', chapter: 4, name: '画魂归位', pieces: 160, rotate: true, evt: 'blurring+fake', img: 'assets/painting14.webp', desc: '双重压力：雨水的冲刷与虚假碎片的诱导。', time: 1800 },
    { id: '4-4', chapter: 4, name: '丹青不朽', pieces: 220, rotate: true, evt: 'blurring+fake', img: 'assets/painting15.webp', desc: '最终章：在倾盆大雨与乱象伪影中，守护画魂。', time: 2400 },

    // --- 第五章：归元化境 ---
    { id: '5-1', chapter: 5, name: '天外云卷', pieces: 200, rotate: true, evt: 'drifting+fog+blurring+fake', img: 'assets/painting16.png', desc: '究极试炼：风、雾、雨与幻象交织，唯有心明手快方可破阵。', time: 1800 },
    { id: '5-2', chapter: 5, name: '墨龙破空', pieces: 260, rotate: true, evt: 'drifting+fog+blurring+fake', img: 'assets/painting17.png', desc: '风暴之中，邪气肆虐。所有干扰全数降临。', time: 2400 },
    { id: '5-3', chapter: 5, name: '凤舞涅槃', pieces: 320, rotate: true, evt: 'drifting+fog+blurring+fake', img: 'assets/painting18.png', desc: '在重重幻影与墨雨中，重塑涅槃之美。', time: 3000 },
    { id: '5-4', chapter: 5, name: '万古长青', pieces: 400, rotate: true, evt: 'drifting+fog+blurring+fake', img: 'assets/painting19.png', desc: '大结局：守护丹青之魂的最后一战。', time: 3600 }
];

export class GameManager {
    constructor() {
        this.coins = 200;
        this.timerSeconds = 0;
        this.timerInterval = null;
        this.envInterval = null;
        this.isOvertime = false;
        this.isPlaying = false;
        this.currentLevel = null;

        // Items and State
        this.highestLevelIndex = 0;
        this.itemSystem = new ItemSystem(this);
        this.unlockedItems = {};
        this.itemLevels = {};
        this.fogActive = false;

        // Environment State
        this.windStrength = 0;
        this.windAngle = 0;
        this.windDX = 0;
        this.windDY = 0;
        this.blurBaseRate = 0;
        this.blurredImage = null; // Pre-generated blurred texture
        this.levelBlur = 0; // Global level blur for Chapter 4

        this.bindEvents();
        this.loadData();
        this.renderLevelMenu(1);

        this.setupEngineOverrides();
    }

    setupEngineOverrides() {
        if (!PolyPiece.prototype._originalDrawV1) {
            PolyPiece.prototype._originalDrawV1 = PolyPiece.prototype.drawImage;
            
            // Re-Implementation: Optimized Plan C (Pre-blurred Texture & Umbrella Range)
            PolyPiece.prototype.drawImage = function(special) {
                const gm = window.gameManager;
                const isWet = gm && gm.currentLevel && gm.currentLevel.evt.includes('blurring');
                const ctx = this.isMoving ? puzzle.moveCtx : puzzle.playCtx;
                
                if (isWet) {
                    // Check Umbrella & Shovel Protection using piece center
                    let isProtected = false;
                    const im = gm.itemSystem;
                    const mx = im.mouseX;
                    const my = im.mouseY;

                    if (im.umbrellaActive) {
                        const radius = im.effectPower.umbrella[(gm.itemLevels.umbrella || 1) - 1] || 120;
                        const pDisp = this.fromSrcMatrix.transformPoint(this.pCentre);
                        const dx = pDisp.x - mx;
                        const dy = pDisp.y - my;
                        if (dx*dx + dy*dy < radius*radius) isProtected = true;
                    }
                    
                    if (!isProtected && im.shovelActive) {
                        const radius = [100, 180, 280][(gm.itemLevels.shovel || 1) - 1];
                        const pDisp = this.fromSrcMatrix.transformPoint(this.pCentre);
                        const dx = pDisp.x - mx;
                        const dy = pDisp.y - my;
                        if (dx*dx + dy*dy < radius*radius) isProtected = true;
                    }

                    // Use pre-blurred image if not protected and not moving
                    const useBlur = !isProtected && !this.isMoving;
                    const originalImg = puzzle.srcImage;
                    
                    if (useBlur && gm.blurredImage) {
                        puzzle.srcImage = gm.blurredImage;
                        ctx.save();
                        // Optional: slight opacity fade for the ink effect
                        ctx.globalAlpha = 0.85; 
                        this._originalDrawV1(special);
                        ctx.restore();
                        puzzle.srcImage = originalImg;
                    } else {
                        this._originalDrawV1(special);
                    }
                } else {
                    this._originalDrawV1(special);
                }

                // Handle Mirror Marks (Red Stripes)
                if (this.isFake && this.markedByMirror) {
                    ctx.save();
                    let pth = new Path2D();
                    pth.addPath(this.srcPath, this.fromSrcMatrix);
                    ctx.clip(pth);
                    ctx.lineWidth = 1.8;
                    ctx.strokeStyle = 'rgba(255, 50, 50, 0.45)';
                    const step = 15;
                    const offset = (Date.now() / 2000) % 15;
                    for(let i = -1000; i < 2000; i += step) {
                        ctx.beginPath();
                        for(let x = -500; x < 2000; x += 15) {
                            let y = x * 0.5 + i + Math.sin((x + offset * 10) / 40) * 8;
                            if (x === -500) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            };
        }
        
        // 2. Pure Drawing Loop
        if (puzzle && !puzzle.constructor.prototype._originalDrawPolyPieces) {
            const PuzzleClass = puzzle.constructor;
            PuzzleClass.prototype._originalDrawPolyPieces = PuzzleClass.prototype.drawPolyPieces;

            PuzzleClass.prototype.drawPolyPieces = function (butTop) {
                const gm = window.gameManager;
                if (!gm || !gm.currentLevel) return this._originalDrawPolyPieces(butTop);

                const isBlur = gm.currentLevel.evt.includes('blurring');

                if (isBlur) {
                    // Clear and Redraw all - PolyPiece.drawImage handles texture switching
                    this.playCtx.clearRect(0, 0, this.playCanvas.width, this.playCanvas.height);
                    const max = this.polyPieces.length - (butTop ? 1 : 0);
                    for (let k = 0; k < max; ++k) {
                        this.polyPieces[k].drawImage();
                    }
                } else {
                    this._originalDrawPolyPieces(butTop);
                }

                // Call Item Overlays to ensure they persist after main loop clears
                if (gm.itemSystem.shovelActive) {
                    gm.itemSystem.drawShovelReveal();
                }
                if (gm.itemSystem.umbrellaActive) {
                    gm.itemSystem.drawUmbrellaVisual();
                }
            };
        }
    }

    loadData() {
        const saved = localStorage.getItem('void_relics_save_v1');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.coins !== undefined) this.coins = data.coins;
                if (data.highestLevelIndex !== undefined) this.highestLevelIndex = data.highestLevelIndex;
                if (data.unlockedItems !== undefined) this.unlockedItems = data.unlockedItems;
                if (data.itemLevels !== undefined) this.itemLevels = data.itemLevels;
            } catch (e) {
                console.error("Failed to parse save data");
            }
        }

        this.updateHUD();
        Object.keys(this.unlockedItems).forEach(id => {
            if (this.unlockedItems[id]) {
                const btn = document.querySelector(`.btn-buy[data-id="${id}"]`);
                if (btn) {
                    btn.innerText = '售罄';
                    btn.classList.add('sold-out');
                }

                const upgBtn = document.querySelector(`.btn-upgrade[data-id="${id}-upg"]`);
                if (upgBtn) {
                    upgBtn.classList.remove('hidden');
                    const level = this.itemLevels[id] || 1;
                    if (level >= 3) {
                        upgBtn.innerText = '已满级 (Lv.3)';
                        upgBtn.disabled = true;
                    } else {
                        upgBtn.innerText = `升级 (Lv.${level})`;
                    }
                }
            }
        });
    }

    saveData() {
        const data = {
            coins: this.coins,
            highestLevelIndex: this.highestLevelIndex,
            unlockedItems: this.unlockedItems,
            itemLevels: this.itemLevels
        };
        localStorage.setItem('void_relics_save_v1', JSON.stringify(data));
    }

    bindEvents() {
        document.getElementById('btn-restart').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-back-home').addEventListener('click', () => {
            this.togglePause();
            this.showMenu();
        });
        document.getElementById('btn-exit-game').addEventListener('click', () => {
            window.location.href = '/#games'; // Go back to game gallery on main site
        });

        document.getElementById('item-tray-toggle').addEventListener('click', () => {
            const hud = document.getElementById('item-hud');
            hud.classList.toggle('collapsed');
            document.getElementById('item-tray-toggle').innerText = hud.classList.contains('collapsed') ? '▲' : '◈';
        });

        // Intercept all interactions when paused to freeze the engine's state
        const blockInteraction = (e) => {
            if (this.isPaused) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        };
        ['mousedown', 'mousemove', 'mouseup', 'wheel', 'touchstart', 'touchmove', 'touchend'].forEach(type => {
            document.addEventListener(type, blockInteraction, true);
        });

        document.getElementById('btn-open-shop').addEventListener('click', () => {
            document.getElementById('shop-modal').classList.remove('hidden');
        });
        document.getElementById('btn-close-shop').addEventListener('click', () => {
            document.getElementById('shop-modal').classList.add('hidden');
        });

        document.getElementById('btn-notice-close').addEventListener('click', () => {
            document.getElementById('notice-modal').classList.add('hidden');
        });

        document.querySelectorAll('.chapter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.chapter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.renderLevelMenu(parseInt(e.target.dataset.chapter, 10));
            });
        });

        document.addEventListener('mousemove', (e) => {
            const rect = document.getElementById('forPuzzle').getBoundingClientRect();
            this.lastMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            if (!this.fogActive || this.isPaused) return;
            const fog = document.getElementById('fog-overlay');
            if (this.itemSystem.lampActive) {
                const level = (this.itemLevels && this.itemLevels.lamp) || 1;
                const radius = [150, 250, 400][level - 1];
                fog.style.maskImage = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, transparent ${radius}px, black ${radius * 2}px)`;
                fog.style.webkitMaskImage = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, transparent ${radius}px, black ${radius * 2}px)`;
            } else {
                fog.style.maskImage = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, transparent 0px, black 50px)`;
                fog.style.webkitMaskImage = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, transparent 0px, black 50px)`;
            }
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-menu').classList.toggle('hidden', !this.isPaused);
        if (this.isPaused) {
            this.stopTimer();
            this.stopEnvUpdate();
        } else {
            this.startTimer();
            this.startEnvUpdate();
        }
    }

    renderLevelMenu(chapterId) {
        const list = document.getElementById('level-list');
        list.innerHTML = '';
        Levels.filter(l => l.chapter === chapterId).forEach(level => {
            const levelIndex = Levels.findIndex(l => l.id === level.id);
            const isLocked = levelIndex > this.highestLevelIndex;

            const card = document.createElement('div');
            card.className = 'level-card' + (isLocked ? ' locked' : '');

            card.innerHTML = `
                <div class="level-info">
                    <h3>${level.id} ${level.name}</h3>
                    <span>${level.desc}</span>
                </div>
                <button class="btn-primary" ${isLocked ? 'disabled style="background: rgba(100,100,100,0.5); border: none; color: #aaa; cursor: not-allowed;"' : ''}>${isLocked ? '未解锁' : '修复'}</button>
            `;
            if (!isLocked) {
                card.querySelector('button').addEventListener('click', () => this.startGame(level));
            }
            list.appendChild(card);
        });
    }

    showMenu() {
        this.isPlaying = false;
        this.isPaused = false;
        this.stopTimer();
        this.stopEnvUpdate();

        const activeTab = document.querySelector('.chapter-tab.active');
        if (activeTab) {
            this.renderLevelMenu(parseInt(activeTab.dataset.chapter, 10));
        }

        document.getElementById('start-screen').classList.add('active');
        document.getElementById('start-screen').classList.remove('hidden');

        document.getElementById('hud-timer').classList.add('hidden');
        document.getElementById('hud-chapter').classList.add('hidden');
        document.getElementById('btn-pause').classList.add('hidden');
        document.getElementById('btn-open-shop').classList.remove('hidden');

        document.getElementById('item-hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('fog-overlay').classList.add('hidden');
        document.getElementById('environment-overlay').classList.add('hidden');
        this.fogActive = false;
        document.getElementById('forPuzzle').style.opacity = '0';

        events.push({ event: 'stop' });
    }

    startGame(level) {
        this.currentLevel = level;
        
        // --- Snapshot Transition ---
        this.captureSnapshot();

        setTimeout(() => {
            this.executeStartGame(level);
        }, 400);
    }
    
    captureSnapshot() {
        const trCanvas = document.getElementById('transition-canvas');
        if (!trCanvas || !puzzle.playCanvas) return;
        
        const ctx = trCanvas.getContext('2d');
        trCanvas.width = puzzle.playCanvas.width;
        trCanvas.height = puzzle.playCanvas.height;
        
        ctx.clearRect(0, 0, trCanvas.width, trCanvas.height);
        ctx.drawImage(puzzle.playCanvas, 0, 0);
        ctx.drawImage(puzzle.moveCanvas, 0, 0);
        
        trCanvas.classList.remove('hidden');
        trCanvas.style.opacity = '1';
        trCanvas.style.filter = 'none';
        
        requestAnimationFrame(() => {
            trCanvas.style.filter = 'blur(20px) grayscale(0.6)';
        });
    }

    executeStartGame(level) {
        // Stop current logic
        clearInterval(this.timerInterval);
        clearInterval(this.envInterval);
        
        document.getElementById('current-chapter-name').innerText = `第${level.chapter}章：${level.name} (${level.pieces}片)`;

        document.getElementById('start-screen').classList.remove('active');
        setTimeout(() => document.getElementById('start-screen').classList.add('hidden'), 500);

        document.getElementById('hud-timer').classList.remove('hidden');
        document.getElementById('hud-chapter').classList.remove('hidden');
        document.getElementById('btn-pause').classList.remove('hidden');
        document.getElementById('btn-open-shop').classList.add('hidden');

        document.getElementById('item-hud').classList.remove('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('forPuzzle').style.opacity = '1';

        const trCanvas = document.getElementById('transition-canvas');
        if (trCanvas) {
            trCanvas.style.opacity = '0';
            setTimeout(() => trCanvas.classList.add('hidden'), 800);
        }

        this.isPlaying = false;
        this.itemSystem.resetLevelState();

        const isFog = level.evt.includes('fog');
        const isDrift = level.evt.includes('drifting');
        const isBlur = level.evt.includes('blurring');

        // Set Overlays
        const fog = document.getElementById('fog-overlay');
        fog.classList.toggle('hidden', !isFog);
        this.fogActive = isFog;

        // Reset/Setup environment scale (200% is only needed for rotating sandstorms)
        const particles = document.getElementById('environment-particles');
        particles.style.transform = 'none';
        particles.style.width = '100%';
        particles.style.height = '100%';
        particles.style.left = '0';
        particles.style.top = '0';

        if (isDrift) {
            this.windAngle = Math.random() * Math.PI * 2;
            this.windDX = Math.cos(this.windAngle);
            this.windDY = Math.sin(this.windAngle);

            // Rotating sandstorm needs 200% size to cover corners
            particles.style.width = '200%';
            particles.style.height = '200%';

            const deg = (this.windAngle * 180 / Math.PI);
            particles.style.transform = `translate(-50%, -50%) rotate(${deg + 180}deg)`;
            particles.style.left = '50%';
            particles.style.top = '50%';

            const windIndicator = document.getElementById('wind-text');
            if (windIndicator) {
                // Simplified arrow logic: ⮕ is 0deg, so we map deg directly
                const arrows = ['⮕', '⬇', '⬅', '⬆'];
                const arrowIdx = (Math.round(deg / 90) % 4 + 4) % 4;
                windIndicator.innerText = `风起大漠 ${arrows[arrowIdx]}`;
            }
        }

        const env = document.getElementById('environment-overlay');
        env.classList.toggle('hidden', !isDrift && !isBlur);
        document.getElementById('wind-indicator').classList.toggle('hidden', !isDrift);

        particles.classList.toggle('raining', isBlur);
        particles.classList.toggle('sanding', isDrift);

        // Show Ink Loading Overlay
        const loading = document.getElementById('ink-loading');
        if (loading) {
            loading.classList.remove('hidden');
            loading.style.opacity = '1';
        }

        // Reset preview container style for new level AFTER ink is shown
        const puzzleContainer = document.getElementById('forPuzzle');
        puzzleContainer.style.filter = 'none';
        puzzleContainer.style.opacity = '1';

        puzzle.imageLoaded = false;
        puzzle.srcImage.src = level.img + '?t=' + Date.now();

        document.getElementById('nbpieces').value = level.pieces;
        document.getElementById('rotationstep').value = level.rotate ? 6 : 0;

        const waitLoad = setInterval(() => {
            if (puzzle.imageLoaded) {
                clearInterval(waitLoad);
                
                if (level.evt.includes('blurring')) {
                    this.levelBlur = 0;
                    this.createBlurredImage();
                }
                
                // Start piece generation flow
                events.push({ event: "nbpieces", nbpieces: level.pieces });

                if (puzzle.polyPieces) {
                    puzzle.polyPieces.forEach(p => { p.currentBlur = 0; });
                }

                setTimeout(() => {
                    if (level.evt.includes('fake')) {
                        this.injectFakePieces();
                    }
                    this.shuffleAllPieces();
                    this.startEnvUpdate();
                    this.isPlaying = true;
                    this.updateHUD();
                    
                    // Fade out loading screen
                    setTimeout(() => {
                        if (loading) {
                            loading.style.opacity = '0';
                            setTimeout(() => loading.classList.add('hidden'), 800);
                        }
                    }, 1000); 
                }, 800); // 800ms to ensure engine has processed nbpieces and created polyPieces
            }
        }, 50);

        // Emergency safety timeout for loading screen UI only
        setTimeout(() => {
            if (loading && !loading.classList.contains('hidden')) {
                clearInterval(waitLoad);
                loading.style.opacity = '0';
                setTimeout(() => loading.classList.add('hidden'), 800);
                this.isPlaying = true;
                this.updateHUD();
            }
        }, 6000);

        this.isPlaying = true;
        this.isPaused = false;
        this.isOvertime = false;
        this.itemSystem.resetLevelState();
        this.startTimer();
        this.updateHUD();
    }

    startEnvUpdate() {
        this.stopEnvUpdate();

        if (this.currentLevel.evt.includes('drifting')) {
            const speedMap = { 
                '3-1': 0.15, '3-2': 0.3, '3-3': 0.5, '3-4': 0.8,
                '5-1': 0.45, '5-2': 0.75, '5-3': 1.1, '5-4': 1.6
            };
            this.windStrength = speedMap[this.currentLevel.id] || 0.3;
        } else if (this.currentLevel.evt.includes('blurring')) {
            const rateMap = { '4-1': 0.008, '4-2': 0.015, '4-3': 0.03, '4-4': 0.05 };
            this.blurBaseRate = rateMap[this.currentLevel.id] || 0.01;
        }

        const runUpdate = (now) => {
            if (!this.isPlaying || this.isPaused || !puzzle || !puzzle.polyPieces) return;

            // Throttle environmental effects to ~20 FPS (every 50ms) to save CPU
            const delta = now - (this.lastEnvTime || 0);
            if (delta < 50) {
                this.envInterval = requestAnimationFrame(runUpdate);
                return;
            }
            this.lastEnvTime = now;

            this.handleEdgePanning();

            let needsRedraw = false;

            if (this.currentLevel.evt.includes('blurring')) {
                // Pre-generated blur doesn't need incrementing blurVal
                needsRedraw = true; 
            }

            puzzle.polyPieces.forEach(pp => {
                if (pp.isMoving || pp.selected) return;

                if (this.currentLevel.evt.includes('drifting') && pp.pieces.length < 3) {
                    if (!this.itemSystem.beadActive) {
                        pp.x += this.windDX * this.windStrength;
                        pp.y += this.windDY * this.windStrength;

                        // v1.2: Occasional wind rotation (0.1% chance per frame)
                        if (Math.random() < 0.001 && !pp.fixedByBrush) {
                            const currentRot = pp.rot;
                            const dir = Math.random() > 0.5 ? 1 : -1;
                            const newRot = (currentRot + dir + 6) % 6;
                            pp.rotate(newRot);
                        }

                        pp.setTransforms();
                        needsRedraw = true;
                    }
                }
            });

            if (needsRedraw) puzzle.drawPolyPieces();
            this.envInterval = requestAnimationFrame(runUpdate);
        };
        this.envInterval = requestAnimationFrame(runUpdate);
    }

    createBlurredImage() {
        if (!puzzle || !puzzle.srcImage) return;
        const src = puzzle.srcImage;
        const canvas = document.createElement('canvas');
        canvas.width = src.width;
        canvas.height = src.height;
        const ctx = canvas.getContext('2d');
        ctx.filter = 'blur(10px)'; // High quality fixed blur
        ctx.drawImage(src, 0, 0);
        this.blurredImage = canvas;
    }

    stopEnvUpdate() {
        if (this.envInterval) cancelAnimationFrame(this.envInterval);
        this.envInterval = null;
    }


    handleEdgePanning() {
        if (!this.isPlaying || this.isPaused || !puzzle || !puzzle.polyPieces || !this.lastMousePos) return;

        // Only pan if a piece is currently grabbed
        const isDragging = puzzle.polyPieces.some(p => p.selected);
        if (!isDragging) return;

        const margin = 80;
        const panSpeed = 12;
        const rect = puzzle.container.getBoundingClientRect();
        const mx = this.lastMousePos.x;
        const my = this.lastMousePos.y;

        let dx = 0, dy = 0;
        if (mx < margin) dx = panSpeed;
        else if (mx > rect.width - margin) dx = -panSpeed;

        if (my < margin) dy = panSpeed;
        else if (my > rect.height - margin) dy = -panSpeed;

        if (dx !== 0 || dy !== 0) {
            puzzle.sweepBy(dx, dy);
            // Fix: Synchronize Engine's drag capture point with the panning shift
            if (window._movingState && window._movingState.ppXInit !== undefined) {
                window._movingState.ppXInit += dx;
                window._movingState.ppYInit += dy;
            }
            puzzle.drawPolyPieces();
        }
    }

    injectFakePieces() {
        if (!puzzle || !puzzle.polyPieces || puzzle.polyPieces.length === 0) return;

        const gridPositions = puzzle.polyPieces.map(p => ({ x: p.x, y: p.y }));
        const numFakes = Math.max(3, Math.floor(this.currentLevel.pieces * 0.15));

        for (let i = 0; i < numFakes; i++) {
            let src = puzzle.polyPieces[Math.floor(Math.random() * puzzle.polyPieces.length)];
            let originalPiece = src.pieces[0];
            let clonedPiece = Object.create(Object.getPrototypeOf(originalPiece));
            Object.assign(clonedPiece, originalPiece);

            let fakePoly = new PolyPiece(clonedPiece);
            fakePoly.isFake = true;
            fakePoly.rot = Math.floor(Math.random() * 6);
            fakePoly.markedByMirror = false;

            // Random jittered start position near a real slot (tighter)
            const p = gridPositions[Math.floor(Math.random() * gridPositions.length)];
            fakePoly.moveTo(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.5) * 40);

            puzzle.polyPieces.push(fakePoly);
        }
        // Shuffle will be handled by the global caller shuffleAllPieces()
    }

    shuffleAllPieces() {
        if (!puzzle || !puzzle.polyPieces || puzzle.polyPieces.length === 0) return;

        const allPieces = puzzle.polyPieces;
        const allPositions = allPieces.map(p => ({ x: p.x, y: p.y }));
        const allRotations = allPieces.map(p => p.rot);

        // Fisher-Yates piece identities
        for (let i = allPieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPieces[i], allPieces[j]] = [allPieces[j], allPieces[i]];
        }

        // Re-assign positions and randomize all rotations (for non-fixed pieces)
        allPieces.forEach((p, i) => {
            // Apply a subtle centering force (15%) to keep pieces from flying to edges
            const cx = puzzle.contWidth / 2;
            const cy = puzzle.contHeight / 2;
            const tx = cx + (allPositions[i].x - cx) * 0.85;
            const ty = cy + (allPositions[i].y - cy) * 0.85;

            p.moveTo(tx, ty);
            // Only randomize rotation if the level allows it
            if (puzzle.rotationStep > 0) {
                if (p.rot !== 0 || Math.random() > 0.3) {
                    p.rot = Math.floor(Math.random() * puzzle.nbRot);
                }
            } else {
                p.rot = 0;
            }
        });

        puzzle.drawPolyPieces();
    }

    startTimer() {
        this.timerSeconds = this.currentLevel.time;
        this.updateTimerDisplay();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            this.updateTimerDisplay();

            if (this.timerSeconds <= 0) {
                this.timerSeconds = 0;
                this.isOvertime = true;
                this.stopTimer();
                const timerWrap = document.getElementById('hud-timer');
                timerWrap.style.color = '#ff4d4d';
                document.getElementById('timer-display').innerText = "超时";
            } else if (this.timerSeconds <= 10) {
                const timerWrap = document.getElementById('hud-timer');
                timerWrap.style.color = (this.timerSeconds % 2 === 0) ? '#ff4d4d' : 'white';
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        document.getElementById('hud-timer').style.color = 'white';
    }

    updateTimerDisplay() {
        const m = Math.floor(Math.abs(this.timerSeconds) / 60).toString().padStart(2, '0');
        const s = (Math.abs(this.timerSeconds) % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').innerText = `${m}:${s}`;
    }

    earnCoins(amount) {
        this.coins += amount;
        this.updateHUD();
        this.saveData();

        const disp = document.getElementById('coins-display');
        const parent = disp.parentElement;
        if (parent) {
            parent.classList.add('animate-pulse');
            setTimeout(() => parent.classList.remove('animate-pulse'), 500);
        }
    }

    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            this.updateHUD();
            this.saveData();
            return true;
        }
        return false;
    }

    updateHUD() {
        const disp = document.getElementById('coins-display');
        if (disp) disp.innerText = this.coins;
    }

    showNotice(msg) {
        const modal = document.getElementById('notice-modal');
        const text = document.getElementById('notice-text');
        if (modal && text) {
            text.innerText = msg;
            modal.classList.remove('hidden');
        }
    }

    loseGame() {
        this.isPlaying = false;
        this.stopTimer();
        this.stopEnvUpdate();

        // 润笔费：极少量保底
        const baseReward = Math.floor(this.currentLevel.pieces * 0.2);

        setTimeout(() => {
            const screen = document.getElementById('game-over-screen');
            screen.classList.remove('hidden');
            screen.querySelector('h2').innerText = "修复未成";
            screen.querySelector('h2').style.color = "#a0a0a0";
            document.getElementById('game-over-text').innerText = `此次修复无功而返，仅得润笔费：${baseReward} 古钱币。\n再接再厉。`;
            this.earnCoins(baseReward);
        }, 500);
    }

    winGame() {
        this.isPlaying = false;
        this.stopTimer();
        this.stopEnvUpdate();

        const level = this.currentLevel;
        // 奖励重构：基础奖励 = 碎片数 * 基础系数 * 章节倍率
        const baseFactor = 3;
        const chapterMult = [1, 1.5, 2.2, 3.5][level.chapter - 1];
        const baseReward = Math.floor(level.pieces * baseFactor * chapterMult);

        let reward = 0;
        if (this.isOvertime) {
            // 超时仅得一半基础奖金
            reward = Math.floor(baseReward * 0.5);
        } else {
            // 时间奖励：剩余时间越多，额外奖金越高（最高额外奖励基础值的 100%）
            const timeBonus = Math.floor(baseReward * (this.timerSeconds / level.time));
            reward = baseReward + timeBonus;
        }

        reward = Math.max(reward, 50); // 全场最低奖
        this.earnCoins(reward);

        const levelIndex = Levels.findIndex(l => l.id === this.currentLevel.id);
        if (levelIndex >= this.highestLevelIndex && levelIndex < Levels.length - 1) {
            this.highestLevelIndex = levelIndex + 1;
        }
        this.saveData();

        setTimeout(() => {
            const screen = document.getElementById('game-over-screen');
            screen.classList.remove('hidden');
            screen.querySelector('h2').innerText = this.isOvertime ? "勉力修复" : "完美修复！";
            screen.querySelector('h2').style.color = this.isOvertime ? "#c0c0c0" : "#d4af37";
            document.getElementById('game-over-text').innerText = this.isOvertime
                ? `虽然超时，但画卷终得修复。领到酬劳：${reward} 币`
                : `修复大获全胜！获得奖金：${reward} 币 (包含 ${Math.floor(reward - baseReward)} 币时间奖励)`;
        }, 800);
    }
}
