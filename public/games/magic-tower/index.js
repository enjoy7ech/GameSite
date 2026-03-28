// MAGIC TOWER: CYBER EDITION - THE MAZE & GEAR UPDATE
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 44;
const GRID_SIZE = 11;

// Hero state
const hero = {
    x: 5, y: 9, // Start in front of the stairs to be safe
    visualX: 5, visualY: 9,
    hp: 12000,
    atk: 50,
    def: 50,
    gold: 0,
    shopBuys: 0,
    keys: { yellow: 1, blue: 0, red: 0 },
    floor: 1,
    maxFloor: 1,
    icon: '💃🏽',
    equipment: {
        sword: false, shield: false, sword2: false, shield2: false,
        reli1: false, reli2: false, reli3: false,
        antiTrapFixed: 0, antiTrapBio: 0, // Tiered reduction (0-4)
        reliVamp: false, reliPen: false, reliPierce: false
    },
    gems: { atk: 0, def: 0 }, // Picked up gems (Modules)
    shopStats: {}, // Store per-floor buy counts
    lastMoveTime: 0,
    heroGemUpgrades: { atkPen: 0, defRes: 0 },
    deathWarning: false,
    debugMode: false
};

const INITIAL_HERO = JSON.parse(JSON.stringify(hero));

const EMPTY = 0; const WALL = 1; const MAGMA = 2;
const STAIRS_UP = 3; const STAIRS_DN = 4;
const EXIT = 9;
const DOOR_Y = 20; const DOOR_B = 21; const DOOR_R = 22;
const KEY_Y = 10; const KEY_B = 11; const KEY_R = 12;
const DOORS_END = 22;
const POT_R = 25; const POT_B = 26;
const GEM_R = 27; const GEM_B = 28;
const SWORD = 29; const SHIELD = 30;
const SWORD2 = 31; const SHIELD2 = 32;
const SHOP = 33; const TRAP = 34; // Laser (Fixed, Consumable)
const TRAP_PERC = 38; // Toxin (%, Consumable)
const TRAP_PERM = 39; // Radiation (Fixed, Permanent)
const RELI_VAMP = 41; // Lifesteal (Permanent)
const RELI_PIERCE = 45; // True Damage (Permanent)
const RELI_HP = 35; const RELI_ATK = 36; const RELI_GOLD = 37; const RELI_PEN = 44;
const replayLog = [];
function recordAction(m, p) {
    replayLog.push({ t: Date.now(), f: hero.floor, m, h: hero.hp, a: hero.atk, d: hero.def, g: hero.gold, ...p });
}

function log(msg, color = '#888') {
    // Console log for debug, actual replay system records all
    console.log(`%c[CORE] ${msg}`, `color: ${color}`);
}

const monsterStats = {
    // Stage 1 (1-10): The ATK Gauntlet
    100: { name: '生化黏液 (绿)', hp: 300, atk: 75, def: 5, gold: 1, icon: '🟢' },
    101: { name: '生化黏液 (红)', hp: 600, atk: 120, def: 8, gold: 2, icon: '🔴' },
    102: { name: '侦察无人机', hp: 500, atk: 155, def: 12, gold: 3, icon: '🛸' },
    34: { name: '激光陷阱', hp: 'N/A', atk: 300, def: 'N/A', gold: 'N/A', icon: '⚡' },
    103: { name: '低阶安保', hp: 1200, atk: 90, def: 25, gold: 5, icon: '👮' },
    124: { name: '失控电子犬', hp: 1000, atk: 110, def: 15, gold: 4, icon: '🐕‍🦺' },
    117: { name: '拆除蛛形雷', hp: 500, atk: 180, def: 0, gold: 5, icon: '🕷️', pen: 5 },
    118: { name: '废弃履带车', hp: 2000, atk: 130, def: 25, gold: 6, icon: '🚜', pen: 8 },

    // Stage 2 (11-20): The Iron Lab
    104: { name: '培养皿克隆体', hp: 4000, atk: 180, def: 35, gold: 10, icon: '🧟', regen: 30 },
    105: { name: '高周波切割机', hp: 3000, atk: 250, def: 40, gold: 12, icon: '🪚' },
    106: { name: '重装防暴警', hp: 6000, atk: 155, def: 105, gold: 15, icon: '🪖', pen: 10 },
    107: { name: '光学迷彩渗透者', hp: 2000, atk: 550, def: 35, gold: 18, icon: '🥷', pen: 100 },
    125: { name: '防爆突击兵', hp: 3000, atk: 420, def: 80, gold: 16, icon: '⚔️' },
    119: { name: '下水道钻探虫', hp: 8000, atk: 450, def: 999, gold: 20, icon: '🐛', regen: 280, pen: 120 },
    120: { name: '死光炮台', hp: 1200, atk: 750, def: 10, gold: 25, icon: '📡', pen: 340 },

    // Stage 3: The Wasteland (21-30) - Lethality Restored
    108: { name: '废土拾荒者', hp: 35000, atk: 620, def: 120, gold: 35, icon: '🧟‍♂️', regen: 120, pen: 120 },
    109: { name: '重型装甲车', hp: 60000, atk: 680, def: 280, gold: 40, icon: '🚎', pen: 120 },
    110: { name: '高爆轰炸机', hp: 45000, atk: 820, def: 180, gold: 45, icon: '🛩️', pen: 120 },
    126: { name: '变异感染体', hp: 30000, atk: 980, def: 100, gold: 38, icon: '👽', regen: 300 },
    121: { name: '生化合成兽', hp: 85000, atk: 1060, def: 620, gold: 50, icon: '🦖', pen: 120 },
    122: { name: '电磁轨道炮', hp: 30000, atk: 1250, def: 140, gold: 60, icon: '🔋', pen: 120 },

    // Stage 4: The Inner Core (31-40) - Brutal Grind
    111: { name: '母体近卫军', hp: 120000, atk: 950, def: 250, gold: 80, icon: '🦾', pen: 125 },
    112: { name: '逻辑执行官', hp: 180000, atk: 1200, def: 350, gold: 90, icon: '🦹', pen: 215 },
    113: { name: '暴君原型机', hp: 250000, atk: 1050, def: 500, gold: 100, icon: '🤖', pen: 250 },
    129: { name: '自爆核弹', hp: 20000, atk: 3500, def: 0, gold: 120, icon: '💣', pen: 999 },
    127: { name: '治安终结者', hp: 300000, atk: 2500, def: 450, gold: 100, icon: '🚔', pen: 275 },
    123: { name: '裂变反应堆', hp: 200000, atk: 3200, def: 300, gold: 120, icon: '☢️', pen: 300 },

    // Stage 5: Virtual Void (41-50) - Nightmare Persistence
    114: { name: '数字幻影', hp: 500000, atk: 4500, def: 800, gold: 150, icon: '👥', pen: 40 },
    128: { name: '防火墙卫士', hp: 800000, atk: 6000, def: 1200, gold: 200, icon: '🧱', pen: 45 },
    115: { name: '病毒聚合体', hp: 1200000, atk: 8500, def: 900, gold: 200, icon: '🦠', pen: 55 },
    116: { name: '格式化程序', hp: 2500000, atk: 15000, def: 1500, gold: 300, icon: '💻', pen: 65 },

    // Bosses - 30% Nerf Implemented
    200: { name: '机甲捍卫者 [BOSS]', hp: 9500, atk: 175, def: 105, gold: 200, icon: '🤖', isBoss: true, pen: 60 },
    201: { name: '超脑核心 [BOSS]', hp: 13600, atk: 555, def: 375, gold: 500, icon: '🧠', isBoss: true, pen: 100 },
    202: { name: '铁血主宰 [BOSS]', hp: 210000, atk: 975, def: 455, gold: 1000, icon: '🌋', isBoss: true, pen: 130 },
    203: { name: '虚空神父 [BOSS]', hp: 560000, atk: 3575, def: 1875, gold: 5000, icon: '🕋', isBoss: true, pen: 260 },
    204: { name: '赛博上帝 [FINAL]', hp: 2450000, atk: 10500, def: 3000, gold: 0, icon: '👁️', isBoss: true, pen: 300 },

    // SPECIAL: Void Mobs (Need Penetration)
    900: { name: '虚空幽灵', hp: 6000, atk: 1200000, def: 999999, gold: 100, icon: '👻' },
    901: { name: '绝对之盾', hp: 9000, atk: 1350000, def: 999999, gold: 500, icon: '🛡️' },

    // Elites
    150: { name: '虚空监视者', hp: 150000, atk: 350, def: 200, gold: 500, icon: '👁‍🗨', pen: 40 },
    151: { name: '数据吞噬者', hp: 600000, atk: 700, def: 400, gold: 1200, icon: '🐲', pen: 60 },
    152: { name: '纳米禁卫军', hp: 9000, atk: 180, def: 85, gold: 400, icon: '💂', pen: 35 }
};


function showShopTooltip(gx, gy) {
    const rect = canvas.getBoundingClientRect();
    const panel = document.getElementById('floating-shop');
    updateShopUI();
    panel.style.display = 'block';

    const tx = rect.left + gx * (rect.width / GRID_SIZE);
    const ty = rect.top + gy * (rect.height / GRID_SIZE);

    panel.style.left = `${tx - 60}px`;
    panel.style.top = `${ty - 80}px`;
}

function hideShopTooltip() {
    document.getElementById('floating-shop').style.display = 'none';
}

// Custom Premium Tooltip Logic (Global)
window.showTooltip = function (e, content) {
    const tooltip = document.getElementById('custom-tooltip');
    if (!content) return;
    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
    window.moveTooltip(e);
};

window.moveTooltip = function (e) {
    const tooltip = document.getElementById('custom-tooltip');
    if (!tooltip) return;
    const offset = 15;
    let x = e.clientX + offset;
    let y = e.clientY + offset;

    // Bounds check
    if (x + tooltip.offsetWidth > window.innerWidth) x = e.clientX - tooltip.offsetWidth - offset;
    if (y + tooltip.offsetHeight > window.innerHeight) y = e.clientY - tooltip.offsetHeight - offset;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
};

window.hideTooltip = function () {
    const tooltip = document.getElementById('custom-tooltip');
    if (tooltip) tooltip.style.display = 'none';
};


const biomes = [
    { start: 1, end: 10, name: '赛博底层', wall: '#1a1a2e', theme: '#00fff2' },
    { start: 11, end: 20, name: '生化实验室', wall: '#1a2e1a', theme: '#22ff22' },
    { start: 21, end: 30, name: '虚空境界', wall: '#2e1a2e', theme: '#aa00ff' },
    { start: 31, end: 40, name: '地狱核心', wall: '#2e1a1a', theme: '#ff0000' },
    { start: 41, end: 50, name: '主脑中枢', wall: '#2e2e1a', theme: '#ffff00' }
];

let floorCache = {};
let stairsPositions = {};

function generateFloor(f) {
    if (floorCache[f]) return floorCache[f];

    const map = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(WALL));
    const biome = biomes.find(b => f >= b.start && f <= b.end);

    if (f % 10 === 0) {
        // BOSS FLOOR - Mostly Fixed structure
        createBossChamber(map, f);
    } else {
        // MAZE GEN using Drunkard Walk + Path logic
        createLabyrinth(map, f);
    }

    // Set Stairs
    let upPos = { x: 5, y: 0 };
    let dnPos = { x: 5, y: 10 };

    // Final floor exit
    if (f === 50) map[1][5] = EXIT;
    else map[upPos.y][upPos.x] = STAIRS_UP;

    if (f > 1) {
        map[dnPos.y][dnPos.x] = STAIRS_DN;
    }

    stairsPositions[f] = { up: upPos, dn: dnPos };
    floorCache[f] = map;
    if (f === 7) {
        map[5][5] = KEY_R;
    }

    // Manually inject Floor 12 Secret Room if F12
    if (f === 12) {
        map[9][1] = RELI_PIERCE; // Unique Pierce Relic on F12
        map[9][2] = TRAP_PERC;
        map[9][3] = TRAP_PERC;
        map[9][4] = TRAP_PERC;
    }

    // FINAL ABSOLUTE OVERRIDE: Move shop to specified position (4, 5)
    if ([7, 14, 24, 34, 44].includes(f)) {
        map[5][4] = SHOP; // (row: 5, col: 4)
        console.log(`%c[CORE] Supply Station initialized on Floor ${f} at (4, 5)`, "color: #00fff2; font-weight: bold;");
    }

    return map;
}

function createBossChamber(map, f) {
    // Rigid Boss Chambers must aggressively clear their vertical spine 
    // to prevent the organic labyrinth walls from causing softlocks before/after.
    for (let r = 1; r < 10; r++) map[r][5] = EMPTY;

    // Create a horizontal barrier at row 5
    for (let x = 0; x < GRID_SIZE; x++) {
        map[5][x] = WALL;
    }

    // Core Boss Path
    const bossId = 200 + (Math.floor(f / 10) - 1);
    map[5][5] = bossId;
    map[7][5] = DOOR_R;
    map[6][5] = EMPTY; // Staging area
}

function checkConnectivity(map, start, end) {
    let visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    let q = [start];
    visited[start.y][start.x] = true;
    while (q.length > 0) {
        let curr = q.shift();
        if (curr.x === end.x && curr.y === end.y) return true;
        [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }].forEach(d => {
            let nx = curr.x + d.dx, ny = curr.y + d.dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && map[ny][nx] !== WALL && !visited[ny][nx]) {
                visited[ny][nx] = true;
                q.push({ x: nx, y: ny });
            }
        });
    }
    return false;
}

function createLabyrinth(map, f) {
    const seed = (s) => Math.abs(Math.sin(f * 12.34 + s * 1.5) * 10000) % 1;

    // 1. Initialize with walls
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            map[r][c] = WALL;
        }
    }

    // 2. Perfect Maze via DFS
    let stack = [{ r: 1, c: 1 }];
    map[1][1] = EMPTY;
    let step = 0;

    while (stack.length > 0) {
        let curr = stack[stack.length - 1];
        let dirs = [];
        if (curr.r > 2 && map[curr.r - 2][curr.c] === WALL) dirs.push({ dr: -2, dc: 0 });
        if (curr.r < GRID_SIZE - 3 && map[curr.r + 2][curr.c] === WALL) dirs.push({ dr: 2, dc: 0 });
        if (curr.c > 2 && map[curr.r][curr.c - 2] === WALL) dirs.push({ dr: 0, dc: -2 });
        if (curr.c < GRID_SIZE - 3 && map[curr.r][curr.c + 2] === WALL) dirs.push({ dr: 0, dc: 2 });

        if (dirs.length > 0) {
            let d = dirs[Math.floor(seed(step++) * dirs.length)];
            map[curr.r + d.dr / 2][curr.c + d.dc / 2] = EMPTY;
            map[curr.r + d.dr][curr.c + d.dc] = EMPTY;
            stack.push({ r: curr.r + d.dr, c: curr.c + d.dc });
        } else {
            stack.pop();
        }
    }

    // 3. Remove random walls to create MULTIPLE branches (N branches)
    const extraHoles = 12 + Math.floor(seed(f) * 8); // Generates 12 to 19 multi-path loops
    for (let i = 0; i < extraHoles; i++) {
        let r = 1 + Math.floor(seed(i * 7) * (GRID_SIZE - 2));
        let c = 1 + Math.floor(seed(i * 11) * (GRID_SIZE - 2));
        if (r % 2 !== c % 2) map[r][c] = EMPTY; // Connect rooms organically
    }

    // 4. Ensure stairs are reachable and clear (Force entrance/exit paths)
    for (let r = 0; r < 3; r++) map[r][5] = EMPTY;
    for (let r = 8; r < 11; r++) map[r][5] = EMPTY;
    map[5][5] = EMPTY; // Center hub safety

    // 5. Connect isolated bricks (Post-processing)
    for (let r = 1; r < GRID_SIZE - 1; r++) {
        for (let c = 1; c < GRID_SIZE - 1; c++) {
            if (map[r][c] === WALL) {
                let neighbors = 0;
                if (map[r - 1][c] === WALL) neighbors++;
                if (map[r + 1][c] === WALL) neighbors++;
                if (map[r][c - 1] === WALL) neighbors++;
                if (map[r][c + 1] === WALL) neighbors++;
                if (neighbors === 0) {
                    map[r - 1][c] = WALL;
                }
            }
        }
    }

    // 6. Guarantee connectivity (Flood Fill)
    if (!checkConnectivity(map, { x: 5, y: 9 }, { x: 5, y: 1 })) {
        for (let r = 1; r < 10; r++) map[r][5] = EMPTY; // fallback central spine
    }

    // 7. Cell Categorization
    let deadEnds = [];
    let chokePoints = [];
    let rooms = [];

    for (let r = 1; r < GRID_SIZE - 1; r++) {
        for (let c = 1; c < GRID_SIZE - 1; c++) {
            if (map[r][c] === EMPTY && !(r === 1 && c === 5) && !(r === 9 && c === 5)) {
                let walls = 0;
                if (map[r - 1][c] === WALL) walls++;
                if (map[r + 1][c] === WALL) walls++;
                if (map[r][c - 1] === WALL) walls++;
                if (map[r][c + 1] === WALL) walls++;

                const isHoriz = (map[r - 1][c] === WALL && map[r + 1][c] === WALL && map[r][c - 1] !== WALL && map[r][c + 1] !== WALL);
                const isVert = (map[r][c - 1] === WALL && map[r][c + 1] === WALL && map[r - 1][c] !== WALL && map[r + 1][c] !== WALL);

                if (walls === 3) deadEnds.push({ r, c });
                else if (isHoriz || isVert) chokePoints.push({ r, c });
                else rooms.push({ r, c });
            }
        }
    }

    deadEnds.sort((a, b) => seed(a.r * a.c) - 0.5);
    chokePoints.sort((a, b) => seed(a.r * a.c * 2) - 0.5);
    rooms.sort((a, b) => seed(a.r * a.c * 3) - 0.5);

    let keys = [KEY_Y, KEY_Y, KEY_B];
    if (f >= 8) { keys.push(KEY_R); }
    let doors = [DOOR_Y, DOOR_Y, DOOR_B];
    if (f >= 10 && f % 10 !== 0) { doors.push(DOOR_R); }

    // Smart Placement: Doors on ChokePoints
    for (let d of doors) {
        let sc = chokePoints.length > 0 ? chokePoints.pop() : rooms.pop();
        if (sc) map[sc.r][sc.c] = d;
    }

    // Gears in Dead Ends (Ultimate Rewards for exploration)
    if (f === 5) { let v = deadEnds.pop() || rooms.pop(); if (v) map[v.r][v.c] = SWORD; }
    else if (f === 15) {
        let v = deadEnds.pop() || rooms.pop();
        if (v) {
            map[v.r][v.c] = SHIELD;
            // Guard the shield at the neck of the dead-end
            const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
            for (let d of dirs) {
                let nr = v.r + d.dr, nc = v.c + d.dc;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && map[nr][nc] === EMPTY) {
                    map[nr][nc] = 152; // Place Nano Praetorian
                    break;
                }
            }
        }
    }
    else if (f === 25) { let v = deadEnds.pop() || rooms.pop(); if (v) map[v.r][v.c] = SWORD2; }
    else if (f === 35) { let v = deadEnds.pop() || rooms.pop(); if (v) map[v.r][v.c] = SHIELD2; }

    // ARTIFACTS & GUARDIANS
    else if (f === 18) {
        let v = deadEnds.pop() || rooms.pop();
        if (v) {
            map[v.r][v.c] = RELI_HP;
            // Guard the relic at the entry point
            const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
            for (let d of dirs) {
                let nr = v.r + d.dr, nc = v.c + d.dc;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && (map[nr][nc] === EMPTY || map[nr][nc] === SHOP)) {
                    map[nr][nc] = 150; // Mandatory Void Sentinel fight
                    break;
                }
            }
        }
    } else if (f === 33) {
        let v = deadEnds.pop() || rooms.pop();
        if (v) {
            map[v.r][v.c] = RELI_GOLD;
            // Guard the relic at the entry point
            const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
            for (let d of dirs) {
                let nr = v.r + d.dr, nc = v.c + d.dc;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && (map[nr][nc] === EMPTY || map[nr][nc] === SHOP)) {
                    map[nr][nc] = 151; // Mandatory Data Devourer fight
                    break;
                }
            }
        }
    } else if (f === 47) {
        let v = deadEnds.pop() || rooms.pop();
        if (v) {
            map[v.r][v.c] = RELI_ATK;
            // Guard the final relic
            const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
            for (let d of dirs) {
                let nr = v.r + d.dr, nc = v.c + d.dc;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && (map[nr][nc] === EMPTY || map[nr][nc] === SHOP)) {
                    map[nr][nc] = 151; // Reuse Data Devourer as high-tier sentinel
                    break;
                }
            }
        }
    }
    else if (f === 20 || f === 30 || f === 40) { let v = deadEnds.pop(); if (v) map[v.r][v.c] = KEY_R; }

    for (let k of keys) {
        // Keys should be easily accessible, not trapped behind 3 doors!
        let sc = rooms.length > 0 ? rooms.pop() : deadEnds.pop();
        if (sc) map[sc.r][sc.c] = k;
    }

    // Force high-value items deeply into remaining Dead Ends to make door-trades profitable
    let highRewards = [GEM_R, GEM_B, GEM_R, GEM_B, POT_B];
    if (f >= 11) highRewards.push(GEM_R, GEM_B); // More modules in later stages
    if (f >= 31) highRewards.push(GEM_R, GEM_B);

    for (let reward of highRewards) {
        let sc = deadEnds.length > 0 ? deadEnds.pop() : (rooms.length > 0 ? rooms.pop() : null);
        if (sc) map[sc.r][sc.c] = reward;
    }

    // MANDATORY BOSS PLACEMENT (As Exit Gatekeepers)
    if (f === 10) map[stairsPositions[f].up.y - 1][stairsPositions[f].up.x] = 200;
    else if (f === 20) map[stairsPositions[f].up.y - 1][stairsPositions[f].up.x] = 201;
    else if (f === 30) map[stairsPositions[f].up.y - 1][stairsPositions[f].up.x] = 202;
    else if (f === 40) map[stairsPositions[f].up.y - 1][stairsPositions[f].up.x] = 203;
    else if (f === 50) map[stairsPositions[f].up.y - 1][stairsPositions[f].up.x] = 204;

    const allMons = [
        100, 101, 102, 103, 124, 117, 118,
        104, 105, 106, 107, 125, 119, 120,
        108, 109, 110, 126, 121, 122,
        111, 112, 113, 129, 127, 123,
        114, 128, 115, 116
    ];
    const baseIdx = Math.min(allMons.length - 2, Math.floor((f - 1) * (allMons.length / 50)));
    let monPool = [
        allMons[baseIdx],
        allMons[baseIdx],
        allMons[Math.min(baseIdx + 1, allMons.length - 1)]
    ];
    // Final Stage: Inject Void Mobs
    if (f >= 41) {
        monPool.push(900, 901); // Need penetration to kill!
    }
    // Remaining generic items: Reduced trap frequency by increasing EMPTY weight
    let potPool = [POT_R, POT_R, POT_B, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, TRAP, TRAP_PERC, TRAP_PERM, EMPTY, EMPTY, EMPTY, EMPTY];

    let remainingCells = [...chokePoints, ...deadEnds, ...rooms].sort((a, b) => seed(a.r * b.c) - 0.5);

    while (remainingCells.length > 0) {
        let sc = remainingCells.pop();
        if (seed(sc.r * sc.c) > 0.65) map[sc.r][sc.c] = potPool[Math.floor(seed(sc.r + sc.c) * potPool.length)];
        else map[sc.r][sc.c] = monPool[Math.floor(seed(sc.r * sc.c * 3) * monPool.length)];
    }

    // Safety clear 
    map[9][5] = EMPTY;
    map[8][5] = KEY_Y;
    map[7][5] = f === 1 ? POT_R : EMPTY;
    return map;
}

let currentMap = generateFloor(1);
let gameTime = 0;
let gameState = 'menu';

function getEffectiveStats(mid) {
    return monsterStats[mid]; // No auto-scaling, rely on monster types by floor
}

function getPotionValue(type, f = hero.floor) {
    if (type === POT_R) return 150 + f * 4;
    if (type === POT_B) return 400 + f * 12;
    return 0;
}

function getTrapDamage(type = TRAP, f = hero.floor, h = hero) {
    if (h.debugMode) return 0;
    let dmg = 0;
    const red = [0, 30, 50, 70, 90]; // Reduction % per tier (S1, S2, S3, S4)
    if (type === TRAP) {
        dmg = 200 + f * 40;
        if (h.equipment && h.equipment.antiTrapFixed) dmg = Math.floor(dmg * (1 - red[h.equipment.antiTrapFixed] / 100));
    }
    else if (type === TRAP_PERC) {
        dmg = Math.floor(h.hp * 0.2); // 20% Current HP (High-risk trade)
        if (h.equipment && h.equipment.antiTrapBio) dmg = Math.floor(dmg * (1 - red[h.equipment.antiTrapBio] / 100));
    }
    else if (type === TRAP_PERM) {
        dmg = 100 + f * 20;
        if (h.equipment && h.equipment.antiTrapBio) dmg = Math.floor(dmg * (1 - red[h.equipment.antiTrapBio] / 100));
    }

    if (h.equipment && h.equipment.reli1) dmg = Math.floor(dmg * 0.9);
    return dmg;
}

function getMonsterDamage(monsterId, contextHero = hero) {
    if (contextHero.debugMode) return { dmg: 0, phys: 0, pen: 0, vamp: 0, penRate: 0, regen: monsterStats[monsterId].regen || 0 };
    const m = getEffectiveStats(monsterId);
    let effDef = contextHero.def;
    let trueDmgEnemy = 0;

    // HERO ATTACK PHASE (Penetration is independent of base defense)
    let baseDmg = Math.max(0, contextHero.atk - m.def);
    const heroPenRate = (contextHero.equipment && contextHero.equipment.reliPierce ? 10 : 0) + (contextHero.heroGemUpgrades.atkPen * 20); // Steady 20% scaling
    const penDmg = Math.floor(contextHero.atk * (heroPenRate / 100));
    let netAtkHero = baseDmg + penDmg;

    if (m.regen) netAtkHero -= m.regen;
    if (netAtkHero <= 0) return 'ERR';

    const turns = Math.ceil(m.hp / netAtkHero);

    // ENEMY ATTACK PHASE
    if (monsterId === 129) { effDef = Math.floor(effDef * 0.5); } // Nuke bypasses armor half-way

    const totalPenRes = (contextHero.equipment.shield2 ? 50 : 0) + (contextHero.equipment.reliPen ? 10 : 0) + (contextHero.heroGemUpgrades.defRes * 14);

    // 1. Pure Physical Delta (Can be 0 if defense is high)
    const physDmgPerTurn = Math.max(0, m.atk - effDef);

    // 2. Net Penetration (True Damage - Ignores Defense entirely)
    const netPenPercent = Math.max(0, (m.pen || 0) - totalPenRes);
    trueDmgEnemy = Math.floor(m.atk * (netPenPercent / 100));

    // Final Damage = Phys + True
    const baseEnemyDmgPerTurn = physDmgPerTurn + trueDmgEnemy;

    // Net total for internal logic (used by AI/Potions)
    let netDmg = (turns - 1) * baseEnemyDmgPerTurn;

    // Component breakdown for HUDs
    const physDmgTotal = (turns - 1) * physDmgPerTurn;
    const penDmgTotal = (turns - 1) * trueDmgEnemy;
    let vampDmgTotal = 0;

    if (contextHero.equipment && contextHero.equipment.reliVamp) {
        const totalHeroDamageDealt = netAtkHero * turns;
        vampDmgTotal = Math.floor(totalHeroDamageDealt * 0.15); // Lifesteal 15%
        netDmg -= vampDmgTotal;
    }

    if (contextHero.equipment && contextHero.equipment.reli1) {
        netDmg = Math.floor(netDmg * 0.9);
    }

    return {
        dmg: netDmg,
        phys: physDmgTotal,
        pen: penDmgTotal,
        vamp: vampDmgTotal,
        penRate: (m.pen || 0),
        regen: m.regen || 0
    };
}

function drawTile(x, y, type) {
    drawTileTo(ctx, x, y, type, hero.floor, true);
}

function drawKeycard(ctx, px, py, ts, color) {
    ctx.save();
    ctx.fillStyle = color + 'cc';
    ctx.shadowBlur = 10; ctx.shadowColor = color;
    ctx.fillRect(px + ts * 0.25, py + ts * 0.3, ts * 0.5, ts * 0.5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#050510';
    ctx.fillRect(px + ts * 0.35, py + ts * 0.4, ts * 0.3, ts * 0.08);
    ctx.fillRect(px + ts * 0.55, py + ts * 0.55, ts * 0.1, ts * 0.15);
    ctx.restore();
}

function drawHealthKit(ctx, px, py, ts, color) {
    ctx.save();
    ctx.fillStyle = '#1a1a2e';
    ctx.shadowBlur = 5; ctx.shadowColor = '#000';
    ctx.fillRect(px + ts * 0.2, py + ts * 0.3, ts * 0.6, ts * 0.5);
    ctx.fillStyle = color;
    ctx.shadowBlur = 15; ctx.shadowColor = color;
    ctx.fillRect(px + ts * 0.45, py + ts * 0.4, ts * 0.1, ts * 0.3);
    ctx.fillRect(px + ts * 0.35, py + ts * 0.5, ts * 0.3, ts * 0.1);
    ctx.restore();
}

function drawTileTo(targetCtx, x, y, type, floor, isGameplay = false) {
    const ts = targetCtx.canvas.width / GRID_SIZE;
    const px = x * ts; const py = y * ts;
    const biome = biomes.find(b => floor >= b.start && floor <= b.end);
    targetCtx.fillStyle = '#050510';
    targetCtx.fillRect(px, py, ts, ts);
    targetCtx.textAlign = 'center';

    if (type === WALL) {
        targetCtx.save();
        targetCtx.globalAlpha = 0.5; // Transparent bricks as requested
        targetCtx.font = `${ts * 0.85}px Arial`;
        targetCtx.fillText('🧱', px + ts / 2, py + ts * 0.82);
        targetCtx.restore();
        // Atmospheric hint
        targetCtx.fillStyle = biome.theme + '11';
        targetCtx.fillRect(px, py, ts, ts);
    } else if (type === MAGMA) {
        targetCtx.fillStyle = '#ff3300'; targetCtx.fillRect(px + ts / 12, py + ts / 12, ts - ts / 6, ts - ts / 6);
        targetCtx.strokeRect(px + 1.5 * ts / 10, py + 1.5 * ts / 10, ts - 3 * ts / 10, ts - 3 * ts / 10);
    } else if (type >= 10 && type <= 12) {
        const colors = { 10: '#ffcc00', 11: '#00fff2', 12: '#ff3333' };
        drawKeycard(targetCtx, px, py, ts, colors[type]);
    } else if (type >= 20 && type <= 22) {
        const colors = { 20: '#ffcc00', 21: '#00fff2', 22: '#ff3333' };
        targetCtx.fillStyle = colors[type];
        targetCtx.shadowBlur = 15; targetCtx.shadowColor = colors[type];
        targetCtx.fillRect(px + ts / 10, py + ts / 10, ts - ts / 5, ts - ts / 5);
        targetCtx.shadowBlur = 0; targetCtx.fillStyle = '#050510';
        targetCtx.fillRect(px + ts * 0.45, py + ts * 0.2, ts * 0.1, ts * 0.6); // Cyber door slit
    } else if (type === TRAP) {
        targetCtx.font = `${ts * 0.7}px Arial`;
        targetCtx.fillText('💥', px + ts / 2, py + ts * 0.75);
        if (isGameplay) {
            const trapDmg = getTrapDamage(TRAP, floor, hero);
            targetCtx.font = `bold ${ts / 4}px monospace`;
            targetCtx.fillStyle = '#ff3333';
            targetCtx.fillText(`-${trapDmg}`, px + ts / 2, py + ts - 2);
        }
    } else if (type === TRAP_PERC || type === TRAP_PERM) {
        targetCtx.font = `${ts * 0.6}px Arial`;
        targetCtx.fillText(type === TRAP_PERC ? '💦' : '💨', px + ts / 2, py + ts * 0.75);
        if (isGameplay) {
            const trapDmg = getTrapDamage(type, floor, hero);
            targetCtx.font = `bold ${ts / 4}px monospace`;
            targetCtx.fillStyle = '#ff3333';
            targetCtx.fillText(`-${trapDmg}`, px + ts / 2, py + ts - 2);
        }
    } else if (type === POT_R || type === POT_B) {
        drawHealthKit(targetCtx, px, py, ts, type === POT_R ? '#ff3333' : '#00fff2');
        if (isGameplay) {
            const val = getPotionValue(type);
            targetCtx.font = `bold ${ts / 4}px monospace`;
            targetCtx.fillStyle = '#00ffaa'; // Green for health
            targetCtx.fillText(`+${val}`, px + ts / 2, py + ts - 2);
        }
    } else if (type === GEM_R || type === GEM_B) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText(type === GEM_R ? '🔥' : '💠', px + ts / 2, py + ts * 0.75);
    } else if (type === EXIT) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🌀', px + ts / 2, py + ts * 0.75);
    } else if (type === SHOP) {
        targetCtx.save();
        targetCtx.fillStyle = '#ffffff';
        targetCtx.shadowBlur = 15; targetCtx.shadowColor = '#00fff2';
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🏪', px + ts / 2, py + ts * 0.8);
        targetCtx.restore();
    } else if (type === SWORD) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🗡️', px + ts / 2, py + ts * 0.75);
    } else if (type === SHIELD) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🛡️', px + ts / 2, py + ts * 0.75);
    } else if (type === SWORD2) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🔫', px + ts / 2, py + ts * 0.75);
    } else if (type === SHIELD2) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🪬', px + ts / 2, py + ts * 0.75);
    } else if (type === RELI_HP) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('❤️‍🔥', px + ts / 2, py + ts * 0.75);
    } else if (type === RELI_ATK) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🧠', px + ts / 2, py + ts * 0.75);
    } else if (type === RELI_GOLD) {
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('🧧', px + ts / 2, py + ts * 0.75);
    } else if (type === RELI_VAMP) {
        targetCtx.save();
        targetCtx.shadowBlur = 15; targetCtx.shadowColor = '#ff3333';
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('💉', px + ts / 2, py + ts * 0.75);
        targetCtx.restore();
    } else if (type === RELI_PIERCE) {
        targetCtx.save();
        targetCtx.shadowBlur = 15; targetCtx.shadowColor = '#00fff2';
        targetCtx.font = `${ts * 0.8}px Arial`; targetCtx.fillText('⚡', px + ts / 2, py + ts * 0.75);
        targetCtx.restore();
    } else if (type === STAIRS_UP) {
        targetCtx.font = `${ts * 0.75}px Arial`; targetCtx.fillText('🔼', px + ts / 2, py + ts * 0.75);
    } else if (type === STAIRS_DN) {
        targetCtx.font = `${ts * 0.75}px Arial`; targetCtx.fillText('🔽', px + ts / 2, py + ts * 0.75);
    } else if (type >= 100) {
        const mon = monsterStats[type];
        const bounce = isGameplay ? Math.sin(gameTime * 0.1) * (ts / 10) : 0;
        targetCtx.font = mon.isBoss ? `${ts * 0.9}px Arial` : `${ts * 0.8}px Arial`;
        targetCtx.fillText(mon.icon, px + ts / 2, py + ts * 0.75 + bounce);

        if (isGameplay) {
            const dmgInfo = getMonsterDamage(type);
            const totalDmg = dmgInfo === 'ERR' ? 'ERR' : dmgInfo.dmg;
            targetCtx.font = `bold ${ts / 4}px monospace`;

            if (totalDmg === 'ERR' || (totalDmg > 0 && totalDmg >= hero.hp)) {
                targetCtx.fillStyle = '#ff3333';
                targetCtx.fillText('???', px + ts / 2, py + ts * 0.9);
            } else {
                const isHealing = totalDmg < 0;
                targetCtx.fillStyle = isHealing ? '#00ffaa' : '#ff3333';
                const sign = isHealing ? '+' : '-';
                targetCtx.fillText(`${totalDmg === 0 ? '0' : sign + Math.abs(totalDmg)}`, px + ts / 2, py + ts * 0.9);
            }
        }
    }
}

function render() {
    gameTime++;
    hero.visualX += (hero.x - hero.visualX) * 0.2;
    hero.visualY += (hero.y - hero.visualY) * 0.2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) drawTile(x, y, currentMap[y][x]);
    drawHero();
    // Removed updateHUD from render loop to prevent DOM thrashing and tooltip sticking.
    requestAnimationFrame(render);
}

function drawHero() {
    const px = Math.round(hero.visualX * TILE_SIZE);
    const py = Math.round(hero.visualY * TILE_SIZE);
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;

    // Calculation (Sync with 14% meta)
    const res = (hero.equipment.shield2 ? 50 : 0) + (hero.equipment.reliPen ? 10 : 0) + (hero.heroGemUpgrades.defRes * 14);
    const pen = (hero.equipment.reliPierce ? 10 : 0) + (hero.heroGemUpgrades.atkPen * 14);

    // Dynamic Growth + Pulse (Miniaturized)
    const pulse = Math.sin(gameTime * 0.1) * 1.5;
    const gRes = res > 0 ? Math.min(32, 12 + res * 0.18) + pulse : 0;
    const gPen = pen > 0 ? Math.min(32, 12 + pen * 0.18) + pulse : 0;

    // Rotating Aura (Cyber-Taiji Style - Decelerated)
    const rotation = (gameTime * 0.03) % (Math.PI * 2);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // 1. Draw Red Side (Orbit A)
    if (gPen > 0) {
        const grd = ctx.createRadialGradient(cx, cy, 3, cx, cy, gPen);
        grd.addColorStop(0, 'rgba(255, 32, 32, 1)');
        grd.addColorStop(0.4, 'rgba(255, 32, 32, 0.4)');
        grd.addColorStop(1, 'rgba(255, 32, 32, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, gPen, rotation, rotation + Math.PI);
        ctx.fill();
    }

    // 2. Draw Cyan Side (Orbit B)
    if (gRes > 0) {
        const grd = ctx.createRadialGradient(cx, cy, 3, cx, cy, gRes);
        grd.addColorStop(0, 'rgba(0, 255, 242, 1)');
        grd.addColorStop(0.4, 'rgba(0, 255, 242, 0.4)');
        grd.addColorStop(1, 'rgba(0, 255, 242, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, gRes, rotation + Math.PI, rotation + Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Final Hero Render
    ctx.save();
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeText(hero.icon, cx, py + TILE_SIZE * 0.8);
    ctx.fillText(hero.icon, cx, py + TILE_SIZE * 0.8);
    ctx.restore();
}

function updateHUD() {
    const biome = biomes.find(b => hero.floor >= b.start && hero.floor <= b.end);
    const debugTag = hero.debugMode ? ' [DEBUG]' : '';
    document.getElementById('val-floor').innerText = hero.floor + 'F ' + (biome ? biome.name : '') + debugTag;
    document.getElementById('val-hp').innerText = hero.hp;
    document.getElementById('val-atk').innerText = hero.atk;
    document.getElementById('val-def').innerText = hero.def;
    document.getElementById('val-gold').innerText = hero.gold;

    // Accurate Pen-Res/Pen-Atk/Vamp calculation (120 modules for 200%: Level 15 @ 14% each)
    const vEl = document.getElementById('val-hero-vamp');
    if (vEl) vEl.innerText = (hero.equipment.reliVamp ? 15 : 0) + "%";
    const pEl = document.getElementById('val-hero-pen');
    const heroPen = (hero.equipment.reliPierce ? 10 : 0) + (hero.heroGemUpgrades.atkPen * 20);
    if (pEl) pEl.innerText = heroPen + "%";

    const totalPenRes = (hero.equipment.shield2 ? 50 : 0) + (hero.equipment.reliPen ? 10 : 0) + (hero.heroGemUpgrades.defRes * 20);
    document.getElementById('val-pen-res').innerText = totalPenRes + "%";

    // Modules (Gems)
    document.getElementById('val-gem-atk').innerText = hero.gems.atk;
    document.getElementById('val-gem-def').innerText = hero.gems.def;
    document.getElementById('val-key-y').innerText = hero.keys.yellow;
    document.getElementById('val-key-b').innerText = hero.keys.blue;
    document.getElementById('val-key-r').innerText = hero.keys.red;

    const slots = [
        { id: 'slot-sword-content', owned: hero.equipment.sword, name: '赛博利刃', icon: '⚔️', effect: '+80 火力' },
        { id: 'slot-shield-content', owned: hero.equipment.shield, name: '纳米护盾', icon: '🛡️', effect: '+80 装甲' },
        { id: 'slot-sword2-content', owned: hero.equipment.sword2, name: '高斯步枪', icon: '🔫', effect: '+300 火力' },
        { id: 'slot-shield2-content', owned: hero.equipment.shield2, name: '力场中枢', icon: '🪬', effect: '穿透伤害抵消 50%' }
    ];
    slots.forEach(s => {
        const el = document.getElementById(s.id);
        const parent = el.parentElement;
        el.innerText = s.owned ? `${s.icon} ${s.name}` : "";
        parent.style.opacity = s.owned ? "1" : "0.5";
        const tip = s.owned ? `【装备已激活】<br/><span style="color:#00fff2">${s.name}</span><br/><span style="color:#ffcc00">${s.effect}</span>` : "矩阵插槽空置。";
        parent.onmouseenter = (e) => showTooltip(e, tip);
        parent.onmousemove = moveTooltip;
        parent.onmouseleave = hideTooltip;
        parent.removeAttribute('title');
    });

    const g1 = document.getElementById('slot-gadget1-content');
    const g1Parent = g1.parentElement;
    const red = [0, 30, 50, 70, 90];
    const g1Level = hero.equipment.antiTrapFixed;
    g1.innerText = g1Level ? `🧩 冲击补偿器 S${g1Level}` : "";
    g1Parent.style.opacity = g1Level ? "1" : "0.3";
    const g1Tip = g1Level ? `【插件】冲击补偿器 [S${g1Level}]：-${red[g1Level]}% 物理陷阱伤。` : "未安装抗物理模块。";
    g1Parent.onmouseenter = (e) => showTooltip(e, g1Tip);
    g1Parent.onmousemove = moveTooltip;
    g1Parent.onmouseleave = hideTooltip;

    const g2 = document.getElementById('slot-gadget2-content');
    const g2Parent = g2.parentElement;
    const g2Level = hero.equipment.antiTrapBio;
    g2.innerText = g2Level ? `🧩 生物过滤网 S${g2Level}` : "";
    g2Parent.style.opacity = g2Level ? "1" : "0.3";
    const g2Tip = g2Level ? `【插件】生物过滤网 [S${g2Level}]：-${red[g2Level]}% 生化毒素伤。` : "未安装生化过滤模块。";
    g2Parent.onmouseenter = (e) => showTooltip(e, g2Tip);
    g2Parent.onmousemove = moveTooltip;
    g2Parent.onmouseleave = hideTooltip;

    const scroll = document.getElementById('artifact-scroll-container');
    scroll.innerHTML = '';
    const arts = [
        { owned: hero.equipment.reli1, label: '赛博之心', icon: '❤️‍🔥', desc: '全伤抵消 10%', color: '#ff00ea' },
        { owned: hero.equipment.reli2, label: '量子核心', icon: '🧠', desc: '战斗中永久增强能力', color: '#00fff2' },
        { owned: hero.equipment.reli3, label: '贪婪芯片', icon: '🧧', desc: '虚空币收益翻倍', color: '#ffcc00' },
        { owned: !!hero.equipment.reliVamp, label: '血液回流计', icon: '💉', desc: '15% 伤害吸血反馈', color: '#ff3232' },
        { owned: !!hero.equipment.reliPierce, label: '相位穿透模块', icon: '⚡', desc: '无视防御，输出 10% 穿透伤', color: '#00fff2' },
        { owned: !!hero.equipment.reliPen, label: '偏振矩阵', icon: '〰️', desc: '穿透强度抵合弹性 10%', color: '#00ffaa' }
    ];
    arts.forEach(a => {
        if (a.owned) {
            const div = document.createElement('div');
            // Matching equipment slot style exactly
            div.className = 'key-item';
            div.style.cssText = `height:32px; display:flex; align-items:center; padding: 0 8px; background: rgba(255,255,255,0.02); border: 1px dashed ${a.color}aa; font-size:0.55rem; color:${a.color}; cursor:help; overflow:hidden; white-space:nowrap;`;
            div.innerText = `${a.icon} ${a.label}`;

            const tip = `【已集成：矩阵神器】<br/><span style="color:${a.color}">${a.label}</span><br/><span style="color:#00fff2">效能负载：${a.desc}</span>`;
            div.onmouseenter = (e) => showTooltip(e, tip);
            div.onmousemove = moveTooltip;
            div.onmouseleave = hideTooltip;

            scroll.appendChild(div);
        }
    });

    if (!scroll.innerHTML) scroll.innerHTML = '<div style="font-size:0.5rem; color:#666; text-align:center; padding:10px;">[ 暂未同步矩阵神器 ]</div>';
    updateMonsterHUD();
}

function updateMonsterHUD() {
    const list = document.getElementById('monster-list');
    const trapBar = document.getElementById('trap-alert');
    const uniques = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let tid = currentMap[r][c];
            if (tid === TRAP || tid === TRAP_PERC || tid === TRAP_PERM || tid >= 100) uniques.add(tid);
        }
    }

    // Fixed Top Bar: Environmental Threats
    const trapIds = [TRAP, TRAP_PERC, TRAP_PERM].filter(id => uniques.has(id));
    if (trapIds.length > 0 && trapBar) {
        const icons = { [TRAP]: '💥', [TRAP_PERC]: '💦', [TRAP_PERM]: '💨' };
        const names = { [TRAP]: '冲击陷阱', [TRAP_PERC]: '渗透毒液', [TRAP_PERM]: '毒性毒气' };
        const descs = {
            [TRAP]: '高额物理冲击损伤。基于楼层强度。',
            [TRAP_PERC]: '系统渗透损伤。剥离当前 20% 生命体征。',
            [TRAP_PERM]: '持久存在的固定环境损耗。无法消散。'
        };

        trapBar.innerHTML = `<span style="margin-right:10px; opacity:0.8;">⚠️ HAZARDS:</span> ${trapIds.map(id => {
            // Use &quot; to avoid breaking the onmouseenter attribute
            const tip = `【环境威胁】<br/><span style=&quot;color:#ff3232&quot;>${names[id]}</span><br/><span style=&quot;color:#aaa&quot;>${descs[id]}</span><br/><span style=&quot;color:#00fff2&quot;>当前预估损耗: -${getTrapDamage(id)}</span>`;
            const escapedTip = tip.replace(/'/g, "\\'");
            return `<span class="hazard-badge" onmouseenter="showTooltip(event, '${escapedTip}')" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">${icons[id]} -${getTrapDamage(id)}</span>`;
        }).join('')}`;
        trapBar.style.display = 'flex';
        trapBar.style.alignItems = 'center';
    } else if (trapBar) {
        trapBar.style.display = 'none';
    }

    const monsterIds = Array.from(uniques).filter(id => id >= 100).sort((a, b) => a - b);
    if (monsterIds.length === 0) {
        list.innerHTML = '<div style="font-size:0.6rem; color:#555; text-align:center; padding:20px;">[ 暂未扫描到活动实体 ]</div>';
        return;
    }

    let html = '';
    monsterIds.forEach(id => {
        const mon = monsterStats[id];
        const eff = getEffectiveStats(id);
        const dmgInfo = getMonsterDamage(id);
        const dmg = dmgInfo === 'ERR' ? 'ERR' : dmgInfo.dmg;
        const heroUpgrades = hero.heroGemUpgrades || { atkPen: 0, defRes: 0 };
        const totalPenRes = (hero.equipment.shield2 ? 50 : 0) + (hero.equipment.reliPen ? 10 : 0) + ((heroUpgrades.defRes || 0) * 20);

        let traitTags = '';
        if (mon.regen) {
            const regenTip = `【再生机能】：每回合自我修复 ${mon.regen} 点。`;
            traitTags += `<span style="background:rgba(0,255,170,0.15); color:#00ffaa; padding:1px 4px; border-radius:2px; font-size:0.55rem; border:1px solid rgba(0,255,170,0.2); cursor:help;" onmouseenter="showTooltip(event, '${regenTip}')" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">REGEN:${mon.regen}</span> `;
        }
        if (mon.isBoss) traitTags += `<span style="background:rgba(255,0,234,0.15); color:#ff00ea; padding:1px 4px; border-radius:2px; font-size:0.55rem; border:1px solid rgba(255,0,234,0.3); font-weight:bold;">BOSS</span> `;

        html += `
            <div style="padding:10px; margin-bottom:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(0,255,242,0.1); border-radius:8px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <span style="font-size:1.1rem;">${mon.icon}</span>
                    <div style="display:flex; flex-direction:column;">
                        <span style="color:#fff; font-weight:bold; font-size:0.75rem;">${mon.name}</span>
                        <div style="display:flex; gap:3px;">${traitTags}</div>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; background:rgba(0,0,0,0.2); padding:3px 8px; border-radius:4px; margin-bottom:8px; font-size:0.65rem; color:#ccc; font-family: monospace;">
                    <span>🧬 ${eff.hp}</span>
                    <span>⚔️ ${eff.atk}</span>
                    <span>🛡️ ${eff.def}</span>
                    <span style="color:#ffcc00;">💰 ${eff.gold}</span>
                    ${mon.pen ? `<span style="color:#ff3232;">⚡ ${mon.pen}%</span>` : ''}
                </div>
                ${dmg === 'ERR' ? `
                    <div style="color:#ff3333; padding:6px; background:rgba(255,51,51,0.1); border-radius:4px; text-align:center; font-weight:bold; font-size:0.6rem; border:1px solid #ff333333;">⚠️ 无法击穿当前护甲</div>
                ` : `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px; font-size:0.6rem;">
                        <div style="display:flex; flex-direction:column; gap:1px;">
                            <span style="color:${dmgInfo.phys > 0 ? '#ff5555' : '#00ffaa'};">物理损伤: ${dmgInfo.phys}</span>
                            <span style="color:#ff3232;">穿透破坏: ${dmgInfo.pen} <small>(效能: ${Math.max(0, (mon.pen || 0) - totalPenRes)}%${((mon.pen || 0) - totalPenRes) <= 0 ? ' [中和]' : ''})</small></span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:1px; align-items:flex-end; color:#00ffaa;">
                            <span>机能吸血: -${dmgInfo.vamp}</span>
                        </div>
                    </div>
                    <div style="padding:3px 10px; background:rgba(255,255,255,0.03); border-radius:4px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#888; font-size:0.5rem; letter-spacing:1px;">EXPECTED DELTA</span>
                        <span style="font-weight:bold; font-size:0.8rem; color:${(dmgInfo.phys + dmgInfo.pen - dmgInfo.vamp) > 0 ? '#ff00ea' : '#00ffaa'};">
                            ${(dmgInfo.phys + dmgInfo.pen - dmgInfo.vamp) > 0 ? `-${(dmgInfo.phys + dmgInfo.pen - dmgInfo.vamp)}` : `+${Math.abs(dmgInfo.phys + dmgInfo.pen - dmgInfo.vamp)}`}
                        </span>
                    </div>
                `}
            </div>`;
    });
    list.innerHTML = html;
}

function move(dx, dy) {
    if (gameState !== 'playing') return;

    // 1. Movement Cooldown/Debounce (Prevent mechanical double-clicks)
    const now = Date.now();
    if (now - hero.lastMoveTime < 120) return;
    hero.lastMoveTime = now;

    const nx = hero.x + dx; const ny = hero.y + dy;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return;
    const target = currentMap[ny][nx];
    if ((target === WALL || target === MAGMA) && !hero.debugMode) return;

    // 2. Lethal Combat Safeguard
    if (target >= 100) {
        const dmgInfo = getMonsterDamage(target);
        if (dmgInfo !== 'ERR' && dmgInfo.dmg >= hero.hp) {
            if (!hero.deathWarning) {
                hero.deathWarning = target; // Lock onto this monster
                showToast("⚠️ 警告：检测到致命伤害！再次移动以确认强制执行");
                shakeScreen();
                return;
            } else if (hero.deathWarning !== target) {
                // Changed target, reset warning
                hero.deathWarning = target;
                showToast("⚠️ 警告：检测到致命伤害！再次移动以确认强制执行");
                return;
            }
        }
    }
    hero.deathWarning = false; // Reset warning if moving safely or confirmed

    hideShopTooltip();

    // Only record move if it hits...

    if (target >= 20 && target <= 22) {
        const keyMap = { 20: 'yellow', 21: 'blue', 22: 'red' };
        const keyName = keyMap[target];
        if (hero.keys[keyName] > 0) {
            hero.keys[keyName]--;
            currentMap[ny][nx] = EMPTY;
            log(`${keyName === 'red' ? '红色' : (keyName === 'blue' ? '蓝色' : '黄色')}门已开启。`);
            recordAction('open_door', { color: keyName });
            updateHUD();
        } else return;
    } else if (target === SHOP) {
        // Step onto it, then show tooltip
        hero.x = nx; hero.y = ny;
        hero.visualX = nx; hero.visualY = ny;
        updateHUD();
        showShopTooltip(nx, ny);
        return;
    } else if (target >= 10 && target <= 12) {
        const keyMap = { 10: 'yellow', 11: 'blue', 12: 'red' };
        hero.keys[keyMap[target]]++; currentMap[ny][nx] = EMPTY;
        updateHUD(); showToast(`获取${keyMap[target] === 'red' ? '红' : (keyMap[target] === 'blue' ? '蓝' : '黄')}色通行卡`);
    } else if (target === SWORD) {
        hero.atk += 80; hero.equipment.sword = true; currentMap[ny][nx] = EMPTY; log('获得赛博利刃 (+80 ATK)！', '#ffff00'); updateHUD();
        showToast('获取神装：赛博利刃');
    } else if (target === SHIELD) {
        hero.def += 80; hero.equipment.shield = true; currentMap[ny][nx] = EMPTY; log('获得纳米护盾 (+80 DEF)！', '#00fff2'); updateHUD();
        showToast('获取神装：纳米护盾');
    } else if (target === SWORD2) {
        hero.atk += 300; hero.equipment.sword2 = true; currentMap[ny][nx] = EMPTY; log('获得高斯步枪 (+300 ATK)！', '#ffff00'); updateHUD();
        showToast('获取神装：高斯步枪');
    } else if (target === SHIELD2) {
        hero.equipment.shield2 = true; currentMap[ny][nx] = EMPTY; log('获得力场发生器 (减半穿透伤)！', '#00fff2'); updateHUD();
        showToast('获取神装：力场中枢');
    } else if (target === RELI_HP) {
        hero.hp += 10000; hero.equipment.reli1 = true; currentMap[ny][nx] = EMPTY;
        log('融合赛博之心：生命+10000，获得10%全减伤！', '#ff00ea'); updateHUD();
        showToast('神器：赛博之心');
    } else if (target === RELI_ATK) {
        hero.equipment.reli2 = true; currentMap[ny][nx] = EMPTY;
        log('载入量子核心：每场战斗永久机能 +10！', '#00fff2'); updateHUD();
        showToast('神器：量子核心');
    } else if (target === RELI_GOLD) {
        hero.equipment.reli3 = true; currentMap[ny][nx] = EMPTY;
        log('激活贪婪芯片：战斗金币获得翻倍！', '#ffff00'); updateHUD();
        showToast('神器：贪婪芯片');
    } else if (target === TRAP || target === TRAP_PERC || target === TRAP_PERM) {
        let trapDmg = getTrapDamage(target);
        hero.hp -= trapDmg;
        const name = target === TRAP ? '激光' : (target === TRAP_PERC ? '系统病毒' : '核污染');
        log(`触发${name}陷阱：HP -${trapDmg}！`, '#ff3333');
        recordAction('trap', { id: target, dmg: trapDmg });
        if (hero.hp <= 0) die();
        if (target !== TRAP_PERM) currentMap[ny][nx] = EMPTY; // Toxin and Laser are one-time, Radiation is PERMANENT
        updateHUD();
    } else if (target === RELI_VAMP) {
        hero.equipment.reliVamp = true; currentMap[ny][nx] = EMPTY;
        log('载入血液回流计：神经回路增压，获得 15% 攻击力吸血反馈！', '#ff3232');
        showToast('神器：血液回流计');
        updateHUD();
    } else if (target === RELI_PIERCE) {
        hero.equipment.reliPierce = true; currentMap[ny][nx] = EMPTY;
        log('载入相位穿透模块：攻击效能突破，造成 10% 固定穿透伤害！', '#00fff2');
        showToast('神器：相位穿透模块');
        updateHUD();
    } else if (target === POT_R || target === POT_B) {
        const val = getPotionValue(target);
        hero.hp += val; currentMap[ny][nx] = EMPTY;
        log(`生命值急速扩容 (+${val})。`); updateHUD();
    } else if (target === GEM_R || target === GEM_B) {
        if (target === GEM_R) { hero.atk += 6; hero.gems.atk++; } else { hero.def += 6; hero.gems.def++; }
        currentMap[ny][nx] = EMPTY; log('机能模块已采集并应用。'); updateHUD();
        showToast('获取：机能核心模块');
    } else if (target === STAIRS_UP) { changeFloor(hero.floor + 1); return; }
    else if (target === STAIRS_DN) { changeFloor(hero.floor - 1); return; }
    else if (target === EXIT) { showVictory(); return; }
    else if (target >= 100) { if (!battle(target)) return; currentMap[ny][nx] = EMPTY; }

    hero.x = nx; hero.y = ny;
    updateHUD(); // Trigger HUD update once per move
}

function battle(monsterId) {
    const dmgInfo = getMonsterDamage(monsterId);
    if (!hero.debugMode && (dmgInfo === 'ERR' || hero.hp <= dmgInfo.dmg)) { shakeScreen(); return false; }
    if (!hero.debugMode) hero.hp -= dmgInfo.dmg;
    const m = monsterStats[monsterId];

    let goldGain = m.gold;
    if (hero.equipment.reli3) goldGain *= 2;
    hero.gold += goldGain;

    // Quantum CPU (reli2) Passive: +10 ATK/DEF (Buffed to +10)
    if (hero.equipment.reli2) {
        hero.atk += 10;
        hero.def += 10;
        showToast("⚡ 量子核心：机能 +10");
    }

    log(`消灭了 ${m.name}。消耗 ${dmgInfo.dmg} HP。`);
    recordAction('battle', { id: monsterId, dmg: dmgInfo.dmg, gold: goldGain });
    return true;
}

function changeFloor(f) {
    if (f < 1 || f > 50) return;
    const oldFloor = hero.floor;
    hero.floor = f;
    if (f > hero.maxFloor) hero.maxFloor = f;

    // Persistent World Logic: Reuse cached map if available
    if (floorCache[f]) {
        currentMap = floorCache[f];
    } else {
        currentMap = generateFloor(f);
        floorCache[f] = currentMap;
    }
    log(`系统同步：进入第 ${f} 层...`, '#00fff2');

    // Auto-save on floor transition
    saveGame(true);

    // Position Logic
    const pos = stairsPositions[f];
    if (f > oldFloor) { hero.x = pos.dn.x; hero.y = pos.dn.y - 1; }
    else { hero.x = pos.up.x; hero.y = pos.up.y + 1; }
    hero.visualX = hero.x; hero.visualY = hero.y;
    updateHUD(); // Trigger HUD update on floor change
}

// UI LOGIC
window.openSettings = function () {
    gameState = 'settings';
    document.getElementById('settings-overlay').style.display = 'flex';
};
window.closeSettings = function () {
    gameState = 'playing';
    document.getElementById('settings-overlay').style.display = 'none';
};

window.toggleDebug = function () {
    hero.debugMode = !hero.debugMode;
    const btn = document.getElementById('debug-toggle-btn');
    if (hero.debugMode) {
        btn.innerText = '🛡️ Debug 模式 [已开启]';
        btn.style.background = 'rgba(0, 255, 170, 0.2)';
        btn.style.borderColor = '#00ffaa';
        btn.style.color = '#00ffaa';
        showToast('Debug 模式已开启：不掉血 + 穿墙');
    } else {
        btn.innerText = '🛡️ 开启 Debug 模式';
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.style.borderColor = '#fff';
        btn.style.color = '#fff';
        showToast('Debug 模式已关闭');
    }
    updateHUD();
};

function getShopOptions(buyer = hero) {
    let tier = 1, base = 30, inc = 20, boost = 10;
    // Item 1: BLAST GUARD (💥)
    let s1_Name = "💥 冲击补偿器 [S1]", s1_Cost = 150;
    // Item 2: BIO FILTER (💦/💨)
    let s2_Name = "💦 生物过滤网 [S1]", s2_Cost = 150;

    const f = parseInt(buyer.floor);
    if (f >= 11) {
        tier = 2; base = 100; inc = 40; boost = 40;
        s1_Name = "💥 冲击补偿器 [S2]"; s1_Cost = 450;
        s2_Name = "💦 生物过滤网 [S2]"; s2_Cost = 450;
    }
    if (f >= 26) {
        tier = 3; base = 400; inc = 150; boost = 250;
        s1_Name = "💥 冲击补偿器 [S3]"; s1_Cost = 1200;
        s2_Name = "💦 生物过滤网 [S3]"; s2_Cost = 1200;
    }
    if (f >= 41) {
        tier = 4; base = 1200; inc = 400; boost = 550;
        s1_Name = "💥 冲击补偿器 [S4]"; s1_Cost = 2500;
        s2_Name = "💦 生物过滤网 [S4]"; s2_Cost = 2500;
    }

    // Persistent Pricing Logic: Cumulative within the same TIER
    const tierKey = `T${tier}`;
    buyer.shopStats = buyer.shopStats || {};
    const floorBuyCount = buyer.shopStats[tierKey] || 0;

    const cost = base + floorBuyCount * inc;
    const keys = { yellow: 30, blue: 120, red: 400 };
    const sellKeys = { yellow: 10, blue: 40, red: 150 };
    const reduction = [0, 30, 50, 70, 90][tier];
    return { tier, cost, boost, keys, sellKeys, s1_Name, s1_Cost, s2_Name, s2_Cost, reduction };
}

function updateShopUI() {
    const opts = getShopOptions(hero);
    const atkBtn = document.getElementById('shop-atk-btn');
    const defBtn = document.getElementById('shop-def-btn');
    const kyBtn = document.getElementById('shop-key-y');
    const kbBtn = document.getElementById('shop-key-b');
    const krBtn = document.getElementById('shop-key-r');
    const syBtn = document.getElementById('shop-sell-y');
    const sbBtn = document.getElementById('shop-sell-b');
    const srBtn = document.getElementById('shop-sell-r');
    const s1Btn = document.getElementById('shop-special-btn');
    const s2Btn = document.getElementById('shop-special-btn-2');
    const s3Btn = document.getElementById('shop-special-btn-3');
    const vBtn = document.getElementById('shop-gem-vamp-btn');
    const pBtn = document.getElementById('shop-gem-pen-btn');

    // Stat buying
    atkBtn.innerText = `[ 火力增强 ] +${opts.boost} (${opts.cost}G)`;
    atkBtn.onmouseenter = (e) => showTooltip(e, `【战术火力】瞬间增加 ${opts.boost} 点作战火力。消耗: ${opts.cost}G`);
    atkBtn.onmousemove = moveTooltip; atkBtn.onmouseleave = hideTooltip;

    defBtn.innerText = `[ 装甲强化 ] +${opts.boost} (${opts.cost}G)`;
    defBtn.onmouseenter = (e) => showTooltip(e, `【物理装甲】瞬间增加 ${opts.boost} 点防御装甲。消耗: ${opts.cost}G`);
    defBtn.onmousemove = moveTooltip; defBtn.onmouseleave = hideTooltip;

    // Keys
    kyBtn.innerText = `买黄 (-${opts.keys.yellow}G)`;
    kyBtn.onmouseenter = (e) => showTooltip(e, `【ACCESS-Y】购买黄色密钥卡。消耗: ${opts.keys.yellow}G`);
    kyBtn.onmousemove = moveTooltip; kyBtn.onmouseleave = hideTooltip;

    kbBtn.innerText = `买蓝 (-${opts.keys.blue}G)`;
    kbBtn.onmouseenter = (e) => showTooltip(e, `【ACCESS-B】购买蓝色密钥卡。消耗: ${opts.keys.blue}G`);
    kbBtn.onmousemove = moveTooltip; kbBtn.onmouseleave = hideTooltip;

    krBtn.innerText = `买红 (-${opts.keys.red}G)`;
    krBtn.onmouseenter = (e) => showTooltip(e, `【ACCESS-R】购买红色密钥卡。消耗: ${opts.keys.red}G`);
    krBtn.onmousemove = moveTooltip; krBtn.onmouseleave = hideTooltip;

    // Sell Keys
    syBtn.innerText = `卖黄 (+${opts.sellKeys.yellow}G)`;
    syBtn.onmouseenter = (e) => showTooltip(e, `【密钥折冲】回收黄色卡。获得: ${opts.sellKeys.yellow}G`);
    syBtn.onmousemove = moveTooltip; syBtn.onmouseleave = hideTooltip;

    sbBtn.innerText = `卖蓝 (+${opts.sellKeys.blue}G)`;
    sbBtn.onmouseenter = (e) => showTooltip(e, `【密钥折冲】回收蓝色卡。获得: ${opts.sellKeys.blue}G`);
    sbBtn.onmousemove = moveTooltip; sbBtn.onmouseleave = hideTooltip;

    srBtn.innerText = `卖红 (+${opts.sellKeys.red}G)`;
    srBtn.onmouseenter = (e) => showTooltip(e, `【密钥折冲】回收红色卡。获得: ${opts.sellKeys.red}G`);
    srBtn.onmousemove = moveTooltip; srBtn.onmouseleave = hideTooltip;

    // Environmental Gadgets
    const s1Desc = `【防具插件】${opts.s1_Name}：针对【💥 冲击陷阱】提供 ${opts.reduction}% 环境减伤。`;
    if (hero.equipment.antiTrapFixed >= opts.tier) {
        s1Btn.innerText = `[已安装] ${opts.s1_Name}`; s1Btn.style.opacity = 0.5;
    } else {
        s1Btn.innerText = `🔌 ${opts.s1_Name} - ${opts.s1_Cost}G`; s1Btn.style.opacity = 1;
    }
    s1Btn.onmouseenter = (e) => showTooltip(e, s1Desc);
    s1Btn.onmousemove = moveTooltip; s1Btn.onmouseleave = hideTooltip;

    const s2Desc = `【防具插件】${opts.s2_Name}：针对【🐍 毒性环境】提供 ${opts.reduction}% 环境减伤。`;
    if (hero.equipment.antiTrapBio >= opts.tier) {
        s2Btn.innerText = `[已安装] ${opts.s2_Name}`; s2Btn.style.opacity = 0.5;
    } else {
        s2Btn.innerText = `🔌 ${opts.s2_Name} - ${opts.s2_Cost}G`; s2Btn.style.opacity = 1;
    }
    s2Btn.onmouseenter = (e) => showTooltip(e, s2Desc);
    s2Btn.onmousemove = moveTooltip; s2Btn.onmouseleave = hideTooltip;

    // Gem Relics (Vampire/Pierce)
    const vTip = hero.equipment.reliVamp ? "【已同步】血液回流计：激活 15% 核心机能吸血反馈。" : "【未同步】消耗 8🔴+8🔵 模块合成，获得 15% 伤害吸血续航。";
    if (hero.equipment.reliVamp) {
        vBtn.innerText = "[已同步] 血液回流计"; vBtn.style.opacity = 0.5;
    } else {
        vBtn.innerText = "💉 模块合成: 血液回流计 (8🔴 + 8🔵)";
        vBtn.style.opacity = (hero.gems.atk >= 8 && hero.gems.def >= 8) ? 1 : 0.3;
    }
    vBtn.onmouseenter = (e) => showTooltip(e, vTip);
    vBtn.onmousemove = moveTooltip; vBtn.onmouseleave = hideTooltip;

    // Gem Stat Strengthening Upgrades (Exponential Growth: Base 1.3)
    const aCount = hero.heroGemUpgrades.atkPen;
    const dCount = hero.heroGemUpgrades.defRes;
    const aCost = Math.ceil(Math.pow(1.3, aCount));
    const dCost = Math.ceil(Math.pow(1.3, dCount));

    const aBtn = document.getElementById('shop-gem-atk-up');
    const dBtn = document.getElementById('shop-gem-def-up');

    if (aBtn) {
        aBtn.innerText = `🔴 穿透强化 [lvl ${aCount}] (${aCost} 🔴)`;
        aBtn.style.opacity = (hero.gems.atk >= aCost) ? 1 : 0.3;
        aBtn.onmouseenter = (e) => showTooltip(e, `【核心超载】红模块超载，攻击穿透率 +20% (总: ${aCount * 20}%)。当前消耗: ${aCost}🔴`);
        aBtn.onmousemove = moveTooltip; aBtn.onmouseleave = hideTooltip;
    }
    if (dBtn) {
        dBtn.innerText = `🔵 抗性强化 [lvl ${dCount}] (${dCost} 🔵)`;
        dBtn.style.opacity = (hero.gems.def >= dCost) ? 1 : 0.3;
        dBtn.onmouseenter = (e) => showTooltip(e, `【核心超载】蓝模块超载，穿透抵抗率 +20% (总: ${dCount * 20}%)。当前消耗: ${dCost}🔵`);
        dBtn.onmousemove = moveTooltip; dBtn.onmouseleave = hideTooltip;
    }
}

window.buySpecial = (type) => {
    const opts = getShopOptions(hero);
    if (type === 'fixed') {
        if (hero.equipment.antiTrapFixed >= opts.tier) return showToast('已安装更高级别插件');
        if (hero.gold >= opts.s1_Cost) {
            hero.gold -= opts.s1_Cost;
            hero.equipment.antiTrapFixed = opts.tier;
            recordAction('buy_special', { type: 'fixed', tier: opts.tier, cost: opts.s1_Cost });
            updateHUD(); updateShopUI(); showToast(`安装成功: ${opts.s1_Name}`);
        } else showToast('Credits 不足');
    } else if (type === 'bio') {
        if (hero.equipment.antiTrapBio >= opts.tier) return showToast('已安装更高级别插件');
        if (hero.gold >= opts.s2_Cost) {
            hero.gold -= opts.s2_Cost;
            hero.equipment.antiTrapBio = opts.tier;
            recordAction('buy_special', { type: 'bio', tier: opts.tier, cost: opts.s2_Cost });
            updateHUD(); updateShopUI(); showToast(`安装成功: ${opts.s2_Name}`);
        } else showToast('Credits 不足');
    } else if (type === 'relic' && hero.floor === 24) {
        if (hero.equipment.reliPen) return;
        if (hero.gold >= 1500) {
            hero.gold -= 1500;
            hero.equipment.reliPen = true;
            recordAction('buy_relic', { name: 'PenRes', cost: 1500 });
            updateHUD(); updateShopUI(); showToast('矩阵遗物同步成功');
        } else showToast('Credits 不足');
    }
};

window.reinforceGem = (type) => {
    if (type === 'atk') {
        const cost = Math.ceil(Math.pow(1.3, hero.heroGemUpgrades.atkPen)); // Scaling cost
        if (hero.gems.atk >= cost) {
            hero.gems.atk -= cost;
            hero.heroGemUpgrades.atkPen++;
            showToast(`🔴 模块超载：穿透算法 lvl ${hero.heroGemUpgrades.atkPen} 达成`);
            updateHUD(); updateShopUI();
        } else showToast(`强化模块不足 (需 ${cost}🔴)`);
    } else if (type === 'def') {
        const cost = Math.ceil(Math.pow(1.3, hero.heroGemUpgrades.defRes));
        if (hero.gems.def >= cost) {
            hero.gems.def -= cost;
            hero.heroGemUpgrades.defRes++;
            showToast(`🔵 模块超载：抗穿透韧性 lvl ${hero.heroGemUpgrades.defRes} 达成`);
            updateHUD(); updateShopUI();
        } else showToast(`强化模块不足 (需 ${cost}🔵)`);
    }
}

window.buyRelicWithGems = (type) => {
    const GEM_VAL = 6; // Current stat value per gem
    if (type === 'vamp') {
        if (hero.equipment.reliVamp) return;
        if (hero.gems.atk >= 8 && hero.gems.def >= 8) {
            hero.gems.atk -= 8; hero.gems.def -= 8;
            hero.atk -= (8 * GEM_VAL); hero.def -= (8 * GEM_VAL); // Attribute Revert
            hero.equipment.reliVamp = true;
            recordAction('gem_synthesis', { artifact: 'Vampire', cost: (8 * GEM_VAL) });
            updateHUD(); updateShopUI(); showToast('血液回流模块同步成功 (火力/装甲回拨)');
        } else showToast('所需核心模块不足');
    }
};

window.sellStat = (type) => {
    const { sellKeys } = getShopOptions(hero);
    const keyType = type.split('_')[1]; // key_y -> y
    const keyMap = { y: 'yellow', b: 'blue', r: 'red' };
    const kName = keyMap[keyType];
    const sellPrice = sellKeys[kName];

    if (hero.keys[kName] > 0) {
        hero.keys[kName]--;
        hero.gold += sellPrice;
        recordAction('sell_key', { color: kName, gold: sellPrice });
        updateHUD(); updateShopUI(); showToast(`售出通行卡，获取 ${sellPrice}G`);
    } else {
        showToast('对应通行卡不足');
    }
};

window.buyStat = (type) => {
    const opts = getShopOptions(hero);
    const { cost, boost, keys } = opts;

    if (type === 'atk' || type === 'def') {
        if (hero.gold >= cost) {
            hero.gold -= cost;
            const opts = getShopOptions(hero); // Fetch fresh tier info
            const tierKey = `T${opts.tier}`;
            hero.shopStats = hero.shopStats || {};

            // Sector-based shared counter
            hero.shopStats[tierKey] = (hero.shopStats[tierKey] || 0) + 1;

            if (type === 'atk') hero.atk += boost;
            else hero.def += boost;

            recordAction('buy_stat', { type, boost, cost });
            updateHUD(); updateShopUI(); showToast('系统已强化');
        } else showToast('Credits 不足');
    } else {
        const keyType = type.split('_')[1]; // key_y -> y
        const keyMap = { y: 'yellow', b: 'blue', r: 'red' };
        const kName = keyMap[keyType];
        const kCost = keys[kName];

        if (hero.gold >= kCost) {
            hero.gold -= kCost;
            hero.keys[kName]++;
            recordAction('buy_key', { color: kName, cost: kCost });
            updateHUD(); updateShopUI(); showToast(`获取${kName === 'red' ? '红' : (kName === 'blue' ? '蓝' : '黄')}钥匙`);
        } else showToast('Credits 不足');
    }
};

window.exportLog = function () {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(replayLog, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `magic_tower_replay_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    log('游玩日志已导出。', '#00fff2');
};

window.startGame = function () {
    // Reset Everything
    Object.assign(hero, JSON.parse(JSON.stringify(INITIAL_HERO)));
    floorCache = {};
    stairsPositions = {};
    currentMap = generateFloor(1);
    hero.visualX = hero.x; hero.visualY = hero.y;
    
    // UI Update
    updateHUD();
    document.getElementById('cover-screen').style.display = 'none';
    gameState = 'playing';
    log('协议重置：新进程已启动', '#00ffaa');
};

window.continueGame = function () {
    let latestSlot = -1;
    let latestTs = 0;
    for (let i = 0; i < 10; i++) {
        const raw = localStorage.getItem(`mt_slot_${i}`);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.ts > latestTs) {
                latestTs = data.ts;
                latestSlot = i;
            }
        }
    }

    if (latestSlot !== -1) {
        window.loadFromSlot(latestSlot);
        document.getElementById('cover-screen').style.display = 'none';
        gameState = 'playing';
        log(`矩阵同步：从存档 ${latestSlot + 1} 继续任务`, '#00fff2');
    } else {
        showToast('未检测到同步存档');
    }
};

const NUM_SLOTS = 10;
window.openSaveLoad = function () {
    gameState = 'archive';
    renderSaveSlots();
    document.getElementById('save-load-overlay').style.display = 'flex';
};

window.closeSaveLoad = function () {
    gameState = 'playing';
    document.getElementById('save-load-overlay').style.display = 'none';
};

function renderSaveSlots() {
    const grid = document.getElementById('save-slots-grid');
    grid.innerHTML = '';
    for (let i = 0; i < NUM_SLOTS; i++) {
        const slotData = localStorage.getItem(`mt_slot_${i}`);
        const div = document.createElement('div');
        div.className = 'hud-group';
        div.style.padding = '8px';
        div.style.fontSize = '0.7rem';
        div.style.background = 'rgba(255,255,255,0.02)';

        if (slotData) {
            const data = JSON.parse(slotData);
            div.innerHTML = `
                <div style="color:#00ffaa; margin-bottom: 5px;">存档 ${i + 1}</div>
                <img src="${data.thumb}" style="width:100%; border:1px solid #333; margin-bottom:5px; border-radius:2px;">
                <div style="color:#888;">${data.hero.floor}F | ${new Date(data.ts).toLocaleDateString()}</div>
                <div style="display:flex; gap:4px; margin-top:8px;">
                    <button onclick="saveToSlot(${i})" style="flex:1; padding:4px; background:#ff6f6f; font-size: 0.6rem;">覆盖</button>
                    <button onclick="loadFromSlot(${i})" style="flex:1; padding:4px; background:#00ffaa; color:#000; font-size: 0.6rem; font-weight:bold;">读档</button>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div style="color:#555; margin-bottom: 5px;">空位 ${i + 1}</div>
                <div style="width:100%; aspect-ratio:1; background:#111; border:1px dashed #333; margin-bottom:5px; display:flex; align-items:center; justify-content:center; color:#333;">EMPTY</div>
                <button onclick="saveToSlot(${i})" style="width:100%; padding:6px; background:#00ffaa; color:#000; font-size:0.7rem; font-weight:bold; margin-top:10px;">点击保存</button>
            `;
        }
        grid.appendChild(div);
    }
}

window.runBalanceCheck = function () {
    console.log("[BALANCE SIMULATION] v11.0 Monte Carlo Path Analysis");
    const SIM_COUNT = 100;
    let winCount = 0;

    for (let sim = 0; sim < SIM_COUNT; sim++) {
        let sHero = { hp: 4000, atk: 30, def: 10, gold: 0, shopBuys: 0, keys: { y: 1, b: 0 }, floor: 1 };
        let isDead = false;
        const rand = () => Math.random();

        for (let f = 1; f <= 50; f++) {
            sHero.hp += 600;
            // Smart stat priority based on Stage needs
            if (f <= 10) { sHero.def += 5; sHero.atk += 1; } // Stage 1 requires DEF
            else if (f <= 20) { sHero.atk += 5; sHero.def += 1; } // Stage 2 requires ATK
            else { sHero.atk += 3; sHero.def += 3; }
            sHero.keys.y += 1.5;

            const allMons = [
                100, 101, 102, 103, 124, 117, 118,
                104, 105, 106, 107, 125, 119, 120,
                108, 109, 110, 126, 121, 122,
                111, 112, 113, 129, 127, 123,
                114, 128, 115, 116
            ];
            const baseIdx = Math.min(allMons.length - 2, Math.floor((f - 1) * (allMons.length / 50)));
            const mobId = allMons[Math.min(baseIdx + 1, allMons.length - 1)];
            const m = monsterStats[mobId];
            const reqKey = rand() > 0.5 ? 'y' : 'b';

            let pathChoice = rand();
            let usedKey = false;

            if (sHero.keys[reqKey] > 0 && pathChoice > 0.4) {
                sHero.keys[reqKey]--;
                usedKey = true;
            } else {
                const dmgInfo = getMonsterDamage(mobId, sHero);
                if (dmgInfo === 'ERR') { isDead = true; break; }
                sHero.hp -= dmgInfo.dmg;
                sHero.gold += m.gold;
                if (sHero.hp <= 0) { isDead = true; break; }
            }

            let floorDmg = 0;
            for (let i = 0; i < 3; i++) {
                const rmId = allMons[Math.min(baseIdx, allMons.length - 1)];
                const rmInfo = getMonsterDamage(rmId, sHero);
                if (rmInfo !== 'ERR') {
                    floorDmg += rmInfo.dmg;
                    sHero.gold += monsterStats[rmId].gold;
                } else {
                    floorDmg += 500;
                }
            }

            if (rand() > 0.8) sHero.hp -= 300;
            sHero.hp -= floorDmg;
            if (sHero.hp <= 0) { isDead = true; break; }

            if (f === 5) { sHero.atk += 80; sHero.equipment.sword = true; }
            if (f === 15) { sHero.def += 80; sHero.equipment.shield = true; }
            if (f === 25) { sHero.atk += 300; sHero.equipment.sword2 = true; }
            if (f === 35) { sHero.equipment.shield2 = true; }

            if (f % 10 === 0) {
                const bId = 200 + (f / 10 - 1);
                const bInfo = getMonsterDamage(bId, sHero);
                if (bInfo === 'ERR') { isDead = true; break; }
                sHero.hp -= bInfo.dmg;
                sHero.gold += monsterStats[bId].gold;
                if (sHero.hp <= 0) { isDead = true; break; }
            }

            if (f % 10 === 4 || f % 10 === 9) {
                sHero.shopBuys = sHero.shopBuys || {};
                sHero.shopEquips = sHero.shopEquips || {};

                let opts = getShopOptions(sHero);
                if (!sHero.shopEquips[opts.tier] && sHero.gold >= opts.specCost) {
                    sHero.gold -= opts.specCost;
                    sHero.shopEquips[opts.tier] = true;
                    if (opts.specType === 'atk') sHero.atk += opts.specBoost; else sHero.def += opts.specBoost;
                }

                while (true) {
                    opts = getShopOptions(sHero);
                    if (sHero.gold >= opts.cost) {
                        sHero.gold -= opts.cost;
                        sHero.shopBuys[opts.tier] = (sHero.shopBuys[opts.tier] || 0) + 1;
                        if (f <= 10) sHero.def += opts.boost;
                        else if (f <= 20) sHero.atk += opts.boost;
                        else { if (rand() > 0.5) sHero.atk += opts.boost; else sHero.def += opts.boost; }
                    } else break;
                }
            }
        }

        if (!isDead) winCount++;
    }

    let winRate = (winCount / SIM_COUNT) * 100;
    console.log(`[SIMULATION] Win Rate: ${winRate}% (${winCount}/${SIM_COUNT})`);

    if (winRate > 0 && winRate <= 40) {
        showToast(`✅ 数值完美：通关率 ${winRate.toFixed(1)}% (硬核)`);
    } else if (winRate === 0) {
        showToast(`❌ 数值崩溃：通关率 0% (存在死局)`);
    } else {
        showToast(`⚠️ 过于简单：通关率 ${winRate.toFixed(1)}% > 40%`);
    }
};

function getScreenshot() {
    const off = document.createElement('canvas');
    off.width = 100; off.height = 100;
    const octx = off.getContext('2d');
    octx.drawImage(canvas, 0, 0, 100, 100);
    return off.toDataURL('image/jpeg', 0.5);
}

window.saveToSlot = function (id) {
    const saveData = {
        hero: JSON.parse(JSON.stringify(hero)),
        floorCache: JSON.parse(JSON.stringify(floorCache)),
        stairsPositions: JSON.parse(JSON.stringify(stairsPositions)),
        ts: Date.now(),
        thumb: getScreenshot()
    };
    try {
        localStorage.setItem(`mt_slot_${id}`, JSON.stringify(saveData));
        log(`存档空间 ${id + 1} 已写入。`, '#00ffaa');
        renderSaveSlots();
    } catch (e) {
        log('外存空间不足，无法写入。', '#ff4444');
    }
};

window.loadFromSlot = function (id) {
    const raw = localStorage.getItem(`mt_slot_${id}`);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        Object.assign(hero, data.hero);
        floorCache = data.floorCache;
        stairsPositions = data.stairsPositions;
        currentMap = floorCache[hero.floor];
        hero.visualX = hero.x; hero.visualY = hero.y;
        updateHUD();
        closeSaveLoad();
        log(`存档空间 ${id + 1} 同步成功。`, '#00fff2');
    } catch (e) {
        log('数据损坏，无法同步。', '#ff4444');
    }
};

window.saveGame = function (silent = false) {
    // Quick save to slot 0 or a special slot
    saveToSlot(0);
};

window.openFloorSelector = function () {
    gameState = 'teleport';
    const grid = document.getElementById('floor-grid');
    grid.innerHTML = '';

    // Clear preview
    document.getElementById('floor-preview-img').src = '';
    document.getElementById('floor-preview-info').innerText = '悬浮在楼层按钮上查看';

    for (let f = 1; f <= 50; f++) {
        const btn = document.createElement('button');
        const isUnlocked = hero.debugMode || f <= hero.maxFloor;
        const isShop = [7, 14, 24, 34, 44].includes(f);

        btn.innerText = `${f}F`;
        if (isShop) btn.innerText += " 🏪";
        btn.style.padding = '10px';
        btn.style.border = '1px solid #333';
        btn.style.borderRadius = '4px';

        if (isUnlocked) {
            btn.style.background = '#1a1a1a';
            btn.style.color = isShop ? '#ffcc00' : '#00fff2';
            btn.style.cursor = 'pointer';
            btn.onmouseenter = () => updateFloorPreview(f);
            btn.onclick = () => teleportTo(f);
        } else {
            btn.style.background = '#0d0d0d';
            btn.style.color = '#333';
            btn.style.cursor = 'not-allowed';
            btn.style.borderColor = '#1a1a1a';
            btn.title = '该楼层尚未同步成功 (未扫描)';
        }

        if (f === hero.floor) {
            btn.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.8)';
            btn.style.border = '1px solid #ffcc00';
            btn.style.background = 'rgba(255, 204, 0, 0.2)';
            btn.innerHTML += ' 📍';
        }
        grid.appendChild(btn);
    }
    document.getElementById('floor-overlay').style.display = 'flex';
};

function updateFloorPreview(f) {
    const info = document.getElementById('floor-preview-info');
    const img = document.getElementById('floor-preview-img');

    // Always ensure the floor is generated if it's about to be previewed
    if (!floorCache[f]) generateFloor(f);

    // Always regenerate to show live state (fixes stale snapshots)
    const off = document.createElement('canvas');
    off.width = 200; off.height = 200;
    const octx = off.getContext('2d');
    const map = floorCache[f];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            drawTileTo(octx, c, r, map[r][c], f);
        }
    }
    img.src = off.toDataURL('image/jpeg', 0.6);

    const biome = biomes.find(b => f >= b.start && f <= b.end);
    info.innerHTML = `<span style="color:#00fff2">${f}层 - ${biome.name}</span><br>怪物等级: Lvl ${Math.floor(f / 5) + 1}`;
}

window.closeFloorSelector = function () {
    gameState = 'playing';
    document.getElementById('floor-overlay').style.display = 'none';
};

function teleportTo(f) {
    if (f < 1 || f > 50) return;
    changeFloor(f);
    // Fixed: Jump to the entrance (Downstairs area) of the target floor
    const pos = stairsPositions[f];
    hero.x = pos.dn.x;
    hero.y = pos.dn.y - 1;
    hero.visualX = hero.x;
    hero.visualY = hero.y;

    closeFloorSelector();
    showToast(`空间跳跃至第 ${f} 层`);
    log(`矩阵跳跃：当前位置 📶 ${f}F`, '#ff00ea');
}

function showVictory() {
    gameState = 'result';
    const ov = document.getElementById('overlay');
    document.getElementById('overlay-status').innerText = '系统骇入成功';
    document.getElementById('overlay-status').style.color = '#00ffaa';
    document.getElementById('overlay-msg').innerHTML = `<div style="font-size:1.1rem; color:#fff; line-height:1.6;">你已成功击溃 <span style="color:#ff00ea">主脑 (Mother)</span>！<br>矩阵核心网络已完全格式化，你成为了废土传奇。</div><br><span style="color:#00ffaa; font-weight:bold; font-size:1.5rem; letter-spacing:3px; text-shadow: 0 0 10px #00ffaa;">🏆 MISSION ACCOMPLISHED</span><br><div style="font-size:0.8rem; margin-top:15px; color:#aaa;">最终状态: 🧬${hero.hp} | ⚔️${hero.atk} | 🛡️${hero.def}</div>`;
    document.getElementById('close-overlay').innerText = '留看画面';
    ov.style.display = 'flex';
}

function die() {
    gameState = 'result';
    const ov = document.getElementById('overlay');
    document.getElementById('overlay-status').innerText = '生命体征归零';
    document.getElementById('overlay-status').style.color = '#ff3333';
    document.getElementById('overlay-msg').innerHTML = `<div style="font-size:1.1rem; color:#fff; line-height:1.6;">你的意识已在虚拟虚空中彻底消散...<br>请读取存档重新接入神谕节点。</div><br><span style="color:#ff3333; font-weight:bold; font-size:1.5rem; letter-spacing:3px; text-shadow: 0 0 10px #ff3333;">💀 SYSTEM FAILURE</span>`;
    document.getElementById('close-overlay').innerText = '关闭弹窗';
    ov.style.display = 'flex';
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(10px)';
    clearTimeout(t.timer);
    t.timer = setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(0)';
    }, 2000);
}

function log(msg, color = '#888') {
    // UI Log removed for cleaner interface. Data still recorded in replayLog.
    console.log(`[GAME] ${msg}`);
}

function shakeScreen() {
    canvas.style.transform = 'translate(8px, 0)';
    setTimeout(() => canvas.style.transform = 'translate(-16px, 0)', 50);
    setTimeout(() => canvas.style.transform = 'translate(0, 0)', 100);
}

window.addEventListener('keydown', e => {
    if (gameState !== 'playing') return;
    if (e.key === 'ArrowUp' || e.key === 'w') move(0, -1);
    if (e.key === 'ArrowDown' || e.key === 's') move(0, 1);
    if (e.key === 'ArrowLeft' || e.key === 'a') move(-1, 0);
    if (e.key === 'ArrowRight' || e.key === 'd') move(1, 0);
    if (e.key === 'j') openFloorSelector();
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') toggleDebug();
});

render();
log('协议启动：赛博魔塔 v1.5', '#ff00ea');

// UI Draggable Logic (Relative to Parent Container)
function initDraggable(target, handle) {
    let isDragging = false, offset = { x: 0, y: 0 };
    handle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;

        const rect = target.getBoundingClientRect();
        const pRect = target.parentElement.getBoundingClientRect();

        // Offset relative to the element's OWN Top-Left
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;

        target.style.right = 'auto'; target.style.bottom = 'auto';
        target.style.margin = '0'; target.style.transform = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const pRect = target.parentElement.getBoundingClientRect();

        // Set L/T relative to parent container
        target.style.left = `${e.clientX - pRect.left - offset.x}px`;
        target.style.top = `${e.clientY - pRect.top - offset.y}px`;
    });
    document.addEventListener('mouseup', () => isDragging = false);
}

function initCoverShader() {
    const cvs = document.getElementById('shader-canvas');
    if (!cvs) return;
    const gl = cvs.getContext('webgl');
    if (!gl) return;

    const vsSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    const fsSource = `
        precision highp float;
        uniform float uTime;
        uniform vec2 uResolution;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.34, 56.78))) * 43758.5453);
        }

        float grid(vec2 uv, float res) {
            vec2 grid = fract(uv * res);
            return 1.0 - smoothstep(0.0, 0.05, min(grid.x, grid.y));
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / uResolution.xy;
            
            // Random Glitch Shift
            float glitchTime = floor(uTime * 10.0);
            if (hash(vec2(glitchTime, 0.0)) > 0.95) {
                uv.x += (hash(vec2(glitchTime, 1.0)) - 0.5) * 0.1;
            }

            uv.y *= uResolution.y / uResolution.x;
            
            vec3 color = vec3(0.0);
            
            // Moving Grid
            vec2 gridUv = uv;
            gridUv.y += uTime * 0.05;
            float g = grid(gridUv, 20.0);
            color += vec3(0.0, 1.0, 0.95) * g * 0.25;
            
            // Second Grid Layer
            vec2 gridUv2 = uv * 2.0;
            gridUv2.y += uTime * 0.15;
            float g2 = grid(gridUv2, 12.0);
            color += vec3(1.0, 0.0, 0.9) * g2 * 0.1;

            // Horizontal Glitch Line
            float lineY = fract(uTime * 0.2);
            float line = smoothstep(lineY, lineY + 0.01, uv.y) - smoothstep(lineY + 0.01, lineY + 0.02, uv.y);
            color += vec3(0.0, 1.0, 1.0) * line * hash(vec2(uTime, uv.y)) * 0.5;

            // Scanlines
            float scanline = sin(uv.y * 600.0 + uTime * 2.0) * 0.03;
            color -= scanline;

            // Random Noise
            color += (hash(uv + uTime) - 0.5) * 0.05;

            // Vignette
            float vignette = length(gl_FragCoord.xy / uResolution.xy - 0.5);
            color *= 1.0 - vignette * 1.5;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return shader;
    }

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'uTime');
    const resLoc = gl.getUniformLocation(program, 'uResolution');

    function resize() {
        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;
        gl.viewport(0, 0, cvs.width, cvs.height);
    }
    window.addEventListener('resize', resize);
    resize();

    function renderShader(time) {
        if (gameState !== 'menu') return;
        gl.uniform1f(timeLoc, time * 0.001);
        gl.uniform2f(resLoc, cvs.width, cvs.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(renderShader);
    }
    requestAnimationFrame(renderShader);
}

window.addEventListener('load', () => {
    initCoverShader();
    const shop = document.getElementById('floating-shop');
    const header = document.getElementById('shop-header');
    if (shop && header) initDraggable(shop, header);

    // Initial check for saves to enable/disable continue button
    let hasSave = false;
    for (let i = 0; i < 10; i++) {
        if (localStorage.getItem(`mt_slot_${i}`)) {
            hasSave = true;
            break;
        }
    }
    const contBtn = document.getElementById('continue-btn');
    if (contBtn && !hasSave) {
        contBtn.disabled = true;
        contBtn.style.opacity = '0.3';
    }
});
