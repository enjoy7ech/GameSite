import { puzzle } from '../core/Engine.js';

export class ItemSystem {
    constructor(gameManager) {
        this.gm = gameManager;
        
        this.costs = { censer: 400, brush: 250, shovel: 300, lamp: 500, mirror: 800, bead: 600, compass: 1000, umbrella: 700 };
        this.cds = { censer: 30, brush: 180, shovel: 10, lamp: 60, mirror: 45, bead: 60, compass: 0, umbrella: 0 };
        
        this.cdTimers = { censer: 0, brush: 0, shovel: 0, lamp: 0, mirror: 0, bead: 0, compass: 0, umbrella: 0 };
        this.chargeMax = { censer: [6, 4, 3], brush: [5, 4, 3], mirror: [3, 2, 1] };
        this.effectPower = { censer: [2, 3, 5], brush: [4, 8, 15], mirror: [1, 1, 1], umbrella: [180, 300, 450] };
        
        this.shovelActive = false;
        this.lampActive = false;
        this.mirrorActive = false;
        this.beadActive = false;
        this.censerActive = false;
        this.umbrellaActive = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.censerCharges = 0;
        this.hoveredMirrorPiece = null;
        
        this.bindEvents();
    }

    bindEvents() {
        // In-game item buttons
        document.getElementById('item-censer').addEventListener('click', () => this.handleItemCD('censer', () => this.useCenser()));
        document.getElementById('item-brush').addEventListener('click', () => this.handleItemCD('brush', () => this.useBrush()));
        document.getElementById('item-shovel').addEventListener('click', () => this.handleItemCD('shovel', () => this.useShovel()));
        document.getElementById('item-lamp').addEventListener('click', () => this.handleItemCD('lamp', () => this.useLamp()));
        document.getElementById('item-mirror').addEventListener('click', () => this.handleItemCD('mirror', () => this.useMirror()));
        document.getElementById('item-bead').addEventListener('click', () => this.handleItemCD('bead', () => this.useBead()));
        document.getElementById('item-compass').addEventListener('click', () => this.handleItemCD('compass', () => this.useCompass()));
        document.getElementById('item-umbrella').addEventListener('click', () => this.handleItemCD('umbrella', () => this.useUmbrella()));

        // Add global click listener for targeted items (like Censer)
        document.addEventListener('mousedown', (e) => this.handleGlobalClick(e), true);

        // Shop buy buttons
        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.buyItem(id, e.target);
            });
        });

        // Shop upgrade buttons
        document.querySelectorAll('.btn-upgrade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id.replace('-upg', '');
                this.upgradeItem(id, e.target);
            });
        });

        // Shovel & Mirror cursor tracking
        document.addEventListener('mousemove', (e) => {
            if (puzzle) {
                const rect = puzzle.container.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.mouseY = e.clientY - rect.top;
            }

            if (this.shovelActive) {
                this.updateShovelMirror(e.clientX, e.clientY);
            }
            if (this.mirrorActive) {
                this.updateMirrorReveal(e.clientX, e.clientY);
            }
            if (this.umbrellaActive && this.gm.currentLevel && this.gm.currentLevel.evt.includes('blurring')) {
                if (puzzle) {
                    puzzle.drawPolyPieces(); 
                }
            }
        });
    }

    drawUmbrellaVisual() {
        if (!this.umbrellaActive || !puzzle) return;
        const lx = this.mouseX;
        const ly = this.mouseY;

        const level = (this.gm.itemLevels && this.gm.itemLevels.umbrella) || 1;
        const radius = this.effectPower.umbrella[level - 1];

        const ctx = puzzle.playCtx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(lx, ly, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line for a "spiritual" look
        ctx.stroke();
        
        // Add a subtle glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#d4af37';
        ctx.stroke();
        ctx.restore();
    }

    buyItem(id, btnElement) {
        if (this.gm.unlockedItems[id]) return; // already bought
        if (this.gm.spendCoins(this.costs[id])) {
            this.gm.unlockedItems[id] = true;
            if (id === 'shovel' && !this.gm.itemLevels) this.gm.itemLevels = {};
            if (id === 'shovel') this.gm.itemLevels.shovel = 1;
            
            this.gm.saveData(); // Persist unlock
            btnElement.innerText = '售罄';
            btnElement.classList.add('sold-out');
            
            // Show upgrade button if applicable
            const upgBtn = document.querySelector(`.btn-upgrade[data-id="${id}-upg"]`);
            if (upgBtn) upgBtn.classList.remove('hidden');

            // Immediately show it in the game HUD if we happen to buy it during a game
            this.updateHUDVisibility();
        } else {
            this.gm.showNotice('古钱币不足，无法结缘此法宝！');
        }
    }
    upgradeItem(id, btnElement) {
        const currentLevel = this.gm.itemLevels[id] || 1;
        if (currentLevel >= 3) return;
        
        // Censer has higher premium upgrade costs
        let upgradeCost = currentLevel === 1 ? 500 : 1000;
        if (id === 'censer') {
            upgradeCost = currentLevel === 1 ? 1200 : 2500;
        }

        if (this.gm.spendCoins(upgradeCost)) {
            this.gm.itemLevels[id] = currentLevel + 1;
            this.gm.saveData();
            
            if (this.gm.itemLevels[id] >= 3) {
                btnElement.innerText = '已满级 (Lv.3)';
                btnElement.disabled = true;
            } else {
                btnElement.innerText = `升级 (Lv.${this.gm.itemLevels[id]})`;
            }
            const itemName = {
                'censer': '焚香炉',
                'brush': '灵笔',
                'shovel': '洛阳铲',
                'lamp': '琉璃灯',
                'mirror': '明心鉴',
                'bead': '定风珠',
                'compass': '寻龙尺',
                'umbrella': '油纸伞'
            }[id] || id;

            this.gm.showNotice(`${itemName} 灵效大增！当前等级: ${this.gm.itemLevels[id]}`);
        } else {
            this.gm.showNotice('余额不足，尚不能提升此法宝灵力。');
        }
    }
    
    resetLevelState() {
        this.lampActive = false;
        this.mirrorActive = false;
        this.beadActive = false;
        this.shovelActive = false;
        this.censerActive = false;
        
        // Reset Charges - All items enter the level FULLY CHARGED
        if (!this.charges) this.charges = { censer: 0, brush: 0, mirror: 0 };
        
        ['censer', 'brush', 'mirror'].forEach(id => {
            const level = (this.gm.itemLevels && this.gm.itemLevels[id]) || 1;
            this.charges[id] = this.chargeMax[id][level - 1];
            this.updateChargeUI(id, this.chargeMax[id][level - 1]);
        });

        // Reset all cooldowns (time-based items like Shovel, Lamp, Bead)
        for (const id in this.cdTimers) {
            this.cdTimers[id] = 0;
            const btn = document.getElementById(`item-${id}`);
            if (btn) {
                const overlay = btn.querySelector('.cd-overlay');
                // Charge UI already handled by updateChargeUI above
                if (overlay && !['censer', 'brush', 'mirror'].includes(id)) {
                    overlay.style.height = '0%';
                }
                btn.style.pointerEvents = 'auto';
                btn.classList.remove('active');
                btn.style.filter = 'none';
            }
        }

        this.updateHUDVisibility();
        
        // Hook into puzzle merge event
        if (puzzle) {
            puzzle.onMerge = () => this.addCharge();
        }
    }
    
    addCharge() {
        if (!this.gm.isPlaying) return;
        
        if (this.gm.unlockedItems['censer']) {
            const clvl = this.gm.itemLevels['censer'] || 1;
            const maxC = this.chargeMax.censer[clvl - 1];
            if (this.charges.censer < maxC) {
                this.charges.censer++;
                this.updateChargeUI('censer', maxC);
            }
        }
        
        if (this.gm.unlockedItems['brush']) {
            const blvl = this.gm.itemLevels['brush'] || 1;
            const maxB = this.chargeMax.brush[blvl - 1];
            if (this.charges.brush < maxB) {
                this.charges.brush++;
                this.updateChargeUI('brush', maxB);
            }
        }

        if (this.gm.unlockedItems['mirror']) {
            const mlvl = this.gm.itemLevels['mirror'] || 1;
            const maxM = this.chargeMax.mirror[mlvl - 1];
            if (this.charges.mirror < maxM) {
                this.charges.mirror++;
                this.updateChargeUI('mirror', maxM);
            }
        }
    }

    updateChargeUI(id, max) {
        const btn = document.getElementById(`item-${id}`);
        const overlay = btn.querySelector('.cd-overlay');
        if (overlay) {
            const pct = (1 - (this.charges[id] / max)) * 100;
            overlay.style.height = `${pct}%`;
        }
        if (this.charges[id] >= max) {
            // Provide a small visual pop when charged
            btn.style.animation = 'badge-pop 0.3s';
            setTimeout(() => btn.style.animation = '', 300);
        }
    }

    updateHUDVisibility() {
        // Show only unlocked items in the in-game tray
        ['compass', 'umbrella', 'censer', 'brush', 'shovel', 'lamp', 'mirror', 'bead'].forEach(id => {
            const btn = document.getElementById(`item-${id}`);
            if (this.gm.unlockedItems[id]) {
                btn.classList.remove('hidden');
                this.updateBadge(id);
            } else {
                btn.classList.add('hidden');
            }
        });
    }

    updateBadge(id) {
        const badge = document.getElementById(`item-${id}-badge`);
        if (!badge) return;
        
        if (id === 'censer') {
            badge.innerText = this.censerCharges || 0;
            badge.classList.remove('hidden');
            // Add a small pop animation
            badge.style.animation = 'none';
            badge.offsetHeight; // trigger reflow
            badge.style.animation = 'badge-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        } else {
            badge.classList.add('hidden');
        }
    }

    handleItemCD(id, effectFn) {
        if (!this.gm.isPlaying || this.gm.isPaused) return;
        
        // Items that are toggles or CD-less
        if (id === 'shovel' || id === 'lamp' || id === 'compass' || id === 'umbrella') {
            effectFn();
            return;
        }

        // Shovel, Lamp, Bead are Time CDs
        if (id !== 'censer' && id !== 'brush' && id !== 'mirror' && this.cdTimers[id] > 0) return;
        
        // Censer, Brush, Mirror are Charge based
        if (id === 'censer') {
            const clvl = this.gm.itemLevels['censer'] || 1;
            const maxC = this.chargeMax.censer[clvl - 1];
            if (this.censerActive || this.charges.censer < maxC) return;
        }
        if (id === 'brush') {
            const blvl = this.gm.itemLevels['brush'] || 1;
            const maxB = this.chargeMax.brush[blvl - 1];
            if (this.charges.brush < maxB) return;
        }
        if (id === 'mirror') {
            const mlvl = this.gm.itemLevels['mirror'] || 1;
            const maxM = this.chargeMax.mirror[mlvl - 1];
            if (this.mirrorActive || this.charges.mirror < maxM) return;
        }
        
        // Apply effect
        effectFn();
        
        // Start CD for non-charge items
        if (id !== 'censer' && id !== 'brush' && id !== 'mirror') {
            this.startCooldown(id, this.cds[id]);
        }
    }
    
    startCooldown(id, seconds) {
        this.cdTimers[id] = seconds;
        const btn = document.getElementById(`item-${id}`);
        const overlay = btn.querySelector('.cd-overlay');
        
        btn.style.pointerEvents = 'none';
        
        const updateCD = () => {
            if (!this.gm.isPlaying) return;
            if (this.gm.isPaused) {
                setTimeout(updateCD, 100);
                return;
            }
            if (this.cdTimers[id] <= 0) {
                overlay.style.height = '0%';
                btn.style.pointerEvents = 'auto';
                return;
            }
            const pct = (this.cdTimers[id] / seconds) * 100;
            overlay.style.height = `${pct}%`;
            this.cdTimers[id] -= 0.1;
            setTimeout(updateCD, 100);
        };
        updateCD();
    }

    useCenser() {
        this.censerActive = true;
        document.getElementById('item-censer').classList.add('active');
    }

    handleGlobalClick(e) {
        if (!this.censerActive || !this.gm.isPlaying || this.gm.isPaused || !puzzle) return;
        
        // Check if we clicked on the puzzle canvas
        const puzzleRect = puzzle.container.getBoundingClientRect();
        const mx = e.clientX - puzzleRect.left;
        const my = e.clientY - puzzleRect.top;
        
        const pp = puzzle.polyPieces.find(p => p.isPointInPath({x: mx, y: my}));
        
        if (pp) {
            // STOP propagation so Engine.js doesn't pick it up as a normal drag/rotate
            e.stopPropagation();
            e.preventDefault();
            
            this.performTargetedCenser(pp);
        }
    }
    
    performTargetedCenser(pp) {
        if (!pp) return;
        
        // 1. Find all physical neighbors that logically belong next to pp
        const neighbors = [];
        for (const other of puzzle.polyPieces) {
            if (other === pp) continue;
            
            let isNeighborGroup = false;
            for (const pc1 of pp.pieces) {
                for (const side of pc1.sides) {
                    if (side.polys.length === 2) {
                        const pc2 = (side.polys[0] === pc1) ? side.polys[1] : side.polys[0];
                        if (pc2.poly === other) {
                            isNeighborGroup = true;
                            break;
                        }
                    }
                }
                if (isNeighborGroup) break;
            }

            if (isNeighborGroup) {
                neighbors.push(other);
            }
        }

        const clvl = this.gm.itemLevels['censer'] || 1;
        const maxEffect = this.effectPower.censer[clvl - 1];
        
        let targetNeighbors = neighbors;
        if (neighbors.length > maxEffect) {
            targetNeighbors = neighbors.sort(() => Math.random() - 0.5).slice(0, maxEffect);
        }

        if (targetNeighbors.length === 0) {
            this.gm.showNotice('此残片周围暂无邻近碎片。');
            return;
        }

        // 2. Animate neighbors towards target pp (pp stays still)
        puzzle.disableMergeEvent = true;
        this.animateMagneticAttraction(pp, targetNeighbors);

        // 3. Single-use: Deactivate and deplete charge
        this.censerActive = false;
        this.charges.censer = 0;
        this.updateChargeUI('censer', this.chargeMax.censer[clvl - 1]);
        
        const btn = document.getElementById('item-censer');
        if (btn) btn.classList.remove('active');
        
        // Re-enable merge hook after animation is theoretically done (we'll do it safely via a timeout or wait)
        setTimeout(() => {
            puzzle.disableMergeEvent = false;
        }, 1000);
    }

    animateMagneticAttraction(target, neighbors) {
        const duration = 600; // ms
        const startTime = performance.now();
        
        // Store initial states for lerping
        const initialStates = neighbors.map(n => ({
            obj: n,
            startX: n.x,
            startY: n.y,
            startRot: n.rot
        }));

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            initialStates.forEach(s => {
                // Target position for neighbor is same as target piece pp
                s.obj.x = s.startX + (target.x - s.startX) * ease;
                s.obj.y = s.startY + (target.y - s.startY) * ease;
                
                // Rotations are tricky - snap to target.rot early or lerp if possible
                if (progress > 0.5) s.obj.rot = target.rot;
                
                s.obj.setTransforms();
            });

            puzzle.drawPolyPieces();

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                // Final merge
                neighbors.forEach(n => target.merge(n));
                target.isMergeHighlight = true;
                setTimeout(() => {
                    target.isMergeHighlight = false;
                    puzzle.drawPolyPieces();
                }, 500);
                
                puzzle.evaluateOrder();
                puzzle.drawPolyPieces();
            }
        };

        requestAnimationFrame(step);
    }

    useBrush() {
        if(puzzle && puzzle.polyPieces) {
            const level = (this.gm.itemLevels && this.gm.itemLevels.brush) || 1;
            const count = this.effectPower.brush[level - 1];

            // Filter only rotated pieces
            const rotatedPieces = puzzle.polyPieces.filter(p => p.rot !== 0);
            if (rotatedPieces.length === 0) {
                this.gm.showNotice('所有残片方位已正，无需动笔。');
                return;
            }
            
            // Consume charge
            this.charges.brush = 0;
            this.updateChargeUI('brush', this.chargeMax.brush[level - 1]);
            
            // Shuffle and pick
            const toFix = rotatedPieces
                .sort(() => Math.random() - 0.5)
                .slice(0, count);
                
            toFix.forEach(p => { 
                p.rotate(0); 
                p.setTransforms();
                p.isItemHighlight = true;
                p.fixedByBrush = true; // Mark as fixed
            });
            puzzle.drawPolyPieces();
        }
    }

    useLamp() {
        if (!this.gm.currentLevel.evt.includes('fog')) {
            this.gm.showNotice('当前没有迷雾，不需要使用提灯！');
            return;
        }
        
        this.lampActive = !this.lampActive;
        const btn = document.getElementById('item-lamp');
        if (this.lampActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    useMirror() {
        if (!this.gm.currentLevel.evt.includes('fake')) {
            this.gm.showNotice('本局没有伪造碎片干扰，无需使用明心鉴！');
            return;
        }
        
        const level = (this.gm.itemLevels && this.gm.itemLevels.mirror) || 1;

        // Find unmarked fakes
        const unmarkedFakes = (puzzle.polyPieces || []).filter(p => p.isFake && !p.markedByMirror);
        
        if (unmarkedFakes.length === 0) {
            this.gm.showNotice('场上已无可疑痕迹，明心鉴亦无法再见更多。');
            return;
        }

        // Consume charges
        this.charges.mirror = 0;
        this.updateChargeUI('mirror', this.chargeMax.mirror[level - 1]);

        // Select 1 random unmarked fake and mark it
        const target = unmarkedFakes[Math.floor(Math.random() * unmarkedFakes.length)];
        target.markedByMirror = true;
        target.isItemHighlight = true; // Briefly pulse red

        if (puzzle) puzzle.drawPolyPieces();
        // Reduced notice frequency: only show if level is 1
        if (level === 1) this.gm.showNotice(`明心鉴显灵，已标记 1 处伪作。`);
    }

    useBead() {
        if (!['drifting'].some(e => this.gm.currentLevel.evt.includes(e))) {
            this.gm.showNotice('风未起，无需动用定风珠。');
            this.cdTimers['bead'] = 0;
            return;
        }
        
        const level = (this.gm.itemLevels && this.gm.itemLevels.bead) || 1;
        const duration = [15000, 30000, 60000][level - 1];
        
        this.beadActive = true;
        const btn = document.getElementById('item-bead');
        const indicator = document.getElementById('wind-indicator');
        
        btn.classList.add('active');
        if (indicator) {
            const windText = document.getElementById('wind-text');
            const subText = document.getElementById('wind-subtext');
            if (windText) {
                windText.innerText = '风投波息';
                windText.style.color = '#4fc3f7';
            }
            if (subText) subText.classList.add('hidden');
        }
        
        setTimeout(() => {
            this.beadActive = false;
            btn.classList.remove('active');
            if (indicator) {
                const windText = document.getElementById('wind-text');
                const subText = document.getElementById('wind-subtext');
                if (windText) {
                    windText.innerText = '风起大漠 ⭆';
                    windText.style.color = 'rgba(255,255,255,0.4)';
                }
                if (subText) subText.classList.remove('hidden');
            }
        }, duration);
    }
    
    useCompass() {
        if (puzzle) {
            puzzle.showImage(true);
        }
    }

    useUmbrella() {
        if (!this.gm.currentLevel.evt.includes('blurring')) {
            this.gm.showNotice('晴空万里，画意通透，无需动用油纸伞。');
            return;
        }

        this.umbrellaActive = !this.umbrellaActive;
        const btn = document.getElementById('item-umbrella');
        btn.classList.toggle('active', this.umbrellaActive);
        
        if (puzzle) puzzle.drawPolyPieces();
    }

    updateMirrorReveal(mx, my) {
        if (!puzzle || !this.mirrorActive) return;
        
        // Check if we found a piece
        const puzzleRect = puzzle.container.getBoundingClientRect();
        const localX = mx - puzzleRect.left;
        const localY = my - puzzleRect.top;
        
        const pp = puzzle.polyPieces.find(p => p.isPointInPath({x: localX, y: localY}));
        
        if (this.hoveredMirrorPiece !== pp) {
            this.hoveredMirrorPiece = pp;
            puzzle.drawPolyPieces(); // This will trigger drawImage which handles the fake effect
        }
    }

    useShovel() {
        this.shovelActive = !this.shovelActive;
        
        const btn = document.getElementById('item-shovel');
        if (this.shovelActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
            if (puzzle) puzzle.drawPolyPieces(); // Clear the reveal circle
        }
    }

    updateShovelMirror(mx, my) {
        if (!puzzle || !this.shovelActive) return;
        
        if (this.gm.currentLevel.evt.includes('drifting') && !this.beadActive) {
            return; // Effect is suppressed by sandstorm
        }

        // logic moved to drawShovelReveal for consistent main-loop rendering
        puzzle.drawPolyPieces();
    }

    drawShovelReveal() {
        if (!puzzle || !this.shovelActive) return;
        
        // Find if a piece is under cursor using stored coordinates
        const hoveredPiece = puzzle.polyPieces.find(p => p.isPointInPath({x: this.mouseX, y: this.mouseY}));
        if (!hoveredPiece) return;

        const level = (this.gm.itemLevels && this.gm.itemLevels.shovel) || 1;
        const radius = [100, 180, 280][level - 1];
        
        const ctx = puzzle.playCtx;
        ctx.save();
        
        // Center of the reveal (current physical position of the piece)
        const displayCenter = hoveredPiece.fromSrcMatrix.transformPoint(hoveredPiece.pCentre);
        
        // Draw the reveal circle at the piece's center
        const circle = new Path2D();
        circle.arc(displayCenter.x, displayCenter.y, radius, 0, Math.PI * 2);
        ctx.clip(circle);
        
        // REVEAL LOGIC: 
        // Move to bottom layer so it doesn't cover the puzzle piece
        ctx.globalCompositeOperation = 'destination-over';
        ctx.globalAlpha = 0.5; // Slightly increased for visibility
        
        const scale = puzzle.scale;
        ctx.setTransform(scale, 0, 0, scale, displayCenter.x - hoveredPiece.pCentre.x * scale, displayCenter.y - hoveredPiece.pCentre.y * scale);
        
        ctx.drawImage(puzzle.srcImage, 0, 0);
        
        // Clear transform and effect for border (Border should be on top)
        ctx.resetTransform();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke(circle);
        
        ctx.restore();
    }
}
